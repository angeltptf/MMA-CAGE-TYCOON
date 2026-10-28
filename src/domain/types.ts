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
export type Dificultad = 'facil' | 'normal' | 'dificil' | 'hardcore';
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
  enVenta: boolean;           // lo ofrezco a otras compañías (más ofertas)
  sinNegociarHasta: number;   // semana absoluta; se ofendió con una oferta insultante
  descansoHasta: number;      // semana absoluta; no puede pelear antes
  peleas: HistorialPelea[];   // últimas peleas (la más reciente primero)
}

export interface HistorialPelea {
  eventoId: number;
  eventoNombre: string;
  semana: number;
  peleaId: number;
  clase: ClaseId;
  genero: Genero;
  titulo: boolean;
  rivalId: number;
  rivalNombre: string;
  resultado: Resultado;
  metodo: string;             // 'KO' | 'TKO' | 'SUB' | 'DU' ...
  round: number;
  tiempo: string;
  miRecord: string;           // récord al llegar a la pelea
  rivalRecord: string;
  miRank: number;             // 0 = campeón, 99 = sin ranking
  rivalRank: number;
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
  ofertaId?: number;
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
  eventos: Evento[];
  ofertas: OfertaTraspaso[];
  sigEvento: number;
  sigPelea: number;
  sigOferta: number;
  contadores: { ppv: number; noche: number };
  poblacionObjetivo: number;
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

// ---------- Eventos ----------
export type TipoEvento = 'ppv' | 'noche';
export type Metodo = 'KO' | 'TKO' | 'SUB' | 'DU' | 'DD' | 'DM' | 'E' | 'DQ' | 'NC';

export interface StatsPelea {
  golpes: number;
  golpesSig: number;
  derribos: number;
  intentosDerribo: number;
  subIntentos: number;
  controlSeg: number;
  caidas: number;             // veces que cayó por golpes
}

export interface ResultadoPelea {
  ganadorId: number | null;
  metodo: Metodo;
  tecnica?: string;
  round: number;
  tiempo: string;             // m:ss
  tarjetas: [number, number][]; // una por juez [A, B]
  stats: { a: StatsPelea; b: StatsPelea };
  narracion: string[];        // una línea por round (y el final)
}

export interface Instantanea {
  record: string;
  rank: number;               // 0 = campeón, 99 = sin ranking
  campeon: boolean;
  momio: number;              // americano (-285 / +223)
  racha: string;
  forma: Resultado[];
  pesoKg: number;
}

export interface Pelea {
  id: number;
  genero: Genero;
  clase: ClaseId;
  aId: number | null;
  bId: number | null;
  titulo: boolean;
  interino: boolean;
  rounds: 3 | 5;
  hype: number;
  snap?: { a: Instantanea; b: Instantanea };
  resultado?: ResultadoPelea;
}

export interface FinanzasEvento {
  precio: number;
  aforo: number;
  boletosVendidos: number;
  taquilla: number;
  transmision: number;
  patrocinios: number;
  renta: number;
  produccion: number;
  viaje: number;
  bolsas: number;
  bonosVictoria: number;
  bonosNoche: number;
  neto: number;
  popularidad: number;        // puntos ganados (o perdidos) por la empresa
  clima?: string;
}

export interface Evento {
  id: number;
  tipo: TipoEvento;
  nombre: string;
  nombrePropio: boolean;
  numero: number;
  semana: number;             // semana absoluta
  sedeId: string;
  nPeleas: number;
  precio: number;
  estado: 'borrador' | 'realizado' | 'cancelado';
  confirmado: boolean;
  cartelera: Pelea[];         // en orden: la primera es la más débil, la última el estelar
  finanzas?: FinanzasEvento;
  peleadorNoche?: number;
  peleaNoche?: number;
  actuacionNoche?: number[];
}

export interface OfertaTraspaso {
  id: number;
  peleadorId: number;
  companiaId: string;
  monto: number;              // lo que ofrecen por el traspaso
  maxMonto: number;           // lo máximo que pagarían (oculto)
  semanaCreada: number;
  semanaVence: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';
}
