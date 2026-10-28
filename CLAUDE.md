# Cage Tycoon

Juego personal de gestión de promotora de MMA (PWA, iPhone, español de México). Especificación: `ESPECIFICACION_JUEGO_MMA.md`.
Referencias visuales: `referencias/` (solo para entender funciones; no copiar nombre, colores, textos ni layout).

## Reglas de trabajo
- Se avanza por fases (sección 16 de la especificación). Al cerrar cada fase: pruebas, commit y explicar cómo probar en el iPhone.
- Todo número de balance va en `src/config/`, nunca en la lógica.
- Estilo visual: modo oscuro grafito + acento lima `#C8F53C` (opción A elegida). Barras: ataque rosa, defensa cian, físico verde, popularidad ámbar.
- Terminología: ver sección 15 de la especificación (Bolsa, Cartelera, Estelar, Sumisión, Mentón, Corazón…).

## Decisiones tomadas con el dueño
- Rankings: uno por compañía (la mía y cada rival) y uno global. Mis divisiones solo contienen mis peleadores.
- Agentes libres: se pueden fichar en cualquier momento. Peleadores con contrato en otra compañía: se "roban" pagando su cláusula de rescisión (no realista a propósito).
- Empiezo con 0 peleadores y 0 divisiones. Los retirados se reemplazan con nuevo talento generado con el tiempo.
- Rivales: sus peleas usarán una versión rápida del motor (sin narración); las mías, el motor completo.
- Publicación: GitHub Pages (repo público) + guardado en IndexedDB con respaldo JSON.

## Estructura
- `src/domain/` lógica pura y testeable (mundo, semana, rankings, acciones, listas). Sin React.
- `src/store/` estado (zustand) y guardado (Dexie/IndexedDB).
- `src/screens/` pantallas; `src/ui/` componentes y CSS.
- La partida completa es un objeto `Juego` JSON-serializable (`src/domain/types.ts`).

## Comandos
`npm run dev` · `npm test` · `npm run build`
