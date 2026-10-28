import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import * as A from './acciones';
import * as E from './accionesEvento';
import { exigencia } from './negociacion';
import { estaCompleto, estimarBoletos, eventoPendienteHoy, hypeEvento, puedeAvanzarSemana, sedeDesbloqueada } from './eventos';
import { estrellasCalif } from './peleador';
import { SEDES } from '../config/sedes';
import type { ClaseId, Dificultad, Genero, Juego } from './types';

function nueva(d: Dificultad) {
  return { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: d };
}

// Ficha n agentes libres baratos de una división
function armarRoster(j: Juego, g: Genero, clase: ClaseId, n: number, maxEstrellas: number) {
  A.crearDivision(j, g, clase);
  const libres = j.peleadores
    .filter(p => !p.companiaId && !p.retirado && p.genero === g && p.clase === clase && estrellasCalif(p) <= maxEstrellas && p.moral > 35)
    .sort((a, b) => b.popularidad - a.popularidad);
  let hechos = 0;
  for (const p of libres) {
    if (hechos >= n) break;
    const { pide } = exigencia(j, p);
    const r = A.negociar(j, p.id, pide, 'fichar');
    if (r.tipo === 'acepta') hechos++;
  }
  return hechos;
}

describe('flujo de un evento', () => {
  it('crea división, ficha, arma cartelera, simula y cobra', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 31));
    expect(armarRoster(j, 'M', 'ligero', 10, 2.5)).toBeGreaterThanOrEqual(8);
    const salida: { id?: number } = {};
    expect(E.accCrearEvento(j, j.semanaAbs, 'noche', salida)).toBeNull();
    const id = salida.id!;
    expect(E.accConfigurar(j, id, { nPeleas: 4 })).toBeNull();
    const out: { avisos?: string[]; armadas?: number } = {};
    expect(E.accMatchmaking(j, id, out)).toBeNull();
    const ev = j.eventos.find(e => e.id === id)!;
    expect(out.armadas).toBe(4);
    expect(estaCompleto(ev)).toBe(true);
    expect(eventoPendienteHoy(j)?.id).toBe(id);
    expect(puedeAvanzarSemana(j)).toBe(false);
    const antes = j.companias.find(c => c.esMia)!.dinero;
    expect(E.accRealizarEvento(j, id)).toBeNull();
    expect(ev.estado).toBe('realizado');
    expect(ev.cartelera.every(b => !!b.resultado)).toBe(true);
    expect(ev.finanzas).toBeDefined();
    expect(j.companias.find(c => c.esMia)!.dinero).toBeCloseTo(antes + ev.finanzas!.neto, 0);
    // los peleadores quedaron actualizados
    const b = ev.cartelera[0];
    const pa = j.peleadores.find(p => p.id === b.aId)!;
    expect(pa.peleas.length).toBe(1);
    expect(pa.ultimoCombate).toBe(ev.semana);
    expect(pa.descansoHasta).toBeGreaterThan(ev.semana);
    expect(puedeAvanzarSemana(j)).toBe(true);
    const { juego } = avanzarSemana(j);
    expect(juego.semanaAbs).toBe(1);
  });

  it('no deja repetir peleadores ni crear dos eventos la misma semana', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 32));
    armarRoster(j, 'M', 'ligero', 6, 2.5);
    const s: { id?: number } = {};
    expect(E.accCrearEvento(j, 3, 'noche', s)).toBeNull();
    expect(E.accCrearEvento(j, 3, 'ppv', {})).toContain('Ya hay un evento');
    expect(E.accCrearEvento(j, -1, 'ppv', {})).toContain('pasado');
    E.accConfigurar(j, s.id!, { nPeleas: 3 });
    E.accMatchmaking(j, s.id!, {});
    const ev = j.eventos[0];
    const ids = ev.cartelera.flatMap(b => [b.aId, b.bId]).filter(x => x != null);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('avisa si no hay suficientes peleadores', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 33));
    armarRoster(j, 'M', 'ligero', 2, 2.5);
    const s: { id?: number } = {};
    E.accCrearEvento(j, 0, 'noche', s);
    const out: { avisos?: string[]; armadas?: number } = {};
    E.accMatchmaking(j, s.id!, out);
    expect(out.armadas).toBe(1);
    expect(out.avisos!.join(' ')).toContain('Solo se pudieron armar');
    expect(E.accRealizarEvento(j, s.id!)).toContain('incompleta');
  });

  it('las sedes caras están bloqueadas al empezar y las pequeñas no', () => {
    const j = crearMundo(nueva('normal'), 34);
    const libres = SEDES.filter(s => sedeDesbloqueada(j, s));
    expect(libres.length).toBeGreaterThan(5);
    expect(libres.every(s => s.aforo <= 3000)).toBe(true);
    expect(SEDES.find(s => s.nombre.includes('Banorte'))).toBeDefined();
    expect(sedeDesbloqueada(j, SEDES.find(s => s.nombre.includes('Banorte'))!)).toBe(false);
    expect(SEDES.some(s => s.nombre.includes('Colima') || s.ciudad === 'Colima')).toBe(true);
  });

  it('un precio absurdo deja la sede vacía y un precio justo la llena', () => {
    const j = clonarJuego(crearMundo(nueva('normal'), 35));
    armarRoster(j, 'M', 'ligero', 8, 3);
    const s: { id?: number } = {};
    E.accCrearEvento(j, 0, 'noche', s);
    E.accConfigurar(j, s.id!, { nPeleas: 4 });
    E.accMatchmaking(j, s.id!, {});
    const ev = j.eventos[0];
    const barato = estimarBoletos(j, ev, 1);
    const caro = estimarBoletos(j, ev, 5000);
    expect(barato.vendidos).toBeGreaterThan(caro.vendidos);
    expect(caro.vendidos).toBeLessThan(5);
    expect(estimarBoletos(j, ev).vendidos).toBeLessThanOrEqual(estimarBoletos(j, ev).aforo);
  });
});

describe('economía temprana (calibración)', () => {
  for (const d of ['normal', 'hardcore'] as Dificultad[]) {
    it(`un primer evento chico con gente barata no arruina a nadie (${d})`, () => {
      const j = clonarJuego(crearMundo(nueva(d), 41));
      const dinero0 = j.companias.find(c => c.esMia)!.dinero;
      const hechos = armarRoster(j, 'M', 'ligero', 8, 1.5);
      expect(hechos).toBeGreaterThanOrEqual(6);
      const gastoFichajes = dinero0 - j.companias.find(c => c.esMia)!.dinero;
      const s: { id?: number } = {};
      E.accCrearEvento(j, 0, 'noche', s);
      E.accConfigurar(j, s.id!, { nPeleas: 3 });
      E.accMatchmaking(j, s.id!, {});
      const ev = j.eventos[0];
      const hype = hypeEvento(j, ev);
      E.accRealizarEvento(j, s.id!);
      const f = ev.finanzas!;
      console.log(d, { fichajes: Math.round(gastoFichajes), hype, vendidos: f.boletosVendidos, aforo: f.aforo, precio: f.precio, taquilla: f.taquilla, transm: f.transmision, bolsas: f.bolsas, bonos: f.bonosVictoria, prod: f.produccion, renta: f.renta, neto: f.neto, pop: f.popularidad });
      expect(f.neto).toBeGreaterThan(-gastoFichajes * 2 - 20000);
      expect(f.boletosVendidos).toBeGreaterThan(0);
    });
  }
});
