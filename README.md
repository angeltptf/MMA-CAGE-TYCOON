# Cage Tycoon

Simulador personal de promotora de MMA. PWA para iPhone (vertical), sin backend, sin anuncios.
La especificación completa está en [`ESPECIFICACION_JUEGO_MMA.md`](ESPECIFICACION_JUEGO_MMA.md).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Núcleo: PWA, diseño, guardado, mundo, peleadores, divisiones, rankings, avance de semanas | ✅ |
| 2 | Eventos, calendario, matchmaking, sedes, boletos, motor de pelea, Noche de pelea | ✅ |
| 1.5 | Hardcore ($50K), 2,000–3,000 peleadores, negociación de contratos, ofertas de rivales | ✅ |
| 3 | Resultados, bonos de la noche, rankings por resultados, campeonatos, historial y récords, torneos | ✅ |
| 4 | Contratos, ganancias, patrocinios personales, libro de finanzas, Game Over, economía calibrada | ✅ |
| 5 | Negocios: patrocinios, TV, PPV, inversionistas | ⬜ |
| 6 | Compañías rivales vivas, noticias, salón de la fama, premios | ⬜ |
| 7 | Extras, pulido, balance final | ⬜ |

## Desarrollo

```bash
npm install
npm run dev        # servidor local (también accesible desde tu red Wi-Fi)
npm test           # pruebas de la simulación
npm run build      # compilación de producción en dist/
```

## Dónde editar el balance

Todos los números del juego viven en `src/config/`:

- `balance.ts` — dificultad, curva de edad, progresión, contratos, cláusulas, retiros y nuevo talento.
- `companias.ts` — compañías rivales, tamaño de roster, calidad, dinero, fans y reputación iniciales.
- `divisiones.ts` — clases de peso, límites, estilos de pelea.
- `paises.ts` — países y nombres/apellidos por nacionalidad.

## Publicar en GitHub Pages e instalar en el iPhone

1. Crea un repositorio **público** vacío en GitHub (p. ej. `cage-tycoon`).
2. En esta carpeta:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/cage-tycoon.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. En la pestaña **Actions** espera a que termine "Publicar en GitHub Pages" (≈2 min).
5. Tu juego queda en `https://<tu-usuario>.github.io/cage-tycoon/`.
6. En el iPhone abre esa dirección **en Safari** → botón Compartir → **Agregar a pantalla de inicio**.
   Ábrelo desde el ícono: corre a pantalla completa y funciona sin internet.

> Cada `git push` a `main` vuelve a publicar. La app se actualiza sola la siguiente vez que la abres con internet
> (si no ves el cambio, ciérrala por completo y ábrela otra vez).

## Respaldo de partidas

Las partidas se guardan en el dispositivo (IndexedDB). Usa **Más → Ajustes → Exportar respaldo** de vez en cuando
y guarda el archivo `.json` en iCloud Drive o Archivos. Se importa desde la pantalla inicial o desde Ajustes.
