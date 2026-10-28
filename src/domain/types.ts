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
  rankPts: number;            // puntos de ranking en mi empresa (suben y bajan con resultados)
  patrocinios: PatrocinioPersonal[];
  rcd: RecordsPeleador;
}

export interface PatrocinioPersonal {
  marca: string;
  categoria: string;
  pagoAnual: number;
  semanaFin: number;
}

export interface RecordsPeleador {
  defensas: number;           // defensas de título totales
  defensasConsec: number;     // defensas consecutivas del reinado actual
  mejorDefensasConsec: number;
  reinados: number;
  edadPrimerTitulo: number | null;
  edadUltimoTitulo: number | null;
  peleadorNoche: number;
  peleaNoche: number;
  actuaciones: number;
  bonosDinero: number;
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
  ganancia?: { bolsa: number; victoria: number; campeonato: number; finalizacion: number; noche: number; patrocinio?: number };
  etiquetaTorneo?: string;
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
  previo?: Record<number, number>; // lugar antes del último evento (0 = campeón), para las flechas
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
  negocioId?: number;
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

export interface FilaFinanza { semana: number; cat: string; monto: number }
export interface CajaPunto { semana: number; caja: number }

// ---------- Negocios: patrocinios, televisión e inversionistas (todo por contratos) ----------
export type TipoNegocio = 'patrocinio' | 'tv' | 'inversion';
export type RubroTV = 'bares' | 'redes' | 'streaming_nicho' | 'tv_abierta' | 'cable' | 'streaming_global' | 'ppv' | 'documental';
export type ModalidadInv = 'unico' | 'paquete' | 'residencia' | 'capital' | 'subsidio';

export interface ObjetivoNegocio {
  id: string;
  tipo: 'eventos' | 'lleno' | 'pais' | 'titulos' | 'popularidad' | 'estrellas';
  meta: number;
  pais?: string;
  bono: number;
  progreso: number;
  cumplido: boolean;
}

export interface CondicionInv { tipo: 'titulo' | 'estrellas' | 'local'; meta: number }

export interface DatosInversion {
  modalidad: ModalidadInv;
  pais: string;                 // país anfitrión (o sede del fondo)
  eventos: number;              // cuántos eventos incluye
  eventosHechos: number;
  condiciones: CondicionInv[];
  pctUtilidades: number;        // capital: % de las utilidades de cada evento que se queda el inversionista
  semanaObjetivo: number;
  eventoIds: number[];
}

export interface Negocio {
  id: number;
  tipo: TipoNegocio;
  estado: 'oferta' | 'activo' | 'terminado' | 'rechazado' | 'expirado' | 'roto';
  nombre: string;               // marca, cadena o fondo
  rubro: string;                // categoría de patrocinio, tipo de TV o modalidad
  region: string;               // 'global' o región (mexico, eeuu, latam...)
  detalle: string;
  pagoAnual: number;            // se paga por semana (anual / 52)
  pagoUnico: number;            // bono de firma
  pagoPorEvento: number;        // extra por cada evento realizado
  duracionAnios: number;
  exclusivo: boolean;
  ppvPct?: number;              // PPV: lo que se queda el socio de las compras
  eventosMinAnio?: number;      // TV: mínimo de eventos al año
  penalizacion: number;         // multa por incumplir o romper (se calcula al momento)
  objetivos: ObjetivoNegocio[];
  popMin: number;
  margen: number;               // hasta cuánto más pagarían (oculto)
  contraIntentada: boolean;
  perk?: string;
  factorCripto?: number;        // patrocinio cripto: el pago se mueve con el mercado
  semanaCreada: number;
  semanaVence: number;          // hasta cuándo vale la oferta
  semanaInicio?: number;
  semanaFin?: number;
  eventosPeriodo: number;       // eventos realizados en el año contractual actual
  pagoTotal: number;            // dinero cobrado hasta hoy
  inv?: DatosInversion;
  renovacion?: boolean;
}

export interface CanalYoutube { subs: number; vistas: number; ingresos: number; virales: number }

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
  negocios: Negocio[];
  sigNegocio: number;
  youtube: CanalYoutube;
  cooldownPropuestas: number; // semana desde la que se pueden pedir propuestas otra vez
  finanzas: FilaFinanza[];     // libro de movimientos (por semana y categoría)
  cajaHist: CajaPunto[];      // caja al final de cada semana
  torneos: Torneo[];
  sigTorneo: number;
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
export type TipoEvento = 'ppv' | 'noche' | 'torneo';
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
  torneoId?: number;          // si es una pelea de torneo
  ronda?: number;             // 0 = primera ronda
  slot?: number;              // posición dentro de la ronda
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
  premios: number;            // premios de torneo
  ppv?: number;               // ingreso por compras de PPV (mi parte)
  inversion?: number;         // pago de inversionistas por este evento
  compradoresPPV?: number;
  vistasYoutube?: number;
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
  torneoId?: number;
  bonos?: BonosNoche;
  precioPPV?: number;
  inversionistaId?: number;     // evento pactado con un inversionista
  patrocinadorNaming?: string;
}

export interface BonosNoche {
  peleadorNoche: number | null;
  peleaNoche: number | null;     // id de la pelea
  actuaciones: number[];         // ids de peleadores (máx. 2)
  pagado: boolean;
  total: number;
}

// ---------- Torneos ----------
export interface PartidoTorneo {
  aId: number | null;
  bId: number | null;
  ganadorId: number | null;
  peleaId?: number;
  eventoId?: number;
}

export interface Torneo {
  id: number;
  nombre: string;
  genero: Genero;
  clase: ClaseId;
  tam: 4 | 8 | 16;
  tipo: 'vieja' | 'moderna';     // vieja escuela: todo en un evento · moderna: una ronda por evento
  sorteoAuto: boolean;
  otorgaTitulo: boolean;
  cupos: (number | null)[];      // participantes elegidos
  rondas: PartidoTorneo[][];     // vacío hasta sortear las llaves
  estado: 'cupos' | 'llaves' | 'en_curso' | 'terminado';
  campeonId?: number;
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
