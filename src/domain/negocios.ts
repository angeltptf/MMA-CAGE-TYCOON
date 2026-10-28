// Negocios: TODO ingreso externo llega por contratos. Los patrocinadores, las cadenas de TV
// y los inversionistas mandan ofertas (1 a 5 años, con pagos, objetivos y exigencias) que
// puedes aceptar, contraofertar o rechazar. Aquí vive la generación y el ciclo de vida.
import {
  CATEGORIAS, CAT_POR_ID, FONDOS, INV, NEG, TIPOS_TV, TV_POR_ID, YOUTUBE, type CategoriaPat, type TipoTVCfg,
} from '../config/negocios';
import { EMPRESA } from '../config/balance';
import { nombrePais, PAISES } from '../config/paises';
import { SEDES, type Sede } from '../config/sedes';
import { popularidadEmpresa } from './empresa';
import { dinero } from './format';
import { mover, type CatFinanza } from './finanzas';
import { agregarNoticia } from './noticias';
import { Rng, clamp } from './rng';
import { regionDePais } from './regiones';
import type {
  CondicionInv, Evento, Juego, ModalidadInv, Negocio, ObjetivoNegocio, RubroTV,
} from './types';

const mia = (j: Juego) => j.companias.find(c => c.esMia)!;
export const popGlobal = (j: Juego) => popularidadEmpresa(mia(j));
export const popEnRegion = (j: Juego, region: string): number =>
  region === 'global' ? Math.max(...Object.values(mia(j).popRegion)) : mia(j).popRegion[region] ?? 0;
export const valorRef = (pop: number) => NEG.valorBase * Math.exp(NEG.valorK * pop);

const catDe = (n: Negocio): CatFinanza => (n.tipo === 'patrocinio' ? 'patrocinios' : n.tipo === 'tv' ? 'transmision' : 'inversionistas');
const redondear = (x: number) => (x < 1000 ? Math.round(x / 10) * 10 : x < 100_000 ? Math.round(x / 100) * 100 : Math.round(x / 1000) * 1000);

export const capacidadPatrocinios = (pop: number) => NEG.capacidadPatrocinios.base + Math.floor(pop / NEG.capacidadPatrocinios.cada);
export const capacidadTV = (pop: number) => NEG.capacidadTV.base + Math.floor(pop / NEG.capacidadTV.cada);
export const activos = (j: Juego, tipo?: Negocio['tipo']) => j.negocios.filter(n => n.estado === 'activo' && (!tipo || n.tipo === tipo));
export const ofertas = (j: Juego) => j.negocios.filter(n => n.estado === 'oferta');

export function nombreRegion(r: string): string {
  const m: Record<string, string> = { global: 'Mundial', mexico: 'México', eeuu: 'EE. UU. y Canadá', latam: 'Latinoamérica', europa: 'Europa', asia: 'Asia', medioOriente: 'Medio Oriente', otro: 'Otras regiones' };
  return m[r] ?? r;
}

// ---------- Efectos (perks) de los patrocinadores activos ----------
export interface Perks { recuperacion: number; transmision: number; viaje: number; taquilla: number; operacion: number; fans: number; naming?: Negocio }

export function perks(j: Juego): Perks {
  const p: Perks = { recuperacion: 0, transmision: 1, viaje: 1, taquilla: 1, operacion: 1, fans: 1 };
  for (const n of activos(j, 'patrocinio')) {
    if (n.perk === 'recuperacion') p.recuperacion += 3;
    else if (n.perk === 'recuperacion2') p.recuperacion += 2;
    else if (n.perk === 'transmision') p.transmision *= 1.05;
    else if (n.perk === 'viaje') p.viaje *= 0.5;
    else if (n.perk === 'taquilla') p.taquilla *= 1.03;
    else if (n.perk === 'operacion') p.operacion *= 0.9;
    else if (n.perk === 'fans') p.fans *= 1.1;
    else if (n.perk === 'naming') p.naming = n;
  }
  return p;
}

// ---------- Utilidades de generación ----------
function elegirDuracion(rng: Rng, pop: number, permitidas: number[] = [1, 2, 3, 4, 5]): number {
  const fila = NEG.duraciones[pop < 20 ? 0 : pop < 45 ? 1 : 2];
  const pesos = permitidas.map(d => fila[d - 1]);
  return rng.weighted(permitidas.map((d, i) => ({ d, p: pesos[i] })), x => x.p).d;
}

function objetivosPara(j: Juego, rng: Rng, dur: number, pagoAnual: number, max: number): ObjetivoNegocio[] {
  const pop = popGlobal(j);
  const res: ObjetivoNegocio[] = [];
  const n = rng.chance(0.45) ? (rng.chance(0.35) ? Math.min(2, max) : 1) : 0;
  const plantillas: (() => ObjetivoNegocio | null)[] = [
    () => ({ id: 'eventos', tipo: 'eventos', meta: Math.min(20, Math.max(4, Math.round(3 + pop / 6))) * dur, bono: Math.round(pagoAnual * 0.25), progreso: 0, cumplido: false }),
    () => ({ id: 'popularidad', tipo: 'popularidad', meta: Math.min(96, Math.round(pop + 3 * dur + rng.int(2, 8))), bono: Math.round(pagoAnual * 0.3), progreso: 0, cumplido: false }),
    () => ({ id: 'lleno', tipo: 'lleno', meta: 2 + dur, bono: Math.round(pagoAnual * 0.15), progreso: 0, cumplido: false }),
    () => {
      if (pop < 25) return null;
      const casa = mia(j).pais;
      const pais = rng.pick(PAISES.filter(p => p.code !== casa && SEDES.some(s => s.pais === p.code)));
      return { id: 'pais', tipo: 'pais', meta: 1, pais: pais.code, bono: Math.round(pagoAnual * 0.25), progreso: 0, cumplido: false };
    },
    () => ({ id: 'titulos', tipo: 'titulos', meta: 1 + dur, bono: Math.round(pagoAnual * 0.12), progreso: 0, cumplido: false }),
    () => (pop < 30 ? null : { id: 'estrellas', tipo: 'estrellas', meta: 2, bono: Math.round(pagoAnual * 0.2), progreso: 0, cumplido: false }),
  ];
  const usadas = new Set<number>();
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 6; k++) {
      const idx = rng.int(0, plantillas.length - 1);
      if (usadas.has(idx)) continue;
      const o = plantillas[idx]();
      usadas.add(idx);
      if (o) { res.push(o); break; }
    }
  }
  return res;
}

