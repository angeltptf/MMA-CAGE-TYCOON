import { ECONOMIA, MATCHMAKING } from '../config/economia';
import { PELEADOR } from '../config/balance';
import { SEDES, SEDE_POR_ID, SEDE_INICIAL, type Sede } from '../config/sedes';
import { popularidadEmpresa } from './empresa';
import { probVictoria, momio } from './motor';
import { Rng, clamp } from './rng';
import { regionDePais } from './worldgen';
import type { Compania, Evento, Juego, Peleador, Pelea, TipoEvento } from './types';

const miComp = (j: Juego): Compania => j.companias.find(c => c.esMia)!;

// ---------- Consultas básicas ----------
export const eventoDeSemana = (j: Juego, semana: number): Evento | undefined =>
  j.eventos.find(e => e.semana === semana && e.estado !== 'cancelado');

export const eventoPendienteHoy = (j: Juego): Evento | undefined => {
  const e = eventoDeSemana(j, j.semanaAbs);
  return e && e.estado === 'borrador' ? e : undefined;
};

export const proximoEvento = (j: Juego): Evento | undefined =>
  j.eventos.filter(e => e.estado === 'borrador' && e.semana >= j.semanaAbs).sort((a, b) => a.semana - b.semana)[0];

export const boutVacia = (b: Pelea) => !b.torneoId && (b.aId == null || b.bId == null);
export const estaCompleto = (e: Evento) => e.cartelera.length > 0 && e.cartelera.every(b => !boutVacia(b));
export const puedeAvanzarSemana = (j: Juego) => !eventoPendienteHoy(j);

export type EstadoVisual = 'realizado' | 'listo' | 'incompleto' | 'cancelado';
export function estadoVisual(e: Evento): EstadoVisual {
  if (e.estado === 'realizado') return 'realizado';
  if (e.estado === 'cancelado') return 'cancelado';
  return estaCompleto(e) ? 'listo' : 'incompleto';
}

export function sedeDe(e: Evento): Sede {
  return SEDE_POR_ID[e.sedeId] ?? SEDE_INICIAL;
}

export const sedeDesbloqueada = (j: Juego, s: Sede) => !s.soloOferta && popularidadEmpresa(miComp(j)) >= s.popMin;

export function peleadoresEnEvento(e: Evento): number[] {
  return e.cartelera.flatMap(b => [b.aId, b.bId]).filter((x): x is number => x != null);
}

// ---------- Disponibilidad ----------
export interface Disp { ok: boolean; motivo?: string }

export function eventoProgramadoDe(j: Juego, id: number, excluir?: number): Evento | undefined {
  return j.eventos.find(e => e.estado === 'borrador' && e.id !== excluir
    && e.cartelera.some(b => b.aId === id || b.bId === id));
}

export function disponibleParaEvento(j: Juego, p: Peleador, e: Evento): Disp {
  if (p.retirado) return { ok: false, motivo: 'Está retirado' };
  if (p.companiaId !== j.miId || !p.contrato) return { ok: false, motivo: 'Sin contrato contigo' };
  if (p.contrato.peleasRestantes <= 0) return { ok: false, motivo: 'Su contrato terminó' };
  const sem = Math.max(0, e.semana - j.semanaAbs);
  if (p.lesion && p.lesion.semanas > sem) return { ok: false, motivo: `Lesionado (${p.lesion.semanas} sem.)` };
  if (p.descansoHasta > e.semana) return { ok: false, motivo: `Descansando hasta la sem. ${p.descansoHasta}` };
  const fatiga = Math.max(0, p.fatiga - 18 * sem);
  if (fatiga > PELEADOR.fatigaMaxParaPelear) return { ok: false, motivo: 'Fatiga alta' };
  if (p.dano > PELEADOR.danoMaxParaPelear) return { ok: false, motivo: 'Demasiado daño acumulado' };
  const otro = eventoProgramadoDe(j, p.id, e.id);
  if (otro) return { ok: false, motivo: `Ya pelea en ${otro.nombre}` };
  const aqui = e.cartelera.some(b => b.aId === p.id || b.bId === p.id);
  if (aqui) return { ok: false, motivo: 'Ya está en esta cartelera' };
  if (!j.divisiones.some(d => d.id === `${j.miId}:${p.genero}:${p.clase}`)) return { ok: false, motivo: 'Tu división no existe' };
  return { ok: true };
}

