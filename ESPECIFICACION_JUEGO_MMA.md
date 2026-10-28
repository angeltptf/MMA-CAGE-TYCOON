# ESPECIFICACIÓN COMPLETA — "Cage Tycoon" (nombre provisional)

Juego personal de simulación de promotora de MMA. Solo para uso propio en mi iPhone. No se publica ni se vende.

Este documento describe TODO lo que debe hacer el juego. Está basado en un juego existente que me gusta (las capturas de referencia están en la carpeta `referencias/`). Reglas sobre esa referencia:
- Úsala SOLO para entender funcionalidades, flujo y qué datos se muestran.
- NO copies su nombre, logo, colores, íconos, distribución visual ni textos. El juego debe tener identidad visual propia.
- La referencia tiene traducciones malas (ej. "Lucha de libros" = "Book fight", "Envíos" = "Submissions", "Mostrar dinero" = "Show money"). Usa español natural y correcto, con la terminología que usa la afición de MMA en México (ver sección 15).

---

## 0. ROL Y REGLAS DE TRABAJO

- Actúa como desarrollador experto en juegos de gestión Y como experto en MMA: conoces a fondo la UFC y las demás promotoras, cómo se arman carteleras, rankings, campeonatos, contratos, bonos, PPV y matchmaking real. Cada decisión de simulación debe sentirse realista para un fan de MMA.
- ANTES DE PROGRAMAR: lee este documento completo y las capturas, y luego dame: (1) un resumen de lo que entendiste, (2) la lista de pantallas, (3) el modelo de datos, (4) la propuesta de estilo visual y (5) dudas concretas. Espera mi aprobación.
- Trabaja por fases (sección 14). Al terminar cada fase: prueba que funcione, haz commit y dime cómo probarlo en mi celular.
- Prioridad: estable, rápido y fluido antes que muchas funciones a medias.
- Todos los valores numéricos de balance (precios, probabilidades, curvas, aforos, sueldos) deben ir en archivos de configuración fáciles de editar, no metidos en el código.

---

## 1. PLATAFORMA Y TECNOLOGÍA

- PWA (web app progresiva) diseñada para iPhone, en vertical. Se instala desde Safari con "Agregar a pantalla de inicio" y abre a pantalla completa.
- Stack sugerido: Vite + React + TypeScript (puedes proponer otro si es más simple). Sin backend.
- Guardado automático en IndexedDB. Exportar/importar partida como archivo JSON (respaldo). Opción de varias ranuras de partida.
- Funciona sin internet una vez instalada (service worker).
- Ícono de app y splash screen propios. Respeta notch y barra inferior (safe areas).
- Sin anuncios, sin compras, sin login.
- Rendimiento: el mundo tendrá cientos de peleadores y 10+ compañías simuladas. Avanzar una semana debe tardar menos de 1 segundo. Usa listas virtualizadas en pantallas largas.
- Al final: instrucciones paso a paso para publicarla gratis en GitHub Pages e instalarla en el iPhone.

---

## 2. DISEÑO VISUAL (PROPIO)

- Modo oscuro, un color de acento fuerte propio (propón 2–3 opciones), tarjetas con esquinas redondeadas, tipografía deportiva legible y números grandes para dinero y estadísticas.
- Navegación: barra inferior de pestañas para lo principal (Inicio, Peleadores, Eventos, Negocios, Más) y un menú "Más" para el resto. (La referencia usa menú lateral de hamburguesa; quiero algo más cómodo para usar con una mano.)
- Avatares de peleadores generados por código (siluetas o figuras con colores y la bandera del país), sin fotos.
- Banderas con emoji.
- Gestos: pulsación larga para reordenar, deslizar para acciones rápidas, botón "atrás" siempre visible.
- Unidades: opción en Ajustes para elegir libras/pies o kg/cm (por defecto kg/cm). Moneda: USD con formato abreviado (K, M, B).

---

## 3. ESTRUCTURA DEL MUNDO Y DEL TIEMPO

- El tiempo avanza por SEMANAS: formato "Año 1 · Semana 1" (52 semanas por año).
- Máximo 1 evento propio por semana.
- Botón principal en Inicio:
  - Si esta semana NO hay evento: "Avanzar semana".
  - Si esta semana SÍ hay evento: "Noche de pelea" (lleva a ver el evento y simular las peleas). No se puede avanzar sin realizar o cancelar el evento.
