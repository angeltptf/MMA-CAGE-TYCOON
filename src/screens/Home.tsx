import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RANGO_RESPALDO_DIAS } from '../config/balance';
import { alcance, miEmpresa, ordenCompanias, popularidadEmpresa } from '../domain/empresa';
import { dinero, fecha } from '../domain/format';
import { disponible, nombreCompleto, porVencer } from '../domain/peleador';
import { exportarJSON } from '../store/db';
import { useGame } from '../store/game';
import { Icon } from '../ui/Icon';

export function Home() {
  const juego = useGame(s => s.juego)!;
  const avanzar = useGame(s => s.avanzar);
  const marcarRespaldo = useGame(s => s.marcarRespaldo);
  const setAviso = useGame(s => s.setAviso);
  const nav = useNavigate();

  const mia = miEmpresa(juego);
  const pop = popularidadEmpresa(mia);
  const mios = useMemo(() => juego.peleadores.filter(p => p.companiaId === juego.miId && !p.retirado), [juego.peleadores, juego.miId]);
  const disp = mios.filter(disponible).length;
  const lesionados = mios.filter(p => p.lesion);
  const vencen = mios.filter(porVencer);
  const posicion = ordenCompanias(juego).findIndex(c => c.esMia) + 1;
  const noLeidas = juego.noticias.filter(n => !n.leida).length;
  const eventos = juego.eventos as { semana: number; nombre?: string }[];
  const eventoHoy = eventos.find(e => e.semana === juego.semanaAbs);
  const dias = (Date.now() - juego.ultimoRespaldo) / 86_400_000;
  const pedirRespaldo = juego.ajustes.recordatorioRespaldo && dias >= RANGO_RESPALDO_DIAS;

  const onAvanzar = () => {
    const antes = juego.semanaAbs;
    avanzar();
    const r = useGame.getState().ultimoResumen;
    const partes: string[] = [];
    if (r?.retiros) partes.push(`${r.retiros} retiro${r.retiros > 1 ? 's' : ''}`);
    if (r?.nuevos) partes.push(`${r.nuevos} nuevo${r.nuevos > 1 ? 's' : ''} talento${r.nuevos > 1 ? 's' : ''}`);
    if (r?.lesionadosMios.length) partes.push(`lesión: ${r.lesionadosMios.join(', ')}`);
    setAviso(`${fecha(antes + 1)}${partes.length ? ' · ' + partes.join(' · ') : ''}`);
  };

  return (
    <div className="scroll">
      <div className="stack">
        <div className="hero">
          <div className="logo-badge" style={{ background: mia.color, color: '#10140a' }}>{mia.siglas}</div>
          <h1 className="mid" style={{ fontSize: 28, textTransform: 'uppercase' }}>{mia.nombre}</h1>
        </div>

        <div>
          <div className="reach">
            <i style={{ width: `${Math.max(8, pop)}%` }} />
            <span>{alcance(pop)}</span>
          </div>
          <div className="row between small muted" style={{ marginTop: 6 }}>
            <span>Popularidad de la empresa</span><span>{pop}/100</span>
          </div>
        </div>

        {juego.finDelJuego && (
          <div className="alert bad">
            <Icon name="x" /><div><b>Game Over.</b> Tu empresa quebró. Puedes desactivarlo en Ajustes y seguir jugando.</div>
          </div>
        )}

        <div className="stat-grid">
          <div className="stat"><div className="label">Fecha</div><div className="big" style={{ fontSize: 24 }}>{fecha(juego.semanaAbs)}</div></div>
          <div className="stat"><div className="label">Caja</div><div className="big" style={{ color: mia.dinero < 0 ? 'var(--bad)' : 'var(--accent)' }}>{dinero(mia.dinero)}</div></div>
          <button className="stat tap" style={{ textAlign: 'left' }} onClick={() => nav('/peleadores')}>
            <div className="label">Peleadores</div>
            <div className="big">{mios.length}<span className="muted" style={{ fontSize: 20 }}> / {disp} disp.</span></div>
          </button>
          <button className="stat tap" style={{ textAlign: 'left' }} onClick={() => nav('/companias')}>
            <div className="label">Ranking de compañías</div>
            <div className="big">#{posicion}<span className="muted" style={{ fontSize: 20 }}> de {juego.companias.length}</span></div>
          </button>
        </div>

        <div className="card">
          <div className="label">Próximo evento</div>
          {eventoHoy ? <div className="mid" style={{ marginTop: 4 }}>{eventoHoy.nombre}</div> : (
            <>
              <div className="mid" style={{ marginTop: 4 }}>Sin evento programado</div>
              <div className="muted small" style={{ marginTop: 4 }}>Los eventos y la cartelera llegan en la Fase 2.</div>
            </>
          )}
        </div>

        {eventoHoy
          ? <button className="btn primary" onClick={() => nav('/eventos')}><Icon name="bolt" />Noche de pelea</button>
          : <button className="btn primary" disabled={juego.finDelJuego} onClick={onAvanzar}><Icon name="chevron" />Avanzar semana</button>}

        <div className="stat-grid">
          <button className="btn" onClick={() => nav('/noticias')}><Icon name="news" />Noticias{noLeidas ? ` (${noLeidas})` : ''}</button>
          <button className="btn" onClick={() => nav('/eventos')}><Icon name="calendar" />Calendario</button>
        </div>

        {(lesionados.length > 0 || vencen.length > 0 || pedirRespaldo || mios.length === 0) && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Alertas</div>
            {mios.length === 0 && (
              <button className="alert warn" onClick={() => nav('/peleadores')}>
                <Icon name="users" /><div className="grow" style={{ textAlign: 'left' }}>Aún no tienes peleadores. Ficha agentes libres para empezar.</div>
              </button>
            )}
            {lesionados.map(p => (
              <button key={p.id} className="alert bad" onClick={() => nav(`/peleador/${p.id}`)}>
                <Icon name="heart" /><div className="grow" style={{ textAlign: 'left' }}>{nombreCompleto(p)} · {p.lesion!.tipo} ({p.lesion!.semanas} sem.)</div>
              </button>
            ))}
            {vencen.map(p => (
              <button key={p.id} className="alert warn" onClick={() => nav(`/peleador/${p.id}`)}>
                <Icon name="edit" /><div className="grow" style={{ textAlign: 'left' }}>Contrato por vencer: {nombreCompleto(p)} ({p.contrato!.peleasRestantes} pelea{p.contrato!.peleasRestantes === 1 ? '' : 's'})</div>
              </button>
            ))}
            {pedirRespaldo && (
              <button className="alert warn" onClick={() => { exportarJSON(juego); marcarRespaldo(); }}>
                <Icon name="download" /><div className="grow" style={{ textAlign: 'left' }}>Hace {Math.floor(dias)} días que no haces respaldo. Toca para exportar tu partida.</div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
