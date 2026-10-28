import type { CategoriaNoticia, Juego, Noticia } from './types';

export interface NuevaNoticia {
  categoria: CategoriaNoticia;
  titulo: string;
  cuerpo?: string;
  grupo?: string;
  peleadorId?: number;
  ofertaId?: number;
}

// Agrupa avisos repetidos: si ya hay uno sin leer con el mismo grupo, solo sube el contador.
export function agregarNoticia(j: Juego, n: NuevaNoticia): void {
  if (n.grupo) {
    const i = j.noticias.findIndex(x => x.grupo === n.grupo && !x.leida);
    if (i >= 0) {
      const x = j.noticias[i];
      j.noticias[i] = { ...x, semana: j.semanaAbs, veces: (x.veces ?? 1) + 1 };
      return;
    }
  }
  const nueva: Noticia = { id: j.sigNoticia++, semana: j.semanaAbs, leida: false, ...n };
  j.noticias.unshift(nueva);
  if (j.noticias.length > 400) j.noticias.length = 400;
}
