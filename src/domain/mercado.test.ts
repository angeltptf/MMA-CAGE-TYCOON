import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import * as A from './acciones';
import { estrellasCalif } from './peleador';
import { evaluarOferta, exigencia } from './negociacion';
import type { Contrato, Juego } from './types';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'normal' as const };

describe('dificultades y población', () => {
  it('hardcore: $50K, ~3,000 peleadores y muchos de 0-1 estrellas', () => {
    const j = crearMundo({ ...nueva, dificultad: 'hardcore' }, 3);
    expect(j.companias.find(c => c.esMia)!.dinero).toBe(50_000);
    expect(j.peleadores.length).toBe(3000);
    const bajos = j.peleadores.filter(p => !p.companiaId && estrellasCalif(p) <= 1).length;
    expect(bajos).toBeGreaterThan(900);
  });
  it('cada dificultad crea más gente que la anterior', () => {
    const n = (d: 'facil' | 'normal' | 'dificil' | 'hardcore') => crearMundo({ ...nueva, dificultad: d }, 1).peleadores.length;
    expect([n('facil'), n('normal'), n('dificil'), n('hardcore')]).toEqual([2000, 2250, 2500, 3000]);
  });
  it('los más baratos cuestan casi nada con 50K', () => {
    const j = crearMundo({ ...nueva, dificultad: 'hardcore' }, 3);
    const bajos = j.peleadores.filter(p => !p.companiaId && estrellasCalif(p) <= 1);
    const baratos = bajos.map(p => exigencia(j, p).pide.bolsa).sort((a, b) => a - b);
    expect(baratos[0]).toBeLessThan(1000);
  });
});

function sinOfendidos(j: Juego) {
  return j.peleadores.find(p => !p.companiaId && p.sinNegociarHasta === 0 && p.moral > 40 && p.moral < 80 && p.popularidad < 30)!;
}

describe('negociación', () => {
  const j = crearMundo(nueva, 11);
  it('acepta lo que pide', () => {
    const p = sinOfendidos(j);
    const { pide } = exigencia(j, p);
    expect(evaluarOferta(j, p, pide).tipo).toBe('acepta');
  });
  it('rechaza y se ofende con una oferta ridícula', () => {
    const p = sinOfendidos(j);
    const { pide } = exigencia(j, p);
    const mala: Contrato = { ...pide, bolsa: Math.round(pide.bolsa * 0.2), bonoVictoria: 0, bonoCampeonato: 0 };
    const r = evaluarOferta(j, p, mala);
    expect(r.tipo).toBe('rechaza');
  });
  it('contraoferta cuando está algo por debajo', () => {
    const p = sinOfendidos(j);
    const { pide } = exigencia(j, p);
    const r = evaluarOferta(j, p, { ...pide, bolsa: Math.round(pide.bolsa * 0.8), bonoVictoria: Math.round(pide.bonoVictoria * 0.8) });
    expect(['contraoferta', 'acepta']).toContain(r.tipo);
  });
  it('una cláusula más baja y más dinero lo convencen; una cláusula altísima cuesta', () => {
    const p = sinOfendidos(j);
    const { pide } = exigencia(j, p);
    const sinClausula = evaluarOferta(j, p, { ...pide, bolsa: Math.round(pide.bolsa * 0.95), clausula: Math.round(pide.clausula * 0.3) });
    const blindado = evaluarOferta(j, p, { ...pide, bolsa: Math.round(pide.bolsa * 0.95), clausula: Math.round(pide.clausula * 5) });
    const rank = (t: string) => ['rechaza', 'contraoferta', 'acepta'].indexOf(t);
    expect(rank(sinClausula.tipo)).toBeGreaterThanOrEqual(rank(blindado.tipo));
  });
  it('al ofenderlo no negocia durante unas semanas', () => {
    const k = clonarJuego(j);
    const p = sinOfendidos(k);
    const { pide } = exigencia(k, p);
    const r = A.negociar(k, p.id, { ...pide, bolsa: 100, bonoVictoria: 0, bonoCampeonato: 0 }, 'fichar');
    expect(r.tipo).toBe('rechaza');
    expect(k.peleadores.find(x => x.id === p.id)!.sinNegociarHasta).toBeGreaterThan(k.semanaAbs);
    expect(A.negociar(k, p.id, pide, 'fichar').tipo).toBe('rechaza');
  });
  it('firma el contrato si acepta y cobra el bono', () => {
    const k = clonarJuego(j);
    const p = sinOfendidos(k);
    const { pide } = exigencia(k, p);
    const antes = k.companias.find(c => c.esMia)!.dinero;
    const r = A.negociar(k, p.id, pide, 'fichar');
    expect(r.tipo).toBe('acepta');
    expect(k.peleadores.find(x => x.id === p.id)!.companiaId).toBe('mia');
    expect(k.companias.find(c => c.esMia)!.dinero).toBeLessThan(antes);
  });
});

describe('ofertas de rivales', () => {
  it('llegan ofertas por un peleador popular en venta y se pueden aceptar', () => {
    let j = clonarJuego(crearMundo({ ...nueva, dificultad: 'facil' }, 21));
    j.companias.find(c => c.esMia)!.dinero = 50_000_000;
    const top = j.peleadores.filter(p => p.companiaId === 'lfa').sort((a, b) => b.popularidad - a.popularidad)[0];
    expect(A.robarPeleador(j, top.id)).toBeNull();
    A.alternarEnVenta(j, top.id);
    let oferta = null as null | number;
    for (let i = 0; i < 260 && oferta == null; i++) {
      j = avanzarSemana(j).juego;
      oferta = j.ofertas.find(o => o.estado === 'pendiente' && o.peleadorId === top.id)?.id ?? null;
      if (j.peleadores.find(p => p.id === top.id)!.companiaId !== 'mia') break; // pagaron la cláusula
    }
    const sigue = j.peleadores.find(p => p.id === top.id)!;
    if (sigue.companiaId === 'mia') {
      expect(oferta).not.toBeNull();
      const antes = j.companias.find(c => c.esMia)!.dinero;
      expect(A.aceptarOferta(j, oferta!)).toBeNull();
      expect(j.peleadores.find(p => p.id === top.id)!.companiaId).not.toBe('mia');
      expect(j.companias.find(c => c.esMia)!.dinero).toBeGreaterThan(antes);
    } else {
      expect(j.noticias.some(n => n.titulo.includes('cláusula') || n.titulo.includes('Traspaso'))).toBe(true);
    }
  }, 60000);
  it('una contraoferta absurda hace que se retiren', () => {
    let j = clonarJuego(crearMundo({ ...nueva, dificultad: 'facil' }, 22));
    j.companias.find(c => c.esMia)!.dinero = 50_000_000;
    const top = j.peleadores.filter(p => p.companiaId === 'lfa').sort((a, b) => b.popularidad - a.popularidad)[0];
    A.robarPeleador(j, top.id);
    A.alternarEnVenta(j, top.id);
    for (let i = 0; i < 300; i++) {
      j = avanzarSemana(j).juego;
      const o = j.ofertas.find(x => x.estado === 'pendiente' && x.peleadorId === top.id);
      if (o) {
        const r = A.contraofertar(j, o.id, o.maxMonto * 5);
        expect(r.ok).toBe(false);
        return;
      }
    }
  }, 60000);
});
