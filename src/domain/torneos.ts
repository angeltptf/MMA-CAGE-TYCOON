// Torneos de 4, 8 o 16 peleadores. "Vieja escuela": todo el torneo en un solo evento;
// "Moderna": una ronda por evento a lo largo de varias semanas.
import { ECONOMIA } from '../config/economia';
import { SEDE_INICIAL } from '../config/sedes';
import { boutNueva, disponibleParaEvento, estimarBoletos, eventoDeSemana, hypeBout, sedeInicial } from './eventos';
import { nombreClase } from './format';
import { agregarNoticia } from './noticias';
import { nombreCompleto } from './peleador';
import { ptsDe } from './rankings';
import { Rng } from './rng';
import { divisionMia, otorgarTitulo } from './campeonatos';
import type { ClaseId, Evento, Genero, Juego, Pelea, Torneo } from './types';

export const numRondas = (tam: number) => Math.log2(tam);

export function nombreRonda(tam: number, r: number): string {
  const total = numRondas(tam);
  if (r === total - 1) return 'Final';
  if (r === total - 2) return 'Semifinal';
  if (r === total - 3) return 'Cuartos';
  return 'Octavos';
}

// "Cuartos A1", "Semifinal B", "Final"
export function etiquetaPartido(tam: number, r: number, slot: number): string {
  const partidos = tam / 2 ** (r + 1);
  const nombre = nombreRonda(tam, r);
  if (partidos === 1) return nombre;
  const mitad = partidos / 2;
  const lado = slot < mitad ? 'A' : 'B';
  return partidos === 2 ? `${nombre} ${lado}` : `${nombre} ${lado}${(slot % mitad) + 1}`;
}

export const torneoDe = (j: Juego, id: number | undefined) => (id == null ? undefined : j.torneos.find(t => t.id === id));

export function crearTorneo(
  j: Juego, cfg: { nombre: string; genero: Genero; clase: ClaseId; tam: 4 | 8 | 16; tipo: 'vieja' | 'moderna'; sorteoAuto: boolean; otorgaTitulo: boolean },
): { id?: number; error?: string } {
  if (!divisionMia(j, cfg.genero, cfg.clase)) return { error: 'Primero crea esa división en Más → Divisiones.' };
  if (!cfg.nombre.trim()) return { error: 'Ponle un nombre al torneo.' };
  const t: Torneo = { id: j.sigTorneo++, ...cfg, nombre: cfg.nombre.trim(), cupos: Array(cfg.tam).fill(null), rondas: [], estado: 'cupos' };
  j.torneos.push(t);
  return { id: t.id };
}

export function elegibles(j: Juego, t: Torneo): number[] {
  return j.peleadores
    .filter(p => p.companiaId === j.miId && !p.retirado && p.genero === t.genero && p.clase === t.clase && !!p.contrato && p.contrato.peleasRestantes > 0)
    .sort((a, b) => ptsDe(b) - ptsDe(a)).map(p => p.id);
}

export function setCupo(j: Juego, id: number, i: number, peleadorId: number | null): string | null {
  const t = j.torneos.find(x => x.id === id);
  if (!t || t.estado !== 'cupos') return 'Ya no se pueden cambiar los participantes.';
  if (peleadorId != null) {
    if (t.cupos.includes(peleadorId)) return 'Ese peleador ya está en el torneo.';
    if (!elegibles(j, t).includes(peleadorId)) return 'Ese peleador no puede participar (división, contrato o retiro).';
  }
  t.cupos[i] = peleadorId;
  return null;
}

export function llenarAuto(j: Juego, id: number): string | null {
  const t = j.torneos.find(x => x.id === id);
  if (!t || t.estado !== 'cupos') return 'Ya no se pueden cambiar los participantes.';
  const libres = elegibles(j, t).filter(x => !t.cupos.includes(x));
  for (let i = 0; i < t.cupos.length && libres.length; i++) if (t.cupos[i] == null) t.cupos[i] = libres.shift()!;
  const faltan = t.cupos.filter(c => c == null).length;
  return faltan ? `Faltan ${faltan} peleadores: ficha más en esa división.` : null;
}