// ---------- Ranking local y hype ----------
export function rankPos(j: Juego, p: Peleador): number {
  const d = j.divisiones.find(x => x.id === `${p.companiaId}:${p.genero}:${p.clase}`);
  if (!d) return 99;
  if (d.campeonId === p.id || d.interinoId === p.id) return 0;
  const i = d.ranking.indexOf(p.id);
  return i >= 0 ? i + 1 : 99;
}

const esGrappler = (p: Peleador) => (p.ataque.lucha + p.ataque.bjj) / 2 > Math.max(p.ataque.boxeo, p.ataque.muayThai) + 0.7;
const esStriker = (p: Peleador) => Math.max(p.ataque.boxeo, p.ataque.muayThai) > (p.ataque.lucha + p.ataque.bjj) / 2 + 0.7;

export function hypePelea(j: Juego, a: Peleador, b: Peleador, titulo: boolean): number {
  const p = probVictoria(a, b);
  const parejo = 1 - Math.abs(p - 0.5) * 2;
  let h = 0.45 * (a.popularidad + b.popularidad) / 2 + 0.25 * Math.max(a.popularidad, b.popularidad) + 10 * parejo;
  if (titulo) h += MATCHMAKING.hypeEstelarTitulo;
  const ra = rankPos(j, a);
  const rb = rankPos(j, b);
  if (ra <= 5 && rb <= 5) h += 7;
  if ((esGrappler(a) && esStriker(b)) || (esStriker(a) && esGrappler(b))) h += 4;
  if (a.racha.tipo === 'V' && a.racha.n >= 3 && b.racha.tipo === 'V' && b.racha.n >= 3) h += 4;
  return Math.round(clamp(h, 0, 100));
}

export function hypeBout(j: Juego, b: Pelea): number {
  const a = j.peleadores.find(p => p.id === b.aId);
  const c = j.peleadores.find(p => p.id === b.bId);
  return a && c ? hypePelea(j, a, c, b.titulo) : 0;
}

// Hype de la cartelera: pesa el estelar, el coestelar y el resto
export function hypeEvento(j: Juego, e: Evento): number {
  const hs = e.cartelera.filter(b => !boutVacia(b)).map(b => b.resultado || b.snap ? b.hype : hypeBout(j, b));
  if (!hs.length) return 0;
  const main = hs[hs.length - 1];
  if (hs.length === 1) return main;
  const co = hs[hs.length - 2];
  const resto = hs.slice(0, -2);
  const avg = resto.length ? resto.reduce((x, y) => x + y, 0) / resto.length : co;
  return Math.round(0.5 * main + 0.2 * co + 0.3 * avg);
}

export function momiosDe(a: Peleador, b: Peleador): [number, number] {
  const p = probVictoria(a, b);
  return [momio(p), momio(1 - p)];
}

// ---------- Boletos, costos e ingresos ----------
export interface EstimacionBoletos {
  vendidos: number;
  demanda: number;
  aforo: number;
  precioRef: number;
  precioSugerido: number;
  taquilla: number;
  hype: number;
  popRegion: number;
  region: string;
  bonusLocal: number;
}

export function popRegionDe(j: Juego, sede: Sede): { region: string; pop: number } {
  const region = regionDePais(sede.pais);
  return { region, pop: miComp(j).popRegion[region] ?? 1 };
}