export function descObjetivo(o: ObjetivoNegocio): string {
  switch (o.tipo) {
    case 'eventos': return `Realizar ${o.meta} eventos`;
    case 'lleno': return `${o.meta} eventos con el 80% del aforo vendido`;
    case 'pais': return `Hacer un evento en ${nombrePais(o.pais ?? '')}`;
    case 'titulos': return `${o.meta} peleas de campeonato`;
    case 'popularidad': return `Llegar a popularidad ${o.meta}`;
    case 'estrellas': return `Tener ${o.meta} peleadores de nivel Estelar o superior`;
  }
}

const base = (j: Juego, rng: Rng, tipo: Negocio['tipo'], nombre: string, rubro: string, region: string, dur: number, popMin: number): Negocio => ({
  id: j.sigNegocio++, tipo, estado: 'oferta', nombre, rubro, region, detalle: '', pagoAnual: 0, pagoUnico: 0, pagoPorEvento: 0,
  duracionAnios: dur, exclusivo: false, penalizacion: 0, objetivos: [], popMin,
  margen: rng.float(NEG.margenContra[0], NEG.margenContra[1]), contraIntentada: false,
  semanaCreada: j.semanaAbs, semanaVence: j.semanaAbs + rng.int(NEG.vigenciaOfertaSemanas[0], NEG.vigenciaOfertaSemanas[1]),
  eventosPeriodo: 0, pagoTotal: 0,
});

// ---------- Patrocinios ----------
export function ofertaPatrocinio(j: Juego, rng: Rng, forzar?: { cat: string; marca?: string; previo?: Negocio }): Negocio | null {
  const pop = popGlobal(j);
  const cats: CategoriaPat[] = forzar ? [CAT_POR_ID[forzar.cat]] : CATEGORIAS.filter(c => c.popMin <= pop);
  const libres = cats.filter(c => {
    const act = j.negocios.filter(n => n.tipo === 'patrocinio' && n.rubro === c.id && (n.estado === 'activo'));
    const pend = j.negocios.some(n => n.tipo === 'patrocinio' && n.rubro === c.id && n.estado === 'oferta' && !forzar);
    if (pend) return false;
    if (act.some(n => n.exclusivo)) return false;
    return act.length < NEG.maxNoExclusivosPorCategoria;
  });
  if (!libres.length) return null;
  const cat = forzar ? libres[0] : rng.weighted(libres, c => 1 + c.mult * 0.3);
  if (!cat) return null;
  const ocupadas = new Set(j.negocios.filter(n => n.tipo === 'patrocinio' && (n.estado === 'activo' || n.estado === 'oferta')).map(n => n.nombre));
  const tierProb = pop >= 55 ? [0.1, 0.4, 0.5] : pop >= 28 ? [0.3, 0.5, 0.2] : [0.8, 0.2, 0];
  let tier = rng.weighted([0, 1, 2], t => tierProb[t]);
  let nombre = forzar?.marca ?? '';
  if (!nombre) {
    for (let k = 0; k < 6 && !nombre; k++) {
      const cand = cat.marcas[tier].filter(x => !ocupadas.has(x));
      if (cand.length) nombre = rng.pick(cand);
      else tier = (tier + 1) % 3;
    }
  }
  if (!nombre) return null;
  const activosCat = j.negocios.filter(n => n.tipo === 'patrocinio' && n.rubro === cat.id && n.estado === 'activo');
  const exclusivo = activosCat.length === 0 && rng.chance(0.55);
  const dur = cat.porEvento ? elegirDuracion(rng, pop, [1, 2, 3]) : elegirDuracion(rng, pop);
  const n = base(j, rng, 'patrocinio', nombre, cat.id, 'global', dur, cat.popMin);
  const v = valorRef(pop) * cat.mult * (exclusivo ? NEG.exclusivoMult : NEG.noExclusivoMult) * (1 + NEG.duracionExtraPago * (dur - 1)) * rng.float(0.85, 1.2);
  n.exclusivo = exclusivo;
  n.perk = cat.perk;
  if (cat.porEvento) n.pagoPorEvento = redondear(v * 0.3);
  else n.pagoAnual = redondear(v);
  n.pagoUnico = redondear((n.pagoAnual || n.pagoPorEvento * 6) * rng.float(NEG.bonoFirmaPct[0], NEG.bonoFirmaPct[1]));
  if (cat.perk === 'cripto') n.factorCripto = 1;
  n.objetivos = objetivosPara(j, rng, dur, n.pagoAnual || n.pagoPorEvento * NEG.eventosBase, 2);
  n.detalle = `${cat.nombre}${exclusivo ? ' · exclusivo' : ' · no exclusivo'}. ${cat.perkTexto ?? ''}`.trim();
  if (forzar?.previo) {
    n.renovacion = true;
    n.pagoAnual = Math.max(n.pagoAnual, Math.round(forzar.previo.pagoAnual * 0.9));
    n.detalle = `Renovación. ${n.detalle}`;
  }
  return n;
}

// ---------- Televisión ----------
function regionesDisponibles(j: Juego, cfg: TipoTVCfg): string[] {
  if (cfg.global) return popGlobal(j) >= cfg.popMin ? ['global'] : [];
  return EMPRESA.regiones.filter(r => (mia(j).popRegion[r] ?? 0) >= cfg.popMin);
}

function conflictoTV(j: Juego, cfg: TipoTVCfg, region: string, exclusivo: boolean, ignorar?: number): boolean {
  for (const n of j.negocios) {
    if (n.tipo !== 'tv' || n.rubro !== cfg.id || n.id === ignorar) continue;
    if (n.estado !== 'activo') continue;
    const solapa = n.region === region || n.region === 'global' || region === 'global';
    if (solapa && (n.exclusivo || exclusivo)) return true;
    if (cfg.id === 'ppv' || cfg.id === 'documental') return true;
  }
  return false;
}

