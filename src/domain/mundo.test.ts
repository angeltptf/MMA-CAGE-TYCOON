import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana } from './semana';
import { estrellasCalif, estatus, scoreCalif } from './peleador';
import { ficharLibre, robarPeleador, crearDivision } from './acciones';
import { clonarJuego } from './semana';
import { rankingGlobal } from './rankings';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'normal' as const };

describe('generación del mundo', () => {
  const j = crearMundo(nueva, 12345);

  it('crea 2,250 peleadores (Normal) y 10 compañías rivales', () => {
    expect(j.peleadores.length).toBe(2250);
    expect(j.companias.length).toBe(11);
    expect(j.peleadores.filter(p => p.companiaId === 'mia').length).toBe(0);
    expect(j.peleadores.filter(p => p.companiaId === null).length).toBe(340 + 750);
  });

  it('es determinista con la misma semilla', () => {
    const k = crearMundo(nueva, 12345);
    expect(k.peleadores[10].apellido).toBe(j.peleadores[10].apellido);
  });

  it('valores dentro de rango', () => {
    for (const p of j.peleadores) {
      for (const v of [...Object.values(p.ataque), ...Object.values(p.defensa), ...Object.values(p.fis)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(10);
      }
      expect(p.edad).toBeGreaterThanOrEqual(18);
    }
  });

  it('la UFC tiene mejor calidad que AMC', () => {
    const med = (id: string) => {
      const l = j.peleadores.filter(p => p.companiaId === id);
      return l.reduce((a, p) => a + scoreCalif(p), 0) / l.length;
    };
    expect(med('ufc')).toBeGreaterThan(med('amc') + 1);
  });

  it('distribución de estrellas y estatus razonable', () => {
    const ufc = j.peleadores.filter(p => p.companiaId === 'ufc');
    const est = ufc.map(estrellasCalif);
    const max = Math.max(...est);
    expect(max).toBeGreaterThanOrEqual(4);
    const supers = j.peleadores.filter(p => ['Superestrella', 'Leyenda'].includes(estatus(p))).length;
    expect(supers).toBeGreaterThan(0);
    expect(supers).toBeLessThan(120);
  });

  it('cada división rival tiene campeón y ranking', () => {
    const d = j.divisiones.find(x => x.id === 'ufc:M:ligero')!;
    expect(d.campeonId).not.toBeNull();
    expect(d.ranking.length).toBeGreaterThan(5);
  });
});

describe('semana', () => {
  it('avanzar una semana tarda menos de 1 segundo', () => {
    const j = crearMundo(nueva, 99);
    const t = performance.now();
    const { juego } = avanzarSemana(j);
    const ms = performance.now() - t;
    expect(juego.semanaAbs).toBe(1);
    expect(ms).toBeLessThan(1000);
  });

  it("la población se mantiene estable durante 10 años (retiros + nuevo talento)", { timeout: 60000 }, () => {
    let j = crearMundo(nueva, 7);
    for (let i = 0; i < 520; i++) j = avanzarSemana(j).juego;
    const activos = j.peleadores.filter(p => !p.retirado).length;
    expect(activos).toBeGreaterThan(j.poblacionObjetivo * 0.92);
    expect(activos).toBeLessThan(j.poblacionObjetivo * 1.08);
    expect(j.peleadores.some(p => p.retirado)).toBe(true);
    // nadie supera el tope duro
    for (const p of j.peleadores) {
      for (const v of [...Object.values(p.ataque), ...Object.values(p.defensa)]) expect(v).toBeLessThanOrEqual(15);
    }
  });
});

describe('acciones', () => {
  it('ficha un agente libre y roba a un rival pagando cláusula', () => {
    const j = clonarJuego(crearMundo(nueva, 5));
    crearDivision(j, 'M', 'ligero');
    const libre = j.peleadores.find(p => !p.companiaId && p.genero === 'M')!;
    expect(ficharLibre(j, libre.id)).toBeNull();
    expect(j.peleadores.find(p => p.id === libre.id)!.companiaId).toBe('mia');

    const barato = j.peleadores
      .filter(p => p.companiaId === 'amc' && p.contrato)
      .sort((a, b) => a.contrato!.clausula - b.contrato!.clausula)[0];
    const antes = j.companias.find(c => c.id === 'amc')!.dinero;
    expect(robarPeleador(j, barato.id)).toBeNull();
    expect(j.companias.find(c => c.id === 'amc')!.dinero).toBeGreaterThan(antes);
  });

  it('no deja fichar sin dinero', () => {
    const j = clonarJuego(crearMundo({ ...nueva, dificultad: 'dificil' }, 5));
    j.companias.find(c => c.esMia)!.dinero = 10;
    const libre = j.peleadores.find(p => !p.companiaId)!;
    expect(ficharLibre(j, libre.id)).toContain('No te alcanza');
  });

  it('ranking global ordena por puntaje', () => {
    const j = crearMundo(nueva, 5);
    const r = rankingGlobal(j, 'M', 'p4p');
    expect(r.length).toBe(15);
  });
});
