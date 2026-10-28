import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { Rng } from './rng';
import { momio, probVictoria, simularPelea } from './motor';
import type { Peleador } from './types';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'normal' as const };

function pares(n: number, seed: number): [Peleador, Peleador][] {
  const j = crearMundo(nueva, seed);
  const rng = new Rng(seed);
  const res: [Peleador, Peleador][] = [];
  const por = new Map<string, Peleador[]>();
  for (const p of j.peleadores) {
    if (p.companiaId !== 'ufc') continue;
    const k = `${p.genero}${p.clase}`;
    por.set(k, [...(por.get(k) ?? []), p]);
  }
  const grupos = [...por.values()].filter(g => g.length >= 2);
  while (res.length < n) {
    const g = rng.pick(grupos);
    const a = rng.pick(g);
    const b = rng.pick(g);
    if (a.id !== b.id) res.push([a, b]);
  }
  return res;
}

describe('motor de pelea', () => {
  const lista = pares(3000, 77);
  const rng = new Rng(5);
  const rs = lista.map(([a, b]) => ({ a, b, r: simularPelea(a, b, 3, rng) }));

  it('distribución de resultados realista', () => {
    const c: Record<string, number> = {};
    for (const x of rs) c[x.r.metodo] = (c[x.r.metodo] ?? 0) + 1;
    const pct = (k: string) => (c[k] ?? 0) / rs.length;
    const finales = pct('KO') + pct('TKO') + pct('SUB');
    const dec = pct('DU') + pct('DD') + pct('DM');
    console.log('métodos', Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v / rs.length * 100).toFixed(1) + '%'])));
    expect(finales).toBeGreaterThan(0.3);
    expect(finales).toBeLessThan(0.7);
    expect(dec).toBeGreaterThan(0.3);
    expect(pct('SUB')).toBeGreaterThan(0.04);
    expect(pct('KO') + pct('TKO')).toBeGreaterThan(0.12);
    expect(pct('E')).toBeLessThan(0.04);
    expect(pct('DQ') + pct('NC')).toBeLessThan(0.02);
  });

  it('el favorito gana más seguido pero hay sorpresas', () => {
    let favGana = 0;
    let n = 0;
    let sorp = 0;
    for (const x of rs) {
      if (x.r.ganadorId == null) continue;
      const p = probVictoria(x.a, x.b);
      if (Math.abs(p - 0.5) < 0.12) continue;
      const fav = p > 0.5 ? x.a : x.b;
      n++;
      if (x.r.ganadorId === fav.id) favGana++; else sorp++;
    }
    const tasa = favGana / n;
    console.log('favorito gana', (tasa * 100).toFixed(1) + '%', 'n', n, 'sorpresas', sorp);
    expect(tasa).toBeGreaterThan(0.58);
    expect(tasa).toBeLessThan(0.9);
    expect(sorp).toBeGreaterThan(20);
  });

  it('coherencia de cada resultado', () => {
    for (const { a, b, r } of rs.slice(0, 1500)) {
      if (r.ganadorId != null) expect([a.id, b.id]).toContain(r.ganadorId);
      expect(r.round).toBeGreaterThanOrEqual(1);
      expect(r.round).toBeLessThanOrEqual(3);
      expect(r.tiempo).toMatch(/^\d:\d\d$/);
      expect(r.narracion.length).toBeGreaterThan(0);
      if (['DU', 'DD', 'DM'].includes(r.metodo)) {
        expect(r.tiempo).toBe('5:00');
        expect(r.round).toBe(3);
      }
    }
  });

  it('5 rounds: más cardio importa y la pelea puede llegar a 5:00', () => {
    const rng5 = new Rng(9);
    const [a, b] = lista[0];
    let largo = 0;
    for (let i = 0; i < 300; i++) {
      const r = simularPelea(a, b, 5, rng5);
      if (r.round === 5) largo++;
    }
    expect(largo).toBeGreaterThan(10);
  });

  it('momios coherentes', () => {
    expect(momio(0.7)).toBeLessThan(0);
    expect(momio(0.3)).toBeGreaterThan(0);
    const [a, b] = lista[1];
    const p = probVictoria(a, b);
    expect(p + probVictoria(b, a)).toBeCloseTo(1, 1);
  });
});
