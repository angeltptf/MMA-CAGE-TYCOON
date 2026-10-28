// Economía de los eventos. Todos los números editables en un solo lugar.
// Los ingresos grandes (TV, PPV, patrocinios) llegan en la Fase 5; por ahora la
// transmisión digital es un ingreso base pequeño que se reemplaza por los contratos de TV.

export const ECONOMIA = {
  // Renta de sede = porAsiento * aforo * (1 + aforo/escala) * factor del país
  renta: { porAsiento: 3, escala: 12_000, recargoEstadio: 1.0 },
  // Popularidad requerida = max(0, (log10(aforo) - log0) * pendiente)
  sedes: { log0: 2.9, pendiente: 30 },

  // Demanda de boletos
  demanda: {
    // público potencial en la región = base * exp(k * popularidad regional)
    base: 135,
    k: 0.085,
    // el hype de la cartelera multiplica la demanda: min + hype/divisor
    hypeMin: 0.25,
    hypeDivisor: 50,
    // precio de referencia (con el que se vende el potencial) = ref * exp(k * calidad)
    precioRef: 9,
    precioK: 0.047,
    elasticidad: 1.6,           // sensibilidad al precio
    bonusLocal: 0.15,           // por cada peleador local en el estelar o coestelar (máx. 2)
    ruido: 0.06,                // variación al azar el día del evento
    climaProb: 0.08,            // estadios al aire libre
    climaPerdida: 0.15,
    fueraDeRegion: 0.55,        // demanda extra si el evento es en una región donde no soy popular
  },

  // Costos del evento
  costos: {
    produccionBase: 300,
    produccionPorPelea: 150,
    produccionPorAsiento: 1.0,
    recargoEstadio: 1.5,
    ppvRecargo: 1.4,            // un evento numerado cuesta más
    viajeBase: 4_000,
    viajePorPelea: 1_200,
    viajeOtraRegion: 2.0,       // multiplicador si es en otra región del mundo
  },

  // Ingreso por transmisión digital (provisional hasta la Fase 5)
  transmision: { base: 2500, k: 0.03, hypeMin: 0.5, hypeDivisor: 60, porPelea: 0.1, ppvMult: 1.6 },

  // Popularidad que gana o pierde la empresa
  // ganancia = (base + lleno*porAforoLleno + hype*porHype) * (1 - popRegion/amortigua), máx. `tope`
  popularidad: { base: 0.2, porAforoLleno: 0.6, porHype: 0.015, tope: 3, pierdeSiVacio: 0.3, amortigua: 100 },

  precio: { min: 1, max: 5000 },
  peleasMax: 20,
  peleasMin: 1,
  peleasInicial: 6,

  // Operación semanal = (base + porPeleador * peleadores) * exp(k * popularidad de la empresa)
  operacion: { base: 30, porPeleador: 12, k: 0.02 },

  // Bonos de la noche, como múltiplo de la bolsa de cada peleador (mínimo `min`)
  bonos: { peleador: 0.6, pelea: 0.4, actuacion: 0.3, min: 250 },

  // Torneos: el campeón se lleva este múltiplo de su bolsa (mínimo `premioMin`)
  torneo: { premioPorBolsa: 3, premioMin: 1000 },
};

// Reglas de matchmaking y descanso
export const MATCHMAKING = {
  descansoSemanas: { normal: 7, ko: 12, ganador: 6 },
  fatigaTrasPelea: 70,
  danoPorGolpeSig: 0.05,        // daño acumulado de carrera por golpe significativo recibido
  rematchSemanas: 52,           // sin repetir rival antes
  rankMaxDiferencia: 4,
  hypeEstelarTitulo: 12,
};
