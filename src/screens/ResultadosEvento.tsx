import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEDE_POR_ID } from '../config/sedes';
import { dinero, fecha } from '../domain/format';
import type { Evento } from '../domain/types';
import { useGame } from '../store/game';
import { Tabs, TopBar, Vacio } from '../ui/kit';
import { BonosTab } from './BonosTab';
import { BoutCard, etiquetaBout } from './BoutCard';
import { etiquetaPartido, torneoDe } from '../domain/torneos';

type TabId = 'resultados' | 'bonos' | 'finanzas';

export function ResultadosEvento({ e }: { e: Evento }) {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const [tab, setTab] = useState<TabId>('resultados');
  const orden = e.cartelera.map((b, i) => ({ b, i })).reverse();
  return (
    <>
      <TopBar titulo={e.nombre} atras onAtras={() => nav('/eventos')} />
      <Tabs<TabId> valor={tab} onChange={setTab} items={[{ id: 'resultados', label: 'Resultados' }, { id: 'bonos', label: 'Bonos' }, { id: 'finanzas', label: 'Finanzas' }]} />
      <div className="scroll">
        <div className="muted small center" style={{ marginBottom: 10 }}>{fecha(e.semana)} · {SEDE_POR_ID[e.sedeId]?.nombre}</div>
        {tab === 'resultados' && (
          <div className="stack">
            {orden.map(({ b, i }) => (
              <BoutCard key={b.id} j={juego} b={b} etiqueta={(() => { const t = torneoDe(juego, b.torneoId); return t && b.ronda != null && b.slot != null ? etiquetaPartido(t.tam, b.ronda, b.slot) : etiquetaBout(i, e.cartelera.length); })()} mostrarResultado onClick={() => nav(`/pelea/${e.id}/${b.id}`)} />
            ))}
          </div>
        )}
        {tab === 'bonos' && <BonosTab e={e} />}
        {tab === 'finanzas' && <Finanzas e={e} />}
      </div>
    </>
  );
}

function Finanzas({ e }: { e: Evento }) {
  const f = e.finanzas;
  if (!f) return <Vacio titulo="Sin finanzas" />;
  const ingresos = f.taquilla + f.transmision + f.patrocinios + (f.ppv ?? 0) + Math.max(0, f.inversion ?? 0);
  const gastos = f.renta + f.produccion + f.viaje + f.bolsas + f.bonosVictoria + f.bonosNoche + f.premios;
  return (
    <div className="stack">
      <div className="card">
        <h3>Ingresos</h3>
        <div className="kv"><span className="k">Precio del boleto</span><span className="v">{dinero(f.precio)}</span></div>
        <div className="kv"><span className="k">Aforo</span><span className="v">{f.aforo.toLocaleString('en-US')}</span></div>
        <div className="kv"><span className="k">Boletos vendidos</span><span className="v">{f.boletosVendidos.toLocaleString('en-US')} ({Math.round((f.boletosVendidos / Math.max(1, f.aforo)) * 100)}%)</span></div>
        <div className="kv"><span className="k">Taquilla</span><span className="v neto-pos">{dinero(f.taquilla)}</span></div>
        <div className="kv"><span className="k">Televisión y YouTube{f.vistasYoutube ? ` · ${f.vistasYoutube.toLocaleString('en-US')} vistas` : ''}</span><span className="v neto-pos">{dinero(f.transmision)}</span></div>
        {(f.ppv ?? 0) > 0 && <div className="kv"><span className="k">Pay-per-view · {(f.compradoresPPV ?? 0).toLocaleString('en-US')} compras</span><span className="v neto-pos">{dinero(f.ppv!)}</span></div>}
        {(f.inversion ?? 0) !== 0 && <div className="kv"><span className="k">Inversionistas</span><span className={`v ${(f.inversion ?? 0) >= 0 ? 'neto-pos' : 'neto-neg'}`}>{dinero(f.inversion!, true)}</span></div>}
        <div className="kv"><span className="k">Patrocinios del evento</span><span className="v">{f.patrocinios ? dinero(f.patrocinios) : 'n/a'}</span></div>
        <div className="kv"><span className="k">Total ingresos</span><span className="v">{dinero(ingresos)}</span></div>
        {f.clima && <p className="muted small" style={{ marginTop: 8 }}>{f.clima}</p>}
      </div>
      <div className="card">
        <h3>Gastos</h3>
        <div className="kv"><span className="k">Renta de la sede</span><span className="v">{dinero(f.renta)}</span></div>
        <div className="kv"><span className="k">Producción</span><span className="v">{dinero(f.produccion)}</span></div>
        {f.viaje > 0 && <div className="kv"><span className="k">Viaje</span><span className="v">{dinero(f.viaje)}</span></div>}
        <div className="kv"><span className="k">Bolsas</span><span className="v">{dinero(f.bolsas)}</span></div>
        <div className="kv"><span className="k">Bonos por victoria y campeonato</span><span className="v">{dinero(f.bonosVictoria)}</span></div>
        <div className="kv"><span className="k">Bonos de la noche</span><span className="v">{f.bonosNoche ? dinero(f.bonosNoche) : 'pendientes'}</span></div>
        {f.premios > 0 && <div className="kv"><span className="k">Premio del torneo</span><span className="v">{dinero(f.premios)}</span></div>}
        <div className="kv"><span className="k">Total gastos</span><span className="v">{dinero(gastos)}</span></div>
      </div>
      <div className="card center">
        <div className="label">Popularidad {f.popularidad >= 0 ? 'ganada' : 'perdida'}</div>
        <div className="big" style={{ marginTop: 4, color: f.popularidad >= 0 ? 'var(--pop)' : 'var(--bad)' }}>{f.popularidad >= 0 ? '+' : ''}{f.popularidad}</div>
        <div className="label" style={{ marginTop: 14 }}>Total neto</div>
        <div className={`big ${f.neto >= 0 ? 'neto-pos' : 'neto-neg'}`} style={{ marginTop: 4 }}>{dinero(f.neto, true)}</div>
      </div>
    </div>
  );
}
