import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcularRegistros } from '../domain/registros';
import { useGame } from '../store/game';
import { TopBar, Vacio } from '../ui/kit';

export function Registros() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const registros = useMemo(() => calcularRegistros(juego), [juego]);
  return (
    <>
      <TopBar titulo="Registros" />
      <div className="scroll flush">
        {registros.length <= 2 && <Vacio titulo="Todavía no hay récords" texto="Organiza eventos y aquí quedarán las marcas históricas de tu empresa: más victorias, KO más rápido, mejores taquillas y más." />}
        {registros.map(r => (
          <button key={r.titulo} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => { if (r.peleadorId) nav(`/peleador/${r.peleadorId}`); else if (r.eventoId) nav(`/evento/${r.eventoId}`); }}>
            <span className="grow" style={{ minWidth: 0 }}>
              <div className="label">{r.titulo}</div>
              {r.detalle && <div className="muted small ellipsis">{r.detalle}</div>}
            </span>
            <span className="num accent" style={{ fontSize: 24 }}>{r.valor}</span>
          </button>
        ))}
      </div>
    </>
  );
}
