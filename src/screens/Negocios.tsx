import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIAS, CAT_POR_ID, FONDOS, TIPOS_TV, TV_POR_ID, YOUTUBE } from '../config/negocios';
import { bandera, nombrePais } from '../config/paises';
import {
  activos, capacidadPatrocinios, capacidadTV, costoRomper, descObjetivo, ingresoAnualContratos, interesDe, nombreRegion,
  ofertas as ofertasDe, popGlobal, resumenPago,
} from '../domain/negocios';
import { dinero, fechaCorta, fecha, numeroCorto } from '../domain/format';
import type { Negocio } from '../domain/types';
import { negocios as acc, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Bar, Confirmar, Sheet, Stepper, Tabs, TopBar, Vacio } from '../ui/kit';
import { Finanzas } from './Finanzas';

type TabId = 'pat' | 'tv' | 'ofertas' | 'fin';

const MODALIDAD: Record<string, string> = {
  unico: 'Evento único', paquete: 'Paquete de eventos', residencia: 'Residencia anual', capital: 'Inversión de capital', subsidio: 'Subsidio por evento',
};

export const rubroLabel = (n: Negocio): string =>
  n.tipo === 'patrocinio' ? CAT_POR_ID[n.rubro]?.nombre ?? n.rubro : n.tipo === 'tv' ? TV_POR_ID[n.rubro]?.nombre ?? n.rubro : MODALIDAD[n.rubro] ?? n.rubro;

const TIPO_LABEL = { patrocinio: 'Patrocinio', tv: 'Transmisión', inversion: 'Inversionista' } as const;
const TIPO_COLOR = { patrocinio: 'var(--accent)', tv: 'var(--def)', inversion: 'var(--pop)' } as const;

export function Negocios() {
  const juego = useGame(s => s.juego)!;
  const [tab, setTab] = useState<TabId>('pat');
  const pend = ofertasDe(juego);
  const pop = popGlobal(juego);
  const nPat = activos(juego, 'patrocinio').length;
  const nTV = activos(juego, 'tv').length;
  return (
    <>
      <TopBar titulo="Negocios" atras={false} />
      <Tabs<TabId> valor={tab} onChange={setTab} items={[
        { id: 'pat', label: 'Patrocinios' }, { id: 'tv', label: 'Televisión' }, { id: 'ofertas', label: 'Ofertas', badge: pend.length }, { id: 'fin', label: 'Finanzas' },
      ]} />
      {tab !== 'fin' && (
        <div style={{ padding: '10px 16px 0' }}>
          <div className="stat-grid">
            <div className="stat"><div className="label">Contratos al año</div><div className="big" style={{ fontSize: 26, color: 'var(--accent)' }}>{dinero(ingresoAnualContratos(juego))}</div></div>
            <div className="stat"><div className="label">Activos</div><div className="big" style={{ fontSize: 26 }}>{nPat}/{capacidadPatrocinios(pop)}<span className="muted" style={{ fontSize: 15 }}> pat.</span> {nTV}/{capacidadTV(pop)}<span className="muted" style={{ fontSize: 15 }}> TV</span></div></div>
          </div>
        </div>
      )}
      <div className="scroll">
        {tab === 'pat' && <Patrocinios onOfertas={() => setTab('ofertas')} />}
        {tab === 'tv' && <Television onOfertas={() => setTab('ofertas')} />}
        {tab === 'ofertas' && <Ofertas />}
        {tab === 'fin' && <Finanzas embed />}
      </div>
    </>
  );
}

