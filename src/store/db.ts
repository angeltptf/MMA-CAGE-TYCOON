import Dexie, { type Table } from 'dexie';
import type { Juego } from '../domain/types';

export const RANURAS = [1, 2, 3] as const;

export interface MetaPartida {
  ranura: number;
  nombre: string;
  siglas: string;
  color: string;
  semanaAbs: number;
  actualizado: number;
}
interface DatosPartida { ranura: number; juego: Juego }

class CageDB extends Dexie {
  meta!: Table<MetaPartida, number>;
  datos!: Table<DatosPartida, number>;
  constructor() {
    super('cage-tycoon');
    this.version(1).stores({ meta: 'ranura', datos: 'ranura' });
  }
}

export const db = new CageDB();

export async function listarPartidas(): Promise<MetaPartida[]> {
  try { return await db.meta.toArray(); } catch { return []; }
}

export async function guardarPartida(ranura: number, j: Juego, siglas: string, color: string): Promise<void> {
  const meta: MetaPartida = {
    ranura, nombre: j.nombre, siglas, color, semanaAbs: j.semanaAbs, actualizado: Date.now(),
  };
  await db.transaction('rw', db.meta, db.datos, async () => {
    await db.meta.put(meta);
    await db.datos.put({ ranura, juego: j });
  });
}

export async function cargarPartida(ranura: number): Promise<Juego | null> {
  const d = await db.datos.get(ranura);
  return d?.juego ?? null;
}

export async function borrarPartida(ranura: number): Promise<void> {
  await db.transaction('rw', db.meta, db.datos, async () => {
    await db.meta.delete(ranura);
    await db.datos.delete(ranura);
  });
}

// Pide al navegador que no borre los datos por falta de uso (importante en iOS)
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* sin soporte */ }
  return false;
}

export function exportarJSON(j: Juego): void {
  const blob = new Blob([JSON.stringify({ app: 'cage-tycoon', juego: j })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cage-tycoon-${j.nombre.replace(/[^\w]+/g, '_')}-A${Math.floor(j.semanaAbs / 52) + 1}S${(j.semanaAbs % 52) + 1}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function leerArchivoJSON(file: File): Promise<Juego> {
  const data = JSON.parse(await file.text());
  const j = data?.juego ?? data;
  if (!j || !Array.isArray(j.peleadores) || !Array.isArray(j.companias)) {
    throw new Error('El archivo no es una partida válida de Cage Tycoon.');
  }
  return j as Juego;
}
