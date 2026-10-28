import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DIVISIONES_GENERO } from '../config/divisiones';
import { boutVacia, disponibleParaEvento, hypePelea, momiosDe, rankPos, validarPelea } from '../domain/eventos';
import { nombreClase } from '../domain/format';
import { estrellasCalif, nombreCompleto, recordTxt } from '../domain/peleador';
import type { ClaseId, Genero, Juego, Peleador, Pelea } from '../domain/types';
import { eventos as acc, useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Bar, Estrellas, Sheet, TopBar, Vacio } from '../ui/kit';

export function ProgramarPelea() {
  const { id, peleaId } = useParams();
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const nav = useNavigate();
  const e = juego.eventos.find(x => x.id === Number(id));
  const bout = e?.cartelera.find(b => b.id === Number(peleaId));
  const misDivs = juego.divisiones.filter(d => d.companiaId === juego.miId);

  const [genero, setGenero] = useState<Genero>(bout?.genero ?? misDivs[0]?.genero ?? 'M');
  const [clase, setClase] = useState<ClaseId>(bout?.clase ?? misDivs[0]?.clase ?? 'ligero');
  const [aId, setA] = useState<number | null>(bout?.aId ?? null);
  const [bId, setB] = useState<number | null>(bout?.bId ?? null);
  const [titulo, setTitulo] = useState(bout?.titulo ?? false);
  const [interino, setInterino] = useState(bout?.interino ?? false);
  const [rounds, setRounds] = useState<3 | 5>(bout?.rounds ?? 3);
  const [picker, setPicker] = useState<null | 'a' | 'b'>(null);
  const [error, setError] = useState<string | null>(null);

  const sinEste = useMemo(() => (e && bout ? { ...e, cartelera: e.cartelera.filter(b => b.id !== bout.id) } : null), [e, bout]);
  if (!e || !bout || !sinEste) return (<><TopBar titulo="Programar pelea" /><Vacio titulo="No se encontró el combate" /></>);
  if (e.estado !== 'borrador') return (<><TopBar titulo="Programar pelea" /><Vacio titulo="El evento ya no se puede modificar" /></>);

  const divActual = juego.divisiones.find(d => d.id === `${juego.miId}:${genero}:${clase}`);
  const campeon = divActual?.campeonId != null ? juego.peleadores.find(p => p.id === divActual.campeonId) : undefined;
  const A = aId != null ? juego.peleadores.find(p => p.id === aId) : undefined;
  const B = bId != null ? juego.peleadores.find(p => p.id === bId) : undefined;
  const generosConDiv = (['M', 'F'] as Genero[]).filter(g => misDivs.some(d => d.genero === g));
  const clasesDelGenero = DIVISIONES_GENERO[genero].filter(c => misDivs.some(d => d.genero === genero && d.clase === c));

  const disponiblesEn = (g: Genero, c: ClaseId) =>
    juego.peleadores.filter(p => p.companiaId === juego.miId && p.genero === g && p.clase === c && disponibleParaEvento(juego, p, sinEste).ok).length;

  const prueba: Pelea = { ...bout, genero, clase, titulo, interino, rounds };
  const val = A && B ? validarPelea(juego, e, prueba, A, B) : null;
  const hype = A && B ? hypePelea(juego, A, B, titulo) : 0;
  const [ma, mb] = A && B ? momiosDe(A, B) : [0, 0];

  const cambiarDivision = (g: Genero, c: ClaseId) => {
    setGenero(g); setClase(c);
    if (A && (A.genero !== g || A.clase !== c)) setA(null);
    if (B && (B.genero !== g || B.clase !== c)) setB(null);
    setTitulo(false); setInterino(false);
  };

  const guardar = () => {
    if (aId == null || bId == null) { setError('Elige a los dos peleadores.'); return; }
    const r = acc.guardarPelea(e.id, bout.id, { aId, bId, genero, clase, titulo, interino, rounds });
    if (r.error) { setError(r.error); return; }
    setAviso(r.avisos.length ? `Pelea guardada. Ojo: ${r.avisos.join(' ')}` : 'Pelea guardada');
    nav(-1);
  };

  const sugerir = () => {
    const r = acc.sugerir(e.id, bout.id);
    if (r.error) { setError(r.error); return; }
    nav(-1);
  };

  return (
    <>
      <TopBar titulo="Programar pelea" />
      <div className="scroll">
        <div className="stack">
          {misDivs.length === 0 && (
            <div className="alert warn"><Icon name="info" /><div>No tienes divisiones. Crea una en Más → Divisiones y ficha peleadores de ese peso.</div></div>
          )}
          {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}

          <div className="card stack">
            <div className="label">Género y división</div>
            <div className="chips">
              {generosConDiv.map(g => <button key={g} className={`chip ${g === genero ? 'on' : ''}`} onClick={() => cambiarDivision(g, DIVISIONES_GENERO[g].find(c => misDivs.some(d => d.genero === g && d.clase === c))!)}>{g === 'M' ? 'Hombres' : 'Mujeres'}</button>)}
            </div>
            <div className="chips">
              {clasesDelGenero.map(c => (
                <button key={c} className={`chip ${c === clase ? 'on' : ''}`} onClick={() => cambiarDivision(genero, c)}>
                  {nombreClase(c, juego.ajustes.nombresDivision)} · {disponiblesEn(genero, c)}
                </button>
              ))}
            </div>
            <div className="muted small">El número indica cuántos peleadores tienes disponibles en esa división.</div>
          </div>

          <div className="card">
            <div className="label" style={{ marginBottom: 8 }}>Peleadores</div>
            <div className="row" style={{ alignItems: 'stretch' }}>
              <SlotPeleador p={A} etiqueta="Peleador A" onClick={() => setPicker('a')} />
              <span className="mid muted" style={{ alignSelf: 'center' }}>VS</span>
              <SlotPeleador p={B} etiqueta="Peleador B" onClick={() => setPicker('b')} />
            </div>
            {A && B && (
              <div className="row between small" style={{ marginTop: 10 }}>
                <span className="muted">Momios {ma > 0 ? `+${ma}` : ma} / {mb > 0 ? `+${mb}` : mb}</span>
                <span style={{ color: 'var(--hype)', fontWeight: 700 }}>Hype {hype}</span>
              </div>
            )}
          </div>

          <Interruptor etiqueta="Campeonato" detalle={divActual ? (campeon ? `Campeón actual: ${nombreCompleto(campeon)}` : 'Título vacante: lo gana el ganador') : 'Esta división no existe'} valor={titulo}
            onChange={v => { setTitulo(v); if (v) setRounds(5); else setInterino(false); }} />
          {titulo && <Interruptor etiqueta="Campeonato interino" detalle="El campeón no puede pelear (por ejemplo, está lesionado)" valor={interino} onChange={setInterino} />}
          <Interruptor etiqueta="Cinco rounds" detalle={titulo ? 'Los campeonatos son a 5 rounds' : 'Normalmente solo estelares'} valor={rounds === 5} onChange={v => setRounds(v ? 5 : 3)} />

          {val && val.errores.map(m => <div key={m} className="alert bad"><Icon name="x" /><div>{m}</div></div>)}
          {val && val.avisos.map(m => <div key={m} className="alert warn"><Icon name="info" /><div>{m}</div></div>)}
        </div>
      </div>
      <div className="sticky-actions">
        <div className="row">
          <button className="iconbtn" style={{ width: 52, height: 48 }} aria-label="Sugerir" onClick={sugerir}><Icon name="bolt" /></button>
          {!boutVacia(bout) && <button className="iconbtn" style={{ width: 52, height: 48 }} aria-label="Quitar" onClick={() => { acc.quitarPelea(e.id, bout.id); nav(-1); }}><Icon name="trash" /></button>}
          <button className="btn primary grow" disabled={aId == null || bId == null || !!val?.errores.length} onClick={guardar}><Icon name="check" />Guardar pelea</button>
        </div>
      </div>

      {picker && (
        <SelectorPeleador
          juego={juego} sinEste={sinEste} genero={genero} clase={clase}
          excluir={picker === 'a' ? bId : aId}
          onClose={() => setPicker(null)}
          onElegir={id => { (picker === 'a' ? setA : setB)(id); setPicker(null); setError(null); }}
        />
      )}
    </>
  );
}

