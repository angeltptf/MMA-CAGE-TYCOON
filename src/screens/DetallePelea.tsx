import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DISCIPLINAS, DISCIPLINA_LABEL, ESTILOS } from '../config/divisiones';
import { altura, nombreClase, peso } from '../domain/format';
import { recordTxt, nombreCompleto } from '../domain/peleador';
import type { Pelea, Peleador } from '../domain/types';
import { useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Bar, Forma, Tabs, TopBar, Vacio } from '../ui/kit';
import { txtMetodo } from './BoutCard';

type TabId = 'tape' | 'narracion' | 'stats';

export function DetallePelea() {
  const { eventoId, peleaId } = useParams();
  const juego = useGame(s => s.juego)!;
  const [tab, setTab] = useState<TabId>('tape');
  const e = juego.eventos.find(x => x.id === Number(eventoId));
  const b = e?.cartelera.find(x => x.id === Number(peleaId));
  const A = juego.peleadores.find(p => p.id === b?.aId);
  const B = juego.peleadores.find(p => p.id === b?.bId);
  if (!e || !b || !A || !B) return (<><TopBar titulo="Detalle" /><Vacio titulo="No se encontró la pelea" /></>);
  return (
    <>
      <TopBar titulo={`${A.apellido} vs ${B.apellido}`} />
      <div className="center small muted" style={{ padding: '6px 16px 0' }}>
        {b.titulo ? (b.interino ? 'Campeonato interino · ' : 'Campeonato · ') : ''}{b.genero === 'F' ? '♀ ' : ''}{nombreClase(b.clase, juego.ajustes.nombresDivision)} · {b.rounds} rounds · {e.nombre}
      </div>
      <Tabs<TabId> valor={tab} onChange={setTab} items={[{ id: 'tape', label: 'Comparativa' }, { id: 'narracion', label: 'Narración' }, { id: 'stats', label: 'Estadísticas' }]} />
      <div className="scroll">
        {tab === 'tape' && <Tape b={b} A={A} B={B} />}
        {tab === 'narracion' && <Narracion b={b} A={A} B={B} />}
        {tab === 'stats' && <Stats b={b} A={A} B={B} />}
      </div>
    </>
  );
}

function Fila({ x, lab, y }: { x: React.ReactNode; lab: string; y: React.ReactNode }) {
  return <div className="tape"><div className="mid">{x}</div><div className="lab">{lab}</div><div className="mid">{y}</div></div>;
}

