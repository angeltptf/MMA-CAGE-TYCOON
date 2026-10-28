// Negocios: patrocinios de la empresa, derechos de televisión y ofertas de inversionistas.
// Todas las marcas, cadenas y fondos son FICTICIOS (salvo YouTube, que pediste tal cual).
// Todos los números de balance viven aquí.
import type { RubroTV } from '../domain/types';

export const NEG = {
  // valor de referencia anual de un contrato "1x" = valorBase * exp(k * popularidad)
  valorBase: 2300,
  valorK: 0.07,
  vigenciaOfertaSemanas: [4, 9] as [number, number],
  maxOfertasPendientes: 10,
  probOfertaPatrocinioBase: 0.09,   // por semana; + pop/400
  probOfertaTVBase: 0.045,          // por semana; + pop/800
  probOfertaInvBase: 0.008,         // por semana; + pop/3000 (desde popInvMin)
  popInvMin: 16,
  maxNoExclusivosPorCategoria: 3,
  // capacidad comercial: cuántos contratos activos soporta tu empresa a cada nivel de fama
  capacidadPatrocinios: { base: 4, cada: 10 },
  capacidadTV: { base: 2, cada: 15 },
  noExclusivoMult: 0.75,
  exclusivoMult: 1.45,
  bonoFirmaPct: [0.08, 0.25] as [number, number],
  margenContra: [0.05, 0.32] as [number, number],
  contraSegundoChance: 0.5,         // si pides un poco más de su margen, 50% de que aun así acepten
  rompePatrocinioPct: 0.35,         // multa por romper = pago restante x pct
  rompeTVPct: 0.5,
  rompeInvPct: 0.75,
  reputacionRomper: 4,
  reputacionIncumplir: 2,
  renovacionProb: 0.6,
  propuestas: { cooldownSemanas: 8, minOfertas: 1, maxOfertas: 3 },
  eventosBase: 12,                  // eventos por año que se asumen para repartir pagos por evento
  // distribución de duración (1..5 años) según popularidad: [bajo, medio, alto]
  duraciones: [
    [0.5, 0.3, 0.1, 0.05, 0.05],
    [0.3, 0.3, 0.2, 0.08, 0.12],
    [0.15, 0.25, 0.25, 0.1, 0.25],
  ] as number[][],
  duracionExtraPago: 0.05,          // +5% de pago por cada año extra de compromiso
};

// ---------- Patrocinios de la empresa ----------
export interface CategoriaPat {
  id: string;
  nombre: string;
  mult: number;
  popMin: number;
  porEvento?: boolean;              // se paga por evento y no por año (naming)
  perk?: string;
  perkTexto?: string;
  marcas: [string[], string[], string[]]; // locales, medianas, grandes
}

const m = (s: string) => s.split('|');