- Cada semana se simula: entrenamiento y evolución de peleadores, recuperación de fatiga y daño, lesiones, ofertas (patrocinios, TV, inversionistas), noticias, contratos que vencen y toda la actividad de las compañías rivales.

### Modo de inicio
- Partida nueva: eliges el nombre de tu empresa, sus siglas, color, país sede y dinero inicial (dificultad: Fácil/Normal/Difícil).
- Empiezas como promotora pequeña, sin divisiones creadas (las agregas tú, ver sección 9) y con acceso a un mercado de agentes libres.
- Se genera un mundo con unos 1,500 peleadores ficticios (nombres coherentes con su nacionalidad), repartidos entre agentes libres y las compañías rivales.

---

## 4. PANTALLA DE INICIO

Debe mostrar:
- Logo/nombre de mi empresa.
- Nivel de popularidad de la empresa como barra con etiqueta de alcance: Local → Regional → Nacional → Internacional → Mundial.
- Fecha actual (año/semana).
- Dinero en caja.
- Peleadores: contratados / disponibles para pelear.
- Próximo evento: pelea estelar ("SANDOVAL vs BENS") y nombre del evento.
- Botones: Noche de pelea / Avanzar semana, Noticias (con contador de no leídas), Calendario de eventos, Peleadores.
- Accesos rápidos nuevos: posición actual en el ranking de compañías y alertas importantes (contrato por vencer, oferta pendiente, peleador lesionado).

---

## 5. PELEADORES

