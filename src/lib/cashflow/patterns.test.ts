import { describe, it, expect } from 'vitest'
import { linearCashflow, highwayCashflow, buildingCashflow, scurveCashflow, betaPdf } from './patterns'

describe('linearCashflow', () => {
  it('splits budget evenly and sums to budget', () => {
    const cf = linearCashflow(1200, 12)
    expect(cf.length).toBe(12)
    expect(cf[0]).toBeCloseTo(100, 6)
    expect(cf.reduce((s, v) => s + v, 0)).toBeCloseTo(1200, 6)
  })
})

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

describe('pattern cashflows sum to budget', () => {
  const budget = 1000
  const duration = 24
  it('Highway sums to budget', () => {
    const cf = highwayCashflow(budget, duration)
    expect(cf.reduce((s, v) => s + v, 0)).toBeCloseTo(budget, 2)
  })
  it('Building sums to budget', () => {
    const cf = buildingCashflow(budget, duration)
    expect(cf.reduce((s, v) => s + v, 0)).toBeCloseTo(budget, 2)
  })
  it('S-Curve sums to budget', () => {
    const cf = scurveCashflow(budget, duration)
    expect(cf.reduce((s, v) => s + v, 0)).toBeCloseTo(budget, 2)
  })
  it('all monthly values are non-negative', () => {
    const cf = buildingCashflow(budget, duration)
    expect(cf.every((v) => v >= 0)).toBe(true)
  })
})
