import { EMPRESA } from '../config/balance';
import { MUNDO } from '../config/mundo';
import { scoreCalif } from './peleador';
import type { Compania, Juego } from './types';

// Popularidad global de una compañía (0-100)
export function popularidadEmpresa(c: Compania): number {
  const max = Math.max(...Object.values(c.popRegion));
  return Math.round(max * 0.6 + c.reputacion * 0.4);
}

export function alcance(pop: number): string {
  let nombre = EMPRESA.alcance[0].nombre;
  for (const a of EMPRESA.alcance) if (pop >= a.min) nombre = a.nombre;
  return nombre;
}

// Calidad del roster: promedio de la calificación de sus 10 mejores peleadores (0-10)
export function calidadRoster(j: Juego, companiaId: string): number {
  const s = j.peleadores.filter(p => p.companiaId === companiaId && !p.retirado).map(scoreCalif).sort((a, b) => b - a).slice(0, 10);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
}

// Puntaje para ordenar y para calcular las estrellas: prestigio, reputación, ingresos y calidad del roster
export function puntajeCompania(c: Compania, calidad = 0): number {
  return c.reputacion * 0.6 + Math.log10(c.fans + 1) * 6 + Math.log10(c.ingresosAnuales + 1) * 2 + calidad * MUNDO.pesoCalidadRoster;
}

export function puntajesCompanias(j: Juego): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of j.companias) m.set(c.id, puntajeCompania(c, calidadRoster(j, c.id)));
  return m;
}

export function tierPorPuntaje(p: number): number {
  let t = 1;
  MUNDO.estrellasUmbral.forEach((u, i) => { if (p >= u) t = i + 2; });
  return t;
}

export function ordenCompanias(j: Juego): Compania[] {
  const pts = puntajesCompanias(j);
  return j.companias.slice().sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0));
}

export function posicionMia(j: Juego): number {
  return ordenCompanias(j).findIndex(c => c.esMia) + 1;
}

export const miEmpresa = (j: Juego) => j.companias.find(c => c.esMia)!;
