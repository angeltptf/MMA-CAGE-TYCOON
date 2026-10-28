import { memo } from 'react';
import { ESTILOS } from '../config/divisiones';
import { abrevClase, altura, peso } from '../domain/format';
import { estatus, recordTxt } from '../domain/peleador';
import type { InfoRank } from '../domain/rankings';
import type { Ajustes, Peleador } from '../domain/types';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Bar, Forma, Pill } from '../ui/kit';

interface Props {
  p: Peleador;
  info?: InfoRank;
  unidades: Ajustes['unidades'];
  siglas?: string;
  seleccion?: boolean;
  modoSeleccion?: boolean;
  onClick: (p: Peleador) => void;
}

function Card({ p, info, unidades, siglas, seleccion, modoSeleccion, onClick }: Props) {
  const rank = info
    ? info.rank === 0
      ? { texto: info.dobleCampeon ? 'C²' : 'C', campeon: true }
      : info.rank < 99 ? { texto: `#${info.rank}`, campeon: false } : undefined
    : undefined;
  return (
    <div className={`fcard ${seleccion ? 'sel' : ''}`} onClick={() => onClick(p)} role="button">
      <div className="col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 68 }}>
        <Avatar p={p} size={60} rank={rank} />
        <Pill>{abrevClase(p.clase, p.genero)}</Pill>
      </div>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div className="row small" style={{ gap: 6 }}>
          <span className="accent" style={{ fontWeight: 600 }}>{estatus(p)}</span>
          <span className="muted">· {ESTILOS[p.estilo].es}</span>
          {p.lesion && <Pill tipo="bad">Lesionado</Pill>}
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <span className="name ellipsis">{p.nombre} {p.apellido}</span>
          <span className="rec">{recordTxt(p.rec.tot)}</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Forma forma={p.forma} />
          <span className="meta ellipsis">{p.edad} años · {altura(p.alturaCm, unidades)} · {peso(p.pesoKg, unidades)}</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><Bar valor={p.popularidad} max={100} color="var(--pop)" /></div>
          <div style={{ width: 64, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Bar valor={p.fatiga} max={100} color="var(--fatiga)" />
            <Bar valor={p.dano} max={100} color="var(--dano)" />
          </div>
          {p.contrato
            ? <span className="pill accent">{siglas ? `${siglas} · ` : ''}{p.contrato.peleasRestantes} pel.</span>
            : <span className="pill">Libre</span>}
        </div>
      </div>
      {modoSeleccion && <span className="sel-mark">{seleccion && <Icon name="check" />}</span>}
    </div>
  );
}

export const FighterCard = memo(Card);
