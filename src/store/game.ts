import { create } from 'zustand';
import * as A from '../domain/acciones';
import { avanzarSemana, clonarJuego, type ResumenSemana } from '../domain/semana';
import type { RespuestaNegociacion, ModoContrato } from '../domain/negociacion';
import type { Ajustes, Contrato, Juego, NuevaPartida, Peleador } from '../domain/types';
import { normalizarJuego } from '../domain/migracion';
import { crearMundo } from '../domain/worldgen';
import { borrarPartida, cargarPartida, guardarPartida, pedirAlmacenamientoPersistente } from './db';

interface Estado {
  juego: Juego | null;
  ranura: number | null;
  guardando: boolean;
  aviso: string | null;           // mensaje breve (toast)
  ultimoResumen: ResumenSemana | null;

  nuevaPartida: (ranura: number, datos: NuevaPartida) => Promise<void>;
  cargar: (ranura: number) => Promise<boolean>;
  cargarDesdeJuego: (ranura: number, j: Juego) => Promise<void>;
  salir: () => void;
  borrar: (ranura: number) => Promise<void>;

  avanzar: () => void;
  // Ejecuta una acción del dominio sobre una copia; devuelve el error (o null)
  hacer: (fn: (j: Juego) => string | null | void, exito?: string) => string | null;
  negociar: (id: number, oferta: Contrato, modo: ModoContrato) => RespuestaNegociacion;
  contraofertar: (ofertaId: number, monto: number) => { ok: boolean; mensaje: string };
  actualizarAjustes: (a: Partial<Ajustes>) => void;
  editarEmpresa: (c: { nombre?: string; siglas?: string; color?: string; pais?: string }) => void;
  marcarRespaldo: () => void;
  setAviso: (m: string | null) => void;
}

let temporizador: ReturnType<typeof setTimeout> | null = null;

export const useGame = create<Estado>((set, get) => {
  const programarGuardado = () => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => void guardarAhora(), 700);
  };
  const guardarAhora = async () => {
    const { juego, ranura } = get();
    if (!juego || ranura == null) return;
    const mia = juego.companias.find(c => c.esMia)!;
    set({ guardando: true });
    try { await guardarPartida(ranura, juego, mia.siglas, mia.color); }
    catch { set({ aviso: 'No se pudo guardar (¿almacenamiento lleno?). Exporta un respaldo.' }); }
    set({ guardando: false });
  };
  const aplicar = (j: Juego) => {
    set({ juego: j });
    programarGuardado();
  };

  return {
    juego: null,
    ranura: null,
    guardando: false,
    aviso: null,
    ultimoResumen: null,

    nuevaPartida: async (ranura, datos) => {
      const j = crearMundo(datos);
      set({ juego: j, ranura });
      void pedirAlmacenamientoPersistente();
      await guardarAhora();
    },
    cargar: async ranura => {
      const j = await cargarPartida(ranura);
      if (!j) return false;
      set({ juego: normalizarJuego(j), ranura });
      void pedirAlmacenamientoPersistente();
      return true;
    },
    cargarDesdeJuego: async (ranura, j) => {
      set({ juego: normalizarJuego(j), ranura });
      await guardarAhora();
    },
    salir: () => {
      if (temporizador) { clearTimeout(temporizador); void guardarAhora(); }
      set({ juego: null, ranura: null });
    },
    borrar: async ranura => {
      await borrarPartida(ranura);
      if (get().ranura === ranura) set({ juego: null, ranura: null });
    },

    avanzar: () => {
      const j = get().juego;
      if (!j || j.finDelJuego) return;
      const { juego, resumen } = avanzarSemana(j);
      set({ juego, ultimoResumen: resumen });
      programarGuardado();
    },

    hacer: (fn, exito) => {
      const j = get().juego;
      if (!j) return 'Sin partida.';
      const copia = clonarJuego(j);
      const err = fn(copia);
      if (err) return err;
      aplicar(copia);
      if (exito) set({ aviso: exito });
      return null;
    },

    negociar: (id, oferta, modo) => {
      const j = get().juego;
      if (!j) return { tipo: 'rechaza', mensaje: 'Sin partida.', ofendido: false };
      const copia = clonarJuego(j);
      const r = A.negociar(copia, id, oferta, modo);
      aplicar(copia);
      return r;
    },
    contraofertar: (ofertaId, monto) => {
      const j = get().juego;
      if (!j) return { ok: false, mensaje: 'Sin partida.' };
      const copia = clonarJuego(j);
      const r = A.contraofertar(copia, ofertaId, monto);
      aplicar(copia);
      return r;
    },
    actualizarAjustes: a => {
      const j = get().juego;
      if (!j) return;
      aplicar({ ...j, ajustes: { ...j.ajustes, ...a } });
    },
    editarEmpresa: c => {
      const j = get().juego;
      if (!j) return;
      const copia = clonarJuego(j);
      const mia = copia.companias.find(x => x.esMia)!;
      Object.assign(mia, c);
      if (c.nombre) copia.nombre = c.nombre;
      aplicar(copia);
    },
    marcarRespaldo: () => {
      const j = get().juego;
      if (j) aplicar({ ...j, ultimoRespaldo: Date.now() });
    },
    setAviso: m => set({ aviso: m }),
  };
});

// Atajos de acciones para los componentes
export const acciones = {
  fichar: (id: number, peleas?: number) => useGame.getState().hacer(j => A.ficharLibre(j, id, peleas), 'Fichaje completado'),
  robar: (id: number) => useGame.getState().hacer(j => A.robarPeleador(j, id), 'Peleador fichado'),
  rescindir: (id: number) => useGame.getState().hacer(j => A.rescindirContrato(j, id), 'Contrato rescindido'),
  retirar: (id: number) => useGame.getState().hacer(j => A.retirarPeleador(j, id), 'Peleador retirado'),
  enVenta: (id: number) => useGame.getState().hacer(j => { A.alternarEnVenta(j, id); }),
  aceptarOferta: (id: number) => useGame.getState().hacer(j => A.aceptarOferta(j, id), 'Traspaso cerrado'),
  rechazarOferta: (id: number) => useGame.getState().hacer(j => A.rechazarOferta(j, id), 'Oferta rechazada'),
  favorito: (id: number) => useGame.getState().hacer(j => { A.alternarFavorito(j, id); }),
  guardarPeleador: (p: Peleador) => useGame.getState().hacer(j => { A.guardarPeleador(j, p); }, 'Cambios guardados'),
  crearDivision: (g: 'M' | 'F', c: Peleador['clase']) => useGame.getState().hacer(j => A.crearDivision(j, g, c), 'División creada'),
  eliminarDivision: (id: string) => useGame.getState().hacer(j => { A.eliminarDivision(j, id); }, 'División eliminada'),
};

export const miCompania = (j: Juego) => j.companias.find(c => c.esMia)!;