export function estimarBoletos(j: Juego, e: Evento, precio = e.precio, hypeForzado?: number): EstimacionBoletos {
  const d = ECONOMIA.demanda;
  const sede = sedeDe(e);
  const { region, pop } = popRegionDe(j, sede);
  const hype = hypeForzado ?? hypeEvento(j, e);
  const potencial = d.base * Math.exp(d.k * pop);
  const m = d.hypeMin + Math.pow(hype / d.hypeDivisor, 1.3);
  // peleadores locales en el estelar o coestelar
  let locales = 0;
  for (const b of e.cartelera.slice(-2)) {
    for (const id of [b.aId, b.bId]) {
      const p = id != null ? j.peleadores.find(x => x.id === id) : undefined;
      if (p && p.pais === sede.pais) locales++;
    }
  }
  const bonusLocal = Math.min(2, locales) * d.bonusLocal;
  const calidad = 0.5 * hype + 0.5 * pop;
  const precioRef = d.precioRef * Math.exp(d.precioK * calidad);
  const base = potencial * m * (1 + bonusLocal);
  const demanda = base * Math.pow(Math.max(0.01, precio) / precioRef, -d.elasticidad);
  const vendidos = Math.max(0, Math.min(sede.aforo, Math.round(demanda)));
  // el precio máximo con el que aún se llena la sede (o el de referencia si sobra aforo)
  const sugerido = base >= sede.aforo ? precioRef * Math.pow(base / sede.aforo, 1 / d.elasticidad) : precioRef;
  return {
    vendidos, demanda: Math.round(demanda), aforo: sede.aforo, precioRef, bonusLocal, hype, popRegion: pop, region,
    precioSugerido: Math.max(ECONOMIA.precio.min, Math.round(sugerido)), taquilla: vendidos * precio,
  };
}

export interface Costos {
  renta: number;
  produccion: number;
  viaje: number;
  bolsas: number;
  bonosVictoria: number;
  total: number;
  transmision: number;
}

export function costosEvento(j: Juego, e: Evento, hype = hypeEvento(j, e)): Costos {
  const c = ECONOMIA.costos;
  const sede = sedeDe(e);
  const mia = miComp(j);
  const n = e.cartelera.length;
  const prod = (c.produccionBase + c.produccionPorPelea * n + c.produccionPorAsiento * sede.aforo)
    * (sede.tipo === 'estadio' ? c.recargoEstadio : 1) * (e.tipo === 'ppv' ? c.ppvRecargo : 1);
  let viaje = 0;
  if (sede.pais !== mia.pais) {
    viaje = c.viajeBase + c.viajePorPelea * n;
    if (regionDePais(sede.pais) !== regionDePais(mia.pais)) viaje *= c.viajeOtraRegion;
  }
  let bolsas = 0;
  let bonos = 0;
  for (const b of e.cartelera) {
    const pa = j.peleadores.find(p => p.id === b.aId);
    const pb = j.peleadores.find(p => p.id === b.bId);
    bolsas += (pa?.contrato?.bolsa ?? 0) + (pb?.contrato?.bolsa ?? 0);
    bonos += ((pa?.contrato?.bonoVictoria ?? 0) + (pb?.contrato?.bonoVictoria ?? 0)) / 2;
  }
  const t = ECONOMIA.transmision;
  const transmision = Math.round(
    t.base * Math.exp(t.k * popularidadEmpresa(mia)) * (t.hypeMin + hype / t.hypeDivisor)
    * (1 + t.porPelea * n) * (e.tipo === 'ppv' ? t.ppvMult : 1),
  );
  const renta = sede.costo;
  const produccion = Math.round(prod);
  return {
    renta, produccion, viaje: Math.round(viaje), bolsas: Math.round(bolsas), bonosVictoria: Math.round(bonos), transmision,
    total: Math.round(renta + produccion + viaje + bolsas + bonos),
  };
}

// ---------- Crear y modificar eventos ----------
export function boutNueva(j: Juego, genero: Pelea['genero'] = 'M', clase: Pelea['clase'] = 'ligero'): Pelea {
  return { id: j.sigPelea++, genero, clase, aId: null, bId: null, titulo: false, interino: false, rounds: 3, hype: 0 };
}

export function sedeInicial(j: Juego): Sede {
  const mia = miComp(j);
  const locales = SEDES.filter(s => s.pais === mia.pais && sedeDesbloqueada(j, s) && s.aforo <= 900).sort((a, b) => b.aforo - a.aforo);
  if (locales[0]) return locales[0];
  const cualquiera = SEDES.filter(s => sedeDesbloqueada(j, s) && s.aforo <= 900).sort((a, b) => b.aforo - a.aforo);
  return cualquiera[0] ?? SEDE_INICIAL;
}

