import {
  AGENTES_LIBRES_BAJOS, AGENTES_LIBRES_INICIALES, AGENTES_LIBRES_TALENTO, COMPANIAS_RIVALES, type CompaniaCfg,
} from '../config/companias';
import { CICLO_VIDA, DIFICULTAD, EMPRESA } from '../config/balance';
import {
  CLASES, DIVISIONES_GENERO, PERFIL_ESTILO, PESO_DIVISION,
} from '../config/divisiones';
import { APODOS_EN, APODOS_ES, PAISES, PAIS_POR_CODIGO } from '../config/paises';
import {
  clausulaDe, contratoSugerido, factorFisico, factorTecnico, estrellasCalif, scoreCalif,
} from './peleador';
import { Rng, clamp } from './rng';
import { recalcularRankings } from './rankings';
import type {
  ClaseId, Compania, Disciplina, Division, Estilo, Genero, Juego, NuevaPartida, Peleador, Rec,
  Resultado,
} from './types';

const DISC: Disciplina[] = ['bjj', 'boxeo', 'muayThai', 'lucha'];

// Escala del talento a habilidades (calibrada para que la UFC rinda ~6.5 de media)
const ESCALA_TALENTO = 1.2;

export interface OpcionesPeleador {
  companiaId: string | null;
  talentoMedia: number;
  talentoDesv: number;
  pctMujeres: number;
  sesgoPais?: Record<string, number>;
  edad?: [number, number];     // rango fijo (para nuevos talentos)
  genero?: Genero;
  talentoMin?: number;
  talentoMax?: number;         // tope de talento (los agentes libres no son estrellas)
  popMax?: number;
}

export function nuevoRng(j: Pick<Juego, 'rngState'>): Rng {
  return new Rng(j.rngState);
}

function elegirPais(rng: Rng, sesgo: Record<string, number> = {}): string {
  return rng.weighted(PAISES, p => p.peso * (sesgo[p.code] ?? 1)).code;
}

function nombreUnico(rng: Rng, pais: string, g: Genero, usados: Set<string>): { nombre: string; apellido: string } {
  const cfg = PAIS_POR_CODIGO[pais];
  for (let i = 0; i < 12; i++) {
    const nombre = rng.pick(g === 'M' ? cfg.m : cfg.f);
    const apellido = rng.pick(cfg.ap);
    const k = `${nombre} ${apellido}`;
    if (!usados.has(k) || i === 11) {
      usados.add(k);
      return { nombre, apellido };
    }
  }
  return { nombre: cfg.m[0], apellido: cfg.ap[0] };
}

function elegirEdad(rng: Rng, talento: number): number {
  // Distribución: mayoría 24-34, pocos jóvenes y veteranos; mejores talentos algo mayores
  const e = Math.round(rng.normal(29 + (talento - 5) * 0.3, 4.2));
  return clamp(e, 18, 42);
}

function crearRec(rng: Rng, edad: number, calif: number, estilo: Estilo, sesgoTier: number): { tot: Rec; finales: Peleador['finales']; forma: Resultado[] } {
  const debut = rng.int(19, 25);
  const anios = Math.max(0, edad - debut);
  const n = clamp(Math.round(anios * rng.float(1.4, 3.0) - rng.float(0, 2)), 0, 48);
  // las compañías grandes retienen a quienes ganan: su gente tiene mejores récords
  const pWin = clamp(0.5 + (calif - 5) * 0.06 + sesgoTier + rng.normal(0, 0.05), 0.2, 0.92);
  const rec: Rec = { v: 0, d: 0, e: 0, nc: 0 };
  const hist: Resultado[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng.next();
    if (r < 0.02) { rec.e++; hist.push('E'); }
    else if (r < 0.03) { rec.nc++; }
    else if (rng.chance(pWin)) { rec.v++; hist.push('V'); }
    else { rec.d++; hist.push('D'); }
  }
  const pSub = estilo === 'bjj' || estilo === 'sambista' || estilo === 'judoka' ? 0.3 : estilo === 'luchador' ? 0.14 : 0.1;
  const pKo = estilo === 'boxeador' || estilo === 'muayThai' || estilo === 'karateka' ? 0.5 : 0.28;
  const finales = { ko: 0, tko: 0, sub: 0, dec: 0 };
  for (let i = 0; i < rec.v; i++) {
    const r = rng.next();
    if (r < pSub) finales.sub++;
    else if (r < pSub + pKo * 0.4) finales.ko++;
    else if (r < pSub + pKo) finales.tko++;
    else finales.dec++;
  }
  return { tot: rec, finales, forma: hist.slice(-5) };
}