// ---------- Patrocinios ----------
function Patrocinios({ onOfertas }: { onOfertas: () => void }) {
  const juego = useGame(s => s.juego)!;
  const pop = popGlobal(juego);
  const [det, setDet] = useState<Negocio | null>(null);
  return (
    <div className="stack">
      <p className="muted small">Cada categoría puede tener un patrocinador <b>exclusivo</b> o hasta 3 no exclusivos. Todo se paga por contrato: tú decides qué firmar.</p>
      {CATEGORIAS.map(c => {
        const act = juego.negocios.filter(n => n.tipo === 'patrocinio' && n.rubro === c.id && n.estado === 'activo');
        const of = juego.negocios.find(n => n.tipo === 'patrocinio' && n.rubro === c.id && n.estado === 'oferta');
        const bloqueada = pop < c.popMin;
        return (
          <div key={c.id} className="card" style={{ opacity: bloqueada ? 0.55 : 1 }}>
            <div className="row between">
              <div><div className="mid">{c.nombre}</div>{c.perkTexto && <div className="muted small">{c.perkTexto}</div>}</div>
              {bloqueada ? <span className="pill"><Icon name="lock" />Pop. {c.popMin}</span> : act.length ? <span className="pill ok">{act.length} activo{act.length > 1 ? 's' : ''}</span> : of ? <span className="pill warn">Oferta</span> : <span className="pill">Libre</span>}
            </div>
            {act.map(n => (
              <button key={n.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} onClick={() => setDet(n)}>
                <span><b>{n.nombre}</b><div className="muted small">{n.exclusivo ? 'Exclusivo · ' : ''}vence {fechaCorta(n.semanaFin ?? 0)}</div></span>
                <span className="v accent">{n.pagoAnual ? `${dinero(n.pagoAnual * (n.factorCripto ?? 1))}/año` : `${dinero(n.pagoPorEvento)}/evento`}</span>
              </button>
            ))}
            {of && !act.length && (
              <button className="kv" style={{ width: '100%', textAlign: 'left' }} onClick={onOfertas}>
                <span className="k">{of.nombre} ofrece</span><span className="v">{resumenPago(of)}</span>
              </button>
            )}
          </div>
        );
      })}
      {det && <Detalle n={det} onClose={() => setDet(null)} />}
    </div>
  );
}

// ---------- Televisión ----------
function Television({ onOfertas }: { onOfertas: () => void }) {
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const nav = useNavigate();
  const [det, setDet] = useState<Negocio | null>(null);
  const yt = juego.youtube;
  const tvs = activos(juego, 'tv');
  const espera = Math.max(0, juego.cooldownPropuestas - juego.semanaAbs);
  const monetiza = yt.subs >= YOUTUBE.monetizaDesdeSubs;

  return (
    <div className="stack">
      <div className="card">
        <div className="row between"><h3 style={{ marginBottom: 0 }}>Tu canal de YouTube</h3><span className="pill ok">Siempre abierto</span></div>
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <div><div className="label">Suscriptores</div><div className="big" style={{ fontSize: 28 }}>{numeroCorto(yt.subs)}</div></div>
          <div><div className="label">Vistas totales</div><div className="big" style={{ fontSize: 28 }}>{numeroCorto(yt.vistas)}</div></div>
          <div><div className="label">Ingresos</div><div className="big" style={{ fontSize: 28, color: 'var(--accent)' }}>{dinero(yt.ingresos)}</div></div>
          <div><div className="label">Clips virales</div><div className="big" style={{ fontSize: 28 }}>{yt.virales}</div></div>
        </div>
        <div className="muted small" style={{ marginTop: 10 }}>
          Nadie te contrató todavía y no pasa nada: en YouTube hay más gente que en cualquier canal. Cada evento sube vistas, suscriptores, fans y popularidad, y con más suscriptores te llegan más ofertas.
          {monetiza ? ` Ya está monetizado (~$${YOUTUBE.cpm} por cada mil vistas).` : ` Se monetiza a partir de ${YOUTUBE.monetizaDesdeSubs.toLocaleString('en-US')} suscriptores.`}
        </div>
      </div>

      <div className="card">
        <h3>Contratos de transmisión activos</h3>
        {tvs.length === 0 && <p className="muted small">Aún no tienes ninguno. Revisa las ofertas o pide propuestas.</p>}
        {tvs.map(n => (
          <button key={n.id} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} onClick={() => setDet(n)}>
            <span><b>{n.nombre}</b><div className="muted small">{rubroLabel(n)} · {nombreRegion(n.region)}{n.exclusivo ? ' · exclusivo' : ''}</div></span>
            <span className="v accent">{n.pagoAnual ? `${dinero(n.pagoAnual)}/año` : n.pagoPorEvento ? `${dinero(n.pagoPorEvento)}/evento` : 'Pago único'}</span>
          </button>
        ))}
      </div>

      <button className="btn primary" disabled={espera > 0} onClick={() => { const r = acc.pedir(); setAviso(r.error ?? `Tu agente consiguió ${r.n} propuesta${r.n > 1 ? 's' : ''}.`); if (!r.error) onOfertas(); }}>
        <Icon name="briefcase" />{espera > 0 ? `Pedir propuestas (en ${espera} sem.)` : 'Pedir propuestas a patrocinadores, cadenas e inversionistas'}
      </button>

      <div className="section-title" style={{ margin: '8px 0 0' }}>Mercado de transmisión</div>
      {TIPOS_TV.map(t => {
        const reg = t.global ? popGlobal(juego) : Math.max(...Object.values(juego.companias.find(c => c.esMia)!.popRegion));
        const abierto = reg >= t.popMin;
        const act = tvs.filter(n => n.rubro === t.id).length;
        const of = juego.negocios.some(n => n.tipo === 'tv' && n.rubro === t.id && n.estado === 'oferta');
        return (
          <div key={t.id} className="card" style={{ opacity: abierto ? 1 : 0.55 }}>
            <div className="row between">
              <div className="mid">{t.nombre}</div>
              {!abierto ? <span className="pill"><Icon name="lock" />Pop. {t.popMin}</span> : act ? <span className="pill ok">Activo</span> : of ? <span className="pill warn">Oferta</span> : <span className="pill">Disponible</span>}
            </div>
            <div className="muted small" style={{ margin: '4px 0 6px' }}>{t.descripcion}</div>
            <div className="small">
              <b>{t.estructura === 'anual' ? 'Pago fijo anual' : t.estructura === 'evento' ? 'Pago por evento' : t.estructura === 'ppv' ? 'Garantía + % del PPV' : 'Pago único'}</b>
              {t.eventosMin ? ` · mínimo ${t.eventosMin} eventos al año` : ''}{t.exclusivoPosible ? ' · exclusivo posible (+45%)' : ''}{t.global ? ' · cobertura mundial' : ' · por región'}
            </div>
            <div className="muted small">{t.perkTexto}</div>
          </div>
        );
      })}
      <button className="btn" onClick={() => nav('/finanzas')}>Ver finanzas completas</button>
      {det && <Detalle n={det} onClose={() => setDet(null)} />}
    </div>
  );
}

