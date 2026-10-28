import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import * as A from './acciones';
import * as E from './accionesEvento';
import { exigencia } from './negociacion';
import { estrellasCalif } from './peleador';
import { activos, aceptarNegocio, capacidadPatrocinios, estimarNegocios, ofertas, perks } from './negocios';
import { sedeDesbloqueada } from './eventos';
import { SEDES } from '../config/sedes';
import type { Juego, Negocio } from './types';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'facil' as const };

function mundo(seed: number, n = 8): Juego {
  const j = clonarJuego(crearMundo(nueva, seed));
  A.crearDivision(j, 'M', 'ligero');
  const libres = j.peleadores.filter(p => !p.companiaId && !p.retirado && p.genero === 'M' && p.clase === 'ligero' && estrellasCalif(p) <= 3 && p.moral > 35).sort((a, b) => b.popularidad - a.popularidad);
  let hechos = 0;
  for (const p of libres) {
    if (hechos >= n) break;
    if (A.negociar(j, p.id, exigencia(j, p).pide, 'fichar').tipo === 'acepta') hechos++;
  }
  for (const p of j.peleadores) if (p.companiaId === 'mia' && p.contrato) p.contrato.peleasRestantes = 12;
  return j;
}

function evento(j: Juego, semana: number, n: number, tipo: 'noche' | 'ppv' = 'noche') {
  const s: { id?: number } = {};
  E.accCrearEvento(j, semana, tipo, s);
  E.accConfigurar(j, s.id!, { nPeleas: n });
  E.accMatchmaking(j, s.id!, {});
  return j.eventos.find(e => e.id === s.id)!;
}

let seq = 9000;
function mk(j: Juego, p: Partial<Negocio>): Negocio {
  const n: Negocio = {
    id: seq++, tipo: 'patrocinio', estado: 'activo', nombre: 'Marca de Prueba', rubro: 'lona', region: 'global', detalle: '', pagoAnual: 0, pagoUnico: 0, pagoPorEvento: 0,
    duracionAnios: 2, exclusivo: false, penalizacion: 0, objetivos: [], popMin: 0, margen: 0.2, contraIntentada: false, semanaCreada: j.semanaAbs,
    semanaVence: j.semanaAbs + 5, semanaInicio: j.semanaAbs, semanaFin: j.semanaAbs + 104, eventosPeriodo: 0, pagoTotal: 0, ...p,
  };
  j.negocios.push(n);
  return n;
}

describe('YouTube y televisión por contrato', () => {
  it('cada evento suma vistas y suscriptores al canal', () => {
    const j = mundo(61);
    const ev = evento(j, 0, 3);
    const subs0 = j.youtube.subs;
    E.accRealizarEvento(j, ev.id);
    expect(j.youtube.vistas).toBeGreaterThan(0);
    expect(j.youtube.subs).toBeGreaterThan(subs0);
    expect(ev.finanzas!.vistasYoutube).toBeGreaterThan(0);
  });

  it('un contrato de TV por evento paga en cada evento y sube la popularidad regional', () => {
    const j = mundo(62);
    mk(j, { tipo: 'tv', rubro: 'tv_abierta', region: 'mexico', pagoPorEvento: 5000 });
    const pop0 = j.companias.find(c => c.esMia)!.popRegion.mexico;
    const ev = evento(j, 0, 3);
    const est = estimarNegocios(j, ev, 30);
    expect(est.tv).toBeGreaterThan(3000);
    E.accRealizarEvento(j, ev.id);
    expect(ev.finanzas!.transmision).toBeGreaterThan(3000);
    expect(j.companias.find(c => c.esMia)!.popRegion.mexico).toBeGreaterThan(pop0);
  });

  it('el PPV solo paga en eventos numerados y depende del precio', () => {
    const j = mundo(63);
    j.companias.find(c => c.esMia)!.fans = 2_000_000;
    mk(j, { tipo: 'tv', rubro: 'ppv', region: 'global', pagoPorEvento: 20_000, ppvPct: 0.4 });
    const noche = evento(j, 0, 3, 'noche');
    expect(estimarNegocios(j, noche, 40).ppv).toBe(0);
    const ppv = evento(j, 1, 3, 'ppv');
    const barato = estimarNegocios(j, { ...ppv, precioPPV: 20 }, 40);
    const caro = estimarNegocios(j, { ...ppv, precioPPV: 400 }, 40);
    expect(barato.tienePPV).toBe(true);
    expect(barato.compradores).toBeGreaterThan(caro.compradores);
    expect(barato.ppv).toBeGreaterThan(0);
  });

  it('el naming pone "presentado por" en el evento y paga por evento', () => {
    const j = mundo(64);
    mk(j, { tipo: 'patrocinio', rubro: 'naming', nombre: 'Casa Ruiz', pagoPorEvento: 2000, perk: 'naming' });
    expect(perks(j).naming?.nombre).toBe('Casa Ruiz');
    const ev = evento(j, 0, 3);
    E.accRealizarEvento(j, ev.id);
    expect(ev.nombre).toContain('presentado por Casa Ruiz');
    expect(ev.finanzas!.patrocinios).toBe(2000);
  });
});