export function sortear(j: Juego, id: number, rng: Rng): string | null {
  const t = j.torneos.find(x => x.id === id);
  if (!t || t.estado !== 'cupos') return 'Las llaves ya se sortearon.';
  if (t.cupos.some(c => c == null)) return 'Llena todos los lugares antes de sortear.';
  let orden = t.cupos.slice() as number[];
  if (t.sorteoAuto) {
    for (let i = orden.length - 1; i > 0; i--) { const k = rng.int(0, i); [orden[i], orden[k]] = [orden[k], orden[i]]; }
  }
  t.cupos = orden;
  t.rondas = [];
  for (let r = 0; r < numRondas(t.tam); r++) {
    const n = t.tam / 2 ** (r + 1);
    t.rondas.push(Array.from({ length: n }, (_, s) => ({
      aId: r === 0 ? orden[s * 2] : null, bId: r === 0 ? orden[s * 2 + 1] : null, ganadorId: null,
    })));
  }
  t.estado = 'llaves';
  return null;
}

function boutTorneo(j: Juego, t: Torneo, r: number, slot: number): Pelea {
  const par = t.rondas[r][slot];
  const final = r === numRondas(t.tam) - 1;
  const b = boutNueva(j, t.genero, t.clase);
  Object.assign(b, { aId: par.aId, bId: par.bId, torneoId: t.id, ronda: r, slot, titulo: final && t.otorgaTitulo, rounds: final ? 5 : 3 });
  b.hype = par.aId != null && par.bId != null ? hypeBout(j, b) : 0;
  return b;
}

// Crea el evento del torneo (todo el torneo si es vieja escuela, o una ronda si es moderna)
export function programarRonda(j: Juego, id: number, ronda: number, semana: number): { id?: number; error?: string } {
  const t = j.torneos.find(x => x.id === id);
  if (!t) return { error: 'Torneo no encontrado.' };
  if (t.estado === 'cupos' || !t.rondas.length) return { error: 'Primero sortea las llaves.' };
  if (t.estado === 'terminado') return { error: 'El torneo ya terminó.' };
  if (semana < j.semanaAbs) return { error: 'No puedes programar en el pasado.' };
  if (eventoDeSemana(j, semana)) return { error: 'Ya hay un evento esa semana (máximo 1 por semana).' };
  if (t.tipo === 'vieja' && (ronda !== 0 || t.rondas.some(r => r.some(p => p.eventoId != null)))) return { error: 'Este torneo ya tiene su evento.' };
  if (t.tipo === 'moderna') {
    if (t.rondas[ronda].some(p => p.eventoId != null)) return { error: 'Esa ronda ya está programada.' };
    if (ronda > 0 && !t.rondas[ronda - 1].every(p => p.ganadorId != null)) return { error: 'Primero debe terminar la ronda anterior.' };
  }
  const rondas = t.tipo === 'vieja' ? t.rondas.map((_, r) => r) : [ronda];
  const base: Evento = { id: -1, tipo: 'torneo', nombre: '', nombrePropio: true, numero: 0, semana, sedeId: SEDE_INICIAL.id, nPeleas: 0, precio: 10, estado: 'borrador', confirmado: false, cartelera: [] };
  for (const r of rondas) {
    for (const par of t.rondas[r]) {
      for (const pid of [par.aId, par.bId]) {
        if (pid == null) continue;
        const p = j.peleadores.find(x => x.id === pid)!;
        const d = disponibleParaEvento(j, p, base);
        if (!d.ok) return { error: `${p.apellido}: ${d.motivo}` };
      }
    }
  }
  const sede = sedeInicial(j);
  const e: Evento = {
    id: j.sigEvento++, tipo: 'torneo', numero: 0, semana, nombrePropio: true, torneoId: t.id,
    nombre: t.tipo === 'vieja' ? t.nombre : `${t.nombre} · ${nombreRonda(t.tam, ronda)}`,
    sedeId: sede.id, nPeleas: 0, precio: 10, estado: 'borrador', confirmado: true, cartelera: [],
  };
  for (const r of rondas) {
    t.rondas[r].forEach((par, slot) => {
      const b = boutTorneo(j, t, r, slot);
      par.peleaId = b.id;
      par.eventoId = e.id;
      e.cartelera.push(b);
    });
  }
  e.nPeleas = e.cartelera.length;
  e.precio = estimarBoletos(j, e, 10, 20).precioSugerido;
  j.eventos.push(e);
  t.estado = 'en_curso';
  return { id: e.id };
}

