import { memo } from 'react';
import { bandera } from '../config/paises';
import type { Peleador } from '../domain/types';

const PIEL = ['#f1c9a5', '#e0ac82', '#c68642', '#a9683a', '#8d5524', '#6b3f1f', '#f6d7bf'];
const SHORT = ['#c8f53c', '#38bdf8', '#ff6b9a', '#fbbf24', '#a78bfa', '#34d399', '#fb923c', '#e5e7eb'];

// Silueta generada por código a partir del id: sin fotos
function AvatarBase({ p, size = 60, rank }: { p: Peleador; size?: number; rank?: { texto: string; campeon: boolean } }) {
  const piel = PIEL[(p.id * 7) % PIEL.length];
  const short = SHORT[(p.id * 13) % SHORT.length];
  const pelo = ['#1b1b1b', '#3b2a1a', '#6b4a2b', '#111', '#8a6d3b'][(p.id * 5) % 5];
  const calvo = p.id % 7 === 0;
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64">
        <rect width="64" height="64" rx="18" fill="#242b34" />
        <path d="M8 64c0-14 10-22 24-22s24 8 24 22z" fill={short} opacity="0.92" />
        <path d="M24 44c2 4 5 6 8 6s6-2 8-6l-2-6H26z" fill={piel} />
        <ellipse cx="32" cy="28" rx="11" ry="12.5" fill={piel} />
        {!calvo && <path d="M20.5 26c0-9 5-13 11.5-13s11.5 4 11.5 13c-3-5-7-6.5-11.5-6.5S23.5 21 20.5 26z" fill={pelo} />}
        <path d="M24 31.5c1.6 1.4 4.4 2.2 8 2.2" stroke="#00000022" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      <span className="flag">{bandera(p.pais)}</span>
      {rank && <span className={`rk ${rank.campeon ? 'c' : ''}`}>{rank.texto}</span>}
    </div>
  );
}

export const Avatar = memo(AvatarBase);
