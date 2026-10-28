import { useEffect, useRef, useState } from 'react';
import { DIFICULTAD } from '../config/balance';
import { fecha } from '../domain/format';
import { exportarJSON, leerArchivoJSON, pedirAlmacenamientoPersistente } from '../store/db';
import { useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Confirmar, Seg, TopBar } from '../ui/kit';

export function Ajustes() {
  const juego = useGame(s => s.juego)!;
  const ranura = useGame(s => s.ranura)!;
  const act = useGame(s => s.actualizarAjustes);
  const marcarRespaldo = useGame(s => s.marcarRespaldo);
  const cargarDesdeJuego = useGame(s => s.cargarDesdeJuego);
  const borrar = useGame(s => s.borrar);
  const setAviso = useGame(s => s.setAviso);
  const a = juego.ajustes;
  const archivo = useRef<HTMLInputElement>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [confBorrar, setConfBorrar] = useState(false);
  const [pendiente, setPendiente] = useState<Awaited<ReturnType<typeof leerArchivoJSON>> | null>(null);

  useEffect(() => { void navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(null)); }, []);

  const onArchivo = async (f?: File) => {
    if (!f) return;
    try { setPendiente(await leerArchivoJSON(f)); } catch (e) { setAviso((e as Error).message); }
  };

  return (
    <>
      <TopBar titulo="Ajustes" />
      <div className="scroll">
        <div className="stack">
          <div className="card stack">
            <div className="field"><span className="label">Unidades</span>
              <Seg valor={a.unidades} onChange={v => act({ unidades: v })} items={[{ id: 'metrico', label: 'kg / cm' }, { id: 'imperial', label: 'lb / pies' }]} />
            </div>
            <div className="field"><span className="label">Nombres de las divisiones</span>
              <Seg valor={a.nombresDivision} onChange={v => act({ nombresDivision: v })} items={[{ id: 'es', label: 'Español' }, { id: 'en', label: 'Inglés' }]} />
            </div>
            <div className="field"><span className="label">Velocidad de simulación</span>
              <Seg valor={String(a.velocidadSim) as '1' | '2' | '3'} onChange={v => act({ velocidadSim: Number(v) as 1 | 2 | 3 })} items={[{ id: '1', label: 'Lenta' }, { id: '2', label: 'Normal' }, { id: '3', label: 'Rápida' }]} />
            </div>
            <div className="field"><span className="label">Game Over por quiebra</span>
              <Seg valor={a.gameOver ? 'si' : 'no'} onChange={v => act({ gameOver: v === 'si' })} items={[{ id: 'si', label: 'Activado' }, { id: 'no', label: 'Desactivado' }]} />
            </div>
            <div className="field"><span className="label">Recordatorio semanal de respaldo</span>
              <Seg valor={a.recordatorioRespaldo ? 'si' : 'no'} onChange={v => act({ recordatorioRespaldo: v === 'si' })} items={[{ id: 'si', label: 'Sí' }, { id: 'no', label: 'No' }]} />
            </div>
            <div className="kv"><span className="k">Dificultad</span><span className="v">{DIFICULTAD[juego.dificultad].nombre}</span></div>
          </div>

          <div className="card stack">
            <h3 style={{ marginBottom: 0 }}>Partida</h3>
            <div className="muted small">Ranura {ranura} · {fecha(juego.semanaAbs)} · Se guarda sola en este dispositivo{persistente === true ? ' (almacenamiento protegido)' : persistente === false ? ' (el navegador podría limpiarlo si no se usa: haz respaldos)' : ''}.</div>
            <button className="btn" onClick={() => { exportarJSON(juego); marcarRespaldo(); setAviso('Respaldo exportado'); }}><Icon name="download" />Exportar respaldo (.json)</button>
            <button className="btn" onClick={() => archivo.current?.click()}><Icon name="upload" />Importar respaldo</button>
            <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={e => { void onArchivo(e.target.files?.[0]); e.target.value = ''; }} />
            {persistente === false && (
              <button className="btn small" onClick={async () => setPersistente(await pedirAlmacenamientoPersistente())}>Pedir almacenamiento protegido</button>
            )}
            <button className="btn danger" onClick={() => setConfBorrar(true)}><Icon name="trash" />Borrar esta partida</button>
          </div>

          <p className="muted small center">Cage Tycoon v0.1 · Fase 1 · Juego personal</p>
        </div>
      </div>

      {confBorrar && (
        <Confirmar titulo="¿Borrar la partida?" peligro confirmar="Borrar"
          texto="Se elimina de este dispositivo de forma permanente. Exporta un respaldo antes si quieres conservarla."
          onNo={() => setConfBorrar(false)} onSi={() => { setConfBorrar(false); void borrar(ranura); }} />
      )}
      {pendiente && (
        <Confirmar titulo="¿Reemplazar la partida actual?" peligro confirmar="Importar"
          texto={`Se cargará "${pendiente.nombre}" (${fecha(pendiente.semanaAbs)}) en la ranura ${ranura}, sobrescribiendo lo que hay.`}
          onNo={() => setPendiente(null)} onSi={async () => { await cargarDesdeJuego(ranura, pendiente); setPendiente(null); setAviso('Partida importada'); }} />
      )}
    </>
  );
}