export function ofertaTV(j: Juego, rng: Rng, forzar?: { rubro: RubroTV; region?: string; nombre?: string; previo?: Negocio }): Negocio | null {
  const pop = popGlobal(j);
  const opciones: { cfg: TipoTVCfg; region: string }[] = [];
  for (const cfg of forzar ? [TV_POR_ID[forzar.rubro]] : TIPOS_TV) {
    for (const region of forzar?.region ? [forzar.region] : regionesDisponibles(j, cfg)) {
      const pend = j.negocios.some(n => n.tipo === 'tv' && n.rubro === cfg.id && n.region === region && n.estado === 'oferta');
      if (pend && !forzar) continue;
      opciones.push({ cfg, region });
    }
  }
  if (!opciones.length) return null;
  const { cfg, region } = rng.weighted(opciones, o => (o.cfg.id === 'streaming_global' || o.cfg.id === 'cable' ? 1.5 : 1));
  const popEff = region === 'global' ? pop : popEnRegion(j, region);
  const exclusivo = cfg.exclusivoPosible && rng.chance(0.4);
  if (conflictoTV(j, cfg, region, exclusivo)) return null;
  const dur = elegirDuracion(rng, popEff, cfg.duraciones);
  const tier = popEff >= 55 ? 2 : popEff >= 28 ? 1 : 0;
  const ocupadas = new Set(j.negocios.filter(n => n.tipo === 'tv' && (n.estado === 'activo' || n.estado === 'oferta')).map(n => n.nombre));
  let nombre = forzar?.nombre ?? '';
  if (!nombre) {
    const cand = [...cfg.cadenas[tier], ...cfg.cadenas[Math.max(0, tier - 1)]].filter(x => !ocupadas.has(x));
    if (!cand.length) return null;
    nombre = rng.pick(cand);
  }
  const n = base(j, rng, 'tv', nombre, cfg.id, region, dur, cfg.popMin);
  n.exclusivo = exclusivo;
  const v = valorRef(popEff) * cfg.mult * (exclusivo ? NEG.exclusivoMult : 1) * (1 + NEG.duracionExtraPago * (dur - 1)) * rng.float(0.85, 1.2);
  if (cfg.estructura === 'anual') { n.pagoAnual = redondear(v); n.eventosMinAnio = Math.max(2, Math.round(cfg.eventosMin * rng.float(0.6, 0.85))); }
  else if (cfg.estructura === 'evento') n.pagoPorEvento = redondear(v * 0.35);
  else if (cfg.estructura === 'ppv') { n.pagoPorEvento = redondear(v * 0.5); n.ppvPct = Math.round(rng.float(0.3, 0.5) * 100) / 100; n.eventosMinAnio = cfg.eventosMin; }
  else if (cfg.estructura === 'unico') { n.pagoUnico = redondear(v * 1.5); n.eventosMinAnio = 6; }
  if (cfg.estructura !== 'unico') n.pagoUnico = redondear((n.pagoAnual || n.pagoPorEvento * 6) * rng.float(NEG.bonoFirmaPct[0], NEG.bonoFirmaPct[1]) * 0.6);
  n.objetivos = cfg.estructura === 'unico' ? [] : objetivosPara(j, rng, dur, n.pagoAnual || n.pagoPorEvento * NEG.eventosBase, 1);
  n.perk = cfg.id;
  n.detalle = `${cfg.descripcion} ${cfg.perkTexto}.`;
  if (cfg.id === 'documental') n.detalle = `Serie "Detrás de la jaula": 8 episodios sobre tus peleadores y tu promotora. ${cfg.perkTexto}.`;
  if (forzar?.previo) { n.renovacion = true; n.detalle = `Renovación. ${n.detalle}`; }
  return n;
}

// ---------- Inversionistas ----------
export function ofertaInversion(j: Juego, rng: Rng): Negocio | null {
  const pop = popGlobal(j);
  if (pop < NEG.popInvMin) return null;
  if (j.negocios.some(n => n.tipo === 'inversion' && n.estado === 'oferta')) return null; // una propuesta de inversionistas a la vez
  const modalidad = rng.weighted(Object.keys(INV.pesoModalidad), k => INV.pesoModalidad[k]) as ModalidadInv;
  const fondo = rng.pick(FONDOS.filter(f => modalidad === 'capital' || f.pais !== mia(j).pais || rng.chance(0.2)));
  const dur = modalidad === 'unico' ? 1 : modalidad === 'paquete' ? 1 : modalidad === 'residencia' ? rng.int(2, 3) : modalidad === 'capital' ? rng.int(INV.capitalAnios[0], INV.capitalAnios[1]) : 2;
  const n = base(j, rng, 'inversion', fondo.nombre, modalidad, regionDePais(fondo.pais), dur, NEG.popInvMin);
  const v = valorRef(pop) * INV.mult[modalidad] * rng.float(0.85, 1.25);
  const eventos = modalidad === 'unico' ? 1 : modalidad === 'paquete' ? rng.int(2, 4) : modalidad === 'residencia' ? 2 * dur : modalidad === 'subsidio' ? rng.int(3, 6) : 0;
  const condiciones: CondicionInv[] = [];
  if (modalidad !== 'capital' && modalidad !== 'subsidio') {
    if (rng.chance(0.55)) condiciones.push({ tipo: 'titulo', meta: 1 });
    if (pop >= 30 && rng.chance(0.5)) condiciones.push({ tipo: 'estrellas', meta: rng.int(1, 3) });
    if (rng.chance(0.5)) condiciones.push({ tipo: 'local', meta: 1 });
  }
  n.inv = {
    modalidad, pais: fondo.pais, eventos, eventosHechos: 0, condiciones, pctUtilidades: 0,
    semanaObjetivo: j.semanaAbs + rng.int(INV.semanasHastaEvento[0], INV.semanasHastaEvento[1]), eventoIds: [],
  };
  if (modalidad === 'capital') { n.pagoUnico = redondear(v); n.inv.pctUtilidades = Math.round(rng.float(INV.capitalPct[0], INV.capitalPct[1]) * 100) / 100; }
  else n.pagoPorEvento = redondear(v * (modalidad === 'unico' ? 1 : modalidad === 'paquete' ? 0.8 : modalidad === 'residencia' ? 0.9 : 0.5));
  n.semanaVence = j.semanaAbs + rng.int(5, 10);
  n.penalizacion = 0;
  const txt: Record<string, string> = {
    unico: `Quieren UN evento tuyo en ${fondo.ciudad}.`,
    paquete: `Proponen un paquete de ${eventos} eventos en ${fondo.ciudad}, uno cada ~${INV.espaciadoPaquete} semanas.`,
    residencia: `Residencia: 2 eventos al año durante ${dur} años en ${fondo.ciudad}.`,
    capital: `Inyectan capital a cambio del ${Math.round(n.inv.pctUtilidades * 100)}% de las utilidades de tus eventos durante ${dur} años.`,
    subsidio: `Subsidio: pagan por cada uno de hasta ${eventos} eventos que hagas en ${nombrePais(fondo.pais)}, cuando tú decidas.`,
  };
  n.detalle = `${fondo.presentacion} ${txt[modalidad]}`;
  return n;
}

