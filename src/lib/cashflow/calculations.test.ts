import { describe, it, expect } from 'vitest'
import { computeCashFlow } from './calculations'
import type { CashFlowInputs } from '../../types/cashflow'

const base: CashFlowInputs = {
  budget: 1000,
  duration: 12,
  pattern: 'Linear',
  displayBasis: 'Monthly',
  startDelay: 0,
  projectDelay: 0,
  inflation: 0,
}

describe('computeCashFlow - linear baseline', () => {
  it('baseline equals simulated when no delays/inflation', () => {
    const r = computeCashFlow(base)
    expect(r.baselineBudget).toBeCloseTo(1000, 6)
    expect(r.simulatedBudget).toBeCloseTo(1000, 6)
    expect(r.budgetVariance).toBeCloseTo(0, 6)
    expect(r.labels.length).toBe(12)
  })
})

describe('computeCashFlow - start delay shifts cashflow', () => {
  it('simulated has 6 leading zeros and same total (no inflation)', () => {
    const r = computeCashFlow({ ...base, startDelay: 6, inflation: 0 })
    expect(r.rawSimulatedMonthly.slice(0, 6).every((v) => v === 0)).toBe(true)
    expect(r.simulatedBudget).toBeCloseTo(1000, 6)
    expect(r.labels.length).toBe(18)
  })
})

describe('computeCashFlow - inflation increases total', () => {
  it('simulated budget grows with 5% annual inflation', () => {
    const r = computeCashFlow({ ...base, inflation: 5 })
    expect(r.simulatedBudget).toBeGreaterThan(r.baselineBudget)
    expect(r.budgetVariance).toBeGreaterThan(0)
  })
})

describe('computeCashFlow - quarterly aggregation', () => {
  it('groups 12 months into 4 quarters', () => {
    const r = computeCashFlow({ ...base, displayBasis: 'Quarterly' })
    expect(r.labels.length).toBe(4)
    expect(r.labels[0]).toBe('Q1')
  })
})