function rachas(hist: Resultado[]): { racha: Peleador['racha']; mejorV: number; peorD: number } {
  let tipo: Resultado = 'V';
  let n = 0;
  let mejorV = 0;
  let peorD = 0;
  let cur = 0;
  let curT: Resultado | null = null;
  for (const r of hist) {
    if (r === curT) cur++;
    else { curT = r; cur = 1; }
    if (r === 'V') mejorV = Math.max(mejorV, cur);
    if (r === 'D') peorD = Math.max(peorD, cur);
  }
  if (hist.length) {
    tipo = hist[hist.length - 1];
    n = 0;
    for (let i = hist.length - 1; i >= 0 && hist[i] === tipo; i--) n++;
  }
  return { racha: { tipo, n }, mejorV, peorD };
}

export function crearPeleador(
  rng: Rng,
  id: number,
  op: OpcionesPeleador,
  usados: Set<string>,
): Peleador {
  const genero: Genero = op.genero ?? (rng.chance(op.pctMujeres) ? 'F' : 'M');
  const pais = elegirPais(rng, op.sesgoPais);
  const { nombre, apellido } = nombreUnico(rng, pais, genero, usados);
  const idioma = PAIS_POR_CODIGO[pais].idioma;
  const apodo = rng.chance(0.55)
    ? (idioma === 'es' || (idioma === undefined && rng.chance(0.15)) ? rng.pick(APODOS_ES) : rng.pick(APODOS_EN))
    : '';

  const clase = rng.weighted(
    DIVISIONES_GENERO[genero],
    c => PESO_DIVISION[genero][c] ?? 0,
  ) as ClaseId;
  const cc = CLASES[clase];

  const estilo = rng.weighted(Object.keys(PERFIL_ESTILO) as Estilo[], e => PERFIL_ESTILO[e].peso);
  const perfil = PERFIL_ESTILO[estilo];

  const talento = clamp(rng.normal(op.talentoMedia, op.talentoDesv), op.talentoMin ?? 1.2, op.talentoMax ?? 9.8);
  const edad = op.edad ? rng.int(op.edad[0], op.edad[1]) : elegirEdad(rng, talento);
  const T = talento * ESCALA_TALENTO;
  const ft = factorTecnico(edad);
  const ff = factorFisico(edad);

  const atk = {} as Record<Disciplina, number>;
  const def = {} as Record<Disciplina, number>;
  DISC.forEach((d, i) => {
    atk[d] = clamp(T * perfil.atk[i] * ft + rng.normal(0, 0.7), 0.3, 10);
    def[d] = clamp(T * perfil.def[i] * ft + rng.normal(0, 0.7), 0.3, 10);
  });
  const fisBase = (k = 0.92) => clamp(T * k * ff + rng.normal(0, 0.9), 0.5, 10);
  const fis = {
    agilidad: fisBase(), agresividad: clamp(rng.normal(5.5, 1.8), 0.5, 10),
    menton: clamp(T * 0.9 * (edad >= 33 ? ff : 1) + rng.normal(0, 1.1), 0.5, 10),
    corazon: clamp(T * 0.95 + rng.normal(0, 1), 0.5, 10),
    potencia: fisBase(), velocidad: fisBase(), cardio: fisBase(),
    lesiones: clamp(rng.normal(4, 2), 0, 10),
  };

  const alturaCm = Math.round(cc.alturaCm[genero] + rng.normal(0, 4.5));
  const limiteKg = cc.limiteLb[genero] / 2.20462;
  const pesoKg = Math.round(limiteKg * rng.float(0.955, 1) * 10) / 10;

  const p: Peleador = {
    id, nombre, apellido, apodo, pais, genero, edad,
    cumple: rng.int(1, 52),
    alturaCm, pesoKg, clase, clasesSec: [], estilo,
    ataque: atk, defensa: def, fis,
    potencial: 3,
    popularidad: 0, moral: clamp(Math.round(rng.normal(68, 12)), 25, 98), fatiga: 0,
    dano: 0, lesion: null,
    companiaId: op.companiaId, contrato: null,
    rec: { tot: { v: 0, d: 0, e: 0, nc: 0 }, mio: { v: 0, d: 0, e: 0, nc: 0 } },
    finales: { ko: 0, tko: 0, sub: 0, dec: 0 },
    forma: [], racha: { tipo: 'V', n: 0 }, mejorRachaV: 0, peorRachaD: 0,
    ganancias: 0, ultimoCombate: null, favorito: false, retirado: false, elite: false,
    enVenta: false, sinNegociarHasta: 0, descansoHasta: 0, peleas: [],
  };

  const calif = estrellasCalif(p) * 2;
  // El potencial parte del talento pico; los jóvenes tienen más margen
  const pico = clamp(T + rng.normal(0, 0.4), 1, 10);
  p.potencial = clamp(Math.round(Math.max(pico, calif)) / 2, 0.5, 5);
  p.elite = p.potencial >= 4.5;

  const hist = crearRec(rng, edad, calif, estilo, (op.talentoMedia - 4.5) * 0.03);
  p.rec.tot = hist.tot;
  p.finales = hist.finales;
  p.forma = hist.forma;
  const rc = rachas(hist.forma);
  p.racha = rc.racha;
  p.mejorRachaV = Math.max(rc.mejorV, rc.racha.tipo === 'V' ? rc.racha.n : 0);
  p.peorRachaD = rc.peorD;

  const peleas = hist.tot.v + hist.tot.d + hist.tot.e + hist.tot.nc;
    const r = scoreCalif(p);
  const fama = 100 * Math.pow(clamp((r - 2) / 8, 0, 1), 1.7);
  p.popularidad = clamp(
    Math.round(fama + clamp((hist.tot.v - hist.tot.d) * 0.5, -12, 15) + (op.talentoMedia - 5) * 2.5 + rng.normal(0, 6)),
    1, 98,
  );
  if (edad <= 22 && peleas < 6) p.popularidad = Math.min(p.popularidad, 18);
  if (op.popMax != null) p.popularidad = Math.min(p.popularidad, op.popMax);
  p.dano = clamp(Math.round(Math.max(0, (peleas - 8) * 0.35 + (edad - 28) * 0.5 + rng.normal(0, 3))), 0, 60);
  p.fatiga = 0;
  p.ultimoCombate = null;

  if (op.companiaId && !op.edad) {
    p.contrato = contratoSugerido(p, rng.int(2, 10));
    p.contrato.clausula = clausulaDe(p.contrato, edad);
  }
  return p;
}

