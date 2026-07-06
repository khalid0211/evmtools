import { describe, it, expect } from 'vitest'
import { empiricalCdf, mulberry32, percentile, sampleBetaPert, summarize } from './random'

describe('mulberry32', () => {
  it('is reproducible for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different streams for different seeds', () => {
    const a = mulberry32(1)()
    const b = mulberry32(2)()
    expect(a).not.toBe(b)
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('percentile', () => {
  it('interpolates linearly', () => {
    expect(percentile([0, 10], 50)).toBe(5)
    expect(percentile([0, 10, 20, 30, 40], 25)).toBe(10)
    expect(percentile([0, 10, 20, 30, 40], 90)).toBeCloseTo(36, 10)
  })

  it('handles edges', () => {
    expect(percentile([5], 90)).toBe(5)
    expect(percentile([1, 2, 3], 0)).toBe(1)
    expect(percentile([1, 2, 3], 100)).toBe(3)
  })
})

describe('sampleBetaPert', () => {
  it('returns most likely for a degenerate range', () => {
    const rng = mulberry32(1)
    expect(sampleBetaPert(100, 100, 100, rng)).toBe(100)
  })

  it('stays within [optimistic, pessimistic]', () => {
    const rng = mulberry32(11)
    for (let i = 0; i < 2000; i++) {
      const v = sampleBetaPert(50, 100, 400, rng)
      expect(v).toBeGreaterThanOrEqual(50)
      expect(v).toBeLessThanOrEqual(400)
    }
  })

  it('sampled mean converges to the PERT mean (O + 4ML + P) / 6', () => {
    const rng = mulberry32(123)
    const o = 50
    const ml = 100
    const p = 400
    const n = 20000
    let sum = 0
    for (let i = 0; i < n; i++) sum += sampleBetaPert(o, ml, p, rng)
    const pert = (o + 4 * ml + p) / 6
    expect(sum / n).toBeGreaterThan(pert * 0.99)
    expect(sum / n).toBeLessThan(pert * 1.01)
  })
})

describe('empiricalCdf', () => {
  it('returns the fraction of samples at or below the value', () => {
    expect(empiricalCdf([1, 2, 3, 4, 5], 3)).toBe(0.6)
    expect(empiricalCdf([1, 2, 3, 4, 5], 0)).toBe(0)
    expect(empiricalCdf([1, 2, 3, 4, 5], 10)).toBe(1)
  })

  it('handles empty input', () => {
    expect(empiricalCdf([], 1)).toBeNaN()
  })
})

describe('summarize', () => {
  it('computes stats on a known sample', () => {
    const s = summarize([1, 2, 3, 4, 5])
    expect(s.mean).toBe(3)
    expect(s.min).toBe(1)
    expect(s.max).toBe(5)
    expect(s.p50).toBe(3)
    expect(s.std).toBeCloseTo(Math.sqrt(2), 10)
  })

  it('handles empty input', () => {
    expect(summarize([]).mean).toBe(0)
  })
})