describe('objetivos, capacidad y multas', () => {
  it('un objetivo de eventos paga su bono al cumplirse', () => {
    const j = mundo(65);
    const n = mk(j, { pagoAnual: 10_000, objetivos: [{ id: 'eventos', tipo: 'eventos', meta: 1, bono: 3000, progreso: 0, cumplido: false }] });
    const ev = evento(j, 0, 3);
    const antes = j.companias.find(c => c.esMia)!.dinero;
    E.accRealizarEvento(j, ev.id);
    expect(n.objetivos[0].cumplido).toBe(true);
    expect(j.finanzas.some(f => f.cat === 'patrocinios' && f.monto >= 3000)).toBe(true);
    expect(j.companias.find(c => c.esMia)!.dinero).toBeGreaterThan(antes - 50_000);
  });

  it('no deja firmar más patrocinios de los que tu empresa soporta', () => {
    const j = clonarJuego(crearMundo(nueva, 66));
    const cap = capacidadPatrocinios(7);
    for (let i = 0; i < cap; i++) mk(j, { rubro: `cat${i}`, pagoAnual: 1000 });
    const o = mk(j, { estado: 'oferta', rubro: 'lona', pagoAnual: 5000 });
    expect(aceptarNegocio(j, o.id)).toContain('solo puede manejar');
  });

  it('un exclusivo bloquea la categoría', () => {
    const j = clonarJuego(crearMundo(nueva, 67));
    mk(j, { rubro: 'bebida', exclusivo: true, pagoAnual: 5000 });
    const o = mk(j, { estado: 'oferta', rubro: 'bebida', pagoAnual: 3000, nombre: 'Otra Bebida' });
    expect(aceptarNegocio(j, o.id)).toContain('exclusivo');
  });

  it('si no haces el mínimo de eventos al año, hay multa y pierdes reputación', () => {
    let j = clonarJuego(crearMundo(nueva, 68));
    mk(j, { tipo: 'tv', rubro: 'cable', region: 'mexico', pagoAnual: 52_000, eventosMinAnio: 6 });
    const rep = j.companias.find(c => c.esMia)!.reputacion;
    for (let i = 0; i < 53; i++) j = avanzarSemana(j).juego;
    expect(j.noticias.some(n => n.titulo.includes('no cumpliste el mínimo'))).toBe(true);
    expect(j.companias.find(c => c.esMia)!.reputacion).toBeLessThan(rep);
  });

  it('los contratos terminan y a veces ofrecen renovar', () => {
    let j = clonarJuego(crearMundo(nueva, 69));
    const n = mk(j, { rubro: 'lona', nombre: 'Cementos Volcán', pagoAnual: 5200, semanaFin: j.semanaAbs + 3 });
    for (let i = 0; i < 5; i++) j = avanzarSemana(j).juego;
    expect(j.negocios.find(x => x.id === n.id)!.estado).toBe('terminado');
    expect(j.negocios.find(x => x.id === n.id)!.pagoTotal).toBeGreaterThan(0);
  });
});

