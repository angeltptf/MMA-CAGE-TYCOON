// Motor de pelea: simula round por round, intercambio por intercambio, enfrentando
// ataque vs defensa en cada disciplina, con físicos, cardio, fatiga y daño acumulado.
import { MOTOR, TECNICAS_KO, TECNICAS_SUMISION } from '../config/motorPelea';
import { clamp, Rng } from './rng';
import { scoreCalif } from './peleador';
import type { Metodo, Peleador, ResultadoPelea, StatsPelea } from './types';

interface Lado {
  p: Peleador;
  f: number;                  // forma del día
  golpeA: number;             // ataque de golpeo
  golpeD: number;
  luchaA: number;
  luchaD: number;
  bjjA: number;
  bjjD: number;
  dano: number;               // daño recibido en esta pelea
  stats: StatsPelea;
  roundStats: { sig: number; td: number; ctrl: number; sub: number; kd: number; danoHecho: number };
}

const vacio = (): StatsPelea => ({ golpes: 0, golpesSig: 0, derribos: 0, intentosDerribo: 0, subIntentos: 0, controlSeg: 0, caidas: 0 });
const vacioRound = () => ({ sig: 0, td: 0, ctrl: 0, sub: 0, kd: 0, danoHecho: 0 });
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function lado(p: Peleador, rng: Rng): Lado {
  const f = clamp(rng.normal(1, MOTOR.formaDelDiaDesv), 0.85, 1.15);
  const a = p.ataque;
  const d = p.defensa;
  const mezcla = (x: number, y: number) => Math.max(x, y) * 0.7 + Math.min(x, y) * 0.3;
  return {
    p, f,
    golpeA: mezcla(a.boxeo, a.muayThai) * f, golpeD: mezcla(d.boxeo, d.muayThai) * f,
    luchaA: a.lucha * f, luchaD: d.lucha * f, bjjA: a.bjj * f, bjjD: d.bjj * f,
    dano: 0, stats: vacio(), roundStats: vacioRound(),
  };
}

// Condición física en el round r (1 = descansado)
function condicion(l: Lado, r: number): number {
  const c = MOTOR.cansancio;
  const decay = c.cardio * (1 - l.p.fis.cardio / 12) + c.corazon * (1 - l.p.fis.corazon / 14);
  return clamp(1 - l.p.fatiga / c.fatigaInicial - (r - 1) * decay, c.piso, 1);
}

const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;

export interface Opciones { rapido?: boolean }

