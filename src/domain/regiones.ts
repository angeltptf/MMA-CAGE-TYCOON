const REGION_DE_PAIS: Record<string, string> = {
  MX: 'mexico', US: 'eeuu', CA: 'eeuu', BR: 'latam', AR: 'latam', CO: 'latam', CL: 'latam',
  JP: 'asia', KR: 'asia', CN: 'asia', TH: 'asia', PH: 'asia', SG: 'asia', KZ: 'asia', HK: 'asia',
  AE: 'medioOriente', SA: 'medioOriente', QA: 'medioOriente',
};

export function regionDePais(code: string): string {
  return REGION_DE_PAIS[code] ?? 'europa';
}