export function sedeInversion(j: Juego, pais: string): Sede | undefined {
  const pop = popGlobal(j);
  const maxAforo = 600 * Math.exp(0.06 * pop);
  const lista = SEDES.filter(s => s.pais === pais).sort((a, b) => b.aforo - a.aforo);
  if (!lista.length) return undefined;
  return lista.find(s => s.aforo <= maxAforo) ?? lista[lista.length - 1];
}

// Crea en el calendario los eventos pactados con un inversionista
function crearEventosInversion(j: Juego, n: Negocio): void {
  const inv = n.inv!;
  const total = inv.modalidad === 'unico' ? 1 : inv.modalidad === 'paquete' ? inv.eventos : inv.modalidad === 'residencia' ? inv.eventos : 0;
  if (!total) return;
  const sede = sedeInversion(j, inv.pais);
  if (!sede) return;
  const fondo = FONDOS.find(f => f.pais === inv.pais);
  const espacio = inv.modalidad === 'residencia' ? INV.espaciadoResidencia : INV.espaciadoPaquete;
  let sem = inv.semanaObjetivo;
  for (let i = 0; i < total; i++) {
    while (j.eventos.some(e => e.semana === sem && e.estado !== 'cancelado')) sem++;
    const tipo = inv.modalidad === 'paquete' ? 'noche' : 'ppv';
    const numero = tipo === 'ppv' ? ++j.contadores.ppv : ++j.contadores.noche;
    const e: Evento = {
      id: j.sigEvento++, tipo, numero, semana: sem, nombrePropio: true, nombre: `${mia(j).siglas} ${fondo?.ciudad ?? nombrePais(inv.pais)} ${inv.modalidad === 'residencia' ? 'Residency' : 'Night'} ${i + 1}`,
      sedeId: sede.id, nPeleas: 6, precio: 20, estado: 'borrador', confirmado: false, cartelera: [], inversionistaId: n.id,
    };
    for (let k = 0; k < 6; k++) e.cartelera.push({ id: j.sigPelea++, genero: 'M', clase: j.divisiones.find(d => d.companiaId === j.miId)?.clase ?? 'ligero', aId: null, bId: null, titulo: false, interino: false, rounds: 3, hype: 0 });
    j.eventos.push(e);
    inv.eventoIds.push(e.id);
    sem += espacio;
  }
}

// ---------- Aceptar, contraofertar, rechazar, romper ----------
const buscar = (j: Juego, id: number) => j.negocios.find(n => n.id === id);

export function resumenPago(n: Negocio): string {
  const partes: string[] = [];
  if (n.pagoAnual) partes.push(`${dinero(n.pagoAnual)} al año`);
  if (n.pagoPorEvento) partes.push(`${dinero(n.pagoPorEvento)} por evento${n.tipo === 'inversion' ? '' : ''}`);
  if (n.pagoUnico) partes.push(`${dinero(n.pagoUnico)} al firmar`);
  return partes.join(' + ') || 'Sin pago fijo';
}

export function aceptarNegocio(j: Juego, id: number): string | null {
  const n = buscar(j, id);
  if (!n || n.estado !== 'oferta') return 'La oferta ya no está vigente.';
  if (n.semanaVence < j.semanaAbs) { n.estado = 'expirado'; return 'La oferta venció.'; }
  if (n.tipo === 'patrocinio') {
    if (activos(j, 'patrocinio').length >= capacidadPatrocinios(popGlobal(j))) return `Tu empresa solo puede manejar ${capacidadPatrocinios(popGlobal(j))} patrocinios a la vez por ahora. Crece en popularidad para firmar más.`;
    const act = j.negocios.filter(x => x.tipo === 'patrocinio' && x.rubro === n.rubro && x.estado === 'activo');
    if (act.some(x => x.exclusivo)) return 'Ya tienes un patrocinador exclusivo en esta categoría.';
    if (n.exclusivo && act.length) return 'No puedes firmar un exclusivo mientras tengas otro patrocinador en la categoría.';
    if (act.length >= NEG.maxNoExclusivosPorCategoria) return 'Ya tienes el máximo de patrocinadores en esta categoría.';
  } else if (n.tipo === 'tv') {
    if (activos(j, 'tv').length >= capacidadTV(popGlobal(j))) return `Tu empresa solo puede manejar ${capacidadTV(popGlobal(j))} contratos de transmisión a la vez por ahora. Crece en popularidad para firmar más.`;
    const cfg = TV_POR_ID[n.rubro];
    if (conflictoTV(j, cfg, n.region, n.exclusivo, n.id)) return 'Choca con otro contrato de televisión (exclusividad o duplicado).';
  }
  n.estado = 'activo';
  n.semanaInicio = j.semanaAbs;
  n.semanaFin = j.semanaAbs + 52 * n.duracionAnios;
  n.eventosPeriodo = 0;
  if (n.pagoUnico) { mover(j, catDe(n), n.pagoUnico); n.pagoTotal += n.pagoUnico; }
  if (n.tipo === 'inversion') crearEventosInversion(j, n);
  if (n.rubro === 'documental') mia(j).popRegion = Object.fromEntries(Object.entries(mia(j).popRegion).map(([k, v]) => [k, clamp(v + 1.5, 0, 100)]));
  // las ofertas que chocan con este contrato se retiran
  for (const o of j.negocios) {
    if (o.estado !== 'oferta' || o.id === n.id) continue;
    if (o.tipo === 'patrocinio' && o.rubro === n.rubro && (n.exclusivo || o.exclusivo)) o.estado = 'expirado';
    if (o.tipo === 'tv' && o.rubro === n.rubro && (n.exclusivo || o.exclusivo) && (o.region === n.region || o.region === 'global' || n.region === 'global')) o.estado = 'expirado';
  }
  agregarNoticia(j, {
    categoria: 'negocios', negocioId: n.id,
    titulo: `Contrato firmado con ${n.nombre}`,
    cuerpo: `${resumenPago(n)} · ${n.duracionAnios} año${n.duracionAnios > 1 ? 's' : ''}${n.exclusivo ? ' · exclusivo' : ''}.`,
  });
  return null;
}

