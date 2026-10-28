import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CONTRATOS } from '../config/balance';
import { ATRIBUTO_LABEL, ATRIBUTOS_FIS, DISCIPLINAS, DISCIPLINA_LABEL, ESTILOS } from '../config/divisiones';
import { nombrePais } from '../config/paises';
import { abrevClase, altura, anio, dinero, nombreClase, peso, semanaDelAnio } from '../domain/format';
import {
  bonoFirma, contratoSugerido, costoRescision, disponible, estatus, estrellasCalif, nombreCompleto,
  recordTxt, totalPeleas,
} from '../domain/peleador';
import { mapaRankings } from '../domain/rankings';
import type { Peleador } from '../domain/types';
import { acciones, miCompania, useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { BarraValor, Bar, Confirmar, Estrellas, Forma, Pill, Stepper, Tabs, TopBar, Vacio } from '../ui/kit';

type TabId = 'info' | 'contrato' | 'historial' | 'records' | 'ganancias';

export function Ficha() {
  const { id } = useParams();
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [tab, setTab] = useState<TabId>('info');
  const p = juego.peleadores.find(x => x.id === Number(id));
  const ranks = useMemo(() => mapaRankings(juego), [juego.divisiones]);
  if (!p) return (<><TopBar titulo="Peleador" /><Vacio titulo="No se encontró al peleador" /></>);

  return (
    <>
      <TopBar
        titulo={nombreCompleto(p)}
        derecha={
          <>
            <button className={`iconbtn ${p.favorito ? 'on' : ''}`} aria-label="Favorito" onClick={() => acciones.favorito(p.id)}><Icon name="star" fill={p.favorito} /></button>
            <button className="iconbtn" aria-label="Editar" onClick={() => nav(`/editor/${p.id}`)}><Icon name="edit" /></button>
          </>
        }
      />
      <Tabs<TabId>
        valor={tab} onChange={setTab}
        items={[
          { id: 'info', label: 'Info' }, { id: 'contrato', label: 'Contrato' }, { id: 'historial', label: 'Historial' },
          { id: 'records', label: 'Récords' }, { id: 'ganancias', label: 'Ganancias' },
        ]}
      />
      <div className="scroll">
        {tab === 'info' && <Info p={p} rank={ranks.get(p.id)} />}
        {tab === 'contrato' && <ContratoTab p={p} />}
        {tab === 'historial' && <Historial p={p} />}
        {tab === 'records' && <Records p={p} />}
        {tab === 'ganancias' && <Ganancias p={p} />}
      </div>
    </>
  );
}

function Info({ p, rank }: { p: Peleador; rank?: { rank: number; campeon: boolean; dobleCampeon: boolean } }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const u = juego.ajustes.unidades;
  const compania = juego.companias.find(c => c.id === p.companiaId);
  const rk = rank ? (rank.rank === 0 ? { texto: rank.dobleCampeon ? 'C²' : 'C', campeon: true } : rank.rank < 99 ? { texto: `#${rank.rank}`, campeon: false } : undefined) : undefined;
  return (
    <div className="stack">
      <div className="card row" style={{ alignItems: 'flex-start', gap: 14 }} onDoubleClick={() => nav(`/editor/${p.id}`)}>
        <Avatar p={p} size={92} rank={rk} />
        <div className="grow stack" style={{ gap: 4 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <Pill tipo="accent">{estatus(p)}</Pill>
            <Pill>{nombreClase(p.clase, juego.ajustes.nombresDivision)}</Pill>
            {p.lesion && <Pill tipo="bad">Lesionado</Pill>}
          </div>
          <div className="mid" style={{ fontSize: 26 }}>{p.nombre} {p.apellido}</div>
          {p.apodo && <div className="muted">“{p.apodo}”</div>}
          <div className="num" style={{ fontSize: 24 }}>{recordTxt(p.rec.tot)}</div>
          <div className="muted small">{nombrePais(p.pais)} · {ESTILOS[p.estilo].es} · {compania ? compania.nombre : 'Agente libre'}</div>
        </div>
      </div>

      <div className="card">
        <div className="stat-grid" style={{ gap: 14 }}>
          <div><div className="label">Edad</div><div className="mid">{p.edad}</div></div>
          <div><div className="label">Altura</div><div className="mid">{altura(p.alturaCm, u)}</div></div>
          <div><div className="label">Peso</div><div className="mid">{peso(p.pesoKg, u)}</div></div>
          <div><div className="label">Forma</div><div style={{ marginTop: 4 }}><Forma forma={p.forma} /></div></div>
          <div><div className="label">Calificación</div><div style={{ marginTop: 4 }}><Estrellas valor={estrellasCalif(p)} /></div></div>
          <div><div className="label">Potencial</div><div style={{ marginTop: 4 }}><Estrellas valor={p.potencial} /></div></div>
        </div>
        <div className="stack" style={{ marginTop: 16, gap: 10 }}>
          <BarraValor etiqueta="Popularidad" valor={p.popularidad} max={100} color="var(--pop)" />
          <BarraValor etiqueta="Moral" valor={p.moral} max={100} color="var(--moral)" />
        </div>
      </div>

      <div className="card">
        <h3>Habilidades de lucha</h3>
        <div className="row" style={{ marginBottom: 6 }}>
          <span style={{ width: 118 }} />
          <div className="dual label center"><span style={{ color: 'var(--atk)' }}>Ataque</span><span style={{ color: 'var(--def)' }}>Defensa</span></div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {DISCIPLINAS.map(d => (
            <div key={d} className="barrow">
              <span className="k">{DISCIPLINA_LABEL[d]}</span>
              <div className="dual">
                <div className="row" style={{ gap: 6 }}><div className="grow"><Bar valor={p.ataque[d]} color="var(--atk)" grueso /></div><span className="num small" style={{ width: 24, textAlign: 'right', color: p.ataque[d] > 10 ? 'var(--accent)' : undefined }}>{Math.round(p.ataque[d])}</span></div>
                <div className="row" style={{ gap: 6 }}><div className="grow"><Bar valor={p.defensa[d]} color="var(--def)" grueso /></div><span className="num small" style={{ width: 24, textAlign: 'right', color: p.defensa[d] > 10 ? 'var(--accent)' : undefined }}>{Math.round(p.defensa[d])}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Atributos físicos</h3>
        <div className="stack" style={{ gap: 10 }}>
          {ATRIBUTOS_FIS.map(a => (
            <BarraValor key={a} etiqueta={ATRIBUTO_LABEL[a]} valor={p.fis[a]} color="var(--fis)" invertida={a === 'lesiones'} />
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Listo para pelear</h3>
        <div className="stack" style={{ gap: 10 }}>
          <BarraValor etiqueta="Fatiga" valor={p.fatiga} max={100} color="var(--fatiga)" />
          <BarraValor etiqueta="Daño acumulado" valor={p.dano} max={100} color="var(--dano)" />
          {p.lesion
            ? <div className="alert bad"><Icon name="heart" /><div>{p.lesion.tipo} · {p.lesion.semanas} semanas de recuperación</div></div>
            : <div className={`alert ${disponible(p) ? '' : 'warn'}`}><Icon name={disponible(p) ? 'check' : 'info'} /><div>{disponible(p) ? 'Disponible para pelear' : p.contrato ? 'Necesita descansar antes de pelear' : 'Sin contrato: no puede pelear en tu empresa'}</div></div>}
        </div>
      </div>
    </div>
  );
}

function ventajas(p: Peleador, esCampeon: boolean): string[] {
  const v: string[] = [];
  if (esCampeon) v.push('Campeón');
  if (p.popularidad >= 60) v.push('Muy popular');
  else if (p.popularidad >= 40) v.push('Popular');
  if (p.racha.tipo === 'V' && p.racha.n >= 3) v.push(`Racha de ${p.racha.n} victorias`);
  if (p.potencial >= 4 && p.edad <= 24) v.push('Gran prospecto');
  if (p.companiaId) v.push('Ofertas de otras compañías');
  return v;
}

function ContratoTab({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const mia = miCompania(juego);
  const [peleas, setPeleas] = useState(CONTRATOS.peleasDefault);
  const [conf, setConf] = useState<null | 'rescindir' | 'retirar' | 'robar'>(null);
  const [error, setError] = useState<string | null>(null);
  const oferta = useMemo(() => contratoSugerido(p, peleas), [p, peleas]);
  const esCampeon = juego.divisiones.some(d => d.campeonId === p.id);
  const mio = p.companiaId === juego.miId;
  const rival = p.companiaId && !mio ? juego.companias.find(c => c.id === p.companiaId) : undefined;
  const c = p.contrato;
  const avgBolsa = useMemo(() => {
    const m = juego.peleadores.filter(x => x.companiaId === juego.miId && x.contrato && !x.retirado);
    return m.length ? m.reduce((a, x) => a + x.contrato!.bolsa, 0) / m.length : 0;
  }, [juego.peleadores, juego.miId]);

  const ejecutar = (fn: () => string | null) => {
    const e = fn();
    setConf(null);
    setError(e);
  };

  return (
    <div className="stack">
      {error && <div className="alert bad"><Icon name="x" /><div>{error}</div></div>}

      {c && (
        <div className="card">
          <h3>Contrato actual {rival ? `· ${rival.nombre}` : ''}</h3>
          <div className="kv"><span className="k">Peleas restantes</span><span className="v">{c.peleasRestantes}</span></div>
          <div className="kv"><span className="k">Bolsa</span><span className="v">{dinero(c.bolsa)}</span></div>
          <div className="kv"><span className="k">Bono por victoria</span><span className="v">{dinero(c.bonoVictoria)}</span></div>
          <div className="kv"><span className="k">Bono de campeonato</span><span className="v">{dinero(c.bonoCampeonato)}</span></div>
          <div className="kv"><span className="k">Puntos de PPV</span><span className="v">{c.puntosPPV ? `${c.puntosPPV}%` : 'n/a'}</span></div>
          <div className="kv"><span className="k">Cláusula de rescisión</span><span className="v accent">{dinero(c.clausula)}</span></div>
        </div>
      )}

      {!p.companiaId && !p.retirado && (
        <div className="card">
          <h3>Oferta de firma</h3>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="muted">Duración (peleas)</span>
            <Stepper valor={peleas} min={CONTRATOS.peleasMin} max={CONTRATOS.peleasMax} onChange={setPeleas} />
          </div>
          <div className="kv"><span className="k">Bolsa</span><span className="v">{dinero(oferta.bolsa)}</span></div>
          <div className="kv"><span className="k">Bono por victoria</span><span className="v">{dinero(oferta.bonoVictoria)}</span></div>
          <div className="kv"><span className="k">Bono de campeonato</span><span className="v">{dinero(oferta.bonoCampeonato)}</span></div>
          <div className="kv"><span className="k">Puntos de PPV</span><span className="v">{oferta.puntosPPV ? `${oferta.puntosPPV}%` : 'n/a'}</span></div>
          <div className="kv"><span className="k">Cláusula de rescisión</span><span className="v">{dinero(oferta.clausula)}</span></div>
          <div className="kv"><span className="k">Bono de firma (hoy)</span><span className="v accent">{dinero(bonoFirma(oferta))}</span></div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Ventajas: {ventajas(p, esCampeon).join(', ') || 'ninguna'}. Saldo: {dinero(mia.dinero)} · Bolsa promedio de tu roster: {avgBolsa ? dinero(avgBolsa) : 'n/a'}.
          </p>
          <p className="muted small" style={{ marginTop: 6 }}>La negociación completa (contraofertas y cláusulas) llega en la Fase 4; por ahora acepta las condiciones que pide.</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => ejecutar(() => acciones.fichar(p.id, peleas))}>
            Fichar · {dinero(bonoFirma(oferta))}
          </button>
        </div>
      )}

      {rival && c && (
        <div className="card">
          <h3>Fichar desde {rival.nombre}</h3>
          <p className="muted small">Pagando su cláusula de rescisión puedes llevártelo sin negociar con su compañía.</p>
          <div className="kv"><span className="k">Cláusula</span><span className="v">{dinero(c.clausula)}</span></div>
          <div className="kv"><span className="k">Bono de firma</span><span className="v">{dinero(bonoFirma(contratoSugerido(p)))}</span></div>
          <div className="kv"><span className="k">Total</span><span className="v accent">{dinero(c.clausula + bonoFirma(contratoSugerido(p)))}</span></div>
          <div className="kv"><span className="k">Tu saldo</span><span className="v">{dinero(mia.dinero)}</span></div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setConf('robar')}>Pagar cláusula y fichar</button>
        </div>
      )}

      {mio && c && (
        <div className="stack" style={{ gap: 10 }}>
          <button className="btn disabled" disabled>Renovar contrato · Fase 4</button>
          <button className="btn danger" onClick={() => setConf('rescindir')}>Rescindir contrato</button>
          <button className="btn danger" onClick={() => setConf('retirar')}>Retirar peleador</button>
          <button className="btn" onClick={() => nav(`/editor/${p.id}`)}>Editar</button>
        </div>
      )}

      <div className="card">
        <h3>Patrocinios personales</h3>
        <p className="muted small">Los peleadores consiguen sus propios patrocinios según su popularidad (Fase 4). Suben su moral y su exigencia al renovar.</p>
      </div>

      {conf === 'rescindir' && c && (
        <Confirmar titulo="¿Rescindir contrato?" peligro confirmar="Rescindir"
          texto={`Pagarás una indemnización de ${dinero(costoRescision(c))} y ${p.nombre} quedará como agente libre (otra compañía podría ficharlo).`}
          onNo={() => setConf(null)} onSi={() => ejecutar(() => acciones.rescindir(p.id))} />
      )}
      {conf === 'retirar' && (
        <Confirmar titulo="¿Retirar peleador?" peligro confirmar="Retirar"
          texto={`${nombreCompleto(p)} dejará de pelear definitivamente. No se puede deshacer.`}
          onNo={() => setConf(null)} onSi={() => { ejecutar(() => acciones.retirar(p.id)); nav(-1); }} />
      )}
      {conf === 'robar' && c && rival && (
        <Confirmar titulo="¿Pagar la cláusula?" confirmar="Pagar y fichar"
          texto={`Pagarás ${dinero(c.clausula)} a ${rival.nombre} más ${dinero(bonoFirma(contratoSugerido(p)))} de bono de firma.`}
          onNo={() => setConf(null)} onSi={() => ejecutar(() => acciones.robar(p.id))} />
      )}
    </div>
  );
}

function Historial({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  return (
    <div className="stack">
      <div className="card">
        <h3>Últimas peleas</h3>
        <Forma forma={p.forma} />
        <div className="kv" style={{ marginTop: 10 }}><span className="k">Récord total</span><span className="v">{recordTxt(p.rec.tot)}</span></div>
        <div className="kv"><span className="k">Récord en {juego.nombre}</span><span className="v">{recordTxt(p.rec.mio)}</span></div>
      </div>
      <Vacio
        titulo="Aún sin peleas en tu empresa"
        texto="Cuando organices eventos, aquí verás cada pelea: rival, método, round y tiempo, con el detalle completo. Llega en las Fases 2 y 3."
      />
    </div>
  );
}

function Records({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const titulos = juego.divisiones.filter(d => d.campeonId === p.id);
  const f = p.finales;
  const filas: [string, string | number][] = [
    ['Peleas', totalPeleas(p.rec.tot)],
    ['Victorias', p.rec.tot.v], ['Derrotas', p.rec.tot.d], ['Empates', p.rec.tot.e],
    ['Finalizaciones', f.ko + f.tko + f.sub],
    ['KO', f.ko], ['TKO', f.tko], ['Sumisiones', f.sub], ['Decisiones', f.dec],
    ['Racha actual', p.racha.n ? `${p.racha.n}${p.racha.tipo === 'V' ? 'V' : p.racha.tipo === 'D' ? 'D' : 'E'}` : '—'],
    ['Racha ganadora más larga', p.mejorRachaV], ['Racha perdedora más larga', p.peorRachaD],
    ['Campeón actual', titulos.length ? titulos.map(d => abrevClase(d.clase, d.genero)).join(', ') : 'No'],
    ['Defensas de título', '—'], ['Reinados', '—'], ['Bonos de actuación', 0],
    ['Peleas de la noche', 0], ['Actuaciones de la noche', 0],
  ];
  return (
    <div className="card">
      {filas.map(([k, v]) => <div key={k} className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>)}
    </div>
  );
}

function Ganancias({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  return (
    <div className="stack">
      <div className="card">
        <div className="label">Ganancias totales en tu empresa</div>
        <div className="big accent" style={{ marginTop: 6 }}>{dinero(p.ganancias)}</div>
        <div className="kv" style={{ marginTop: 12 }}><span className="k">Año {anio(juego.semanaAbs)} (semana {semanaDelAnio(juego.semanaAbs)})</span><span className="v">{dinero(0)}</span></div>
      </div>
      <Vacio titulo="Sin pagos todavía" texto="El desglose pelea por pelea (bolsa, bonos, PPV y patrocinios) aparece cuando pelee en tus eventos." />
    </div>
  );
}

