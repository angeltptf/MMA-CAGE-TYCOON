import { useMemo, useState } from 'react';
import { CAT_GASTO, CAT_INGRESO, CAT_LABEL, costoOperacion, netoPorSemana, resumenPeriodo } from '../domain/finanzas';
import { anio, dinero, fecha, fechaCorta } from '../domain/format';
import { useGame } from '../store/game';
import { Seg, TopBar } from '../ui/kit';

type Periodo = 'recientes' | 'anio' | 'todo';

export function Finanzas({ embed }: { embed?: boolean } = {}) {
  const juego = useGame(s => s.juego)!;
  const [periodo, setPeriodo] = useState<Periodo>('recientes');
  const hoy = juego.semanaAbs;
  const desde = periodo === 'recientes' ? Math.max(0, hoy - 11) : periodo === 'anio' ? (anio(hoy) - 1) * 52 : 0;
  const mia = juego.companias.find(c => c.esMia)!;
  const res = useMemo(() => resumenPeriodo(juego, desde, hoy), [juego, desde, hoy]);
  const barras = useMemo(() => {
    const todas = netoPorSemana(juego, desde, hoy);
    // en periodos largos se agrupan para que la gráfica siga legible
    const grupo = Math.max(1, Math.ceil(todas.length / 52));
    const res: { semana: number; neto: number }[] = [];
    for (let i = 0; i < todas.length; i += grupo) {
      res.push({ semana: todas[i].semana, neto: todas.slice(i, i + grupo).reduce((a, x) => a + x.neto, 0) });
    }
    return res;
  }, [juego, desde, hoy]);
  const caja = useMemo(() => juego.cajaHist.filter(c => c.semana >= desde), [juego.cajaHist, desde]);

  return (
    <>
      {!embed && <TopBar titulo="Finanzas" />}
      <div className={embed ? '' : 'scroll'}>
        <div className="stack">
          <Seg<Periodo> valor={periodo} onChange={setPeriodo} items={[{ id: 'recientes', label: '12 semanas' }, { id: 'anio', label: `Año ${anio(hoy)}` }, { id: 'todo', label: 'Histórico' }]} />

          <div className="card center">
            <div className="label">Caja actual</div>
            <div className="big" style={{ marginTop: 4, color: mia.dinero < 0 ? 'var(--bad)' : 'var(--accent)' }}>{dinero(mia.dinero)}</div>
            {mia.dinero < 0 && <div className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Números rojos: {juego.semanasEnNegativo} semana{juego.semanasEnNegativo === 1 ? '' : 's'}{juego.ajustes.gameOver ? ' · quiebra a las 8' : ''}</div>}
          </div>

          <div className="stat-grid">
            <div className="stat"><div className="label">Ingresos</div><div className="big neto-pos" style={{ fontSize: 26 }}>{dinero(res.ingresos)}</div></div>
            <div className="stat"><div className="label">Gastos</div><div className="big neto-neg" style={{ fontSize: 26 }}>{dinero(res.gastos)}</div></div>
          </div>
          <div className="card center">
            <div className="label">Neto del periodo</div>
            <div className={`big ${res.neto >= 0 ? 'neto-pos' : 'neto-neg'}`} style={{ marginTop: 4 }}>{dinero(res.neto, true)}</div>
          </div>

          <div className="card">
            <h3>Neto por semana y caja</h3>
            <Grafica barras={barras} caja={caja} desde={desde} hasta={hoy} />
            <div className="row small muted" style={{ gap: 14, marginTop: 8 }}>
              <span><i className="dotc" style={{ background: 'var(--ok)' }} /> Ganancia</span>
              <span><i className="dotc" style={{ background: 'var(--bad)' }} /> Pérdida</span>
              <span><i className="dotc" style={{ background: 'var(--accent)' }} /> Caja</span>
            </div>
          </div>

          <div className="card">
            <h3>Ingresos</h3>
            {CAT_INGRESO.map(c => <div key={c} className="kv"><span className="k">{CAT_LABEL[c]}</span><span className="v">{res.porCat[c] ? dinero(res.porCat[c]!) : '—'}</span></div>)}
          </div>
          <div className="card">
            <h3>Gastos</h3>
            {CAT_GASTO.map(c => <div key={c} className="kv"><span className="k">{CAT_LABEL[c]}</span><span className="v">{res.porCat[c] ? dinero(-res.porCat[c]!) : '—'}</span></div>)}
            <p className="muted small" style={{ marginTop: 8 }}>Gasto fijo de operación: {dinero(costoOperacion(juego))} por semana (crece con tus peleadores y tu fama). {fecha(hoy)}.</p>
          </div>
          <p className="muted small center">Todos los ingresos externos entran por contratos: míralos en las pestañas Patrocinios, Televisión y Ofertas.</p>
        </div>
      </div>
    </>
  );
}

function Grafica({ barras, caja, desde, hasta }: { barras: { semana: number; neto: number }[]; caja: { semana: number; caja: number }[]; desde: number; hasta: number }) {
  const W = 340;
  const H = 150;
  if (!barras.length || (barras.every(b => b.neto === 0) && caja.length < 2)) {
    return <div className="muted small center" style={{ padding: '24px 0' }}>Aún no hay movimientos. Organiza tu primer evento.</div>;
  }
  const max = Math.max(1, ...barras.map(b => Math.abs(b.neto)));
  const cmin = Math.min(0, ...caja.map(c => c.caja));
  const cmax = Math.max(1, ...caja.map(c => c.caja));
  const bw = Math.max(2, W / barras.length - 2);
  const mid = H / 2;
  const x = (s: number) => ((s - desde) / Math.max(1, hasta - desde)) * (W - bw) + bw / 2;
  const y = (c: number) => H - 6 - ((c - cmin) / Math.max(1, cmax - cmin)) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfica de finanzas">
      <line x1="0" x2={W} y1={mid} y2={mid} stroke="var(--line)" />
      {barras.map(b => {
        const h = (Math.abs(b.neto) / max) * (mid - 6);
        return <rect key={b.semana} x={x(b.semana) - bw / 2} y={b.neto >= 0 ? mid - h : mid} width={bw} height={Math.max(1, h)} rx="1.5" fill={b.neto >= 0 ? 'var(--ok)' : 'var(--bad)'} opacity="0.8"><title>{fechaCorta(b.semana)}: {dinero(b.neto, true)}</title></rect>;
      })}
      {caja.length > 1 && <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={caja.map(c => `${x(c.semana).toFixed(1)},${y(c.caja).toFixed(1)}`).join(' ')} />}
    </svg>
  );
}