export function rechazarNegocio(j: Juego, id: number): string | null {
  const n = buscar(j, id);
  if (!n || n.estado !== 'oferta') return 'La oferta ya no está vigente.';
  n.estado = 'rechazado';
  return null;
}

export function interesDe(n: Negocio): 'alto' | 'medio' | 'bajo' {
  if (n.contraIntentada) return 'bajo';
  return n.margen > 0.22 ? 'alto' : n.margen > 0.12 ? 'medio' : 'bajo';
}

// Pides más dinero (pct = +10% => 0.10). Si te pasas de su margen se pueden retirar.
export function contraofertarNegocio(j: Juego, id: number, pct: number, rng: Rng): { ok: boolean; mensaje: string } {
  const n = buscar(j, id);
  if (!n || n.estado !== 'oferta') return { ok: false, mensaje: 'La oferta ya no está vigente.' };
  if (n.contraIntentada) return { ok: false, mensaje: 'Ya negociaste esta oferta: solo puedes aceptarla o rechazarla.' };
  n.contraIntentada = true;
  const mejora = () => {
    n.pagoAnual = redondear(n.pagoAnual * (1 + pct));
    n.pagoPorEvento = redondear(n.pagoPorEvento * (1 + pct));
    n.pagoUnico = redondear(n.pagoUnico * (1 + pct));
    n.semanaVence = Math.max(n.semanaVence, j.semanaAbs + 2);
  };
  if (pct <= n.margen) { mejora(); return { ok: true, mensaje: `${n.nombre} aceptó subir la oferta (${resumenPago(n)}). Fírmala cuando quieras.` }; }
  if (pct <= n.margen + 0.1 && rng.chance(NEG.contraSegundoChance)) { mejora(); return { ok: true, mensaje: `${n.nombre} lo pensó y aceptó: ${resumenPago(n)}.` }; }
  if (rng.chance(0.7)) { n.estado = 'rechazado'; return { ok: false, mensaje: `${n.nombre} se retiró: pedías demasiado.` }; }
  return { ok: false, mensaje: `${n.nombre} mantiene su oferta original. Puedes aceptarla o rechazarla.` };
}

export function costoRomper(j: Juego, n: Negocio): number {
  const restan = Math.max(0, ((n.semanaFin ?? j.semanaAbs) - j.semanaAbs) / 52);
  const pct = n.tipo === 'patrocinio' ? NEG.rompePatrocinioPct : n.tipo === 'tv' ? NEG.rompeTVPct : NEG.rompeInvPct;
  let valor = n.pagoAnual * restan;
  if (n.pagoPorEvento) valor += n.pagoPorEvento * NEG.eventosBase * restan * 0.5;
  if (n.tipo === 'inversion' && n.inv) valor += n.pagoPorEvento * Math.max(0, n.inv.eventos - n.inv.eventosHechos);
  if (n.inv?.modalidad === 'capital') valor = n.pagoUnico * restan * 0.5;
  return Math.round(valor * pct);
}

export function romperNegocio(j: Juego, id: number): string | null {
  const n = buscar(j, id);
  if (!n || n.estado !== 'activo') return 'Ese contrato no está activo.';
  const costo = costoRomper(j, n);
  if (mia(j).dinero < costo) return `No te alcanza para la penalización (${dinero(costo)}).`;
  mover(j, 'indemnizaciones', -costo);
  n.estado = 'roto';
  mia(j).reputacion = clamp(mia(j).reputacion - NEG.reputacionRomper, 0, 100);
  if (n.inv) j.eventos = j.eventos.filter(e => !(e.inversionistaId === n.id && e.estado === 'borrador'));
  agregarNoticia(j, { categoria: 'negocios', titulo: `Rompiste el contrato con ${n.nombre}`, cuerpo: `Penalización: ${dinero(costo)}. Tu reputación bajó ${NEG.reputacionRomper} puntos.` });
  return null;
}

// ---------- Ciclo semanal ----------
function nuevaOferta(j: Juego, rng: Rng, tipo: Negocio['tipo']): Negocio | null {
  if (ofertas(j).length >= NEG.maxOfertasPendientes) return null;
  const n = tipo === 'patrocinio' ? ofertaPatrocinio(j, rng) : tipo === 'tv' ? ofertaTV(j, rng) : ofertaInversion(j, rng);
  if (!n) return null;
  j.negocios.push(n);
  agregarNoticia(j, {
    categoria: 'negocios', negocioId: n.id,
    titulo: tipo === 'inversion' ? `Inversionista: ${n.nombre}` : `${n.nombre} te manda una oferta`,
    cuerpo: `${resumenPago(n)} · ${n.duracionAnios} año${n.duracionAnios > 1 ? 's' : ''}. ${n.detalle}`.slice(0, 240),
  });
  return n;
}

// El jugador pide propuestas por su cuenta (con enfriamiento)
export function pedirPropuestas(j: Juego, rng: Rng): { n: number; error?: string } {
  if (j.cooldownPropuestas > j.semanaAbs) return { n: 0, error: `Tu agente necesita ${j.cooldownPropuestas - j.semanaAbs} semanas más para conseguir nuevas propuestas.` };
  const cuantas = rng.int(NEG.propuestas.minOfertas, NEG.propuestas.maxOfertas);
  let n = 0;
  for (let i = 0; i < cuantas * 2 && n < cuantas; i++) {
    const tipo = rng.weighted<Negocio['tipo']>(['patrocinio', 'tv', 'inversion'], t => (t === 'patrocinio' ? 5 : t === 'tv' ? 4 : 1));
    if (nuevaOferta(j, rng, tipo)) n++;
  }
  j.cooldownPropuestas = j.semanaAbs + NEG.propuestas.cooldownSemanas;
  return { n, error: n ? undefined : 'Nadie quiso hacer propuestas por ahora: sube tu popularidad y vuelve a intentarlo.' };
}

