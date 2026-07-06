import type { SummaryStats } from '../../types/wbs'

export type Rng = () => number

/** Small, fast seeded PRNG returning uniforms in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal via Box–Muller. */
export function sampleNormal(rng: Rng): number {
  let u = 0
  while (u === 0) u = rng() // avoid log(0)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Gamma(shape, 1) via Marsaglia–Tsang, with the shape < 1 boost. */
export function sampleGamma(shape: number, rng: Rng): number {
  if (shape < 1) {
    const u = rng()
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number
    let v: number
    do {
      x = sampleNormal(rng)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rng()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

export function sampleBeta(alpha: number, beta: number, rng: Rng): number {
  const x = sampleGamma(alpha, rng)
  const y = sampleGamma(beta, rng)
  return x / (x + y)
}

/**
 * Beta-PERT sample on [optimistic, pessimistic] with mode at mostLikely.
 * Mean is exactly (O + 4·ML + P) / 6, matching the deterministic PERT estimate.
 * Degenerate ranges return the most-likely value without consuming randomness.
 */
export function sampleBetaPert(
  optimistic: number,
  mostLikely: number,
  pessimistic: number,
  rng: Rng,
): number {
  const range = pessimistic - optimistic
  if (range < 1e-12) return mostLikely
  const alpha = 1 + (4 * (mostLikely - optimistic)) / range
  const beta = 1 + (4 * (pessimistic - mostLikely)) / range
  return optimistic + range * sampleBeta(alpha, beta, rng)
}

/** Fraction of samples ≤ value (empirical cumulative probability), 0..1. */
export function empiricalCdf(samples: number[], value: number): number {
  if (samples.length === 0) return NaN
  let count = 0
  for (const s of samples) {
    if (s <= value) count += 1
  }
  return count / samples.length
}

/** Percentile with linear interpolation; input must be sorted ascending. */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN
  if (sortedAsc.length === 1) return sortedAsc[0]
  const pos = (p / 100) * (sortedAsc.length - 1)
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sortedAsc[lower]
  return sortedAsc[lower] + (sortedAsc[upper] - sortedAsc[lower]) * (pos - lower)
}

export function summarize(samples: number[]): SummaryStats {
  if (samples.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, p10: 0, p50: 0, p80: 0, p90: 0 }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length
  const variance = samples.reduce((s, v) => s + (v - mean) * (v - mean), 0) / samples.length
  return {
    mean,
    std: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p10: percentile(sorted, 10),
    p50: percentile(sorted, 50),
    p80: percentile(sorted, 80),
    p90: percentile(sorted, 90),
  }
}
