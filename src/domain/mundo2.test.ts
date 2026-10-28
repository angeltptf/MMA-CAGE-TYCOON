import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import { ordenCompanias, puntajesCompanias } from './empresa';
import { calcularRegistros } from './registros';
import { ingresarSalon, merece, puntajeSalon } from './salon';
import { entregarPremios } from './premios';
import * as A from './acciones';
import * as E from './accionesEvento';
import { exigencia } from './negociacion';
import { estrellasCalif } from './peleador';
import type { Juego } from './types';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'normal' as const };

function correr(j: Juego, semanas: number): { j: Juego; ms: number } {
  const t0 = performance.now();
  for (let i = 0; i < semanas; i++) j = avanzarSemana(j).juego;
  return { j, ms: (performance.now() - t0) / semanas };
}

describe('compañías rivales vivas', () => {
  it('estrellas iniciales coherentes con la configuración', () => {
    const j = crearMundo(nueva, 1);
    const tiers = Object.fromEntries(j.companias.map(c => [c.id, c.tier]));
    console.log('tiers iniciales', tiers, [...puntajesCompanias(j).entries()].map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' '));
    expect(tiers.ufc).toBeGreaterThanOrEqual(4);
    expect(tiers.ufc).toBeGreaterThanOrEqual(tiers.one);
    expect(tiers.amc).toBeLessThanOrEqual(3);
    expect(tiers.mia).toBe(1);
  });

  it('en un año organizan eventos, pelean, firman y cambian los rankings', () => {
    const j0 = crearMundo(nueva, 2);
    const campeones0 = Object.fromEntries(j0.divisiones.map(d => [d.id, d.campeonId]));
    const { j, ms } = correr(clonarJuego(j0), 52);
    const porCia = (id: string) => j.eventosRivales.filter(e => e.companiaId === id).length;
    console.log('ms por semana', ms.toFixed(1), 'ufc', porCia('ufc'), 'one', porCia('one'), 'amc', porCia('amc'), 'lfa', porCia('lfa'),
      'libres', j.peleadores.filter(p => !p.retirado && !p.companiaId).length, 'activos', j.peleadores.filter(p => !p.retirado).length);
    expect(ms).toBeLessThan(500);
    expect(porCia('ufc')).toBeGreaterThan(25);
    expect(porCia('amc')).toBeGreaterThan(8);
    const cambios = j.divisiones.filter(d => d.companiaId !== 'mia' && campeones0[d.id] !== d.campeonId).length;
    expect(cambios).toBeGreaterThan(3);
    expect(j.noticias.filter(n => n.categoria === 'mundo').length).toBeGreaterThan(10);
    expect(j.peleadores.some(p => p.rec.tot.v + p.rec.tot.d > 0 && p.ultimoCombate != null)).toBe(true);
    // el mundo sigue vivo: se mantiene la población
    const activos = j.peleadores.filter(p => !p.retirado).length;
    expect(activos).toBeGreaterThan(j.poblacionObjetivo * 0.9);
    // hubo premios al terminar el año (semana 52 -> 53)
    const k = correr(j, 2).j;
    expect(k.premios.length).toBeGreaterThanOrEqual(3);
  }, 120000);

  it('UFC sigue arriba tras años y la tabla de compañías cambia con el tiempo', () => {
    const { j } = correr(clonarJuego(crearMundo(nueva, 3)), 52 * 3);
    const orden = ordenCompanias(j);
    console.log('orden', orden.map(c => `${c.id}:${c.tier}`).join(' '), 'hist', j.companias[1].hist.length);
    expect(orden[0].id).toBe('ufc');
    expect(j.companias.find(c => c.id === 'ufc')!.hist.length).toBeGreaterThan(5);
    expect(j.companias.find(c => c.id === 'ufc')!.nEventos).toBeGreaterThan(80);
  }, 120000);

  it('mis agentes libres liberados pueden ser fichados por rivales', () => {
    let j = clonarJuego(crearMundo(nueva, 4));
    A.crearDivision(j, 'M', 'ligero');
    const libres = j.peleadores.filter(p => !p.companiaId && p.genero === 'M' && p.clase === 'ligero' && estrellasCalif(p) >= 1.5).slice(0, 6);
    for (const p of libres) A.negociar(j, p.id, exigencia(j, p).pide, 'fichar');
    for (const p of j.peleadores) if (p.companiaId === 'mia' && p.contrato) A.rescindirContrato(j, p.id);
    j.companias.find(c => c.esMia)!.dinero = 1e9;
    j = correr(j, 60).j;
    const firmados = libres.filter(p => j.peleadores.find(x => x.id === p.id)!.companiaId);
    expect(firmados.length).toBeGreaterThan(0);
  }, 120000);
});

describe('Salón de la Fama, premios y registros', () => {
  it('con los años entran peleadores al Salón y la plantilla se mantiene', () => {
    const { j, ms } = correr(clonarJuego(crearMundo(nueva, 5)), 52 * 9);
    const dentro = j.peleadores.filter(p => p.salonAnio);
    console.log('salón', dentro.length, 'retirados', j.peleadores.filter(p => p.retirado).length, 'total', j.peleadores.length, 'ms/sem', ms.toFixed(1), 'premios', j.premios.length);
    expect(dentro.length).toBeGreaterThan(0);
    expect(j.premios.length).toBeGreaterThanOrEqual(8 * 3);
    expect(j.peleadores.length).toBeLessThan(j.poblacionObjetivo * 2.2);
    for (const p of dentro) expect(p.retirado).toBe(true);
  }, 300000);

  it('puedo meter a mano a un retirado mío al Salón', () => {
    const j = clonarJuego(crearMundo(nueva, 6));
    const p = j.peleadores.find(x => !x.retirado && x.companiaId === 'ufc')!;
    expect(ingresarSalon(j, p.id)).toContain('retirados');
    A.retirarPeleador(j, p.id);
    expect(ingresarSalon(j, p.id)).toBeNull();
    expect(j.peleadores.find(x => x.id === p.id)!.salonAnio).toBeDefined();
    expect(ingresarSalon(j, p.id)).toContain('Ya está');
    expect(puntajeSalon(p)).toBeGreaterThanOrEqual(0);
    expect(merece(p)).toBe(false);
  });

  it('entregarPremios genera ganadores y reinicia los contadores', () => {
    const { j } = correr(clonarJuego(crearMundo(nueva, 7)), 40);
    const antes = j.premios.length;
    entregarPremios(j, 1);
    expect(j.premios.length).toBeGreaterThan(antes);
    expect(j.candidatosPremios.ko.length).toBe(0);
    expect(j.peleadores.every(p => p.anioStats.v === 0)).toBe(true);
  }, 60000);

  it('los registros de mi empresa se calculan tras un evento', () => {
    const j = clonarJuego(crearMundo(nueva, 8));
    A.crearDivision(j, 'M', 'ligero');
    const libres = j.peleadores.filter(p => !p.companiaId && p.genero === 'M' && p.clase === 'ligero' && estrellasCalif(p) <= 3).slice(0, 8);
    for (const p of libres) A.negociar(j, p.id, exigencia(j, p).pide, 'fichar');
    const s: { id?: number } = {};
    E.accCrearEvento(j, 0, 'noche', s);
    E.accConfigurar(j, s.id!, { nPeleas: 3 });
    E.accMatchmaking(j, s.id!, {});
    E.accRealizarEvento(j, s.id!);
    const r = calcularRegistros(j);
    expect(r.some(x => x.titulo === 'Eventos realizados' && x.valor === '1')).toBe(true);
    expect(r.some(x => x.titulo.includes('taquilla'))).toBe(true);
  });
});