function renovar(j: Juego, rng: Rng, n: Negocio): void {
  if (!rng.chance(NEG.renovacionProb)) return;
  let o: Negocio | null = null;
  if (n.tipo === 'patrocinio') o = ofertaPatrocinio(j, rng, { cat: n.rubro, marca: n.nombre, previo: n });
  else if (n.tipo === 'tv' && n.rubro !== 'documental') o = ofertaTV(j, rng, { rubro: n.rubro as RubroTV, region: n.region, nombre: n.nombre, previo: n });
  if (!o) return;
  o.semanaVence = j.semanaAbs + 8;
  j.negocios.push(o);
  agregarNoticia(j, { categoria: 'negocios', negocioId: o.id, titulo: `${o.nombre} quiere renovar`, cuerpo: `${resumenPago(o)} · ${o.duracionAnios} año${o.duracionAnios > 1 ? 's' : ''}. Si tu popularidad subió, ofrecen más.` });
}

export function procesarNegociosSemana(j: Juego, rng: Rng): void {
  const sem = j.semanaAbs;
  const pop = popGlobal(j);
  const yt = j.youtube;

  // 1) ofertas vencidas
  for (const n of j.negocios) if (n.estado === 'oferta' && n.semanaVence < sem) n.estado = 'expirado';
  // limpieza del historial viejo
  if (j.negocios.length > 150) j.negocios = j.negocios.filter(n => n.estado === 'activo' || n.estado === 'oferta' || sem - (n.semanaFin ?? n.semanaVence) < 156);

  for (const n of j.negocios) {
    if (n.estado !== 'activo') continue;
    // 2) pago semanal
    if (n.pagoAnual > 0) {
      const monto = (n.pagoAnual / 52) * (n.factorCripto ?? 1);
      mover(j, catDe(n), monto);
      n.pagoTotal += monto;
    }
    const inicio = n.semanaInicio ?? sem;
    const trans = sem - inicio;
    // cripto: se mueve con el mercado y puede quebrar
    if (n.perk === 'cripto') {
      if (trans > 0 && trans % 26 === 0) n.factorCripto = clamp((n.factorCripto ?? 1) * rng.float(0.55, 1.5), 0.3, 3);
      if (rng.chance(0.03 / 52)) {
        n.estado = 'roto';
        agregarNoticia(j, { categoria: 'negocios', titulo: `¡${n.nombre} quebró!`, cuerpo: 'La empresa cripto se declaró en bancarrota y se acabó el patrocinio.' });
        continue;
      }
    }
    // 3) objetivos que se miden semana a semana
    for (const o of n.objetivos) {
      if (o.cumplido) continue;
      if (o.tipo === 'popularidad') o.progreso = Math.round(pop);
      if (o.tipo === 'estrellas') o.progreso = j.peleadores.filter(p => p.companiaId === j.miId && !p.retirado && p.popularidad >= INV.estelarPopMin).length;
      if (o.progreso >= o.meta) cumplir(j, n, o);
    }
    // 4) aniversario: mínimo de eventos al año
    if (trans > 0 && trans % 52 === 0 && n.eventosMinAnio) {
      const faltan = Math.max(0, n.eventosMinAnio - n.eventosPeriodo);
      if (faltan > 0) {
        const multa = Math.round(((n.pagoAnual || n.pagoPorEvento * NEG.eventosBase) * 0.5) * (faltan / n.eventosMinAnio));
        mover(j, 'indemnizaciones', -multa);
        mia(j).reputacion = clamp(mia(j).reputacion - NEG.reputacionIncumplir, 0, 100);
        agregarNoticia(j, { categoria: 'negocios', titulo: `${n.nombre}: no cumpliste el mínimo de eventos`, cuerpo: `Hiciste ${n.eventosPeriodo} de ${n.eventosMinAnio}. Multa: ${dinero(multa)}.` });
      }
    }
    if (trans > 0 && trans % 52 === 0) n.eventosPeriodo = 0;
    // 5) fin del contrato
    if (n.semanaFin != null && sem >= n.semanaFin) terminar(j, rng, n);
  }

  // 6) nuevas ofertas
  const sub = 1 + Math.log10(Math.max(10, yt.subs)) / YOUTUBE.ofertasPorSub;
  if (rng.chance((NEG.probOfertaPatrocinioBase + pop / 400) * sub)) nuevaOferta(j, rng, 'patrocinio');
  if (rng.chance((NEG.probOfertaTVBase + pop / 800) * sub)) nuevaOferta(j, rng, 'tv');
  if (pop >= NEG.popInvMin && rng.chance(NEG.probOfertaInvBase + pop / 3000)) nuevaOferta(j, rng, 'inversion');

  // 7) el canal crece solo un poco cada semana
  yt.subs = Math.round(yt.subs * (1 + YOUTUBE.crecimientoSemana));
}

function cumplir(j: Juego, n: Negocio, o: ObjetivoNegocio): void {
  o.cumplido = true;
  mover(j, catDe(n), o.bono);
  n.pagoTotal += o.bono;
  agregarNoticia(j, { categoria: 'negocios', titulo: `Objetivo cumplido con ${n.nombre}`, cuerpo: `${descObjetivo(o)}. Bono: ${dinero(o.bono)}.` });
}

function terminar(j: Juego, rng: Rng, n: Negocio): void {
  n.estado = 'terminado';
  agregarNoticia(j, { categoria: 'negocios', titulo: `Terminó tu contrato con ${n.nombre}`, cuerpo: `Cobraste ${dinero(n.pagoTotal)} en total.` });
  if (n.rubro === 'documental') {
    mia(j).popRegion = Object.fromEntries(Object.entries(mia(j).popRegion).map(([k, v]) => [k, clamp(v + 2.5, 0, 100)]));
    agregarNoticia(j, { categoria: 'negocios', titulo: 'Se estrena tu serie documental', cuerpo: 'Millones de personas conocen tu historia: tu popularidad sube en todo el mundo.' });
  }
  if (n.tipo !== 'inversion') renovar(j, rng, n);
}

// ---------- Integración con los eventos ----------
export interface EstimacionNegocios {
  tv: number; youtube: number; ppv: number; patrocinios: number; inversion: number; total: number;
  vistas: number; compradores: number; precioPPV: number; precioPPVref: number; ppvPct: number | null; tienePPV: boolean;
}

export function precioPPVReferencia(hype: number): number { return Math.round(15 + hype * 0.45); }

