// Registros históricos de mi empresa.
import { fechaCorta } from './format';
import { nombreCompleto } from './peleador';
import type { Juego } from './types';

export interface Registro { titulo: string; valor: string; detalle?: string; peleadorId?: number; eventoId?: number }

const seg = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + (s || 0); };

export function calcularRegistros(j: Juego): Registro[] {
  const res: Registro[] = [];
  const mios = j.peleadores.filter(p => p.rec.mio.v + p.rec.mio.d + p.rec.mio.e > 0);
  const top = <T,>(lista: T[], f: (x: T) => number): T | undefined => lista.slice().sort((a, b) => f(b) - f(a))[0];

  const v = top(mios, p => p.rec.mio.v);
  if (v && v.rec.mio.v > 0) res.push({ titulo: 'Más victorias en tu empresa', valor: `${v.rec.mio.v}`, detalle: nombreCompleto(v), peleadorId: v.id });
  const fin = top(mios, p => p.peleas.filter(h => h.resultado === 'V' && ['KO', 'TKO', 'SUB'].includes(h.metodo)).length);
  const nf = fin ? fin.peleas.filter(h => h.resultado === 'V' && ['KO', 'TKO', 'SUB'].includes(h.metodo)).length : 0;
  if (fin && nf > 0) res.push({ titulo: 'Más finalizaciones', valor: `${nf}`, detalle: nombreCompleto(fin), peleadorId: fin.id });

  // KO más rápido
  let rapido: { s: number; texto: string; pid: number; eid: number } | undefined;
  for (const e of j.eventos) {
    if (e.estado !== 'realizado') continue;
    for (const b of e.cartelera) {
      const r = b.resultado;
      if (!r || !['KO', 'TKO'].includes(r.metodo) || r.ganadorId == null) continue;
      const t = (r.round - 1) * 300 + seg(r.tiempo);
      if (!rapido || t < rapido.s) {
        const g = j.peleadores.find(p => p.id === r.ganadorId);
        rapido = { s: t, texto: `${g ? nombreCompleto(g) : '—'} · ${e.nombre}`, pid: r.ganadorId, eid: e.id };
      }
    }
  }
  if (rapido) res.push({ titulo: 'KO más rápido', valor: `${Math.floor(rapido.s / 60)}:${String(rapido.s % 60).padStart(2, '0')}`, detalle: rapido.texto, peleadorId: rapido.pid, eventoId: rapido.eid });

  const def = top(mios, p => p.rcd.defensas);
  if (def && def.rcd.defensas > 0) res.push({ titulo: 'Más defensas de título', valor: `${def.rcd.defensas}`, detalle: nombreCompleto(def), peleadorId: def.id });
  const consec = top(mios, p => p.rcd.mejorDefensasConsec);
  if (consec && consec.rcd.mejorDefensasConsec > 0) res.push({ titulo: 'Más defensas consecutivas', valor: `${consec.rcd.mejorDefensasConsec}`, detalle: nombreCompleto(consec), peleadorId: consec.id });
  const reinoDe = (p: (typeof mios)[number]) => Math.max(p.rcd.mejorReinoSemanas, p.rcd.reinoInicio != null ? j.semanaAbs - p.rcd.reinoInicio : 0);
  const rei = top(mios, reinoDe);
  if (rei && reinoDe(rei) > 0) res.push({ titulo: 'Reinado más largo', valor: `${reinoDe(rei)} semanas`, detalle: nombreCompleto(rei), peleadorId: rei.id });
  const racha = top(mios, p => p.mejorRachaV);
  if (racha && racha.mejorRachaV > 1) res.push({ titulo: 'Racha ganadora más larga', valor: `${racha.mejorRachaV}`, detalle: nombreCompleto(racha), peleadorId: racha.id });
  const ganancias = top(mios, p => p.ganancias);
  if (ganancias && ganancias.ganancias > 0) res.push({ titulo: 'Quien más ha ganado', valor: `$${Math.round(ganancias.ganancias).toLocaleString('en-US')}`, detalle: nombreCompleto(ganancias), peleadorId: ganancias.id });
  const noche = top(mios, p => p.rcd.peleadorNoche);
  if (noche && noche.rcd.peleadorNoche > 0) res.push({ titulo: 'Más veces Peleador de la Noche', valor: `${noche.rcd.peleadorNoche}`, detalle: nombreCompleto(noche), peleadorId: noche.id });
  const pn = top(mios, p => p.rcd.peleaNoche);
  if (pn && pn.rcd.peleaNoche > 0) res.push({ titulo: 'Más Peleas de la Noche', valor: `${pn.rcd.peleaNoche}`, detalle: nombreCompleto(pn), peleadorId: pn.id });

  const reales = j.eventos.filter(e => e.estado === 'realizado' && e.finanzas);
  const evMax = (f: (e: (typeof reales)[number]) => number) => top(reales, f);
  const taq = evMax(e => e.finanzas!.taquilla);
  if (taq) res.push({ titulo: 'Evento con más taquilla', valor: `$${Math.round(taq.finanzas!.taquilla).toLocaleString('en-US')}`, detalle: `${taq.nombre} · ${fechaCorta(taq.semana)}`, eventoId: taq.id });
  const asist = evMax(e => e.finanzas!.boletosVendidos);
  if (asist) res.push({ titulo: 'Mayor asistencia', valor: asist.finanzas!.boletosVendidos.toLocaleString('en-US'), detalle: asist.nombre, eventoId: asist.id });
  const ppv = evMax(e => e.finanzas!.ppv ?? 0);
  if (ppv && (ppv.finanzas!.ppv ?? 0) > 0) res.push({ titulo: 'Evento con más PPV', valor: `$${Math.round(ppv.finanzas!.ppv!).toLocaleString('en-US')}`, detalle: `${ppv.nombre} · ${(ppv.finanzas!.compradoresPPV ?? 0).toLocaleString('en-US')} compras`, eventoId: ppv.id });
  const yt = evMax(e => e.finanzas!.vistasYoutube ?? 0);
  if (yt && (yt.finanzas!.vistasYoutube ?? 0) > 0) res.push({ titulo: 'Evento más visto en YouTube', valor: `${yt.finanzas!.vistasYoutube!.toLocaleString('en-US')} vistas`, detalle: yt.nombre, eventoId: yt.id });
  const neto = evMax(e => e.finanzas!.neto);
  if (neto) res.push({ titulo: 'Mayor ganancia en un evento', valor: `$${Math.round(neto.finanzas!.neto).toLocaleString('en-US')}`, detalle: neto.nombre, eventoId: neto.id });
  res.push({ titulo: 'Eventos realizados', valor: `${reales.length}` });
  res.push({ titulo: 'Peleas disputadas', valor: `${reales.reduce((n, e) => n + e.cartelera.filter(b => b.resultado).length, 0)}` });
  return res;
}
