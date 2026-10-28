import { useEffect, useRef, useState } from 'react';
import { DIFICULTAD } from '../config/balance';
import { PAISES_SEDE } from '../config/paises';
import { fecha } from '../domain/format';
import type { Dificultad } from '../domain/types';
import { leerArchivoJSON, listarPartidas, RANURAS, type MetaPartida } from '../store/db';
import { useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Confirmar, Seg, Sheet, Toast } from '../ui/kit';

const COLORES = ['#c8f53c', '#38bdf8', '#ff6b9a', '#fbbf24', '#a78bfa', '#34d399', '#fb923c', '#f43f5e', '#e5e7eb', '#14b8a6'];

function siglasDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(w => w.length > 1 || /\d/.test(w));
  const s = palabras.map(w => w[0]).join('').toUpperCase();
  return (s || nombre.slice(0, 3).toUpperCase()).slice(0, 5);
}

export function Landing() {
  const [partidas, setPartidas] = useState<MetaPartida[]>([]);
  const [nueva, setNueva] = useState<number | null>(null);
  const [borrar, setBorrar] = useState<number | null>(null);
  const [importado, setImportado] = useState<{ juego: Awaited<ReturnType<typeof leerArchivoJSON>> } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cargar = useGame(s => s.cargar);
  const borrarPartida = useGame(s => s.borrar);
  const cargarDesdeJuego = useGame(s => s.cargarDesdeJuego);
  const archivo = useRef<HTMLInputElement>(null);

  const refrescar = () => void listarPartidas().then(setPartidas);
  useEffect(refrescar, []);

  const porRanura = (r: number) => partidas.find(p => p.ranura === r);

  const onArchivo = async (f: File | undefined) => {
    if (!f) return;
    try { setImportado({ juego: await leerArchivoJSON(f) }); }
    catch (e) { setMsg((e as Error).message); }
  };

  if (nueva != null) {
    return <NuevaPartida ranura={nueva} onVolver={() => { setNueva(null); refrescar(); }} />;
  }

  return (
    <div className="landing">
      <div>
        <div className="label">Simulador de promotora de MMA</div>
        <h1 className="wordmark">Cage<br /><span>Tycoon</span></h1>
      </div>

      <div className="stack">
        {RANURAS.map(r => {
          const m = porRanura(r);
          return m ? (
            <div key={r} className="card stack" style={{ gap: 10 }}>
              <div className="row">
                <div className="logo-badge" style={{ background: m.color, width: 52, height: 52, borderRadius: 15, fontSize: 18, margin: 0, color: '#10140a' }}>{m.siglas}</div>
                <div className="grow">
                  <div className="mid ellipsis">{m.nombre}</div>
                  <div className="muted small">Ranura {r} · {fecha(m.semanaAbs)}</div>
                </div>
              </div>
              <div className="row">
                <button
                  className="btn primary" disabled={cargando}
                  onClick={async () => { setCargando(true); await cargar(r); }}
                >Continuar</button>
                <button className="iconbtn" aria-label="Borrar partida" onClick={() => setBorrar(r)}><Icon name="trash" /></button>
              </div>
            </div>
          ) : (
            <button key={r} className="card tap row" style={{ width: '100%', height: 72 }} onClick={() => setNueva(r)}>
              <span className="iconbtn"><Icon name="plus" /></span>
              <span className="grow" style={{ textAlign: 'left' }}>
                <div className="mid">Nueva partida</div>
                <div className="muted small">Ranura {r} · vacía</div>
              </span>
            </button>
          );
        })}
      </div>

      <button className="btn" onClick={() => archivo.current?.click()}><Icon name="upload" />Importar respaldo</button>
      <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={e => { void onArchivo(e.target.files?.[0]); e.target.value = ''; }} />
      <p className="muted small center">Juego personal · sin anuncios, sin compras, sin cuenta. Tus partidas se guardan en este dispositivo.</p>

      {borrar != null && (
        <Confirmar
          titulo="¿Borrar partida?" peligro confirmar="Borrar"
          texto="Se eliminará la partida de esta ranura de forma permanente. Si no tienes un respaldo, no se puede recuperar."
          onNo={() => setBorrar(null)}
          onSi={async () => { await borrarPartida(borrar); setBorrar(null); refrescar(); }}
        />
      )}
      {importado && (
        <Sheet titulo="¿En qué ranura guardar?" onClose={() => setImportado(null)}>
          <p className="muted" style={{ marginBottom: 12 }}>Partida: <b style={{ color: 'var(--text)' }}>{importado.juego.nombre}</b> · {fecha(importado.juego.semanaAbs)}</p>
          <div className="stack">
            {RANURAS.map(r => (
              <button
                key={r} className="btn"
                onClick={async () => {
                  await cargarDesdeJuego(r, importado.juego);
                }}
              >Ranura {r}{porRanura(r) ? ' (reemplaza la actual)' : ''}</button>
            ))}
          </div>
        </Sheet>
      )}
      {msg && <Toast mensaje={msg} error onFin={() => setMsg(null)} />}
    </div>
  );
}

