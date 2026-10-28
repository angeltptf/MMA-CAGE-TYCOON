import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import type { Resultado } from '../domain/types';

export function TopBar({ titulo, atras = true, derecha, onAtras }: {
  titulo: string; atras?: boolean; derecha?: ReactNode; onAtras?: () => void;
}) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {atras && (
        <button className="iconbtn" aria-label="Atrás" onClick={() => (onAtras ? onAtras() : nav(-1))}>
          <Icon name="back" />
        </button>
      )}
      <h1 className="ellipsis">{titulo}</h1>
      {derecha}
    </header>
  );
}

export function Tabs<T extends string>({ items, valor, onChange }: {
  items: { id: T; label: string; badge?: number }[]; valor: T; onChange: (v: T) => void;
}) {
  return (
    <div className="tabs">
      {items.map(i => (
        <button key={i.id} className={i.id === valor ? 'on' : ''} onClick={() => onChange(i.id)}>
          {i.label}{i.badge ? ` (${i.badge})` : ''}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ items, valor, onChange }: {
  items: { id: T; label: string }[]; valor: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {items.map(i => (
        <button key={i.id} className={i.id === valor ? 'on' : ''} onClick={() => onChange(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}

export function Bar({ valor, max = 10, color, grueso, etiqueta }: {
  valor: number; max?: number; color: string; grueso?: boolean; etiqueta?: string;
}) {
  const w = Math.max(0, Math.min(1, valor / max)) * 100;
  return (
    <div className={`bar ${grueso ? 'thick' : ''} ${valor > max ? 'over' : ''}`} style={{ '--c': color } as CSSProperties} title={etiqueta}>
      <i style={{ width: `${w}%` }} />
    </div>
  );
}

export function BarraValor({ etiqueta, valor, max = 10, color, invertida }: {
  etiqueta: string; valor: number; max?: number; color: string; invertida?: boolean;
}) {
  const sobre = valor > max;
  const c = invertida ? (valor > 6 ? 'var(--bad)' : valor > 3 ? 'var(--warn)' : color) : color;
  return (
    <div className={`barrow ${sobre ? 'over' : ''}`}>
      <span className="k">{etiqueta}</span>
      <div className="grow"><Bar valor={valor} max={max} color={c} grueso /></div>
      <span className="v">{Math.round(valor * 10) / 10 === Math.round(valor) ? Math.round(valor) : valor.toFixed(1)}</span>
    </div>
  );
}

export function Estrellas({ valor, total = 5 }: { valor: number; total?: number }) {
  const out = [];
  for (let i = 1; i <= total; i++) {
    const full = valor >= i;
    const half = !full && valor >= i - 0.5;
    out.push(
      <span key={i} className={full || half ? '' : 'off'} style={half ? { opacity: 0.55 } : undefined}>
        <Icon name="star" fill />
      </span>,
    );
  }
  return <span className="stars">{out}</span>;
}

export function Forma({ forma }: { forma: Resultado[] }) {
  const items: (Resultado | null)[] = [...forma];
  while (items.length < 5) items.unshift(null);
  return (
    <span className="dots">
      {items.slice(-5).map((r, i) => (
        <span key={i} className={`dot ${r ?? 'empty'}`}>{r === 'V' ? 'W' : r === 'D' ? 'L' : r === 'E' ? 'D' : ''}</span>
      ))}
    </span>
  );
}

export function Pill({ children, tipo }: { children: ReactNode; tipo?: 'accent' | 'bad' | 'warn' | 'ok' }) {
  return <span className={`pill ${tipo ?? ''}`}>{children}</span>;
}

export function Chips<T extends string>({ items, valor, onChange }: {
  items: { id: T; label: string }[]; valor: T; onChange: (v: T) => void;
}) {
  return (
    <div className="chips">
      {items.map(i => (
        <button key={i.id} className={`chip ${i.id === valor ? 'on' : ''}`} onClick={() => onChange(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}

export function Stepper({ valor, onChange, min = 0, max = 99, paso = 1, formato, editable }: {
  valor: number; onChange: (v: number) => void; min?: number; max?: number; paso?: number;
  formato?: (v: number) => string; editable?: boolean;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className="stepper">
      <button onClick={() => set(valor - paso)} aria-label="Menos">−</button>
      {editable ? (
        <input
          className="val" type="number" inputMode="decimal" value={Number.isFinite(valor) ? valor : 0}
          onChange={e => set(parseFloat(e.target.value) || 0)}
        />
      ) : (
        <span className="val num mid">{formato ? formato(valor) : valor}</span>
      )}
      <button onClick={() => set(valor + paso)} aria-label="Más">+</button>
    </div>
  );
}

export function Sheet({ titulo, onClose, children, pie, completo }: {
  titulo: string; onClose: () => void; children: ReactNode; pie?: ReactNode; completo?: boolean;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`sheet ${completo ? 'full' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{titulo}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {pie && <div className="sheet-foot">{pie}</div>}
      </div>
    </div>
  );
}

export function Confirmar({ titulo, texto, confirmar = 'Aceptar', peligro, onSi, onNo }: {
  titulo: string; texto: ReactNode; confirmar?: string; peligro?: boolean; onSi: () => void; onNo: () => void;
}) {
  return (
    <div className="overlay center" onClick={onNo}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="btns">
          <button className="btn" onClick={onNo}>Cancelar</button>
          <button className={`btn ${peligro ? 'danger' : 'primary'}`} onClick={onSi}>{confirmar}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ mensaje, error, onFin }: { mensaje: string; error?: boolean; onFin: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFin, 2600);
    return () => clearTimeout(t);
  }, [mensaje, onFin]);
  return <div className={`toast ${error ? 'error' : ''}`}>{mensaje}</div>;
}

export function Vacio({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="empty">
      <div className="mid">{titulo}</div>
      {texto && <p>{texto}</p>}
    </div>
  );
}

export function Fila({ icono, titulo, detalle, onClick, bloqueado, derecha }: {
  icono: IconName; titulo: string; detalle?: string; onClick?: () => void; bloqueado?: boolean; derecha?: ReactNode;
}) {
  return (
    <button className={`list-item ${bloqueado ? 'lock' : ''}`} style={{ width: '100%', textAlign: 'left' }} onClick={onClick}>
      <span className="ico"><Icon name={icono} /></span>
      <span className="grow">
        <div style={{ fontWeight: 600 }}>{titulo}</div>
        {detalle && <div className="muted small">{detalle}</div>}
      </span>
      {derecha}
      <span className="chev"><Icon name={bloqueado ? 'lock' : 'chevron'} /></span>
    </button>
  );
}

// Detecta doble toque (para cambiar dirección de orden, editar, etc.)
export function useDobleToque(accion: () => void, ms = 320) {
  const ultimo = useRef(0);
  return () => {
    const ahora = Date.now();
    if (ahora - ultimo.current < ms) { ultimo.current = 0; accion(); }
    else ultimo.current = ahora;
  };
}

export function useDebounced<T>(v: T, ms = 200): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}
