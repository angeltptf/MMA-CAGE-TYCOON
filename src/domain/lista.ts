// Filtros y ordenamiento múltiple de la lista de peleadores
import { nombrePais } from '../config/paises';
import { ESTILOS } from '../config/divisiones';
import { disponible, estatus, porVencer, scoreCalif, totalPeleas } from './peleador';
import type { ClaseId, Estilo, Genero, Peleador } from './types';

export interface FilaRank { rank: number; campeon: boolean; dobleCampeon: boolean }

export interface Filtros {
  texto: string;
  genero: Genero | '';
  clase: ClaseId | '';
  estilo: Estilo | '';
  pais: string;
  estatus: string;
  edadMin: number;
  edadMax: number;
  compania: string;          // '' todas · 'libres' · 'mia' · id de compañía
  disponibles: boolean;
  lesionados: boolean;
  porVencer: boolean;
}

export const FILTROS_VACIOS: Filtros = {
  texto: '', genero: '', clase: '', estilo: '', pais: '', estatus: '',
  edadMin: 18, edadMax: 45, compania: '', disponibles: false, lesionados: false, porVencer: false,
};

export type ClaveOrden =
  | 'ultimoCombate' | 'ranking' | 'estilo' | 'edad' | 'peso' | 'popularidad' | 'moral' | 'bolsa'
  | 'bonoVictoria' | 'victorias' | 'derrotas' | 'fatiga' | 'dano' | 'nacionalidad'
  | 'calificacion' | 'potencial' | 'ganancias';

export interface Orden { clave: ClaveOrden; activo: boolean; desc: boolean }

export const ETIQUETA_ORDEN: Record<ClaveOrden, string> = {
  ultimoCombate: 'Último combate', ranking: 'Ranking', estilo: 'Estilo', edad: 'Edad', peso: 'Peso',
  popularidad: 'Popularidad', moral: 'Moral', bolsa: 'Bolsa', bonoVictoria: 'Bono por victoria',
  victorias: 'Victorias', derrotas: 'Derrotas', fatiga: 'Fatiga', dano: 'Daño',
  nacionalidad: 'Nacionalidad', calificacion: 'Calificación', potencial: 'Potencial',
  ganancias: 'Ganancias totales',
};

export const ORDEN_INICIAL: Orden[] = [
  { clave: 'calificacion', activo: true, desc: true },
  { clave: 'ranking', activo: false, desc: false },
  { clave: 'popularidad', activo: false, desc: true },
  { clave: 'ultimoCombate', activo: false, desc: true },
  { clave: 'estilo', activo: false, desc: false },
  { clave: 'edad', activo: false, desc: false },
  { clave: 'peso', activo: false, desc: false },
  { clave: 'moral', activo: false, desc: true },
  { clave: 'bolsa', activo: false, desc: true },
  { clave: 'bonoVictoria', activo: false, desc: true },
  { clave: 'victorias', activo: false, desc: true },
  { clave: 'derrotas', activo: false, desc: false },
  { clave: 'fatiga', activo: false, desc: false },
  { clave: 'dano', activo: false, desc: false },
  { clave: 'nacionalidad', activo: false, desc: false },
  { clave: 'potencial', activo: false, desc: true },
  { clave: 'ganancias', activo: false, desc: true },
];

export function valorOrden(p: Peleador, k: ClaveOrden, ranks: Map<number, FilaRank>): number | string {
  switch (k) {
    case 'ultimoCombate': return p.ultimoCombate ?? -1;
    case 'ranking': return ranks.get(p.id)?.rank ?? 99;
    case 'estilo': return ESTILOS[p.estilo].es;
    case 'edad': return p.edad;
    case 'peso': return p.pesoKg;
    case 'popularidad': return p.popularidad;
    case 'moral': return p.moral;
    case 'bolsa': return p.contrato?.bolsa ?? 0;
    case 'bonoVictoria': return p.contrato?.bonoVictoria ?? 0;
    case 'victorias': return p.rec.tot.v;
    case 'derrotas': return p.rec.tot.d;
    case 'fatiga': return p.fatiga;
    case 'dano': return p.dano;
    case 'nacionalidad': return nombrePais(p.pais);
    case 'calificacion': return scoreCalif(p);
    case 'potencial': return p.potencial;
    case 'ganancias': return p.ganancias;
  }
}

export function filtrar(lista: Peleador[], f: Filtros, miId: string): Peleador[] {
  const t = f.texto.trim().toLowerCase();
  return lista.filter(p => {
    if (t && !`${p.nombre} ${p.apellido} ${p.apodo}`.toLowerCase().includes(t)) return false;
    if (f.genero && p.genero !== f.genero) return false;
    if (f.clase && p.clase !== f.clase) return false;
    if (f.estilo && p.estilo !== f.estilo) return false;
    if (f.pais && p.pais !== f.pais) return false;
    if (f.estatus && estatus(p) !== f.estatus) return false;
    if (p.edad < f.edadMin || p.edad > f.edadMax) return false;
    if (f.compania === 'libres' && p.companiaId) return false;
    if (f.compania === 'mia' && p.companiaId !== miId) return false;
    if (f.compania && f.compania !== 'libres' && f.compania !== 'mia' && p.companiaId !== f.compania) return false;
    if (f.disponibles && !disponible(p)) return false;
    if (f.lesionados && !p.lesion) return false;
    if (f.porVencer && !porVencer(p)) return false;
    return true;
  });
}

export function ordenar(lista: Peleador[], orden: Orden[], ranks: Map<number, FilaRank>): Peleador[] {
  const activos = orden.filter(o => o.activo);
  if (!activos.length) return lista;
  const deco = lista.map(p => ({ p, v: activos.map(o => valorOrden(p, o.clave, ranks)) }));
  deco.sort((a, b) => {
    for (let i = 0; i < activos.length; i++) {
      const x = a.v[i];
      const y = b.v[i];
      if (x === y) continue;
      const c = typeof x === 'string' ? x.localeCompare(y as string, 'es') : (x as number) - (y as number);
      if (c !== 0) return activos[i].desc ? -c : c;
    }
    return a.p.id - b.p.id;
  });
  return deco.map(d => d.p);
}

export const experiencia = (p: Peleador) => totalPeleas(p.rec.tot);
