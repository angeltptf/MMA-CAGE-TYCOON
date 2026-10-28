// Ofertas de otras compañías por mis peleadores (como el mercado de fichajes del futbol).
// Si no pagan la cláusula de rescisión, yo decido si acepto, rechazo o contraoferto.
import { TRASPASOS } from '../config/balance';
import { dinero } from './format';
import { agregarNoticia } from './noticias';
import { contratoSugerido, nombreCompleto, scoreCalif } from './peleador';
import { recalcularRankings } from './rankings';
import { Rng, clamp } from './rng';
import type { Compania, Juego, OfertaTraspaso, Peleador } from './types';

export function programado(j: Juego, id: number): boolean {
  return j.eventos.some(e => e.estado === 'borrador' && e.cartelera.some(b => b.aId === id || b.bId === id));
}

// Mueve al peleador a la compañía rival y cobra el traspaso
function ejecutarTraspaso(j: Juego, p: Peleador, rival: Compania, monto: number, porClausula: boolean): void {
  const mia = j.companias.find(c => c.esMia)!;
  mia.dinero += monto;
  rival.dinero -= monto;
  const i = j.peleadores.findIndex(x => x.id === p.id);
  const nuevo = { ...p, companiaId: rival.id, enVenta: false, moral: clamp(p.moral + 8, 0, 100) };
  nuevo.contrato = contratoSugerido(nuevo, 6);
  j.peleadores[i] = nuevo;
  for (const o of j.ofertas) if (o.peleadorId === p.id && o.estado === 'pendiente') o.estado = 'expirada';
  agregarNoticia(j, {
    categoria: 'importante', peleadorId: p.id,
    titulo: porClausula
      ? `${rival.nombre} pagó la cláusula de ${nombreCompleto(p)}`
      : `Traspaso cerrado: ${nombreCompleto(p)} se va a ${rival.nombre}`,
    cuerpo: `Recibiste ${dinero(monto)}.`,
  });
  recalcularRankings(j, [j.miId, rival.id]);
}

// Se llama cada semana desde avanzarSemana
export function generarOfertas(j: Juego, rng: Rng): void {
  // vencimientos y limpieza
  for (const o of j.ofertas) if (o.estado === 'pendiente' && o.semanaVence < j.semanaAbs) o.estado = 'expirada';
  j.ofertas = j.ofertas.filter(o => o.estado === 'pendiente' || j.semanaAbs - o.semanaCreada < 26);

  const mios = j.peleadores.filter(p => p.companiaId === j.miId && !p.retirado && p.contrato);
  if (!mios.length) return;
  const rivales = j.companias.filter(c => !c.esMia);
  const media = new Map<string, number>();
  const cuenta = new Map<string, number>();
  for (const p of j.peleadores) {
    if (p.retirado || !p.companiaId || p.companiaId === j.miId) continue;
    media.set(p.companiaId, (media.get(p.companiaId) ?? 0) + scoreCalif(p));
    cuenta.set(p.companiaId, (cuenta.get(p.companiaId) ?? 0) + 1);
  }
  for (const [k, v] of media) media.set(k, v / (cuenta.get(k) ?? 1));

  for (const p of mios) {
    if (p.popularidad < TRASPASOS.minPopularidad) continue;
    const pendientes = j.ofertas.filter(o => o.peleadorId === p.id && o.estado === 'pendiente').length;
    if (pendientes >= 2 || programado(j, p.id)) continue;
    const valor = clamp(0.3 + p.popularidad / 40 + (p.potencial - 2) * 0.15, 0.2, 4);
    const prob = TRASPASOS.probSemanaBase * valor * (p.enVenta ? TRASPASOS.multEnVenta : 1);
    if (!rng.chance(prob)) continue;

    const s = scoreCalif(p);
    const clausula = p.contrato!.clausula;
    const candidatas = rivales.filter(c => c.dinero > clausula * 0.3 && !j.ofertas.some(o => o.peleadorId === p.id && o.companiaId === c.id && o.estado === 'pendiente'));
    if (!candidatas.length) continue;
    const rival = rng.weighted(candidatas, c => {
      const d = s - (media.get(c.id) ?? 5);
      return Math.exp(-(d * d) / (2 * 1.6 * 1.6)) * Math.log10(c.dinero + 10);
    });

    if (clausula > 0 && rival.dinero >= clausula * 2 && rng.chance(TRASPASOS.probPagaClausula)) {
      ejecutarTraspaso(j, p, rival, clausula, true);
      continue;
    }
    const monto = Math.round(clausula * rng.float(TRASPASOS.pctClausulaMin, TRASPASOS.pctClausulaMax));
    if (rival.dinero < monto) continue;
    const maxMonto = Math.min(Math.round(clausula * 0.99), Math.round(monto * rng.float(...TRASPASOS.margenMaxOferta)));
    const oferta: OfertaTraspaso = {
      id: j.sigOferta++, peleadorId: p.id, companiaId: rival.id, monto, maxMonto: Math.max(maxMonto, monto),
      semanaCreada: j.semanaAbs, semanaVence: j.semanaAbs + TRASPASOS.semanasVigencia, estado: 'pendiente',
    };
    j.ofertas.push(oferta);
    agregarNoticia(j, {
      categoria: 'importante', peleadorId: p.id, ofertaId: oferta.id,
      titulo: `${rival.nombre} ofrece ${dinero(monto)} por ${nombreCompleto(p)}`,
      cuerpo: `Su cláusula es ${dinero(clausula)}. Puedes aceptar, rechazar o contraofertar en las próximas ${TRASPASOS.semanasVigencia} semanas.`,
    });
  }
}

