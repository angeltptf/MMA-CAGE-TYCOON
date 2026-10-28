import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as A from '../domain/acciones';
import {
  ATRIBUTO_LABEL, ATRIBUTOS_FIS, CLASES, DIVISIONES_GENERO, DISCIPLINAS, DISCIPLINA_LABEL, ESTILOS,
} from '../config/divisiones';
import { PAISES } from '../config/paises';
import { nombreClase } from '../domain/format';
import type { ClaseId, Disciplina, Estilo, Genero, Peleador } from '../domain/types';
import { rcdVacio } from '../domain/migracion';
import { useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Chips, Confirmar, Seg, Stepper, Tabs, TopBar, Vacio } from '../ui/kit';

type TabId = 'info' | 'ataque' | 'defensa' | 'fisico';

const plantilla = (): Peleador => ({
  id: 0, nombre: '', apellido: '', apodo: '', pais: 'MX', genero: 'M', edad: 25, cumple: 1 + Math.floor(Math.random() * 52),
  alturaCm: 177, pesoKg: 70, clase: 'ligero', clasesSec: [], estilo: 'mma',
  ataque: { bjj: 5, boxeo: 5, muayThai: 5, lucha: 5 }, defensa: { bjj: 5, boxeo: 5, muayThai: 5, lucha: 5 },
  fis: { agilidad: 5, agresividad: 5, menton: 5, corazon: 5, potencia: 5, velocidad: 5, cardio: 5, lesiones: 3 },
  potencial: 3, popularidad: 10, moral: 70, fatiga: 0, dano: 0, lesion: null, companiaId: null, contrato: null,
  rec: { tot: { v: 0, d: 0, e: 0, nc: 0 }, mio: { v: 0, d: 0, e: 0, nc: 0 } },
  finales: { ko: 0, tko: 0, sub: 0, dec: 0 }, forma: [], racha: { tipo: 'V', n: 0 }, mejorRachaV: 0, peorRachaD: 0,
  ganancias: 0, ultimoCombate: null, favorito: false, retirado: false, elite: false,
  enVenta: false, sinNegociarHasta: 0, descansoHasta: 0, peleas: [],
  rankPts: 0, rcd: rcdVacio(), patrocinios: [], popMax: 10, anioStats: { v: 0, d: 0, fin: 0, tit: 0, cal: 0 },
});

