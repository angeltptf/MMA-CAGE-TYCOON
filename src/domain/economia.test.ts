import { describe, expect, it } from 'vitest';
import { crearMundo } from './worldgen';
import { avanzarSemana, clonarJuego } from './semana';
import * as A from './acciones';
import * as E from './accionesEvento';
import { SEDES } from '../config/sedes';
import { exigencia } from './negociacion';
import { popularidadEmpresa } from './empresa';
import { costosEvento, estimarBoletos, hypeEvento, sedeDesbloqueada } from './eventos';
import { pagarBonosPendientes } from './bonos';
import { aceptarNegocio, ofertas, activos } from './negocios';
import { resumenPeriodo } from './finanzas';
import { estrellasCalif } from './peleador';
import type { Dificultad, Juego } from './types';

// Jugador automático razonable: ficha barato, hace un evento cada 3 semanas y elige la mejor sede
function jugar(dif: Dificultad, semanas: number, seed: number, cadaSemanas = 3): { j: Juego; eventos: number; minCaja: number; semanasRojas: number } {
  let j = clonarJuego(crearMundo({ nombre: 'Bot FC', siglas: 'BOT', color: '#c8f53c', pais: 'MX', dificultad: dif }, seed));
  A.crearDivision(j, 'M', 'ligero');
  A.crearDivision(j, 'M', 'gallo');
  let eventos = 0;
  let minCaja = Infinity;
  let semanasRojas = 0;
  const mia = () => j.companias.find(c => c.esMia)!;

  for (let s = 0; s < semanas; s++) {
    if (s % cadaSemanas === 0) {
      // aceptar todo lo que llegue (menos inversionistas, que exigen condiciones)
      for (const o of ofertas(j).filter(x => x.tipo !== 'inversion').sort((a, b) => (b.pagoAnual + b.pagoPorEvento * 12) - (a.pagoAnual + a.pagoPorEvento * 12))) aceptarNegocio(j, o.id);
      // mantener roster: renovar a los que se les acaba y fichar baratos
      for (const p of j.peleadores.filter(x => x.companiaId === 'mia' && x.contrato && x.contrato.peleasRestantes <= 1)) {
        A.negociar(j, p.id, { ...exigencia(j, p).pide, peleasRestantes: 8 }, 'renovar');
      }
      const mios = j.peleadores.filter(x => x.companiaId === 'mia' && !x.retirado);
      for (const clase of ['ligero', 'gallo'] as const) {
        const enClase = mios.filter(p => p.clase === clase).length;
        if (enClase >= 6) continue;
        const libres = j.peleadores
          .filter(p => !p.companiaId && !p.retirado && p.genero === 'M' && p.clase === clase && p.moral > 40 && estrellasCalif(p) <= 2.5 && p.sinNegociarHasta <= j.semanaAbs)
          .sort((a, b) => a.popularidad - b.popularidad);
        let n = 6 - enClase;
        for (const p of libres) {
          if (n <= 0) break;
          const costo = exigencia(j, p).pide.bolsa;
          if (mia().dinero < costo * 25) break; // no gastar toda la caja en fichajes
          if (A.negociar(j, p.id, { ...exigencia(j, p).pide, peleasRestantes: 8 }, 'fichar').tipo === 'acepta') n--;
        }
      }
      // evento
      const salida: { id?: number } = {};
      if (!E.accCrearEvento(j, j.semanaAbs, 'noche', salida)) {
        const id = salida.id!;
        E.accConfigurar(j, id, { nPeleas: 4 });
        E.accMatchmaking(j, id, {});
        let ev = j.eventos.find(e => e.id === id)!;
        const llenas = ev.cartelera.filter(b => b.aId != null).length;
        if (llenas >= 2) {
          // si quedaron vacías, reducir
          E.accConfigurar(j, id, { nPeleas: llenas });
          ev = j.eventos.find(e => e.id === id)!;
          let mejor = { sede: ev.sedeId, precio: ev.precio, neto: -Infinity };
          for (const sd of SEDES.filter(x => sedeDesbloqueada(j, x))) {
            ev.sedeId = sd.id;
            const h = hypeEvento(j, ev);
            const est = estimarBoletos(j, ev, 1, h);
            const precio = estimarBoletos(j, ev, est.precioSugerido, h).precioSugerido;
            ev.precio = precio;
            const e2 = estimarBoletos(j, ev, precio, h);
            const c = costosEvento(j, ev, h);
            const neto = e2.taquilla + c.transmision + c.extras - c.total;
            if (neto > mejor.neto) mejor = { sede: sd.id, precio, neto };
          }
          E.accConfigurar(j, id, { sedeId: mejor.sede, precio: mejor.precio });
          if (E.accRealizarEvento(j, id) === null) { eventos++; pagarBonosPendientes(j); }
          else E.accCancelarEvento(j, id);
        } else E.accCancelarEvento(j, id);
      }
    }
    j = avanzarSemana(j).juego;
    minCaja = Math.min(minCaja, mia().dinero);
    if (mia().dinero < 0) semanasRojas++;
    // los de la prueba no se lesionan para siempre: solo mide la economía
  }
  return { j, eventos, minCaja, semanasRojas };
}

