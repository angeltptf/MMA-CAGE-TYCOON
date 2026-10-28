import { useNavigate } from 'react-router-dom';
import { EMPRESA, REGION_LABEL } from '../config/balance';
import { PAISES_SEDE, bandera, nombrePais } from '../config/paises';
import { alcance, miEmpresa, popularidadEmpresa } from '../domain/empresa';
import { dinero, fecha, numeroCorto } from '../domain/format';
import { activos, ingresoAnualContratos } from '../domain/negocios';
import { useGame } from '../store/game';
import { BarraValor, TopBar } from '../ui/kit';

const COLORES = ['#c8f53c', '#38bdf8', '#ff6b9a', '#fbbf24', '#a78bfa', '#34d399', '#fb923c', '#f43f5e', '#e5e7eb', '#14b8a6'];

export function Empresa() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const editar = useGame(s => s.editarEmpresa);
  const c = miEmpresa(juego);
  const mios = juego.peleadores.filter(p => p.companiaId === juego.miId && !p.retirado);
  const campeones = juego.divisiones.filter(d => d.companiaId === juego.miId && d.campeonId != null).length;
  const pop = popularidadEmpresa(c);

  return (
    <>
      <TopBar titulo="Empresa" />
      <div className="scroll">
        <div className="stack">
          <div className="card stack">
            <div className="field"><span className="label">Nombre</span>
              <input className="input" value={c.nombre} maxLength={32} onChange={e => editar({ nombre: e.target.value })} />
            </div>
            <div className="field"><span className="label">Siglas</span>
              <input className="input" value={c.siglas} maxLength={5} onChange={e => editar({ siglas: e.target.value.toUpperCase() })} />
            </div>
            <div className="field"><span className="label">Color</span>
              <div className="swatches">
                {COLORES.map(col => <button key={col} className={`swatch ${col === c.color ? 'on' : ''}`} style={{ background: col }} onClick={() => editar({ color: col })} aria-label={col} />)}
              </div>
            </div>
            <div className="field"><span className="label">País sede</span>
              <select className="select" value={c.pais} onChange={e => editar({ pais: e.target.value })}>
                {PAISES_SEDE.map(p => <option key={p.code} value={p.code}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <h3>Resumen</h3>
            <div className="kv"><span className="k">Fundación</span><span className="v">{fecha(c.fundada)}</span></div>
            <div className="kv"><span className="k">País sede</span><span className="v">{bandera(c.pais)} {nombrePais(c.pais)}</span></div>
            <div className="kv"><span className="k">Eventos realizados</span><span className="v">0</span></div>
            <div className="kv"><span className="k">Peleadores</span><span className="v">{mios.length}</span></div>
            <div className="kv"><span className="k">Campeones actuales</span><span className="v">{campeones}</span></div>
            <div className="kv"><span className="k">Alcance</span><span className="v accent">{alcance(pop)} ({pop}/100)</span></div>
            <div className="kv"><span className="k">Caja</span><span className="v">{dinero(c.dinero)}</span></div>
            <div className="kv"><span className="k">Fans</span><span className="v">{numeroCorto(c.fans)}</span></div>
            <div className="kv"><span className="k">Patrocinadores activos</span><span className="v">{activos(juego, 'patrocinio').length}</span></div>
            <div className="kv"><span className="k">Contratos de transmisión</span><span className="v">{activos(juego, 'tv').length}</span></div>
            <div className="kv"><span className="k">Inversionistas</span><span className="v">{activos(juego, 'inversion').length}</span></div>
            <div className="kv"><span className="k">Ingreso fijo anual por contratos</span><span className="v accent">{dinero(ingresoAnualContratos(juego))}</span></div>
            <div className="kv"><span className="k">Suscriptores de YouTube</span><span className="v">{numeroCorto(juego.youtube.subs)}</span></div>
          </div>

          <div className="card stack">
            <h3 style={{ marginBottom: 0 }}>Popularidad por región</h3>
            {EMPRESA.regiones.map(r => <BarraValor key={r} etiqueta={REGION_LABEL[r]} valor={c.popRegion[r] ?? 0} max={100} color="var(--pop)" />)}
            <BarraValor etiqueta="Reputación" valor={c.reputacion} max={100} color="var(--accent)" />
          </div>

          <div className="card">
            <h3>Finanzas y logros</h3>
            <p className="muted small">Los logros llegan en la Fase 7.</p>
            <div className="stack" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => nav('/negocios')}>Ir a Negocios</button>
              <button className="btn" onClick={() => nav('/finanzas')}>Ver finanzas completas</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
