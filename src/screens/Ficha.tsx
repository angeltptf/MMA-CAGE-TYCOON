import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ATRIBUTO_LABEL, ATRIBUTOS_FIS, DISCIPLINAS, DISCIPLINA_LABEL, ESTILOS } from '../config/divisiones';
import { nombrePais } from '../config/paises';
import { abrevClase, altura, anio, dinero, fechaCorta, nombreClase, peso } from '../domain/format';
import {
  bonoFirma, contratoSugerido, costoRescision, disponible, estatus, estrellasCalif, nombreCompleto,
  recordTxt, totalPeleas,
} from '../domain/peleador';
import { exigencia } from '../domain/negociacion';
import { mapaRankings } from '../domain/rankings';
import type { Peleador } from '../domain/types';
import { acciones, miCompania, useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { NegociarSheet } from './NegociarSheet';
import { Icon } from '../ui/Icon';
import { BarraValor, Bar, Confirmar, Estrellas, Forma, Pill, Tabs, TopBar, Vacio } from '../ui/kit';

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

function ContratoTab({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const mia = miCompania(juego);
  const [conf, setConf] = useState<null | 'rescindir' | 'retirar' | 'robar'>(null);
  const [negociando, setNegociando] = useState<null | 'fichar' | 'renovar'>(null);
  const [error, setError] = useState<string | null>(null);
  const mio = p.companiaId === juego.miId;
  const rival = p.companiaId && !mio ? juego.companias.find(c => c.id === p.companiaId) : undefined;
  const c = p.contrato;
  const ex = useMemo(() => exigencia(juego, p), [juego, p]);
  const ofertas = juego.ofertas.filter(o => o.peleadorId === p.id && o.estado === 'pendiente');
  const bloqueado = p.sinNegociarHasta > juego.semanaAbs;

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
          {c.bonoFinalizacion > 0 && <div className="kv"><span className="k">Bono por KO / sumisión</span><span className="v">{dinero(c.bonoFinalizacion)}</span></div>}
          {c.bonoNoche > 0 && <div className="kv"><span className="k">Bono pelea de la noche</span><span className="v">{dinero(c.bonoNoche)}</span></div>}
          <div className="kv"><span className="k">Puntos de PPV</span><span className="v">{c.puntosPPV ? `${c.puntosPPV}%` : 'n/a'}</span></div>
          <div className="kv"><span className="k">Exclusividad</span><span className="v">{c.exclusividad ? 'Sí' : 'No'}</span></div>
          <div className="kv"><span className="k">Cláusula de rescisión</span><span className="v accent">{dinero(c.clausula)}</span></div>
        </div>
      )}

      {!p.companiaId && !p.retirado && (
        <div className="card">
          <h3>Agente libre</h3>
          <p className="muted small">Negocia bolsa, bonos, duración y cláusula. Él puede aceptar, contraofertar o rechazar según su moral, su popularidad y su edad.</p>
          <div className="kv"><span className="k">Pide aprox.</span><span className="v">{dinero(ex.pide.bolsa)} + {dinero(ex.pide.bonoVictoria)} si gana</span></div>
          <div className="kv"><span className="k">Ventajas</span><span className="v">{ex.ventajas.join(', ') || 'ninguna'}</span></div>
          <div className="kv"><span className="k">Tu saldo</span><span className="v">{dinero(mia.dinero)}</span></div>
          {bloqueado && <p className="muted small" style={{ marginTop: 8 }}>Se ofendió con tu última oferta: no negocia por {p.sinNegociarHasta - juego.semanaAbs} semanas.</p>}
          <button className="btn primary" style={{ marginTop: 12 }} disabled={bloqueado} onClick={() => setNegociando('fichar')}>Negociar contrato</button>
        </div>
      )}

      {rival && c && (
        <div className="card">
          <h3>Fichar desde {rival.nombre}</h3>
          <p className="muted small">Pagando su cláusula de rescisión te lo llevas sin negociar con su compañía. Después firma las condiciones normales.</p>
          <div className="kv"><span className="k">Cláusula</span><span className="v">{dinero(c.clausula)}</span></div>
          <div className="kv"><span className="k">Bono de firma</span><span className="v">{dinero(bonoFirma(contratoSugerido(p)))}</span></div>
          <div className="kv"><span className="k">Total</span><span className="v accent">{dinero(c.clausula + bonoFirma(contratoSugerido(p)))}</span></div>
          <div className="kv"><span className="k">Tu saldo</span><span className="v">{dinero(mia.dinero)}</span></div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setConf('robar')}>Pagar cláusula y fichar</button>
        </div>
      )}

      {mio && c && (
        <>
          {ofertas.length > 0 && (
            <button className="alert warn" onClick={() => nav('/ofertas')}>
              <Icon name="bolt" /><div className="grow" style={{ textAlign: 'left' }}>Tiene {ofertas.length} oferta{ofertas.length > 1 ? 's' : ''} de otras compañías. Toca para verlas.</div>
            </button>
          )}
          <div className="stack" style={{ gap: 10 }}>
            <button className="btn primary" disabled={bloqueado} onClick={() => setNegociando('renovar')}>Renovar / renegociar contrato</button>
            <button className={`btn ${p.enVenta ? 'primary' : ''}`} onClick={() => acciones.enVenta(p.id)}>
              {p.enVenta ? 'En venta · quitar de la lista' : 'Poner en venta (recibir ofertas)'}
            </button>
            <button className="btn danger" onClick={() => setConf('rescindir')}>Rescindir contrato</button>
            <button className="btn danger" onClick={() => setConf('retirar')}>Retirar peleador</button>
            <button className="btn" onClick={() => nav(`/editor/${p.id}`)}>Editar</button>
          </div>
        </>
      )}

      <div className="card">
        <h3>Patrocinios personales</h3>
        <p className="muted small">Los peleadores consiguen sus propios patrocinios según su popularidad (Fase 5). Suben su moral y su exigencia al renovar.</p>
      </div>

      {negociando && <NegociarSheet p={p} modo={negociando} onClose={() => setNegociando(null)} />}
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
  const nav = useNavigate();
  if (!p.peleas.length) {
    return (
      <div className="stack">
        <div className="card">
          <h3>Forma</h3>
          <Forma forma={p.forma} />
          <div className="kv" style={{ marginTop: 10 }}><span className="k">Récord total</span><span className="v">{recordTxt(p.rec.tot)}</span></div>
          <div className="kv"><span className="k">Récord en {juego.nombre}</span><span className="v">{recordTxt(p.rec.mio)}</span></div>
        </div>
        <Vacio titulo="Aún sin peleas en tu empresa" texto="Cuando pelee en tus eventos, aquí verás cada pelea con su rival, método, round y tiempo." />
      </div>
    );
  }
  const rk = (r: number) => (r === 0 ? 'C' : r < 99 ? `#${r}` : '');
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {p.peleas.map(h => {
        const existe = juego.eventos.some(e => e.id === h.eventoId && e.cartelera.some(b => b.id === h.peleaId));
        const color = h.resultado === 'V' ? 'var(--ok)' : h.resultado === 'D' ? 'var(--bad)' : '#8b93a0';
        return (
          <button key={h.peleaId} className="list-item" style={{ width: '100%', textAlign: 'left', borderLeft: `5px solid ${color}`, alignItems: 'flex-start' }}
            onClick={() => existe && nav(`/pelea/${h.eventoId}/${h.peleaId}`)}>
            <span className="grow" style={{ minWidth: 0 }}>
              <div className="muted small">{h.eventoNombre} · {fechaCorta(h.semana)}{h.etiquetaTorneo ? ` · ${h.etiquetaTorneo}` : ''}</div>
              <div className="mid">vs {h.rivalNombre}</div>
              <div className="muted small">
                {nombreClase(h.clase, juego.ajustes.nombresDivision)}{h.titulo ? ' · Campeonato' : ''} · {h.miRecord} {rk(h.miRank)} vs {h.rivalRecord} {rk(h.rivalRank)}
              </div>
            </span>
            <span className="num" style={{ color, textAlign: 'right' }}>
              {h.resultado === 'V' ? 'GANÓ' : h.resultado === 'D' ? 'PERDIÓ' : 'EMPATE'}
              <div className="small muted" style={{ fontFamily: 'var(--font-body)' }}>{h.metodo === 'E' || h.metodo === 'NC' ? '' : `${h.metodo} R${h.round} ${h.tiempo}`}</div>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Records({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const titulos = juego.divisiones.filter(d => d.campeonId === p.id);
  const f = p.finales;
  const r = p.rcd;
  const filas: [string, string | number][] = [
    ['Defensas de título consecutivas', r.defensasConsec],
    ['Defensas de título', r.defensas],
    ['Reinados de título', r.reinados],
    ['Edad en su primer título', r.edadPrimerTitulo ?? '—'],
    ['Edad en su último título', r.edadUltimoTitulo ?? '—'],
    ['Campeón actual', titulos.length ? titulos.map(d => abrevClase(d.clase, d.genero)).join(', ') : 'No'],
    ['Bonos de actuación', r.actuaciones],
    ['Racha ganadora más larga', p.mejorRachaV],
    ['Racha perdedora más larga', p.peorRachaD],
    ['Racha actual', p.racha.n ? `${p.racha.n}${p.racha.tipo}` : '—'],
    ['Peleas', totalPeleas(p.rec.tot)],
    ['Victorias', p.rec.tot.v], ['Derrotas', p.rec.tot.d], ['Empates', p.rec.tot.e],
    ['Finalizaciones', f.ko + f.tko + f.sub],
    ['KO', f.ko], ['TKO', f.tko], ['Sumisiones', f.sub], ['Decisiones', f.dec],
    ['Peleas de la noche', r.peleaNoche],
    ['Peleador de la noche', r.peleadorNoche],
  ];
  return (
    <div className="card">
      {filas.map(([k, v]) => <div key={k} className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>)}
    </div>
  );
}

function Ganancias({ p }: { p: Peleador }) {
  const juego = useGame(s => s.juego)!;
  const total = (h: Peleador['peleas'][number]) => { const g = h.ganancia; return g ? g.bolsa + g.victoria + g.campeonato + g.finalizacion + g.noche : 0; };
  const delAnio = p.peleas.filter(h => anio(h.semana) === anio(juego.semanaAbs)).reduce((a, h) => a + total(h), 0);
  return (
    <div className="stack">
      <div className="card">
        <div className="label">Ganancias totales en tu empresa</div>
        <div className="big accent" style={{ marginTop: 6 }}>{dinero(p.ganancias)}</div>
        <div className="kv" style={{ marginTop: 12 }}><span className="k">Año {anio(juego.semanaAbs)}</span><span className="v">{dinero(delAnio)}</span></div>
        <div className="kv"><span className="k">Bonos de la noche (acumulado)</span><span className="v">{dinero(p.rcd.bonosDinero)}</span></div>
        <div className="kv"><span className="k">Patrocinios personales</span><span className="v">n/a · Fase 5</span></div>
      </div>
      {p.peleas.length === 0 ? <Vacio titulo="Sin pagos todavía" texto="El desglose pelea por pelea aparece cuando pelee en tus eventos." /> : (
        <div className="stack">
          {p.peleas.map(h => (
            <div key={h.peleaId} className="card">
              <div className="row between"><b>{h.eventoNombre}</b><b className="accent">{dinero(total(h))}</b></div>
              <div className="muted small" style={{ marginBottom: 6 }}>vs {h.rivalNombre} · {h.resultado === 'V' ? 'Ganó' : h.resultado === 'D' ? 'Perdió' : 'Empate'}</div>
              {h.ganancia && (
                <>
                  <div className="kv"><span className="k">Bolsa</span><span className="v">{dinero(h.ganancia.bolsa)}</span></div>
                  {h.ganancia.victoria > 0 && <div className="kv"><span className="k">Bono por victoria</span><span className="v">{dinero(h.ganancia.victoria)}</span></div>}
                  {h.ganancia.campeonato > 0 && <div className="kv"><span className="k">Bono de campeonato</span><span className="v">{dinero(h.ganancia.campeonato)}</span></div>}
                  {h.ganancia.finalizacion > 0 && <div className="kv"><span className="k">Bono por finalización</span><span className="v">{dinero(h.ganancia.finalizacion)}</span></div>}
                  {h.ganancia.noche > 0 && <div className="kv"><span className="k">Bonos de la noche</span><span className="v">{dinero(h.ganancia.noche)}</span></div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