export function crearEvento(j: Juego, semana: number, tipo: TipoEvento): Evento | string {
  if (semana < j.semanaAbs) return 'No puedes crear eventos en el pasado.';
  if (eventoDeSemana(j, semana)) return 'Ya hay un evento esa semana (máximo 1 por semana).';
  const mia = miComp(j);
  const numero = tipo === 'ppv' ? j.contadores.ppv + 1 : j.contadores.noche + 1;
  if (tipo === 'ppv') j.contadores.ppv++; else j.contadores.noche++;
  const sede = sedeInicial(j);
  const primera = j.divisiones.find(d => d.companiaId === j.miId);
  const e: Evento = {
    id: j.sigEvento++, tipo, numero, semana,
    nombre: tipo === 'ppv' ? `${mia.siglas} ${numero}` : `${mia.siglas} Fight Night ${numero}`,
    nombrePropio: false, sedeId: sede.id, nPeleas: ECONOMIA.peleasInicial, precio: 10, estado: 'borrador', confirmado: false,
    cartelera: [],
  };
  for (let i = 0; i < e.nPeleas; i++) e.cartelera.push(boutNueva(j, primera?.genero, primera?.clase));
  e.precio = estimarBoletos(j, e, 10, 20).precioSugerido;
  j.eventos.push(e);
  return e;
}

export function cambiarNumeroPeleas(j: Juego, e: Evento, n: number): void {
  n = clamp(n, ECONOMIA.peleasMin, ECONOMIA.peleasMax);
  if (n === e.cartelera.length) return;
  const primera = j.divisiones.find(d => d.companiaId === j.miId);
  if (n > e.cartelera.length) {
    // las nuevas (vacías) van arriba: la cartelera preliminar
    const nuevas: Pelea[] = [];
    for (let i = e.cartelera.length; i < n; i++) nuevas.push(boutNueva(j, primera?.genero, primera?.clase));
    e.cartelera = [...nuevas, ...e.cartelera];
  } else {
    // quita primero las vacías; si hay que quitar más, las de abajo en importancia
    let sobran = e.cartelera.length - n;
    const res: Pelea[] = [];
    for (const b of e.cartelera) {
      if (sobran > 0 && boutVacia(b)) { sobran--; continue; }
      res.push(b);
    }
    e.cartelera = res.slice(sobran);
  }
  e.nPeleas = n;
}

export function ponerNombre(e: Evento, nombre: string): void {
  e.nombre = nombre.trim() || e.nombre;
  e.nombrePropio = true;
}

// Validaciones de una pelea. `errores` bloquean; `avisos` solo advierten.
export function validarPelea(
  j: Juego, e: Evento, b: Pelea, a: Peleador, c: Peleador,
): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (a.id === c.id) errores.push('Elige a dos peleadores distintos.');
  // al revisar una pelea ya armada no cuenta "ya está en esta cartelera"
  const sinEste: Evento = { ...e, cartelera: e.cartelera.filter(x => x.id !== b.id) };
  for (const p of [a, c]) {
    const d = disponibleParaEvento(j, p, sinEste);
    if (!d.ok) errores.push(`${p.apellido}: ${d.motivo}`);
    if (p.genero !== b.genero || p.clase !== b.clase) errores.push(`${p.apellido} no es de esta división.`);
  }
  const ra = rankPos(j, a);
  const rb = rankPos(j, c);
  if (!b.titulo && Math.abs(ra - rb) > 6 && Math.min(ra, rb) <= 5) avisos.push('Pelea sin mucha lógica: un top 5 contra alguien muy abajo en el ranking.');
  if (b.titulo) {
    const d = j.divisiones.find(x => x.id === `${j.miId}:${b.genero}:${b.clase}`);
    const camp = d?.campeonId ?? null;
    const inter = d?.interinoId ?? null;
    const ids = [a.id, c.id];
    if (b.interino) {
      const pc = camp != null ? j.peleadores.find(p => p.id === camp) : undefined;
      if (camp == null) errores.push('No hay campeón: usa un campeonato normal (título vacante).');
      else if (ids.includes(camp)) errores.push('El campeón no puede pelear por el título interino.');
      else if (pc && !pc.retirado && !(pc.lesion && pc.lesion.semanas >= 10)) errores.push('El título interino solo se crea si el campeón va a estar fuera mucho tiempo (lesión de 10 semanas o más).');
    } else if (camp != null && inter != null) {
      if (!(ids.includes(camp) && ids.includes(inter))) errores.push('Hay un campeón interino: la pelea por el título debe ser de unificación (campeón contra interino).');
    } else if (camp != null && !ids.includes(camp)) {
      errores.push('Una pelea por el título debe incluir al campeón actual.');
    }
  }
  const reciente = a.peleas.find(h => h.rivalId === c.id && j.semanaAbs - h.semana < MATCHMAKING.rematchSemanas);
  if (reciente) avisos.push('Ya se enfrentaron hace menos de un año.');
  if (b.rounds === 5 && !b.titulo) avisos.push('Cinco rounds sin título: solo suele hacerse en estelares.');
  return { errores, avisos };
}