function cfgACompania(c: CompaniaCfg): Compania {
  const regionBase: Record<string, number> = {};
  const casa = regionDePais(c.pais);
  for (const r of EMPRESA.regiones) regionBase[r] = Math.round(c.reputacion * (r === casa ? 1 : 0.75));
  return {
    id: c.id, nombre: c.nombre, siglas: c.siglas, color: c.color, pais: c.pais, esMia: false,
    tier: c.tier, dinero: c.dinero, fans: c.fans, reputacion: c.reputacion,
    ingresosAnuales: c.ingresosAnuales, eventosAnio: c.eventosAnio,
    popRegion: regionBase, fundada: -52 * 15,
  };
}

const REGION_DE_PAIS: Record<string, string> = {
  MX: 'mexico', US: 'eeuu', CA: 'eeuu', BR: 'latam', AR: 'latam', CO: 'latam', CL: 'latam',
  JP: 'asia', KR: 'asia', CN: 'asia', TH: 'asia', PH: 'asia', SG: 'asia', KZ: 'asia',
  AE: 'medioOriente', SA: 'medioOriente', QA: 'medioOriente',
};

export function regionDePais(code: string): string {
  return REGION_DE_PAIS[code] ?? 'europa';
}

export function crearMundo(nueva: NuevaPartida, semilla = Date.now() >>> 0): Juego {
  const rng = new Rng(semilla);
  const usados = new Set<string>();
  const peleadores: Peleador[] = [];
  let id = 1;

  const miId = 'mia';
  const regionMia = regionDePais(nueva.pais);
  const popRegion: Record<string, number> = {};
  for (const r of EMPRESA.regiones) popRegion[r] = r === regionMia ? EMPRESA.popularidadInicial : 1;
  const mia: Compania = {
    id: miId, nombre: nueva.nombre, siglas: nueva.siglas, color: nueva.color, pais: nueva.pais,
    esMia: true, tier: 1, dinero: DIFICULTAD[nueva.dificultad].dineroInicial,
    fans: EMPRESA.fansIniciales, reputacion: EMPRESA.reputacionInicial, ingresosAnuales: 0,
    eventosAnio: 0, popRegion, fundada: 0,
  };
  const companias: Compania[] = [mia, ...COMPANIAS_RIVALES.map(cfgACompania)];

  for (const cfg of COMPANIAS_RIVALES) {
    for (let i = 0; i < cfg.peleadores; i++) {
      peleadores.push(crearPeleador(rng, id++, {
        companiaId: cfg.id, talentoMedia: cfg.talentoMedia, talentoDesv: cfg.talentoDesv,
        pctMujeres: cfg.pctMujeres, sesgoPais: cfg.sesgoPais,
      }, usados));
    }
  }
  for (let i = 0; i < AGENTES_LIBRES_INICIALES; i++) {
    peleadores.push(crearPeleador(rng, id++, {
      companiaId: null, talentoMedia: AGENTES_LIBRES_TALENTO.media,
      talentoDesv: AGENTES_LIBRES_TALENTO.desv, pctMujeres: 0.15,
      talentoMax: AGENTES_LIBRES_TALENTO.max, popMax: AGENTES_LIBRES_TALENTO.popMax,
    }, usados));
  }

  const nBajos = DIFICULTAD[nueva.dificultad].libresBajos;
  for (let i = 0; i < nBajos; i++) {
    peleadores.push(crearPeleador(rng, id++, {
      companiaId: null, talentoMedia: AGENTES_LIBRES_BAJOS.media, talentoDesv: AGENTES_LIBRES_BAJOS.desv,
      talentoMin: AGENTES_LIBRES_BAJOS.min, talentoMax: AGENTES_LIBRES_BAJOS.max, popMax: AGENTES_LIBRES_BAJOS.popMax,
      pctMujeres: 0.15,
    }, usados));
  }

  // Divisiones de las compañías rivales (la mía empieza sin ninguna)
  const divisiones: Division[] = [];
  for (const c of COMPANIAS_RIVALES) {
    for (const g of ['M', 'F'] as Genero[]) {
      for (const clase of DIVISIONES_GENERO[g]) {
        divisiones.push({
          id: `${c.id}:${g}:${clase}`, companiaId: c.id, genero: g, clase,
          campeonId: null, interinoId: null, ranking: [],
        });
      }
    }
  }

  const j: Juego = {
    version: 1, nombre: nueva.nombre, dificultad: nueva.dificultad, miId,
    semanaAbs: 0, rngState: rng.state, sigId: id, sigNoticia: 1,
    companias, peleadores, divisiones, eventos: [], ofertas: [], sigEvento: 1, sigPelea: 1, sigOferta: 1,
    contadores: { ppv: 0, noche: 0 }, poblacionObjetivo: id - 1, noticias: [],
    ajustes: {
      unidades: 'metrico', gameOver: true, velocidadSim: 2, nombresDivision: 'es',
      recordatorioRespaldo: true,
    },
    ultimoRespaldo: Date.now(), semanasEnNegativo: 0,
  };
  recalcularRankings(j, undefined, true);
  j.noticias.push({
    id: j.sigNoticia++, semana: 0, categoria: 'importante', leida: false,
    titulo: `¡Bienvenido a ${nueva.nombre}!`,
    cuerpo: 'Empiezas desde cero: sin peleadores y sin divisiones. Ficha agentes libres, crea tus divisiones y arma tu primera cartelera.',
  });
  return j;
}

