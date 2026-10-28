import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fechaCorta } from '../domain/format';
import { borrarNoticias, marcarNoticia } from '../domain/acciones';
import type { CategoriaNoticia } from '../domain/types';
import { useGame } from '../store/game';
import { acciones } from '../store/game';
import { Icon } from '../ui/Icon';
import { Tabs, TopBar, Vacio } from '../ui/kit';

const TABS: { id: CategoriaNoticia; label: string }[] = [
  { id: 'importante', label: 'Importante' }, { id: 'eventos', label: 'Eventos' }, { id: 'peleadores', label: 'Peleadores' },
  { id: 'negocios', label: 'Negocios' }, { id: 'mundo', label: 'Mundo MMA' },
];

export function Noticias() {
  const juego = useGame(s => s.juego)!;
  const hacer = useGame(s => s.hacer);
  const nav = useNavigate();
  const [tab, setTab] = useState<CategoriaNoticia>('importante');
  const [abierta, setAbierta] = useState<number | null>(null);

  const porTab = useMemo(() => {
    const m = new Map<CategoriaNoticia, number>();
    for (const n of juego.noticias) if (!n.leida) m.set(n.categoria, (m.get(n.categoria) ?? 0) + 1);
    return m;
  }, [juego.noticias]);
  const lista = useMemo(() => juego.noticias.filter(n => n.categoria === tab), [juego.noticias, tab]);

  return (
    <>
      <TopBar
        titulo="Noticias"
        derecha={
          <>
            <button className="iconbtn" aria-label="Marcar todo como leído" onClick={() => hacer(j => { lista.forEach(n => marcarNoticia(j, n.id, true)); })}><Icon name="check" /></button>
            <button className="iconbtn" aria-label="Borrar" onClick={() => hacer(j => { borrarNoticias(j, lista.map(n => n.id)); })}><Icon name="trash" /></button>
          </>
        }
      />
      <Tabs<CategoriaNoticia> valor={tab} onChange={setTab} items={TABS.map(t => ({ ...t, badge: porTab.get(t.id) }))} />
      <div className="scroll flush">
        {lista.length === 0 && <Vacio titulo="Sin noticias" texto="Aquí aparecerán lesiones, retiros, fichajes y ofertas." />}
        {lista.map(n => (
          <div key={n.id} className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}
            onClick={() => { setAbierta(abierta === n.id ? null : n.id); if (!n.leida) hacer(j => { marcarNoticia(j, n.id, true); }); }}>
            <div className="row" style={{ width: '100%', gap: 10 }}>
              {!n.leida && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', flex: 'none' }} />}
              <span className="muted small num" style={{ width: 52, flex: 'none' }}>{fechaCorta(n.semana)}</span>
              <span className="grow" style={{ fontWeight: n.leida ? 500 : 700 }}>{n.titulo}{n.veces && n.veces > 1 ? ` ×${n.veces}` : ''}</span>
            </div>
            {abierta === n.id && (n.cuerpo || n.peleadorId) && (
              <div className="stack" style={{ paddingLeft: 62, gap: 8 }}>
                {n.cuerpo && <p className="muted">{n.cuerpo}</p>}
                {n.ofertaId != null && juego.ofertas.find(o => o.id === n.ofertaId)?.estado === 'pendiente' && (
                  <div className="row">
                    <button className="btn small primary grow" onClick={e => { e.stopPropagation(); acciones.aceptarOferta(n.ofertaId!); }}>Aceptar</button>
                    <button className="btn small danger grow" onClick={e => { e.stopPropagation(); acciones.rechazarOferta(n.ofertaId!); }}>Rechazar</button>
                    <button className="btn small grow" onClick={e => { e.stopPropagation(); nav('/ofertas'); }}>Contraofertar</button>
                  </div>
                )}
                {n.peleadorId && <button className="btn small" onClick={e => { e.stopPropagation(); nav(`/peleador/${n.peleadorId}`); }}>Ver peleador</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