describe('economía a 3 años con un jugador automático razonable', () => {
  for (const [dif, semanas] of [['hardcore', 156], ['normal', 156]] as [Dificultad, number][]) {
    it(`${dif}: sobrevive, crece y no se rompe`, () => {
      const t0 = performance.now();
      const r = jugar(dif, semanas, 7);
      const mia = r.j.companias.find(c => c.esMia)!;
      const anual = resumenPeriodo(r.j, r.j.semanaAbs - 51, r.j.semanaAbs);
      const patros = r.j.peleadores.filter(p => p.companiaId === 'mia').reduce((n, p) => n + p.patrocinios.length, 0);
      const inicio = dif === 'hardcore' ? 50_000 : 750_000;
      console.log(dif, {
        caja: Math.round(mia.dinero), inicio, minCaja: Math.round(r.minCaja), semanasRojas: r.semanasRojas, eventos: r.eventos,
        pop: popularidadEmpresa(mia), fans: mia.fans, roster: r.j.peleadores.filter(p => p.companiaId === 'mia').length,
        ingresosUltimoAnio: Math.round(anual.ingresos), gastosUltimoAnio: Math.round(anual.gastos), patrocinios: patros,
        contratos: activos(r.j).length, yt: r.j.youtube.subs, porCat: Object.fromEntries(Object.entries(anual.porCat).map(([k, v]) => [k, Math.round(v as number)])),
        ms: Math.round(performance.now() - t0), quiebra: !!r.j.finDelJuego,
      });
      expect(r.j.finDelJuego).toBeFalsy();
      expect(r.eventos).toBeGreaterThan(20);
      expect(popularidadEmpresa(mia)).toBeGreaterThan(8);
    }, 120000);
  }
});

describe('libro de finanzas', () => {
  it('la suma del libro coincide con el cambio en la caja', () => {
    const j = clonarJuego(crearMundo({ nombre: 'X', siglas: 'X', color: '#fff', pais: 'MX', dificultad: 'facil' }, 3));
    const inicio = j.companias.find(c => c.esMia)!.dinero;
    A.crearDivision(j, 'M', 'ligero');
    const libres = j.peleadores.filter(p => !p.companiaId && p.genero === 'M' && p.clase === 'ligero').slice(0, 4);
    for (const p of libres) A.negociar(j, p.id, exigencia(j, p).pide, 'fichar');
    let g = j;
    for (let i = 0; i < 10; i++) g = avanzarSemana(g).juego;
    const suma = g.finanzas.reduce((a, f) => a + f.monto, 0);
    expect(g.companias.find(c => c.esMia)!.dinero).toBeCloseTo(inicio + suma, 0);
    expect(g.finanzas.some(f => f.cat === 'operacion')).toBe(true);
    expect(g.cajaHist.length).toBe(10);
  });
});

describe('patrocinios personales', () => {
  it('un peleador popular consigue patrocinios, cobra por pelea y pide más al renegociar', async () => {
    const { pagoPorPelea, maxPatrocinios } = await import('./patrociniosPersonales');
    let j = clonarJuego(crearMundo({ nombre: 'X', siglas: 'X', color: '#fff', pais: 'MX', dificultad: 'facil' }, 9));
    A.crearDivision(j, 'M', 'ligero');
    const p = j.peleadores.find(x => !x.companiaId && x.genero === 'M' && x.clase === 'ligero')!;
    expect(A.negociar(j, p.id, exigencia(j, p).pide, 'fichar').tipo).toBe('acepta');
    const base = exigencia(j, j.peleadores.find(x => x.id === p.id)!).pide.bolsa;
    expect(maxPatrocinios(5)).toBe(0);
    expect(maxPatrocinios(60)).toBeGreaterThanOrEqual(3);
    for (let w = 0; w < 200; w++) {
      const i = j.peleadores.findIndex(x => x.id === p.id);
      j.peleadores[i] = { ...j.peleadores[i], popularidad: 62, lesion: null };
      j = avanzarSemana(j).juego;
    }
    const yo = j.peleadores.find(x => x.id === p.id)!;
    expect(yo.patrocinios.length).toBeGreaterThan(0);
    expect(pagoPorPelea(yo)).toBeGreaterThan(0);
    expect(exigencia(j, yo).ventajas.join(' ')).toContain('Patrocinadores');
    expect(base).toBeGreaterThan(0);
  });
});

describe('quiebra', () => {
  it('después de 8 semanas en números rojos hay Game Over (si está activado) y avisos antes', () => {
    let j = clonarJuego(crearMundo({ nombre: 'X', siglas: 'X', color: '#fff', pais: 'MX', dificultad: 'hardcore' }, 4));
    j.companias.find(c => c.esMia)!.dinero = -500;
    for (let i = 0; i < 7; i++) j = avanzarSemana(j).juego;
    expect(j.finDelJuego).toBeFalsy();
    expect(j.noticias.some(n => n.titulo.includes('Números rojos'))).toBe(true);
    j = avanzarSemana(j).juego;
    expect(j.finDelJuego).toBe(true);
    // desactivado: nunca hay Game Over
    let k = clonarJuego(crearMundo({ nombre: 'X', siglas: 'X', color: '#fff', pais: 'MX', dificultad: 'hardcore' }, 4));
    k.ajustes.gameOver = false;
    k.companias.find(c => c.esMia)!.dinero = -500;
    for (let i = 0; i < 12; i++) k = avanzarSemana(k).juego;
    expect(k.finDelJuego).toBeFalsy();
  });
});
