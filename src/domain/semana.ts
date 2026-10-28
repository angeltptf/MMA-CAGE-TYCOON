import { CICLO_VIDA, EMPRESA, PELEADOR, PROGRESION, RANKING_RECALCULO_SEMANAS, SEMANAS_POR_ANIO } from '../config/balance';
import { nombrePais } from '../config/paises';
import { estrellasCalif, nombreCompleto } from './peleador';
import { Rng, clamp } from './rng';
import { recalcularRankings } from './rankings';
import { generarProspectos } from './worldgen';
import type { CategoriaNoticia, Disciplina, Juego, Noticia, Peleador } from './types';
import { semanaDelAnio } from './format';

export function clonarJuego(j: Juego): Juego {
  return {
    ...j,
    companias: j.companias.map(c => ({ ...c, popRegion: { ...c.popRegion } })),
    peleadores: j.peleadores.slice(),
    divisiones: j.divisiones.map(d => ({ ...d, ranking: d.ranking.slice() })),
    noticias: j.noticias.slice(),
    ajustes: { ...j.ajustes },
  };
}

interface NuevaNoticia {
  categoria: CategoriaNoticia;
  titulo: string;
  cuerpo?: string;
  grupo?: string;
  peleadorId?: number;
}

// Agrupa avisos repetidos: si ya hay uno sin leer con el mismo grupo, solo sube el contador.
export function agregarNoticia(j: Juego, n: NuevaNoticia): void {
  if (n.grupo) {
    const i = j.noticias.findIndex(x => x.grupo === n.grupo && !x.leida);
    if (i >= 0) {
      const x = j.noticias[i];
      j.noticias[i] = { ...x, semana: j.semanaAbs, veces: (x.veces ?? 1) + 1 };
      return;
    }
  }
  const nueva: Noticia = { id: j.sigNoticia++, semana: j.semanaAbs, leida: false, ...n };
  j.noticias.unshift(nueva);
  if (j.noticias.length > 400) j.noticias.length = 400;
}

const DISC: Disciplina[] = ['bjj', 'boxeo', 'muayThai', 'lucha'];

function progresar(p: Peleador, rng: Rng): Peleador {
  const calif = estrellasCalif(p);
  const ganaAnual = PROGRESION.ganaAnual(p.edad, p.potencial, calif);
  const dg = ganaAnual / SEMANAS_POR_ANIO;
  const dFis = PROGRESION.declivioFisicoAnual(p.edad) / SEMANAS_POR_ANIO;
  const tope = p.elite ? PELEADOR.topeElite : PELEADOR.tope;
  if (dg === 0 && dFis === 0 && !(p.elite && p.edad >= 24 && p.edad <= 32)) return p;

  const ataque = { ...p.ataque };
  const defensa = { ...p.defensa };
  const fis = { ...p.fis };
  const sube = (v: number, d: number) => {
    let n = v + d * rng.float(0.4, 1.6);
    if (d > 0 && n > 10) n = Math.max(v, 10); // normalmente 10 es el máximo
    return clamp(n, 0.3, tope);
  };
  if (dg !== 0) {
    for (const d of DISC) {
      ataque[d] = sube(ataque[d], dg);
      defensa[d] = sube(defensa[d], dg);
    }
    fis.potencia = sube(fis.potencia, dg * 0.8);
    fis.velocidad = sube(fis.velocidad, dg * 0.6);
    fis.cardio = sube(fis.cardio, dg * 0.8);
    fis.corazon = sube(fis.corazon, dg * 0.5);
  }
  if (dFis > 0) {
    fis.velocidad = clamp(fis.velocidad - dFis, 0.3, tope);
    fis.menton = clamp(fis.menton - dFis * 1.2, 0.3, tope);
    fis.cardio = clamp(fis.cardio - dFis, 0.3, tope);
    fis.agilidad = clamp(fis.agilidad - dFis * 0.8, 0.3, tope);
  }
  // Solo los de élite pueden superar 10, y es muy lento
  if (p.elite && rng.chance(PROGRESION.probEliteSemana)) {
    const d = rng.pick(DISC);
    if (ataque[d] >= 9.9) ataque[d] = Math.min(tope, ataque[d] + 0.1);
    else if (defensa[d] >= 9.9) defensa[d] = Math.min(tope, defensa[d] + 0.1);
  }
  return { ...p, ataque, defensa, fis };
}

export interface ResumenSemana {
  retiros: number;
  nuevos: number;
  lesionadosMios: string[];
}

