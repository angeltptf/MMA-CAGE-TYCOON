// Promotoras rivales (nombres reales solo como texto). Valores iniciales editables.

export interface CompaniaCfg {
  id: string;
  nombre: string;
  siglas: string;
  color: string;
  pais: string;
  tier: number;             // estrellas 1-5
  peleadores: number;       // tamaño de roster inicial
  dinero: number;
  fans: number;
  reputacion: number;
  ingresosAnuales: number;
  eventosAnio: number;
  talentoMedia: number;     // calidad media del roster (0-10)
  talentoDesv: number;
  pctMujeres: number;
  sesgoPais: Record<string, number>; // multiplicadores sobre el peso global de cada país
}

export const COMPANIAS_RIVALES: CompaniaCfg[] = [
  { id: 'ufc', nombre: 'UFC', siglas: 'UFC', color: '#D20A0A', pais: 'US', tier: 5, peleadores: 220,
    dinero: 3_500_000_000, fans: 25_000_000, reputacion: 98, ingresosAnuales: 1_300_000_000, eventosAnio: 42,
    talentoMedia: 6.6, talentoDesv: 1.25, pctMujeres: 0.17, sesgoPais: { US: 1.4, BR: 1.3, MX: 1.2, RU: 1.1 } },
  { id: 'one', nombre: 'ONE Championship', siglas: 'ONE', color: '#F5C518', pais: 'SG', tier: 4, peleadores: 170,
    dinero: 600_000_000, fans: 12_000_000, reputacion: 85, ingresosAnuales: 300_000_000, eventosAnio: 40,
    talentoMedia: 6.0, talentoDesv: 1.1, pctMujeres: 0.2, sesgoPais: { TH: 4, JP: 2, CN: 2.5, PH: 3, KR: 1.5, US: 0.7, MX: 0.3, BR: 0.9 } },
  { id: 'pfl', nombre: 'PFL / MVP', siglas: 'PFL', color: '#0A7BD2', pais: 'US', tier: 4, peleadores: 140,
    dinero: 250_000_000, fans: 6_000_000, reputacion: 78, ingresosAnuales: 150_000_000, eventosAnio: 26,
    talentoMedia: 5.9, talentoDesv: 1.1, pctMujeres: 0.17, sesgoPais: { US: 1.6, BR: 1.2, GB: 1.2, CA: 1.3 } },
  { id: 'rizin', nombre: 'RIZIN', siglas: 'RIZIN', color: '#E4007F', pais: 'JP', tier: 4, peleadores: 100,
    dinero: 180_000_000, fans: 5_000_000, reputacion: 80, ingresosAnuales: 120_000_000, eventosAnio: 12,
    talentoMedia: 5.8, talentoDesv: 1.2, pctMujeres: 0.2, sesgoPais: { JP: 6, BR: 1.2, KR: 1.5, RU: 1.2, US: 0.6, MX: 0.3 } },
  { id: 'ksw', nombre: 'KSW', siglas: 'KSW', color: '#C8A04B', pais: 'PL', tier: 3, peleadores: 90,
    dinero: 80_000_000, fans: 3_000_000, reputacion: 65, ingresosAnuales: 60_000_000, eventosAnio: 12,
    talentoMedia: 5.3, talentoDesv: 1.1, pctMujeres: 0.1, sesgoPais: { PL: 7, GB: 1.3, DE: 1.5, GE: 1.5, BR: 0.7, US: 0.5, MX: 0.3 } },
  { id: 'oktagon', nombre: 'OKTAGON MMA', siglas: 'OKT', color: '#7A4CE0', pais: 'CZ', tier: 3, peleadores: 80,
    dinero: 50_000_000, fans: 2_000_000, reputacion: 58, ingresosAnuales: 35_000_000, eventosAnio: 10,
    talentoMedia: 5.0, talentoDesv: 1.1, pctMujeres: 0.1, sesgoPais: { PL: 2, DE: 3, GE: 2, RU: 1.3, GB: 1, US: 0.4, MX: 0.3 } },
  { id: 'cw', nombre: 'Cage Warriors', siglas: 'CW', color: '#2E7D32', pais: 'GB', tier: 3, peleadores: 100,
    dinero: 30_000_000, fans: 1_500_000, reputacion: 60, ingresosAnuales: 25_000_000, eventosAnio: 16,
    talentoMedia: 4.8, talentoDesv: 1.2, pctMujeres: 0.15, sesgoPais: { GB: 5, IE: 5, FR: 2, NL: 2, SE: 2, NG: 2, US: 0.5, MX: 0.3 } },
  { id: 'lfa', nombre: 'LFA', siglas: 'LFA', color: '#00A3A3', pais: 'US', tier: 2, peleadores: 100,
    dinero: 15_000_000, fans: 800_000, reputacion: 45, ingresosAnuales: 12_000_000, eventosAnio: 22,
    talentoMedia: 4.4, talentoDesv: 1.2, pctMujeres: 0.15, sesgoPais: { US: 2.5, MX: 1.5, BR: 1.2, CA: 1.2 } },
  { id: 'brave', nombre: 'BRAVE CF', siglas: 'BRAVE', color: '#B8860B', pais: 'AE', tier: 2, peleadores: 90,
    dinero: 14_000_000, fans: 600_000, reputacion: 40, ingresosAnuales: 10_000_000, eventosAnio: 12,
    talentoMedia: 4.1, talentoDesv: 1.3, pctMujeres: 0.1, sesgoPais: { RU: 1.8, KZ: 3, GE: 2, NG: 2, ZA: 2, BR: 1.5, US: 0.4, MX: 0.3 } },
  { id: 'amc', nombre: 'AMC Fight Nights', siglas: 'AMC', color: '#9E9E9E', pais: 'RU', tier: 2, peleadores: 70,
    dinero: 10_000_000, fans: 400_000, reputacion: 35, ingresosAnuales: 8_000_000, eventosAnio: 20,
    talentoMedia: 3.8, talentoDesv: 1.3, pctMujeres: 0.08, sesgoPais: { RU: 6, KZ: 4, GE: 2, US: 0.2, MX: 0.2, BR: 0.4 } },
];

export const TOTAL_PELEADORES_OBJETIVO = 1500;
export const AGENTES_LIBRES_INICIALES = 340;
// Los agentes libres son talento sin firmar: veteranos liberados y prospectos, no estrellas
export const AGENTES_LIBRES_TALENTO = { media: 3.6, desv: 1.1, max: 6.2, popMax: 38 };
