import { describe, expect, it } from 'vitest'
import type { PortfolioProject } from '../../types/portfolio'
import { computePortfolioCashflow } from './cashflow'
import { autoFundingAmounts, computeFundingAnalysis } from './funding'

const project: PortfolioProject = {
  id: 'p1',
  name: 'Test',
  bac: 120,
  planStart: '2026-01-01',
  planFinish: '2026-12-31',
  curve: 'Linear',
  alpha: 2,
  beta: 2,
}

describe('computeFundingAnalysis', () => {
  it('reports no overload when funding matches the requirement each period', () => {
    const series = computePortfolioCashflow([project], 'Monthly')!
    const amounts: Record<string, number> = {}
    series.periods.forEach((p, i) => {
      amounts[p.key] = series.perPeriod[i]
    })
    const analysis = computeFundingAnalysis(series, { granularity: 'Monthly', amounts })
    expect(analysis.overloaded.every((o) => !o)).toBe(true)
    expect(analysis.overloadedRanges).toEqual([])
    expect(analysis.totalFunding).toBeCloseTo(analysis.totalRequirement, 6)
    analysis.net.forEach((n) => expect(Math.abs(n)).toBeLessThan(1e-6))
  })

  it('reports no overload when everything is funded up front', () => {
    const series = computePortfolioCashflow([project], 'Quarterly')!
    const analysis = computeFundingAnalysis(series, {
      granularity: 'Quarterly',
      amounts: { '2026-Q1': 200 },
    })
    expect(analysis.overloaded.every((o) => !o)).toBe(true)
    expect(analysis.net[analysis.net.length - 1]).toBeCloseTo(80, 6)
  })

  it('flags contiguous overloaded periods with the worst shortfall', () => {
    const series = computePortfolioCashflow([project], 'Quarterly')!
    // funding lags: nothing until Q3, then everything
    const analysis = computeFundingAnalysis(series, {
      granularity: 'Quarterly',
      amounts: { '2026-Q3': 120 },
    })
    expect(analysis.overloaded[0]).toBe(true)
    expect(analysis.overloaded[1]).toBe(true)
    expect(analysis.overloaded[2]).toBe(false)
    expect(analysis.overloadedRanges).toHaveLength(1)
    const range = analysis.overloadedRanges[0]
    expect(range.fromLabel).toBe('Q1 2026')
    expect(range.toLabel).toBe('Q2 2026')
    expect(range.worst).toBeCloseTo(-series.cumulative[1], 6)
  })

  it('auto-calculates funding rounded up to 2 decimals with no resulting overload', () => {
    const series = computePortfolioCashflow([project], 'Monthly')!
    const amounts = autoFundingAmounts(series)
    series.periods.forEach((period, i) => {
      const requirement = series.perPeriod[i]
      if (requirement <= 0) {
        expect(period.key in amounts).toBe(false)
        return
      }
      const funded = amounts[period.key]
      // exactly 2 decimal places
      expect(funded).toBeCloseTo(Math.round(funded * 100) / 100, 12)
      // never below the requirement, never more than a cent above
      expect(funded).toBeGreaterThanOrEqual(requirement - 1e-9)
      expect(funded - requirement).toBeLessThan(0.01 + 1e-9)
    })
    const analysis = computeFundingAnalysis(series, { granularity: 'Monthly', amounts })
    expect(analysis.overloaded.every((o) => !o)).toBe(true)
  })

  it('includes funded periods outside the plan range in the axis and totals', () => {
    const series = computePortfolioCashflow([project], 'Quarterly', ['2027-Q2'])!
    const analysis = computeFundingAnalysis(series, {
      granularity: 'Quarterly',
      amounts: { '2026-Q1': 120, '2027-Q2': 40 },
    })
    expect(analysis.labels[analysis.labels.length - 1]).toBe('Q2 2027')
    expect(analysis.totalFunding).toBeCloseTo(160, 6)
    expect(analysis.net[analysis.net.length - 1]).toBeCloseTo(40, 6)
  })
})