export function simularPelea(a: Peleador, b: Peleador, rounds: 3 | 5, rng: Rng, opc: Opciones = {}): ResultadoPelea {
  const A = lado(a, rng);
  const B = lado(b, rng);
  const lados = [A, B] as const;
  const E = MOTOR.intercambiosPorRound;
  const narr: string[] = [];
  const tarjetas: [number, number][] = Array.from({ length: MOTOR.jueces.n }, () => [0, 0]);
  const nombre = (l: Lado) => l.p.apellido;

  const final = (ganador: Lado | null, metodo: Metodo, round: number, seg: number, tecnica?: string, texto?: string): ResultadoPelea => {
    if (!opc.rapido && texto) narr.push(texto);
    return {
      ganadorId: ganador ? ganador.p.id : null, metodo, tecnica, round, tiempo: mmss(seg), tarjetas,
      stats: { a: A.stats, b: B.stats }, narracion: narr,
    };
  };

  // eventos raros
  const rara = rng.next();
  if (rara < MOTOR.raras.descalificacion) {
    const culpable = rng.chance(0.5) ? A : B;
    return final(culpable === A ? B : A, 'DQ', 1, rng.int(40, 280), undefined, `${nombre(culpable)} es descalificado por un golpe ilegal.`);
  }
  if (rara < MOTOR.raras.descalificacion + MOTOR.raras.sinResultado) {
    return final(null, 'NC', 1, rng.int(20, 120), undefined, 'La pelea se declara sin resultado por un golpe accidental.');
  }

  let pos: 'pie' | 'A' | 'B' = 'pie'; // quién está arriba en el suelo

  for (let r = 1; r <= rounds; r++) {
    A.roundStats = vacioRound();
    B.roundStats = vacioRound();
    pos = 'pie';
    const cA = condicion(A, r);
    const cB = condicion(B, r);
    const eventos: string[] = [];

    for (let e = 0; e < E; e++) {
      const tiempo = () => Math.max(5, Math.min(299, Math.floor((300 * (e + rng.float(0.15, 1))) / E)));
      if (pos === 'pie') {
        const intento = (x: Lado, y: Lado, cx: number) => {
          const d = MOTOR.derribo;
          const gustoGolpeo = 1 - x.golpeA / 12;
          let p = d.intentoBase + d.intentoLucha * Math.pow(x.luchaA / 10, 1.3) * (0.5 + 0.5 * gustoGolpeo);
          if (y.golpeA > x.golpeA + 1.5) p *= 1.25; // evita el intercambio si pierde de pie
          return clamp(p * (0.8 + 0.2 * cx), 0.02, d.intentoMax);
        };
        const sA = intento(A, B, cA);
        const sB = intento(B, A, cB);
        const x = rng.next();
        const tira = x < sA ? A : x < sA + sB ? B : null;
        if (tira) {
          const rival = tira === A ? B : A;
          const ct = tira === A ? cA : cB;
          const cr = tira === A ? cB : cA;
          const d = MOTOR.derribo;
          tira.stats.intentosDerribo++;
          const pExito = clamp(sigmoid(d.exitoK * (tira.luchaA * ct - rival.luchaD * cr)), d.exitoMin, d.exitoMax);
          if (rng.chance(pExito)) {
            tira.stats.derribos++;
            tira.roundStats.td++;
            pos = tira === A ? 'A' : 'B';
          }
          continue;
        }
        // intercambio de golpes
        const g = MOTOR.golpeo;
        const sigs = lados.map((l, i) => {
          const rival = lados[1 - i];
          const c = i === 0 ? cA : cB;
          const n = g.lanzadosBase + g.lanzadosExtra * (l.p.fis.agresividad / 10) * (l.p.fis.velocidad / 10) * c;
          const pAcierto = clamp(g.aciertoBase + g.aciertoK * (l.golpeA * c * (0.9 + 0.1 * l.p.fis.velocidad / 10) - rival.golpeD), g.aciertoMin, g.aciertoMax);
          const media = n * pAcierto;
          const landed = Math.max(0, Math.round(media + rng.normal(0, Math.sqrt(media * (1 - pAcierto)))));
          l.stats.golpes += Math.round(n);
          l.stats.golpesSig += landed;
          l.roundStats.sig += landed;
          const dano = landed * (g.danoPorGolpe + g.danoPotencia * l.p.fis.potencia / 10);
          rival.dano += dano;
          l.roundStats.danoHecho += dano;
          return { l, rival, landed };
        });
        for (const s of sigs) {
          const k = MOTOR.ko;
          const pKO = k.base * (s.l.p.fis.potencia / 6) * (s.landed / 8) * (1 + s.rival.dano / 40)
            * (1 + Math.max(0, 6 - s.rival.p.fis.menton) / 6) * (1 + s.rival.p.dano / 120) * (1 - k.mentonDefensa * (s.rival.p.fis.menton / 10));
          const x = rng.next();
          if (x < pKO) {
            const limpio = rng.chance(k.pctKOvsTKO);
            const tec = rng.pick(TECNICAS_KO);
            const seg = tiempo();
            s.rival.stats.caidas++;
            return final(s.l, limpio ? 'KO' : 'TKO', r, seg, limpio ? tec : 'golpes',
              limpio ? `${nombre(s.l)} noquea a ${nombre(s.rival)} con un ${tec} en el round ${r} (${mmss(seg)}).`
                : `${nombre(s.l)} detiene a ${nombre(s.rival)} por golpes en el round ${r} (${mmss(seg)}).`);
          }
          if (x < pKO * k.knockdownMult) {
            s.l.roundStats.kd++;
            s.rival.stats.caidas++;
            eventos.push(`${nombre(s.l)} derriba a ${nombre(s.rival)} con un golpe`);
            if (rng.chance(k.seguimientoTKO)) {
              const seg = tiempo();
              return final(s.l, 'TKO', r, seg, 'golpes en el suelo', `${nombre(s.l)} remata a ${nombre(s.rival)} tras derribarlo: paran la pelea en el round ${r} (${mmss(seg)}).`);
            }
          }
        }
        // corte
        if (rng.chance(MOTOR.ko.cortePorRound / E * (1 + Math.max(A.dano, B.dano) / 30))) {
          const herido = A.dano > B.dano ? A : B;
          const otro = herido === A ? B : A;
          const seg = tiempo();
          return final(otro, 'TKO', r, seg, 'corte (parada médica)', `El doctor detiene la pelea por un corte de ${nombre(herido)} en el round ${r} (${mmss(seg)}).`);
        }
      } else {
        // pelea en el suelo
        const top: Lado = pos === 'A' ? A : B;
        const bot: Lado = pos === 'A' ? B : A;
        const ct = pos === 'A' ? cA : cB;
        const cb = pos === 'A' ? cB : cA;
        const s = MOTOR.suelo;
        top.stats.controlSeg += s.controlPorIntercambio;
        top.roundStats.ctrl += s.controlPorIntercambio;
        // golpes en el suelo
        const gp = Math.round(s.gnpGolpes + s.gnpExtra * (top.luchaA / 10) * ct * rng.float(0.6, 1.1));
        const hechos = Math.round(gp * clamp(0.55 - bot.bjjD / 40, 0.25, 0.7));
        top.stats.golpes += gp;
        top.stats.golpesSig += hechos;
        top.roundStats.sig += hechos;
        const dano = hechos * s.gnpDano * (0.6 + top.p.fis.potencia / 15);
        bot.dano += dano;
        top.roundStats.danoHecho += dano;
        if (rng.chance(s.gnpTKO * (top.p.fis.potencia / 6) * (1 + bot.dano / 30))) {
          const seg = tiempo();
          bot.stats.caidas++;
          return final(top, 'TKO', r, seg, 'golpes en el suelo', `${nombre(top)} termina la pelea a golpes en el suelo contra ${nombre(bot)} en el round ${r} (${mmss(seg)}).`);
        }
        // sumisiones (el de arriba y el de abajo)
        const intentar = (x: Lado, y: Lado, cx: number, cy: number, abajo: boolean): { autor: Lado; tec: string } | null => {
          const pTry = (s.subIntentoBase + s.subIntentoBjj * Math.pow(x.bjjA / 10, 1.5)) * (abajo ? s.subDesdeAbajo : 1);
          if (!rng.chance(pTry)) return null;
          x.stats.subIntentos++;
          x.roundStats.sub++;
          const pExito = clamp(sigmoid(s.subExitoK * (x.bjjA * cx - y.bjjD * cy) - s.subExitoOffset), s.subExitoMin, s.subExitoMax) * (abajo ? 0.8 : 1);
          const tec = rng.pick(TECNICAS_SUMISION);
          if (rng.chance(pExito)) return { autor: x, tec };
          eventos.push(`${nombre(x)} intenta ${tec}`);
          return null;
        };
        const sub = intentar(top, bot, ct, cb, false) ?? intentar(bot, top, cb, ct, true);
        if (sub) {
          const seg = tiempo();
          const perdedor = sub.autor === top ? bot : top;
          return final(sub.autor, 'SUB', r, seg, sub.tec, `${nombre(sub.autor)} somete a ${nombre(perdedor)} (${sub.tec}) en el round ${r} (${mmss(seg)}).`);
        }
        // escape / reversión
        const pEsc = clamp(s.escapeBase + s.escapeK * (bot.luchaD * cb + bot.bjjD * 0.5 * cb - top.luchaA * ct), s.escapeMin, s.escapeMax);
        if (rng.chance(pEsc)) {
          pos = rng.chance(s.reversion * (bot.bjjA / 10)) ? (pos === 'A' ? 'B' : 'A') : 'pie';
        }
      }
    }

    // --- tarjetas del round ---
    const puntaje = (x: Lado, y: Lado) =>
      (x.roundStats.sig - y.roundStats.sig) * 1.0 + (x.roundStats.danoHecho - y.roundStats.danoHecho) * 1.5
      + (x.roundStats.td - y.roundStats.td) * 4 + (x.roundStats.sub - y.roundStats.sub) * 3
      + (x.roundStats.ctrl - y.roundStats.ctrl) / 60 * 3 + (x.roundStats.kd - y.roundStats.kd) * 14;
    const margen = puntaje(A, B);
    for (let j = 0; j < MOTOR.jueces.n; j++) {
      const ruido = rng.normal(0, MOTOR.jueces.ruido * (Math.abs(A.roundStats.sig) + Math.abs(B.roundStats.sig)) / 3 + MOTOR.jueces.ruidoMin / 2);
      const m = margen + ruido;
      const sinKd = A.roundStats.kd + B.roundStats.kd === 0;
      const gana = m === 0 ? (rng.chance(0.5) ? 1 : -1) : Math.sign(m);
      const dominante = Math.abs(m) > MOTOR.jueces.diezOcho || (!sinKd && Math.abs(m) > 25);
      const ptsPerd = dominante ? 8 : 9;
      if (gana > 0) { tarjetas[j][0] += 10; tarjetas[j][1] += ptsPerd; }
      else { tarjetas[j][1] += 10; tarjetas[j][0] += ptsPerd; }
    }

    if (!opc.rapido) {
      narr.push(narrarRound(r, A, B, eventos, margen));
    }
  }

  // --- decisión ---
  const votos = tarjetas.map(([x, y]) => (x > y ? 1 : x < y ? -1 : 0));
  const a1 = votos.filter(v => v === 1).length;
  const b1 = votos.filter(v => v === -1).length;
  const marcador = tarjetas.map(([x, y]) => `${x}-${y}`).join(', ');
  const seg = 300;
  if (a1 === b1) {
    return final(null, 'E', rounds, seg, undefined, `Empate: ${marcador}.`);
  }
  const gana = a1 > b1 ? A : B;
  const tipo: Metodo = Math.max(a1, b1) === 3 ? 'DU' : (a1 === 0 || b1 === 0) ? 'DM' : 'DD';
  const txt = tipo === 'DU' ? 'por decisión unánime' : tipo === 'DM' ? 'por decisión mayoritaria' : 'por decisión dividida';
  return final(gana, tipo, rounds, seg, undefined, `${nombre(gana)} gana ${txt} (${marcador}).`);
}