function SlotPeleador({ p, etiqueta, onClick }: { p?: Peleador; etiqueta: string; onClick: () => void }) {
  return (
    <button className="card tap center grow" style={{ padding: 10, minWidth: 0 }} onClick={onClick}>
      {p ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar p={p} size={56} /></div>
          <div className="mid ellipsis" style={{ marginTop: 6 }}>{p.apellido}</div>
          <div className="muted small">{recordTxt(p.rec.tot)}</div>
        </>
      ) : (
        <><div className="muted small">{etiqueta}</div><div className="mid muted" style={{ padding: '14px 0' }}>Elegir</div></>
      )}
    </button>
  );
}

function Interruptor({ etiqueta, detalle, valor, onChange }: { etiqueta: string; detalle: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="card tap row between" style={{ textAlign: 'left' }} onClick={() => onChange(!valor)}>
      <div><div style={{ fontWeight: 600 }}>{etiqueta}</div><div className="muted small">{detalle}</div></div>
      <span className={`sw ${valor ? 'on' : ''}`} />
    </button>
  );
}

function SelectorPeleador({ juego, sinEste, genero, clase, excluir, onClose, onElegir }: {
  juego: Juego; sinEste: Parameters<typeof disponibleParaEvento>[2]; genero: Genero; clase: ClaseId; excluir: number | null;
  onClose: () => void; onElegir: (id: number) => void;
}) {
  const lista = useMemo(() => {
    const todos = juego.peleadores.filter(p => p.companiaId === juego.miId && !p.retirado && p.genero === genero && p.clase === clase && p.id !== excluir);
    return todos
      .map(p => ({ p, d: disponibleParaEvento(juego, p, sinEste), r: rankPos(juego, p) }))
      .sort((x, y) => Number(y.d.ok) - Number(x.d.ok) || x.r - y.r);
  }, [juego, sinEste, genero, clase, excluir]);
  return (
    <Sheet titulo="Elegir peleador" completo onClose={onClose}>
      {lista.length === 0 && <Vacio titulo="No tienes peleadores en esta división" texto="Ficha agentes libres de este peso en Peleadores → Agentes libres." />}
      {lista.map(({ p, d, r }) => (
        <button key={p.id} className={`pickrow ${d.ok ? '' : 'off'}`} disabled={!d.ok} onClick={() => onElegir(p.id)}>
          <Avatar p={p} size={48} rank={r < 99 ? { texto: r === 0 ? 'C' : `#${r}`, campeon: r === 0 } : undefined} />
          <span className="grow" style={{ minWidth: 0 }}>
            <div className="mid ellipsis">{nombreCompleto(p)}</div>
            <div className="muted small">{recordTxt(p.rec.tot)} · {p.edad} años{d.ok ? '' : ` · ${d.motivo}`}</div>
            <div className="row" style={{ gap: 8, marginTop: 3 }}><div className="grow"><Bar valor={p.popularidad} max={100} color="var(--pop)" /></div><Estrellas valor={estrellasCalif(p)} /></div>
          </span>
        </button>
      ))}
    </Sheet>
  );
}
