import { bandera } from '../config/paises';
import { nombreClase } from '../domain/format';
import { boutVacia, hypeBout, momiosDe, rankPos } from '../domain/eventos';
import { recordTxt } from '../domain/peleador';
import type { Juego, Pelea, Peleador } from '../domain/types';
import { Icon } from '../ui/Icon';
import { Bar } from '../ui/kit';

export function etiquetaBout(i: number, total: number): string {
  if (i === total - 1) return 'Estelar';
  if (i === total - 2 && total >= 2) return 'Coestelar';
  return `Pelea #${i + 1}`;
}

export const txtMetodo = (r: NonNullable<Pelea['resultado']>) => {
  if (r.metodo === 'E') return 'Empate';
  if (r.metodo === 'NC') return 'Sin resultado';
  if (r.metodo === 'DQ') return `DQ R${r.round}`;
  return `${r.metodo} R${r.round} ${r.tiempo}`;
};

const rankTxt = (r: number) => (r === 0 ? 'C' : r < 99 ? `#${r}` : '');

function Lado({ p, snap, res, gana, perdio, momio }: {
  p?: Peleador; snap?: { record: string; rank: number; momio: number }; res?: string; gana?: boolean; perdio?: boolean; momio?: number;
}) {
  if (!p) return <div className="grow center muted">Por definir</div>;
  const rec = snap?.record ?? recordTxt(p.rec.tot);
  const rk = snap ? snap.rank : undefined;
  return (
    <div className="grow center" style={{ opacity: perdio ? 0.45 : 1, minWidth: 0 }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{bandera(p.pais)}</div>
      <div className="mid ellipsis" style={{ marginTop: 4 }}>{p.apellido}</div>
      <div className="muted small">{rec}</div>
      <div className="accent small" style={{ fontWeight: 700, minHeight: 16 }}>{rk != null ? rankTxt(rk) : ''}</div>
      {res && gana && <div className="num small" style={{ color: 'var(--ok)' }}>{res}</div>}
      {momio != null && !res && <div className="muted small">{momio > 0 ? `+${momio}` : momio}</div>}
    </div>
  );
}

export function BoutCard({ j, b, etiqueta, onClick, mostrarResultado }: {
  j: Juego; b: Pelea; etiqueta: string; onClick?: () => void; mostrarResultado?: boolean;
}) {
  const a = j.peleadores.find(p => p.id === b.aId);
  const c = j.peleadores.find(p => p.id === b.bId);
  const vacia = boutVacia(b);
  const res = mostrarResultado ? b.resultado : undefined;
  const [ma, mb] = a && c ? (b.snap ? [b.snap.a.momio, b.snap.b.momio] : momiosDe(a, c)) : [undefined, undefined];
  const hype = b.resultado || b.snap ? b.hype : hypeBout(j, b);
  const rA = a ? (b.snap ? { record: b.snap.a.record, rank: b.snap.a.rank, momio: b.snap.a.momio } : { record: recordTxt(a.rec.tot), rank: rankPos(j, a), momio: ma ?? 0 }) : undefined;
  const rB = c ? (b.snap ? { record: b.snap.b.record, rank: b.snap.b.rank, momio: b.snap.b.momio } : { record: recordTxt(c.rec.tot), rank: rankPos(j, c), momio: mb ?? 0 }) : undefined;
  return (
    <div
      className="card tap"
      style={{ padding: '12px 12px 14px', borderColor: vacia ? 'rgba(255,176,32,.45)' : undefined, background: vacia ? 'rgba(255,176,32,.06)' : undefined }}
      onClick={onClick} role="button"
    >
      <div className="row between small" style={{ marginBottom: 8 }}>
        <span className="muted" style={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{etiqueta}</span>
        <span className="row" style={{ gap: 6 }}>
          {b.torneoId != null && <span className="pill accent"><Icon name="trophy" />Torneo</span>}
          {b.titulo && <span className="pill accent"><Icon name="trophy" />{b.interino ? 'Interino' : 'Campeonato'}</span>}
          <span className="pill">{b.genero === 'F' ? '♀ ' : ''}{nombreClase(b.clase, j.ajustes.nombresDivision)}</span>
          <span className="pill">{b.rounds} rounds</span>
        </span>
      </div>
      {vacia ? (
        <div className="center" style={{ padding: '10px 0' }}>
          <div className="mid muted">{a ? a.apellido : '—'} vs {c ? c.apellido : '—'}</div>
          <div className="small accent" style={{ marginTop: 4 }}>Toca para programar la pelea</div>
        </div>
      ) : (
        <>
          <div className="row" style={{ alignItems: 'flex-start', gap: 4 }}>
            <Lado p={a} snap={rA} res={res ? txtMetodo(res) : undefined} gana={res?.ganadorId === a?.id} perdio={!!res && res.ganadorId != null && res.ganadorId !== a?.id} momio={rA?.momio} />
            <div className="center" style={{ width: 70, paddingTop: 12 }}>
              <div className="mid muted">VS</div>
              <div style={{ marginTop: 6 }}><Bar valor={hype} max={100} color="var(--hype)" /></div>
              <div className="small" style={{ color: 'var(--hype)', fontWeight: 700 }}>Hype {hype}</div>
            </div>
            <Lado p={c} snap={rB} res={res ? txtMetodo(res) : undefined} gana={res?.ganadorId === c?.id} perdio={!!res && res.ganadorId != null && res.ganadorId !== c?.id} momio={rB?.momio} />
          </div>
          {res && (res.ganadorId == null) && <div className="center small muted" style={{ marginTop: 6 }}>{txtMetodo(res)}</div>}
        </>
      )}
    </div>
  );
}