// ---------- Ofertas ----------
function Ofertas() {
  const juego = useGame(s => s.juego)!;
  const [filtro, setFiltro] = useState<'todas' | Negocio['tipo']>('todas');
  const [contra, setContra] = useState<Negocio | null>(null);
  const lista = useMemo(() => ofertasDe(juego).filter(n => filtro === 'todas' || n.tipo === filtro).sort((a, b) => a.semanaVence - b.semanaVence), [juego, filtro]);
  const pasadas = juego.negocios.filter(n => ['rechazado', 'expirado', 'terminado', 'roto'].includes(n.estado)).slice(-6).reverse();
  return (
    <div className="stack">
      <div className="chips">
        {([['todas', 'Todas'], ['patrocinio', 'Patrocinios'], ['tv', 'Transmisión'], ['inversion', 'Inversionistas']] as const).map(([k, l]) => (
          <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>{l}</button>
        ))}
      </div>
      {lista.length === 0 && <Vacio titulo="Sin ofertas por ahora" texto="Llegan solas con el tiempo y más seguido si creces. También puedes pedir propuestas en la pestaña Televisión." />}
      {lista.map(n => <OfertaCard key={n.id} n={n} onContra={() => setContra(n)} />)}
      {pasadas.length > 0 && (
        <div className="card">
          <h3>Historial reciente</h3>
          {pasadas.map(n => <div key={n.id} className="kv"><span className="k">{n.nombre} · {rubroLabel(n)}</span><span className="v">{n.estado === 'terminado' ? `cobraste ${dinero(n.pagoTotal)}` : n.estado}</span></div>)}
        </div>
      )}
      {contra && <ContraSheet n={contra} onClose={() => setContra(null)} />}
    </div>
  );
}

