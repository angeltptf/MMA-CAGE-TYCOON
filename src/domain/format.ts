import { SEMANAS_POR_ANIO } from '../config/balance';
import { CLASES } from '../config/divisiones';
import type { Ajustes, ClaseId, Genero } from './types';

export function dinero(n: number, signo = false): string {
  const neg = n < 0;
  const a = Math.abs(n);
  let t: string;
  if (a >= 1e9) t = `${(a / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  else if (a >= 1e6) t = `${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  else if (a >= 1e4) t = `${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  else if (a >= 1e3) t = `${(a / 1e3).toFixed(2)}K`;
  else t = `${Math.round(a)}`;
  return `${neg ? '-' : signo && n > 0 ? '+' : ''}$${t}`;
}

export function numeroCorto(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
}

export const anio = (semanaAbs: number) => Math.floor(semanaAbs / SEMANAS_POR_ANIO) + 1;
export const semanaDelAnio = (semanaAbs: number) => (semanaAbs % SEMANAS_POR_ANIO) + 1;
export const fecha = (semanaAbs: number) => `Año ${anio(semanaAbs)} · Semana ${semanaDelAnio(semanaAbs)}`;
export const fechaCorta = (semanaAbs: number) => `A${anio(semanaAbs)} S${semanaDelAnio(semanaAbs)}`;

export function altura(cm: number, u: Ajustes['unidades']): string {
  if (u === 'metrico') return `${Math.round(cm)} cm`;
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
}

export function peso(kg: number, u: Ajustes['unidades']): string {
  if (u === 'metrico') return `${kg.toFixed(1)} kg`;
  return `${Math.round(kg * 2.20462)} lb`;
}

export function limiteClase(clase: ClaseId, g: Genero, u: Ajustes['unidades']): string {
  const lb = CLASES[clase].limiteLb[g];
  if (u === 'imperial') return `${lb} lb`;
  return `${(lb / 2.20462).toFixed(1)} kg`;
}

export function nombreClase(clase: ClaseId, idioma: Ajustes['nombresDivision']): string {
  return idioma === 'es' ? CLASES[clase].es : CLASES[clase].en;
}

export function abrevClase(clase: ClaseId, g: Genero): string {
  return `${g === 'F' ? '♀ ' : ''}${CLASES[clase].abrev}`;
}

export const pct = (x: number) => `${Math.round(x)}%`;
