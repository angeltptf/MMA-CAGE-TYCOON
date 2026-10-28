import { CONTRATOS, PELEADOR } from '../config/balance';
import { clamp } from './rng';
import type { Contrato, Division, Juego, Peleador, Rec } from './types';

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

// Calificación 0-10 a partir de habilidades y físicos
export function scoreCalif(p: Peleador): number {
  const atk = Object.values(p.ataque).sort((a, b) => b - a);
  const def = Object.values(p.defensa).sort((a, b) => b - a);
  const f = p.fis;
  const fisico = media([f.agilidad, f.menton, f.corazon, f.potencia, f.velocidad, f.cardio]);
  const w = PELEADOR.pesoCalif;
  return media(atk.slice(0, 2)) * w.ataque + media(def.slice(0, 2)) * w.defensa + fisico * w.fisico;
}

export function estrellasCalif(p: Peleador): number {
  return clamp(Math.round(scoreCalif(p)) / 2, 0.5, 5);
}

export function estatus(p: Peleador): string {
  const peleas = p.rec.tot.v + p.rec.tot.d + p.rec.tot.e + p.rec.tot.nc;
  let nombre = PELEADOR.estatus[0].nombre;
  for (const e of PELEADOR.estatus) {
    if (p.popularidad >= e.min) nombre = e.nombre;
  }
  if (nombre === 'Leyenda' && peleas < PELEADOR.leyendaMinPeleas) return 'Superestrella';
  return nombre;
}

export const totalPeleas = (r: Rec) => r.v + r.d + r.e + r.nc;
export const recordTxt = (r: Rec) => `${r.v}-${r.d}-${r.e}`;
export const nombreCompleto = (p: Peleador) => `${p.nombre} ${p.apellido}`;
export const nombreCorto = (p: Peleador) => `${p.nombre[0]}. ${p.apellido}`;

export function disponible(p: Peleador): boolean {
  return (
    !p.retirado && !p.lesion && !!p.contrato &&
    p.fatiga <= PELEADOR.fatigaMaxParaPelear && p.dano <= PELEADOR.danoMaxParaPelear
  );
}

export const porVencer = (p: Peleador) =>
  !!p.contrato && p.contrato.peleasRestantes <= PELEADOR.contratoPorVencer;

// Factores de edad sobre el pico (1 = mejor momento)
export function factorTecnico(edad: number): number {
  if (edad <= 20) return 0.74;
  if (edad <= 27) return 0.74 + (edad - 20) * 0.037;
  if (edad <= 33) return 1;
  return Math.max(0.7, 1 - (edad - 33) * 0.025);
}
export function factorFisico(edad: number): number {
  if (edad <= 20) return 0.8;
  if (edad <= 26) return 0.8 + (edad - 20) * 0.033;
  if (edad <= 31) return 1;
  return Math.max(0.55, 1 - (edad - 31) * 0.045);
}

const redondear = (x: number) => {
  if (x < 10_000) return Math.round(x / 100) * 100;
  if (x < 1_000_000) return Math.round(x / 1000) * 1000;
  return Math.round(x / 10_000) * 10_000;
};

export function bolsaSugerida(p: Peleador): number {
  const base = CONTRATOS.bolsaBase * Math.exp(p.popularidad * CONTRATOS.bolsaPorPopularidad);
  const calidad = 0.85 + estrellasCalif(p) * 0.06;
  return Math.max(CONTRATOS.bolsaMin, redondear(base * calidad));
}

export function clausulaDe(c: Pick<Contrato, 'bolsa' | 'bonoVictoria' | 'peleasRestantes'>, edad: number): number {
  const m = CONTRATOS.clausulaMult * (edad >= 35 ? CONTRATOS.clausulaMayorEdad : 1);
  return redondear((c.bolsa + c.bonoVictoria) * c.peleasRestantes * m);
}

export function contratoSugerido(p: Peleador, peleas: number = CONTRATOS.peleasDefault): Contrato {
  const bolsa = bolsaSugerida(p);
  const bonoVictoria = redondear(bolsa * CONTRATOS.bonoVictoriaPct);
  const c: Contrato = {
    peleasRestantes: peleas,
    bolsa,
    bonoVictoria,
    bonoCampeonato: redondear(bolsa * CONTRATOS.bonoCampeonatoPct),
    puntosPPV: p.popularidad >= CONTRATOS.puntosPPVDesdePop ? Math.round((p.popularidad - 70) / 6) : 0,
    bonoFinalizacion: 0,
    bonoNoche: 0,
    exclusividad: false,
    clausula: 0,
  };
  c.clausula = clausulaDe(c, p.edad);
  return c;
}

export const bonoFirma = (c: Contrato) => Math.round(c.bolsa * CONTRATOS.bonoFirmaPct);
export const costoRescision = (c: Contrato) =>
  Math.round(c.bolsa * c.peleasRestantes * CONTRATOS.rescisionMiaPct);

export function peleadorPorId(j: Juego, id: number): Peleador | undefined {
  return j.peleadores.find(p => p.id === id);
}

export function divisionDe(j: Juego, p: Peleador): Division | undefined {
  if (!p.companiaId) return undefined;
  return j.divisiones.find(d => d.id === `${p.companiaId}:${p.genero}:${p.clase}`);
}
