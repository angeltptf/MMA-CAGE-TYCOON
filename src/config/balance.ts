// Valores de balance editables. Nada de esto está metido en la lógica del juego.
import type { Dificultad } from '../domain/types';

export interface DificultadCfg {
  nombre: string;
  dineroInicial: number;
  descripcion: string;
  libresBajos: number;      // agentes libres extra de 0-1 estrellas que se generan al empezar
}
// Población inicial = peleadores de las 10 rivales (~1,160) + 340 agentes libres base + libresBajos
export const DIFICULTAD: Record<Dificultad, DificultadCfg> = {
  facil:    { nombre: 'Fácil',    dineroInicial: 2_500_000, libresBajos: 500,  descripcion: 'Mucho margen para equivocarte. ~2,000 peleadores.' },
  normal:   { nombre: 'Normal',   dineroInicial: 750_000,   libresBajos: 750,  descripcion: 'Lo justo para armar tu primera cartelera. ~2,250 peleadores.' },
  dificil:  { nombre: 'Difícil',  dineroInicial: 250_000,   libresBajos: 1000, descripcion: 'Cada dólar cuenta desde la semana 1. ~2,500 peleadores.' },
  hardcore: { nombre: 'Hardcore', dineroInicial: 50_000,    libresBajos: 1500, descripcion: 'Empiezas desde lo más bajo con $50K. ~3,000 peleadores, casi todos de 0 y 1 estrella.' },
};

export const SEMANAS_POR_ANIO = 52;

// --- Peleadores ---
export const PELEADOR = {
  // Estrellas de calificación = round(score)/2, de 0.5 a 5
  pesoCalif: { ataque: 0.35, defensa: 0.25, fisico: 0.40 },
  // Umbrales de popularidad → etiqueta de estatus
  estatus: [
    { min: 0,  nombre: 'Prospecto' },
    { min: 14, nombre: 'Preliminar' },
    { min: 28, nombre: 'Tarjeta principal' },
    { min: 44, nombre: 'Estelar' },
    { min: 60, nombre: 'Estelar de PPV' },
    { min: 76, nombre: 'Superestrella' },
    { min: 90, nombre: 'Leyenda' },
  ],
  leyendaMinPeleas: 25,
  // Curva de edad: factor sobre el pico de carrera
  pico: { desde: 28, hasta: 32 },
  fatigaMaxParaPelear: 40,      // por encima no se puede programar
  danoMaxParaPelear: 70,
  contratoPorVencer: 2,         // peleas restantes para considerarlo "por vencer"
  tope: 10,
  topeElite: 15,
};

// --- Progresión semanal ---
export const PROGRESION = {
  recuperacionFatigaSemana: 18,
  recuperacionDanoSemana: 1.2,
  // aumento anual máximo de habilidad (se reparte por semana) según edad
  ganaAnual: (edad: number, potencialEst: number, califEst: number): number => {
    const margen = Math.max(0, potencialEst - califEst); // estrellas por crecer
    if (edad < 22) return 0.5 + margen * 0.5;
    if (edad < 25) return 0.3 + margen * 0.4;
    if (edad < 28) return 0.1 + margen * 0.25;
    if (edad <= 32) return 0;
    if (edad <= 35) return -0.12;
    return -0.25;
  },
  // pérdida anual extra de físicos al envejecer (mentón, cardio, velocidad)
  declivioFisicoAnual: (edad: number): number => (edad >= 33 ? 0.1 + (edad - 33) * 0.06 : 0),
  probEliteSemana: 0.002,       // subir por encima de 10 (solo élite) — lento a propósito
  lesionSemanaBase: 0.0013,
  lesionDuracion: [3, 26],      // semanas
  tiposLesion: [
    'Esguince de tobillo', 'Costilla fracturada', 'Corte en la ceja', 'Lesión de rodilla (LCA leve)',
    'Fractura de mano', 'Desgarre muscular', 'Hombro lesionado', 'Conmoción leve', 'Lesión de codo',
    'Fractura de nariz',
  ],
};