export const CATEGORIAS: CategoriaPat[] = [
  { id: 'lona', nombre: 'Lona y octágono', mult: 1.4, popMin: 5, marcas: [m('Cementos Volcán|Aceros del Norte'), m('Kodiak Industrial|Bravo Seguridad'), m('Titan Logistics|Orión Energía')] },
  { id: 'bebida', nombre: 'Bebida oficial', mult: 2.0, popMin: 10, marcas: [m('Aguas Sierra Azul|Refrescos La Cumbre'), m('AquaPura|Frutal Max'), m('Glacier Water|Nova Cola')] },
  { id: 'energetica', nombre: 'Bebida energética', mult: 1.8, popMin: 8, perk: 'recuperacion', perkTexto: 'Tus peleadores recuperan +3 de fatiga por semana', marcas: [m('Rayo Energy|Toro Bravo'), m('Vortex Energy|NitroFuel'), m('Redline Power|Hyperion Charge')] },
  { id: 'cerveza', nombre: 'Cerveza oficial', mult: 2.1, popMin: 15, marcas: [m('Cervecería Caporal|Alba Dorada'), m('ZenBrew|Brava Lager'), m('Aurora Premium|Gran Reserva 1894')] },
  { id: 'ropa', nombre: 'Ropa y uniformes', mult: 1.6, popMin: 6, perk: 'fans', perkTexto: '+10% de fans nuevos por evento', marcas: [m('Deportes El Guerrero|Ropa Tigre'), m('Kodiak Wear|Bravo Gear'), m('Titan Sports Group|Zenith Apparel')] },
  { id: 'apuestas', nombre: 'Casa de apuestas', mult: 3.0, popMin: 20, marcas: [m('Apuestas El Trébol|PlayMX Sports'), m('BetLynx|Cuota Real'), m('Goldline Bet|Arena Odds')] },
  { id: 'automotriz', nombre: 'Automotriz', mult: 2.5, popMin: 24, marcas: [m('Autos del Pacífico|Motos Rayo'), m('Frontier Motors|Veloce'), m('Apex Motors|Titan Motors')] },
  { id: 'tecnologia', nombre: 'Tecnología', mult: 2.0, popMin: 18, perk: 'transmision', perkTexto: '+5% en lo que ganas por transmisión', marcas: [m('Compucentro|Redes Colima'), m('PulseFit|Lumen Tech'), m('Quantum Devices|Nexo Cloud')] },
  { id: 'suplementos', nombre: 'Suplementos', mult: 1.2, popMin: 6, perk: 'recuperacion2', perkTexto: 'Tus peleadores recuperan +2 de fatiga por semana', marcas: [m('Nutri Fuerza|Proteínas El Coloso'), m('IronLeaf Suplementos|Muscle Labs'), m('Olympus Nutrition|Alpha Fuel')] },
  { id: 'cripto', nombre: 'Cripto / fintech', mult: 2.5, popMin: 22, perk: 'cripto', perkTexto: 'Pago volátil: sube o baja con el mercado y la marca podría quebrar', marcas: [m('Peso Digital|CoinMX'), m('CryptoNova|Satoshi Pay'), m('Orbit Exchange|Helix Finance')] },
  { id: 'aerolinea', nombre: 'Aerolínea oficial', mult: 2.2, popMin: 24, perk: 'viaje', perkTexto: 'Tus viajes al extranjero cuestan 50% menos', marcas: [m('Aero Costa|VuelaMX'), m('SkyJet Airways|Aerolíneas Meridiano'), m('Global Wings|Celestia Air')] },
  { id: 'videojuego', nombre: 'Videojuego oficial', mult: 2.2, popMin: 26, perk: 'fans', perkTexto: '+10% de fans nuevos por evento', marcas: [m('Pixel Arcade|Retro Cage'), m('Octagon Legends|Fight Nation'), m('Ultimate Cage Game|Combat Core')] },
  { id: 'naming', nombre: 'Naming del evento', mult: 1.0, popMin: 12, porEvento: true, perk: 'naming', perkTexto: 'Tus eventos se anuncian "presentado por" la marca', marcas: [m('Casa Ruiz|Tortillas El Gallo'), m('Banco Meridian|Claro Mobile'), m('Aurora Premium|Apex Motors')] },
  { id: 'banca', nombre: 'Banca y seguros', mult: 2.4, popMin: 28, marcas: [m('Caja Popular Colima|Seguros La Roca'), m('Banco Meridian|Seguros Atlas'), m('Global Trust Bank|Zurich Nova')] },
  { id: 'comida', nombre: 'Comida rápida', mult: 1.3, popMin: 7, marcas: [m('Taquería El Campeón|Pollos Don Beto'), m('Burger Bravo|Pizza Octágono'), m('GrillMaster|Crunch Chicken')] },
  { id: 'telecom', nombre: 'Telefonía celular', mult: 2.0, popMin: 20, perk: 'taquilla', perkTexto: '+3% de boletos vendidos', marcas: [m('Celular Costa|Telefonía Sol'), m('Movilnet Plus|Conecta 5G'), m('Claro Mobile|Tigo Nova')] },
  { id: 'licor', nombre: 'Tequila y licores', mult: 1.8, popMin: 14, marcas: [m('Tequila Sierra Azul|Mezcal La Cumbre'), m('Don Anselmo|Reposado Real'), m('Gran Patrón Negro|Casa Dragones Ónix')] },
  { id: 'delivery', nombre: 'Apps de delivery', mult: 1.5, popMin: 12, marcas: [m('PedidosYa Colima|Rappi Local'), m('Hungry Bolt|QuickBite'), m('DeliveroX|UberFeast')] },
  { id: 'salud', nombre: 'Clínica y salud', mult: 1.2, popMin: 6, perk: 'recuperacion2', perkTexto: 'Tus peleadores recuperan +2 de fatiga por semana', marcas: [m('Clínica San Rafael|Fisio Colima'), m('Vitalis Salud|Ortho Plus'), m('Mayo Medical|Apollo Care')] },
  { id: 'inmobiliaria', nombre: 'Bienes raíces', mult: 1.6, popMin: 18, marcas: [m('Terrenos del Valle|Inmuebles Costa'), m('Casas Premium|Torre Alta'), m('Prime Estates|Skyline Capital')] },
  { id: 'gimnasios', nombre: 'Cadena de gimnasios', mult: 1.3, popMin: 5, perk: 'operacion', perkTexto: '-10% en tus gastos de operación', marcas: [m('Gimnasio Titán|Box Colima'), m('Smart Fit MX|Iron Temple'), m('Anytime Gym|Equinox Fight')] },
];

export const CAT_POR_ID: Record<string, CategoriaPat> = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

