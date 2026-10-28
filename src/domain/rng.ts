// Generador pseudoaleatorio con semilla (mulberry32). El estado se guarda en la
// partida, así una misma partida es reproducible y los tests son deterministas.

export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  // Normal(media, desv) por Box-Muller
  normal(media = 0, desv = 1): number {
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    return media + desv * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  weighted<T>(items: readonly T[], peso: (x: T) => number): T {
    let total = 0;
    for (const it of items) total += peso(it);
    let r = this.next() * total;
    for (const it of items) {
      r -= peso(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}

export const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
