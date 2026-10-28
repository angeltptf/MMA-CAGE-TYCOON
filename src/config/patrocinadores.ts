// Marcas FICTICIAS para los patrocinios personales de los peleadores (y, en la Fase 5, de la empresa).
// Se agrupan por nivel: cuanto más famoso el peleador, más grandes las marcas.

export interface MarcaCfg { marca: string; categoria: string }

export const MARCAS_LOCALES: MarcaCfg[] = [
  { marca: 'Ferretería La Fuerza', categoria: 'Comercio local' },
  { marca: 'Taquería El Campeón', categoria: 'Restaurante' },
  { marca: 'Cementos Volcán', categoria: 'Construcción' },
  { marca: 'Gimnasio Titán', categoria: 'Gimnasio' },
  { marca: 'Refaccionaria Rayo', categoria: 'Automotriz' },
  { marca: 'Aceros del Norte', categoria: 'Industria' },
  { marca: 'Barbería Don Chuy', categoria: 'Comercio local' },
  { marca: 'Tequila Sierra Azul', categoria: 'Bebidas' },
];

export const MARCAS_MEDIAS: MarcaCfg[] = [
  { marca: 'Vortex Energy', categoria: 'Bebida energética' },
  { marca: 'IronLeaf Suplementos', categoria: 'Suplementos' },
  { marca: 'Kodiak Wear', categoria: 'Ropa deportiva' },
  { marca: 'NitroFuel', categoria: 'Bebida energética' },
  { marca: 'Bravo Gear', categoria: 'Equipo de combate' },
  { marca: 'ZenBrew', categoria: 'Cerveza' },
  { marca: 'PulseFit', categoria: 'Tecnología' },
  { marca: 'Frontier Moto', categoria: 'Automotriz' },
];

export const MARCAS_GRANDES: MarcaCfg[] = [
  { marca: 'Apex Motors', categoria: 'Automotriz' },
  { marca: 'SkyJet Airways', categoria: 'Aerolínea' },
  { marca: 'Lumen Tech', categoria: 'Tecnología' },
  { marca: 'CryptoNova', categoria: 'Cripto / fintech' },
  { marca: 'BetLynx', categoria: 'Casa de apuestas' },
  { marca: 'Titan Sports Group', categoria: 'Ropa deportiva' },
  { marca: 'Solaris Watches', categoria: 'Relojes' },
  { marca: 'Meridian Banco', categoria: 'Banca' },
];

export const PATROCINIO_PERSONAL = {
  popMin: 12,                   // por debajo de esta fama nadie lo patrocina
  probSemanaBase: 0.012,        // x (pop/25)^1.5
  pagoAnualBase: 1200,          // pago anual = base * exp(k * popularidad)
  pagoAnualK: 0.07,
  pagosPorAnio: 4,              // cada pelea paga 1/4 del anual
  duracionAnios: [1, 3] as [number, number],
  maxPorPop: [[75, 4], [55, 3], [35, 2], [12, 1]] as [number, number][],
  moralAlFirmar: 4,
  exigenciaPorPatrocinio: 0.03, // sube lo que pide al renegociar
  exigenciaMax: 0.15,
};

export function marcasPorPop(pop: number): MarcaCfg[] {
  if (pop >= 60) return [...MARCAS_GRANDES, ...MARCAS_MEDIAS];
  if (pop >= 32) return [...MARCAS_MEDIAS, ...MARCAS_LOCALES.slice(0, 3)];
  return MARCAS_LOCALES;
}