export function Editor() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const nuevo = id === 'nuevo';
  const original = nuevo ? undefined : juego.peleadores.find(p => p.id === Number(id));
  const [d, setD] = useState<Peleador | null>(() => (nuevo ? plantilla() : original ? structuredClone(original) : null));
  const [tab, setTab] = useState<TabId>('info');
  const [aMiRoster, setAMiRoster] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descartar, setDescartar] = useState(false);
  const u = juego.ajustes.unidades;
  const idioma = juego.ajustes.nombresDivision;

  const sucio = useMemo(() => d && (nuevo || JSON.stringify(d) !== JSON.stringify(original)), [d, original, nuevo]);

  if (!d) return (<><TopBar titulo="Editor" /><Vacio titulo="No se encontró al peleador" /></>);
  const set = (patch: Partial<Peleador>) => setD(x => (x ? { ...x, ...patch } : x));
  const setAtk = (k: Disciplina, v: number) => setD(x => (x ? { ...x, ataque: { ...x.ataque, [k]: v } } : x));
  const setDef = (k: Disciplina, v: number) => setD(x => (x ? { ...x, defensa: { ...x.defensa, [k]: v } } : x));

  const guardar = () => {
    if (!d.nombre.trim() || !d.apellido.trim()) { setError('Escribe el nombre y el apellido.'); return; }
    const hecho = { ...d, nombre: d.nombre.trim(), apellido: d.apellido.trim(), apodo: d.apodo.trim(),
      elite: d.elite || Object.values(d.ataque).concat(Object.values(d.defensa)).some(v => v > 10) };
    let nuevoId = hecho.id;
    const err = useGame.getState().hacer(j => {
      if (nuevo) nuevoId = A.agregarPeleador(j, hecho, aMiRoster);
      else A.guardarPeleador(j, hecho);
    }, nuevo ? 'Peleador creado' : 'Cambios guardados');
    if (err) { setError(err); return; }
    nav(nuevo ? `/peleador/${nuevoId}` : -1 as never, nuevo ? { replace: true } : undefined);
  };

  const tope = 15;
  const cmAIn = (cm: number) => Math.round(cm / 2.54);
  const kgALb = (kg: number) => Math.round(kg * 2.20462);

  return (
    <>
      <TopBar titulo={nuevo ? 'Nuevo peleador' : 'Editor'} onAtras={() => (sucio ? setDescartar(true) : nav(-1))} />
      <Tabs<TabId>
        valor={tab} onChange={setTab}
        items={[{ id: 'info', label: 'Info' }, { id: 'ataque', label: 'Ataque' }, { id: 'defensa', label: 'Defensa' }, { id: 'fisico', label: 'Físico' }]}
      />
      <div className="scroll">
        {error && <div className="alert bad" style={{ marginBottom: 12 }}><Icon name="x" /><div>{error}</div></div>}

        {tab === 'info' && (
          <div className="stack">
            <div className="field"><span className="label">Nombre</span>
              <input className="input" value={d.nombre} onChange={e => set({ nombre: e.target.value })} />
            </div>
            <div className="field"><span className="label">Apellidos</span>
              <input className="input" value={d.apellido} onChange={e => set({ apellido: e.target.value })} />
            </div>
            <div className="field"><span className="label">Apodo</span>
              <input className="input" value={d.apodo} onChange={e => set({ apodo: e.target.value })} />
            </div>
            <div className="field"><span className="label">Género</span>
              <Seg<Genero> valor={d.genero} items={[{ id: 'M', label: 'Hombre' }, { id: 'F', label: 'Mujer' }]}
                onChange={g => set({ genero: g, clase: DIVISIONES_GENERO[g].includes(d.clase) ? d.clase : DIVISIONES_GENERO[g][0], clasesSec: [] })} />
            </div>
            <Linea etiqueta="Edad"><Stepper valor={d.edad} min={16} max={55} editable onChange={v => set({ edad: v })} /></Linea>
            <Linea etiqueta={u === 'metrico' ? 'Altura (cm)' : 'Altura (pulgadas)'}>
              {u === 'metrico'
                ? <Stepper valor={d.alturaCm} min={130} max={230} editable onChange={v => set({ alturaCm: v })} />
                : <Stepper valor={cmAIn(d.alturaCm)} min={51} max={91} editable onChange={v => set({ alturaCm: Math.round(v * 2.54) })} />}
            </Linea>
            <Linea etiqueta={u === 'metrico' ? 'Peso habitual (kg)' : 'Peso habitual (lb)'}>
              {u === 'metrico'
                ? <Stepper valor={d.pesoKg} min={45} max={140} paso={0.5} editable onChange={v => set({ pesoKg: v })} />
                : <Stepper valor={kgALb(d.pesoKg)} min={99} max={309} editable onChange={v => set({ pesoKg: Math.round(v / 2.20462 * 10) / 10 })} />}
            </Linea>
            <div className="field"><span className="label">Nacionalidad</span>
              <select className="select" value={d.pais} onChange={e => set({ pais: e.target.value })}>
                {PAISES.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => <option key={p.code} value={p.code}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="field"><span className="label">División principal</span>
              <Chips<ClaseId> valor={d.clase} onChange={c => set({ clase: c, clasesSec: d.clasesSec.filter(x => x !== c) })}
                items={DIVISIONES_GENERO[d.genero].map(c => ({ id: c, label: nombreClase(c, idioma) }))} />
            </div>
            <div className="field"><span className="label">Divisiones secundarias</span>
              <div className="chips">
                {DIVISIONES_GENERO[d.genero].filter(c => c !== d.clase).map(c => (
                  <button key={c} className={`chip ${d.clasesSec.includes(c) ? 'on' : ''}`}
                    onClick={() => set({ clasesSec: d.clasesSec.includes(c) ? d.clasesSec.filter(x => x !== c) : [...d.clasesSec, c] })}>
                    {CLASES[c][idioma]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field"><span className="label">Estilo</span>
              <select className="select" value={d.estilo} onChange={e => set({ estilo: e.target.value as Estilo })}>
                {(Object.keys(ESTILOS) as Estilo[]).map(e => <option key={e} value={e}>{ESTILOS[e].es}</option>)}
              </select>
            </div>
            <Linea etiqueta="Potencial (estrellas)"><Stepper valor={d.potencial} min={0.5} max={5} paso={0.5} onChange={v => set({ potencial: v })} /></Linea>
            <Linea etiqueta="Popularidad"><Stepper valor={Math.round(d.popularidad)} min={0} max={100} paso={5} editable onChange={v => set({ popularidad: v })} /></Linea>
            {nuevo && (
              <div className="field"><span className="label">Agregar a</span>
                <Seg<'mi' | 'libres'> valor={aMiRoster ? 'mi' : 'libres'} items={[{ id: 'mi', label: 'Mi roster' }, { id: 'libres', label: 'Agentes libres' }]}
                  onChange={v => setAMiRoster(v === 'mi')} />
              </div>
            )}
          </div>
        )}

        {tab === 'ataque' && (
          <div className="stack">
            {DISCIPLINAS.map(k => <Slider key={k} etiqueta={`${DISCIPLINA_LABEL[k]} · Ataque`} valor={d.ataque[k]} tope={tope} onChange={v => setAtk(k, v)} />)}
          </div>
        )}
        {tab === 'defensa' && (
          <div className="stack">
            {DISCIPLINAS.map(k => <Slider key={k} etiqueta={`${DISCIPLINA_LABEL[k]} · Defensa`} valor={d.defensa[k]} tope={tope} onChange={v => setDef(k, v)} />)}
          </div>
        )}
        {tab === 'fisico' && (
          <div className="stack">
            {ATRIBUTOS_FIS.map(k => (
              <Slider key={k} etiqueta={ATRIBUTO_LABEL[k]} valor={d.fis[k]} tope={tope}
                onChange={v => setD(x => (x ? { ...x, fis: { ...x.fis, [k]: v } } : x))} />
            ))}
            <p className="muted small">Es tu juego: puedes escribir valores de hasta 15. Normalmente el máximo es 10; solo los peleadores de élite lo superan.</p>
          </div>
        )}
      </div>
      <div className="sticky-actions">
        <button className="btn primary" disabled={!sucio} onClick={guardar}><Icon name="check" />{nuevo ? 'Crear peleador' : 'Guardar cambios'}</button>
      </div>
      {descartar && (
        <Confirmar titulo="¿Descartar cambios?" peligro confirmar="Descartar" texto="Tienes cambios sin guardar."
          onNo={() => setDescartar(false)} onSi={() => nav(-1)} />
      )}
    </>
  );
}

function Linea({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="row between">
      <span className="label">{etiqueta}</span>
      {children}
    </div>
  );
}

function Slider({ etiqueta, valor, tope, onChange }: { etiqueta: string; valor: number; tope: number; onChange: (v: number) => void }) {
  const v = Math.round(valor * 10) / 10;
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row between"><span className="label">{etiqueta}</span><span className="num mid" style={{ color: v > 10 ? 'var(--accent)' : undefined }}>{v}</span></div>
      <div className="row" style={{ gap: 10, marginTop: 4 }}>
        <input type="range" min={0} max={10} step={1} value={Math.min(10, Math.round(valor))} onChange={e => onChange(Number(e.target.value))} />
        <Stepper valor={Math.round(valor)} min={0} max={tope} editable onChange={onChange} />
      </div>
    </div>
  );
}

