import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DIVISIONES_GENERO } from '../config/divisiones';
import { eventoDeSemana } from '../domain/eventos';
import { fecha, nombreClase } from '../domain/format';
import { estrellasCalif, nombreCompleto, recordTxt } from '../domain/peleador';
import { elegibles, etiquetaPartido, nombreRonda, numRondas } from '../domain/torneos';
import type { ClaseId, Genero, Juego, Torneo as TorneoT } from '../domain/types';
import { torneos, useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Chips, Confirmar, Seg, Sheet, Stepper, TopBar, Vacio, Estrellas } from '../ui/kit';

const ESTADO: Record<TorneoT['estado'], string> = {
  cupos: 'Elegir participantes', llaves: 'Listo para programar', en_curso: 'En curso', terminado: 'Terminado',
};

export function Torneos() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [nuevo, setNuevo] = useState(false);
  return (
    <>
      <TopBar titulo="Torneos" derecha={<button className="iconbtn on" aria-label="Nuevo torneo" onClick={() => setNuevo(true)}><Icon name="plus" /></button>} />
      <div className="scroll flush">
        {juego.torneos.length === 0 && <Vacio titulo="Sin torneos" texto="Crea uno con + : de 4, 8 o 16 peleadores, en una sola noche (vieja escuela) o una ronda por evento (moderno)." />}
        {juego.torneos.slice().reverse().map(t => {
          const camp = t.campeonId != null ? juego.peleadores.find(p => p.id === t.campeonId) : undefined;
          return (
            <button key={t.id} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/torneo/${t.id}`)}>
              <span className="ico"><Icon name="trophy" /></span>
              <span className="grow">
                <div style={{ fontWeight: 700 }}>{t.nombre}</div>
                <div className="muted small">{t.genero === 'F' ? '♀ ' : ''}{nombreClase(t.clase, juego.ajustes.nombresDivision)} · {t.tam} peleadores · {t.tipo === 'vieja' ? 'Vieja escuela' : 'Moderno'}</div>
                <div className="small" style={{ color: t.estado === 'terminado' ? 'var(--ok)' : 'var(--accent)' }}>{camp ? `Campeón: ${nombreCompleto(camp)}` : ESTADO[t.estado]}</div>
              </span>
              <span className="chev"><Icon name="chevron" /></span>
            </button>
          );
        })}
      </div>
      {nuevo && <Nuevo onClose={() => setNuevo(false)} onCreado={id => { setNuevo(false); nav(`/torneo/${id}`); }} />}
    </>
  );
}

function Nuevo({ onClose, onCreado }: { onClose: () => void; onCreado: (id: number) => void }) {
  const juego = useGame(s => s.juego)!;
  const misDivs = juego.divisiones.filter(d => d.companiaId === juego.miId);
  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState<Genero>(misDivs[0]?.genero ?? 'M');
  const [clase, setClase] = useState<ClaseId>(misDivs[0]?.clase ?? 'ligero');
  const [tam, setTam] = useState<'4' | '8' | '16'>('8');
  const [tipo, setTipo] = useState<'vieja' | 'moderna'>('vieja');
  const [auto, setAuto] = useState<'auto' | 'manual'>('auto');
  const [titulo, setTitulo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generos = (['M', 'F'] as Genero[]).filter(g => misDivs.some(d => d.genero === g));
  const clases = DIVISIONES_GENERO[genero].filter(c => misDivs.some(d => d.genero === genero && d.clase === c));

  const crear = () => {
    const r = torneos.crear({ nombre, genero, clase, tam: Number(tam) as 4 | 8 | 16, tipo, sorteoAuto: auto === 'auto', otorgaTitulo: titulo });
    if (r.error) setError(r.error); else onCreado(r.id!);
  };

  return (
    <Sheet titulo="Nuevo torneo" completo onClose={onClose} pie={<button className="btn primary" disabled={!misDivs.length} onClick={crear}>Crear torneo</button>}>
      <div className="stack">
        {!misDivs.length && <div className="alert warn"><Icon name="info" /><div>Necesitas al menos una división. Créala en Más → Divisiones.</div></div>}
        {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}
        <div className="field"><span className="label">Nombre</span><input className="input" value={nombre} maxLength={36} placeholder="Ej. Copa Colima" onChange={e => setNombre(e.target.value)} /></div>
        {generos.length > 0 && (
          <>
            <div className="field"><span className="label">Género</span>
              <Seg<Genero> valor={genero} items={generos.map(g => ({ id: g, label: g === 'M' ? 'Hombres' : 'Mujeres' }))}
                onChange={g => { setGenero(g); setClase(DIVISIONES_GENERO[g].find(c => misDivs.some(d => d.genero === g && d.clase === c))!); }} />
            </div>
            <div className="field"><span className="label">División</span>
              <Chips<ClaseId> valor={clase} onChange={setClase} items={clases.map(c => ({ id: c, label: nombreClase(c, juego.ajustes.nombresDivision) }))} />
            </div>
          </>
        )}
        <div className="field"><span className="label">Tamaño</span>
          <Seg<'4' | '8' | '16'> valor={tam} onChange={setTam} items={[{ id: '4', label: '4' }, { id: '8', label: '8' }, { id: '16', label: '16' }]} />
        </div>
        <div className="field"><span className="label">Tipo</span>
          <Seg<'vieja' | 'moderna'> valor={tipo} onChange={setTipo} items={[{ id: 'vieja', label: 'Vieja escuela' }, { id: 'moderna', label: 'Moderno' }]} />
          <span className="muted small">{tipo === 'vieja' ? 'Todo el torneo en un solo evento: la fatiga y las lesiones pesan entre rondas de la misma noche.' : 'Una ronda por evento, a lo largo de varias semanas.'}</span>
        </div>
        <div className="field"><span className="label">Llaves</span>
          <Seg<'auto' | 'manual'> valor={auto} onChange={setAuto} items={[{ id: 'auto', label: 'Sorteo automático' }, { id: 'manual', label: 'Manual (en orden)' }]} />
        </div>
        <button className="card tap row between" onClick={() => setTitulo(v => !v)}>
          <div style={{ textAlign: 'left' }}><div style={{ fontWeight: 600 }}>El ganador obtiene el campeonato</div><div className="muted small">Se queda con el título de la división</div></div>
          <span className={`sw ${titulo ? 'on' : ''}`} />
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Detalle ----------
export function Torneo() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const t = juego.torneos.find(x => x.id === Number(id));
  const [picker, setPicker] = useState<number | null>(null);
  const [programar, setProgramar] = useState<number | null>(null);
  const [confBorrar, setConfBorrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!t) return (<><TopBar titulo="Torneo" /><Vacio titulo="No se encontró el torneo" /></>);

  const camp = t.campeonId != null ? juego.peleadores.find(p => p.id === t.campeonId) : undefined;
  const pe = (pid: number | null) => (pid != null ? juego.peleadores.find(p => p.id === pid) : undefined);
  const llenos = t.cupos.filter(c => c != null).length;
  const rondaPendiente = t.tipo === 'moderna'
    ? t.rondas.findIndex((r, i) => r.some(p => p.eventoId == null) && (i === 0 || t.rondas[i - 1].every(p => p.ganadorId != null)))
    : (t.rondas.length && t.rondas[0].every(p => p.eventoId == null) ? 0 : -1);

  const ir = (r: ReturnType<typeof torneos.llenarAuto>) => setError(r);

  return (
    <>
      <TopBar titulo={t.nombre} derecha={<button className="iconbtn" aria-label="Eliminar torneo" onClick={() => setConfBorrar(true)}><Icon name="trash" /></button>} />
      <div className="scroll">
        <div className="stack">
          <div className="card center">
            <div className="label">{t.genero === 'F' ? '♀ ' : ''}{nombreClase(t.clase, juego.ajustes.nombresDivision)} · {t.tam} peleadores · {t.tipo === 'vieja' ? 'Vieja escuela' : 'Moderno'}</div>
            {camp ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar p={camp} size={72} /></div>
                <div className="mid accent" style={{ marginTop: 8 }}>👑 {nombreCompleto(camp)}</div>
                <div className="muted small">Campeón del torneo{t.otorgaTitulo ? ' y del título' : ''}</div>
              </div>
            ) : <div className="mid" style={{ marginTop: 6 }}>{ESTADO[t.estado]}</div>}
          </div>
          {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}

          {t.estado === 'cupos' && (
            <>
              <div className="card">
                <h3>Participantes ({llenos}/{t.tam})</h3>
                {t.cupos.map((c, i) => {
                  const p = pe(c);
                  return (
                    <button key={i} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }} onClick={() => setPicker(i)}>
                      <span className="k">#{i + 1}</span>
                      <span className="v" style={{ color: p ? 'var(--text)' : 'var(--muted)' }}>{p ? `${nombreCompleto(p)} · ${recordTxt(p.rec.tot)}` : '+ Elegir'}</span>
                    </button>
                  );
                })}
              </div>
              <button className="btn" onClick={() => ir(torneos.llenarAuto(t.id))}>Llenar automáticamente (los mejores)</button>
              <button className="btn primary" disabled={llenos < t.tam} onClick={() => ir(torneos.sortear(t.id))}>{t.sorteoAuto ? 'Sortear llaves' : 'Armar llaves en este orden'}</button>
            </>
          )}

          {t.rondas.length > 0 && (
            <div className="stack">
              {t.rondas.map((r, ri) => (
                <div key={ri} className="card">
                  <h3>{nombreRonda(t.tam, ri)}{r.some(p => p.eventoId != null) ? '' : ' · sin programar'}</h3>
                  {r.map((par, si) => {
                    const a = pe(par.aId);
                    const b = pe(par.bId);
                    const fila = (p: typeof a, gana: boolean) => (
                      <span className="row" style={{ gap: 6, opacity: par.ganadorId != null && !gana ? 0.4 : 1, fontWeight: gana ? 700 : 500 }}>
                        {gana && '👑'}{p ? p.apellido : 'Por definir'}
                      </span>
                    );
                    return (
                      <button key={si} className="kv" style={{ width: '100%', textAlign: 'left', alignItems: 'center' }}
                        onClick={() => par.eventoId != null && nav(`/evento/${par.eventoId}`)}>
                        <span className="k" style={{ minWidth: 86 }}>{etiquetaPartido(t.tam, ri, si)}</span>
                        <span className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{fila(a, par.ganadorId === par.aId && par.aId != null)}{fila(b, par.ganadorId === par.bId && par.bId != null)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {t.estado !== 'terminado' && rondaPendiente >= 0 && (
                <button className="btn primary" onClick={() => { setProgramar(rondaPendiente); setError(null); }}>
                  <Icon name="calendar" />{t.tipo === 'vieja' ? 'Programar el evento del torneo' : `Programar ${nombreRonda(t.tam, rondaPendiente)}`}
                </button>
              )}
              {t.estado === 'en_curso' && rondaPendiente < 0 && <div className="muted small center">{t.tipo === 'moderna' ? 'Esperando los resultados de la ronda programada.' : 'El torneo ya tiene su evento: ve a Eventos.'}</div>}
            </div>
          )}
        </div>
      </div>

      {picker != null && <Selector juego={juego} t={t} onClose={() => setPicker(null)} onElegir={pid => { setError(torneos.setCupo(t.id, picker, pid)); setPicker(null); }} />}
      {programar != null && <Semana juego={juego} t={t} ronda={programar} onClose={() => setProgramar(null)} onListo={id => { setProgramar(null); nav(`/evento/${id}`); }} />}
      {confBorrar && (
        <Confirmar titulo="¿Eliminar el torneo?" peligro confirmar="Eliminar" texto="Se borra el torneo y su llave. Los eventos pendientes deben eliminarse antes."
          onNo={() => setConfBorrar(false)} onSi={() => { const e = torneos.eliminar(t.id); setConfBorrar(false); if (e) setError(e); else nav('/torneos', { replace: true }); }} />
      )}
    </>
  );
}

function Selector({ juego, t, onClose, onElegir }: { juego: Juego; t: TorneoT; onClose: () => void; onElegir: (id: number | null) => void }) {
  const lista = useMemo(() => elegibles(juego, t).map(id => juego.peleadores.find(p => p.id === id)!), [juego, t]);
  return (
    <Sheet titulo="Elegir participante" completo onClose={onClose} pie={<button className="btn" onClick={() => onElegir(null)}>Dejar vacío</button>}>
      {lista.length === 0 && <Vacio titulo="No tienes peleadores de esta división con contrato" texto="Ficha agentes libres de este peso." />}
      {lista.map(p => (
        <button key={p.id} className={`pickrow ${t.cupos.includes(p.id) ? 'off' : ''}`} disabled={t.cupos.includes(p.id)} onClick={() => onElegir(p.id)}>
          <Avatar p={p} size={44} />
          <span className="grow" style={{ minWidth: 0 }}>
            <div className="mid ellipsis">{nombreCompleto(p)}</div>
            <div className="muted small">{recordTxt(p.rec.tot)} · {p.edad} años{t.cupos.includes(p.id) ? ' · ya está en el torneo' : ''}</div>
          </span>
          <Estrellas valor={estrellasCalif(p)} />
        </button>
      ))}
    </Sheet>
  );
}

function Semana({ juego, t, ronda, onClose, onListo }: { juego: Juego; t: TorneoT; ronda: number; onClose: () => void; onListo: (id: number) => void }) {
  const libre = (s: number) => !eventoDeSemana(juego, s);
  let ini = juego.semanaAbs;
  while (!libre(ini) && ini < juego.semanaAbs + 60) ini++;
  const [semana, setSemana] = useState(ini);
  const [error, setError] = useState<string | null>(null);
  const confirmar = () => {
    const r = torneos.programar(t.id, ronda, semana);
    if (r.error) setError(r.error); else onListo(r.id!);
  };
  return (
    <Sheet titulo={t.tipo === 'vieja' ? 'Semana del torneo' : `Semana de ${nombreRonda(t.tam, ronda)}`} onClose={onClose}
      pie={<button className="btn primary" onClick={confirmar}>Programar</button>}>
      <div className="stack">
        {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}
        <p className="muted">{t.tipo === 'vieja' ? `Se jugarán las ${numRondas(t.tam)} rondas en un solo evento.` : `Se programará solo la ronda de ${nombreRonda(t.tam, ronda)}.`}</p>
        <div className="row" style={{ justifyContent: 'center' }}><Stepper valor={semana} min={juego.semanaAbs} max={juego.semanaAbs + 103} onChange={setSemana} formato={s => fecha(s).replace('Año ', 'A').replace(' · Semana ', ' S')} /></div>
        <div className="center muted small">{fecha(semana)}{libre(semana) ? '' : ' · ya hay un evento esa semana'}</div>
      </div>
    </Sheet>
  );
}
