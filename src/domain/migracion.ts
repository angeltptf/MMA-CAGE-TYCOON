import type { Juego } from './types';

// Completa campos nuevos en partidas guardadas con versiones anteriores del juego.
export function normalizarJuego(j: Juego): Juego {
  const x = j as Juego & Record<string, unknown>;
  x.eventos ??= [];
  x.ofertas ??= [];
  x.sigEvento ??= 1;
  x.sigPelea ??= 1;
  x.sigOferta ??= 1;
  x.contadores ??= { ppv: 0, noche: 0 };
  x.poblacionObjetivo ??= j.peleadores.filter(p => !p.retirado).length;
  for (const p of j.peleadores) {
    p.enVenta ??= false;
    p.sinNegociarHasta ??= 0;
    p.descansoHasta ??= 0;
    p.peleas ??= [];
  }
  return j;
}
