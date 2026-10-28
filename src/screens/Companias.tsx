import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bandera, nombrePais } from '../config/paises';
import { puntajesCompanias } from '../domain/empresa';
import { dinero, fecha, fechaCorta, nombreClase, numeroCorto } from '../domain/format';
import { nombreCorto } from '../domain/peleador';
import type { Compania } from '../domain/types';
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
  const pts = useMemo(() => puntajesCompanias(juego), [juego]);
  const orden = useMemo(() => juego.companias.slice().sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0)), [juego.companias, pts]);
  const pos = useMemo(() => new Map(orden.map((c, i) => [c.id, i + 1])), [orden]);

  const lista = useMemo(() => {
    const v = (c: Compania) => col === 'dinero' ? c.dinero : col === 'peleadores' ? cuenta.get(c.id) ?? 0 : col === 'fans' ? c.fans : col === 'ingresos' ? c.ingresosAnuales : col === 'reputacion' ? c.reputacion : 0;
    return col === 'pos' ? orden : orden.slice().sort((a, b) => v(b) - v(a));
  }, [orden, col, cuenta]);

  const flecha = (c: Compania) => {
    const antes = juego.rankCompPrev[c.id];
    const ahora = pos.get(c.id)!;
    if (antes == null || antes === ahora) return { t: '', color: '' };
    return antes > ahora ? { t: '▲', color: 'var(--ok)' } : { t: '▼', color: 'var(--bad)' };
  };

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
        {lista.map((c, i) => {
          const f = flecha(c);
          return (
            <button key={c.id} className="list-item" style={{ width: '100%', textAlign: 'left', background: c.esMia ? 'var(--accent-soft)' : undefined }} onClick={() => setDet(c)}>
              <span style={{ width: 38 }}>
                <span className="num" style={{ fontSize: 24 }}>{col === 'pos' ? pos.get(c.id) : i + 1}</span>
                <small style={{ display: 'block', fontSize: 11, color: f.color }}>{f.t}</small>
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="mid ellipsis">{c.nombre}</span>
                  <Estrellas valor={c.tier} />
                </div>
                <div className="muted small">
                  {dinero(c.dinero)} · {cuenta.get(c.id) ?? 0} peleadores · {numeroCorto(c.fans)} fans · {dinero(c.ingresosAnuales)}/año · Rep. {Math.round(c.reputacion)}
                </div>
              </span>
            </button>
          );
        })}
        <p className="muted small center" style={{ padding: 16 }}>
          Las estrellas se recalculan cada trimestre con prestigio, reputación, ingresos y calidad del roster, y pueden subir o bajar. Las flechas comparan con el trimestre anterior.
        </p>
      </div>
      {det && <Detalle c={det} puntaje={pts.get(det.id) ?? 0} posicion={pos.get(det.id) ?? 0} onClose={() => setDet(null)} />}
    </>
  );
}

function Grafica({ puntos }: { puntos: { semana: number; puntaje: number }[] }) {
  if (puntos.length < 2) return <div className="muted small center" style={{ padding: '18px 0' }}>La gráfica aparece después del primer trimestre.</div>;
  const W = 320;
  const H = 90;
  const min = Math.min(...puntos.map(p => p.puntaje));
  const max = Math.max(...puntos.map(p => p.puntaje));
  const x = (i: number) => (i / (puntos.length - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 8 - ((v - min) / Math.max(1, max - min)) * (H - 16);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Historial de puntaje">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.puntaje).toFixed(1)}`).join(' ')} />
      {puntos.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.puntaje)} r="2.5" fill="var(--accent)"><title>{fechaCorta(p.semana)}: {p.puntaje}</title></circle>)}
    </svg>
  );
}

function Detalle({ c, puntaje, posicion, onClose }: { c: Compania; puntaje: number; posicion: number; onClose: () => void }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const campeones = juego.divisiones
    .filter(d => d.companiaId === c.id && d.campeonId != null)
    .map(d => ({ d, p: juego.peleadores.find(x => x.id === d.campeonId)! }))
    .filter(x => x.p);
  const eventos = c.esMia
    ? juego.eventos.filter(e => e.estado === 'realizado').slice(-5).reverse().map(e => ({ id: e.id, nombre: e.nombre, semana: e.semana, texto: (() => { const b = e.cartelera[e.cartelera.length - 1]; const a = juego.peleadores.find(p => p.id === b.aId); const z = juego.peleadores.find(p => p.id === b.bId); return `${a?.apellido ?? '—'} vs ${z?.apellido ?? '—'}`; })() }))
    : juego.eventosRivales.filter(e => e.companiaId === c.id).slice(-5).reverse().map(e => {
      const a = juego.peleadores.find(p => p.id === e.estelar.aId);
      const z = juego.peleadores.find(p => p.id === e.estelar.bId);
      const g = e.estelar.ganadorId === a?.id ? a : e.estelar.ganadorId === z?.id ? z : undefined;
      return { id: e.id, nombre: e.nombre, semana: e.semana, texto: `${a?.apellido ?? '—'} vs ${z?.apellido ?? '—'}${g ? ` · gana ${g.apellido} (${e.estelar.metodo} R${e.estelar.round})` : ''}${e.estelar.titulo ? ' · título' : ''}` };
    });
  return (
    <Sheet titulo={c.nombre} completo onClose={onClose}>
      <div className="stack">
        <div className="card">
          <div className="row between"><Estrellas valor={c.tier} /><span className="pill accent">#{posicion}</span></div>
          <div className="kv"><span className="k">País</span><span className="v">{bandera(c.pais)} {nombrePais(c.pais)}</span></div>
          <div className="kv"><span className="k">Dinero en caja</span><span className="v">{dinero(c.dinero)}</span></div>
          <div className="kv"><span className="k">Ingresos anuales</span><span className="v">{dinero(c.ingresosAnuales)}</span></div>
          <div className="kv"><span className="k">Fans</span><span className="v">{numeroCorto(c.fans)}</span></div>
          <div className="kv"><span className="k">Reputación</span><span className="v">{Math.round(c.reputacion)}</span></div>
          <div className="kv"><span className="k">Puntaje</span><span className="v">{puntaje.toFixed(1)}</span></div>
          {!c.esMia && <div className="kv"><span className="k">Próximo evento</span><span className="v">{c.proxEvento >= juego.semanaAbs ? fecha(c.proxEvento) : 'por anunciar'}</span></div>}
        </div>
        <div className="card">
          <h3>Historial de puntaje</h3>
          <Grafica puntos={c.hist} />
        </div>
        <div className="card">
          <h3>Campeones actuales</h3>
          {campeones.length === 0 && <p className="muted small">Sin campeones todavía.</p>}
          {campeones.map(({ d, p }) => (
            <button key={d.id} className="kv" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/peleador/${p.id}`)}>
              <span className="k">{d.genero === 'F' ? '♀ ' : ''}{nombreClase(d.clase, juego.ajustes.nombresDivision)}</span>
              <span className="v">{nombreCorto(p)}</span>
            </button>
          ))}
        </div>
        <div className="card">
          <h3>Últimos eventos</h3>
          {eventos.length === 0 && <p className="muted small">Todavía no hay eventos registrados.</p>}
          {eventos.map(e => (
            <div key={e.id} className="kv"><span className="k">{e.nombre}<div className="small">{fechaCorta(e.semana)}</div></span><span className="v small" style={{ maxWidth: 190 }}>{e.texto}</span></div>
          ))}
        </div>
        {c.esMia && <button className="btn" onClick={() => nav('/empresa')}>Ver mi empresa</button>}
      </div>
    </Sheet>
  );
}

