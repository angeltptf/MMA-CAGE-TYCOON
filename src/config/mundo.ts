// Parámetros del mundo vivo: compañías rivales, mercado de peleadores, Salón de la Fama y premios.

export const MUNDO = {
  // --- eventos de las compañías rivales ---
  boutsPorEvento: { base: 6, porPeleadores: 1 / 40, max: 14, min: 5 },
  defensaTituloProb: 0.06,          // por evento y división con campeón disponible
  semanasEntreDefensas: 10,
  rankingMargenPareja: 8,           // ruido al emparejar por puntos de ranking
  rematchSemanas: 30,
  fatigaTrasPelea: 55,
  noticiasMaxPorSemana: 4,

  // --- contratos y mercado de agentes libres ---
  renovacionRival: 0.72,            // al terminar su contrato, probabilidad de que la compañía lo renueve
  contratoRivalPeleas: [4, 8] as [number, number],
  fichajesPorSemana: 2,             // máximo por compañía
  probFichaje: 0.35,                // por compañía y semana (sube si le faltan peleadores)
  nivelFichajeMin: -1.6,            // calificación mínima respecto al promedio de la compañía
  nivelFichajeMax: 1.2,
  notableFichaje: 35,               // popularidad desde la que sale en noticias

  // --- compañías: finanzas y estrellas ---
  ingresoPorEvento: [0.8, 1.25] as [number, number],
  margenGasto: [0.6, 0.88] as [number, number],
  trimestreSemanas: 13,
  estrellasUmbral: [66, 86, 103, 120], // puntaje para 2, 3, 4 y 5 estrellas
  pesoCalidadRoster: 1.2,
  histMax: 130,

  // --- Salón de la Fama ---
  salon: {
    umbral: 50,
    minPeleas: 14,
    semanaCeremonia: 46,
    pesos: { reinado: 12, defensa: 3, popMax75: 10, popMax60: 5, victoria: 0.5, finalizacion: 0.3, peleadorNoche: 2, tituloMundial: 0 },
  },
  retiradosPodaAnios: 3,            // los retirados sin relación con tu empresa se borran tras estos años

  // --- premios anuales ---
  premios: {
    popularidadGanador: 3,
    minPeleasAnio: 2,
    candidatosPorCategoria: 6,
    regresoMinSemanas: 40,
  },
};

export const CATEGORIA_PREMIO: Record<string, string> = {
  peleador: 'Peleador del Año', pelea: 'Pelea del Año', ko: 'KO del Año', sumision: 'Sumisión del Año',
  revelacion: 'Revelación del Año', regreso: 'Regreso del Año',
};