// Genera nuevos talentos (se llama desde la simulación semanal)
export function generarProspectos(j: Juego, rng: Rng, n: number): Peleador[] {
  const usados = new Set(j.peleadores.map(p => `${p.nombre} ${p.apellido}`));
  const rivales = COMPANIAS_RIVALES;
  const nuevos: Peleador[] = [];
  for (let i = 0; i < n; i++) {
    const libre = rng.chance(CICLO_VIDA.pctNuevosLibres);
    const bajo = libre && rng.chance(DIFICULTAD[j.dificultad].libresBajos / (DIFICULTAD[j.dificultad].libresBajos + AGENTES_LIBRES_INICIALES));
    const cfg = libre ? null : rng.weighted(rivales, c => c.peleadores);
    const media = bajo ? AGENTES_LIBRES_BAJOS.media : libre ? AGENTES_LIBRES_TALENTO.media : cfg!.talentoMedia - 0.4;
    const p = crearPeleador(rng, j.sigId++, {
      companiaId: cfg?.id ?? null, talentoMedia: media, talentoDesv: bajo ? AGENTES_LIBRES_BAJOS.desv : libre ? AGENTES_LIBRES_TALENTO.desv : cfg!.talentoDesv,
      pctMujeres: cfg?.pctMujeres ?? 0.15, sesgoPais: cfg?.sesgoPais,
      ...(bajo ? { talentoMin: AGENTES_LIBRES_BAJOS.min, talentoMax: AGENTES_LIBRES_BAJOS.max, popMax: AGENTES_LIBRES_BAJOS.popMax } : libre ? { talentoMax: AGENTES_LIBRES_TALENTO.max, popMax: AGENTES_LIBRES_TALENTO.popMax } : {}),
      edad: CICLO_VIDA.edadDebut as [number, number],
    }, usados);
    // Los novatos tienen pocas peleas y poca fama
    p.rec.tot = { v: rng.int(0, 4), d: rng.int(0, 2), e: 0, nc: 0 };
    p.finales = { ko: 0, tko: 0, sub: 0, dec: p.rec.tot.v };
    p.forma = [];
    for (let k = 0; k < p.rec.tot.v + p.rec.tot.d; k++) p.forma.push(k < p.rec.tot.v ? 'V' : 'D');
    p.forma = p.forma.slice(-5);
    p.popularidad = clamp(Math.round(rng.normal(8, 4)), 1, 20);
    if (cfg) {
      p.contrato = contratoSugerido(p, rng.int(3, 8));
    }
    nuevos.push(p);
  }
  return nuevos;
}