export function OfertaCard({ n, onContra }: { n: Negocio; onContra: () => void }) {
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const sem = Math.max(0, n.semanaVence - juego.semanaAbs);
  const fondo = n.tipo === 'inversion' ? FONDOS.find(f => f.pais === n.inv?.pais) : undefined;
  const interes = interesDe(n);
  return (
    <div className="card stack" style={{ gap: 10, borderColor: TIPO_COLOR[n.tipo] }}>
      <div className="row between">
        <span className="pill" style={{ color: TIPO_COLOR[n.tipo] }}>{TIPO_LABEL[n.tipo]}</span>
        <span className="muted small">Vence en {sem} sem.</span>
      </div>
      <div>
        <div className="mid" style={{ fontSize: 26 }}>{n.inv ? bandera(n.inv.pais) : ''} {n.nombre}</div>
        <div className="muted small">{rubroLabel(n)}{n.tipo === 'tv' ? ` · ${nombreRegion(n.region)}` : ''}{n.renovacion ? ' · renovación' : ''}</div>
      </div>
      <p className="muted small">{n.detalle}</p>
      <div className="estimate">
        {n.pagoAnual > 0 && <div className="row between"><span className="muted">Pago anual</span><b className="num">{dinero(n.pagoAnual)}</b></div>}
        {n.pagoPorEvento > 0 && <div className="row between"><span className="muted">Por evento</span><b className="num">{dinero(n.pagoPorEvento)}</b></div>}
        {n.pagoUnico > 0 && <div className="row between"><span className="muted">{n.inv?.modalidad === 'capital' ? 'Capital inicial' : 'Al firmar'}</span><b className="num">{dinero(n.pagoUnico)}</b></div>}
        <div className="row between"><span className="muted">Duración</span><b className="num">{n.duracionAnios} año{n.duracionAnios > 1 ? 's' : ''}</b></div>
        {n.exclusivo && <div className="row between"><span className="muted">Exclusividad</span><b>Sí</b></div>}
        {n.ppvPct != null && <div className="row between"><span className="muted">Se quedan del PPV</span><b>{Math.round(n.ppvPct * 100)}%</b></div>}
        {n.eventosMinAnio ? <div className="row between"><span className="muted">Mínimo de eventos al año</span><b>{n.eventosMinAnio}</b></div> : null}
        {n.inv && n.inv.modalidad === 'capital' && <div className="row between"><span className="muted">Se quedan de tus utilidades</span><b>{Math.round(n.inv.pctUtilidades * 100)}%</b></div>}
        {n.inv && n.inv.eventos > 0 && <div className="row between"><span className="muted">Eventos incluidos</span><b>{n.inv.eventos}{fondo ? ` en ${fondo.ciudad}` : ''}</b></div>}
        {n.inv && ['unico', 'paquete', 'residencia'].includes(n.inv.modalidad) && <div className="row between"><span className="muted">Primer evento hacia</span><b>{fecha(n.inv.semanaObjetivo)}</b></div>}
      </div>
      {n.inv && n.inv.condiciones.length > 0 && (
        <div>
          <div className="label">Condiciones por evento</div>
          {n.inv.condiciones.map((c, i) => <div key={i} className="small">• {c.tipo === 'titulo' ? 'Pelea de campeonato en la cartelera' : c.tipo === 'estrellas' ? `${c.meta} peleador(es) de nivel Estelar o superior` : `Un peleador de ${nombrePais(n.inv!.pais)}`}</div>)}
          <div className="muted small">Si no las cumples pagan solo la mitad y baja tu reputación. Mientras dure el contrato se desbloquean las sedes de {nombrePais(n.inv.pais)}.</div>
        </div>
      )}
      {n.objetivos.length > 0 && (
        <div>
          <div className="label">Objetivos con bono</div>
          {n.objetivos.map(o => <div key={o.id} className="small">• {descObjetivo(o)} → <b className="accent">{dinero(o.bono)}</b></div>)}
        </div>
      )}
      <div className="muted small">Interés en negociar: <b style={{ color: interes === 'alto' ? 'var(--ok)' : interes === 'medio' ? 'var(--warn)' : 'var(--muted)' }}>{interes}</b></div>
      <div className="row">
        <button className="btn small primary grow" onClick={() => { const e = acc.aceptar(n.id); setAviso(e ?? 'Contrato firmado'); }}>Aceptar</button>
        <button className="btn small grow" disabled={n.contraIntentada} onClick={onContra}>Contraofertar</button>
        <button className="btn small danger grow" onClick={() => acc.rechazar(n.id)}>Rechazar</button>
      </div>
    </div>
  );
}

function ContraSheet({ n, onClose }: { n: Negocio; onClose: () => void }) {
  const setAviso = useGame(s => s.setAviso);
  const [pct, setPct] = useState(15);
  const f = 1 + pct / 100;
  return (
    <Sheet titulo="Contraoferta" onClose={onClose} pie={<button className="btn primary" onClick={() => { const r = acc.contraofertar(n.id, pct / 100); setAviso(r.mensaje); onClose(); }}>Pedir +{pct}%</button>}>
      <div className="stack">
        <p className="muted">Pides más dinero a <b style={{ color: 'var(--text)' }}>{n.nombre}</b>. Solo puedes negociar una vez: si te pasas pueden retirarse.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Stepper valor={pct} min={5} max={60} paso={5} formato={v => `+${v}%`} onChange={setPct} /></div>
        <div className="estimate">
          {n.pagoAnual > 0 && <div className="row between"><span className="muted">Pago anual</span><b className="num">{dinero(n.pagoAnual * f)}</b></div>}
          {n.pagoPorEvento > 0 && <div className="row between"><span className="muted">Por evento</span><b className="num">{dinero(n.pagoPorEvento * f)}</b></div>}
          {n.pagoUnico > 0 && <div className="row between"><span className="muted">Al firmar</span><b className="num">{dinero(n.pagoUnico * f)}</b></div>}
        </div>
        <div className="muted small">Interés en negociar: <b>{interesDe(n)}</b>. Pedir poco es seguro; pedir mucho es un volado.</div>
      </div>
    </Sheet>
  );
}

