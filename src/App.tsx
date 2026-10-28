import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Ajustes } from './screens/Ajustes';
import { Comparar } from './screens/Comparar';
import { Companias } from './screens/Companias';
import { Divisiones } from './screens/Divisiones';
import { DetallePelea } from './screens/DetallePelea';
import { Editor } from './screens/Editor';
import { Evento } from './screens/Evento';
import { Eventos } from './screens/Eventos';
import { Noche } from './screens/Noche';
import { ProgramarPelea } from './screens/ProgramarPelea';
import { Sedes } from './screens/Sedes';
import { Torneo, Torneos } from './screens/Torneos';
import { Empresa } from './screens/Empresa';
import { Ficha } from './screens/Ficha';
import { Finanzas } from './screens/Finanzas';
import { GameOver } from './screens/GameOver';
import { Home } from './screens/Home';
import { Landing } from './screens/Landing';
import { Mas } from './screens/Mas';
import { Noticias } from './screens/Noticias';
import { Ofertas } from './screens/Ofertas';
import { Proximamente } from './screens/Proximamente';
import { Rankings } from './screens/Rankings';
import { Roster } from './screens/Roster';
import { useGame } from './store/game';
import { Icon, type IconName } from './ui/Icon';
import { Toast } from './ui/kit';

const TABS: { ruta: string; label: string; icono: IconName }[] = [
  { ruta: '/', label: 'Inicio', icono: 'home' },
  { ruta: '/peleadores', label: 'Peleadores', icono: 'users' },
  { ruta: '/eventos', label: 'Eventos', icono: 'calendar' },
  { ruta: '/negocios', label: 'Negocios', icono: 'briefcase' },
  { ruta: '/mas', label: 'Más', icono: 'grid' },
];

export function App() {
  const juego = useGame(s => s.juego);
  const aviso = useGame(s => s.aviso);
  const setAviso = useGame(s => s.setAviso);
  const loc = useLocation();
  const nav = useNavigate();

  // al cambiar de partida siempre se vuelve al inicio
  useEffect(() => { if (!juego && loc.pathname !== '/') nav('/', { replace: true }); }, [juego, loc.pathname, nav]);

  if (!juego) {
    return (
      <div className="app"><div className="shell"><div className="screen"><Landing /></div></div></div>
    );
  }

  const enTab = TABS.some(t => t.ruta === loc.pathname);
  const noLeidas = juego.noticias.filter(n => !n.leida).length;

  return (
    <div className="app">
      <div className="shell">
        <div className="screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/peleadores" element={<Roster />} />
            <Route path="/peleador/:id" element={<Ficha />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/comparar/:a/:b" element={<Comparar />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/evento/:id" element={<Evento />} />
            <Route path="/evento/:id/sede" element={<Sedes />} />
            <Route path="/evento/:id/pelea/:peleaId" element={<ProgramarPelea />} />
            <Route path="/pelea/:eventoId/:peleaId" element={<DetallePelea />} />
            <Route path="/noche/:id" element={<Noche />} />
            <Route path="/negocios" element={<Proximamente titulo="Negocios" fase="Fase 5" texto="Patrocinios, derechos de TV, PPV y ofertas de inversionistas." tab />} />
            <Route path="/mas" element={<Mas />} />
            <Route path="/divisiones" element={<Divisiones />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/companias" element={<Companias />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/ofertas" element={<Ofertas />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/torneos" element={<Torneos />} />
            <Route path="/torneo/:id" element={<Torneo />} />
            <Route path="/registros" element={<Proximamente titulo="Registros" fase="Fase 6" texto="Récords históricos de tu empresa." />} />
            <Route path="/salon" element={<Proximamente titulo="Salón de la Fama" fase="Fase 6" texto="Los peleadores retirados más destacados." />} />
            <Route path="/premios" element={<Proximamente titulo="Premios anuales" fase="Fase 6" texto="Peleador, Pelea, KO y Sumisión del Año." />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>

        {enTab && (
          <nav className="tabbar">
            {TABS.map(t => (
              <button key={t.ruta} className={loc.pathname === t.ruta ? 'on' : ''} onClick={() => nav(t.ruta)}>
                <Icon name={t.icono} />
                {t.label}
                {t.ruta === '/' && noLeidas > 0 && <span className="badge">{noLeidas > 99 ? '99+' : noLeidas}</span>}
              </button>
            ))}
          </nav>
        )}
        {juego.finDelJuego && loc.pathname !== '/finanzas' && <GameOver />}
        {aviso && <Toast mensaje={aviso} error={/^No |Sin |Ese |Este |Esa /.test(aviso)} onFin={() => setAviso(null)} />}
      </div>
    </div>
  );
}