// --- Retiros y nuevo talento ---
export const CICLO_VIDA = {
  edadRetiroDesde: 34,
  edadRetiroForzado: 43,
  probRetiroPorAnio: 0.06,      // por cada año sobre edadRetiroDesde
  retiroPorDano: 0.004,         // por punto de daño acumulado
  controlDeficit: 0.15,         // fracción del déficit que se cubre por semana
  maxNuevosPorSemana: 8,
  pctNuevosLibres: 0.55,        // el resto firma con compañías rivales
  edadDebut: [18, 23],
};

// --- Contratos ---
export const CONTRATOS = {
  bolsaBase: 300,
  bolsaPorPopularidad: 0.0765,  // bolsa = base * exp(pop * k)
  bolsaMin: 250,
  bonoVictoriaPct: 1.0,         // bono por victoria = bolsa * pct
  bonoCampeonatoPct: 0.5,
  puntosPPVDesdePop: 76,
  peleasDefault: 6,
  peleasMin: 1,
  peleasMax: 20,
  bonoFirmaPct: 1.0,            // bono de firma de un agente libre (x bolsa)
  clausulaMult: 1.5,            // cláusula = (bolsa + bono) * peleas * mult
  clausulaMayorEdad: 0.7,       // descuento si tiene 35+
  rescisionMiaPct: 0.5,         // lo que pago por romper un contrato mío (x bolsa x peleas)
  // el peleador pide más si es muy popular o tiene alta moral de rival
};

// --- Compañía ---
export const EMPRESA = {
  alcance: [
    { min: 0,  nombre: 'Local' },
    { min: 15, nombre: 'Regional' },
    { min: 40, nombre: 'Nacional' },
    { min: 65, nombre: 'Internacional' },
    { min: 85, nombre: 'Mundial' },
  ],
  popularidadInicial: 6,
  fansIniciales: 3_000,
  reputacionInicial: 8,
  regiones: ['mexico', 'eeuu', 'latam', 'europa', 'asia', 'medioOriente'] as const,
  gameOverSemanasNegativo: 8,
};

export const REGION_LABEL: Record<string, string> = {
  mexico: 'México', eeuu: 'EE. UU. / Canadá', latam: 'Latinoamérica',
  europa: 'Europa', asia: 'Asia', medioOriente: 'Medio Oriente', otro: 'Otras regiones',
};

export const RANKING_TAM = 15;
export const RANKING_RECALCULO_SEMANAS = 4;
export const RANGO_RESPALDO_DIAS = 7;

// --- Negociación de contratos ---
export const NEGOCIACION = {
  // peso de cada concepto en el valor que el peleador percibe de un contrato (por pelea)
  pesos: { victoria: 0.55, campeonato: 0.15, finalizacion: 0.35, noche: 0.12, ppvPorPunto: 0.12 },
  sensibilidadDuracion: 0.015,   // por pelea de diferencia con la duración que prefiere
  sensibilidadClausula: 0.12,    // le molesta una cláusula alta y le gusta una baja
  penalExclusividad: 0.93,
  margenContraoferta: 0.30,      // por debajo de esto rechaza en lugar de contraofertar
  umbralOfensa: 0.55,            // por debajo se ofende y no negocia en unas semanas
  semanasOfendido: 4,
  exigenciaDificultad: { facil: -0.05, normal: 0, dificil: 0.05, hardcore: 0.10 } as Record<Dificultad, number>,
  clausulaMinPct: 0.25,          // la cláusula no puede bajar de este % de la "normal"
  clausulaMaxPct: 6,
  bonoRenovacionPct: 0.5,        // bono de firma al renovar (x bolsa)
};

// --- Traspasos: ofertas de otras compañías por mis peleadores ---
export const TRASPASOS = {
  probSemanaBase: 0.012,         // por peleador mío y semana, antes de multiplicadores
  multEnVenta: 5,
  semanasVigencia: 4,
  pctClausulaMin: 0.30,          // oferta típica = cláusula x [min, max]
  pctClausulaMax: 0.90,
  probPagaClausula: 0.07,        // pagan la cláusula completa: se va sin pedirme permiso
  margenMaxOferta: [1.05, 1.6] as [number, number], // lo máximo que pagarían, x su oferta
  minPopularidad: 8,             // por debajo nadie ofrece por él
  moralPierdeAlRechazar: 6,
};
