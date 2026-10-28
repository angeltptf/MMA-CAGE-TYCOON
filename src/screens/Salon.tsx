import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTILOS } from '../config/divisiones';
import { bandera } from '../config/paises';
import { nombreClase } from '../domain/format';
import { nombreCompleto, recordTxt } from '../domain/peleador';
import { ingresarSalon, puntajeSalon } from '../domain/salon';
import type { Peleador } from '../domain/types';
import { useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Chips, Seg, TopBar, Vacio } from '../ui/kit';
import { Icon } from '../ui/Icon';

type Vista = 'salon' | 'mios';

export function Salon() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const hacer = useGame(s => s.hacer);
  const [vista, setVista] = useState<Vista>('salon');
  const [soloMios, setSoloMios] = useState<'todos' | 'mios'>('todos');

  const dentro = useMemo(() => juego.peleadores.filter(p => p.salonAnio).sort((a, b) => (b.salonAnio! - a.salonAnio!) || puntajeSalon(b) - puntajeSalon(a)), [juego.peleadores]);
  const esMio = (p: Peleador) => p.rec.mio.v + p.rec.mio.d + p.rec.mio.e > 0;
  const lista = soloMios === 'mios' ? dentro.filter(esMio) : dentro;
  const candidatos = useMemo(() => juego.peleadores.filter(p => p.retirado && !p.salonAnio && esMio(p)).sort((a, b) => puntajeSalon(b) - puntajeSalon(a)), [juego.peleadores]);
  const porAnio = useMemo(() => {
    const m = new Map<number, Peleador[]>();
    for (const p of lista) m.set(p.salonAnio!, [...(m.get(p.salonAnio!) ?? []), p]);
    return [...m.entries()];
  }, [lista]);

  const fila = (p: Peleador, extra?: React.ReactNode) => (
    <button key={p.id} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/peleador/${p.id}`)}>
      <Avatar p={p} size={48} />
      <span className="grow" style={{ minWidth: 0 }}>
        <div className="mid ellipsis">{nombreCompleto(p)}</div>
        <div className="muted small">{bandera(p.pais)} {ESTILOS[p.estilo].es} · {nombreClase(p.clase, juego.ajustes.nombresDivision)} · {recordTxt(p.rec.tot)}</div>
        <div className="small">{p.rcd.reinados ? `${p.rcd.reinados} reinado${p.rcd.reinados > 1 ? 's' : ''} · ` : ''}{p.rcd.defensas ? `${p.rcd.defensas} defensas · ` : ''}Fama máx. {Math.round(p.popMax)}</div>
      </span>
      {extra}
    </button>
  );

  return (
    <>
      <TopBar titulo="Salón de la Fama" />
      <div style={{ padding: '12px 16px 0' }} className="stack">
        <Seg<Vista> valor={vista} onChange={setVista} items={[{ id: 'salon', label: `Miembros (${dentro.length})` }, { id: 'mios', label: `Tus retirados (${candidatos.length})` }]} />
        {vista === 'salon' && <Chips<'todos' | 'mios'> valor={soloMios} onChange={setSoloMios} items={[{ id: 'todos', label: 'Todo el mundo' }, { id: 'mios', label: 'De mi empresa' }]} />}
      </div>
      <div className="scroll flush" style={{ marginTop: 8 }}>
        {vista === 'salon' && (
          <>
            {porAnio.length === 0 && <Vacio titulo="El Salón todavía está vacío" texto="Cada año, en la semana 46, se celebra la ceremonia y entran los retirados más destacados: campeones, defensores, estrellas y leyendas." />}
            {porAnio.map(([anio, ps]) => (
              <div key={anio}>
                <div className="section-title" style={{ padding: '12px 16px 4px', marginBottom: 0 }}>Clase del año {anio}</div>
                {ps.map(p => fila(p, <span className="accent"><Icon name="star" fill /></span>))}
              </div>
            ))}
          </>
        )}
        {vista === 'mios' && (
          <>
            <p className="muted small" style={{ padding: '4px 16px' }}>Los retirados que pasaron por tu empresa. Entran solos en la ceremonia si su carrera lo merece, o puedes ingresarlos tú.</p>
            {candidatos.length === 0 && <Vacio titulo="Nadie retirado todavía" texto="Cuando se retire alguien de tu empresa aparecerá aquí." />}
            {candidatos.map(p => fila(p, (
              <span className="btn small" role="button" onClick={e => { e.stopPropagation(); hacer(j => ingresarSalon(j, p.id), 'Ingresó al Salón de la Fama'); }}>Ingresar</span>
            )))}
          </>
        )}
      </div>
    </>
  );
}