function narrarRound(r: number, A: Lado, B: Lado, eventos: string[], margen: number): string {
  const partes: string[] = [];
  const l = A.roundStats;
  const m = B.roundStats;
  const dom = margen > 6 ? A : margen < -6 ? B : null;
  if (dom) {
    const otro = dom === A ? B : A;
    partes.push(`${dom.p.apellido} gana el round: ${dom.roundStats.sig} golpes significativos contra ${otro.roundStats.sig}`);
  } else partes.push(`Round parejo: ${l.sig} golpes significativos de ${A.p.apellido} contra ${m.sig} de ${B.p.apellido}`);
  if (l.td + m.td > 0) {
    const t = l.td >= m.td ? A : B;
    partes.push(`${t.p.apellido} derriba ${t.roundStats.td === 1 ? 'una vez' : `${t.roundStats.td} veces`}${t.roundStats.ctrl > 0 ? ` y controla ${mmss(t.roundStats.ctrl)} en el suelo` : ''}`);
  }
  if (l.sub + m.sub > 0) partes.push(`hay ${l.sub + m.sub} intento${l.sub + m.sub > 1 ? 's' : ''} de sumisión`);
  for (const ev of eventos.slice(0, 2)) partes.push(ev);
  return `Round ${r}: ${partes.join('; ')}.`;
}

