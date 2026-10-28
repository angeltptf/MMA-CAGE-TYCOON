// Noche de pelea: simula todo el evento, aplica los resultados a los peleadores
// (récords, ranking, físico, dinero, títulos, torneos) y calcula las finanzas.
import { ECONOMIA, MATCHMAKING } from '../config/economia';
import { PROGRESION } from '../config/balance';
import { sugerirBonos } from './bonos';
import { resolverTitulo } from './campeonatos';
import { dinero } from './format';
import { mover } from './finanzas';
import {
  costosEvento, estaCompleto, estimarBoletos, hypeBout, hypeEvento, momiosDe, popRegionDe, rankPos, sedeDe,
} from './eventos';
import { simularPelea } from './motor';
import { agregarNoticia } from './noticias';
import { nombreCompleto, recordTxt } from './peleador';
import { pagoPorPelea } from './patrociniosPersonales';
import { ptsDe, recalcularRankings } from './rankings';
import { Rng, clamp } from './rng';
import { avanzarGanador, etiquetaPartido, torneoDe } from './torneos';
import type {
  Evento, Instantanea, Juego, Pelea, Peleador, ResultadoPelea, Resultado, StatsPelea,
} from './types';

const esFinal = (m: string) => m === 'KO' || m === 'TKO' || m === 'SUB';

function instantanea(j: Juego, p: Peleador, momioP: number): Instantanea {
  const r = rankPos(j, p);
  return {
    record: recordTxt(p.rec.tot), rank: r, campeon: r === 0,
    momio: momioP, racha: p.racha.n ? `${p.racha.n}${p.racha.tipo === 'V' ? 'V' : p.racha.tipo === 'D' ? 'D' : 'E'}` : '—',
    forma: p.forma.slice(), pesoKg: p.pesoKg,
  };
}

interface Pago { bolsa: number; bonos: number }

