import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import * as A from './acciones';
import * as E from './accionesEvento';
import { exigencia } from './negociacion';
import { estrellasCalif } from './peleador';
import { pagarBonos, sugerirBonos } from './bonos';
import { crearTorneo, etiquetaPartido, llenarAuto, programarRonda, sortear, setCupo } from './torneos';
import { Rng } from './rng';
import { puedeAvanzarSemana, validarPelea } from './eventos';
import type { ClaseId, Genero, Juego } from './types';

const nueva = { nombre: 'Prueba FC', siglas: 'PFC', color: '#C8F53C', pais: 'MX', dificultad: 'facil' as const };

function mundo(seed: number, n: number, clase: ClaseId = 'ligero', g: Genero = 'M'): Juego {
  const j = clonarJuego(crearMundo(nueva, seed));
  A.crearDivision(j, g, clase);
  const libres = j.peleadores
    .filter(p => !p.companiaId && !p.retirado && p.genero === g && p.clase === clase && estrellasCalif(p) <= 3 && p.moral > 35)
    .sort((a, b) => b.popularidad - a.popularidad);
  let hechos = 0;
  for (const p of libres) {
    if (hechos >= n) break;
    if (A.negociar(j, p.id, exigencia(j, p).pide, 'fichar').tipo === 'acepta') hechos++;
  }
  // contratos largos para no quedarse sin peleas
  for (const p of j.peleadores) if (p.companiaId === 'mia' && p.contrato) p.contrato.peleasRestantes = 12;
  return j;
}

function evento(j: Juego, semana: number, n: number) {
  const s: { id?: number } = {};
  E.accCrearEvento(j, semana, 'noche', s);
  E.accConfigurar(j, s.id!, { nPeleas: n });
  E.accMatchmaking(j, s.id!, {});
  return j.eventos.find(e => e.id === s.id)!;
}

describe('bonos de la noche', () => {
  it('sugiere, paga y actualiza finanzas y peleadores', () => {
    const j = mundo(51, 8);
    const ev = evento(j, 0, 4);
    expect(E.accRealizarEvento(j, ev.id)).toBeNull();
    expect(ev.bonos?.pagado).toBe(false);
    const sug = sugerirBonos(j, ev);
    expect(sug.peleadorNoche).not.toBeNull();
    const antes = j.companias.find(c => c.esMia)!.dinero;
    const neto0 = ev.finanzas!.neto;
    expect(pagarBonos(j, ev.id, sug)).toBeNull();
    expect(ev.bonos!.pagado).toBe(true);
    expect(ev.finanzas!.bonosNoche).toBeGreaterThan(0);
    expect(ev.finanzas!.neto).toBe(neto0 - ev.finanzas!.bonosNoche);
    expect(j.companias.find(c => c.esMia)!.dinero).toBeLessThan(antes);
    const pn = j.peleadores.find(p => p.id === sug.peleadorNoche)!;
    expect(pn.rcd.peleadorNoche).toBe(1);
    expect(pagarBonos(j, ev.id, sug)).toContain('ya se pagaron');
  });
  it('se pagan solos si no los eliges al avanzar la semana', () => {
    const j = mundo(52, 8);
    const ev = evento(j, 0, 4);
    E.accRealizarEvento(j, ev.id);
    const { juego } = avanzarSemana(j);
    expect(juego.eventos[0].bonos!.pagado).toBe(true);
  });
});

describe('ranking por resultados y campeonatos', () => {
  it('ganar sube puntos y guarda el lugar previo para las flechas', () => {
    const j = mundo(53, 8);
    const ev = evento(j, 0, 4);
    E.accRealizarEvento(j, ev.id);
    const ganadores = ev.cartelera.map(b => j.peleadores.find(p => p.id === b.resultado!.ganadorId)).filter(Boolean);
    expect(ganadores.length).toBeGreaterThan(0);
    for (const g of ganadores) expect(g!.rankPts).toBeGreaterThan(0);
    const div = j.divisiones.find(d => d.id === 'mia:M:ligero')!;
    expect(div.previo).toBeDefined();
  });

  it('el título vacante lo gana el ganador y quedan reinados registrados', () => {
    let j = mundo(54, 6);
    let titulos = 0;
    for (let sem = 0; sem < 40 && titulos < 4; sem++) {
      const s: { id?: number } = {};
      E.accCrearEvento(j, j.semanaAbs, 'noche', s);
      E.accConfigurar(j, s.id!, { nPeleas: 2 });
      E.accMatchmaking(j, s.id!, {});
      const ev = j.eventos.find(e => e.id === s.id)!;
      if (ev.cartelera.every(b => b.aId != null)) {
        E.accRealizarEvento(j, ev.id);
        titulos += ev.cartelera.filter(b => b.titulo).length;
      } else E.accCancelarEvento(j, ev.id);
      for (let w = 0; w < 4; w++) j = avanzarSemana(j).juego;
      for (const p of j.peleadores) if (p.companiaId === 'mia' && p.contrato) { p.contrato.peleasRestantes = 12; p.lesion = null; }
    }
    const div = j.divisiones.find(d => d.id === 'mia:M:ligero')!;
    expect(div.campeonId).not.toBeNull();
    const camp = j.peleadores.find(p => p.id === div.campeonId)!;
    expect(camp.rcd.reinados).toBeGreaterThanOrEqual(1);
    expect(camp.rcd.edadPrimerTitulo).not.toBeNull();
  }, 60000);

  it('validaciones: el interino solo se crea si el campeón va a estar fuera mucho tiempo', () => {
    const j = mundo(55, 8);
    const div = j.divisiones.find(d => d.id === 'mia:M:ligero')!;
    const lista = j.peleadores.filter(p => p.companiaId === 'mia');
    div.campeonId = lista[0].id;
    const ev = evento(j, 0, 2);
    const b = ev.cartelera[0];
    const [x, y] = lista.slice(1, 3);
    const bi = { ...b, aId: x.id, bId: y.id, titulo: true, interino: true };
    expect(validarPelea(j, ev, bi, x, y).errores.join(' ')).toContain('interino');
    lista[0].lesion = { tipo: 'Rodilla', semanas: 20 };
    expect(validarPelea(j, ev, bi, x, y).errores.filter(m => m.includes('interino'))).toHaveLength(0);
  });
});