export function estimarNegocios(j: Juego, e: Evento, hype: number): EstimacionNegocios {
  const pk = perks(j);
  const m = 0.6 + hype / 100;
  let tv = 0;
  let ppv = 0;
  let patrocinios = 0;
  let inversion = 0;
  let compradores = 0;
  let ppvPct: number | null = null;
  const precioRef = precioPPVReferencia(hype);
  const precio = e.precioPPV ?? precioRef;
  const esPPV = e.tipo === 'ppv';
  for (const n of activos(j)) {
    if (n.tipo === 'tv') {
      if (n.rubro === 'ppv') {
        if (!esPPV) continue;
        tv += n.pagoPorEvento;
        ppvPct = n.ppvPct ?? 0.4;
        compradores = Math.round(clamp(mia(j).fans * 0.02 * Math.pow(Math.max(hype, 1) / 50, 1.5) * Math.pow(Math.max(precio, 1) / precioRef, -1.4), 0, mia(j).fans * 0.25));
        ppv = Math.round(compradores * precio * (1 - ppvPct));
      } else if (n.pagoPorEvento > 0) tv += n.pagoPorEvento * m;
    } else if (n.tipo === 'patrocinio' && n.pagoPorEvento > 0) patrocinios += n.pagoPorEvento;
    else if (n.tipo === 'inversion' && n.inv) {
      if (e.inversionistaId === n.id) inversion += n.pagoPorEvento;
      else if (n.inv.modalidad === 'subsidio' && n.inv.eventosHechos < n.inv.eventos) {
        const sede = SEDES.find(s => s.id === e.sedeId);
        if (sede && sede.pais === n.inv.pais) inversion += n.pagoPorEvento;
      }
    }
  }
  const vistas = Math.round(j.youtube.subs * (YOUTUBE.vistasPorSub[0] + hype / 80 * (YOUTUBE.vistasPorSub[1] - YOUTUBE.vistasPorSub[0]) / 1.25));
  const youtube = j.youtube.subs >= YOUTUBE.monetizaDesdeSubs ? Math.round(vistas / 1000 * YOUTUBE.cpm) : 0;
  tv = Math.round(tv * pk.transmision);
  const ytv = Math.round(youtube * pk.transmision);
  ppv = Math.round(ppv * pk.transmision);
  const total = tv + ytv + ppv + Math.round(patrocinios) + Math.round(inversion);
  return {
    tv, youtube: ytv, ppv, patrocinios: Math.round(patrocinios), inversion: Math.round(inversion), total, vistas, compradores, precioPPV: precio,
    precioPPVref: precioRef, ppvPct, tienePPV: esPPV && activos(j, 'tv').some(n => n.rubro === 'ppv'),
  };
}

export interface LiquidacionEvento { transmision: number; ppv: number; patrocinios: number; inversion: number; total: number; vistas: number; compradores: number; viral?: string; notas: string[] }

// Cobra todo lo que el evento genera por contratos y actualiza objetivos, canal y popularidad
export function liquidarEvento(j: Juego, e: Evento, hype: number, vendidos: number, rng: Rng): LiquidacionEvento {
  const est = estimarNegocios(j, e, hype);
  const sede = SEDES.find(s => s.id === e.sedeId);
  const notas: string[] = [];
  const yt = j.youtube;
  const pk = perks(j);
  const llenado = sede && sede.aforo ? vendidos / sede.aforo : 0;
  const hayFinal = e.cartelera.some(b => b.resultado && ['KO', 'TKO', 'SUB'].includes(b.resultado.metodo));

  // canal de YouTube: vistas, ingresos, suscriptores y un posible clip viral
  let vistas = est.vistas;
  let viral: string | undefined;
  const viralProb = YOUTUBE.viralProb * (hayFinal ? 1 : 0.3) * (activos(j, 'tv').some(n => n.rubro === 'redes') ? YOUTUBE.viralMultRedes : 1);
  if (rng.chance(viralProb)) {
    const mult = rng.float(YOUTUBE.viralVistas[0], YOUTUBE.viralVistas[1]);
    const extra = Math.round(yt.subs * mult);
    vistas += extra;
    yt.virales++;
    viral = `¡Un clip de tu evento se hizo viral! +${extra.toLocaleString('en-US')} vistas.`;
    notas.push(viral);
  }
  const ytIngreso = yt.subs >= YOUTUBE.monetizaDesdeSubs ? Math.round(vistas / 1000 * YOUTUBE.cpm * pk.transmision) : 0;
  yt.vistas += vistas;
  yt.ingresos += ytIngreso;
  yt.subs = Math.round(yt.subs + vistas * YOUTUBE.subsPorVista + hype * YOUTUBE.subsPorHype);

  // popularidad y fans por alcance (YouTube + televisión)
  const reg = sede ? regionDePais(sede.pais) : mia(j).pais;
  const pr = { ...mia(j).popRegion };
  const ganYt = Math.min(YOUTUBE.popularidadMax, YOUTUBE.popularidadPorLog * Math.log10(1 + vistas / 200));
  pr[reg] = clamp((pr[reg] ?? 0) + ganYt, 0, 100);
  let fans = vistas * YOUTUBE.fansPorVista;
  for (const n of activos(j, 'tv')) {
    const cfg = TV_POR_ID[n.rubro];
    if (!cfg || !cfg.alcance) continue;
    const regiones = n.region === 'global' ? EMPRESA.regiones as readonly string[] : [n.region];
    for (const r of regiones) pr[r] = clamp((pr[r] ?? 0) + cfg.alcance * (n.region === 'global' ? 0.35 : 1) * (0.5 + hype / 100), 0, 100);
    fans += cfg.alcance * 4000 * (0.5 + hype / 100);
  }
  mia(j).popRegion = pr;
  mia(j).fans += Math.round(fans * pk.fans);

  // dinero por contratos
  if (est.tv + est.youtube > 0 || ytIngreso > 0) mover(j, 'transmision', est.tv + ytIngreso);
  if (est.ppv) mover(j, 'ppv', est.ppv);
  if (est.patrocinios) mover(j, 'patrocinios', est.patrocinios);

  // contratos: eventos del periodo y objetivos
  for (const n of activos(j)) {
    n.eventosPeriodo++;
    if (n.tipo === 'tv' && n.rubro === 'ppv' && e.tipo !== 'ppv') n.eventosPeriodo--;
    for (const o of n.objetivos) {
      if (o.cumplido) continue;
      if (o.tipo === 'eventos') o.progreso++;
      if (o.tipo === 'lleno' && llenado >= 0.8) o.progreso++;
      if (o.tipo === 'pais' && sede && sede.pais === o.pais) o.progreso++;
      if (o.tipo === 'titulos') o.progreso += e.cartelera.filter(b => b.titulo).length;
      if (o.progreso >= o.meta) cumplir(j, n, o);
    }
  }

  // naming: el evento se anuncia "presentado por" la marca
  if (pk.naming) { e.patrocinadorNaming = pk.naming.nombre; if (!e.nombre.includes('presentado por')) e.nombre = `${e.nombre} presentado por ${pk.naming.nombre}`; }

  // inversionistas
  let inversion = 0;
  for (const n of activos(j, 'inversion')) {
    const inv = n.inv!;
    const propio = e.inversionistaId === n.id;
    const subsidio = inv.modalidad === 'subsidio' && sede && sede.pais === inv.pais && inv.eventosHechos < inv.eventos;
    if (!propio && !subsidio) continue;
    let paga = n.pagoPorEvento;
    if (propio) {
      const fallas: string[] = [];
      for (const c of inv.condiciones) {
        if (c.tipo === 'titulo' && !e.cartelera.some(b => b.titulo)) fallas.push('no hubo pelea de campeonato');
        if (c.tipo === 'estrellas') {
          const ids = e.cartelera.flatMap(b => [b.aId, b.bId]);
          const estr = j.peleadores.filter(p => ids.includes(p.id) && p.popularidad >= INV.estelarPopMin).length;
          if (estr < c.meta) fallas.push(`faltaron peleadores estelares (${estr}/${c.meta})`);
        }
        if (c.tipo === 'local') {
          const ids = e.cartelera.flatMap(b => [b.aId, b.bId]);
          if (!j.peleadores.some(p => ids.includes(p.id) && p.pais === inv.pais)) fallas.push(`no peleó nadie de ${nombrePais(inv.pais)}`);
        }
      }
      if (fallas.length) {
        paga = Math.round(paga * INV.incumplirPago);
        mia(j).reputacion = clamp(mia(j).reputacion - INV.incumplirReputacion, 0, 100);
        notas.push(`${n.nombre} pagó solo el ${INV.incumplirPago * 100}%: ${fallas.join('; ')}.`);
      }
    }
    inversion += paga;
    mover(j, 'inversionistas', paga);
    n.pagoTotal += paga;
    inv.eventosHechos++;
    if (inv.modalidad !== 'capital' && inv.modalidad !== 'subsidio' && inv.eventosHechos >= inv.eventos) {
      n.estado = 'terminado';
      agregarNoticia(j, { categoria: 'negocios', titulo: `Completaste el acuerdo con ${n.nombre}`, cuerpo: `Cobraste ${dinero(n.pagoTotal)} en total.` });
    } else if (subsidio && inv.eventosHechos >= inv.eventos) n.estado = 'terminado';
  }
  if (viral) agregarNoticia(j, { categoria: 'eventos', titulo: '¡KO viral!', cuerpo: viral });

  return { transmision: est.tv + ytIngreso, ppv: est.ppv, patrocinios: est.patrocinios, inversion, total: est.tv + ytIngreso + est.ppv + est.patrocinios + inversion, vistas, compradores: est.compradores, viral, notas };
}

