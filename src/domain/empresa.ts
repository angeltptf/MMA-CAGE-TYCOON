import { EMPRESA } from '../config/balance';
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

// Puntaje para ordenar el ranking de compañías (la Fase 6 lo refina con ingresos y roster reales)
export function puntajeCompania(c: Compania): number {
  return c.reputacion * 0.6 + Math.log10(c.fans + 1) * 6 + Math.log10(c.ingresosAnuales + 1) * 2;
}

export function ordenCompanias(j: Juego): Compania[] {
  return j.companias.slice().sort((a, b) => puntajeCompania(b) - puntajeCompania(a));
}

export function posicionMia(j: Juego): number {
  return ordenCompanias(j).findIndex(c => c.esMia) + 1;
}

export const miEmpresa = (j: Juego) => j.companias.find(c => c.esMia)!;
