import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEDE_POR_ID } from '../config/sedes';
import { bandera } from '../config/paises';
import { estadoVisual, eventoDeSemana } from '../domain/eventos';
import { anio, fechaCorta, semanaDelAnio } from '../domain/format';
import { eventos as acc, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Sheet, TopBar } from '../ui/kit';

const SEMANAS_MOSTRADAS = 104;

export function Eventos() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [nueva, setNueva] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inicio = juego.semanaAbs; // la primera casilla siempre es la semana actual

  const celdas = useMemo(
    () => Array.from({ length: SEMANAS_MOSTRADAS }, (_, i) => ({ semana: inicio + i, evento: eventoDeSemana(juego, inicio + i) })),
    [juego, inicio],
  );

  const crear = (tipo: 'ppv' | 'noche') => {
    if (nueva == null) return;
    const r = acc.crear(nueva, tipo);
    if (r.error) { setError(r.error); return; }
    setNueva(null);
    nav(`/evento/${r.id}`);
  };

  const proximos = celdas.filter(c => c.evento && c.evento.estado === 'borrador').length;

  return (
    <>
      <TopBar titulo="Calendario" atras={false} />
      <div style={{ padding: '8px 16px 0' }} className="row between small muted">
        <span>{fecha(juego.semanaAbs)}</span>
        <span>{proximos} evento{proximos === 1 ? '' : 's'} por hacer</span>
      </div>
      <div className="scroll">
        <div className="cal">
          {celdas.map(({ semana, evento }) => {
            const hoy = semana === juego.semanaAbs;
            const pasada = semana < juego.semanaAbs;
            const estado = evento ? estadoVisual(evento) : null;
            const sede = evento ? SEDE_POR_ID[evento.sedeId] : null;
            return (
              <div key={semana} className={`cal-cell ${hoy ? 'hoy' : ''} ${pasada && !evento ? 'pasada' : ''}`}>
                <div className="cal-h">{fechaCorta(semana)}{hoy ? ' · hoy' : ''}</div>
                {evento ? (
                  <button className={`cal-ev ${estado}`} onClick={() => nav(`/evento/${evento.id}`)}>
                    <b>{evento.nombre}</b>
                    <span>{sede?.nombre}</span>
                    <span style={{ fontSize: 18 }}>{sede ? bandera(sede.pais) : ''}</span>
                    <em>{estado === 'listo' ? 'Listo' : estado === 'incompleto' ? 'Incompleto' : estado === 'realizado' ? 'Realizado' : ''}</em>
                  </button>
                ) : pasada ? (
                  <div className="cal-vacio" />
                ) : (
                  <button className="cal-vacio mas" onClick={() => { setNueva(semana); setError(null); }} aria-label={`Crear evento semana ${semanaDelAnio(semana)}`}>
                    <Icon name="plus" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="row small muted wrap" style={{ gap: 12, padding: '14px 0 4px' }}>
          <span><i className="dotc listo" /> Listo</span>
          <span><i className="dotc incompleto" /> Incompleto</span>
          <span><i className="dotc realizado" /> Realizado</span>
        </div>
      </div>

      {nueva != null && (
        <Sheet titulo={`Nuevo evento · ${fechaCorta(nueva)}`} onClose={() => setNueva(null)}>
          {error && <div className="alert bad" style={{ marginBottom: 12 }}><Icon name="x" /><div>{error}</div></div>}
          <div className="stack">
            <button className="btn primary" onClick={() => crear('noche')}>Fight Night</button>
            <p className="muted small">Evento de transmisión: más barato y con menos peso en la taquilla.</p>
            <button className="btn" onClick={() => crear('ppv')}>Evento numerado (PPV)</button>
            <p className="muted small">Gran evento numerado: cuesta más producirlo, pero mueve más audiencia.</p>
            <button className="btn" onClick={() => { setNueva(null); nav('/torneos'); }}>Torneo (llaves de 4, 8 o 16)</button>
            <button className="btn disabled" disabled>Evento internacional · Fase 5</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function fecha(s: number) {
  return `Hoy: Año ${anio(s)} · Semana ${semanaDelAnio(s)}`;
}