describe('eliminar evento', () => {
  it('quita el evento del calendario y permite avanzar', () => {
    const j = mundo(56, 6);
    const ev = evento(j, 0, 2);
    expect(puedeAvanzarSemana(j)).toBe(false);
    expect(E.accCancelarEvento(j, ev.id)).toBeNull();
    expect(j.eventos.find(e => e.id === ev.id)).toBeUndefined();
    expect(puedeAvanzarSemana(j)).toBe(true);
  });
});

describe('torneos', () => {
  it('etiquetas de llave', () => {
    expect(etiquetaPartido(8, 0, 0)).toBe('Cuartos A1');
    expect(etiquetaPartido(8, 0, 3)).toBe('Cuartos B2');
    expect(etiquetaPartido(8, 1, 1)).toBe('Semifinal B');
    expect(etiquetaPartido(8, 2, 0)).toBe('Final');
    expect(etiquetaPartido(16, 0, 5)).toBe('Octavos B2');
  });

  it('vieja escuela de 8: un evento, ganador campeón del torneo y del título', () => {
    const j = mundo(57, 10);
    const r = crearTorneo(j, { nombre: 'Copa Prueba', genero: 'M', clase: 'ligero', tam: 8, tipo: 'vieja', sorteoAuto: true, otorgaTitulo: true });
    const t = j.torneos[0];
    expect(r.id).toBe(t.id);
    expect(llenarAuto(j, t.id)).toBeNull();
    expect(sortear(j, t.id, new Rng(1))).toBeNull();
    expect(t.rondas.length).toBe(3);
    const p = programarRonda(j, t.id, 0, j.semanaAbs);
    expect(p.error).toBeUndefined();
    const ev = j.eventos.find(e => e.id === p.id)!;
    expect(ev.cartelera.length).toBe(7);
    expect(ev.tipo).toBe('torneo');
    expect(puedeAvanzarSemana(j)).toBe(false);
    expect(E.accRealizarEvento(j, ev.id)).toBeNull();
    expect(t.estado).toBe('terminado');
    expect(t.campeonId).toBeDefined();
    expect(ev.cartelera.every(b => !!b.resultado)).toBe(true);
    expect(ev.finanzas!.premios).toBeGreaterThan(0);
    const div = j.divisiones.find(d => d.id === 'mia:M:ligero')!;
    expect(div.campeonId).toBe(t.campeonId);
    const final = ev.cartelera[6];
    expect([final.aId, final.bId]).toContain(t.campeonId);
  });

  it('moderno de 4: una ronda por evento en semanas distintas', () => {
    let j = mundo(58, 6);
    crearTorneo(j, { nombre: 'Copa Moderna', genero: 'M', clase: 'ligero', tam: 4, tipo: 'moderna', sorteoAuto: false, otorgaTitulo: false });
    const t = j.torneos[0];
    llenarAuto(j, t.id);
    sortear(j, t.id, new Rng(2));
    expect(programarRonda(j, t.id, 1, 3).error).toContain('anterior');
    const p0 = programarRonda(j, t.id, 0, j.semanaAbs);
    expect(p0.error).toBeUndefined();
    expect(j.eventos.find(e => e.id === p0.id)!.cartelera.length).toBe(2);
    E.accRealizarEvento(j, p0.id!);
    for (let w = 0; w < 9; w++) j = avanzarSemana(j).juego;
    for (const p of j.peleadores) if (p.companiaId === 'mia') { p.lesion = null; p.fatiga = 0; p.descansoHasta = 0; if (p.contrato) p.contrato.peleasRestantes = 12; }
    const t2 = j.torneos[0];
    expect(t2.rondas[1][0].aId).not.toBeNull();
    expect(t2.rondas[1][0].bId).not.toBeNull();
    const p1 = programarRonda(j, t2.id, 1, j.semanaAbs);
    expect(p1.error).toBeUndefined();
    E.accRealizarEvento(j, p1.id!);
    expect(j.torneos[0].estado).toBe('terminado');
    expect(j.torneos[0].campeonId).toBeDefined();
  });

  it('no deja sortear con lugares vacíos ni usar peleadores ajenos', () => {
    const j = mundo(59, 4);
    crearTorneo(j, { nombre: 'Copa', genero: 'M', clase: 'ligero', tam: 8, tipo: 'vieja', sorteoAuto: true, otorgaTitulo: false });
    const t = j.torneos[0];
    expect(sortear(j, t.id, new Rng(1))).toContain('Llena');
    const ajeno = j.peleadores.find(p => p.companiaId === 'ufc')!;
    expect(setCupo(j, t.id, 0, ajeno.id)).toContain('no puede participar');
    expect(crearTorneo(j, { nombre: 'X', genero: 'F', clase: 'paja', tam: 4, tipo: 'vieja', sorteoAuto: true, otorgaTitulo: false }).error).toContain('división');
  });
});