function aplicar(
  e: Evento, b: Pelea, p: Peleador, rival: Peleador, res: ResultadoPelea, esA: boolean, rng: Rng,
  snapMio: Instantanea, snapRival: Instantanea, etiquetaTorneo?: string,
): { nuevo: Peleador; pago: Pago } {
  const gano = res.ganadorId === p.id;
  const nc = res.metodo === 'NC';
  const empate = res.metodo === 'E';
  const R: Resultado | null = nc ? null : gano ? 'V' : empate ? 'E' : 'D';
  const recibidos: StatsPelea = esA ? res.stats.b : res.stats.a;
  const finalizo = gano && esFinal(res.metodo);
  const perdioFinal = !gano && !empate && !nc && (res.metodo === 'KO' || res.metodo === 'TKO');

  const tot = { ...p.rec.tot };
  const mio = { ...p.rec.mio };
  const finales = { ...p.finales };
  if (R === 'V') { tot.v++; mio.v++; }
  else if (R === 'D') { tot.d++; mio.d++; }
  else if (R === 'E') { tot.e++; mio.e++; }
  else { tot.nc++; mio.nc++; }
  if (gano) {
    if (res.metodo === 'KO') finales.ko++;
    else if (res.metodo === 'TKO') finales.tko++;
    else if (res.metodo === 'SUB') finales.sub++;
    else finales.dec++;
  }

  let racha = p.racha;
  let mejorRachaV = p.mejorRachaV;
  let peorRachaD = p.peorRachaD;
  const forma = p.forma.slice();
  if (R) {
    forma.push(R);
    if (forma.length > 5) forma.shift();
    racha = p.racha.tipo === R && p.racha.n > 0 ? { tipo: R, n: p.racha.n + 1 } : { tipo: R, n: 1 };
    if (R === 'V') mejorRachaV = Math.max(mejorRachaV, racha.n);
    if (R === 'D') peorRachaD = Math.max(peorRachaD, racha.n);
  }

  // ranking por resultados: ganarle a alguien mejor rankeado sube mucho; perder contra uno peor, baja mucho
  const mias = ptsDe(p);
  const suyas = ptsDe(rival);
  let rankPts = mias;
  if (R === 'V') rankPts += clamp(6 + 0.12 * (suyas - mias), 2, 22) + (b.titulo ? 5 : 0) + (finalizo ? 2 : 0);
  else if (R === 'D') rankPts -= clamp(6 + 0.12 * (mias - suyas), 1.5, 20);
  else if (R === 'E') rankPts += clamp(0.12 * (suyas - mias), -3, 3);

  // físico
  const fatiga = clamp(40 + res.round * 6 + (esFinal(res.metodo) ? 0 : 10), 30, 90);
  const dano = clamp(p.dano + recibidos.golpesSig * MATCHMAKING.danoPorGolpeSig + recibidos.caidas * 1.5 + (perdioFinal ? 6 : 0), 0, 100);
  const fis = perdioFinal ? { ...p.fis, menton: Math.max(0.5, p.fis.menton - 0.15) } : p.fis;
  const descansoHasta = e.semana + (perdioFinal ? MATCHMAKING.descansoSemanas.ko : MATCHMAKING.descansoSemanas.normal);
  let lesion = p.lesion;
  const pLes = 0.05 + (perdioFinal ? 0.12 : 0) + p.fis.lesiones / 100 + (esFinal(res.metodo) ? 0.02 : 0);
  if (!nc && rng.chance(pLes)) {
    const [a, c] = PROGRESION.lesionDuracion;
    lesion = { tipo: rng.pick(PROGRESION.tiposLesion), semanas: rng.int(a, c) };
  }

  // popularidad y moral
  let pop = p.popularidad;
  if (R === 'V') pop += 1.5 + (finalizo ? 1.5 : 0) + clamp((rival.popularidad - p.popularidad) / 20, -1, 3) + (b.titulo ? 2 : 0);
  else if (R === 'D') pop -= 0.8 + Math.max(0, p.popularidad - rival.popularidad) / 25;
  const moral = clamp(p.moral + (R === 'V' ? 4 : R === 'D' ? -5 : 0), 0, 100);

  // dinero
  const c = p.contrato;
  const g = { bolsa: 0, victoria: 0, campeonato: 0, finalizacion: 0, noche: 0, patrocinio: pagoPorPelea(p) };
  if (c) {
    g.bolsa = c.bolsa;
    if (gano) {
      g.victoria = c.bonoVictoria;
      if (b.titulo) g.campeonato = c.bonoCampeonato;
      if (finalizo) g.finalizacion = c.bonoFinalizacion;
    }
  }
  const bonos = g.victoria + g.campeonato + g.finalizacion;
  const patroc = g.patrocinio;

  const hist = {
    eventoId: e.id, eventoNombre: e.nombre, semana: e.semana, peleaId: b.id, clase: b.clase, genero: b.genero,
    titulo: b.titulo, rivalId: rival.id, rivalNombre: nombreCompleto(rival), resultado: (R ?? 'E') as Resultado,
    metodo: res.metodo, round: res.round, tiempo: res.tiempo,
    miRecord: snapMio.record, rivalRecord: snapRival.record, miRank: snapMio.rank, rivalRank: snapRival.rank,
    ganancia: g, etiquetaTorneo,
  };
  const contrato = c ? { ...c, peleasRestantes: Math.max(0, c.peleasRestantes - 1) } : c;

  return {
    pago: { bolsa: g.bolsa, bonos },
    nuevo: {
      ...p, rec: { tot, mio }, finales, forma, racha, mejorRachaV, peorRachaD, fatiga, dano, fis, descansoHasta, lesion,
      popularidad: clamp(pop, 0, 100), moral, ganancias: p.ganancias + g.bolsa + bonos + patroc, ultimoCombate: e.semana,
      rankPts, peleas: [hist, ...p.peleas].slice(0, 40), contrato,
    },
  };
}

const sinStats = (): StatsPelea => ({ golpes: 0, golpesSig: 0, derribos: 0, intentosDerribo: 0, subIntentos: 0, controlSeg: 0, caidas: 0 });

