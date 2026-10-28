import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIVISIONES_GENERO } from '../config/divisiones';
import { limiteClase, nombreClase } from '../domain/format';
import { nombreCorto } from '../domain/peleador';
import type { ClaseId, Genero } from '../domain/types';
import { acciones, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Confirmar, Seg, Sheet, TopBar, Vacio } from '../ui/kit';

export function Divisiones() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [g, setG] = useState<Genero>('M');
  const [agregar, setAgregar] = useState(false);
  const [borrar, setBorrar] = useState<string | null>(null);
  const idioma = juego.ajustes.nombresDivision;
  const u = juego.ajustes.unidades;

  const mias = useMemo(() => juego.divisiones.filter(d => d.companiaId === juego.miId && d.genero === g), [juego.divisiones, juego.miId, g]);
  const cuenta = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of juego.peleadores) {
      if (p.retirado || p.companiaId !== juego.miId) continue;
      const k = `${p.genero}:${p.clase}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [juego.peleadores, juego.miId]);
  const disponibles = DIVISIONES_GENERO[g].filter(c => !mias.some(d => d.clase === c));

  const campeon = (id: number | null) => {
    const p = id != null ? juego.peleadores.find(x => x.id === id) : undefined;
    return p ? nombreCorto(p) : 'Vacante';
  };

  return (
    <>
      <TopBar titulo="Divisiones" derecha={<button className="iconbtn on" aria-label="Agregar división" onClick={() => setAgregar(true)}><Icon name="plus" /></button>} />
      <div style={{ padding: '12px 16px 0' }}>
        <Seg<Genero> valor={g} onChange={setG} items={[{ id: 'M', label: 'Hombres' }, { id: 'F', label: 'Mujeres' }]} />
      </div>
      <div className="scroll flush" style={{ paddingTop: 8 }}>
        <button className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/rankings?c=${juego.miId}&g=${g}&d=p4p`)}>
          <span className="ico"><Icon name="chart" /></span>
          <span className="grow"><div style={{ fontWeight: 600 }}>Libra por libra (P4P)</div><div className="muted small">Los mejores de tu empresa sin importar el peso</div></span>
          <span className="chev"><Icon name="chevron" /></span>
        </button>
        {mias.length === 0 ? (
          <Vacio titulo="Sin divisiones" texto="Empiezas sin ninguna. Toca + para crear tu primera división." />
        ) : mias.map(d => (
          <div key={d.id} className="list-item">
            <button className="grow" style={{ textAlign: 'left' }} onClick={() => nav(`/rankings?c=${juego.miId}&g=${g}&d=${d.clase}`)}>
              <div className="mid">{nombreClase(d.clase, idioma)} <span className="muted small" style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>· {limiteClase(d.clase, g, u)}</span></div>
              <div className="muted small">{cuenta.get(`${g}:${d.clase}`) ?? 0} peleadores · Campeón: <b style={{ color: 'var(--text)' }}>{campeon(d.campeonId)}</b></div>
            </button>
            <button className="iconbtn" aria-label="Eliminar división" onClick={() => setBorrar(d.id)}><Icon name="trash" /></button>
          </div>
        ))}
      </div>

      {agregar && (
        <Sheet titulo="Crear división" onClose={() => setAgregar(false)}>
          {disponibles.length === 0 ? <Vacio titulo="Ya tienes todas" /> : (
            <div className="stack">
              {disponibles.map((c: ClaseId) => (
                <button key={c} className="btn" onClick={() => { const e = acciones.crearDivision(g, c); if (!e) setAgregar(false); }}>
                  {nombreClase(c, idioma)} · {limiteClase(c, g, u)}
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}
      {borrar && (
        <Confirmar titulo="¿Eliminar división?" peligro confirmar="Eliminar"
          texto="Tus peleadores seguirán en tu roster, pero la división y su ranking desaparecen."
          onNo={() => setBorrar(null)} onSi={() => { acciones.eliminarDivision(borrar); setBorrar(null); }} />
      )}
    </>
  );
}
