import { describe, it, expect } from 'vitest'
import { betaPdf, scurveCdf } from './statistics'

describe('betaPdf', () => {
  it('matches closed form for alpha=beta=2: 6*x*(1-x)', () => {
    for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(betaPdf(x, 2, 2)).toBeCloseTo(6 * x * (1 - x), 4)
    }
  })
  it('is zero outside (0,1)', () => {
    expect(betaPdf(0, 2, 2)).toBe(0)
    expect(betaPdf(1, 2, 2)).toBe(0)
  })
})

describe('scurveCdf', () => {
  it('is 0 at x=0 and 1 at x=1 regardless of alpha/beta', () => {
    for (const [a, b] of [[2, 2], [1, 1], [3, 2], [2, 5]]) {
      expect(scurveCdf(0, a, b)).toBeCloseTo(0, 6)
      expect(scurveCdf(1, a, b)).toBeCloseTo(1, 6)
    }
  })

  it('matches the 3x^2 - 2x^3 polynomial for alpha=beta=2', () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(scurveCdf(x, 2, 2)).toBeCloseTo(3 * x * x - 2 * x * x * x, 6)
    }
  })

  it('matches the identity CDF for alpha=beta=1 (uniform distribution)', () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(scurveCdf(x, 1, 1)).toBeCloseTo(x, 3)
    }
  })

  it('matches x^2 for alpha=2, beta=1 (Beta(2,1) has pdf 2x, cdf x^2)', () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(scurveCdf(x, 2, 1)).toBeCloseTo(x * x, 3)
    }
  })

  it('matches 2x - x^2 for alpha=1, beta=2 (Beta(1,2) has pdf 2(1-x))', () => {
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(scurveCdf(x, 1, 2)).toBeCloseTo(2 * x - x * x, 3)
    }
  })

  it('is monotonically non-decreasing', () => {
    const xs = Array.from({ length: 21 }, (_, i) => i / 20)
    const ys = xs.map((x) => scurveCdf(x, 3, 1.5))
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-9)
    }
  })

  it('clamps out-of-range x to [0, 1]', () => {
    expect(scurveCdf(-1, 2, 2)).toBe(0)
    expect(scurveCdf(2, 2, 2)).toBe(1)
  })
})