// Un peleador ganó su pelea de torneo: avanza a la siguiente ronda. Devuelve el premio pagado si fue la final.
export function avanzarGanador(j: Juego, e: Evento, b: Pelea, ganadorId: number): number {
  const t = torneoDe(j, b.torneoId);
  if (!t || b.ronda == null || b.slot == null) return 0;
  t.rondas[b.ronda][b.slot].ganadorId = ganadorId;
  const sig = t.rondas[b.ronda + 1];
  if (sig) {
    const par = sig[b.slot >> 1];
    if (b.slot % 2 === 0) par.aId = ganadorId; else par.bId = ganadorId;
    // en vieja escuela la pelea siguiente ya está en la cartelera de esta noche
    const prox = e.cartelera.find(x => x.torneoId === t.id && x.ronda === b.ronda! + 1 && x.slot === b.slot! >> 1);
    if (prox) { prox.aId = par.aId; prox.bId = par.bId; }
    return 0;
  }
  // final
  t.estado = 'terminado';
  t.campeonId = ganadorId;
  const g = j.peleadores.find(p => p.id === ganadorId)!;
  let premio = 0;
  const idx = j.peleadores.findIndex(p => p.id === ganadorId);
  premio = Math.max(ECONOMIA.torneo.premioMin, Math.round((g.contrato?.bolsa ?? 0) * ECONOMIA.torneo.premioPorBolsa));
  j.peleadores[idx] = { ...g, ganancias: g.ganancias + premio, popularidad: Math.min(100, g.popularidad + 3) };
  agregarNoticia(j, {
    categoria: 'importante', peleadorId: g.id, titulo: `${nombreCompleto(g)} gana el torneo ${t.nombre}`,
    cuerpo: `Campeón del torneo ${t.genero === 'F' ? 'femenil ' : ''}de ${nombreClase(t.clase, j.ajustes.nombresDivision)}. Premio: ${premio.toLocaleString('en-US')} dólares.`,
  });
  if (t.otorgaTitulo) {
    const div = divisionMia(j, t.genero, t.clase);
    if (div && div.campeonId !== ganadorId) otorgarTitulo(j, div, ganadorId, e, `Ganó el torneo ${t.nombre}`);
  }
  return premio;
}

// Se elimina un evento de torneo: sus rondas vuelven a quedar sin programar
export function liberarEventoTorneo(j: Juego, e: Evento): void {
  const t = torneoDe(j, e.torneoId);
  if (!t) return;
  for (const r of t.rondas) for (const p of r) if (p.eventoId === e.id) { p.eventoId = undefined; p.peleaId = undefined; }
  if (!t.rondas.some(r => r.some(p => p.eventoId != null)) && t.estado === 'en_curso' && !t.rondas.some(r => r.some(p => p.ganadorId != null))) t.estado = 'llaves';
}

export function eliminarTorneo(j: Juego, id: number): string | null {
  const t = j.torneos.find(x => x.id === id);
  if (!t) return 'Torneo no encontrado.';
  if (j.eventos.some(e => e.torneoId === id && e.estado === 'borrador')) return 'Elimina primero los eventos pendientes del torneo.';
  j.torneos = j.torneos.filter(x => x.id !== id);
  return null;
}

