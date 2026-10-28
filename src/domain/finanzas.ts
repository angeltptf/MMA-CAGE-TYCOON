// Libro de finanzas de mi empresa: todo movimiento de dinero pasa por `mover`,
// que actualiza la caja y lo anota por semana y categoría.
import { ECONOMIA } from '../config/economia';
import { popularidadEmpresa } from './empresa';
import type { FilaFinanza, Juego } from './types';

export type CatFinanza =
  | 'taquilla' | 'transmision' | 'patrocinios' | 'traspasos' | 'otros'
  | 'sedes' | 'produccion' | 'viaje' | 'bolsas' | 'bonos' | 'premios' | 'fichajes' | 'indemnizaciones' | 'operacion';

export const CAT_INGRESO: CatFinanza[] = ['taquilla', 'transmision', 'patrocinios', 'traspasos', 'otros'];
export const CAT_GASTO: CatFinanza[] = ['sedes', 'produccion', 'viaje', 'bolsas', 'bonos', 'premios', 'fichajes', 'indemnizaciones', 'operacion'];

export const CAT_LABEL: Record<CatFinanza, string> = {
  taquilla: 'Taquilla', transmision: 'Transmisión', patrocinios: 'Patrocinios', traspasos: 'Traspasos de peleadores', otros: 'Otros ingresos',
  sedes: 'Renta de sedes', produccion: 'Producción', viaje: 'Viajes', bolsas: 'Bolsas de peleadores', bonos: 'Bonos y victorias',
  premios: 'Premios de torneo', fichajes: 'Fichajes y renovaciones', indemnizaciones: 'Indemnizaciones', operacion: 'Operación (staff y gimnasio)',
};

export function mover(j: Juego, cat: CatFinanza, monto: number): void {
  if (!monto) return;
  const mia = j.companias.find(c => c.esMia)!;
  mia.dinero += monto;
  const f: FilaFinanza | undefined = j.finanzas.find(x => x.semana === j.semanaAbs && x.cat === cat);
  if (f) f.monto += monto;
  else j.finanzas.push({ semana: j.semanaAbs, cat, monto });
}

export function resumenPeriodo(j: Juego, desde: number, hasta: number): { porCat: Partial<Record<CatFinanza, number>>; ingresos: number; gastos: number; neto: number } {
  const porCat: Partial<Record<CatFinanza, number>> = {};
  let ingresos = 0;
  let gastos = 0;
  for (const f of j.finanzas) {
    if (f.semana < desde || f.semana > hasta) continue;
    const c = f.cat as CatFinanza;
    porCat[c] = (porCat[c] ?? 0) + f.monto;
    if (f.monto >= 0) ingresos += f.monto; else gastos += -f.monto;
  }
  return { porCat, ingresos, gastos, neto: ingresos - gastos };
}

// Neto de cada semana en el rango (para la gráfica)
export function netoPorSemana(j: Juego, desde: number, hasta: number): { semana: number; neto: number }[] {
  const m = new Map<number, number>();
  for (const f of j.finanzas) if (f.semana >= desde && f.semana <= hasta) m.set(f.semana, (m.get(f.semana) ?? 0) + f.monto);
  const res = [];
  for (let s = desde; s <= hasta; s++) res.push({ semana: s, neto: m.get(s) ?? 0 });
  return res;
}

// Gasto semanal de operación: staff y gimnasio, crece con tamaño y fama
export function costoOperacion(j: Juego): number {
  const o = ECONOMIA.operacion;
  const mia = j.companias.find(c => c.esMia)!;
  const mios = j.peleadores.reduce((n, p) => n + (p.companiaId === j.miId && !p.retirado ? 1 : 0), 0);
  return Math.round((o.base + o.porPeleador * mios) * Math.exp(o.k * popularidadEmpresa(mia)));
}

// Ingresos de las últimas 52 semanas (alimenta el ranking de compañías)
export function ingresosAnuales(j: Juego): number {
  const r = resumenPeriodo(j, j.semanaAbs - 51, j.semanaAbs);
  return Math.round((r.porCat.taquilla ?? 0) + (r.porCat.transmision ?? 0) + (r.porCat.patrocinios ?? 0));
}
