import { useNavigate } from 'react-router-dom';
import { dinero, fecha } from '../domain/format';
import { useGame } from '../store/game';

export function GameOver() {
  const juego = useGame(s => s.juego)!;
  const seguir = useGame(s => s.continuarSinGameOver);
  const salir = useGame(s => s.salir);
  const nav = useNavigate();
  const mia = juego.companias.find(c => c.esMia)!;
  const eventos = juego.eventos.filter(e => e.estado === 'realizado').length;
  return (
    <div className="overlay center" style={{ background: 'rgba(0,0,0,.85)' }}>
      <div className="dialog" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--bad)' }}>Fin del juego</div>
        <h2 style={{ fontSize: 36, margin: '6px 0 10px' }}>{mia.nombre} quebró</h2>
        <p>Llevas {juego.semanasEnNegativo} semanas en números rojos. Duraste hasta {fecha(juego.semanaAbs)}, con {eventos} evento{eventos === 1 ? '' : 's'} realizado{eventos === 1 ? '' : 's'} y una caja de {dinero(mia.dinero)}.</p>
        <div className="stack">
          <button className="btn" onClick={() => nav('/finanzas')}>Ver finanzas</button>
          <button className="btn primary" onClick={seguir}>Seguir jugando (sin Game Over)</button>
          <button className="btn" onClick={salir}>Volver al menú</button>
        </div>
      </div>
    </div>
  );
}
