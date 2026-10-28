import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FILTROS_VACIOS, ORDEN_INICIAL, type Filtros, type Orden } from '../domain/lista';

interface UI {
  filtros: Filtros;
  orden: Orden[];
  tabRoster: 'roster' | 'libres' | 'favoritos' | 'contratos' | 'todos';
  setFiltros: (f: Partial<Filtros>) => void;
  limpiarFiltros: () => void;
  setOrden: (o: Orden[]) => void;
  setTabRoster: (t: UI['tabRoster']) => void;
}

export const useUI = create<UI>()(
  persist(
    set => ({
      filtros: FILTROS_VACIOS,
      orden: ORDEN_INICIAL,
      tabRoster: 'libres',
      setFiltros: f => set(s => ({ filtros: { ...s.filtros, ...f } })),
      limpiarFiltros: () => set({ filtros: FILTROS_VACIOS }),
      setOrden: orden => set({ orden }),
      setTabRoster: tabRoster => set({ tabRoster }),
    }),
    { name: 'ct-ui', version: 1 },
  ),
);
