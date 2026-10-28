// Tipos del dominio. Todo el estado de la partida es JSON serializable
// (se guarda tal cual en IndexedDB y se exporta como archivo).

export type Genero = 'M' | 'F';
export type ClaseId =
  | 'paja' | 'mosca' | 'gallo' | 'pluma' | 'ligero'
  | 'welter' | 'mediano' | 'semipesado' | 'pesado';
export type Estilo =
  | 'boxeador' | 'muayThai' | 'luchador' | 'bjj'
  | 'judoka' | 'sambista' | 'mma' | 'karateka';
export type Disciplina = 'bjj' | 'boxeo' | 'muayThai' | 'lucha';
export type AtributoFisico =
  | 'agilidad' | 'agresividad' | 'menton' | 'corazon'
  | 'potencia' | 'velocidad' | 'cardio' | 'lesiones';
export type Dificultad = 'facil' | 'normal' | 'dificil';
export type Resultado = 'V' | 'D' | 'E';

export interface Rec { v: number; d: number; e: number; nc: number }
export interface Finales { ko: number; tko: number; sub: number; dec: number }

export interface Contrato {
  peleasRestantes: number;
  bolsa: number;
  bonoVictoria: number;
  bonoCampeonato: number;
  puntosPPV: number;          // porcentaje de PPV (solo estrellas)
  bonoFinalizacion: number;
  bonoNoche: number;
  exclusividad: boolean;
  clausula: number;           // cláusula de rescisión: lo que paga otra compañía por robarlo
}

export interface Lesion { tipo: string; semanas: number }

export interface Peleador {
  id: number;
  nombre: string;
  apellido: string;
  apodo: string;
  pais: string;               // ISO-2
  genero: Genero;
  edad: number;
  cumple: number;             // semana del año (1-52) en que cumple años
  alturaCm: number;
  pesoKg: number;
  clase: ClaseId;
  clasesSec: ClaseId[];
  estilo: Estilo;
  ataque: Record<Disciplina, number>;
  defensa: Record<Disciplina, number>;
  fis: Record<AtributoFisico, number>;
  potencial: number;          // estrellas 0.5-5 (techo de carrera)
  popularidad: number;        // 0-100
  moral: number;              // 0-100
  fatiga: number;             // 0-100
  dano: number;               // 0-100 (daño acumulado)
  lesion: Lesion | null;
  companiaId: string | null;  // null = agente libre
  contrato: Contrato | null;
  rec: { tot: Rec; mio: Rec };
  finales: Finales;           // cómo ganó (carrera)
  forma: Resultado[];         // últimas 5, la más reciente al final
  racha: { tipo: Resultado; n: number };
  mejorRachaV: number;
  peorRachaD: number;
  ganancias: number;
  ultimoCombate: number | null; // semana absoluta
  favorito: boolean;
  retirado: boolean;
  elite: boolean;             // puede superar 10 (tope 15)
}

export interface Compania {
  id: string;
  nombre: string;
  siglas: string;
  color: string;
  pais: string;
  esMia: boolean;
  tier: number;               // estrellas 1-5 (se recalcula en fases futuras)
  dinero: number;
  fans: number;
  reputacion: number;         // 0-100
  ingresosAnuales: number;
  eventosAnio: number;
  popRegion: Record<string, number>; // 0-100 por región
  fundada: number;            // semana absoluta
}

export interface Division {
  id: string;                 // `${companiaId}:${genero}:${clase}`
  companiaId: string;
  genero: Genero;
  clase: ClaseId;
  campeonId: number | null;
  interinoId: number | null;
  ranking: number[];          // #1..#15 (sin el campeón)
}

export type CategoriaNoticia = 'importante' | 'eventos' | 'peleadores' | 'negocios' | 'mundo';

export interface Noticia {
  id: number;
  semana: number;             // semana absoluta
  categoria: CategoriaNoticia;
  titulo: string;
  cuerpo?: string;
  leida: boolean;
  grupo?: string;             // avisos repetidos se agrupan por esta clave
  veces?: number;
  peleadorId?: number;
}

export interface Ajustes {
  unidades: 'metrico' | 'imperial';
  gameOver: boolean;
  velocidadSim: 1 | 2 | 3;
  nombresDivision: 'es' | 'en';
  recordatorioRespaldo: boolean;
}

export interface Juego {
  version: number;
  nombre: string;             // nombre de la partida (empresa)
  dificultad: Dificultad;
  miId: string;
  semanaAbs: number;          // 0 = Año 1 · Semana 1
  rngState: number;
  sigId: number;
  sigNoticia: number;
  companias: Compania[];
  peleadores: Peleador[];
  divisiones: Division[];
  eventos: unknown[];         // Fase 2
  noticias: Noticia[];
  ajustes: Ajustes;
  ultimoRespaldo: number;     // epoch ms
  semanasEnNegativo: number;
  finDelJuego?: boolean;
}

export interface NuevaPartida {
  nombre: string;
  siglas: string;
  color: string;
  pais: string;
  dificultad: Dificultad;
}