function NuevaPartida({ ranura, onVolver }: { ranura: number; onVolver: () => void }) {
  const [nombre, setNombre] = useState('');
  const [siglas, setSiglas] = useState('');
  const [editoSiglas, setEditoSiglas] = useState(false);
  const [color, setColor] = useState(COLORES[0]);
  const [pais, setPais] = useState('MX');
  const [dif, setDif] = useState<Dificultad>('normal');
  const [creando, setCreando] = useState(false);
  const nuevaPartida = useGame(s => s.nuevaPartida);

  const valido = nombre.trim().length >= 2 && siglas.trim().length >= 2;
  const crear = async () => {
    setCreando(true);
    // deja pintar el estado "creando" antes de la generación (síncrona)
    await new Promise(r => setTimeout(r, 30));
    await nuevaPartida(ranura, { nombre: nombre.trim(), siglas: siglas.trim().toUpperCase(), color, pais, dificultad: dif });
  };

  return (
    <div className="landing">
      <div className="row">
        <button className="iconbtn" onClick={onVolver} aria-label="Atrás"><Icon name="back" /></button>
        <h1 className="mid" style={{ textTransform: 'uppercase' }}>Nueva partida · Ranura {ranura}</h1>
      </div>

      <div className="card stack">
        <div className="logo-badge" style={{ background: color, color: '#10140a' }}>{siglas || '???'}</div>
        <div className="field">
          <span className="label">Nombre de la empresa</span>
          <input
            className="input" value={nombre} maxLength={32} placeholder="Ej. Octágono Colima"
            onChange={e => { setNombre(e.target.value); if (!editoSiglas) setSiglas(siglasDe(e.target.value)); }}
          />
        </div>
        <div className="field">
          <span className="label">Siglas (2–5 letras)</span>
          <input
            className="input" value={siglas} maxLength={5} placeholder="OC"
            onChange={e => { setSiglas(e.target.value.toUpperCase()); setEditoSiglas(true); }}
          />
        </div>
        <div className="field">
          <span className="label">Color</span>
          <div className="swatches">
            {COLORES.map(c => (
              <button key={c} className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">País sede</span>
          <select className="select" value={pais} onChange={e => setPais(e.target.value)}>
            {PAISES_SEDE.map(p => <option key={p.code} value={p.code}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label">Dificultad</span>
          <Seg
            items={(Object.keys(DIFICULTAD) as Dificultad[]).map(d => ({ id: d, label: DIFICULTAD[d].nombre }))}
            valor={dif} onChange={setDif}
          />
          <span className="muted small">{DIFICULTAD[dif].descripcion} Dinero inicial: ${DIFICULTAD[dif].dineroInicial.toLocaleString('en-US')}.</span>
        </div>
      </div>

      <button className="btn primary" disabled={!valido || creando} onClick={crear}>
        {creando ? 'Generando el mundo…' : 'Comenzar'}
      </button>
      <p className="muted small center">Se generan de 2,000 a 3,000 peleadores (según la dificultad) y 10 compañías rivales. Empiezas sin peleadores ni divisiones.</p>
    </div>
  );
}
