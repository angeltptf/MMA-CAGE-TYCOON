// Acciones del jugador sobre la partida. Todas operan sobre un juego ya clonado
// (ver clonarJuego) y devuelven un mensaje de error, o null si salió bien.
import { dinero } from './format';
import {
  bonoFirma, clausulaDe, contratoSugerido, costoRescision, nombreCompleto,
} from './peleador';
import { recalcularRankings } from './rankings';
import { agregarNoticia } from './semana';
import type { ClaseId, Genero, Juego, Peleador } from './types';

const miCompania = (j: Juego) => j.companias.find(c => c.esMia)!;

function indice(j: Juego, id: number): number {
  return j.peleadores.findIndex(p => p.id === id);
}

export function ficharLibre(j: Juego, id: number, peleas?: number): string | null {
  const i = indice(j, id);
  if (i < 0) return 'Peleador no encontrado.';
  const p = j.peleadores[i];
  if (p.retirado || p.companiaId) return 'Este peleador no es agente libre.';
  const contrato = contratoSugerido(p, peleas);
  const costo = bonoFirma(contrato);
  const mia = miCompania(j);
  if (mia.dinero < costo) return `No te alcanza: el bono de firma es ${dinero(costo)}.`;
  mia.dinero -= costo;
  j.peleadores[i] = { ...p, companiaId: j.miId, contrato, moral: Math.min(100, p.moral + 5) };
  agregarNoticia(j, {
    categoria: 'peleadores', peleadorId: id,
    titulo: `Fichaste a ${nombreCompleto(p)}`,
    cuerpo: `${contrato.peleasRestantes} peleas, bolsa ${dinero(contrato.bolsa)}. Bono de firma: ${dinero(costo)}.`,
  });
  recalcularRankings(j, [j.miId]);
  return null;
}

// "Robar" a un peleador de otra compañía pagando su cláusula de rescisión
export function robarPeleador(j: Juego, id: number): string | null {
  const i = indice(j, id);
  if (i < 0) return 'Peleador no encontrado.';
  const p = j.peleadores[i];
  if (p.retirado || !p.companiaId || p.companiaId === j.miId || !p.contrato) {
    return 'Este peleador no tiene contrato con otra compañía.';
  }
  const rival = j.companias.find(c => c.id === p.companiaId)!;
  const nuevo = contratoSugerido(p);
  const total = p.contrato.clausula + bonoFirma(nuevo);
  const mia = miCompania(j);
  if (mia.dinero < total) return `No te alcanza: cláusula ${dinero(p.contrato.clausula)} + firma ${dinero(bonoFirma(nuevo))}.`;
  mia.dinero -= total;
  rival.dinero += p.contrato.clausula;
  j.peleadores[i] = { ...p, companiaId: j.miId, contrato: nuevo, moral: Math.min(100, p.moral + 8) };
  agregarNoticia(j, {
    categoria: 'importante', peleadorId: id,
    titulo: `¡Fichaje bomba! ${nombreCompleto(p)} llega desde ${rival.nombre}`,
    cuerpo: `Pagaste ${dinero(p.contrato.clausula)} de cláusula de rescisión.`,
  });
  agregarNoticia(j, {
    categoria: 'mundo', titulo: `${rival.nombre} pierde a ${nombreCompleto(p)}`,
    cuerpo: `${j.nombre} pagó su cláusula de rescisión.`, peleadorId: id,
  });
  recalcularRankings(j, [j.miId, rival.id]);
  return null;
}

export function rescindirContrato(j: Juego, id: number): string | null {
  const i = indice(j, id);
  const p = j.peleadores[i];
  if (!p || p.companiaId !== j.miId || !p.contrato) return 'Ese peleador no es tuyo.';
  const costo = costoRescision(p.contrato);
  const mia = miCompania(j);
  if (mia.dinero < costo) return `No te alcanza para la indemnización (${dinero(costo)}).`;
  mia.dinero -= costo;
  j.peleadores[i] = { ...p, companiaId: null, contrato: null, moral: Math.max(0, p.moral - 10) };
  agregarNoticia(j, {
    categoria: 'peleadores', peleadorId: id,
    titulo: `Rescindiste el contrato de ${nombreCompleto(p)}`,
    cuerpo: `Indemnización pagada: ${dinero(costo)}. Ahora es agente libre.`,
  });
  recalcularRankings(j, [j.miId]);
  return null;
}

export function retirarPeleador(j: Juego, id: number): string | null {
  const i = indice(j, id);
  const p = j.peleadores[i];
  if (!p) return 'Peleador no encontrado.';
  const cid = p.companiaId;
  j.peleadores[i] = { ...p, retirado: true, companiaId: null, contrato: null };
  agregarNoticia(j, {
    categoria: cid === j.miId ? 'importante' : 'mundo', peleadorId: id,
    titulo: `${nombreCompleto(p)} se retira`,
    cuerpo: `Récord final ${p.rec.tot.v}-${p.rec.tot.d}-${p.rec.tot.e}.`,
  });
  if (cid) recalcularRankings(j, [cid]);
  return null;
}

export function alternarFavorito(j: Juego, id: number): void {
  const i = indice(j, id);
  if (i >= 0) j.peleadores[i] = { ...j.peleadores[i], favorito: !j.peleadores[i].favorito };
}

// Guarda cambios del editor
export function guardarPeleador(j: Juego, nuevo: Peleador): void {
  const i = indice(j, nuevo.id);
  if (i < 0) return;
  const viejo = j.peleadores[i];
  if (nuevo.contrato) nuevo = { ...nuevo, contrato: { ...nuevo.contrato, clausula: clausulaDe(nuevo.contrato, nuevo.edad) } };
  j.peleadores[i] = nuevo;
  if (viejo.companiaId && (viejo.clase !== nuevo.clase || viejo.genero !== nuevo.genero)) {
    recalcularRankings(j, [viejo.companiaId]);
  }
}

export function agregarPeleador(j: Juego, p: Peleador, aMiRoster: boolean): number {
  const id = j.sigId++;
  const nuevo: Peleador = { ...p, id, companiaId: aMiRoster ? j.miId : null, contrato: null };
  if (aMiRoster) nuevo.contrato = contratoSugerido(nuevo);
  j.peleadores.push(nuevo);
  if (aMiRoster) recalcularRankings(j, [j.miId]);
  return id;
}

export function crearDivision(j: Juego, genero: Genero, clase: ClaseId): string | null {
  const id = `${j.miId}:${genero}:${clase}`;
  if (j.divisiones.some(d => d.id === id)) return 'Esa división ya existe.';
  j.divisiones.push({ id, companiaId: j.miId, genero, clase, campeonId: null, interinoId: null, ranking: [] });
  recalcularRankings(j, [j.miId]);
  return null;
}

export function eliminarDivision(j: Juego, id: string): void {
  j.divisiones = j.divisiones.filter(d => d.id !== id);
}

export function marcarNoticia(j: Juego, id: number, leida: boolean): void {
  const i = j.noticias.findIndex(n => n.id === id);
  if (i >= 0) j.noticias[i] = { ...j.noticias[i], leida };
}
export function borrarNoticias(j: Juego, ids: number[]): void {
  const s = new Set(ids);
  j.noticias = j.noticias.filter(n => !s.has(n.id));
}
