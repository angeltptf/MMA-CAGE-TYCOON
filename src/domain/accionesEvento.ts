// Acciones del jugador sobre sus eventos (operan sobre un juego ya clonado).
import { ECONOMIA } from '../config/economia';
import { SEDE_POR_ID } from '../config/sedes';
import {
  boutVacia, cambiarNumeroPeleas, crearEvento, estaCompleto, hypeBout, matchmakingAutomatico,
  ordenarPorHype, ponerNombre, sedeDesbloqueada, validarPelea,
} from './eventos';
import { realizarEvento } from './noche';
import { liberarEventoTorneo } from './torneos';
import { penalizarEventoInversion } from './negocios';
import { Rng, clamp } from './rng';
import type { Evento, Juego, Pelea, TipoEvento } from './types';

const buscar = (j: Juego, id: number): Evento | undefined => j.eventos.find(e => e.id === id);
const editable = (e: Evento | undefined): e is Evento => !!e && e.estado === 'borrador';

export function accCrearEvento(j: Juego, semana: number, tipo: TipoEvento, salida: { id?: number }): string | null {
  const e = crearEvento(j, semana, tipo);
  if (typeof e === 'string') return e;
  salida.id = e.id;
  return null;
}

export function accConfigurar(
  j: Juego, id: number, patch: { sedeId?: string; precio?: number; precioPPV?: number; tipo?: TipoEvento; nombre?: string; nPeleas?: number },
): string | null {
  const e = buscar(j, id);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  if (patch.sedeId) {
    const s = SEDE_POR_ID[patch.sedeId];
    if (!s) return 'Sede no encontrada.';
    if (!sedeDesbloqueada(j, s)) return 'Esa sede aún está bloqueada para tu empresa.';
    e.sedeId = s.id;
  }
  if (patch.precio != null) e.precio = clamp(Math.round(patch.precio), ECONOMIA.precio.min, ECONOMIA.precio.max);
  if (patch.precioPPV != null) e.precioPPV = clamp(Math.round(patch.precioPPV), 5, 500);
  if (patch.tipo && patch.tipo !== e.tipo) {
    // al cambiar de tipo se reasigna la numeración si el nombre no es propio
    e.tipo = patch.tipo;
    if (!e.nombrePropio) {
      const mia = j.companias.find(c => c.esMia)!;
      const n = patch.tipo === 'ppv' ? ++j.contadores.ppv : ++j.contadores.noche;
      e.numero = n;
      e.nombre = patch.tipo === 'ppv' ? `${mia.siglas} ${n}` : `${mia.siglas} Fight Night ${n}`;
    }
  }
  if (patch.nombre != null) ponerNombre(e, patch.nombre);
  if (patch.nPeleas != null) cambiarNumeroPeleas(j, e, patch.nPeleas);
  e.confirmado = false;
  return null;
}

// Pone o cambia los peleadores y opciones de un combate
export function accGuardarPelea(
  j: Juego, eventoId: number, peleaId: number,
  datos: { aId: number; bId: number; genero: Pelea['genero']; clase: Pelea['clase']; titulo: boolean; interino: boolean; rounds: 3 | 5 },
): { error?: string; avisos: string[] } {
  const e = buscar(j, eventoId);
  if (!editable(e)) return { error: 'Este evento ya no se puede modificar.', avisos: [] };
  const b = e.cartelera.find(x => x.id === peleaId);
  if (!b) return { error: 'Combate no encontrado.', avisos: [] };
  if (b.torneoId) return { error: 'Las peleas de un torneo las define la llave.', avisos: [] };
  const a = j.peleadores.find(p => p.id === datos.aId);
  const c = j.peleadores.find(p => p.id === datos.bId);
  if (!a || !c) return { error: 'Elige a los dos peleadores.', avisos: [] };
  const prueba: Pelea = { ...b, ...datos };
  const v = validarPelea(j, e, prueba, a, c);
  if (v.errores.length) return { error: v.errores.join(' '), avisos: v.avisos };
  Object.assign(b, datos);
  b.hype = hypeBout(j, b);
  e.confirmado = false;
  return { avisos: v.avisos };
}

export function accQuitarPelea(j: Juego, eventoId: number, peleaId: number): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  const b = e.cartelera.find(x => x.id === peleaId);
  if (!b) return 'Combate no encontrado.';
  b.aId = null; b.bId = null; b.titulo = false; b.interino = false; b.rounds = 3; b.hype = 0;
  e.confirmado = false;
  return null;
}

export function accReordenar(j: Juego, eventoId: number, ids: number[]): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  const mapa = new Map(e.cartelera.map(b => [b.id, b]));
  const nueva = ids.map(i => mapa.get(i)).filter((b): b is Pelea => !!b);
  if (nueva.length !== e.cartelera.length) return 'No se pudo reordenar.';
  e.cartelera = nueva;
  e.confirmado = false;
  return null;
}

export function accBorrarCartelera(j: Juego, eventoId: number): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  for (const b of e.cartelera) { b.aId = null; b.bId = null; b.titulo = false; b.interino = false; b.rounds = 3; b.hype = 0; }
  e.confirmado = false;
  return null;
}

export function accMatchmaking(j: Juego, eventoId: number, salida: { avisos?: string[]; armadas?: number }): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  const rng = new Rng(j.rngState);
  const r = matchmakingAutomatico(j, e, rng);
  j.rngState = rng.state;
  e.confirmado = false;
  salida.avisos = r.avisos;
  salida.armadas = r.armadas;
  return null;
}

// Sugerencia automática solo para un combate
export function accSugerirPelea(j: Juego, eventoId: number, peleaId: number, salida: { avisos?: string[] }): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  const b = e.cartelera.find(x => x.id === peleaId);
  if (!b) return 'Combate no encontrado.';
  const otros = new Set(e.cartelera.filter(x => x.id !== peleaId).flatMap(x => [x.aId, x.bId]).filter((x): x is number => x != null));
  const temp: Evento = { ...e, nPeleas: 1, cartelera: [] };
  const rng = new Rng(j.rngState);
  const r = matchmakingAutomatico(j, temp, rng, otros);
  j.rngState = rng.state;
  const nueva = temp.cartelera[temp.cartelera.length - 1];
  if (!nueva || boutVacia(nueva)) {
    salida.avisos = ['No hay dos peleadores disponibles para armar una pelea con lógica.'];
    return 'No hay dos peleadores disponibles para armar una pelea con lógica.';
  }
  Object.assign(b, { aId: nueva.aId, bId: nueva.bId, genero: nueva.genero, clase: nueva.clase, titulo: nueva.titulo, interino: nueva.interino, rounds: nueva.rounds });
  b.hype = hypeBout(j, b);
  e.confirmado = false;
  salida.avisos = r.avisos;
  return null;
}

export function accOrdenarPorHype(j: Juego, eventoId: number): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  ordenarPorHype(j, e);
  return null;
}

export function accConfirmar(j: Juego, eventoId: number): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede modificar.';
  if (!estaCompleto(e)) return 'Llena todos los combates antes de confirmar.';
  e.confirmado = true;
  return null;
}

export function accCancelarEvento(j: Juego, eventoId: number): string | null {
  const e = buscar(j, eventoId);
  if (!editable(e)) return 'Este evento ya no se puede cancelar.';
  liberarEventoTorneo(j, e);
  penalizarEventoInversion(j, e);
  j.eventos = j.eventos.filter(x => x.id !== eventoId);
  return null;
}

export function accRealizarEvento(j: Juego, eventoId: number): string | null {
  return realizarEvento(j, eventoId);
}
