// Parámetros del motor de pelea (simulación por rounds e intercambios).

export const MOTOR = {
  intercambiosPorRound: 6,
  // forma del día: multiplica las habilidades de cada peleador (permite sorpresas)
  formaDelDiaDesv: 0.08,

  cansancio: {
    cardio: 0.055,              // pérdida por round = cardio * (1 - cardio/12)
    corazon: 0.03,
    fatigaInicial: 250,         // la fatiga previa resta fatiga/250 de condición
    piso: 0.5,
  },

  derribo: {
    intentoBase: 0.03,
    intentoLucha: 0.26,
    intentoMax: 0.4,
    exitoK: 0.55,
    exitoMin: 0.15,
    exitoMax: 0.85,
  },

  golpeo: {
    lanzadosBase: 6,
    lanzadosExtra: 8,
    aciertoBase: 0.28,
    aciertoK: 0.045,
    aciertoMin: 0.10,
    aciertoMax: 0.65,
    danoPorGolpe: 0.6,
    danoPotencia: 0.12,
  },

  ko: {
    base: 0.022,
    mentonDefensa: 0.35,
    knockdownMult: 2.5,         // prob. de knockdown = prob. KO * esto
    seguimientoTKO: 0.4,        // tras un knockdown, prob. de que lo rematen
    pctKOvsTKO: 0.55,           // de los paros por golpes, cuántos son KO "limpios"
    cortePorRound: 0.004,       // parada médica por corte
  },

  suelo: {
    controlPorIntercambio: 45,  // segundos
    gnpGolpes: 3,
    gnpExtra: 6,
    gnpDano: 0.7,
    gnpTKO: 0.004,
    subIntentoBase: 0.10,
    subIntentoBjj: 0.22,
    subExitoK: 0.7,
    subExitoOffset: 2.4,
    subExitoMin: 0.03,
    subExitoMax: 0.5,
    subDesdeAbajo: 0.5,         // el de abajo intenta menos sumisiones
    escapeBase: 0.36,
    escapeK: 0.05,
    escapeMin: 0.10,
    escapeMax: 0.65,
    reversion: 0.3,             // al escapar, prob. de quedar arriba
  },

  jueces: { n: 3, ruido: 0.15, ruidoMin: 4, diezOcho: 55 },
  raras: { descalificacion: 0.0015, sinResultado: 0.0015 },

  momios: { k: 0.55, matchup: 0.15 },
};

export const TECNICAS_SUMISION = [
  'estrangulación mataleón', 'guillotina', 'triángulo', 'palanca al brazo', 'kimura', 'americana',
  'D\'Arce', 'estrangulación de brazo en triángulo', 'llave de talón', 'estrangulación Von Flue',
];
export const TECNICAS_KO = ['gancho de izquierda', 'derecha directa', 'rodillazo', 'patada a la cabeza', 'codazo', 'uppercut'];
