// Premios anuales: seguimiento de las mejores peleas del año (en todo el mundo) y entrega al terminar el año.
import { CATEGORIA_PREMIO, MUNDO } from '../config/mundo';
import { agregarNoticia } from './noticias';
import { nombreCompleto } from './peleador';
import { ptsDe } from './rankings';
import { clamp } from './rng';
import type { AnioStats, CandidatoPremio, Juego, Peleador, PremioAnio, ResultadoPelea } from './types';

const esFinal = (m: string) => m === 'KO' || m === 'TKO' || m === 'SUB';
const seg = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + (s || 0); };

export const anioVacio = (): AnioStats => ({ v: 0, d: 0, fin: 0, tit: 0, cal: 0 });

export function sumarAnio(s: AnioStats, gano: boolean, perdio: boolean, finalizo: boolean, titulo: boolean, rivalPts: number): AnioStats {
  return {
    v: s.v + (gano ? 1 : 0), d: s.d + (perdio ? 1 : 0), fin: s.fin + (finalizo ? 1 : 0), tit: s.tit + (gano && titulo ? 1 : 0),
    cal: s.cal + (gano ? clamp(rivalPts / 20, 0, 6) : 0),
  };
}

function guardar(lista: CandidatoPremio[], c: CandidatoPremio): void {
  lista.push(c);
  lista.sort((a, b) => b.score - a.score);
  if (lista.length > MUNDO.premios.candidatosPorCategoria) lista.length = MUNDO.premios.candidatosPorCategoria;
}

// Se llama por cada pelea (propia o de rivales) después de aplicar el resultado.
export function registrarPelea(
  j: Juego, a: Peleador, b: Peleador, res: ResultadoPelea, o: { titulo: boolean; semana: number; companiaId: string; prevA: number | null; prevB: number | null; ruido: number },
): void {
  const C = j.candidatosPremios;
  const gana = res.ganadorId === a.id ? a : res.ganadorId === b.id ? b : null;
  const pierde = gana ? (gana.id === a.id ? b : a) : null;
  const txtBase = gana && pierde ? `${nombreCompleto(gana)} vence a ${nombreCompleto(pierde)}` : `${a.apellido} vs ${b.apellido}`;
  const base = (score: number): CandidatoPremio => ({
    score, aId: a.id, bId: b.id, ganadorId: res.ganadorId, texto: `${txtBase} (${res.metodo} R${res.round} ${res.tiempo})`, semana: o.semana, companiaId: o.companiaId, metodo: res.metodo,
  });
  if (gana && pierde && esFinal(res.metodo)) {
    const rapido = 1 + (300 - Math.min(300, seg(res.tiempo))) / 300;
    const puntos = (res.round === 1 ? 3 : res.round === 2 ? 2 : 1) + rapido + ptsDe(pierde) / 60 + (o.titulo ? 2 : 0) + gana.popularidad / 100 + o.ruido;
    if (res.metodo === 'SUB') guardar(C.sub, base(puntos)); else guardar(C.ko, base(puntos));
  }
  if (res.metodo !== 'NC' && res.metodo !== 'DQ') {
    const sig = res.stats.a.golpesSig + res.stats.b.golpesSig;
    const kd = res.stats.a.caidas + res.stats.b.caidas;
    const cerrada = res.metodo === 'DD' || res.metodo === 'DM' ? 2 : 0;
    const dif = res.tarjetas.length ? Math.abs(res.tarjetas[0][0] - res.tarjetas[0][1]) : 3;
    const puntos = sig / 15 + kd * 1.2 + (esFinal(res.metodo) && res.round >= 2 ? 1.5 : 0) + cerrada + (dif <= 1 ? 1 : 0)
      + (o.titulo ? 2 : 0) + (a.popularidad + b.popularidad) / 100 + o.ruido;
    guardar(C.pelea, base(puntos));
  }
  // regreso: ganó después de mucho tiempo sin pelear
  if (gana && pierde) {
    const prev = gana.id === a.id ? o.prevA : o.prevB;
    if (prev != null && o.semana - prev >= MUNDO.premios.regresoMinSemanas) {
      const semanas = o.semana - prev;
      C.regreso.push({ score: semanas / 10 + ptsDe(pierde) / 40 + o.ruido, peleadorId: gana.id, semanas, texto: `${nombreCompleto(gana)} regresó tras ${semanas} semanas y venció a ${nombreCompleto(pierde)}` });
      C.regreso.sort((x, y) => y.score - x.score);
      if (C.regreso.length > MUNDO.premios.candidatosPorCategoria) C.regreso.length = MUNDO.premios.candidatosPorCategoria;
    }
  }
}