function Tape({ b, A, B }: { b: Pelea; A: Peleador; B: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const u = juego.ajustes.unidades;
  const sa = b.snap?.a;
  const sb = b.snap?.b;
  const mom = (m?: number) => (m == null ? '—' : m > 0 ? `+${m}` : `${m}`);
  return (
    <div>
      <div className="tape" style={{ alignItems: 'start' }}>
        <div><Avatar p={A} size={72} rank={sa ? { texto: sa.rank === 0 ? 'C' : sa.rank < 99 ? `#${sa.rank}` : '', campeon: sa.rank === 0 } : undefined} /><div className="mid" style={{ marginTop: 6 }}>{A.apellido}</div></div>
        <div className="mid muted">VS</div>
        <div><Avatar p={B} size={72} rank={sb ? { texto: sb.rank === 0 ? 'C' : sb.rank < 99 ? `#${sb.rank}` : '', campeon: sb.rank === 0 } : undefined} /><div className="mid" style={{ marginTop: 6 }}>{B.apellido}</div></div>
      </div>
      <Fila x={A.edad} lab="Edad" y={B.edad} />
      <Fila x={altura(A.alturaCm, u)} lab="Altura" y={altura(B.alturaCm, u)} />
      <Fila x={peso(sa?.pesoKg ?? A.pesoKg, u)} lab="Peso (pesaje)" y={peso(sb?.pesoKg ?? B.pesoKg, u)} />
      <Fila x={sa?.record ?? recordTxt(A.rec.tot)} lab="Récord total" y={sb?.record ?? recordTxt(B.rec.tot)} />
      <Fila x={recordTxt(A.rec.mio)} lab={`En ${juego.nombre}`} y={recordTxt(B.rec.mio)} />
      <Fila x={ESTILOS[A.estilo].es} lab="Estilo" y={ESTILOS[B.estilo].es} />
      <Fila x={mom(sa?.momio)} lab="Momios" y={mom(sb?.momio)} />
      <Fila x={sa?.racha ?? '—'} lab="Racha" y={sb?.racha ?? '—'} />
      <div className="tape"><div><Forma forma={sa?.forma ?? A.forma} /></div><div className="lab">Forma</div><div><Forma forma={sb?.forma ?? B.forma} /></div></div>
      {DISCIPLINAS.map(d => (
        <div className="tape" key={d}>
          <div className="roundbars" style={{ direction: 'rtl' }}><Bar valor={A.ataque[d]} color="var(--atk)" grueso /><Bar valor={A.defensa[d]} color="var(--def)" grueso /></div>
          <div className="lab">{DISCIPLINA_LABEL[d]}</div>
          <div className="roundbars"><Bar valor={B.ataque[d]} color="var(--atk)" grueso /><Bar valor={B.defensa[d]} color="var(--def)" grueso /></div>
        </div>
      ))}
      <p className="muted small center" style={{ marginTop: 8 }}><span style={{ color: 'var(--atk)' }}>■</span> Ataque · <span style={{ color: 'var(--def)' }}>■</span> Defensa</p>
    </div>
  );
}

function Narracion({ b, A, B }: { b: Pelea; A: Peleador; B: Peleador }) {
  const r = b.resultado;
  if (!r) return <Vacio titulo="Todavía no se pelea" texto="La narración round por round aparece cuando se simula la Noche de pelea." />;
  const ganador = r.ganadorId === A.id ? A : r.ganadorId === B.id ? B : null;
  return (
    <div className="stack">
      <div className="card center">
        <div className="label">Resultado</div>
        <div className="big" style={{ marginTop: 4 }}>{txtMetodo(r)}</div>
        <div className="muted" style={{ marginTop: 4 }}>{ganador ? `Gana ${nombreCompleto(ganador)}${r.tecnica && r.metodo !== 'DU' ? ` · ${r.tecnica}` : ''}` : 'Sin ganador'}</div>
      </div>
      <div className="card stack" style={{ gap: 12 }}>
        {r.narracion.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  );
}

function Stats({ b, A, B }: { b: Pelea; A: Peleador; B: Peleador }) {
  const r = b.resultado;
  if (!r) return <Vacio titulo="Todavía no se pelea" texto="Las estadísticas aparecen al terminar la pelea." />;
  const { a, b: c } = r.stats;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const dec = r.metodo === 'DU' || r.metodo === 'DD' || r.metodo === 'DM' || r.metodo === 'E';
  return (
    <div className="stack">
      <div className="card">
        <Fila x={a.golpesSig} lab="Golpes significativos" y={c.golpesSig} />
        <Fila x={a.golpes} lab="Golpes lanzados" y={c.golpes} />
        <Fila x={`${a.derribos}/${a.intentosDerribo}`} lab="Derribos" y={`${c.derribos}/${c.intentosDerribo}`} />
        <Fila x={a.subIntentos} lab="Intentos de sumisión" y={c.subIntentos} />
        <Fila x={mmss(a.controlSeg)} lab="Tiempo de control" y={mmss(c.controlSeg)} />
        <Fila x={a.caidas} lab="Caídas recibidas" y={c.caidas} />
      </div>
      {dec && (
        <div className="card">
          <h3>Tarjetas de los jueces</h3>
          <div className="row between muted small"><span>{A.apellido}</span><span>{B.apellido}</span></div>
          {r.tarjetas.map(([x, y], i) => (
            <div key={i} className="card-judge"><span style={{ color: x > y ? 'var(--accent)' : undefined }}>{x}</span><span className="muted small" style={{ alignSelf: 'center' }}>Juez {i + 1}</span><span style={{ color: y > x ? 'var(--accent)' : undefined }}>{y}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