### 5.1 Datos de cada peleador
- Nombre, apellido, apodo, nacionalidad (bandera), género, edad, altura, peso habitual.
- Clase de peso principal y secundarias (puede subir o bajar de división).
- Estilo base: Boxeador, Kickboxer/Muay Thai, Luchador (wrestling), BJJ, Judoka, Sambista, MMA completo, Karateka, etc.
- Récord total (V-D-E) y récord dentro de mi empresa por separado.
- Racha actual y forma (últimas 5 peleas con círculos verdes = victoria, rojos = derrota, grises = empate/sin resultado).
- Ranking en su división (#1–#15), "C" si es campeón y "C²" si es doble campeón; campeón interino marcado aparte.
- Etiqueta de estatus según popularidad e historial: Prospecto → Preliminar → Tarjeta principal → Estelar → Estelar de PPV → Superestrella → Leyenda.
- Calificación general (1–5 estrellas) y Potencial (1–5 estrellas).
- Barras: Popularidad, Moral, Fatiga, Daño acumulado.
- Peleas restantes en su contrato.

### 5.2 Habilidades (escala 0–10)
- Ataque y Defensa por separado en: BJJ, Boxeo, Muay Thai, Lucha (wrestling).
- Atributos físicos: Agilidad, Agresividad, Mentón (chin), Corazón, Potencia, Velocidad, Cardio (nuevo), Propensión a lesiones (0 = nada propenso).
- Normalmente el máximo es 10. Solo los peleadores de élite pueden superar 10 con el tiempo (tope 15), y es muy difícil y lento.
- Progresión realista: los jóvenes con potencial alto mejoran; entre 28 y 32 años es su mejor momento; después de los 33–35 bajan velocidad, mentón y cardio. Las guerras y los KO sufridos reducen el mentón y aumentan el daño acumulado.

### 5.3 Lista de peleadores (roster)
Pestañas: Mi roster · Agentes libres · Favoritos · Contratos (por vencer).
- Buscador por nombre.
- Tarjeta de cada peleador con: ranking o C, división abreviada, avatar con bandera, estilo, etiqueta de estatus, nombre, récord, forma (5 círculos), edad, altura, peso, barra de popularidad, barra de fatiga/daño y peleas restantes de contrato.
- Filtros: género, división, estilo, nacionalidad, estatus, rango de edad, disponibles para pelear, lesionados, contrato por vencer.
- Ordenar por (orden múltiple: pulsación larga para reordenar prioridad, toque doble para ascendente/descendente): Último combate, Ranking, Estilo, Edad, Peso, Popularidad, Moral, Bolsa, Bono por victoria, Victorias, Derrotas, Fatiga, Daño, Nacionalidad, Calificación, Potencial, Ganancias totales.
- Comparar 2 peleadores lado a lado.

### 5.4 Ficha del peleador
Pestañas:
1. **Info:** datos, estrellas, barras, habilidades (ataque en un color, defensa en otro), atributos físicos y estado para pelear (fatiga y daño).
2. **Contrato:** ver 5.6.
3. **Historial de peleas:** lista cronológica (más reciente arriba) con franja verde/roja según resultado, nombre del evento, división, si fue de campeonato, rival, ranking y récord de ambos en ese momento, método, round y tiempo. Al tocar una, abre el detalle de la pelea (sección 7.5).
4. **Récords:** defensas de título consecutivas, defensas totales, reinados de título, edad al ser campeón por primera y última vez, bonos de actuación, racha ganadora y perdedora más larga, peleas, finalizaciones, KO, TKO, sumisiones, decisiones, peleas de la noche, actuaciones de la noche.
5. **Ganancias (NUEVO):** cuánto ha ganado en total y por pelea: bolsa, bono por victoria, bono de campeonato, bonos de la noche, puntos de PPV y patrocinios personales. Total acumulado, total del año y desglose pelea por pelea.

Botones de acción: Renovar contrato, Rescindir contrato, Retirar peleador, Editar.

### 5.5 Editor de peleadores
- Accesible con toque doble en la ficha o desde el menú "Editor".
- Pestañas: Info (nombre, apellidos, apodo, edad, altura, peso, nacionalidad, división principal y secundarias, estilo, género) · Ataque · Defensa · Físico.
- Sliders 0–10 con botones − / +. Puedo escribir más de 10 manualmente (es mi juego).
- Crear peleadores desde cero y agregarlos a mi roster o a agentes libres.

### 5.6 Contratos (MEJORADO)
Contrato actual: peleas restantes, bolsa (show money), bono por victoria, bono de campeonato, puntos de PPV y cláusulas.

Negociar contrato nuevo:
- Bolsa, bono por victoria y duración (número de peleas) con − / +.
- NUEVO: bono de campeonato, porcentaje de PPV para estrellas, bonos por rendimiento (KO/sumisión, pelea de la noche) y cláusula de exclusividad.
- Factores de negociación visibles ("Ventajas: Excampeón, Muy popular, Racha de 5 victorias, Ofertas de otras compañías").
- Mostrar saldo actual, sueldo promedio de mi roster y lo que pide el peleador.
- El peleador puede aceptar, rechazar o contraofertar según moral, popularidad, edad y ofertas de rivales.
- Si el contrato vence y no lo renuevo, pasa a agente libre y una compañía rival puede ficharlo.

### 5.7 Patrocinios personales de peleadores (NUEVO)
- Los peleadores consiguen solos sus patrocinios personales (marcas ficticias); yo no los controlo.
- Más popularidad = mejores patrocinios. Se muestran en su ficha (pestañas Contrato y Ganancias).
- Suben la moral del peleador y lo hacen pedir más dinero al renovar.

---

## 6. DIVISIONES, RANKINGS Y CAMPEONATOS

### 6.1 Divisiones
- Masculinas: Mosca, Gallo, Pluma, Ligero, Wélter, Mediano, Semipesado, Pesado (con su límite de peso en libras y kg).
- Femeninas: Paja, Mosca, Gallo, Pluma.
- Al inicio no hay divisiones activas: yo las creo con un botón "+" y puedo eliminarlas. Pantalla con pestañas Hombres / Mujeres, cada división muestra número de peleadores y campeón actual.

### 6.2 Rankings
- Ranking por división (Campeón + #1 a #15) y ranking Libra por Libra (P4P), de hombres y de mujeres.
- Se recalculan después de cada evento con lógica realista: ganarle a alguien mejor rankeado te sube mucho, ganarle a alguien sin ranking poco, inactividad baja, derrota contra un #1 baja menos que contra un #14.
- Flechas que indican si subió o bajó desde el evento anterior.

### 6.3 Campeonatos
- Campeonato y campeonato interino por división.
- Peleas de campeonato: 5 rounds por defecto (editable). Las demás: 3 rounds; los estelares que no son de título pueden ser a 5.
- Dobles campeones (C²).
- Si el campeón está lesionado mucho tiempo, se puede crear un título interino; si se retira o sube de división, queda el título vacante.

---

## 7. EVENTOS

### 7.1 Calendario
- Cuadrícula por semanas (4 columnas, filas por mes) con el año y la semana.
- Colores: evento completo y listo, evento incompleto (falta llenar peleas), evento ya realizado y casillas vacías con "+".
- Tocar "+" crea un evento en esa semana. Tocar un evento lo abre.
- Mostrar en cada casilla: nombre corto del evento, sede y bandera.

### 7.2 Tipos de evento y nombres
- **Evento numerado (PPV):** gran evento, ej. "[SIGLAS] 1, 2, 3...".
- **Fight Night:** evento de TV/streaming, más barato.
- **Torneo:** ver 7.6.
- **Evento especial internacional (NUEVO):** organizado por una oferta de inversionista (sección 11).
- La numeración es automática por serie, pero puedo poner nombre propio a cada evento (ej. "Noche Mexicana").

### 7.3 Pantalla del evento — 3 pestañas
**A) Cartelera**
- Lista de combates. El último de abajo es el ESTELAR y el penúltimo el COESTELAR; arriba van la cartelera preliminar y la early prelims.
- Pulsación larga para reordenar.
- Cada combate muestra: posición en la cartelera, división, si es de campeonato o interino, género, banderas, nombres, récords, rankings o C, momios de apuesta (ej. -285 / +223) y barra de Hype.
- Combates vacíos con "vs" y botón para llenarlos.
- Botones: Matchmaking automático (pide confirmación), Borrar cartelera, Confirmar.

**B) Boletos y configuración**
- Tipo de evento.
- Número de combates (+/−, máximo 20).
- Sede (abre la lista de sedes): nombre, aforo y costo de renta.
- Precio del boleto (+/−) con estimación EN VIVO de boletos vendidos e ingreso de taquilla, según la popularidad de la cartelera.
- Costo total del evento (renta + producción + bolsas estimadas).
- Nombre del evento.
- NUEVO: plataforma de transmisión según los contratos de TV activos, precio del PPV si aplica y estimación de compras de PPV.

