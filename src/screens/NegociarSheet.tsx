import { useMemo, useState } from 'react';
import { CONTRATOS, NEGOCIACION } from '../config/balance';
import { dinero } from '../domain/format';
import { exigencia, type ModoContrato, type RespuestaNegociacion } from '../domain/negociacion';
import { bonoFirma, clausulaDe } from '../domain/peleador';
import type { Contrato, Peleador } from '../domain/types';
import { miCompania, useGame } from '../store/game';
import { Icon } from '../ui/Icon';
import { Pill, Sheet, Stepper } from '../ui/kit';

// paso del stepper según la magnitud del monto
function paso(x: number): number {
  if (x < 2000) return 50;
  if (x < 10_000) return 250;
  if (x < 50_000) return 1000;
  if (x < 250_000) return 5000;
  if (x < 1_000_000) return 25_000;
  return 100_000;
}

type Campo = 'bolsa' | 'bonoVictoria' | 'bonoCampeonato' | 'bonoFinalizacion' | 'bonoNoche';
const CAMPOS: { k: Campo; label: string }[] = [
  { k: 'bolsa', label: 'Bolsa' },
  { k: 'bonoVictoria', label: 'Bono por victoria' },
  { k: 'bonoCampeonato', label: 'Bono de campeonato' },
  { k: 'bonoFinalizacion', label: 'Bono por KO / sumisión' },
  { k: 'bonoNoche', label: 'Bono pelea de la noche' },
];

