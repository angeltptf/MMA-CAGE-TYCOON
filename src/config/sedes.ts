// Sedes disponibles. La renta se calcula con el aforo y el país (ver costoRenta),
// y cada sede exige cierta popularidad de la empresa para desbloquearse.
import { ECONOMIA } from './economia';

export type TipoSede = 'gimnasio' | 'teatro' | 'arena' | 'estadio' | 'plaza';

export interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  pais: string;               // ISO-2
  aforo: number;
  tipo: TipoSede;
  costo: number;
  popMin: number;             // popularidad de la empresa necesaria
  soloOferta: boolean;        // solo se desbloquea con ofertas de inversionistas (Fase 5)
}

export const TIPO_SEDE_LABEL: Record<TipoSede, string> = {
  gimnasio: 'Gimnasio', teatro: 'Teatro / auditorio', arena: 'Arena techada', estadio: 'Estadio al aire libre', plaza: 'Plaza',
};

// nombre | ciudad | país | aforo | tipo | (oferta)
const CRUDO = `
Gimnasio Municipal|Colima|MX|500|gimnasio
Auditorio Universitario|Colima|MX|1200|teatro
Gimnasio Estatal Colima|Colima|MX|3000|arena
Centro de Convenciones Manzanillo|Manzanillo|MX|1800|teatro
Auditorio Telmex|Guadalajara|MX|2500|teatro
Gimnasio Olímpico Guadalajara|Guadalajara|MX|5000|arena
Auditorio Pabellón M|Monterrey|MX|3500|teatro
Gimnasio Nuevo León Unido|Monterrey|MX|5000|arena
Auditorio Municipal Tijuana|Tijuana|MX|1500|teatro
Gimnasio Gran Tijuana|Tijuana|MX|4000|arena
Centro de Convenciones Cancún|Cancún|MX|2000|teatro
Arena Caribe Cancún|Cancún|MX|4800|arena
Auditorio Nacional|Ciudad de México|MX|10000|teatro
Arena Guadalajara|Guadalajara|MX|10000|arena
Arena México|Ciudad de México|MX|16500|arena
Arena Monterrey|Monterrey|MX|17500|arena
Palacio de los Deportes|Ciudad de México|MX|18000|arena
Arena Ciudad de México|Ciudad de México|MX|22000|arena
Estadio Caliente|Tijuana|MX|27000|estadio
Estadio Corona|Torreón|MX|30000|estadio
Plaza México|Ciudad de México|MX|41000|plaza
Estadio Universitario UANL|San Nicolás de los Garza|MX|41000|estadio
Estadio Olímpico Universitario|Ciudad de México|MX|48000|estadio
Estadio Akron|Guadalajara|MX|48000|estadio
Estadio Cuauhtémoc|Puebla|MX|51000|estadio
Estadio BBVA|Monterrey|MX|53500|estadio
Estadio Jalisco|Guadalajara|MX|55000|estadio
Estadio Banorte (Azteca)|Ciudad de México|MX|83000|estadio
Town Hall|Springfield|US|200|gimnasio
Town Theatre|Springfield|US|300|teatro
Town Stadium|Springfield|US|600|estadio
City Hall|Riverside|US|750|teatro
City Theatre|Riverside|US|1000|teatro
City Stadium|Riverside|US|2500|estadio
City Music Arena|Nashville|US|5000|arena
City Sports Arena|Denver|US|7500|arena
Rajamangala Indoor Stadium|Bangkok|TH|8000|arena
Las Vegas Bay|Las Vegas|US|12000|arena
London Arena|Londres|GB|12000|arena
Auckland Arena|Auckland|NZ|12000|arena
Glasgow Arena|Glasgow|GB|14500|arena
Oslo Arena|Oslo|NO|15000|arena
Seoul Olympic Arena|Seúl|KR|15000|arena
Los Angeles Arena|Los Ángeles|US|15000|arena
Madrid Center|Madrid|ES|17453|arena
Barcelona Arena|Barcelona|ES|17960|arena
Inglewood Forum|Inglewood|US|18000|arena
Brooklyn Center|Nueva York|US|19000|arena
Boston Garden|Boston|US|19580|arena
Berlin Arena|Berlín|DE|19250|arena
Sao Paulo Arena|São Paulo|BR|20000|arena
Johannesburg Dome|Johannesburgo|ZA|20000|arena
Atlanta Center|Atlanta|US|21000|arena
Dublin Stadium|Dublín|IE|21000|arena
Sydney Dome|Sídney|AU|21032|arena
T-Mobile Arena|Las Vegas|US|20000|arena
Madison Square Garden|Nueva York|US|20000|arena
Kraków Arena|Cracovia|PL|22000|arena
Montreal Centre|Montreal|CA|23152|arena
Chicago Center|Chicago|US|23500|arena
London Dome|Londres|GB|30000|arena
Nanterre Arena|París|FR|30681|arena
Hong Kong Stadium|Hong Kong|HK|35000|estadio
Saitama Super Arena|Saitama|JP|37000|arena
Chicago Park|Chicago|US|38000|estadio
Houston Park|Houston|US|45000|estadio
Toronto Centre|Toronto|CA|49282|estadio
Auckland Park|Auckland|NZ|50000|estadio
Rajamangala Stadium|Bangkok|TH|51552|estadio
Vancouver Place|Vancouver|CA|54500|estadio
Tokyo Dome|Tokio|JP|55000|estadio
Lagos Stadium|Lagos|NG|55000|estadio
Melbourne Stadium|Melbourne|AU|56347|estadio
Warsaw Stadium|Varsovia|PL|58500|estadio
Wuhan Sports Stadium|Wuhan|CN|60000|estadio
Seoul Football Stadium|Seúl|KR|66704|estadio
Yokohama Stadium|Yokohama|JP|72327|estadio
Berlin Olympic Stadium|Berlín|DE|74475|estadio
Cardiff Stadium|Cardiff|GB|78000|estadio
Rio Olympic Stadium|Río de Janeiro|BR|78838|estadio
Maracanã|Río de Janeiro|BR|78000|estadio
Dublin Park|Dublín|IE|80000|estadio
London Stadium|Londres|GB|80000|estadio
Tokyo National Stadium|Tokio|JP|80016|estadio
Estadio Wembley|Londres|GB|90000|estadio
Stade de Paris|París|FR|80698|estadio
New Jersey Stadium|Nueva Jersey|US|82500|estadio
Johannesburg Stadium|Johannesburgo|ZA|94736|estadio
Camp Barça|Barcelona|ES|99354|estadio
Moscow Stadium|Moscú|RU|100000|estadio
Adelaide Oval|Adelaida|AU|105000|estadio
Singapore Indoor Stadium|Singapur|SG|12000|arena
Mercedes-Benz Arena|Shanghái|CN|18000|arena
Stockholm Arena|Estocolmo|SE|13850|arena
Moscow Sport Arena|Moscú|RU|13926|arena
Saint Petersburg Palace|San Petersburgo|RU|12300|arena
Etihad Arena|Abu Dabi|AE|18000|arena|oferta
Coca-Cola Arena|Dubái|AE|17000|arena|oferta
Kingdom Arena|Riad|SA|25000|arena|oferta
Estadio Internacional Rey Fahd|Riad|SA|68000|estadio|oferta
Estadio Lusail|Lusail|QA|88000|estadio|oferta
`;

