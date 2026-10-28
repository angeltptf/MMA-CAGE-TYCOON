import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import { activos, aceptarNegocio, contraofertarNegocio, ofertas, pedirPropuestas, popGlobal, romperNegocio, resumenPago } from './negocios';
import { Rng } from './rng';
import type { Dificultad, Juego } from './types';

const nueva = (d: Dificultad) => ({ nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: d });

describe('ofertas iniciales y ciclo', () => {
  it('la partida empieza con ofertas de patrocinio y TV', () => {
    const j = crearMundo(nueva('hardcore'), 5);
    const of = ofertas(j);
    console.log(of.map(o => `${o.tipo}/${o.rubro}/${o.nombre}: ${resumenPago(o)} ${o.duracionAnios}a`));
    expect(of.length).toBeGreaterThanOrEqual(3);
    expect(of.some(o => o.tipo === 'patrocinio')).toBe(true);
    expect(of.some(o => o.tipo === 'tv')).toBe(true);
    expect(j.youtube.subs).toBeGreaterThan(0);
  });
  it('aceptar paga la firma, cobra cada semana y bloquea la categoría si es exclusivo', () => {
    let j = clonarJuego(crearMundo(nueva('normal'), 6));
    const rng = new Rng(1);
    const o = ofertas(j).find(x => x.tipo === 'patrocinio' && x.pagoAnual > 0)!;
    const caja0 = j.companias.find(c => c.esMia)!.dinero;
    expect(aceptarNegocio(j, o.id)).toBeNull();
    expect(activos(j).length).toBe(1);
    expect(j.companias.find(c => c.esMia)!.dinero).toBeGreaterThanOrEqual(caja0 + o.pagoUnico - 1);
    for (let i = 0; i < 10; i++) j = avanzarSemana(j).juego;
    const n = j.negocios.find(x => x.id === o.id)!;
    expect(n.pagoTotal).toBeGreaterThan(o.pagoUnico);
    expect(rng.state).toBeDefined();
  });
  it('contraoferta: dentro del margen sube el pago; solo una vez', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 7));
    const o = ofertas(j)[0];
    const antes = o.pagoAnual || o.pagoPorEvento;
    const r = contraofertarNegocio(j, o.id, o.margen * 0.9, new Rng(3));
    expect(r.ok).toBe(true);
    expect((o.pagoAnual || o.pagoPorEvento)).toBeGreaterThan(antes);
    expect(contraofertarNegocio(j, o.id, 0.05, new Rng(3)).ok).toBe(false);
  });
  it('romper un contrato cuesta dinero y reputación', () => {
    const j = clonarJuego(crearMundo(nueva('facil'), 8));
    const o = ofertas(j).find(x => x.tipo === 'patrocinio')!;
    aceptarNegocio(j, o.id);
    const rep = j.companias.find(c => c.esMia)!.reputacion;
    expect(romperNegocio(j, o.id)).toBeNull();
    expect(j.negocios.find(x => x.id === o.id)!.estado).toBe('roto');
    expect(j.companias.find(c => c.esMia)!.reputacion).toBeLessThan(rep);
  });
  it('pedir propuestas respeta el enfriamiento', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 9));
    const r1 = pedirPropuestas(j, new Rng(1));
    expect(r1.n).toBeGreaterThan(0);
    expect(pedirPropuestas(j, new Rng(2)).error).toContain('semanas');
  });
  it('con el tiempo llegan más ofertas de todo tipo, también de inversionistas', { timeout: 60000 }, () => {
    let j: Juego = clonarJuego(crearMundo(nueva('facil'), 10));
    const vistos = new Set<string>();
    for (let s = 0; s < 400; s++) {
      for (const n of ofertas(j)) vistos.add(n.tipo);
      // subir fama para que lleguen inversionistas
      j.companias.find(c => c.esMia)!.popRegion.mexico = Math.min(80, 6 + s / 4);
      j.companias.find(c => c.esMia)!.reputacion = Math.min(80, 8 + s / 5);
      j = avanzarSemana(j).juego;
    }
    expect(vistos.has('patrocinio')).toBe(true);
    expect(vistos.has('tv')).toBe(true);
    expect(vistos.has('inversion')).toBe(true);
    expect(popGlobal(j)).toBeGreaterThan(30);
  });
});
