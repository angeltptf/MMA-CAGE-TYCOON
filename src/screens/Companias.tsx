import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordenCompanias, puntajeCompania } from '../domain/empresa';
import { dinero, nombreClase, numeroCorto } from '../domain/format';
import { nombreCorto } from '../domain/peleador';
import type { Compania } from '../domain/types';
import { nombrePais, bandera } from '../config/paises';
import { useGame } from '../store/game';
import { Chips, Estrellas, Sheet, TopBar } from '../ui/kit';

type Col = 'pos' | 'dinero' | 'peleadores' | 'fans' | 'ingresos' | 'reputacion';

export function Companias() {
  const juego = useGame(s => s.juego)!;
  const [col, setCol] = useState<Col>('pos');
  const [det, setDet] = useState<Compania | null>(null);

  const cuenta = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of juego.peleadores) if (!p.retirado && p.companiaId) m.set(p.companiaId, (m.get(p.companiaId) ?? 0) + 1);
    return m;
  }, [juego.peleadores]);
  const pos = useMemo(() => new Map(ordenCompanias(juego).map((c, i) => [c.id, i + 1])), [juego]);

  const lista = useMemo(() => {
    const base = ordenCompanias(juego);
    const v = (c: Compania) => col === 'dinero' ? c.dinero : col === 'peleadores' ? cuenta.get(c.id) ?? 0 : col === 'fans' ? c.fans : col === 'ingresos' ? c.ingresosAnuales : col === 'reputacion' ? c.reputacion : 0;
    return col === 'pos' ? base : base.slice().sort((a, b) => v(b) - v(a));
  }, [juego, col, cuenta]);

  return (
    <>
      <TopBar titulo="Ranking de compañías" />
      <div style={{ padding: '12px 16px 4px' }}>
        <Chips<Col> valor={col} onChange={setCol} items={[
          { id: 'pos', label: 'Posición' }, { id: 'dinero', label: 'Dinero' }, { id: 'peleadores', label: 'Peleadores' },
          { id: 'fans', label: 'Fans' }, { id: 'ingresos', label: 'Ingresos' }, { id: 'reputacion', label: 'Reputación' },
        ]} />
      </div>
      <div className="scroll flush">
        {lista.map((c, i) => (
          <button key={c.id} className="list-item" style={{ width: '100%', textAlign: 'left', background: c.esMia ? 'var(--accent-soft)' : undefined }} onClick={() => setDet(c)}>
            <span className="num" style={{ width: 30, fontSize: 24 }}>{col === 'pos' ? pos.get(c.id) : i + 1}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="mid ellipsis">{c.nombre}</span>
                <Estrellas valor={c.esMia ? starsMia(c) : c.tier} />
              </div>
              <div className="muted small">
                {dinero(c.dinero)} · {cuenta.get(c.id) ?? 0} peleadores · {numeroCorto(c.fans)} fans · {dinero(c.ingresosAnuales)}/año · Rep. {c.reputacion}
              </div>
            </span>
          </button>
        ))}
        <p className="muted small center" style={{ padding: 16 }}>Las compañías rivales empiezan a organizar eventos y a moverse en el mercado en la Fase 6.</p>
      </div>
      {det && <Detalle c={det} onClose={() => setDet(null)} />}
    </>
  );
}

const starsMia = (c: Compania) => Math.max(1, Math.min(5, Math.round(c.reputacion / 20)));

function Detalle({ c, onClose }: { c: Compania; onClose: () => void }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const campeones = juego.divisiones
    .filter(d => d.companiaId === c.id && d.campeonId != null)
    .map(d => ({ d, p: juego.peleadores.find(x => x.id === d.campeonId)! }))
    .filter(x => x.p);
  return (
    <Sheet titulo={c.nombre} completo onClose={onClose}>
      <div className="card">
        <div className="kv"><span className="k">País</span><span className="v">{bandera(c.pais)} {nombrePais(c.pais)}</span></div>
        <div className="kv"><span className="k">Posición</span><span className="v">#{ordenCompanias(juego).findIndex(x => x.id === c.id) + 1}</span></div>
        <div className="kv"><span className="k">Puntaje</span><span className="v">{puntajeCompania(c).toFixed(1)}</span></div>
        <div className="kv"><span className="k">Eventos al año</span><span className="v">{c.eventosAnio}</span></div>
      </div>
      <div className="section-title" style={{ margin: '16px 0 8px' }}>Campeones actuales</div>
      {campeones.length === 0 ? <p className="muted">Sin campeones todavía.</p> : (
        <div className="card">
          {campeones.map(({ d, p }) => (
            <button key={d.id} className="kv" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/peleador/${p.id}`)}>
              <span className="k">{d.genero === 'F' ? '♀ ' : ''}{nombreClase(d.clase, juego.ajustes.nombresDivision)}</span>
              <span className="v">{nombreCorto(p)}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