// ---------- Televisión y plataformas ----------
export interface TipoTVCfg {
  id: RubroTV;
  nombre: string;
  descripcion: string;
  popMin: number;                   // popularidad en la región para que te ofrezcan
  mult: number;                     // x el valor de referencia
  estructura: 'anual' | 'evento' | 'ppv' | 'unico';
  eventosMin: number;               // mínimo de eventos al año (0 = sin mínimo)
  exclusivoPosible: boolean;
  alcance: number;                  // puntos de popularidad regional por evento transmitido
  global: boolean;
  duraciones: number[];             // años posibles
  cadenas: [string[], string[], string[]];
  perkTexto: string;
}

export const TIPOS_TV: TipoTVCfg[] = [
  { id: 'bares', nombre: 'TV de bares y gimnasios', descripcion: 'Tus peleas en las pantallas de bares deportivos, gimnasios y fondas.', popMin: 0, mult: 0.25, estructura: 'evento', eventosMin: 0, exclusivoPosible: false, alcance: 0.03, global: false, duraciones: [1, 2], perkTexto: 'Te pagan por cada evento transmitido', cadenas: [m('BarVisión|Pantallas El Compa'), m('Sports Bar Network|GymTV Network'), m('Pub Screens Europa|Taproom TV')] },
  { id: 'redes', nombre: 'Clips y redes sociales', descripcion: 'Acuerdo con creadores y plataformas de video corto para difundir tus mejores momentos.', popMin: 2, mult: 0.14, estructura: 'evento', eventosMin: 0, exclusivoPosible: false, alcance: 0.06, global: false, duraciones: [1, 2, 3], perkTexto: 'Más probabilidad de KO viral (popularidad y fans gratis)', cadenas: [m('ClipLoop|ShortFight'), m('Reel Arena|Viral Ring'), m('Mega Clips|Pulse Social')] },
  { id: 'streaming_nicho', nombre: 'Streaming de nicho', descripcion: 'Plataforma de pago especializada en deportes de combate.', popMin: 6, mult: 0.9, estructura: 'anual', eventosMin: 6, exclusivoPosible: false, alcance: 0.06, global: false, duraciones: [1, 2, 3], perkTexto: 'Pago fijo anual a cambio de un mínimo de eventos', cadenas: [m('RingSide Play|OctaPlay'), m('KO Stream|Cage Pass'), m('Fightflix|ArenaGo')] },
  { id: 'tv_abierta', nombre: 'TV abierta', descripcion: 'Canal de televisión nacional o regional: poco dinero, muchísimo alcance.', popMin: 12, mult: 1.0, estructura: 'anual', eventosMin: 10, exclusivoPosible: true, alcance: 0.18, global: false, duraciones: [1, 2, 3, 4], perkTexto: 'Gran alcance: sube mucho tu popularidad en la región', cadenas: [m('Telecanal 9|Canal Costa 4'), m('Red Nacional 6|Televisión Azteca Nova'), m('Canal Deportes Uno|Cadena Latina HD')] },
  { id: 'cable', nombre: 'TV de paga / cable', descripcion: 'Canales deportivos de paga que pagan bien por contenido de combate.', popMin: 24, mult: 3.0, estructura: 'anual', eventosMin: 12, exclusivoPosible: true, alcance: 0.1, global: false, duraciones: [1, 2, 3, 4, 5], perkTexto: 'Buen dinero fijo; exigen un mínimo de eventos al año', cadenas: [m('ProSports Cable|Canal Combate Plus'), m('ArenaSport|Combat Channel'), m('Titan Sports Network|Gladiator TV')] },
  { id: 'streaming_global', nombre: 'Streaming global', descripcion: 'Una gran plataforma mundial compra tus derechos para todo el planeta.', popMin: 42, mult: 6.0, estructura: 'anual', eventosMin: 14, exclusivoPosible: true, alcance: 0.25, global: true, duraciones: [2, 3, 4, 5], perkTexto: 'Mucho dinero y alcance mundial, con exigencias altas', cadenas: [m('Nimbus+|OrbitTV'), m('StreamHub|Globo Combat'), m('Aurora Prime Video|Zenith Stream')] },
  { id: 'ppv', nombre: 'Pay-per-view', descripcion: 'Un socio distribuye tus eventos numerados como PPV: garantía por evento y un porcentaje de las compras.', popMin: 30, mult: 1.2, estructura: 'ppv', eventosMin: 3, exclusivoPosible: false, alcance: 0.08, global: true, duraciones: [1, 2, 3, 4], perkTexto: 'Solo para eventos numerados: tú pones el precio del PPV', cadenas: [m('ViewMax PPV|PayPerFight'), m('Fight Night Live|Mega Event TV'), m('Premier PPV|Grand Slam Pay')] },
  { id: 'documental', nombre: 'Serie documental', descripcion: 'Una plataforma produce una serie sobre tus peleadores y tu promotora.', popMin: 14, mult: 2.2, estructura: 'unico', eventosMin: 0, exclusivoPosible: false, alcance: 0.0, global: true, duraciones: [1], perkTexto: 'Pago único alto y un empujón de popularidad al estrenarse', cadenas: [m('DocuFlix Originals|Cine Vérité'), m('Detrás de la Jaula Studios|Crónicas MMA'), m('Netcast Docs|Prime Stories')] },
];

