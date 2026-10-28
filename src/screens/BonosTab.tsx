import { useMemo, useState } from 'react';
import { montosBonos } from '../domain/bonos';
import { dinero } from '../domain/format';
import { nombreCompleto } from '../domain/peleador';
import type { BonosNoche, Evento } from '../domain/types';
import { bonosNoche, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Vacio } from '../ui/kit';
import { etiquetaBout, txtMetodo } from './BoutCard';

export function BonosTab({ e }: { e: Evento }) {
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const inicial: BonosNoche = e.bonos ?? { peleadorNoche: null, peleaNoche: null, actuaciones: [], pagado: true, total: 0 };
  const [sel, setSel] = useState({ peleadorNoche: inicial.peleadorNoche, peleaNoche: inicial.peleaNoche, actuaciones: inicial.actuaciones });
  const pagado = inicial.pagado;

  const jugadas = e.cartelera.filter(b => b.resultado && b.resultado.ganadorId != null && b.resultado.metodo !== 'DQ');
  const ganadores = useMemo(
    () => jugadas.map(b => ({ b, p: juego.peleadores.find(x => x.id === b.resultado!.ganadorId)! })).filter(x => x.p),
    [jugadas, juego.peleadores],
  );
  const montos = montosBonos(juego, e, sel);
  const total = montos.reduce((a, x) => a + x.monto, 0);
  const montoDe = (id: number, tipo: string) => montos.find(m => m.peleadorId === id && m.tipo === tipo)?.monto;

  if (!e.bonos && !jugadas.length) return <Vacio titulo="Sin bonos" texto="Este evento no tuvo peleas con ganador." />;

  const alternarActuacion = (id: number) => setSel(s => ({
    ...s, actuaciones: s.actuaciones.includes(id) ? s.actuaciones.filter(x => x !== id) : s.actuaciones.length >= 2 ? [s.actuaciones[1], id] : [...s.actuaciones, id],
  }));

  return (
    <div className="stack">
      {pagado
        ? <div className="alert"><Icon name="check" /><div>Bonos pagados: <b>{dinero(inicial.total)}</b></div></div>
        : <div className="alert warn"><Icon name="info" /><div>Elige los bonos (te sugerí los mejores). Si no los confirmas, se pagan los sugeridos al avanzar la semana.</div></div>}

      <div className="card">
        <h3>Peleador de la Noche</h3>
        {ganadores.map(({ p }) => (
          <button key={p.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} disabled={pagado} onClick={() => setSel(s => ({ ...s, peleadorNoche: p.id }))}>
            <span className="row"><span className={`check ${sel.peleadorNoche === p.id ? 'on' : ''}`}>{sel.peleadorNoche === p.id && <Icon name="check" />}</span><b>{nombreCompleto(p)}</b></span>
            <span className="v">{sel.peleadorNoche === p.id ? dinero(montoDe(p.id, 'peleador') ?? 0) : ''}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <h3>Pelea de la Noche</h3>
        {jugadas.map(b => {
          const a = juego.peleadores.find(p => p.id === b.aId);
          const c = juego.peleadores.find(p => p.id === b.bId);
          const i = e.cartelera.indexOf(b);
          return (
            <button key={b.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} disabled={pagado} onClick={() => setSel(s => ({ ...s, peleaNoche: b.id }))}>
              <span className="row"><span className={`check ${sel.peleaNoche === b.id ? 'on' : ''}`}>{sel.peleaNoche === b.id && <Icon name="check" />}</span>
                <span><b>{a?.apellido} vs {c?.apellido}</b><div className="muted small">{etiquetaBout(i, e.cartelera.length)} · {txtMetodo(b.resultado!)}</div></span></span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <h3>Actuación de la Noche (máx. 2)</h3>
        {ganadores.filter(x => ['KO', 'TKO', 'SUB'].includes(x.b.resultado!.metodo) || sel.actuaciones.includes(x.p.id)).map(({ b, p }) => (
          <button key={p.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} disabled={pagado} onClick={() => alternarActuacion(p.id)}>
            <span className="row"><span className={`check ${sel.actuaciones.includes(p.id) ? 'on' : ''}`}>{sel.actuaciones.includes(p.id) && <Icon name="check" />}</span>
              <span><b>{nombreCompleto(p)}</b><div className="muted small">{txtMetodo(b.resultado!)}</div></span></span>
            <span className="v">{sel.actuaciones.includes(p.id) ? dinero(montoDe(p.id, 'actuacion') ?? 0) : ''}</span>
          </button>
        ))}
        {ganadores.every(x => !['KO', 'TKO', 'SUB'].includes(x.b.resultado!.metodo)) && <p className="muted small">Nadie finalizó su pelea esta noche.</p>}
      </div>

      {!pagado && (
        <div className="card center">
          <div className="label">Total de bonos</div>
          <div className="big" style={{ margin: '4px 0 12px' }}>{dinero(total)}</div>
          <button className="btn primary" onClick={() => { const r = bonosNoche.pagar(e.id, sel); setAviso(r ?? 'Bonos pagados'); }}>Pagar bonos</button>
        </div>
      )}
    </div>
  );
}