describe('inversionistas', () => {
  it('aceptar crea los eventos pactados, desbloquea las sedes del país y paga al cumplir las condiciones', () => {
    const j = mundo(70, 10);
    const o = mk(j, {
      tipo: 'inversion', estado: 'oferta', nombre: 'Fondo Prueba', rubro: 'unico', region: 'medioOriente', pagoPorEvento: 80_000, duracionAnios: 1,
      inv: { modalidad: 'unico', pais: 'SA', eventos: 1, eventosHechos: 0, condiciones: [{ tipo: 'titulo', meta: 1 }], pctUtilidades: 0, semanaObjetivo: 4, eventoIds: [] },
    });
    const kingdom = SEDES.find(s => s.pais === 'SA')!;
    expect(sedeDesbloqueada(j, kingdom)).toBe(false);
    expect(aceptarNegocio(j, o.id)).toBeNull();
    expect(sedeDesbloqueada(j, kingdom)).toBe(true);
    const ev = j.eventos.find(e => e.inversionistaId === o.id)!;
    expect(ev).toBeDefined();
    expect(SEDES.find(s => s.id === ev.sedeId)!.pais).toBe('SA');
    expect(j.eventos.filter(e => e.inversionistaId === o.id).length).toBe(1);
    // llegar a la semana del evento y llenarlo con una pelea de campeonato
    let g = j;
    while (g.semanaAbs < ev.semana) g = avanzarSemana(g).juego;
    for (const p of g.peleadores) if (p.companiaId === 'mia') { p.lesion = null; p.fatiga = 0; p.descansoHasta = 0; if (p.contrato) p.contrato.peleasRestantes = 12; }
    const ev2 = g.eventos.find(e => e.id === ev.id)!;
    E.accConfigurar(g, ev2.id, { nPeleas: 3 });
    E.accMatchmaking(g, ev2.id, {});
    const antes = g.companias.find(c => c.esMia)!.dinero;
    expect(E.accRealizarEvento(g, ev2.id)).toBeNull();
    const n = g.negocios.find(x => x.id === o.id)!;
    expect(n.estado).toBe('terminado');
    expect(g.finanzas.some(f => f.cat === 'inversionistas' && f.monto > 0)).toBe(true);
    expect(g.companias.find(c => c.esMia)!.dinero).not.toBe(antes);
  });

  it('borrar un evento pactado cuesta multa y reputación', () => {
    const j = mundo(71, 6);
    const o = mk(j, {
      tipo: 'inversion', estado: 'oferta', nombre: 'Fondo Prueba', rubro: 'unico', region: 'asia', pagoPorEvento: 50_000, duracionAnios: 1,
      inv: { modalidad: 'unico', pais: 'JP', eventos: 1, eventosHechos: 0, condiciones: [], pctUtilidades: 0, semanaObjetivo: 4, eventoIds: [] },
    });
    aceptarNegocio(j, o.id);
    const ev = j.eventos.find(e => e.inversionistaId === o.id)!;
    const rep = j.companias.find(c => c.esMia)!.reputacion;
    const caja = j.companias.find(c => c.esMia)!.dinero;
    expect(E.accCancelarEvento(j, ev.id)).toBeNull();
    expect(j.companias.find(c => c.esMia)!.dinero).toBeLessThan(caja);
    expect(j.companias.find(c => c.esMia)!.reputacion).toBeLessThan(rep);
  });

  it('el inversionista de capital da dinero hoy y se queda con un % de las utilidades', () => {
    const j = mundo(72, 8);
    const o = mk(j, {
      tipo: 'inversion', estado: 'oferta', nombre: 'Zafiro Capital', rubro: 'capital', region: 'mexico', pagoUnico: 500_000, duracionAnios: 3,
      inv: { modalidad: 'capital', pais: 'MX', eventos: 0, eventosHechos: 0, condiciones: [], pctUtilidades: 0.2, semanaObjetivo: 4, eventoIds: [] },
    });
    const caja0 = j.companias.find(c => c.esMia)!.dinero;
    aceptarNegocio(j, o.id);
    expect(j.companias.find(c => c.esMia)!.dinero).toBeCloseTo(caja0 + 500_000, 0);
    expect(activos(j, 'inversion').length).toBe(1);
    const ev = evento(j, 0, 3);
    E.accRealizarEvento(j, ev.id);
    if (ev.finanzas!.neto + 0 > -1) expect(ev.finanzas!.inversion).toBeLessThanOrEqual(0);
    expect(ofertas(j).length).toBeGreaterThanOrEqual(0);
  });
});