// Los inversionistas de capital se quedan con un % de las utilidades de cada evento
export function pagarReparto(j: Juego, neto: number): number {
  if (neto <= 0) return 0;
  let total = 0;
  for (const n of activos(j, 'inversion')) {
    if (n.inv?.modalidad !== 'capital') continue;
    const monto = Math.round(neto * n.inv.pctUtilidades);
    if (monto > 0) { mover(j, 'inversionistas', -monto); total += monto; }
  }
  return total;
}

// Si borras un evento pactado con un inversionista, se cobra una multa
export function penalizarEventoInversion(j: Juego, e: Evento): void {
  const n = e.inversionistaId != null ? buscar(j, e.inversionistaId) : undefined;
  if (!n || n.estado !== 'activo' || !n.inv) return;
  const multa = Math.round(n.pagoPorEvento * INV.incumplirPago);
  mover(j, 'indemnizaciones', -multa);
  mia(j).reputacion = clamp(mia(j).reputacion - INV.incumplirReputacion, 0, 100);
  n.inv.eventosHechos++;
  n.inv.eventoIds = n.inv.eventoIds.filter(x => x !== e.id);
  if (n.inv.eventosHechos >= n.inv.eventos) n.estado = 'roto';
  agregarNoticia(j, { categoria: 'negocios', titulo: `Cancelaste un evento pactado con ${n.nombre}`, cuerpo: `Multa: ${dinero(multa)} y bajó tu reputación.` });
}

export function ingresoAnualContratos(j: Juego): number {
  return activos(j).reduce((a, n) => a + n.pagoAnual * (n.factorCripto ?? 1), 0);
}


// Ofertas de bienvenida: así nadie empieza sin opciones de ingreso
export function ofertasIniciales(j: Juego, rng: Rng): void {
  const antes = j.negocios.length;
  for (let i = 0; i < 4 && j.negocios.length - antes < 3; i++) {
    const n = ofertaPatrocinio(j, rng);
    if (n) { n.semanaVence = j.semanaAbs + 10; j.negocios.push(n); }
  }
  const pop = popGlobal(j);
  const tvs = TIPOS_TV.filter(c => !c.global && c.popMin <= Math.max(pop, 6));
  for (const cfg of tvs.slice(0, 3)) {
    const region = EMPRESA.regiones.find(r => (mia(j).popRegion[r] ?? 0) >= cfg.popMin);
    if (!region) continue;
    const n = ofertaTV(j, rng, { rubro: cfg.id, region });
    if (n) { n.semanaVence = j.semanaAbs + 10; j.negocios.push(n); }
  }
  if (j.negocios.length > antes) {
    agregarNoticia(j, {
      categoria: 'negocios', titulo: 'Tienes ofertas esperando en Negocios',
      cuerpo: 'Patrocinadores y cadenas de TV quieren trabajar contigo. Revisa la pestaña Negocios → Ofertas: acepta, contraoferta o rechaza.',
    });
  }
}
