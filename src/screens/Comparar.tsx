import { useParams } from 'react-router-dom';
import { DISCIPLINAS, DISCIPLINA_LABEL, ESTILOS } from '../config/divisiones';
import { altura, peso } from '../domain/format';
import { estatus, estrellasCalif, nombreCorto, recordTxt, scoreCalif } from '../domain/peleador';
import type { Peleador } from '../domain/types';
import { useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Bar, Estrellas, Forma, TopBar, Vacio } from '../ui/kit';

export function Comparar() {
  const { a, b } = useParams();
  const juego = useGame(s => s.juego)!;
  const A = juego.peleadores.find(p => p.id === Number(a));
  const B = juego.peleadores.find(p => p.id === Number(b));
  const u = juego.ajustes.unidades;
  if (!A || !B) return (<><TopBar titulo="Comparar" /><Vacio titulo="Peleadores no encontrados" /></>);

  const fila = (etq: string, x: string | number, y: string | number, mejor?: 'a' | 'b' | null) => (
    <div className="vs" key={etq}>
      <div className={`mid ${mejor === 'a' ? 'better' : ''}`}>{x}</div>
      <div className="lab">{etq}</div>
      <div className={`mid ${mejor === 'b' ? 'better' : ''}`}>{y}</div>
    </div>
  );
  const cmp = (x: number, y: number, mayor = true): 'a' | 'b' | null => (x === y ? null : (x > y) === mayor ? 'a' : 'b');
  const recRatio = (p: Peleador) => p.rec.tot.v / Math.max(1, p.rec.tot.v + p.rec.tot.d);

  return (
    <>
      <TopBar titulo="Comparar" />
      <div className="scroll">
        <div className="vs" style={{ alignItems: 'start' }}>
          <div><Avatar p={A} size={72} /><div className="mid" style={{ marginTop: 6 }}>{nombreCorto(A)}</div><div className="muted small">{estatus(A)}</div></div>
          <div className="mid muted">VS</div>
          <div><Avatar p={B} size={72} /><div className="mid" style={{ marginTop: 6 }}>{nombreCorto(B)}</div><div className="muted small">{estatus(B)}</div></div>
        </div>
        {fila('Edad', A.edad, B.edad)}
        {fila('Altura', altura(A.alturaCm, u), altura(B.alturaCm, u), cmp(A.alturaCm, B.alturaCm))}
        {fila('Peso', peso(A.pesoKg, u), peso(B.pesoKg, u))}
        {fila('Récord', recordTxt(A.rec.tot), recordTxt(B.rec.tot), cmp(recRatio(A), recRatio(B)))}
        {fila('Estilo', ESTILOS[A.estilo].es, ESTILOS[B.estilo].es)}
        <div className="vs"><div><Estrellas valor={estrellasCalif(A)} /></div><div className="lab">Calificación</div><div><Estrellas valor={estrellasCalif(B)} /></div></div>
        {fila('Popularidad', Math.round(A.popularidad), Math.round(B.popularidad), cmp(A.popularidad, B.popularidad))}
        {fila('Moral', Math.round(A.moral), Math.round(B.moral), cmp(A.moral, B.moral))}
        {fila('Fatiga', Math.round(A.fatiga), Math.round(B.fatiga), cmp(A.fatiga, B.fatiga, false))}
        {fila('Daño', Math.round(A.dano), Math.round(B.dano), cmp(A.dano, B.dano, false))}
        {fila('Racha', A.racha.n ? `${A.racha.n}${A.racha.tipo}` : '—', B.racha.n ? `${B.racha.n}${B.racha.tipo}` : '—')}
        <div className="vs"><div><Forma forma={A.forma} /></div><div className="lab">Forma</div><div><Forma forma={B.forma} /></div></div>
        {fila('Nivel global', scoreCalif(A).toFixed(1), scoreCalif(B).toFixed(1), cmp(scoreCalif(A), scoreCalif(B)))}

        <div className="section-title" style={{ marginTop: 18 }}>Ataque y defensa</div>
        {DISCIPLINAS.map(d => (
          <div className="vs" key={d} style={{ gridTemplateColumns: '1fr 70px 1fr' }}>
            <div className="stack" style={{ gap: 4, direction: 'rtl' }}>
              <Bar valor={A.ataque[d]} color="var(--atk)" grueso /><Bar valor={A.defensa[d]} color="var(--def)" grueso />
            </div>
            <div className="lab">{DISCIPLINA_LABEL[d]}</div>
            <div className="stack" style={{ gap: 4 }}>
              <Bar valor={B.ataque[d]} color="var(--atk)" grueso /><Bar valor={B.defensa[d]} color="var(--def)" grueso />
            </div>
          </div>
        ))}
        <p className="muted small center" style={{ marginTop: 10 }}><span style={{ color: 'var(--atk)' }}>■</span> Ataque · <span style={{ color: 'var(--def)' }}>■</span> Defensa</p>
      </div>
    </>
  );
}
