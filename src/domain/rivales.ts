// Mundo vivo: las compañías rivales organizan eventos, sus peleadores pelean (con una versión
// rápida del motor), renuevan o pierden contratos, firman agentes libres y ganan o pierden dinero.
import { COMPANIAS_RIVALES } from '../config/companias';
import { MUNDO } from '../config/mundo';
import { PROGRESION } from '../config/balance';
import { nombreClase } from './format';
import { registrarDefensa, otorgarTitulo } from './campeonatos';
import { puntajesCompanias, tierPorPuntaje } from './empresa';
import { simularPelea } from './motor';
import { agregarNoticia } from './noticias';
import { contratoSugerido, nombreCompleto, scoreCalif } from './peleador';
import { anioVacio, registrarPelea, sumarAnio } from './premios';
import { ptsDe, recalcularRankings } from './rankings';
import { Rng, clamp } from './rng';
import type { Compania, Evento, Juego, Peleador, Resultado, ResultadoPelea } from './types';

const esFinal = (m: string) => m === 'KO' || m === 'TKO' || m === 'SUB';
const cfgDe = (id: string) => COMPANIAS_RIVALES.find(c => c.id === id);

export function inicializarRivales(j: Juego, rng: Rng): void {
  for (const c of j.companias) {
    if (c.esMia) continue;
    const e = cfgDe(c.id)?.eventosAnio ?? 12;
    c.proxEvento = j.semanaAbs + rng.int(0, Math.max(1, Math.round(52 / e)));
  }
}

const disponible = (p: Peleador, sem: number) =>
  !p.retirado && !!p.contrato && p.contrato.peleasRestantes > 0 && p.descansoHasta <= sem && !p.lesion && p.fatiga <= 40;

// ---- resultado de una pelea de rivales ----
function aplicarRival(p: Peleador, rival: Peleador, res: ResultadoPelea, esA: boolean, sem: number, titulo: boolean, rng: Rng): Peleador {
  const gano = res.ganadorId === p.id;
  const nc = res.metodo === 'NC';
  const empate = res.metodo === 'E';
  const perdio = !gano && !empate && !nc;
  const finalizo = gano && esFinal(res.metodo);
  const perdioFinal = perdio && (res.metodo === 'KO' || res.metodo === 'TKO');
  const rec = { ...p.rec.tot };
  const finales = { ...p.finales };
  if (gano) { rec.v++; if (res.metodo === 'KO') finales.ko++; else if (res.metodo === 'TKO') finales.tko++; else if (res.metodo === 'SUB') finales.sub++; else finales.dec++; }
  else if (perdio) rec.d++;
  else if (empate) rec.e++;
  else rec.nc++;
  const R: Resultado | null = gano ? 'V' : perdio ? 'D' : empate ? 'E' : null;
  let forma = p.forma;
  let racha = p.racha;
  let mejorRachaV = p.mejorRachaV;
  let peorRachaD = p.peorRachaD;
  if (R) {
    forma = [...p.forma, R].slice(-5);
    racha = p.racha.tipo === R && p.racha.n > 0 ? { tipo: R, n: p.racha.n + 1 } : { tipo: R, n: 1 };
    if (R === 'V') mejorRachaV = Math.max(mejorRachaV, racha.n);
    if (R === 'D') peorRachaD = Math.max(peorRachaD, racha.n);
  }
  const mias = ptsDe(p);
  const suyas = ptsDe(rival);
  let rankPts = mias;
  if (R === 'V') rankPts += clamp(6 + 0.12 * (suyas - mias), 2, 22) + (titulo ? 5 : 0) + (finalizo ? 2 : 0);
  else if (R === 'D') rankPts -= clamp(6 + 0.12 * (mias - suyas), 1.5, 20);
  else if (R === 'E') rankPts += clamp(0.12 * (suyas - mias), -3, 3);
  const recibidos = esA ? res.stats.b : res.stats.a;
  let pop = p.popularidad;
  if (R === 'V') pop += 1.2 + (finalizo ? 1.2 : 0) + clamp((rival.popularidad - p.popularidad) / 22, -1, 3) + (titulo ? 1.5 : 0);
  else if (R === 'D') pop -= 0.7 + Math.max(0, p.popularidad - rival.popularidad) / 28;
  let lesion = p.lesion;
  if (!nc && rng.chance(0.05 + (perdioFinal ? 0.1 : 0) + p.fis.lesiones / 120)) {
    const [a, b] = PROGRESION.lesionDuracion;
    lesion = { tipo: rng.pick(PROGRESION.tiposLesion), semanas: rng.int(a, b) };
  }
  const popularidad = clamp(pop, 0, 100);
  return {
    ...p, rec: { tot: rec, mio: p.rec.mio }, finales, forma, racha, mejorRachaV, peorRachaD, rankPts,
    fatiga: clamp(MUNDO.fatigaTrasPelea + res.round * 4, 30, 90),
    dano: clamp(p.dano + recibidos.golpesSig * 0.05 + recibidos.caidas * 1.5 + (perdioFinal ? 6 : 0), 0, 100),
    fis: perdioFinal ? { ...p.fis, menton: Math.max(0.5, p.fis.menton - 0.15) } : p.fis,
    descansoHasta: sem + (perdioFinal ? 12 : 7), lesion, popularidad, popMax: Math.max(p.popMax, popularidad),
    moral: clamp(p.moral + (gano ? 3 : perdio ? -4 : 0), 0, 100), ultimoCombate: sem, ultimoRival: rival.id,
    contrato: p.contrato ? { ...p.contrato, peleasRestantes: Math.max(0, p.contrato.peleasRestantes - 1) } : p.contrato,
    anioStats: sumarAnio(p.anioStats ?? anioVacio(), gano, perdio, finalizo, titulo, suyas),
  };
}

