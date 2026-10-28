import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DIVISIONES_GENERO } from '../config/divisiones';
import { nombreClase } from '../domain/format';
import { estatus, estrellasCalif, nombreCompleto, recordTxt } from '../domain/peleador';
import { rankingCompania, rankingGlobal } from '../domain/rankings';
import type { ClaseId, Genero } from '../domain/types';
import { useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Chips, Estrellas, Seg, TopBar, Vacio } from '../ui/kit';

export function Rankings() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const scope = sp.get('c') ?? juego.miId;                 // id de compañía o 'global'
  const g = (sp.get('g') as Genero) ?? 'M';
  const d = (sp.get('d') as ClaseId | 'p4p') ?? 'p4p';
  const idioma = juego.ajustes.nombresDivision;
  const set = (patch: Record<string, string>) => setSp({ c: scope, g, d, ...patch }, { replace: true });

  const filas = useMemo(
    () => (scope === 'global' ? rankingGlobal(juego, g, d) : rankingCompania(juego, scope, g, d)),
    [juego, scope, g, d],
  );
  const siglas = useMemo(() => new Map(juego.companias.map(c => [c.id, c.siglas])), [juego.companias]);
  const clases = DIVISIONES_GENERO[g];
  const claseValida = d === 'p4p' || clases.includes(d);

  return (
    <>
      <TopBar titulo="Rankings" />
      <div style={{ padding: '12px 16px 0' }} className="stack">
        <select className="select" value={scope} onChange={e => set({ c: e.target.value })}>
          <option value={juego.miId}>Mi compañía</option>
          <option value="global">Global (todo el mundo)</option>
          {juego.companias.filter(c => !c.esMia).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <Seg<Genero> valor={g} onChange={v => set({ g: v, d: 'p4p' })} items={[{ id: 'M', label: 'Hombres' }, { id: 'F', label: 'Mujeres' }]} />
        <Chips<ClaseId | 'p4p'> valor={claseValida ? d : 'p4p'} onChange={v => set({ d: v })}
          items={[{ id: 'p4p', label: 'Libra por libra' }, ...clases.map(c => ({ id: c, label: nombreClase(c, idioma) }))]} />
      </div>
      <div className="scroll flush" style={{ marginTop: 8 }}>
        {filas.length === 0 ? (
          <Vacio titulo="Sin ranking" texto={scope === juego.miId ? 'Esta división no existe o aún no tiene peleadores. Fícha agentes libres de esta división.' : 'No hay peleadores en esta división.'} />
        ) : filas.map(f => (
          <button key={f.peleador.id} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/peleador/${f.peleador.id}`)}>
            <span className="num" style={{ width: 34, fontSize: 24, color: f.campeon ? 'var(--accent)' : undefined }}>{f.campeon && scope !== 'global' && f.rank === 0 ? 'C' : f.rank || (f.campeon ? 'C' : '')}</span>
            <Avatar p={f.peleador} size={44} />
            <span className="grow" style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="mid ellipsis">{nombreCompleto(f.peleador)}</span>
                {f.campeon && scope === 'global' && <span className="pill accent">Campeón</span>}
              </div>
              <div className="muted small ellipsis">
                {recordTxt(f.peleador.rec.tot)} · {estatus(f.peleador)}{f.peleador.companiaId ? ` · ${siglas.get(f.peleador.companiaId)}` : ' · Libre'}
              </div>
            </span>
            <Estrellas valor={estrellasCalif(f.peleador)} />
          </button>
        ))}
        <p className="muted small center" style={{ padding: 16 }}>
          Por ahora el ranking se calcula con calificación, fama y récord. Desde la Fase 3 se mueve según tus resultados.
        </p>
      </div>
    </>
  );
}
