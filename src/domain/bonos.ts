// Bonos de la noche: Peleador de la Noche, Pelea de la Noche y Actuación de la Noche.
import { ECONOMIA } from '../config/economia';
import { dinero } from './format';
import { mover } from './finanzas';
import { agregarNoticia } from './noticias';
import { nombreCompleto } from './peleador';
import type { BonosNoche, Evento, Juego, Pelea, Peleador } from './types';

const esFinal = (m: string) => m === 'KO' || m === 'TKO' || m === 'SUB';

function puntajeGanador(b: Pelea, ganador: Peleador): number {
  const r = b.resultado!;
  const esA = r.ganadorId === b.aId;
  const mio = esA ? r.stats.a : r.stats.b;
  const otro = esA ? r.stats.b : r.stats.a;
  const underdog = b.snap ? Math.max(0, (esA ? b.snap.a.momio : b.snap.b.momio)) / 150 : 0;
  return (esFinal(r.metodo) ? 4 : 1) + (6 - r.round) * 0.5 + (mio.golpesSig - otro.golpesSig) / 20
    + underdog + (r.metodo === 'KO' ? 1 : 0) + ganador.popularidad / 100;
}

function puntajePelea(b: Pelea): number {
  const r = b.resultado!;
  const sig = r.stats.a.golpesSig + r.stats.b.golpesSig;
  const kd = r.stats.a.caidas + r.stats.b.caidas;
  const cerrada = r.metodo === 'DD' || r.metodo === 'DM' ? 2 : 0;
  const dif = r.tarjetas.length ? Math.abs(r.tarjetas[0][0] - r.tarjetas[0][1]) : 3;
  return sig / 12 + kd * 1.2 + (esFinal(r.metodo) && r.round >= 2 ? 1.5 : 0) + cerrada + (dif <= 1 ? 1 : 0) + b.hype / 40
    + (r.stats.a.subIntentos + r.stats.b.subIntentos) * 0.4;
}

// Sugerencia automática (el jugador puede cambiarla)
export function sugerirBonos(j: Juego, e: Evento): BonosNoche {
  const jugadas = e.cartelera.filter(b => b.resultado && b.resultado.ganadorId != null && b.resultado.metodo !== 'DQ');
  let mejor: { id: number; pts: number } | null = null;
  const ganadores: { id: number; pts: number; final: boolean }[] = [];
  for (const b of jugadas) {
    const g = j.peleadores.find(p => p.id === b.resultado!.ganadorId);
    if (!g) continue;
    const pts = puntajeGanador(b, g);
    ganadores.push({ id: g.id, pts, final: esFinal(b.resultado!.metodo) });
    if (!mejor || pts > mejor.pts) mejor = { id: g.id, pts };
  }
  const pelea = jugadas.slice().sort((a, c) => puntajePelea(c) - puntajePelea(a))[0];
  const actuaciones = ganadores
    .filter(g => g.final && g.id !== mejor?.id)
    .sort((a, c) => c.pts - a.pts).slice(0, 2).map(g => g.id);
  const sel: BonosNoche = { peleadorNoche: mejor?.id ?? null, peleaNoche: pelea?.id ?? null, actuaciones, pagado: false, total: 0 };
  sel.total = montosBonos(j, e, sel).reduce((a, x) => a + x.monto, 0);
  return sel;
}

export interface MontoBono { peleadorId: number; tipo: 'peleador' | 'pelea' | 'actuacion'; monto: number }

export function montosBonos(j: Juego, e: Evento, sel: Pick<BonosNoche, 'peleadorNoche' | 'peleaNoche' | 'actuaciones'>): MontoBono[] {
  const cfg = ECONOMIA.bonos;
  const res: MontoBono[] = [];
  const monto = (id: number, pct: number) => {
    const p = j.peleadores.find(x => x.id === id);
    const base = Math.max(cfg.min, p?.contrato?.bolsa ?? cfg.min);
    return Math.round(base * pct) + (p?.contrato?.bonoNoche ?? 0);
  };
  if (sel.peleadorNoche != null) res.push({ peleadorId: sel.peleadorNoche, tipo: 'peleador', monto: monto(sel.peleadorNoche, cfg.peleador) });
  const b = e.cartelera.find(x => x.id === sel.peleaNoche);
  if (b) for (const id of [b.aId, b.bId]) if (id != null) res.push({ peleadorId: id, tipo: 'pelea', monto: monto(id, cfg.pelea) });
  for (const id of sel.actuaciones) res.push({ peleadorId: id, tipo: 'actuacion', monto: monto(id, cfg.actuacion) });
  return res;
}

export function pagarBonos(j: Juego, eventoId: number, sel: Pick<BonosNoche, 'peleadorNoche' | 'peleaNoche' | 'actuaciones'>): string | null {
  const e = j.eventos.find(x => x.id === eventoId);
  if (!e || e.estado !== 'realizado' || !e.finanzas) return 'Evento no encontrado.';
  if (e.bonos?.pagado) return 'Los bonos de este evento ya se pagaron.';
  if (sel.actuaciones.length > 2) return 'Máximo 2 actuaciones de la noche.';
  const montos = montosBonos(j, e, sel);
  const total = montos.reduce((a, x) => a + x.monto, 0);
  for (const m of montos) {
    const i = j.peleadores.findIndex(p => p.id === m.peleadorId);
    if (i < 0) continue;
    const p = j.peleadores[i];
    const rcd = { ...p.rcd, bonosDinero: p.rcd.bonosDinero + m.monto };
    if (m.tipo === 'peleador') rcd.peleadorNoche++;
    if (m.tipo === 'pelea') rcd.peleaNoche++;
    if (m.tipo === 'actuacion') rcd.actuaciones++;
    const peleas = p.peleas.map(h => (h.eventoId === e.id
      ? { ...h, ganancia: { ...(h.ganancia ?? { bolsa: 0, victoria: 0, campeonato: 0, finalizacion: 0, noche: 0 }), noche: (h.ganancia?.noche ?? 0) + m.monto } }
      : h));
    j.peleadores[i] = { ...p, rcd, peleas, ganancias: p.ganancias + m.monto, moral: Math.min(100, p.moral + 3), popularidad: Math.min(100, p.popularidad + (m.tipo === 'peleador' ? 1 : 0.5)) };
  }
  mover(j, 'bonos', -total);
  e.finanzas = { ...e.finanzas, bonosNoche: total, neto: e.finanzas.neto - total };
  e.bonos = { peleadorNoche: sel.peleadorNoche, peleaNoche: sel.peleaNoche, actuaciones: sel.actuaciones, pagado: true, total };
  const p1 = sel.peleadorNoche != null ? j.peleadores.find(p => p.id === sel.peleadorNoche) : undefined;
  if (total > 0) {
    agregarNoticia(j, {
      categoria: 'eventos', titulo: `Bonos de ${e.nombre}: ${dinero(total)}`,
      cuerpo: p1 ? `Peleador de la Noche: ${nombreCompleto(p1)}.` : undefined, peleadorId: p1?.id,
    });
  }
  return null;
}

// Si el jugador no los elige, se pagan los sugeridos al avanzar la semana
export function pagarBonosPendientes(j: Juego): void {
  for (const e of j.eventos) {
    if (e.estado === 'realizado' && e.bonos && !e.bonos.pagado) pagarBonos(j, e.id, e.bonos);
  }
}