export const TV_POR_ID: Record<string, TipoTVCfg> = Object.fromEntries(TIPOS_TV.map(t => [t.id, t]));

export const YOUTUBE = {
  subsIniciales: 600,
  vistasPorSub: [0.3, 1.2],         // vistas de un evento = subs * (min + hype/80)
  cpm: 9,                           // dólares por 1,000 vistas (con monetización)
  monetizaDesdeSubs: 1000,
  subsPorVista: 0.05,
  subsPorHype: 2.5,
  crecimientoSemana: 0.0015,
  popularidadPorLog: 0.14,          // popularidad regional por evento = k * log10(1 + vistas/200)
  popularidadMax: 0.8,
  fansPorVista: 0.04,
  viralProb: 0.12,                  // tras un evento con finalización
  viralMultRedes: 2,
  viralVistas: [4, 14],             // x subs
  ofertasPorSub: 6,                 // los patrocinadores te ven más con más suscriptores: 1 + log10(subs)/6
};

// ---------- Inversionistas ----------
export interface FondoCfg { nombre: string; pais: string; ciudad: string; presentacion: string }

export const FONDOS: FondoCfg[] = [
  { nombre: 'Fondo Halcón del Desierto', pais: 'SA', ciudad: 'Riad', presentacion: 'Un fondo de inversión de Riad quiere llevar tu empresa a Arabia Saudita.' },
  { nombre: 'Abu Rayan Holdings', pais: 'AE', ciudad: 'Abu Dabi', presentacion: 'Un grupo de Abu Dabi te invita a montar una noche de peleas en su isla de entretenimiento.' },
  { nombre: 'Lusail Capital Partners', pais: 'QA', ciudad: 'Lusail', presentacion: 'Un fondo catarí ofrece un espectáculo en el estadio de la Copa del Mundo.' },
  { nombre: 'Dragon Pearl Capital', pais: 'CN', ciudad: 'Shanghái', presentacion: 'Inversionistas de Shanghái quieren abrir el mercado chino a tu empresa.' },
  { nombre: 'Sakura Mirai Fund', pais: 'JP', ciudad: 'Tokio', presentacion: 'Un fondo japonés busca un evento de nivel mundial en Tokio.' },
  { nombre: 'Marina Bay Ventures', pais: 'SG', ciudad: 'Singapur', presentacion: 'Un grupo de Singapur propone una residencia anual en su arena.' },
  { nombre: 'Neon Strip Entertainment', pais: 'US', ciudad: 'Las Vegas', presentacion: 'Un casino de Las Vegas quiere tu evento en su arena, con todo pagado.' },
  { nombre: 'Samba Participações', pais: 'BR', ciudad: 'Río de Janeiro', presentacion: 'Empresarios cariocas te proponen llenar el Maracanã de lucha.' },
  { nombre: 'Atlas Iberia Group', pais: 'ES', ciudad: 'Madrid', presentacion: 'Un grupo madrileño quiere traer tu marca a Europa.' },
  { nombre: 'Zafiro Capital', pais: 'MX', ciudad: 'Ciudad de México', presentacion: 'Un magnate mexicano apuesta por tu empresa y quiere verla crecer en casa.' },
  { nombre: 'Royal Albion Sports', pais: 'GB', ciudad: 'Londres', presentacion: 'Un consorcio londinense ofrece una noche de pelea en un estadio histórico.' },
  { nombre: 'Maple Leaf Partners', pais: 'CA', ciudad: 'Toronto', presentacion: 'Un fondo canadiense te quiere en su arena con un paquete de eventos.' },
];

export const INV = {
  mult: { unico: 3.0, paquete: 2.4, residencia: 2.0, capital: 9.0, subsidio: 1.2 } as Record<string, number>,
  pesoModalidad: { unico: 30, paquete: 22, residencia: 18, capital: 15, subsidio: 15 } as Record<string, number>,
  semanasHastaEvento: [10, 30] as [number, number],
  espaciadoPaquete: 8,
  espaciadoResidencia: 26,
  incumplirPago: 0.5,
  incumplirReputacion: 2,
  capitalPct: [0.1, 0.25] as [number, number],
  capitalAnios: [2, 5] as [number, number],
  estelarPopMin: 44,              // "Estelar o superior"
};

export const PERKS_INFO: Record<string, string> = Object.fromEntries(CATEGORIAS.filter(c => c.perkTexto).map(c => [c.id, c.perkTexto!]));
