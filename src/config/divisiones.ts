import type { ClaseId, Estilo, Genero } from '../domain/types';

export interface ClaseCfg {
  es: string;
  en: string;
  abrev: string;
  limiteLb: Record<Genero, number>;
  alturaCm: Record<Genero, number>;   // altura media de la división
  pesoGen: Genero[];
}

// Límites oficiales unificados (lb). Altura media aproximada por división.
export const CLASES: Record<ClaseId, ClaseCfg> = {
  paja:       { es: 'Paja',       en: 'Strawweight',       abrev: 'PAJ', limiteLb: { M: 0,   F: 115 }, alturaCm: { M: 0,   F: 161 }, pesoGen: ['F'] },
  mosca:      { es: 'Mosca',      en: 'Flyweight',         abrev: 'MOS', limiteLb: { M: 125, F: 125 }, alturaCm: { M: 166, F: 164 }, pesoGen: ['M', 'F'] },
  gallo:      { es: 'Gallo',      en: 'Bantamweight',      abrev: 'GAL', limiteLb: { M: 135, F: 135 }, alturaCm: { M: 169, F: 168 }, pesoGen: ['M', 'F'] },
  pluma:      { es: 'Pluma',      en: 'Featherweight',     abrev: 'PLU', limiteLb: { M: 145, F: 145 }, alturaCm: { M: 173, F: 171 }, pesoGen: ['M', 'F'] },
  ligero:     { es: 'Ligero',     en: 'Lightweight',       abrev: 'LIG', limiteLb: { M: 155, F: 0 },   alturaCm: { M: 177, F: 0 },   pesoGen: ['M'] },
  welter:     { es: 'Wélter',     en: 'Welterweight',      abrev: 'WEL', limiteLb: { M: 170, F: 0 },   alturaCm: { M: 181, F: 0 },   pesoGen: ['M'] },
  mediano:    { es: 'Mediano',    en: 'Middleweight',      abrev: 'MED', limiteLb: { M: 185, F: 0 },   alturaCm: { M: 185, F: 0 },   pesoGen: ['M'] },
  semipesado: { es: 'Semipesado', en: 'Light Heavyweight', abrev: 'SPS', limiteLb: { M: 205, F: 0 },   alturaCm: { M: 190, F: 0 },   pesoGen: ['M'] },
  pesado:     { es: 'Pesado',     en: 'Heavyweight',       abrev: 'PES', limiteLb: { M: 265, F: 0 },   alturaCm: { M: 193, F: 0 },   pesoGen: ['M'] },
};

export const ORDEN_CLASES: ClaseId[] = [
  'paja', 'mosca', 'gallo', 'pluma', 'ligero', 'welter', 'mediano', 'semipesado', 'pesado',
];

export const DIVISIONES_GENERO: Record<Genero, ClaseId[]> = {
  M: ['mosca', 'gallo', 'pluma', 'ligero', 'welter', 'mediano', 'semipesado', 'pesado'],
  F: ['paja', 'mosca', 'gallo', 'pluma'],
};

// Peso relativo de cada división al generar el mundo
export const PESO_DIVISION: Record<Genero, Partial<Record<ClaseId, number>>> = {
  M: { mosca: 0.10, gallo: 0.13, pluma: 0.16, ligero: 0.19, welter: 0.17, mediano: 0.11, semipesado: 0.09, pesado: 0.07 },
  F: { paja: 0.30, mosca: 0.30, gallo: 0.25, pluma: 0.15 },
};

export const ESTILOS: Record<Estilo, { es: string; en: string }> = {
  boxeador: { es: 'Boxeador', en: 'Boxer' },
  muayThai: { es: 'Muay Thai', en: 'Muay Thai' },
  luchador: { es: 'Luchador', en: 'Wrestler' },
  bjj:      { es: 'BJJ', en: 'BJJ' },
  judoka:   { es: 'Judoka', en: 'Judoka' },
  sambista: { es: 'Sambista', en: 'Sambo' },
  mma:      { es: 'MMA completo', en: 'MMA' },
  karateka: { es: 'Karateka', en: 'Karate' },
};

// Énfasis (0-1) de ataque/defensa por disciplina según el estilo base.
// bjj, boxeo, muayThai, lucha
export const PERFIL_ESTILO: Record<Estilo, { atk: number[]; def: number[]; peso: number }> = {
  boxeador: { atk: [0.30, 1.00, 0.55, 0.30], def: [0.35, 0.95, 0.55, 0.40], peso: 0.14 },
  muayThai: { atk: [0.30, 0.70, 1.00, 0.30], def: [0.35, 0.70, 0.95, 0.40], peso: 0.14 },
  luchador: { atk: [0.55, 0.45, 0.30, 1.00], def: [0.60, 0.50, 0.35, 0.95], peso: 0.20 },
  bjj:      { atk: [1.00, 0.35, 0.30, 0.55], def: [0.95, 0.40, 0.35, 0.60], peso: 0.17 },
  judoka:   { atk: [0.70, 0.35, 0.30, 0.85], def: [0.70, 0.40, 0.35, 0.80], peso: 0.04 },
  sambista: { atk: [0.80, 0.40, 0.35, 0.85], def: [0.75, 0.45, 0.40, 0.80], peso: 0.05 },
  mma:      { atk: [0.80, 0.80, 0.80, 0.80], def: [0.80, 0.80, 0.80, 0.80], peso: 0.20 },
  karateka: { atk: [0.30, 0.60, 0.75, 0.35], def: [0.40, 0.65, 0.80, 0.45], peso: 0.06 },
};

export const DISCIPLINAS = ['bjj', 'boxeo', 'muayThai', 'lucha'] as const;
export const DISCIPLINA_LABEL: Record<string, string> = {
  bjj: 'BJJ', boxeo: 'Boxeo', muayThai: 'Muay Thai', lucha: 'Lucha',
};
export const ATRIBUTOS_FIS = [
  'agilidad', 'agresividad', 'menton', 'corazon', 'potencia', 'velocidad', 'cardio', 'lesiones',
] as const;
export const ATRIBUTO_LABEL: Record<string, string> = {
  agilidad: 'Agilidad', agresividad: 'Agresividad', menton: 'Mentón', corazon: 'Corazón',
  potencia: 'Potencia', velocidad: 'Velocidad', cardio: 'Cardio', lesiones: 'Propensión a lesiones',
};