// ---------- Matchmaking automático ----------
interface Cand { a: Peleador; b: Peleador; score: number; titulo: boolean; interino: boolean }

export function matchmakingAutomatico(j: Juego, e: Evento, rng: Rng, excluir: Set<number> = new Set()): { avisos: string[]; armadas: number } {
  const avisos: string[] = [];
  const n = e.nPeleas;
  const base: Evento = { ...e, cartelera: [] };
  const mias = j.peleadores.filter(p => p.companiaId === j.miId && !excluir.has(p.id) && disponibleParaEvento(j, p, base).ok);
  const porDiv = new Map<string, Peleador[]>();
  for (const p of mias) {
    const k = `${p.genero}:${p.clase}`;
    porDiv.set(k, [...(porDiv.get(k) ?? []), p]);
  }

  const cands: Cand[] = [];
  const usados = new Set<number>();
  for (const [k, lista] of porDiv) {
    const [g, clase] = k.split(':');
    const div = j.divisiones.find(d => d.id === `${j.miId}:${g}:${clase}`);
    if (!div) continue;
    const tam = j.peleadores.filter(p => p.companiaId === j.miId && !p.retirado && p.genero === g && p.clase === clase).length;
    for (let x = 0; x < lista.length; x++) {
      for (let y = x + 1; y < lista.length; y++) {
        const a = lista[x];
        const b = lista[y];
        const ra = rankPos(j, a);
        const rb = rankPos(j, b);
        const dist = Math.abs(Math.min(ra, 30) - Math.min(rb, 30));
        const reciente = a.peleas.find(h => h.rivalId === b.id && j.semanaAbs - h.semana < MATCHMAKING.rematchSemanas);
        // revancha solo si fue muy cerrada, polémica o de título
        const revanchaOk = !!reciente && (reciente.titulo || reciente.metodo === 'DD' || reciente.metodo === 'DM');
        if (reciente && !revanchaOk) continue;
        // prospectos con prospectos, veteranos con veteranos
        const prospA = a.edad <= 24 && a.rec.tot.v + a.rec.tot.d < 8;
        const prospB = b.edad <= 24 && b.rec.tot.v + b.rec.tot.d < 8;
        let pen = 0;
        if (prospA !== prospB && Math.abs(a.edad - b.edad) > 8) pen += 8;
        if (dist > MATCHMAKING.rankMaxDiferencia && Math.min(ra, rb) <= 8) pen += 6 * (dist - MATCHMAKING.rankMaxDiferencia);
        // un #1 no pelea con alguien sin ranking
        let titulo = false;
        let interino = false;
        const camp = div.campeonId;
        const campNoDisp = camp != null && !lista.some(p => p.id === camp);
        if (camp != null && (a.id === camp || b.id === camp)) {
          const retador = a.id === camp ? b : a;
          const rr = rankPos(j, retador);
          if (rr <= 3 || (retador.racha.tipo === 'V' && retador.racha.n >= 4 && rr <= 6)) titulo = true;
          else pen += 10; // el campeón no defiende contra cualquiera
        } else if (camp == null && tam >= 4 && Math.max(ra, rb) <= 4) {
          titulo = true; // título vacante
        } else if (campNoDisp && div.interinoId == null && Math.max(ra, rb) <= 3 && tam >= 5) {
          interino = true; titulo = true;
        }
        const hype = hypePelea(j, a, b, titulo);
        // los peleadores en mala racha van a la cartelera preliminar (menos puntos para el estelar)
        const malaRacha = (p: Peleador) => p.racha.tipo === 'D' && p.racha.n >= 2;
        const score = hype - 3 * dist - pen + (revanchaOk ? 4 : 0) - (malaRacha(a) || malaRacha(b) ? 8 : 0) + rng.float(0, 2);
        cands.push({ a, b, score, titulo, interino });
      }
    }
  }
  cands.sort((x, y) => y.score - x.score);

  const elegidas: Cand[] = [];
  // los títulos primero (máx. 1 cada 6 peleas, mínimo 1 si hay)
  let maxTitulos = Math.max(1, Math.ceil(n / 6));
  for (const c of cands) {
    if (elegidas.length >= n) break;
    if (!c.titulo || maxTitulos <= 0) continue;
    if (usados.has(c.a.id) || usados.has(c.b.id)) continue;
    const divKey = `${c.a.genero}:${c.a.clase}`;
    if (elegidas.some(x => x.titulo && `${x.a.genero}:${x.a.clase}` === divKey)) continue;
    elegidas.push(c); usados.add(c.a.id); usados.add(c.b.id); maxTitulos--;
  }
  for (const c of cands) {
    if (elegidas.length >= n) break;
    if (usados.has(c.a.id) || usados.has(c.b.id)) continue;
    elegidas.push({ ...c, titulo: c.titulo && !elegidas.some(x => x.titulo && x.a.clase === c.a.clase && x.a.genero === c.a.genero) ? c.titulo : false, interino: c.interino });
    usados.add(c.a.id); usados.add(c.b.id);
  }

  // ordenar de menor a mayor importancia
  elegidas.sort((x, y) => x.score - y.score);
  const cartelera: Pelea[] = elegidas.map((c, i) => ({
    id: j.sigPelea++, genero: c.a.genero, clase: c.a.clase, aId: c.a.id, bId: c.b.id,
    titulo: c.titulo, interino: c.interino, rounds: c.titulo || i === elegidas.length - 1 ? 5 : 3, hype: 0,
  }));
  for (const b of cartelera) b.hype = hypeBout(j, b);
  // el estelar siempre a 5 rounds
  if (cartelera.length) cartelera[cartelera.length - 1].rounds = 5;
  while (cartelera.length < n) {
    const primera = j.divisiones.find(d => d.companiaId === j.miId);
    cartelera.unshift(boutNueva(j, primera?.genero, primera?.clase));
  }
  e.cartelera = cartelera;
  const armadas = elegidas.length;
  if (armadas < n) {
    avisos.push(`Solo se pudieron armar ${armadas} de ${n} combates: faltan peleadores disponibles (lesionados, descansando, sin contrato o sin división) o rivales con lógica.`);
  }
  if (!j.divisiones.some(d => d.companiaId === j.miId)) avisos.push('No tienes divisiones: créalas en Más → Divisiones.');
  return { avisos, armadas };
}

export function ordenarPorHype(j: Juego, e: Evento): void {
  const llenas = e.cartelera.filter(b => !boutVacia(b));
  const vacias = e.cartelera.filter(boutVacia);
  for (const b of llenas) b.hype = hypeBout(j, b);
  llenas.sort((x, y) => x.hype - y.hype);
  e.cartelera = [...vacias, ...llenas];
}

export function cancelarEvento(e: Evento): void {
  e.estado = 'cancelado';
}

// Todos los eventos del calendario de un año (para dibujar la cuadrícula)
export function semanasVisibles(j: Juego, desde: number, cuantas: number): { semana: number; evento?: Evento }[] {
  const res = [];
  for (let s = desde; s < desde + cuantas; s++) res.push({ semana: s, evento: eventoDeSemana(j, s) });
  return res;
}