interface Cartel { a: Peleador; b: Peleador; titulo: boolean; pts: number }

function armarCartelera(j: Juego, c: Compania, roster: Peleador[], sem: number, rng: Rng, nBouts: number): Cartel[] {
  const porDiv = new Map<string, Peleador[]>();
  for (const p of roster) {
    if (!disponible(p, sem)) continue;
    const k = `${p.genero}:${p.clase}`;
    const arr = porDiv.get(k);
    if (arr) arr.push(p); else porDiv.set(k, [p]);
  }
  const titulos: Cartel[] = [];
  const otros: Cartel[] = [];
  for (const [k, lista] of porDiv) {
    if (lista.length < 2) continue;
    const [g, clase] = k.split(':');
    const div = j.divisiones.find(d => d.id === `${c.id}:${g}:${clase}`);
    const ordenados = lista.map(p => ({ p, v: ptsDe(p) + rng.normal(0, MUNDO.rankingMargenPareja) })).sort((x, y) => y.v - x.v).map(x => x.p);
    const camp = div?.campeonId != null ? ordenados.find(p => p.id === div.campeonId) : undefined;
    let resto = ordenados;
    if (camp && rng.chance(MUNDO.defensaTituloProb)) {
      const retador = ordenados.find(p => p.id !== camp.id && p.ultimoRival !== camp.id);
      if (retador) {
        titulos.push({ a: camp, b: retador, titulo: true, pts: (ptsDe(camp) + ptsDe(retador)) / 2 + 20 });
        resto = ordenados.filter(p => p.id !== camp.id && p.id !== retador.id);
      }
    }
    for (let i = 0; i + 1 < resto.length; i += 2) {
      const a = resto[i];
      let b = resto[i + 1];
      if (a.ultimoRival === b.id && resto[i + 2]) b = resto[i + 2]; // evita la revancha inmediata
      otros.push({ a, b, titulo: false, pts: (ptsDe(a) + ptsDe(b)) / 2 });
    }
  }
  const usados = new Set<number>();
  const elegidos: Cartel[] = [];
  const candidatos = [...titulos.slice(0, 2), ...otros.map(o => ({ ...o, pts: o.pts + rng.normal(0, 14) })).sort((x, y) => y.pts - x.pts)];
  for (const k of candidatos) {
    if (elegidos.length >= nBouts) break;
    if (usados.has(k.a.id) || usados.has(k.b.id)) continue;
    usados.add(k.a.id); usados.add(k.b.id);
    elegidos.push(k);
  }
  return elegidos.sort((x, y) => x.pts - y.pts);
}

export interface ResumenRivales { eventos: number; peleas: number; fichajes: number }

