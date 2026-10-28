import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dinero } from '../domain/format';
import { estatus, nombreCompleto } from '../domain/peleador';
import type { OfertaTraspaso } from '../domain/types';
import { acciones, useGame } from '../store/game';
import { Avatar } from '../ui/Avatar';
import { Confirmar, Sheet, Stepper, TopBar, Vacio } from '../ui/kit';

export function Ofertas() {
  const juego = useGame(s => s.juego)!;
  const nav = useNavigate();
  const contraofertar = useGame(s => s.contraofertar);
  const setAviso = useGame(s => s.setAviso);
  const [conf, setConf] = useState<OfertaTraspaso | null>(null);
  const [contra, setContra] = useState<OfertaTraspaso | null>(null);
  const [monto, setMonto] = useState(0);

  const pendientes = juego.ofertas.filter(o => o.estado === 'pendiente');
  const pasadas = juego.ofertas.filter(o => o.estado !== 'pendiente').slice(-8).reverse();
  const nombreRival = (id: string) => juego.companias.find(c => c.id === id)?.nombre ?? id;
  const peleador = (id: number) => juego.peleadores.find(p => p.id === id);

  const aceptar = (o: OfertaTraspaso) => {
    const e = acciones.aceptarOferta(o.id);
    if (e) setAviso(e);
    setConf(null);
  };
  const abrirContra = (o: OfertaTraspaso) => { setContra(o); setMonto(Math.round(o.monto * 1.2)); };
  const enviarContra = () => {
    if (!contra) return;
    const r = contraofertar(contra.id, monto);
    setAviso(r.mensaje);
    setContra(null);
  };

  return (
    <>
      <TopBar titulo="Ofertas por mis peleadores" />
      <div className="scroll">
        {pendientes.length === 0 && (
          <Vacio titulo="Sin ofertas por ahora" texto="Si tus peleadores se hacen populares, otras compañías ofrecerán por ellos. Puedes poner a alguien en venta desde su ficha para recibir más ofertas." />
        )}
        <div className="stack">
          {pendientes.map(o => {
            const p = peleador(o.peleadorId);
            if (!p) return null;
            const sem = Math.max(0, o.semanaVence - juego.semanaAbs);
            return (
              <div key={o.id} className="card stack" style={{ gap: 10 }}>
                <button className="row" style={{ textAlign: 'left' }} onClick={() => nav(`/peleador/${p.id}`)}>
                  <Avatar p={p} size={52} />
                  <div className="grow">
                    <div className="mid">{nombreCompleto(p)}</div>
                    <div className="muted small">{estatus(p)} · {nombreRival(o.companiaId)}</div>
                  </div>
                </button>
                <div className="kv"><span className="k">Ofrecen</span><span className="v accent">{dinero(o.monto)}</span></div>
                <div className="kv"><span className="k">Su cláusula</span><span className="v">{dinero(p.contrato?.clausula ?? 0)}</span></div>
                <div className="kv"><span className="k">Vence en</span><span className="v">{sem} semana{sem === 1 ? '' : 's'}</span></div>
                <div className="row">
                  <button className="btn small primary grow" onClick={() => setConf(o)}>Aceptar</button>
                  <button className="btn small grow" onClick={() => abrirContra(o)}>Contraofertar</button>
                  <button className="btn small danger grow" onClick={() => { acciones.rechazarOferta(o.id); }}>Rechazar</button>
                </div>
              </div>
            );
          })}
        </div>
        {pasadas.length > 0 && (
          <>
            <div className="section-title" style={{ margin: '20px 0 8px' }}>Historial</div>
            <div className="card">
              {pasadas.map(o => (
                <div key={o.id} className="kv">
                  <span className="k">{peleador(o.peleadorId) ? nombreCompleto(peleador(o.peleadorId)!) : '—'} · {nombreRival(o.companiaId)}</span>
                  <span className="v">{dinero(o.monto)} · {o.estado}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {conf && peleador(conf.peleadorId) && (
        <Confirmar titulo="¿Aceptar el traspaso?" confirmar="Aceptar"
          texto={`${nombreCompleto(peleador(conf.peleadorId)!)} se irá a ${nombreRival(conf.companiaId)} y recibirás ${dinero(conf.monto)}. No se puede deshacer.`}
          onNo={() => setConf(null)} onSi={() => aceptar(conf)} />
      )}
      {contra && (
        <Sheet titulo="Contraoferta" onClose={() => setContra(null)}
          pie={<button className="btn primary" onClick={enviarContra}>Enviar {dinero(monto)}</button>}>
          <p className="muted" style={{ marginBottom: 14 }}>
            Piden {dinero(contra.monto)}. Si pides más de lo que están dispuestos a pagar, se retiran y pierdes la oferta. Ojo: no sabes cuál es su límite.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Stepper valor={monto} min={contra.monto} max={Math.max(contra.monto * 3, 1000)}
              paso={Math.max(100, Math.round(contra.monto * 0.05 / 100) * 100)} formato={dinero} onChange={setMonto} />
          </div>
        </Sheet>
      )}
    </>
  );
}