export function NegociarSheet({ p, modo, onClose }: { p: Peleador; modo: ModoContrato; onClose: () => void }) {
  const juego = useGame(s => s.juego)!;
  const negociar = useGame(s => s.negociar);
  const mia = miCompania(juego);
  const ex = useMemo(() => exigencia(juego, p), [juego, p]);
  const [c, setC] = useState<Contrato>(() => ({ ...ex.pide }));
  const [resp, setResp] = useState<RespuestaNegociacion | null>(null);
  const [firmado, setFirmado] = useState(false);

  const base = clausulaDe(c, p.edad);
  const costo = Math.round(bonoFirma(c) * (modo === 'renovar' ? NEGOCIACION.bonoRenovacionPct : 1));
  const avg = useMemo(() => {
    const m = juego.peleadores.filter(x => x.companiaId === juego.miId && x.contrato && !x.retirado);
    return m.length ? m.reduce((a, x) => a + x.contrato!.bolsa, 0) / m.length : 0;
  }, [juego.peleadores, juego.miId]);
  const set = (patch: Partial<Contrato>) => { setC(x => ({ ...x, ...patch })); setResp(null); };
  const bloqueado = p.sinNegociarHasta > juego.semanaAbs;

  const ofrecer = () => {
    const r = negociar(p.id, c, modo);
    if (r.tipo === 'acepta') setFirmado(true);
    setResp(r);
  };

  if (firmado) {
    return (
      <Sheet titulo="¡Trato hecho!" onClose={onClose} pie={<button className="btn primary" onClick={onClose}>Listo</button>}>
        <div className="stack">
          <div className="alert"><Icon name="check" /><div>{resp?.mensaje}</div></div>
          <div className="card">
            <div className="kv"><span className="k">Peleas</span><span className="v">{c.peleasRestantes}</span></div>
            <div className="kv"><span className="k">Bolsa</span><span className="v">{dinero(c.bolsa)}</span></div>
            <div className="kv"><span className="k">Cláusula</span><span className="v">{dinero(c.clausula)}</span></div>
            <div className="kv"><span className="k">Bono pagado</span><span className="v accent">{dinero(costo)}</span></div>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      titulo={modo === 'renovar' ? 'Renovar contrato' : 'Negociar contrato'} completo onClose={onClose}
      pie={<button className="btn primary" disabled={bloqueado} onClick={ofrecer}>Ofrecer · bono {dinero(costo)}</button>}
    >
      <div className="stack">
        <div className="card">
          <div className="label">Ventajas del peleador</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {ex.ventajas.length ? ex.ventajas.map(v => <Pill key={v} tipo="accent">{v}</Pill>) : <span className="muted small">Ninguna en especial</span>}
          </div>
          <div className="kv" style={{ marginTop: 10 }}><span className="k">Tu saldo</span><span className="v">{dinero(mia.dinero)}</span></div>
          <div className="kv"><span className="k">Bolsa promedio de tu roster</span><span className="v">{avg ? dinero(avg) : 'n/a'}</span></div>
          <div className="kv"><span className="k">Lo que pide por pelea (aprox.)</span><span className="v">{dinero(ex.pide.bolsa)} + {dinero(ex.pide.bonoVictoria)} si gana</span></div>
        </div>

        {bloqueado && <div className="alert bad"><Icon name="x" /><div>{p.nombre} no quiere hablar contigo por {p.sinNegociarHasta - juego.semanaAbs} semanas más.</div></div>}

        {resp && !firmado && (
          <div className={`alert ${resp.tipo === 'rechaza' ? 'bad' : 'warn'}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Icon name={resp.tipo === 'rechaza' ? 'x' : 'info'} /><div className="grow"><b>{resp.mensaje}</b></div>
            </div>
            {resp.tipo === 'contraoferta' && (
              <>
                <div className="kv"><span className="k">Pide bolsa</span><span className="v">{dinero(resp.contrato.bolsa)}</span></div>
                <div className="kv"><span className="k">Pide bono por victoria</span><span className="v">{dinero(resp.contrato.bonoVictoria)}</span></div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn small primary grow" onClick={() => { const r = negociar(p.id, resp.contrato, modo); if (r.tipo === 'acepta') setFirmado(true); setResp(r); setC(resp.contrato); }}>Aceptar</button>
                  <button className="btn small grow" onClick={() => { setC(resp.contrato); setResp(null); }}>Ajustar</button>
                </div>
              </>
            )}
          </div>
        )}

        {CAMPOS.map(f => (
          <div key={f.k} className="card" style={{ padding: 12 }}>
            <div className="row between">
              <div><div className="label">{f.label}</div>
                {f.k === 'bolsa' && <div className="muted small">Pide {dinero(ex.pide.bolsa)}</div>}
              </div>
              <Stepper valor={c[f.k]} min={0} max={50_000_000} paso={paso(Math.max(c[f.k], ex.pide[f.k], 500))}
                formato={dinero} onChange={v => set({ [f.k]: v } as Partial<Contrato>)} />
            </div>
          </div>
        ))}

        {(p.popularidad >= 55 || c.puntosPPV > 0) && (
          <div className="card" style={{ padding: 12 }}>
            <div className="row between"><div className="label">Puntos de PPV</div>
              <Stepper valor={c.puntosPPV} min={0} max={20} formato={v => `${v}%`} onChange={v => set({ puntosPPV: v })} />
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 12 }}>
          <div className="row between">
            <div className="label">Duración (peleas)</div>
            <Stepper valor={c.peleasRestantes} min={CONTRATOS.peleasMin} max={CONTRATOS.peleasMax} onChange={v => set({ peleasRestantes: v })} />
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>
            {p.edad >= 34 ? 'A su edad prefiere contratos largos.' : p.potencial >= 4 && p.edad <= 27 ? 'Es joven y con mucho potencial: prefiere contratos cortos.' : 'Le da igual la duración.'}
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="row between">
            <div><div className="label">Cláusula de rescisión</div><div className="muted small">Normal: {dinero(base)}</div></div>
            <Stepper valor={c.clausula} min={Math.round(base * NEGOCIACION.clausulaMinPct)} max={Math.round(base * NEGOCIACION.clausulaMaxPct)}
              paso={paso(Math.max(c.clausula, 500))} formato={dinero} onChange={v => set({ clausula: v })} />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => set({ clausula: base })}>Normal</button>
            <button className="btn small" onClick={() => set({ clausula: Math.round(base * 3) })}>Blindar (x3)</button>
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>Una cláusula alta te protege de que otras compañías se lo lleven, pero al peleador no le gusta.</div>
        </div>

        <button className={`card tap row between ${c.exclusividad ? '' : ''}`} onClick={() => set({ exclusividad: !c.exclusividad })}>
          <div style={{ textAlign: 'left' }}><div className="label">Cláusula de exclusividad</div><div className="muted small">No podrá firmar patrocinios que choquen con los tuyos</div></div>
          <span className={`check ${c.exclusividad ? 'on' : ''}`}>{c.exclusividad && <Icon name="check" />}</span>
        </button>
      </div>
    </Sheet>
  );
}
