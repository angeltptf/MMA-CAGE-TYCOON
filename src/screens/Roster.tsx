import {
  DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIVISIONES_GENERO, ESTILOS, ORDEN_CLASES } from '../config/divisiones';
import { PAISES } from '../config/paises';
import { PELEADOR } from '../config/balance';
import { nombreClase } from '../domain/format';
import {
  ETIQUETA_ORDEN, FILTROS_VACIOS, filtrar, ordenar, type Filtros, type Orden,
} from '../domain/lista';
import { porVencer } from '../domain/peleador';
import { mapaRankings } from '../domain/rankings';
import type { ClaseId, Estilo, Peleador } from '../domain/types';
import { useGame } from '../store/game';
import { useUI } from '../store/ui';
import { Icon } from '../ui/Icon';
import { Chips, Sheet, Stepper, Tabs, TopBar, Vacio, useDebounced, useDobleToque } from '../ui/kit';
import { FighterCard } from './FighterCard';

type TabId = 'roster' | 'libres' | 'favoritos' | 'contratos' | 'todos';

export function Roster() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const { filtros, orden, tabRoster, setFiltros, setOrden, setTabRoster } = useUI();
  const tab: TabId = tabRoster;
  const [verFiltros, setVerFiltros] = useState(false);
  const [verOrden, setVerOrden] = useState(false);
  const [comparar, setComparar] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const [texto, setTexto] = useState(filtros.texto);
  const textoDeb = useDebounced(texto, 180);
  const scroller = useRef<HTMLDivElement>(null);

  const ranks = useMemo(() => mapaRankings(juego), [juego.divisiones]);
  const siglas = useMemo(() => new Map(juego.companias.map(c => [c.id, c.siglas])), [juego.companias]);

  const base = useMemo(() => {
    const act = juego.peleadores.filter(p => !p.retirado);
    switch (tab) {
      case 'roster': return act.filter(p => p.companiaId === juego.miId);
      case 'libres': return act.filter(p => !p.companiaId);
      case 'favoritos': return act.filter(p => p.favorito);
      case 'contratos': return act.filter(p => p.companiaId === juego.miId && porVencer(p));
      default: return act;
    }
  }, [juego.peleadores, juego.miId, tab]);

  const lista = useMemo(() => {
    const f: Filtros = { ...filtros, texto: textoDeb };
    return ordenar(filtrar(base, f, juego.miId), orden, ranks);
  }, [base, filtros, textoDeb, orden, ranks, juego.miId]);

  const cuenta = useMemo(() => ({
    roster: juego.peleadores.filter(p => !p.retirado && p.companiaId === juego.miId).length,
    contratos: juego.peleadores.filter(p => !p.retirado && p.companiaId === juego.miId && porVencer(p)).length,
  }), [juego.peleadores, juego.miId]);

  const virt = useVirtualizer({
    count: lista.length, getScrollElement: () => scroller.current, estimateSize: () => 128, overscan: 8,
  });

  const onTap = useCallback((p: Peleador) => {
    if (comparar) {
      setSel(s => (s.includes(p.id) ? s.filter(x => x !== p.id) : s.length >= 2 ? [s[1], p.id] : [...s, p.id]));
    } else nav(`/peleador/${p.id}`);
  }, [comparar, nav]);

  const activos = (Object.keys(FILTROS_VACIOS) as (keyof Filtros)[]).filter(k => k !== 'texto' && filtros[k] !== FILTROS_VACIOS[k]).length;

  return (
    <>
      <TopBar
        titulo="Peleadores" atras={false}
        derecha={
          <>
            <button className={`iconbtn ${comparar ? 'on' : ''}`} aria-label="Comparar" onClick={() => { setComparar(c => !c); setSel([]); }}><Icon name="compare" /></button>
            <button className={`iconbtn ${activos ? 'on' : ''}`} aria-label="Filtros" onClick={() => setVerFiltros(true)}><Icon name="filter" /></button>
            <button className="iconbtn" aria-label="Ordenar" onClick={() => setVerOrden(true)}><Icon name="sort" /></button>
          </>
        }
      />
      <Tabs<TabId>
        valor={tab}
        onChange={setTabRoster}
        items={[
          { id: 'roster', label: 'Mi roster', badge: cuenta.roster },
          { id: 'libres', label: 'Agentes libres' },
          { id: 'favoritos', label: 'Favoritos' },
          { id: 'contratos', label: 'Contratos', badge: cuenta.contratos },
          { id: 'todos', label: 'Todos' },
        ]}
      />
      <div style={{ padding: '10px 16px 8px' }}>
        <div className="search">
          <Icon name="search" />
          <input
            className="input" placeholder="Buscar por nombre o apodo" value={texto}
            onChange={e => { setTexto(e.target.value); setFiltros({ texto: e.target.value }); }}
          />
        </div>
        <div className="row between small muted" style={{ marginTop: 6 }}>
          <span>{lista.length} peleador{lista.length === 1 ? '' : 'es'}</span>
          {comparar && <span className="accent">Elige 2 para comparar</span>}
        </div>
      </div>

      <div ref={scroller} className="scroll flush">
        {lista.length === 0 ? (
          <Vacio
            titulo={tab === 'roster' ? 'Tu roster está vacío' : 'Sin resultados'}
            texto={tab === 'roster' ? 'Ve a "Agentes libres" y ficha a tu primer peleador.' : 'Prueba con otros filtros.'}
          />
        ) : (
          <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
            {virt.getVirtualItems().map(v => {
              const p = lista[v.index];
              return (
                <div key={p.id} style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${v.start}px)` }}>
                  <FighterCard
                    p={p} info={ranks.get(p.id)} unidades={juego.ajustes.unidades}
                    siglas={p.companiaId && p.companiaId !== juego.miId ? siglas.get(p.companiaId) : undefined}
                    modoSeleccion={comparar} seleccion={sel.includes(p.id)} onClick={onTap}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {comparar && (
        <div className="sticky-actions">
          <button className="btn primary" disabled={sel.length !== 2} onClick={() => nav(`/comparar/${sel[0]}/${sel[1]}`)}>
            Comparar ({sel.length}/2)
          </button>
        </div>
      )}

      {verFiltros && <FiltrosSheet onClose={() => setVerFiltros(false)} total={lista.length} />}
      {verOrden && <OrdenSheet orden={orden} onChange={setOrden} onClose={() => setVerOrden(false)} />}
    </>
  );
}

// ---------- Filtros ----------
function FiltrosSheet({ onClose, total }: { onClose: () => void; total: number }) {
  const juego = useGame(s => s.juego)!;
  const { filtros, setFiltros, limpiarFiltros } = useUI();
  const idioma = juego.ajustes.nombresDivision;
  const clases = filtros.genero ? DIVISIONES_GENERO[filtros.genero] : ORDEN_CLASES;
  const si = (b: boolean) => (b ? 'on' : '');
  return (
    <Sheet
      titulo="Filtros" completo onClose={onClose}
      pie={<><button className="btn" onClick={limpiarFiltros}>Limpiar</button><button className="btn primary" onClick={onClose}>Ver {total}</button></>}
    >
      <div className="stack">
        <div className="field"><span className="label">Género</span>
          <Chips valor={filtros.genero as 'M' | 'F' | ''} onChange={v => setFiltros({ genero: v, clase: '' })}
            items={[{ id: '', label: 'Todos' }, { id: 'M', label: 'Hombres' }, { id: 'F', label: 'Mujeres' }]} />
        </div>
        <div className="field"><span className="label">División</span>
          <Chips<ClaseId | ''> valor={filtros.clase} onChange={v => setFiltros({ clase: v })}
            items={[{ id: '', label: 'Todas' }, ...clases.map(c => ({ id: c, label: nombreClase(c, idioma) }))]} />
        </div>
        <div className="field"><span className="label">Compañía</span>
          <select className="select" value={filtros.compania} onChange={e => setFiltros({ compania: e.target.value })}>
            <option value="">Todas</option>
            <option value="mia">Mi compañía</option>
            <option value="libres">Agentes libres</option>
            {juego.companias.filter(c => !c.esMia).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field"><span className="label">Estilo</span>
          <select className="select" value={filtros.estilo} onChange={e => setFiltros({ estilo: e.target.value as Estilo | '' })}>
            <option value="">Todos</option>
            {(Object.keys(ESTILOS) as Estilo[]).map(e => <option key={e} value={e}>{ESTILOS[e].es}</option>)}
          </select>
        </div>
        <div className="field"><span className="label">Nacionalidad</span>
          <select className="select" value={filtros.pais} onChange={e => setFiltros({ pais: e.target.value })}>
            <option value="">Todas</option>
            {PAISES.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => <option key={p.code} value={p.code}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="field"><span className="label">Estatus</span>
          <select className="select" value={filtros.estatus} onChange={e => setFiltros({ estatus: e.target.value })}>
            <option value="">Todos</option>
            {PELEADOR.estatus.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
          </select>
        </div>
        <div className="row between">
          <div className="field"><span className="label">Edad mínima</span>
            <Stepper valor={filtros.edadMin} min={18} max={filtros.edadMax} onChange={v => setFiltros({ edadMin: v })} />
          </div>
          <div className="field"><span className="label">Edad máxima</span>
            <Stepper valor={filtros.edadMax} min={filtros.edadMin} max={50} onChange={v => setFiltros({ edadMax: v })} />
          </div>
        </div>
        <div className="chips">
          <button className={`chip ${si(filtros.disponibles)}`} onClick={() => setFiltros({ disponibles: !filtros.disponibles })}>Disponibles para pelear</button>
          <button className={`chip ${si(filtros.lesionados)}`} onClick={() => setFiltros({ lesionados: !filtros.lesionados })}>Lesionados</button>
          <button className={`chip ${si(filtros.porVencer)}`} onClick={() => setFiltros({ porVencer: !filtros.porVencer })}>Contrato por vencer</button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------- Orden múltiple (pulsación larga para reordenar, doble toque cambia dirección) ----------
function OrdenSheet({ orden, onChange, onClose }: { orden: Orden[]; onChange: (o: Orden[]) => void; onClose: () => void }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );
  const onEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const a = orden.findIndex(o => o.clave === e.active.id);
    const b = orden.findIndex(o => o.clave === e.over!.id);
    onChange(arrayMove(orden, a, b));
  };
  const cambiar = (clave: string, patch: Partial<Orden>) =>
    onChange(orden.map(o => (o.clave === clave ? { ...o, ...patch } : o)));
  return (
    <Sheet titulo="Ordenar por" completo onClose={onClose} pie={<button className="btn primary" onClick={onClose}>Listo</button>}>
      <p className="muted small" style={{ marginBottom: 10 }}>
        Marca los criterios que quieras usar. Mantén pulsado para cambiar su prioridad y toca dos veces para cambiar el sentido.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
        <SortableContext items={orden.map(o => o.clave)} strategy={verticalListSortingStrategy}>
          {orden.map(o => <FilaOrden key={o.clave} o={o} onChange={cambiar} />)}
        </SortableContext>
      </DndContext>
    </Sheet>
  );
}

function FilaOrden({ o, onChange }: { o: Orden; onChange: (clave: string, patch: Partial<Orden>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: o.clave });
  const doble = useDobleToque(() => onChange(o.clave, { desc: !o.desc }));
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      className={`orow ${o.activo ? '' : 'off'}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition, zIndex: isDragging ? 5 : undefined, boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,.5)' : undefined,
      }}
      onClick={doble}
    >
      <span className="grip">≡</span>
      <button className={`check ${o.activo ? 'on' : ''}`} aria-label="Usar criterio" onClick={e => { e.stopPropagation(); onChange(o.clave, { activo: !o.activo }); }}>
        {o.activo && <Icon name="check" />}
      </button>
      <span className="grow" style={{ fontWeight: 600 }}>{ETIQUETA_ORDEN[o.clave]}</span>
      <button className="pill accent" onClick={e => { e.stopPropagation(); onChange(o.clave, { desc: !o.desc }); }}>
        {o.desc ? '↓ Mayor a menor' : '↑ Menor a mayor'}
      </button>
    </div>
  );
}

