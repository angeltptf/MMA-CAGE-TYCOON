import { RANKING_TAM } from '../config/balance';
import { scoreCalif } from './peleador';
import type { ClaseId, Genero, Juego, Peleador } from './types';

// Puntaje de ranking. En la Fase 3 se reemplaza por una lógica basada en resultados
// (ganarle a un mejor rankeado sube mucho, inactividad baja, etc.).
export function puntajeRanking(p: Peleador): number {
  const peleas = p.rec.tot.v + p.rec.tot.d + p.rec.tot.e;
  const pctV = peleas ? p.rec.tot.v / peleas : 0.5;
  return scoreCalif(p) * 10 + p.popularidad * 0.15 + pctV * 10 + Math.min(p.rec.tot.v, 25) * 0.1;
}

const claveDiv = (c: string, g: Genero, clase: ClaseId) => `${c}:${g}:${clase}`;

// Recalcula campeones y rankings de las divisiones de las compañías indicadas
// (todas si no se pasa lista). Muta `j` (el llamador decide cuándo copiar).
export function recalcularRankings(j: Juego, companiaIds?: string[], inicial = false): void {
  const grupos = new Map<string, Peleador[]>();
  for (const p of j.peleadores) {
    if (p.retirado || !p.companiaId) continue;
    if (companiaIds && !companiaIds.includes(p.companiaId)) continue;
    const k = claveDiv(p.companiaId, p.genero, p.clase);
    const arr = grupos.get(k);
    if (arr) arr.push(p);
    else grupos.set(k, [p]);
  }
  const porId = new Map(j.peleadores.map(p => [p.id, p]));
  for (const d of j.divisiones) {
    if (companiaIds && !companiaIds.includes(d.companiaId)) continue;
    const lista = (grupos.get(d.id) ?? []).slice().sort((a, b) => puntajeRanking(b) - puntajeRanking(a));
    const esMia = d.companiaId === j.miId;
    const campActual = d.campeonId != null ? porId.get(d.campeonId) : undefined;
    const campValido = !!campActual && !campActual.retirado && campActual.companiaId === d.companiaId;
    if (!campValido) {
      // En mis divisiones el título queda vacante hasta una pelea por el campeonato (Fase 3)
      d.campeonId = !esMia && lista.length >= 3 ? lista[0].id : null;
    }
    if (d.interinoId != null) {
      const i = porId.get(d.interinoId);
      if (!i || i.retirado || i.companiaId !== d.companiaId) d.interinoId = null;
    }
    void inicial;
    d.ranking = lista.filter(p => p.id !== d.campeonId && p.id !== d.interinoId).slice(0, RANKING_TAM).map(p => p.id);
  }
}

export interface FilaRanking { peleador: Peleador; rank: number; campeon: boolean }

// Ranking dentro de una compañía (por división o libra por libra)
export function rankingCompania(
  j: Juego, companiaId: string, genero: Genero, clase: ClaseId | 'p4p',
): FilaRanking[] {
  if (clase === 'p4p') {
    const lista = j.peleadores
      .filter(p => !p.retirado && p.companiaId === companiaId && p.genero === genero)
      .sort((a, b) => puntajeRanking(b) - puntajeRanking(a))
      .slice(0, RANKING_TAM);
    const campeones = new Set(j.divisiones.filter(d => d.companiaId === companiaId).map(d => d.campeonId));
    return lista.map((p, i) => ({ peleador: p, rank: i + 1, campeon: campeones.has(p.id) }));
  }
  const d = j.divisiones.find(x => x.id === claveDiv(companiaId, genero, clase));
  if (!d) return [];
  const porId = new Map(j.peleadores.map(p => [p.id, p]));
  const filas: FilaRanking[] = [];
  if (d.campeonId != null && porId.has(d.campeonId)) filas.push({ peleador: porId.get(d.campeonId)!, rank: 0, campeon: true });
  d.ranking.forEach((id, i) => {
    const p = porId.get(id);
    if (p) filas.push({ peleador: p, rank: i + 1, campeon: false });
  });
  return filas;
}

// Ranking global: todos los peleadores activos del mundo, de cualquier compañía
export function rankingGlobal(j: Juego, genero: Genero, clase: ClaseId | 'p4p'): FilaRanking[] {
  const campeones = new Set(j.divisiones.map(d => d.campeonId).filter((x): x is number => x != null));
  return j.peleadores
    .filter(p => !p.retirado && p.genero === genero && (clase === 'p4p' || p.clase === clase))
    .sort((a, b) => puntajeRanking(b) - puntajeRanking(a))
    .slice(0, RANKING_TAM)
    .map((p, i) => ({ peleador: p, rank: i + 1, campeon: campeones.has(p.id) }));
}

export interface InfoRank { rank: number; campeon: boolean; dobleCampeon: boolean }

// Para cada peleador: su lugar en la división de su propia compañía (0 = campeón, 99 = sin ranking)
export function mapaRankings(j: Juego): Map<number, InfoRank> {
  const m = new Map<number, InfoRank>();
  for (const d of j.divisiones) {
    d.ranking.forEach((id, i) => {
      if (!m.has(id)) m.set(id, { rank: i + 1, campeon: false, dobleCampeon: false });
    });
  }
  for (const d of j.divisiones) {
    for (const id of [d.campeonId]) {
      if (id == null) continue;
      const prev = m.get(id);
      m.set(id, { rank: 0, campeon: true, dobleCampeon: !!prev?.campeon });
    }
  }
  return m;
}
