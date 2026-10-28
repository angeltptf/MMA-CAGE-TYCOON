// Salón de la Fama: los retirados destacados entran solos (ceremonia anual) o por decisión del jugador.
import { MUNDO } from '../config/mundo';
import { anio } from './format';
import { agregarNoticia } from './noticias';
import { nombreCompleto, totalPeleas } from './peleador';
import type { Juego, Peleador } from './types';

export function puntajeSalon(p: Peleador): number {
  const w = MUNDO.salon.pesos;
  return p.rcd.reinados * w.reinado + p.rcd.defensas * w.defensa + (p.popMax >= 75 ? w.popMax75 : p.popMax >= 60 ? w.popMax60 : 0)
    + p.rec.tot.v * w.victoria + (p.finales.ko + p.finales.tko + p.finales.sub) * w.finalizacion + p.rcd.peleadorNoche * w.peleadorNoche;
}

export const merece = (p: Peleador) => p.retirado && !p.salonAnio && totalPeleas(p.rec.tot) >= MUNDO.salon.minPeleas && puntajeSalon(p) >= MUNDO.salon.umbral;

export function ingresarSalon(j: Juego, id: number): string | null {
  const i = j.peleadores.findIndex(p => p.id === id);
  const p = j.peleadores[i];
  if (!p || !p.retirado) return 'Solo los peleadores retirados pueden entrar al Salón de la Fama.';
  if (p.salonAnio) return 'Ya está en el Salón de la Fama.';
  j.peleadores[i] = { ...p, salonAnio: anio(j.semanaAbs) };
  agregarNoticia(j, { categoria: p.rec.mio.v + p.rec.mio.d > 0 ? 'importante' : 'mundo', peleadorId: id, titulo: `${nombreCompleto(p)} ingresa al Salón de la Fama`, cuerpo: `${p.rec.tot.v}-${p.rec.tot.d}-${p.rec.tot.e}${p.rcd.reinados ? `, ${p.rcd.reinados} reinado(s) de campeón` : ''}.` });
  return null;
}

// Ceremonia anual: entran todos los retirados de los últimos años que lo merecen
export function ceremoniaSalon(j: Juego): void {
  const a = anio(j.semanaAbs);
  const nuevos: Peleador[] = [];
  for (let i = 0; i < j.peleadores.length; i++) {
    const p = j.peleadores[i];
    if (!merece(p)) continue;
    if (p.retiroSemana != null && j.semanaAbs - p.retiroSemana > 52 * 6) continue;
    j.peleadores[i] = { ...p, salonAnio: a };
    nuevos.push(j.peleadores[i]);
  }
  if (!nuevos.length) return;
  nuevos.sort((x, y) => puntajeSalon(y) - puntajeSalon(x));
  const mios = nuevos.filter(p => p.rec.mio.v + p.rec.mio.d > 0);
  agregarNoticia(j, {
    categoria: mios.length ? 'importante' : 'mundo', peleadorId: nuevos[0].id,
    titulo: `Salón de la Fama ${a}: ${nuevos.length} nuevo${nuevos.length > 1 ? 's' : ''} miembro${nuevos.length > 1 ? 's' : ''}`,
    cuerpo: nuevos.slice(0, 5).map(nombreCompleto).join(', ') + (mios.length ? `. Entre ellos, de los tuyos: ${mios.map(nombreCompleto).join(', ')}.` : '.'),
  });
}

// Borra a los retirados que no importan: ni son del Salón ni tuvieron relación con tu empresa
export function podarRetirados(j: Juego): void {
  const limite = j.semanaAbs - 52 * MUNDO.retiradosPodaAnios;
  j.peleadores = j.peleadores.filter(p => !(p.retirado && !p.salonAnio && (p.retiroSemana ?? 0) < limite && p.rec.mio.v + p.rec.mio.d + p.rec.mio.e === 0 && p.peleas.length === 0));
}
