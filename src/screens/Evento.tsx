import {
  DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ECONOMIA } from '../config/economia';
import { SEDE_POR_ID } from '../config/sedes';
import { bandera } from '../config/paises';
import { costosEvento, estaCompleto, estimarBoletos, hypeEvento, sedeDe } from '../domain/eventos';
import { dinero, fecha, numeroCorto } from '../domain/format';
import type { Evento as EventoT, Pelea } from '../domain/types';
import { eventos as acc, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Confirmar, Seg, Stepper, Tabs, TopBar, Vacio } from '../ui/kit';
import { BoutCard, etiquetaBout } from './BoutCard';
import { ResultadosEvento } from './ResultadosEvento';
import { etiquetaPartido } from '../domain/torneos';

type TabId = 'cartelera' | 'boletos' | 'historial';

export function Evento() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const e = juego.eventos.find(x => x.id === Number(id));
  if (!e) return (<><TopBar titulo="Evento" /><Vacio titulo="No se encontró el evento" /></>);
  if (e.estado === 'realizado') return <ResultadosEvento e={e} />;
  if (e.estado === 'cancelado') return (<><TopBar titulo={e.nombre} /><Vacio titulo="Evento cancelado" texto="Este evento ya no se realizará." /></>);
  return <Borrador e={e} />;
}

function Borrador({ e }: { e: EventoT }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const setAviso = useGame(s => s.setAviso);
  const [tab, setTab] = useState<TabId>('cartelera');
  const [conf, setConf] = useState<null | 'auto' | 'borrar' | 'cancelar'>(null);
  const completo = estaCompleto(e);
  const esHoy = e.semana === juego.semanaAbs;

  return (
    <>
      <TopBar titulo={e.nombre} />
      <Tabs<TabId> valor={tab} onChange={setTab} items={[{ id: 'cartelera', label: 'Cartelera' }, { id: 'boletos', label: 'Boletos' }, { id: 'historial', label: 'Historial' }]} />
      <div className="scroll">
        {tab === 'cartelera' && <Cartelera e={e} />}
        {tab === 'boletos' && <Boletos e={e} onCancelar={() => setConf('cancelar')} />}
        {tab === 'historial' && <HistorialEventos />}
      </div>

      {tab === 'cartelera' && (
        <div className="sticky-actions">
          <div className="row">
            {e.tipo !== 'torneo' && <button className="iconbtn" aria-label="Matchmaking automático" style={{ width: 52, height: 48 }} onClick={() => setConf('auto')}><Icon name="bolt" /></button>}
            <button className="iconbtn" aria-label="Borrar" style={{ width: 52, height: 48 }} onClick={() => setConf(e.tipo === 'torneo' ? 'cancelar' : 'borrar')}><Icon name="trash" /></button>
            {esHoy && completo ? (
              <button className="btn primary grow" onClick={() => nav(`/noche/${e.id}`)}><Icon name="bolt" />Noche de pelea</button>
            ) : (
              <button className="btn primary grow" disabled={!completo || e.confirmado || e.tipo === 'torneo'} onClick={() => { const r = acc.confirmar(e.id); setAviso(r ?? 'Evento confirmado'); }}>
                <Icon name="check" />{e.confirmado || e.tipo === 'torneo' ? 'Confirmado' : 'Confirmar'}
              </button>
            )}
          </div>
          {!completo && <div className="muted small center">Llena todos los combates para confirmar el evento · {fecha(e.semana)}</div>}
          {completo && !esHoy && <div className="muted small center">{e.confirmado ? 'Listo' : 'Cartelera completa'} · {fecha(e.semana)}</div>}
        </div>
      )}

      {conf === 'auto' && (
        <Confirmar titulo="Matchmaking automático" confirmar="Armar cartelera"
          texto="Se reemplazará la cartelera actual con peleas sugeridas por ranking, descanso, estilos y hype. ¿Continuar?"
          onNo={() => setConf(null)}
          onSi={() => { const r = acc.matchmaking(e.id); setConf(null); setAviso(r.error ?? (r.avisos.length ? r.avisos.join(' ') : `Cartelera armada: ${r.armadas} combates.`)); }} />
      )}
      {conf === 'borrar' && (
        <div className="overlay center" onClick={() => setConf(null)}>
          <div className="dialog" onClick={ev => ev.stopPropagation()}>
            <h2>¿Qué quieres borrar?</h2>
            <p>Puedes dejar el evento y quitar solo los combates, o eliminar el evento completo del calendario.</p>
            <div className="stack">
              <button className="btn" onClick={() => { acc.borrarCartelera(e.id); setConf(null); }}>Quitar los combates</button>
              <button className="btn danger" onClick={() => setConf('cancelar')}>Eliminar el evento</button>
              <button className="btn" onClick={() => setConf(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {conf === 'cancelar' && (
        <Confirmar titulo="¿Eliminar el evento?" peligro confirmar="Eliminar evento" texto="Se elimina del calendario junto con su cartelera. Tus peleadores quedan libres para otros eventos."
          onNo={() => setConf(null)} onSi={() => { acc.cancelar(e.id); setConf(null); nav('/eventos', { replace: true }); }} />
      )}
    </>
  );
}

// ---------- Cartelera ----------
function FilaBout({ b, i, total, e }: { b: Pelea; i: number; total: number; e: EventoT }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id, disabled: !!b.torneoId });
  const t = juego.torneos.find(x => x.id === b.torneoId);
  const etiqueta = t && b.ronda != null && b.slot != null ? etiquetaPartido(t.tam, b.ronda, b.slot) : etiquetaBout(i, total);
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners} className="dragrow"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition, zIndex: isDragging ? 5 : undefined, position: 'relative' }}
    >
      <BoutCard j={juego} b={b} etiqueta={etiqueta} onClick={b.torneoId ? undefined : () => nav(`/evento/${e.id}/pelea/${b.id}`)} />
    </div>
  );
}