function buscar(j: Juego, id: number): { o: OfertaTraspaso; p: Peleador; rival: Compania } | string {
  const o = j.ofertas.find(x => x.id === id);
  if (!o) return 'La oferta ya no existe.';
  if (o.estado !== 'pendiente') return 'Esta oferta ya no está vigente.';
  const p = j.peleadores.find(x => x.id === o.peleadorId);
  const rival = j.companias.find(c => c.id === o.companiaId);
  if (!p || !rival || p.companiaId !== j.miId) { o.estado = 'expirada'; return 'El peleador ya no está en tu empresa.'; }
  return { o, p, rival };
}

export function aceptarOferta(j: Juego, id: number, monto?: number): string | null {
  const r = buscar(j, id);
  if (typeof r === 'string') return r;
  const { o, p, rival } = r;
  if (programado(j, p.id)) return `${p.nombre} tiene una pelea programada: quítalo de la cartelera antes de traspasarlo.`;
  const m = monto ?? o.monto;
  if (rival.dinero < m) { o.estado = 'expirada'; return `${rival.nombre} ya no tiene ese dinero.`; }
  o.estado = 'aceptada';
  ejecutarTraspaso(j, p, rival, m, false);
  return null;
}

export function rechazarOferta(j: Juego, id: number): string | null {
  const r = buscar(j, id);
  if (typeof r === 'string') return r;
  const { o, p } = r;
  o.estado = 'rechazada';
  // si era una oferta jugosa, el peleador se frustra
  if (o.monto >= 0.6 * p.contrato!.clausula) {
    const i = j.peleadores.findIndex(x => x.id === p.id);
    j.peleadores[i] = { ...p, moral: clamp(p.moral - TRASPASOS.moralPierdeAlRechazar, 0, 100) };
  }
  return null;
}

// Pido más dinero. Si está dentro de lo que pagarían, cierran; si no, se retiran.
export function contraofertar(j: Juego, id: number, monto: number): { ok: boolean; mensaje: string } {
  const r = buscar(j, id);
  if (typeof r === 'string') return { ok: false, mensaje: r };
  const { o, rival } = r;
  if (monto <= o.maxMonto) {
    const err = aceptarOferta(j, id, monto);
    return err ? { ok: false, mensaje: err } : { ok: true, mensaje: `${rival.nombre} aceptó tu contraoferta de ${dinero(monto)}.` };
  }
  o.estado = 'rechazada';
  return { ok: false, mensaje: `${rival.nombre} se retiró: pedías demasiado.` };
}