// ---------- Detalle de un contrato activo ----------
function Detalle({ n, onClose }: { n: Negocio; onClose: () => void }) {
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const [conf, setConf] = useState(false);
  const costo = costoRomper(juego, n);
  const restan = Math.max(0, Math.ceil(((n.semanaFin ?? juego.semanaAbs) - juego.semanaAbs) / 52 * 10) / 10);
  return (
    <Sheet titulo={n.nombre} completo onClose={onClose}>
      <div className="stack">
        <div className="card">
          <div className="kv"><span className="k">Tipo</span><span className="v">{TIPO_LABEL[n.tipo]} · {rubroLabel(n)}</span></div>
          <div className="kv"><span className="k">Región</span><span className="v">{nombreRegion(n.region)}</span></div>
          <div className="kv"><span className="k">Pago</span><span className="v">{resumenPago({ ...n, pagoAnual: n.pagoAnual * (n.factorCripto ?? 1) })}</span></div>
          <div className="kv"><span className="k">Cobrado hasta hoy</span><span className="v accent">{dinero(n.pagoTotal)}</span></div>
          <div className="kv"><span className="k">Vigencia</span><span className="v">hasta {n.semanaFin != null ? fecha(n.semanaFin) : '—'} ({restan} años)</span></div>
          {n.exclusivo && <div className="kv"><span className="k">Exclusividad</span><span className="v">Sí</span></div>}
          {n.eventosMinAnio ? <div className="kv"><span className="k">Eventos este año</span><span className="v">{n.eventosPeriodo} / {n.eventosMinAnio}</span></div> : null}
          {n.factorCripto != null && <div className="kv"><span className="k">Valor del pago (mercado)</span><span className="v">{Math.round(n.factorCripto * 100)}%</span></div>}
        </div>
        <p className="muted small">{n.detalle}</p>
        {n.objetivos.length > 0 && (
          <div className="card stack">
            <h3 style={{ marginBottom: 0 }}>Objetivos</h3>
            {n.objetivos.map(o => (
              <div key={o.id}>
                <div className="row between small"><span>{descObjetivo(o)}</span><b className={o.cumplido ? 'neto-pos' : ''}>{o.cumplido ? '✓ ' : ''}{dinero(o.bono)}</b></div>
                <div style={{ marginTop: 4 }}><Bar valor={Math.min(o.progreso, o.meta)} max={o.meta} color={o.cumplido ? 'var(--ok)' : 'var(--accent)'} /></div>
                <div className="muted small">{Math.min(o.progreso, o.meta)} / {o.meta}</div>
              </div>
            ))}
          </div>
        )}
        {n.inv && (
          <div className="card">
            <h3>Acuerdo con el inversionista</h3>
            <div className="kv"><span className="k">Eventos hechos</span><span className="v">{n.inv.eventosHechos} / {n.inv.eventos || '—'}</span></div>
            {n.inv.modalidad === 'capital' && <div className="kv"><span className="k">Se quedan de tus utilidades</span><span className="v">{Math.round(n.inv.pctUtilidades * 100)}%</span></div>}
          </div>
        )}
        <button className="btn danger" onClick={() => setConf(true)}>Romper contrato · multa {dinero(costo)}</button>
      </div>
      {conf && (
        <Confirmar titulo="¿Romper el contrato?" peligro confirmar="Romper"
          texto={`Pagarás ${dinero(costo)} de penalización y tu reputación bajará. ${n.nombre} no volverá a ofrecerte nada por un buen rato.`}
          onNo={() => setConf(false)} onSi={() => { const e = acc.romper(n.id); setConf(false); if (e) setAviso(e); else onClose(); }} />
      )}
    </Sheet>
  );
}