// Avanza una semana: entrenamiento, recuperación, lesiones, cumpleaños, retiros,
// nuevo talento y rankings. Devuelve un juego nuevo (no muta el original).
export function avanzarSemana(actual: Juego): { juego: Juego; resumen: ResumenSemana } {
  const j = clonarJuego(actual);
  const rng = new Rng(j.rngState);
  j.semanaAbs += 1;
  const semAnio = semanaDelAnio(j.semanaAbs);
  const resumen: ResumenSemana = { retiros: 0, nuevos: 0, lesionadosMios: [] };
  const afectadas = new Set<string>();
  let cambioEstructura = false;

  for (let i = 0; i < j.peleadores.length; i++) {
    const original = j.peleadores[i];
    if (original.retirado) continue;
    let p = progresar(original, rng);
    const mio = p.companiaId === j.miId;
    const cambios: Partial<Peleador> = {};

    // recuperación
    cambios.fatiga = Math.max(0, p.fatiga - PROGRESION.recuperacionFatigaSemana);
    if (!p.lesion) cambios.dano = Math.max(0, p.dano - PROGRESION.recuperacionDanoSemana);
    cambios.moral = p.moral + (65 - p.moral) * 0.02;

    // lesiones
    if (p.lesion) {
      const semanas = p.lesion.semanas - 1;
      if (semanas <= 0) {
        cambios.lesion = null;
        if (mio) agregarNoticia(j, { categoria: 'peleadores', titulo: `${nombreCompleto(p)} se recuperó de su lesión`, peleadorId: p.id });
      } else cambios.lesion = { ...p.lesion, semanas };
    } else if (rng.chance(PROGRESION.lesionSemanaBase * (1 + p.fis.lesiones / 5))) {
      const [a, b] = PROGRESION.lesionDuracion;
      const lesion = { tipo: rng.pick(PROGRESION.tiposLesion), semanas: rng.int(a, b) };
      cambios.lesion = lesion;
      if (mio) {
        resumen.lesionadosMios.push(nombreCompleto(p));
        agregarNoticia(j, {
          categoria: 'importante', peleadorId: p.id,
          titulo: `${nombreCompleto(p)} se lesionó: ${lesion.tipo}`,
          cuerpo: `Estará fuera aproximadamente ${lesion.semanas} semanas.`,
        });
      }
    }

    // cumpleaños y posible retiro
    if (p.cumple === semAnio) {
      const edad = p.edad + 1;
      cambios.edad = edad;
      let retira = false;
      if (edad >= CICLO_VIDA.edadRetiroForzado) retira = true;
      else if (edad >= CICLO_VIDA.edadRetiroDesde) {
        const prob = (edad - CICLO_VIDA.edadRetiroDesde + 1) * CICLO_VIDA.probRetiroPorAnio
          + p.dano * CICLO_VIDA.retiroPorDano + (p.racha.tipo === 'D' && p.racha.n >= 3 ? 0.1 : 0);
        retira = rng.chance(prob);
      }
      if (retira) {
        cambios.retirado = true;
        resumen.retiros++;
        if (p.companiaId) afectadas.add(p.companiaId);
        const notable = p.popularidad >= 45 || mio;
        if (notable) {
          agregarNoticia(j, {
            categoria: mio ? 'importante' : 'mundo', peleadorId: p.id,
            titulo: `Jubilación: ${nombreCompleto(p)}`,
            cuerpo: `${nombrePais(p.pais)}, ${edad} años. Récord final ${p.rec.tot.v}-${p.rec.tot.d}-${p.rec.tot.e}.`,
          });
        }
        cambios.companiaId = null;
        cambios.contrato = null;
        cambioEstructura = true;
      }
    }

    p = { ...p, ...cambios };
    j.peleadores[i] = p;
  }

  // nuevo talento: se cubre una fracción del déficit respecto a la población objetivo
  const activos = j.peleadores.reduce((n, p) => n + (p.retirado ? 0 : 1), 0);
  const deficit = Math.max(0, CICLO_VIDA.poblacionObjetivo - activos);
  const n = clamp(Math.floor(deficit * CICLO_VIDA.controlDeficit + rng.float(0, 1.2)), 0, CICLO_VIDA.maxNuevosPorSemana);
  if (n > 0) {
    const nuevos = generarProspectos(j, rng, n);
    for (const p of nuevos) {
      j.peleadores.push(p);
      if (p.companiaId) afectadas.add(p.companiaId);
      if (p.potencial >= 4.5) {
        agregarNoticia(j, {
          categoria: 'mundo', peleadorId: p.id,
          titulo: `Nuevo talento: ${nombreCompleto(p)} (${nombrePais(p.pais)}, ${p.edad})`,
          cuerpo: 'Los scouts lo señalan como un prospecto con techo de élite.',
        });
      }
    }
    resumen.nuevos = n;
  }

  // rankings: al instante si hubo bajas/altas, y cada cierto número de semanas en general
  if (j.semanaAbs % RANKING_RECALCULO_SEMANAS === 0) recalcularRankings(j);
  else if (cambioEstructura || afectadas.size) recalcularRankings(j, [...afectadas]);

  // finanzas (la economía real llega en fases siguientes)
  const mia = j.companias.find(c => c.esMia)!;
  if (mia.dinero < 0) {
    j.semanasEnNegativo++;
    agregarNoticia(j, {
      categoria: 'negocios', grupo: 'saldo-negativo',
      titulo: 'Tu empresa está en números rojos',
      cuerpo: 'Si el saldo sigue negativo varias semanas, será el fin de tu promotora.',
    });
    if (j.ajustes.gameOver && j.semanasEnNegativo >= EMPRESA.gameOverSemanasNegativo) j.finDelJuego = true;
  } else j.semanasEnNegativo = 0;

  j.rngState = rng.state;
  return { juego: j, resumen };
}