// Cuánto cuesta cada país respecto al promedio
const FACTOR_PAIS: Record<string, number> = {
  US: 1.6, GB: 1.4, JP: 1.4, FR: 1.3, DE: 1.2, AU: 1.2, CA: 1.2, NO: 1.5, SE: 1.3, IE: 1.1, ES: 1.0,
  KR: 0.9, HK: 1.2, SG: 1.3, CN: 0.7, PL: 0.7, RU: 0.7, BR: 0.8, MX: 0.8, NZ: 1.0, ZA: 0.6, NG: 0.5,
  TH: 0.5, AE: 2.5, SA: 2.5, QA: 2.5,
};

export const factorPais = (pais: string) => FACTOR_PAIS[pais] ?? 1;

export function costoRenta(aforo: number, pais: string, tipo: TipoSede): number {
  const e = ECONOMIA.renta;
  const bruto = e.porAsiento * aforo * (1 + aforo / e.escala) * factorPais(pais) * (tipo === 'estadio' ? e.recargoEstadio : 1);
  return bruto < 1000 ? Math.round(bruto / 10) * 10 : Math.round(bruto / 100) * 100;
}

export function popMinSede(aforo: number): number {
  const e = ECONOMIA.sedes;
  return Math.max(0, Math.round((Math.log10(aforo) - e.log0) * e.pendiente));
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SEDES: Sede[] = CRUDO.trim().split('\n').map(l => {
  const [nombre, ciudad, pais, aforo, tipo, oferta] = l.split('|');
  const a = Number(aforo);
  const t = tipo as TipoSede;
  return {
    id: slug(`${nombre}-${ciudad}`), nombre, ciudad, pais, aforo: a, tipo: t,
    costo: costoRenta(a, pais, t), popMin: oferta ? Math.max(popMinSede(a), 30) : popMinSede(a), soloOferta: !!oferta,
  };
}).sort((x, y) => y.aforo - x.aforo);

export const SEDE_POR_ID: Record<string, Sede> = Object.fromEntries(SEDES.map(s => [s.id, s]));

// La sede más pequeña, la que se usa por defecto al crear un evento
export const SEDE_INICIAL = SEDES.slice().sort((a, b) => a.aforo - b.aforo)[0];

export const PAISES_EXTRA: Record<string, string> = {
  HK: 'Hong Kong', NO: 'Noruega', SG: 'Singapur', AE: 'Emiratos Árabes Unidos', SA: 'Arabia Saudita', QA: 'Catar',
};
