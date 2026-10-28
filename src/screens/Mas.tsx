import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/game';
import { Fila, TopBar } from '../ui/kit';

export function Mas() {
  const nav = useNavigate();
  const salir = useGame(s => s.salir);
  return (
    <>
      <TopBar titulo="Más" atras={false} />
      <div className="scroll flush">
        <Fila icono="news" titulo="Noticias" detalle="Avisos, ofertas y novedades" onClick={() => nav('/noticias')} />
        <Fila icono="bolt" titulo="Ofertas por mis peleadores" detalle="Traspasos y contraofertas" onClick={() => nav('/ofertas')} />
        <Fila icono="trophy" titulo="Divisiones" detalle="Crea y administra tus divisiones" onClick={() => nav('/divisiones')} />
        <Fila icono="chart" titulo="Rankings" detalle="Por compañía, global y libra por libra" onClick={() => nav('/rankings')} />
        <Fila icono="building" titulo="Ranking de compañías" detalle="Tú contra UFC, ONE, PFL y más" onClick={() => nav('/companias')} />
        <Fila icono="building" titulo="Empresa" detalle="Nombre, siglas, color y resumen" onClick={() => nav('/empresa')} />
        <Fila icono="edit" titulo="Editor de peleadores" detalle="Crea o modifica peleadores" onClick={() => nav('/editor/nuevo')} />
        <Fila icono="trophy" titulo="Torneos" detalle="Próximamente · Fase 3" onClick={() => nav('/torneos')} bloqueado />
        <Fila icono="award" titulo="Registros" detalle="Próximamente · Fase 6" onClick={() => nav('/registros')} bloqueado />
        <Fila icono="star" titulo="Salón de la Fama" detalle="Próximamente · Fase 6" onClick={() => nav('/salon')} bloqueado />
        <Fila icono="award" titulo="Premios anuales" detalle="Próximamente · Fase 6" onClick={() => nav('/premios')} bloqueado />
        <Fila icono="settings" titulo="Ajustes" detalle="Unidades, respaldo y partidas" onClick={() => nav('/ajustes')} />
        <div style={{ padding: 16 }}>
          <button className="btn" onClick={() => salir()}>Cambiar de partida</button>
        </div>
      </div>
    </>
  );
}
