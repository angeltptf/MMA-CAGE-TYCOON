import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { SEDE_POR_ID } from '../config/sedes';
import { estaCompleto, estimarBoletos, hypeEvento } from '../domain/eventos';
import { dinero, fecha } from '../domain/format';
import { eventos as acc, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Confirmar, TopBar, Vacio } from '../ui/kit';
import { BoutCard, etiquetaBout, txtMetodo } from './BoutCard';

type Modo = 'pelea' | 'resultados';
const VELOCIDAD_MS = [2400, 1500, 700];

export function Noche() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const e = juego.eventos.find(x => x.id === Number(id));
  const [modo, setModo] = useState<Modo | null>(null);
  const [idx, setIdx] = useState(0);
  const [linea, setLinea] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cancelar, setCancelar] = useState(false);

  const bout = e && e.estado === 'realizado' ? e.cartelera[idx] : undefined;
  const lineas = bout?.resultado?.narracion ?? [];
  const ms = VELOCIDAD_MS[juego.ajustes.velocidadSim - 1] ?? 1500;

  // en el modo "pelea por pelea" las líneas de narración van apareciendo solas
  useEffect(() => {
    if (modo !== 'pelea' || !bout || linea >= lineas.length) return;
    const t = setTimeout(() => setLinea(l => l + 1), ms);
    return () => clearTimeout(t);
  }, [modo, bout, linea, lineas.length, ms]);

  if (!e) return (<><TopBar titulo="Noche de pelea" /><Vacio titulo="No se encontró el evento" /></>);
  if (e.estado === 'cancelado') return <Navigate to="/eventos" replace />;
  if (e.estado === 'realizado' && !modo) return <Navigate to={`/evento/${e.id}`} replace />;

  // ---------- antes de pelear ----------
  if (e.estado === 'borrador') {
    const hoy = e.semana === juego.semanaAbs;
    const completo = estaCompleto(e);
    const est = estimarBoletos(juego, e);
    const empezar = (m: Modo | 'todo') => {
      const err = acc.realizar(e.id);
      if (err) { setError(err); return; }
      if (m === 'todo') { nav(`/evento/${e.id}`, { replace: true }); return; }
      setIdx(0); setLinea(0); setModo(m);
    };
    return (
      <>
        <TopBar titulo="Noche de pelea" />
        <div className="scroll">
          <div className="stack">
            <div className="card center">
              <div className="label">{fecha(e.semana)}</div>
              <div className="big" style={{ marginTop: 6 }}>{e.nombre}</div>
              <div className="muted" style={{ marginTop: 4 }}>{SEDE_POR_ID[e.sedeId]?.nombre} · {e.cartelera.length} combates · Hype {hypeEvento(juego, e)}</div>
              <div className="muted small" style={{ marginTop: 4 }}>Se esperan ~{est.vendidos.toLocaleString('en-US')} aficionados a {dinero(e.precio)}</div>
            </div>
            {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}
            {!hoy && <div className="alert warn"><Icon name="info" /><div>Todavía no es la semana de este evento.</div></div>}
            {hoy && !completo && <div className="alert bad"><Icon name="x" /><div>La cartelera está incompleta. Llénala o cancela el evento para poder avanzar.</div></div>}
            {hoy && completo && (
              <>
                <button className="btn primary" onClick={() => empezar('pelea')}><Icon name="bolt" />Ver pelea por pelea</button>
                <button className="btn" onClick={() => empezar('resultados')}>Solo resultados</button>
                <button className="btn" onClick={() => empezar('todo')}>Simular todo de golpe</button>
              </>
            )}
            {hoy && !completo && <button className="btn" onClick={() => nav(`/evento/${e.id}`)}>Ir a la cartelera</button>}
            {hoy && <button className="btn danger" onClick={() => setCancelar(true)}>Eliminar evento</button>}
          </div>
        </div>
        {cancelar && (
          <Confirmar titulo="¿Eliminar el evento?" peligro confirmar="Eliminar evento" texto="Se elimina del calendario y podrás seguir avanzando semanas."
            onNo={() => setCancelar(false)} onSi={() => { acc.cancelar(e.id); nav('/', { replace: true }); }} />
        )}
      </>
    );
  }

  // ---------- revelando resultados ----------
  const total = e.cartelera.length;
  const ultimo = idx >= total - 1;
  const terminoNarracion = modo === 'resultados' || linea >= lineas.length;
  const reveladas = e.cartelera.slice(0, idx);

  return (
    <>
      <TopBar titulo={e.nombre} atras={false} derecha={<button className="btn small" onClick={() => nav(`/evento/${e.id}`, { replace: true })}>Saltar</button>} />
      <div className="scroll">
        <div className="stack">
          {reveladas.length > 0 && (
            <>
              <div className="section-title" style={{ marginBottom: 0 }}>Ya peleadas</div>
              {reveladas.slice().reverse().map((b, k) => {
                const i = idx - 1 - k;
                return <BoutCard key={b.id} j={juego} b={b} etiqueta={etiquetaBout(i, total)} mostrarResultado onClick={() => nav(`/pelea/${e.id}/${b.id}`)} />;
              })}
            </>
          )}
          {bout && (
            <>
              <BoutCard j={juego} b={{ ...bout, resultado: terminoNarracion ? bout.resultado : undefined }} etiqueta={etiquetaBout(idx, total)} mostrarResultado={terminoNarracion} />
              {modo === 'pelea' && (
                <div className="card stack" style={{ gap: 10 }}>
                  {lineas.slice(0, linea).map((l, i) => <p key={i}>{l}</p>)}
                  {!terminoNarracion && <p className="muted">…</p>}
                </div>
              )}
              {terminoNarracion && bout.resultado && (
                <div className="center"><div className="big accent">{txtMetodo(bout.resultado)}</div></div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="sticky-actions">
        {!terminoNarracion && <button className="btn" onClick={() => setLinea(lineas.length)}>Saltar narración</button>}
        {terminoNarracion && !ultimo && <button className="btn primary" onClick={() => { setIdx(i => i + 1); setLinea(0); }}>Siguiente pelea</button>}
        {terminoNarracion && ultimo && <button className="btn primary" onClick={() => nav(`/evento/${e.id}`, { replace: true })}>Ver resultados del evento</button>}
      </div>
    </>
  );
}
