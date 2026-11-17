// Seeded random numbers — one seed rebuilds the same city, traffic and
// pedestrians, so a screenshot scene is reproducible.
export class SeedRng {
  constructor(seed) {
    this.s = (seed >>> 0) || 1;
  }
  next() {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
  chance(p) { return this.next() < p; }
}
export function makeRng(seed) { return new SeedRng(seed); }