function puntajeAnual(p: Peleador): number {
  const s = p.anioStats;
  return s.v * 2 + s.fin + s.tit * 4 + s.cal * 0.6 - s.d * 1.5;
}

// Entrega los premios del año que termina y reinicia los contadores
export function entregarPremios(j: Juego, anio: number): void {
  const ganadores: PremioAnio[] = [];
  const activos = j.peleadores.filter(p => !p.retirado && p.anioStats && p.anioStats.v + p.anioStats.d >= MUNDO.premios.minPeleasAnio);
  const mejor = (lista: Peleador[]) => lista.slice().sort((a, b) => puntajeAnual(b) - puntajeAnual(a))[0];
  const pa = mejor(activos);
  if (pa) ganadores.push({ anio, categoria: 'peleador', peleadorId: pa.id, texto: `${pa.anioStats.v}-${pa.anioStats.d} en el año${pa.anioStats.tit ? `, ${pa.anioStats.tit} victoria(s) de campeonato` : ''}`, companiaId: pa.companiaId });
  const rev = mejor(activos.filter(p => p.edad <= 26 && p.rec.tot.v + p.rec.tot.d <= 14 && p.id !== pa?.id));
  if (rev) ganadores.push({ anio, categoria: 'revelacion', peleadorId: rev.id, texto: `${rev.edad} años, ${rev.anioStats.v}-${rev.anioStats.d} este año`, companiaId: rev.companiaId });
  const C = j.candidatosPremios;
  const cand = (cat: PremioAnio['categoria'], c?: CandidatoPremio) => {
    if (!c) return;
    ganadores.push({ anio, categoria: cat, peleadorId: c.ganadorId, rivalId: c.ganadorId === c.aId ? c.bId : c.aId, texto: c.texto, companiaId: c.companiaId });
  };
  cand('ko', C.ko[0]);
  cand('sumision', C.sub[0]);
  cand('pelea', C.pelea[0]);
  if (C.regreso[0]) ganadores.push({ anio, categoria: 'regreso', peleadorId: C.regreso[0].peleadorId, texto: C.regreso[0].texto, companiaId: j.peleadores.find(p => p.id === C.regreso[0].peleadorId)?.companiaId ?? null });

  for (const g of ganadores) {
    j.premios.push(g);
    const p = g.peleadorId != null ? j.peleadores.find(x => x.id === g.peleadorId) : undefined;
    const mio = g.companiaId === j.miId;
    if (p) {
      const i = j.peleadores.indexOf(p);
      j.peleadores[i] = { ...p, popularidad: clamp(p.popularidad + MUNDO.premios.popularidadGanador, 0, 100), moral: clamp(p.moral + 5, 0, 100) };
    }
    agregarNoticia(j, {
      categoria: mio ? 'importante' : 'mundo', peleadorId: g.peleadorId ?? undefined,
      titulo: `${CATEGORIA_PREMIO[g.categoria]} ${anio}: ${p ? nombreCompleto(p) : '—'}${mio ? ' (¡tuyo!)' : ''}`, cuerpo: g.texto,
    });
  }
  // reinicio
  for (let i = 0; i < j.peleadores.length; i++) {
    const p = j.peleadores[i];
    if (p.anioStats && (p.anioStats.v || p.anioStats.d)) j.peleadores[i] = { ...p, anioStats: anioVacio() };
  }
  j.candidatosPremios = { ko: [], sub: [], pelea: [], regreso: [] };
}