// Probabilidad estimada de que gane A (para los momios), sin simular
export function probVictoria(a: Peleador, b: Peleador): number {
  const ata = (x: Peleador) => Math.max(x.ataque.boxeo, x.ataque.muayThai);
  const def = (x: Peleador) => Math.max(x.defensa.boxeo, x.defensa.muayThai);
  const lucha = (x: Peleador) => (x.ataque.lucha + x.ataque.bjj) / 2;
  const ludef = (x: Peleador) => (x.defensa.lucha + x.defensa.bjj) / 2;
  const edgeGolpe = (ata(a) - def(b)) - (ata(b) - def(a));
  const edgeSuelo = (lucha(a) - ludef(b)) - (lucha(b) - ludef(a));
  const matchup = MOTOR.momios.matchup * (edgeGolpe + edgeSuelo);
  const forma = (x: Peleador) => (x.racha.tipo === 'V' ? 0.08 : x.racha.tipo === 'D' ? -0.08 : 0) * Math.min(x.racha.n, 4);
  const fatiga = (b.fatiga - a.fatiga) / 120;
  const d = scoreCalif(a) - scoreCalif(b) + matchup + forma(a) - forma(b) + fatiga;
  return clamp(sigmoid(MOTOR.momios.k * d), 0.04, 0.96);
}

// Momio americano de un peleador con probabilidad p
export function momio(p: number): number {
  const q = clamp(p, 0.03, 0.97);
  const v = q >= 0.5 ? -(q / (1 - q)) * 100 : ((1 - q) / q) * 100;
  const r = Math.round(v / 5) * 5;
  return r === 0 ? 100 : r;
}