export function simularRivales(j: Juego, rng: Rng): ResumenRivales {
  const sem = j.semanaAbs;
  const resumen: ResumenRivales = { eventos: 0, peleas: 0, fichajes: 0 };
  let noticias = 0;
  const idx = new Map<number, number>();
  j.peleadores.forEach((p, i) => idx.set(p.id, i));
  const tocadas = new Set<string>();
  const rosters = new Map<string, Peleador[]>();
  for (const p of j.peleadores) {
    if (p.retirado || !p.companiaId || p.companiaId === j.miId) continue;
    const arr = rosters.get(p.companiaId);
    if (arr) arr.push(p); else rosters.set(p.companiaId, [p]);
  }

  for (const c of j.companias) {
    if (c.esMia || sem < c.proxEvento) continue;
    const cfg = cfgDe(c.id);
    const roster = (rosters.get(c.id) ?? []).map(p => j.peleadores[idx.get(p.id)!]);
    const n = clamp(Math.round(MUNDO.boutsPorEvento.base + roster.length * MUNDO.boutsPorEvento.porPeleadores), MUNDO.boutsPorEvento.min, MUNDO.boutsPorEvento.max);
    const cartel = armarCartelera(j, c, roster, sem, rng, n);
    c.proxEvento = sem + Math.max(1, Math.round(52 / (cfg?.eventosAnio ?? 12) + rng.normal(0, 0.8)));
    if (cartel.length < 2) continue;
    c.nEventos++;
    resumen.eventos++;
    tocadas.add(c.id);
    const nombre = c.nEventos % 4 === 0 ? `${c.siglas} ${c.nEventos}` : `${c.siglas} Fight Night ${c.nEventos}`;
    let estelar: Cartel | undefined;
    let estRes: ResultadoPelea | undefined;
    for (const k of cartel) {
      const ia = idx.get(k.a.id)!;
      const ib = idx.get(k.b.id)!;
      const a = j.peleadores[ia];
      const b = j.peleadores[ib];
      const rondas = k.titulo || k === cartel[cartel.length - 1] ? 5 : 3;
      const res = simularPelea(a, b, rondas, rng, { rapido: true });
      resumen.peleas++;
      registrarPelea(j, a, b, res, { titulo: k.titulo, semana: sem, companiaId: c.id, prevA: a.ultimoCombate, prevB: b.ultimoCombate, ruido: rng.float(0, 1) });
      j.peleadores[ia] = aplicarRival(a, b, res, true, sem, k.titulo, rng);
      j.peleadores[ib] = aplicarRival(b, a, res, false, sem, k.titulo, rng);
      if (k.titulo && res.ganadorId != null) {
        const div = j.divisiones.find(d => d.id === `${c.id}:${a.genero}:${a.clase}`);
        if (div) {
          const fake = { nombre } as Evento;
          if (div.campeonId === res.ganadorId) registrarDefensa(j, res.ganadorId);
          else if (div.campeonId === a.id || div.campeonId === b.id) otorgarTitulo(j, div, res.ganadorId, fake, `Ganó por ${res.metodo} en el round ${res.round}`);
        }
      }
      k.a = j.peleadores[ia];
      k.b = j.peleadores[ib];
      // lesiones graves de estrellas rivales
      for (const [antes, ahora] of [[a, k.a], [b, k.b]] as [Peleador, Peleador][]) {
        if (!antes.lesion && ahora.lesion && ahora.lesion.semanas >= 8 && ahora.popularidad >= 55 && noticias < MUNDO.noticiasMaxPorSemana) {
          noticias++;
          agregarNoticia(j, { categoria: 'mundo', peleadorId: ahora.id, titulo: `${nombreCompleto(ahora)} (${c.siglas}) estará fuera ${ahora.lesion.semanas} semanas`, cuerpo: `Se lesionó: ${ahora.lesion.tipo}.` });
        }
      }
      estelar = k;
      estRes = res;
      // contratos que se terminan: renovación o salida al mercado
      for (const id of [a.id, b.id]) {
        const p = j.peleadores[idx.get(id)!];
        if (p.contrato && p.contrato.peleasRestantes === 0) {
          if (rng.chance(MUNDO.renovacionRival)) {
            j.peleadores[idx.get(id)!] = { ...p, contrato: contratoSugerido(p, rng.int(MUNDO.contratoRivalPeleas[0], MUNDO.contratoRivalPeleas[1])) };
          } else {
            j.peleadores[idx.get(id)!] = { ...p, companiaId: null, contrato: null };
            if (p.popularidad >= MUNDO.notableFichaje && noticias < MUNDO.noticiasMaxPorSemana) {
              noticias++;
              agregarNoticia(j, { categoria: 'mundo', peleadorId: p.id, titulo: `${nombreCompleto(p)} deja ${c.nombre} y es agente libre`, cuerpo: 'Tú puedes ficharlo cuando quieras, o lo hará otra compañía.' });
            }
          }
        }
      }
    }
    if (estelar && estRes) {
      j.eventosRivales.push({
        id: j.sigEvento + j.eventosRivales.length + 100000, companiaId: c.id, nombre, semana: sem, nPeleas: cartel.length,
        estelar: { aId: estelar.a.id, bId: estelar.b.id, ganadorId: estRes.ganadorId, metodo: estRes.metodo, round: estRes.round, titulo: estelar.titulo },
      });
      if (j.eventosRivales.length > 400) j.eventosRivales.splice(0, j.eventosRivales.length - 400);
      if (noticias < MUNDO.noticiasMaxPorSemana && (c.tier >= 3 || estelar.titulo)) {
        noticias++;
        const gan = estRes.ganadorId === estelar.a.id ? estelar.a : estRes.ganadorId === estelar.b.id ? estelar.b : null;
        const per = gan ? (gan.id === estelar.a.id ? estelar.b : estelar.a) : null;
        agregarNoticia(j, {
          categoria: 'mundo', peleadorId: gan?.id,
          titulo: gan && per ? `${nombre}: ${nombreCompleto(gan)} vence a ${nombreCompleto(per)}` : `${nombre}: ${estelar.a.apellido} vs ${estelar.b.apellido} (${estRes.metodo})`,
          cuerpo: `${estelar.titulo ? 'Pelea por el título. ' : 'Estelar. '}${estRes.metodo} en el round ${estRes.round} (${estRes.tiempo}).`,
        });
      }
    }
    // dinero y fans de la compañía
    const ingreso = (c.ingresosAnuales / Math.max(1, cfg?.eventosAnio ?? 12)) * rng.float(MUNDO.ingresoPorEvento[0], MUNDO.ingresoPorEvento[1]);
    c.dinero += ingreso * (1 - rng.float(MUNDO.margenGasto[0], MUNDO.margenGasto[1]));
    c.fans = Math.round(c.fans * (1.0003 + (estelar ? (estelar.pts / 100) * 0.0003 : 0)));
  }
  for (const id of tocadas) recalcularRankings(j, [id]);

  fichajes(j, rng, resumen, () => noticias++ < MUNDO.noticiasMaxPorSemana);
  if (sem > 0 && sem % MUNDO.trimestreSemanas === 0) trimestre(j, rng);
  pidenPelea(j, rng, () => noticias++ < MUNDO.noticiasMaxPorSemana);
  return resumen;
}

