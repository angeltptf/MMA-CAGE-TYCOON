// Campeonatos: reinados, defensas de título, títulos interinos y unificaciones.
import { nombreClase } from './format';
import { agregarNoticia } from './noticias';
import { nombreCompleto } from './peleador';
import type { Division, Evento, Juego, Peleador } from './types';

function reemplazar(j: Juego, id: number, f: (p: Peleador) => Peleador): Peleador | undefined {
  const i = j.peleadores.findIndex(p => p.id === id);
  if (i < 0) return undefined;
  j.peleadores[i] = f(j.peleadores[i]);
  return j.peleadores[i];
}

export const divisionMia = (j: Juego, genero: string, clase: string): Division | undefined =>
  j.divisiones.find(d => d.id === `${j.miId}:${genero}:${clase}`);

// El campeón defendió el título
export function registrarDefensa(j: Juego, campeonId: number): void {
  reemplazar(j, campeonId, p => {
    const defensasConsec = p.rcd.defensasConsec + 1;
    return { ...p, rcd: { ...p.rcd, defensas: p.rcd.defensas + 1, defensasConsec, mejorDefensasConsec: Math.max(p.rcd.mejorDefensasConsec, defensasConsec) } };
  });
}

// Alguien se queda con el título (nuevo reinado)
export function otorgarTitulo(j: Juego, div: Division, ganadorId: number, e: Evento, motivo: string): void {
  const anterior = div.campeonId;
  if (anterior != null && anterior !== ganadorId) {
    reemplazar(j, anterior, p => ({ ...p, rcd: { ...p.rcd, defensasConsec: 0, mejorReinoSemanas: Math.max(p.rcd.mejorReinoSemanas, p.rcd.reinoInicio != null ? j.semanaAbs - p.rcd.reinoInicio : 0), reinoInicio: null } }));
  }
  div.campeonId = ganadorId;
  if (div.interinoId === ganadorId) div.interinoId = null;
  const g = reemplazar(j, ganadorId, p => ({
    ...p, rcd: {
      ...p.rcd, reinados: p.rcd.reinados + 1, defensasConsec: 0, reinoInicio: j.semanaAbs,
      edadPrimerTitulo: p.rcd.edadPrimerTitulo ?? p.edad, edadUltimoTitulo: p.edad,
    },
  }));
  if (g) {
    agregarNoticia(j, {
      categoria: div.companiaId === j.miId ? 'importante' : 'mundo', peleadorId: g.id,
      titulo: `¡Nuevo campeón ${nombreClase(div.clase, j.ajustes.nombresDivision)}${div.genero === 'F' ? ' (femenil)' : ''}${div.companiaId === j.miId ? '' : ` de ${j.companias.find(c => c.id === div.companiaId)?.nombre ?? ''}`}: ${nombreCompleto(g)}!`,
      cuerpo: `${motivo} en ${e.nombre}.`,
    });
  }
}

// Aplica el resultado de una pelea por el campeonato
export function resolverTitulo(
  j: Juego, e: Evento, genero: string, clase: string, aId: number, bId: number, interino: boolean,
  ganadorId: number | null, metodo: string, round: number,
): void {
  const div = divisionMia(j, genero, clase);
  if (!div || ganadorId == null) return; // empate o sin resultado: nada cambia
  const detalle = `Ganó por ${metodo} en el round ${round}`;
  if (interino) {
    div.interinoId = ganadorId;
    const g = j.peleadores.find(p => p.id === ganadorId);
    if (g) agregarNoticia(j, { categoria: 'importante', peleadorId: g.id, titulo: `${nombreCompleto(g)} es el nuevo campeón interino`, cuerpo: `${detalle} en ${e.nombre}.` });
    return;
  }
  const participantes = [aId, bId];
  const campeonPelea = div.campeonId != null && participantes.includes(div.campeonId);
  const interinoPelea = div.interinoId != null && participantes.includes(div.interinoId);
  if (div.campeonId == null) { otorgarTitulo(j, div, ganadorId, e, `${detalle} (título vacante)`); return; }
  if (campeonPelea && interinoPelea) {
    // unificación: queda un solo campeón
    if (ganadorId === div.campeonId) registrarDefensa(j, ganadorId);
    else otorgarTitulo(j, div, ganadorId, e, `${detalle} (unificación)`);
    div.interinoId = null;
    return;
  }
  if (campeonPelea) {
    if (ganadorId === div.campeonId) registrarDefensa(j, ganadorId);
    else otorgarTitulo(j, div, ganadorId, e, detalle);
  }
}
