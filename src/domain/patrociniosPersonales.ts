// Patrocinios personales: los peleadores los consiguen solos según su popularidad.
// El patrocinador les paga directamente (no sale de mi caja): suben su moral y su exigencia.
import { PATROCINIO_PERSONAL as C, marcasPorPop } from '../config/patrocinadores';
import { dinero } from './format';
import { agregarNoticia } from './noticias';
import { nombreCompleto } from './peleador';
import { Rng } from './rng';
import type { Juego, Peleador } from './types';

export const maxPatrocinios = (pop: number): number => {
  for (const [min, n] of C.maxPorPop) if (pop >= min) return n;
  return 0;
};

export const pagoAnualPara = (pop: number): number => Math.round(C.pagoAnualBase * Math.exp(C.pagoAnualK * pop));

export const pagoPorPelea = (p: Peleador): number =>
  Math.round(p.patrocinios.reduce((a, s) => a + s.pagoAnual / C.pagosPorAnio, 0));

// Se llama cada semana (solo para mis peleadores)
export function actualizarPatrocinios(j: Juego, rng: Rng): void {
  for (let i = 0; i < j.peleadores.length; i++) {
    const p = j.peleadores[i];
    if (p.companiaId !== j.miId || p.retirado) continue;
    // vencimientos
    let actuales = p.patrocinios;
    if (actuales.some(s => s.semanaFin <= j.semanaAbs)) {
      const vencidos = actuales.filter(s => s.semanaFin <= j.semanaAbs);
      actuales = actuales.filter(s => s.semanaFin > j.semanaAbs);
      for (const s of vencidos) {
        agregarNoticia(j, { categoria: 'peleadores', peleadorId: p.id, titulo: `${s.marca} termina su patrocinio con ${nombreCompleto(p)}` });
      }
    }
    // pierde a los patrocinadores si se vuelve poco popular
    const tope = p.contrato?.exclusividad ? Math.min(1, maxPatrocinios(p.popularidad)) : maxPatrocinios(p.popularidad);
    if (p.popularidad >= C.popMin && actuales.length < tope) {
      const prob = C.probSemanaBase * Math.pow(p.popularidad / 25, 1.5);
      if (rng.chance(prob)) {
        const marca = rng.pick(marcasPorPop(p.popularidad).filter(m => !actuales.some(a => a.marca === m.marca)));
        if (marca) {
          const anios = rng.int(C.duracionAnios[0], C.duracionAnios[1]);
          const pagoAnual = Math.round(pagoAnualPara(p.popularidad) * rng.float(0.8, 1.25));
          actuales = [...actuales, { marca: marca.marca, categoria: marca.categoria, pagoAnual, semanaFin: j.semanaAbs + 52 * anios }];
          j.peleadores[i] = { ...p, patrocinios: actuales, moral: Math.min(100, p.moral + C.moralAlFirmar) };
          agregarNoticia(j, {
            categoria: 'peleadores', peleadorId: p.id,
            titulo: `${marca.marca} patrocina a ${nombreCompleto(p)}`,
            cuerpo: `${marca.categoria}. ${dinero(pagoAnual)} al año por ${anios} año${anios > 1 ? 's' : ''}. Lo sabrá valorar al renegociar su contrato.`,
          });
          continue;
        }
      }
    }
    if (actuales !== p.patrocinios) j.peleadores[i] = { ...p, patrocinios: actuales };
  }
}