// Las compañías rivales firman agentes libres de su nivel
function fichajes(j: Juego, rng: Rng, resumen: ResumenRivales, puedeNoticia: () => boolean): void {
  const sem = j.semanaAbs;
  const libres = j.peleadores.filter(p => !p.retirado && !p.companiaId && p.edad <= 38).map(p => ({ p, s: scoreCalif(p) })).sort((a, b) => b.s - a.s);
  if (!libres.length) return;
  const conteo = new Map<string, { n: number; suma: number }>();
  for (const p of j.peleadores) {
    if (p.retirado || !p.companiaId || p.companiaId === j.miId) continue;
    const e = conteo.get(p.companiaId) ?? { n: 0, suma: 0 };
    e.n++; e.suma += scoreCalif(p);
    conteo.set(p.companiaId, e);
  }
  const ocupados = new Set<number>();
  for (const c of j.companias.slice().sort(() => rng.next() - 0.5)) {
    if (c.esMia) continue;
    const cfg = cfgDe(c.id);
    const e = conteo.get(c.id) ?? { n: 0, suma: 0 };
    const falta = (cfg?.peleadores ?? 80) - e.n;
    const prob = MUNDO.probFichaje * (falta > 0 ? 1 + falta / 8 : 0.25);
    if (!rng.chance(clamp(prob, 0, 0.95))) continue;
    const prom = e.n ? e.suma / e.n : 5;
    const cuantos = Math.min(MUNDO.fichajesPorSemana, falta > 6 ? 2 : 1);
    let hechos = 0;
    const cand = libres.filter(x => !ocupados.has(x.p.id) && x.s >= prom + MUNDO.nivelFichajeMin && x.s <= prom + MUNDO.nivelFichajeMax && x.p.sinNegociarHasta <= sem).slice(0, 10);
    while (hechos < cuantos && cand.length) {
      const x = cand.splice(rng.int(0, cand.length - 1), 1)[0];
      const i = j.peleadores.findIndex(p => p.id === x.p.id);
      const p = j.peleadores[i];
      const contrato = contratoSugerido(p, rng.int(MUNDO.contratoRivalPeleas[0], MUNDO.contratoRivalPeleas[1]));
      if (c.dinero < contrato.bolsa * 4) break;
      c.dinero -= contrato.bolsa;
      j.peleadores[i] = { ...p, companiaId: c.id, contrato, moral: clamp(p.moral + 5, 0, 100) };
      ocupados.add(p.id);
      hechos++;
      resumen.fichajes++;
      if (p.popularidad >= MUNDO.notableFichaje && puedeNoticia()) {
        agregarNoticia(j, { categoria: 'mundo', peleadorId: p.id, titulo: `${nombreCompleto(p)} firma con ${c.nombre}`, cuerpo: `${p.rec.tot.v}-${p.rec.tot.d}-${p.rec.tot.e}, ${nombreClase(p.clase, j.ajustes.nombresDivision)}.` });
      }
    }
    if (hechos) recalcularRankings(j, [c.id]);
  }
}