**C) Historial**
- Lista cronológica de eventos pasados (el más reciente arriba): nombre del evento, pelea estelar y sede. Al tocar uno, abre sus resultados.

### 7.4 Programar una pelea (manual)
Pantalla con: Género → División (con cuántos peleadores disponibles hay en cada una) → Peleador A vs Peleador B (abre la lista de la división con todos los datos de 5.3, el campeón arriba y filtros) → Campeonato (sí/no, muestra al campeón actual) → Interino (sí/no) → 5 rounds (sí/no). Incluye un botón de sugerencia automática solo para esa pelea.

Validaciones: no dejar programar a peleadores lesionados, con fatiga alta, sin contrato o que ya tengan pelea programada. Avisar (sin bloquear) si la pelea no tiene lógica, por ejemplo un #1 contra alguien sin ranking.

### 7.5 MATCHMAKING AUTOMÁTICO (MUY IMPORTANTE)
Debe pensar como un matchmaker real de la UFC:
- Emparejar por ranking cercano: el #1 con el #2–#4 o el campeón; no un #1 contra un #12.
- Estelar: pelea de campeonato si el retador es lógico (#1–#3, o alguien con racha fuerte). Si no, el estelar es la pelea con más hype.
- Reglas: respetar los tiempos de recuperación (tras un KO, unas 12 semanas mínimo; tras una pelea normal, unas 6–8); no repetir rivales recientes salvo revancha justificada (pelea muy cerrada, polémica o de título); los prospectos van contra prospectos o veteranos en declive; los peleadores en mala racha van a la cartelera preliminar.
- Considerar el hype: rivalidades, estilos que chocan (striker vs grappler), estrellas, nacionalidad (peleadores locales arriba en la cartelera si el evento es en su país).
- Ordenar la cartelera automáticamente de menor a mayor importancia.
- Respetar el número de combates elegido y las divisiones activas.
- Si no hay suficientes peleadores disponibles, avisar en lugar de inventar peleas sin sentido.

### 7.6 Torneos
- Configuración: género, división, nombre, tamaño (4, 8 o 16), tipo ("Vieja escuela": todo el torneo en un solo evento / "Moderno": una ronda por evento a lo largo de varias semanas), llaves automáticas o manuales y si el ganador obtiene el campeonato.
- Después: llenar los lugares con peleadores (manual o automático) y sortear las llaves.
- Resultados con etiquetas: Cuartos A1, A2, B1, B2 · Semifinal A, B · Final. Corona para el ganador.
- Con el tipo vieja escuela hay que controlar la fatiga entre rondas de la misma noche.

### 7.7 Noche de pelea y simulación
- Al llegar la semana del evento: pantalla de "Noche de pelea".
- Se simulan las peleas en orden, de la primera preliminar al estelar. Opciones: ver pelea por pelea, ver solo el resultado o simular todo de golpe.
- **Motor de pelea:** simulación por rounds y por intercambios, usando habilidades de ataque contra defensa en cada disciplina, físicos, cardio, fatiga y daño acumulado. Debe ser realista: los grapplers buscan derribar, los strikers buscan mantenerse de pie, el mentón bajo sufre KO más fácil, el cardio bajo pierde en los rounds finales y debe haber sorpresas ocasionales (underdogs que ganan).
- **Resultados posibles:** KO, TKO (golpes o corte/médico), Sumisión (con nombre de la técnica: mata león, guillotina, triángulo, palanca al brazo, etc.), Decisión unánime, dividida o mayoritaria, Empate, Descalificación (rara) y Sin resultado (rara). Formato: "TKO R3 1:16", "SUB R2 0:18", "DU R3 5:00".
- **Detalle de cada pelea** (3 pestañas):
  1. Tale of the tape: edad, altura, peso en el pesaje, récord total, récord en mi empresa, estilo, momios, racha, forma, y barras comparativas de ataque/defensa en BJJ, boxeo, muay thai y lucha.
  2. Narración por round: resumen corto de lo que pasó en cada round (derribos, caídas, momentos clave).
  3. Estadísticas: golpes significativos, derribos, intentos de sumisión, tiempo de control y tarjetas de los 3 jueces (10-9, 10-8).

### 7.8 Resultados del evento — 3 pestañas
1. **Resultados:** todas las peleas, con el ganador resaltado y el perdedor atenuado, método, round, tiempo, rankings y barras de popularidad/hype.
2. **Bonos de la noche:** elijo (o se sugiere automáticamente) al Peleador de la Noche Y la Pelea de la Noche (NUEVO), además de "Actuación de la noche". Cada bono paga dinero extra a los peleadores (cantidad configurable).
3. **Finanzas del evento:**
   - Ingresos: precio del boleto, aforo, boletos vendidos y taquilla; NUEVO: ingresos de TV/streaming, PPV, patrocinios asignados al evento y pago de inversionista si aplica.
   - Gastos: renta de la sede, producción, bolsas, bonos por victoria, bonos de la noche y premios de torneo.
   - Popularidad ganada o perdida y TOTAL neto.

---

## 8. SEDES

Lista con: nombre, ciudad, país (bandera), aforo, costo de renta, tipo (arena techada / estadio al aire libre / teatro / plaza) y requisito de popularidad de la empresa para desbloquearla (las bloqueadas se ven atenuadas con candado).

Incluye la variedad de la referencia: desde salones de 200 personas hasta estadios de más de 100,000 en Australia, Rusia, España, Sudáfrica, EE. UU., Francia, Japón, Reino Unido, Irlanda, Brasil, Gales, Alemania, Corea, China, Polonia, Canadá, Nigeria, Tailandia, Nueva Zelanda, Hong Kong, Noruega, Suecia y Escocia. Usa nombres genéricos de ciudad ("Melbourne Stadium", "London Arena") o los nombres reales, lo que te sea más práctico.

**Sedes en México (agregar, aforos aproximados y editables):**
- Estadio Banorte (antes Azteca), CDMX – ~83,000
- Estadio Jalisco, Guadalajara – ~55,000
- Estadio BBVA, Monterrey – ~53,500
- Estadio Cuauhtémoc, Puebla – ~51,000
- Estadio Akron, Guadalajara – ~48,000
- Estadio Olímpico Universitario, CDMX – ~48,000
- Estadio Universitario (UANL), San Nicolás – ~41,000
- Plaza México, CDMX – ~41,000
- Estadio Corona, Torreón – ~30,000
- Estadio Caliente, Tijuana – ~27,000
- Arena Ciudad de México – ~22,000
- Palacio de los Deportes, CDMX – ~18,000
- Arena Monterrey – ~17,500
- Arena México, CDMX – ~16,500
- Arena Guadalajara – ~10,000
- Auditorio Nacional, CDMX – ~10,000
- Además, arenas pequeñas para empezar (gimnasios y auditorios locales de 500 a 5,000 en Colima, Guadalajara, Monterrey, Tijuana, Cancún y otras ciudades).

**Sedes famosas y de Medio Oriente/Asia (agregar; algunas solo se desbloquean con ofertas de inversionistas):**
- Etihad Arena, Abu Dabi (EAU) – ~18,000
- Kingdom Arena, Riad (Arabia Saudita) – ~25,000
- Estadio Internacional Rey Fahd, Riad – ~68,000
- Estadio Lusail, Catar – ~88,000
- Coca-Cola Arena, Dubái – ~17,000
- T-Mobile Arena, Las Vegas – ~20,000
- Madison Square Garden, Nueva York – ~20,000
- Saitama Super Arena, Japón – ~37,000
- Singapore Indoor Stadium – ~12,000
- Mercedes-Benz Arena, Shanghái – ~18,000
- Tokyo Dome – ~55,000
- Estadio Wembley, Londres – ~90,000
- Maracanã, Río de Janeiro – ~78,000

Reglas económicas de sede:
- La renta es proporcional al aforo y al país (Las Vegas y Nueva York son caros; Asia del Sur, más barato).
- Los estadios al aire libre generan más taquilla, pero tienen costo de producción alto y riesgo de clima (evento aleatorio menor).
- Los peleadores locales venden más boletos en su país (ej. un mexicano estelar en CDMX).
- Los eventos lejos de mi país de origen tienen un costo extra de viaje.

---

## 9. ECONOMÍA BALANCEADA (IMPORTANTE)

En la referencia la economía está rota: se llena un estadio de 105,000 personas con boletos de $4,440 y ganas $466M en una noche, así que el dinero deja de importar. En mi versión:
- Curva de demanda realista: la venta de boletos depende de la popularidad de la empresa en ese país, el hype de la cartelera (sobre todo el estelar), el precio del boleto y el tamaño de la sede. Un precio demasiado alto o una sede demasiado grande = asientos vacíos.
- Los ingresos grandes vienen de TV, PPV y patrocinios, como en la vida real; la taquilla es solo una parte.
- Los sueldos crecen con la popularidad. Las superestrellas cuestan mucho.
- Debe ser posible quebrar: si el dinero es negativo varias semanas, hay advertencias y luego Game Over (desactivable en Ajustes).
- Todos los números en un archivo de configuración para ajustarlos.
- Referencia aproximada de escala: una promotora regional pequeña genera cientos de miles al año; la UFC, más de 1,000 millones.

---

## 10. NEGOCIOS: PATROCINIOS Y DERECHOS DE TV (NUEVO)

Nueva sección "Negocios" con sub-pestañas: Patrocinios · Televisión · Ofertas · Finanzas.

### 10.1 Patrocinios de la empresa
- Categorías, cada una con un solo patrocinador exclusivo a la vez: Lona/octágono, Bebida oficial, Bebida energética, Cerveza, Ropa y uniformes de peleadores, Casa de apuestas, Automotriz, Tecnología, Suplementos, Cripto/fintech, Aerolínea, Videojuego oficial y Naming del evento ("[SIGLAS] 50 presentado por X").
- Marcas FICTICIAS (nombres inventados con estilo creíble).
- Cada oferta incluye: pago anual, duración (1–5 años), bono por objetivos (ej. 12 eventos al año, llegar a X fans, un evento en México) y requisito mínimo de popularidad.
- Las ofertas llegan periódicamente a Noticias. Opciones: Aceptar, Rechazar o Contraofertar (con probabilidad de que la marca suba la oferta o se retire).
- Romper un contrato tiene una penalización económica y baja la reputación.
- Más reputación = marcas más grandes y más dinero.
- Vista de patrocinadores activos: cuánto pagan, cuándo vencen y el progreso de los objetivos.

### 10.2 Derechos televisivos
- Venta por región: México, Latinoamérica, EE. UU./Canadá, Europa, Asia, Medio Oriente o paquete Global.
- Tipos: TV abierta (más alcance y popularidad, menos dinero), Cable, Streaming y PPV (ingreso por compras según el hype de cada evento numerado).
- Exclusivo (más dinero, una sola cadena) o no exclusivo.
- Cadenas ficticias que ofertan según mi popularidad en cada región.
- Duración en años y renegociación al vencer (si mi popularidad subió, me ofrecen más).
- Algunos contratos exigen un mínimo de eventos al año; si no lo cumplo, hay penalización.

---

## 11. OFERTAS DE PAÍSES E INVERSIONISTAS (NUEVO)

- Eventos aleatorios: llega una oferta de un inversionista o gobierno (Arabia Saudita, Emiratos/Abu Dabi, Catar, China, Singapur, Japón, EE. UU.-Las Vegas, Brasil, etc.) para llevar eventos a su país.
- Presentación como mensaje especial (ej. "Un fondo de inversión de Riad quiere llevar a tu empresa a Arabia Saudita").
- Tipos de oferta: un evento único, paquete de varios eventos o residencia anual (ej. 2 eventos al año durante 3 años en Abu Dabi).
- Condiciones posibles: pelea de campeonato en el estelar, cierto número de peleadores con estatus Estelar o superior, incluir a un peleador del país anfitrión o fecha específica.
- Si acepto, el evento se agrega al calendario en la sede de ese país y el pago se suma a las finanzas del evento. Si incumplo las condiciones, el pago se reduce y baja la reputación con ese inversionista.
- A mayor tamaño y popularidad de la empresa, ofertas más frecuentes y grandes.
- Estos eventos dan popularidad en la región anfitriona (ayuda a vender TV allá).

---

## 12. RANKING DE COMPAÑÍAS (NUEVO)

- Pantalla "Ranking de compañías" con estas promotoras reales (solo el nombre en texto, sin logos) más la mía:
  - UFC ★★★★★
  - ONE Championship ★★★★
  - PFL / MVP ★★★★
  - RIZIN ★★★★
  - KSW ★★★
  - OKTAGON MMA ★★★
  - Cage Warriors ★★★
  - LFA ★★
  - BRAVE CF ★★
  - AMC Fight Nights ★★
  - Nombres y valores iniciales editables en configuración.
- Columnas: posición, nombre, estrellas (1–5), dinero en caja, número de peleadores, fans, ingresos anuales y reputación. Se puede ordenar por cualquier columna.
- Las estrellas se recalculan con prestigio, reputación, ingresos y calidad del roster; pueden subir o bajar.
- **Simulación de rivales cada semana:** las compañías rivales organizan eventos (con la frecuencia realista de cada una), sus peleadores pelean (resultados simulados), firman agentes libres, pierden peleadores por contratos vencidos y ganan o pierden dinero, fans y reputación, con aleatoriedad pero valores iniciales realistas (la UFC empieza muy arriba de todas).
- Los peleadores de todo el mundo comparten un mismo mercado: puedo fichar a un peleador cuyo contrato venció con ONE y un rival puede llevarse a uno mío.
- Al tocar una compañía se abre su ficha: datos, historial con gráfica simple, sus campeones actuales y sus próximos/últimos eventos.
- Flechas de subida/bajada respecto al periodo anterior.
- Mi empresa empieza abajo y puede escalar hasta el #1. Aviso especial en Noticias cuando supero a una compañía.

---

## 13. OTRAS PANTALLAS

### 13.1 Empresa (MEJORADA; en la referencia solo tiene nombre e iniciales)
- Nombre, siglas, color principal y país sede (editables).
- Resumen: fundación, eventos realizados, peleadores, campeones actuales, popularidad por región (México, EE. UU., Latinoamérica, Europa, Asia, Medio Oriente) y reputación.
- Finanzas: ingresos y gastos por semana, por año e históricos, con gráfica, desglosados por taquilla, TV, PPV, patrocinios, inversionistas, sueldos, sedes y bonos.
- Patrocinadores y contratos de TV activos (accesos directos a Negocios).
- Logros desbloqueados.

### 13.2 Noticias (MEJORADA; en la referencia es aburrida y repetitiva)
- Pestañas: Importante · Eventos · Peleadores · Negocios · Mundo MMA.
- Agrupar avisos repetidos (en la referencia sale 20 veces "Precio del billete" y "Necesitas un descanso"; aquí se agrupa en un solo aviso).
- Noticias con más sabor: resultados de eventos rivales, peleadores que piden pelea por el título, rivalidades y declaraciones, lesiones, retiros, firmas de agentes libres, ofertas que llegan y movimientos del ranking de compañías.
- Las ofertas (patrocinios, TV, inversionistas, contratos) se pueden aceptar o rechazar desde la noticia misma.
- Marcar como leído y borrar.

### 13.3 Registros de la empresa
Récords históricos: más victorias, más finalizaciones, KO más rápido, más defensas de título, reinado más largo, evento con más taquilla, evento con más PPV, peleas de la noche, etc.

### 13.4 Salón de la Fama
Peleadores retirados destacados, ingresados automáticamente (o por mí) según su carrera, con ceremonia anual en Noticias.

### 13.5 Premios anuales (NUEVO)
Al terminar cada año: Peleador del Año, Pelea del Año, KO del Año, Sumisión del Año, Revelación del Año y Regreso del Año.

### 13.6 Ajustes
Unidades, dificultad, Game Over sí/no, velocidad de simulación, exportar/importar/borrar partida e idioma de los nombres de las divisiones (español/inglés).

---

## 14. SUGERENCIAS EXTRA (implementar en la última fase si todo lo demás está estable)

- Rivalidades: si dos peleadores se enfrentan en una pelea cerrada o polémica, se genera una rivalidad que sube el hype de la revancha.
- Pesaje: pequeña probabilidad de que alguien no dé el peso (pierde parte de la bolsa o se cancela la pelea).
- Bajas de última hora: si un peleador se lesiona antes del evento, me avisan y puedo buscar un reemplazo (sugerido automáticamente) o cancelar la pelea.
- Prospectos nuevos cada año (generación de jóvenes con potencial), con un "Scouting" simple para descubrirlos antes que los rivales.
- Retiro natural según la edad, el daño acumulado y las derrotas seguidas.
- Logros con recompensas pequeñas.

---

## 15. TERMINOLOGÍA (ESPAÑOL CORRECTO)

- Book fight → "Programar pelea" (NO "Lucha de libros").
- Fight card → "Cartelera". Main event → "Estelar". Co-main → "Coestelar". Prelims → "Preliminares".
- Show money → "Bolsa". Win bonus → "Bono por victoria".
- Submission → "Sumisión" (NO "Envío"). Decision → "Decisión" (DU, DD, DM).
- Fight of the Night / Performance of the Night → "Pelea de la Noche" / "Actuación de la Noche".
- Divisiones: Paja, Mosca, Gallo, Pluma, Ligero, Wélter, Mediano, Semipesado, Pesado (opción de mostrarlas en inglés).
- Chin → "Mentón". Heart → "Corazón".

---

## 16. FASES DE DESARROLLO

1. **Fase 1 – Núcleo:** estructura de la PWA, diseño visual, guardado, generación del mundo, peleadores (lista, ficha, editor, filtros, orden), divisiones y Inicio con avance de semanas.
2. **Fase 2 – Eventos:** calendario, crear evento, programar peleas manualmente, matchmaking automático, sedes (todas las de la sección 8), boletos con curva de demanda y motor de simulación de peleas.
3. **Fase 3 – Resultados y progresión:** resultados del evento, bonos de la noche, finanzas del evento, rankings, campeonatos, historial y récords del peleador, progresión/lesiones/retiros y torneos.
4. **Fase 4 – Contratos y dinero:** contratos mejorados, agentes libres, ganancias por peleador, patrocinios personales y economía balanceada.
5. **Fase 5 – Negocios:** patrocinios de la empresa, derechos de TV, PPV, ofertas de inversionistas y pantalla Empresa mejorada.
6. **Fase 6 – Mundo vivo:** compañías rivales simuladas, ranking de compañías, mercado compartido, Noticias mejoradas, Salón de la Fama y premios anuales.
7. **Fase 7 – Extras y pulido:** sugerencias de la sección 14, balance final, animaciones y publicación en GitHub Pages con instrucciones de instalación en iPhone.
