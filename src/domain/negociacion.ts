// Negociación de contratos: el peleador valora lo que le ofreces y responde
// aceptando, contraofertando o rechazando (y a veces ofendiéndose).
import { CONTRATOS, NEGOCIACION } from '../config/balance';
import { PATROCINIO_PERSONAL } from '../config/patrocinadores';
import { clamp } from './rng';
import { bolsaSugerida, clausulaDe, contratoSugerido } from './peleador';
import type { Contrato, Juego, Peleador } from './types';

export type RespuestaNegociacion =
  | { tipo: 'acepta'; mensaje: string }
  | { tipo: 'contraoferta'; contrato: Contrato; mensaje: string }
  | { tipo: 'rechaza'; mensaje: string; ofendido: boolean };

export type ModoContrato = 'fichar' | 'renovar';

export const peleasPreferidas = (p: Peleador): number =>
  p.edad >= 34 ? 8 : p.potencial >= 4 && p.edad <= 27 ? 4 : CONTRATOS.peleasDefault;

// Cuánto vale el contrato a los ojos del peleador (dinero equivalente por pelea)
export function valorContrato(c: Contrato, p: Peleador): number {
  const w = NEGOCIACION.pesos;
  const base = bolsaSugerida(p);
  const ppv = c.puntosPPV * base * w.ppvPorPunto;
  let v = c.bolsa + c.bonoVictoria * w.victoria + c.bonoCampeonato * w.campeonato
    + c.bonoFinalizacion * w.finalizacion + c.bonoNoche * w.noche + ppv;
  const dir = p.edad >= 34 ? 1 : p.potencial >= 4 && p.edad <= 27 ? -1 : 0;
  v *= 1 + dir * NEGOCIACION.sensibilidadDuracion * (c.peleasRestantes - peleasPreferidas(p));
  const ratio = c.clausula / Math.max(1, clausulaDe(c, p.edad));
  const fClaus = ratio <= 0.05 ? 1.1 : clamp(1 - NEGOCIACION.sensibilidadClausula * Math.log(ratio), 0.86, 1.1);
  v *= fClaus;
  if (c.exclusividad) v *= NEGOCIACION.penalExclusividad;
  return v;
}

export interface Exigencia { pide: Contrato; ventajas: string[]; umbral: number }

// Lo que el peleador pide hoy y por qué (los "factores de negociación")
export function exigencia(j: Juego, p: Peleador): Exigencia {
  const ventajas: string[] = [];
  let m = 1 + NEGOCIACION.exigenciaDificultad[j.dificultad];
  if (j.divisiones.some(d => d.campeonId === p.id)) { ventajas.push('Campeón'); m += 0.10; }
  if (p.popularidad >= 60) ventajas.push('Muy popular');
  else if (p.popularidad >= 40) ventajas.push('Popular');
  if (p.racha.tipo === 'V' && p.racha.n >= 3) { ventajas.push(`Racha de ${p.racha.n} victorias`); m += 0.04; }
  if (p.potencial >= 4 && p.edad <= 25) { ventajas.push('Gran prospecto'); m += 0.05; }
  const ofertas = j.ofertas.filter(o => o.peleadorId === p.id && o.estado === 'pendiente').length;
  if (ofertas) { ventajas.push(`Ofertas de otras compañías (${ofertas})`); m += Math.min(0.2, ofertas * 0.05); }
  if (p.patrocinios.length) {
    ventajas.push(`Patrocinadores personales (${p.patrocinios.length})`);
    m += Math.min(PATROCINIO_PERSONAL.exigenciaMax, p.patrocinios.length * PATROCINIO_PERSONAL.exigenciaPorPatrocinio);
  }
  if (p.enVenta) m -= 0.03;
  if (p.moral < 45) { ventajas.push('Descontento'); m += 0.08; }
  if (p.moral > 80) m -= 0.04;
  if (p.edad >= 36) m -= 0.06;
  const pide = contratoSugerido(p, peleasPreferidas(p));
  pide.bolsa = Math.round(pide.bolsa * m);
  pide.bonoVictoria = Math.round(pide.bonoVictoria * m);
  pide.bonoCampeonato = Math.round(pide.bonoCampeonato * m);
  pide.clausula = clausulaDe(pide, p.edad);
  // con moral alta acepta algo menos de lo que pide; nunca exige más de lo que pidió
  const umbral = 1 - clamp((p.moral - 60) / 500, 0, 0.08);
  return { pide, ventajas, umbral };
}

export function evaluarOferta(j: Juego, p: Peleador, oferta: Contrato): RespuestaNegociacion {
  if (p.sinNegociarHasta > j.semanaAbs) {
    return { tipo: 'rechaza', ofendido: false, mensaje: `${p.nombre} se niega a hablar contigo por ${p.sinNegociarHasta - j.semanaAbs} semanas más.` };
  }
  const { pide, umbral } = exigencia(j, p);
  const r = valorContrato(oferta, p) / Math.max(1, valorContrato(pide, p));
  if (r >= umbral) {
    return { tipo: 'acepta', mensaje: r >= umbral + 0.15 ? 'Le encanta la oferta. ¡Acepta!' : 'Acepta los términos.' };
  }
  if (r >= umbral - NEGOCIACION.margenContraoferta) {
    const k = clamp(umbral / r, 1, 1.6);
    const c: Contrato = {
      ...oferta,
      bolsa: Math.round(oferta.bolsa * k),
      bonoVictoria: Math.round(oferta.bonoVictoria * k),
    };
    return { tipo: 'contraoferta', contrato: c, mensaje: 'Está interesado, pero pide más dinero.' };
  }
  const ofendido = r < NEGOCIACION.umbralOfensa;
  return {
    tipo: 'rechaza', ofendido,
    mensaje: ofendido ? 'Se ofendió con la oferta y no quiere hablar por unas semanas.' : 'Rechaza la oferta: está muy por debajo de lo que pide.',
  };
}

