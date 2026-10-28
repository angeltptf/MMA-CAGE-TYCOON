import type { Juego } from './types';

// Completa campos nuevos en partidas guardadas con versiones anteriores del juego.
export function normalizarJuego(j: Juego): Juego {
  const x = j as Juego & Record<string, unknown>;
  x.eventos ??= [];
  x.ofertas ??= [];
  x.torneos ??= [];
  x.finanzas ??= [];
  x.negocios ??= [];
  x.eventosRivales ??= [];
  x.rankCompPrev ??= {};
  x.premios ??= [];
  x.candidatosPremios ??= { ko: [], sub: [], pelea: [], regreso: [] };
  x.sigNegocio ??= 1;
  x.youtube ??= { subs: 600 + Math.round(((j.companias.find(c => c.esMia)?.fans) ?? 3000) / 5), vistas: 0, ingresos: 0, virales: 0 };
  x.cooldownPropuestas ??= 0;
  x.cajaHist ??= [];
  x.sigTorneo ??= 1;
  x.sigEvento ??= 1;
  x.sigPelea ??= 1;
  x.sigOferta ??= 1;
  x.contadores ??= { ppv: 0, noche: 0 };
  x.poblacionObjetivo ??= j.peleadores.filter(p => !p.retirado).length;
  for (const p of j.peleadores) {
    p.enVenta ??= false;
    p.sinNegociarHasta ??= 0;
    p.descansoHasta ??= 0;
    p.peleas ??= [];
    p.rankPts ??= 0;
    p.patrocinios ??= [];
    p.popMax ??= p.popularidad;
    p.anioStats ??= { v: 0, d: 0, fin: 0, tit: 0, cal: 0 };
    p.rcd.mejorReinoSemanas ??= 0;
    p.rcd.reinoInicio ??= null;
    p.rcd ??= rcdVacio();
  }
  for (const c of j.companias) {
    c.nEventos ??= 0;
    c.hist ??= [];
    c.proxEvento ??= c.esMia ? 0 : j.semanaAbs + 1 + Math.floor(Math.random() * 4);
  }
  for (const e of j.eventos) {
    if (e.estado === 'realizado' && !e.bonos) e.bonos = { peleadorNoche: null, peleaNoche: null, actuaciones: [], pagado: true, total: 0 };
    if (e.finanzas) e.finanzas.premios ??= 0;
  }
  return j;
}

export const rcdVacio = () => ({
  defensas: 0, defensasConsec: 0, mejorDefensasConsec: 0, reinados: 0, edadPrimerTitulo: null as number | null,
  edadUltimoTitulo: null as number | null, peleadorNoche: 0, peleaNoche: 0, actuaciones: 0, bonosDinero: 0,
  mejorReinoSemanas: 0, reinoInicio: null as number | null,
});
