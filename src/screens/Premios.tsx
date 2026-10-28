import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIA_PREMIO } from '../config/mundo';
import { nombreCompleto } from '../domain/peleador';
import { useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { TopBar, Vacio } from '../ui/kit';

const ORDEN = ['peleador', 'pelea', 'ko', 'sumision', 'revelacion', 'regreso'];

export function Premios() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const porAnio = useMemo(() => {
    const m = new Map<number, typeof juego.premios>();
    for (const p of juego.premios) m.set(p.anio, [...(m.get(p.anio) ?? []), p]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [juego.premios]);
  return (
    <>
      <TopBar titulo="Premios anuales" />
      <div className="scroll flush">
        {porAnio.length === 0 && <Vacio titulo="Aún no se entregan premios" texto="Al terminar cada año se premia, en todo el mundo, al Peleador del Año, la Pelea, el KO y la Sumisión del Año, la Revelación y el Regreso del Año." />}
        {porAnio.map(([anio, lista]) => (
          <div key={anio}>
            <div className="section-title" style={{ padding: '14px 16px 4px', marginBottom: 0 }}>Año {anio}</div>
            {lista.slice().sort((a, b) => ORDEN.indexOf(a.categoria) - ORDEN.indexOf(b.categoria)).map(p => {
              const g = p.peleadorId != null ? juego.peleadores.find(x => x.id === p.peleadorId) : undefined;
              const mio = p.companiaId === juego.miId;
              return (
                <button key={p.categoria} className="list-item" style={{ width: '100%', textAlign: 'left', background: mio ? 'var(--accent-soft)' : undefined }} onClick={() => g && nav(`/peleador/${g.id}`)}>
                  {g ? <Avatar p={g} size={44} /> : <span style={{ width: 44 }} />}
                  <span className="grow" style={{ minWidth: 0 }}>
                    <div className="label">{CATEGORIA_PREMIO[p.categoria]}</div>
                    <div className="mid ellipsis">{g ? nombreCompleto(g) : '—'}{mio ? ' · ¡tuyo!' : ''}</div>
                    <div className="muted small">{p.texto}</div>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