function Cartelera({ e }: { e: EventoT }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );
  const onEnd = (ev: DragEndEvent) => {
    if (!ev.over || ev.active.id === ev.over.id) return;
    const a = e.cartelera.findIndex(b => b.id === ev.active.id);
    const b = e.cartelera.findIndex(x => x.id === ev.over!.id);
    acc.reordenar(e.id, arrayMove(e.cartelera, a, b).map(x => x.id));
  };
  return (
    <div className="stack">
      <div className="muted small center">Mantén pulsado un combate para reordenar. El de abajo es el estelar.</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
        <SortableContext items={e.cartelera.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {e.cartelera.map((b, i) => <FilaBout key={b.id} b={b} i={i} total={e.cartelera.length} e={e} />)}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- Boletos y configuración ----------
function Boletos({ e, onCancelar }: { e: EventoT; onCancelar: () => void }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const sede = sedeDe(e);
  const [nombre, setNombre] = useState(e.nombre);
  useEffect(() => setNombre(e.nombre), [e.nombre]);
  const hype = hypeEvento(juego, e);
  const est = estimarBoletos(juego, e);
  const costos = costosEvento(juego, e, hype);
  const ingresos = est.taquilla + costos.transmision;
  const neto = ingresos - costos.total;
  const paso = e.precio < 50 ? 1 : e.precio < 200 ? 5 : e.precio < 1000 ? 25 : 100;
  const llenado = sede.aforo ? est.vendidos / sede.aforo : 0;

  return (
    <div className="stack">
      <div className="card stack">
        {e.tipo !== 'torneo' ? (
          <>
            <div className="field"><span className="label">Tipo de evento</span>
              <Seg<'noche' | 'ppv'> valor={e.tipo as 'noche' | 'ppv'} onChange={t => acc.configurar(e.id, { tipo: t })} items={[{ id: 'noche', label: 'Fight Night' }, { id: 'ppv', label: 'Numerado (PPV)' }]} />
            </div>
            <div className="row between">
              <span className="label">Combates (máx. {ECONOMIA.peleasMax})</span>
              <Stepper valor={e.nPeleas} min={ECONOMIA.peleasMin} max={ECONOMIA.peleasMax} onChange={v => acc.configurar(e.id, { nPeleas: v })} />
            </div>
          </>
        ) : (
          <div className="alert"><Icon name="trophy" /><div>Evento de torneo: sus combates los define la llave del torneo.</div></div>
        )}
        <div className="field"><span className="label">Nombre del evento</span>
          <input className="input" value={nombre} maxLength={40} onChange={ev => setNombre(ev.target.value)} onBlur={() => nombre.trim() && nombre !== e.nombre && acc.configurar(e.id, { nombre })} />
        </div>
      </div>

      <button className="card tap" style={{ textAlign: 'left' }} onClick={() => nav(`/evento/${e.id}/sede`)}>
        <div className="label">Sede</div>
        <div className="row between" style={{ marginTop: 4 }}>
          <div>
            <div className="mid">{sede.nombre}</div>
            <div className="muted small">{sede.ciudad} {bandera(sede.pais)} · Aforo {sede.aforo.toLocaleString('en-US')} · Renta {dinero(sede.costo)}</div>
          </div>
          <span className="muted"><Icon name="chevron" /></span>
        </div>
      </button>

      <div className="card stack">
        <div className="row between">
          <span className="label">Precio del boleto</span>
          <Stepper valor={e.precio} min={ECONOMIA.precio.min} max={ECONOMIA.precio.max} paso={paso} formato={dinero} editable onChange={v => acc.configurar(e.id, { precio: v })} />
        </div>
        <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => acc.configurar(e.id, { precio: est.precioSugerido })}>
          Sugerir precio: {dinero(est.precioSugerido)}
        </button>
        <div className="estimate">
          <div className="row between"><span className="muted">Boletos vendidos (est.)</span><b className="num">{est.vendidos.toLocaleString('en-US')} / {est.aforo.toLocaleString('en-US')}</b></div>
          <div style={{ margin: '8px 0' }}>
            <div className="bar thick" style={{ '--c': llenado > 0.9 ? 'var(--ok)' : llenado > 0.5 ? 'var(--accent)' : 'var(--warn)' } as React.CSSProperties}><i style={{ width: `${Math.min(100, llenado * 100)}%` }} /></div>
          </div>
          <div className="row between"><span className="muted">Taquilla</span><b className="num">{dinero(est.taquilla)}</b></div>
          <div className="muted small" style={{ marginTop: 6 }}>
            Hype de la cartelera {hype}/100 · Popularidad en la región {Math.round(est.popRegion)} · Precio de referencia {dinero(est.precioRef)}
            {est.bonusLocal > 0 ? ` · Local: +${Math.round(est.bonusLocal * 100)}%` : ''}
          </div>
          {est.vendidos < sede.aforo * 0.35 && <div className="small" style={{ color: 'var(--warn)', marginTop: 6 }}>Quedarían muchos asientos vacíos: baja el precio o elige una sede más chica.</div>}
        </div>
      </div>

      <div className="card">
        <h3>Costos y balance estimado</h3>
        <div className="kv"><span className="k">Renta de la sede</span><span className="v">{dinero(costos.renta)}</span></div>
        <div className="kv"><span className="k">Producción</span><span className="v">{dinero(costos.produccion)}</span></div>
        {costos.viaje > 0 && <div className="kv"><span className="k">Viaje</span><span className="v">{dinero(costos.viaje)}</span></div>}
        <div className="kv"><span className="k">Bolsas</span><span className="v">{dinero(costos.bolsas)}</span></div>
        <div className="kv"><span className="k">Bonos por victoria (est.)</span><span className="v">{dinero(costos.bonosVictoria)}</span></div>
        <div className="kv"><span className="k">Costo total</span><span className="v">{dinero(costos.total)}</span></div>
        <div className="kv"><span className="k">Transmisión digital (est.)</span><span className="v">{dinero(costos.transmision)}</span></div>
        <div className="kv"><span className="k">Neto estimado</span><span className={`v ${neto >= 0 ? 'neto-pos' : 'neto-neg'}`}>{dinero(neto, true)}</span></div>
        <p className="muted small" style={{ marginTop: 8 }}>La plataforma de TV, el PPV y los patrocinios llegan en la Fase 5; mientras tanto la transmisión digital aporta un ingreso base. Aforo de {numeroCorto(sede.aforo)}.</p>
      </div>

      <button className="btn danger" onClick={onCancelar}><Icon name="trash" />Eliminar evento</button>
      <span className="muted small center">{SEDE_POR_ID[e.sedeId]?.tipo === 'estadio' ? 'Estadio al aire libre: riesgo de mal clima y mayor costo de producción.' : ''}</span>
    </div>
  );
}

function HistorialEventos() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const pasados = juego.eventos.filter(e => e.estado === 'realizado').sort((a, b) => b.semana - a.semana);
  if (!pasados.length) return <Vacio titulo="Aún no hay eventos realizados" texto="Cuando hagas tu primera Noche de pelea aparecerá aquí con sus resultados." />;
  return (
    <div className="card">
      {pasados.map(e => {
        const main = e.cartelera[e.cartelera.length - 1];
        const a = juego.peleadores.find(p => p.id === main.aId);
        const c = juego.peleadores.find(p => p.id === main.bId);
        return (
          <button key={e.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} onClick={() => nav(`/evento/${e.id}`)}>
            <span>
              <div style={{ fontWeight: 700 }}>{e.nombre}</div>
              <div className="muted small">{a?.apellido} vs {c?.apellido} · {SEDE_POR_ID[e.sedeId]?.nombre}</div>
            </span>
            <span className={`v ${(e.finanzas?.neto ?? 0) >= 0 ? 'neto-pos' : 'neto-neg'}`}>{dinero(e.finanzas?.neto ?? 0, true)}</span>
          </button>
        );
      })}
    </div>
  );
}

export { HistorialEventos };