export function realizarEvento(j: Juego, id: number): string | null {
  const e = j.eventos.find(x => x.id === id);
  if (!e) return 'Evento no encontrado.';
  if (e.estado !== 'borrador') return 'Este evento ya se realizó o se canceló.';
  if (e.semana !== j.semanaAbs) return 'Todavía no es la semana de este evento.';
  if (!estaCompleto(e)) return 'La cartelera está incompleta: llena todos los combates o reduce su número.';
  const mia = j.companias.find(c => c.esMia)!;
  const rng = new Rng(j.rngState);
  const sede = sedeDe(e);
  const hype = hypeEvento(j, e);
  let bolsas = 0;
  let bonosV = 0;
  let premios = 0;

  // lugar de cada peleador antes del evento (para las flechas de ranking)
  for (const d of j.divisiones) {
    if (d.companiaId !== j.miId) continue;
    const previo: Record<number, number> = {};
    if (d.campeonId != null) previo[d.campeonId] = 0;
    d.ranking.forEach((pid, i) => { previo[pid] = i + 1; });
    d.previo = previo;
  }

  for (const b of e.cartelera) {
    const par = b.torneoId != null ? torneoDe(j, b.torneoId)?.rondas[b.ronda!]?.[b.slot!] : undefined;
    if (par) { b.aId = par.aId; b.bId = par.bId; }
    if (b.aId == null || b.bId == null) continue;
    const t = torneoDe(j, b.torneoId);
    const etiqueta = t && b.ronda != null && b.slot != null ? etiquetaPartido(t.tam, b.ronda, b.slot) : undefined;
    const ia = j.peleadores.findIndex(p => p.id === b.aId);
    const ib = j.peleadores.findIndex(p => p.id === b.bId);
    const a = j.peleadores[ia];
    const c = j.peleadores[ib];

    // en torneos de una noche, alguien lesionado en una ronda anterior no puede continuar
    const sale = (p: Peleador) => !!t && (p.retirado || p.companiaId !== j.miId || (!!p.lesion && p.ultimoCombate === e.semana));
    if (t && (sale(a) || sale(c))) {
      const ganador = sale(a) && sale(c) ? (rng.chance(0.5) ? a : c) : sale(a) ? c : a;
      const baja = ganador === a ? c : a;
      b.hype = hypeBout(j, b);
      b.resultado = {
        ganadorId: ganador.id, metodo: 'DQ', round: 0, tiempo: '0:00', tarjetas: [], stats: { a: sinStats(), b: sinStats() },
        narracion: [`${baja.apellido} no puede continuar en el torneo; ${ganador.apellido} avanza sin pelear.`],
      };
      const [ma, mb] = momiosDe(a, c);
      b.snap = { a: instantanea(j, a, ma), b: instantanea(j, c, mb) };
      premios += avanzarGanador(j, e, b, ganador.id);
      continue;
    }

    const [ma, mb] = momiosDe(a, c);
    const snapA = instantanea(j, a, ma);
    const snapB = instantanea(j, c, mb);
    b.hype = hypeBout(j, b);
    const res = simularPelea(a, c, b.rounds, rng);
    b.snap = { a: snapA, b: snapB };
    b.resultado = res;
    const ra = aplicar(e, b, a, c, res, true, rng, snapA, snapB, etiqueta);
    const rb = aplicar(e, b, c, a, res, false, rng, snapB, snapA, etiqueta);
    j.peleadores[ia] = ra.nuevo;
    j.peleadores[ib] = rb.nuevo;
    bolsas += ra.pago.bolsa + rb.pago.bolsa;
    bonosV += ra.pago.bonos + rb.pago.bonos;

    if (b.titulo && b.torneoId == null) resolverTitulo(j, e, b.genero, b.clase, a.id, c.id, b.interino, res.ganadorId, res.metodo, res.round);
    if (b.torneoId != null) {
      // en un torneo, un empate se decide con el que tenga mejor récord para poder avanzar
      const g = res.ganadorId ?? (recordRatio(j.peleadores[ia]) >= recordRatio(j.peleadores[ib]) ? a.id : c.id);
      premios += avanzarGanador(j, e, b, g);
    }
  }

  // ---- finanzas ----
  const d = ECONOMIA.demanda;
  const est = estimarBoletos(j, e, e.precio, hype);
  let vendidos = clamp(Math.round(est.demanda * (1 + rng.normal(0, d.ruido))), 0, sede.aforo);
  let clima: string | undefined;
  if (sede.tipo === 'estadio' && rng.chance(d.climaProb)) {
    vendidos = Math.round(vendidos * (1 - d.climaPerdida));
    clima = 'La lluvia redujo la asistencia.';
  }
  const costos = costosEvento(j, e, hype);
  const taquilla = vendidos * e.precio;
  const gastos = costos.renta + costos.produccion + costos.viaje + bolsas + bonosV + premios;
  const neto = Math.round(taquilla + costos.transmision - gastos);
  const llenado = sede.aforo ? vendidos / sede.aforo : 0;
  const pp = ECONOMIA.popularidad;
  const { region, pop } = popRegionDe(j, sede);
  let gana = (pp.base + llenado * pp.porAforoLleno + hype * pp.porHype) * (1 - pop / pp.amortigua);
  if (llenado < 0.35) gana -= pp.pierdeSiVacio;
  gana = clamp(gana, -pp.pierdeSiVacio, pp.tope);
  mia.popRegion = { ...mia.popRegion, [region]: clamp(pop + gana, 0, 100) };
  mia.fans += Math.round(vendidos * 0.8 + hype * 25);
  mia.reputacion = clamp(mia.reputacion + (neto >= 0 ? 0.3 : 0.1) + hype / 400, 0, 100);
  mover(j, 'taquilla', taquilla);
  mover(j, 'transmision', costos.transmision);
  mover(j, 'sedes', -costos.renta);
  mover(j, 'produccion', -costos.produccion);
  mover(j, 'viaje', -costos.viaje);
  mover(j, 'bolsas', -Math.round(bolsas));
  mover(j, 'bonos', -Math.round(bonosV));
  mover(j, 'premios', -premios);

  e.estado = 'realizado';
  e.finanzas = {
    precio: e.precio, aforo: sede.aforo, boletosVendidos: vendidos, taquilla, transmision: costos.transmision, patrocinios: 0,
    renta: costos.renta, produccion: costos.produccion, viaje: costos.viaje, bolsas: Math.round(bolsas),
    bonosVictoria: Math.round(bonosV), bonosNoche: 0, premios, neto, popularidad: Math.round(gana * 100) / 100, clima,
  };
  e.bonos = sugerirBonos(j, e);

  // noticias
  const main = e.cartelera[e.cartelera.length - 1];
  const ganadorMain = main.resultado?.ganadorId != null ? j.peleadores.find(p => p.id === main.resultado!.ganadorId) : undefined;
  agregarNoticia(j, {
    categoria: 'eventos', titulo: `Resultados: ${e.nombre}`,
    cuerpo: `${ganadorMain ? `${nombreCompleto(ganadorMain)} gana el estelar por ${main.resultado!.metodo}. ` : 'El estelar no tuvo ganador. '}Neto del evento: ${dinero(neto, true)}.`,
  });
  for (const b of e.cartelera) {
    for (const pid of [b.aId, b.bId]) {
      const p = j.peleadores.find(x => x.id === pid);
      if (!p || b.resultado?.metodo === 'DQ' && b.resultado.round === 0) continue;
      if (p.lesion && p.ultimoCombate === e.semana) {
        agregarNoticia(j, {
          categoria: 'importante', peleadorId: p.id, titulo: `${nombreCompleto(p)} se lesionó en la pelea: ${p.lesion.tipo}`,
          cuerpo: `Estará fuera aproximadamente ${p.lesion.semanas} semanas.`,
        });
      }
      if (p.contrato && p.contrato.peleasRestantes === 0) {
        agregarNoticia(j, {
          categoria: 'importante', peleadorId: p.id, titulo: `Terminó el contrato de ${nombreCompleto(p)}`,
          cuerpo: 'Renuévalo antes de que termine la semana o quedará como agente libre.',
        });
      }
    }
  }

  recalcularRankings(j, [j.miId]);
  j.rngState = rng.state;
  return null;
}

const recordRatio = (p: Peleador) => p.rec.mio.v / Math.max(1, p.rec.mio.v + p.rec.mio.d);

