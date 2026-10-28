import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEDES, TIPO_SEDE_LABEL, PAISES_EXTRA } from '../config/sedes';
import { PAIS_POR_CODIGO, bandera } from '../config/paises';
import { sedeDesbloqueada } from '../domain/eventos';
import { dinero } from '../domain/format';
import { eventos as acc, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { TopBar } from '../ui/kit';

export function Sedes() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const setAviso = useGame(s => s.setAviso);
  const nav = useNavigate();
  const e = juego.eventos.find(x => x.id === Number(id));
  const [pais, setPais] = useState('');
  const [soloLibres, setSoloLibres] = useState(false);

  const paises = useMemo(() => {
    const codes = [...new Set(SEDES.map(s => s.pais))];
    return codes.map(c => ({ code: c, nombre: PAIS_POR_CODIGO[c]?.nombre ?? PAISES_EXTRA[c] ?? c })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, []);
  const lista = SEDES.filter(s => (!pais || s.pais === pais) && (!soloLibres || sedeDesbloqueada(juego, s)));

  const elegir = (sedeId: string) => {
    if (!e) return;
    const err = acc.configurar(e.id, { sedeId });
    if (err) { setAviso(err); return; }
    nav(-1);
  };

  return (
    <>
      <TopBar titulo="Reserva la sede" />
      <div style={{ padding: '10px 16px 6px' }} className="stack">
        <select className="select" value={pais} onChange={ev => setPais(ev.target.value)}>
          <option value="">Todos los países</option>
          {paises.map(p => <option key={p.code} value={p.code}>{bandera(p.code)} {p.nombre}</option>)}
        </select>
        <button className={`chip ${soloLibres ? 'on' : ''}`} style={{ alignSelf: 'flex-start' }} onClick={() => setSoloLibres(v => !v)}>Solo disponibles</button>
      </div>
      <div className="scroll flush">
        {lista.map(s => {
          const libre = sedeDesbloqueada(juego, s);
          const actual = e?.sedeId === s.id;
          return (
            <button key={s.id} className="list-item" style={{ width: '100%', textAlign: 'left', opacity: libre ? 1 : 0.45, background: actual ? 'var(--accent-soft)' : undefined }} onClick={() => libre && elegir(s.id)}>
              <span style={{ fontSize: 28 }}>{bandera(s.pais)}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <div className="mid ellipsis">{s.nombre}</div>
                <div className="muted small">{s.ciudad} · {TIPO_SEDE_LABEL[s.tipo]}</div>
                <div className="small">Aforo <b>{s.aforo.toLocaleString('en-US')}</b> · Renta <b>{dinero(s.costo)}</b></div>
                {!libre && <div className="small" style={{ color: 'var(--warn)' }}>{s.soloOferta ? 'Se desbloquea con un contrato de inversionista de ese país (Negocios → Ofertas)' : `Requiere popularidad ${s.popMin}`}</div>}
              </span>
              {!libre && <span className="muted" style={{ width: 20 }}><Icon name="lock" /></span>}
              {actual && <span className="accent" style={{ width: 22 }}><Icon name="check" /></span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