// Cada trimestre: finanzas, reputación, estrellas, historial y avisos del ranking de compañías
function trimestre(j: Juego, rng: Rng): void {
  const sem = j.semanaAbs;
  for (const c of j.companias) {
    if (c.esMia) continue;
    c.reputacion = clamp(c.reputacion + rng.normal(0, 0.35) + (c.reputacion < 40 ? 0.15 : 0), 5, 100);
    c.ingresosAnuales = Math.round(c.ingresosAnuales * (1 + (c.reputacion - 55) / 8000 + rng.normal(0, 0.01)));
  }
  const antes = new Map(Object.entries(j.rankCompPrev));
  const pts = puntajesCompanias(j);
  const orden = j.companias.slice().sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0));
  for (const c of j.companias) {
    const p = pts.get(c.id) ?? 0;
    c.tier = tierPorPuntaje(p);
    c.hist.push({ semana: sem, puntaje: Math.round(p * 10) / 10 });
    if (c.hist.length > MUNDO.histMax) c.hist.shift();
  }
  const pos = new Map(orden.map((c, i) => [c.id, i + 1]));
  const miPos = pos.get(j.miId) ?? 0;
  const miAntes = antes.get(j.miId);
  if (miAntes != null && miPos < miAntes) {
    for (const c of orden) {
      if (c.esMia) continue;
      const antesC = antes.get(c.id);
      if (antesC != null && antesC < miAntes && (pos.get(c.id) ?? 0) > miPos) {
        agregarNoticia(j, { categoria: 'importante', titulo: `¡Superaste a ${c.nombre} en el ranking de compañías!`, cuerpo: `Ahora eres la #${miPos}.` });
      }
    }
  }
  j.rankCompPrev = Object.fromEntries(orden.map((c, i) => [c.id, i + 1]));
}

// Peleadores con racha que piden pelea por el título (solo ruido de mundo)
function pidenPelea(j: Juego, rng: Rng, puedeNoticia: () => boolean): void {
  if (!rng.chance(0.35)) return;
  const c = rng.pick(j.companias.filter(x => !x.esMia && x.tier >= 3));
  if (!c) return;
  const cands = j.peleadores.filter(p => p.companiaId === c.id && !p.retirado && p.racha.tipo === 'V' && p.racha.n >= 4 && p.popularidad >= 30);
  if (!cands.length) return;
  const p = rng.pick(cands);
  const div = j.divisiones.find(d => d.id === `${c.id}:${p.genero}:${p.clase}`);
  if (!div || div.campeonId === p.id || div.campeonId == null) return;
  const camp = j.peleadores.find(x => x.id === div.campeonId);
  if (camp && puedeNoticia()) {
    agregarNoticia(j, { categoria: 'mundo', peleadorId: p.id, titulo: `${nombreCompleto(p)} (${p.racha.n} victorias seguidas) exige la pelea por el título de ${c.nombre}`, cuerpo: `El campeón es ${nombreCompleto(camp)}.` });
  }
}

