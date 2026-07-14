import { describe, expect, it } from 'vitest'
import type { PortfolioProject } from '../../types/portfolio'
import { scurveCdf } from '../shared/statistics'
import {
  computePortfolioCashflow,
  isValidProject,
  portfolioPv,
  projectFraction,
} from './cashflow'
import { parseUtc } from './periods'

function project(overrides: Partial<PortfolioProject> = {}): PortfolioProject {
  return {
    id: overrides.id ?? 'p1',
    name: 'Test',
    bac: 120,
    planStart: '2026-01-01',
    planFinish: '2026-12-31',
    curve: 'Linear',
    alpha: 2,
    beta: 2,
    ...overrides,
  }
}

describe('isValidProject', () => {
  it('rejects non-positive BAC, missing dates and inverted ranges', () => {
    expect(isValidProject(project())).toBe(true)
    expect(isValidProject(project({ bac: 0 }))).toBe(false)
    expect(isValidProject(project({ planStart: '' }))).toBe(false)
    expect(isValidProject(project({ planFinish: '2025-01-01' }))).toBe(false)
  })
})

describe('projectFraction', () => {
  it('is 0.5 at the calendar midpoint of a linear project', () => {
    const p = project({ planStart: '2026-01-01', planFinish: '2026-01-31' })
    expect(projectFraction(p, parseUtc('2026-01-16'))).toBeCloseTo(0.5)
    expect(projectFraction(p, parseUtc('2025-06-01'))).toBe(0)
    expect(projectFraction(p, parseUtc('2027-06-01'))).toBe(1)
  })

  it('follows the beta CDF for S-curves', () => {
    const p = project({ curve: 'S-Curve', alpha: 2, beta: 3 })
    const start = parseUtc(p.planStart)
    const span = parseUtc(p.planFinish) - start
    const ms = start + span * 0.4
    expect(projectFraction(p, ms)).toBeCloseTo(scurveCdf(0.4, 2, 3), 6)
  })
})

describe('computePortfolioCashflow', () => {
  it('sums a linear project exactly to its BAC', () => {
    const series = computePortfolioCashflow([project()], 'Monthly')!
    expect(series.periods).toHaveLength(12)
    expect(series.total).toBeCloseTo(120, 6)
    expect(series.cumulative[11]).toBeCloseTo(120, 6)
  })

  it('gives identical totals at monthly and quarterly granularity', () => {
    const projects = [
      project({ id: 'a', curve: 'S-Curve' }),
      project({ id: 'b', planStart: '2026-03-15', planFinish: '2027-08-20', bac: 77 }),
    ]
    const monthly = computePortfolioCashflow(projects, 'Monthly')!
    const quarterly = computePortfolioCashflow(projects, 'Quarterly')!
    expect(monthly.total).toBeCloseTo(quarterly.total, 6)
    // quarterly per-period equals the sum of its months (CDF differences telescope)
    const q1Monthly = monthly.perPeriod[0] + monthly.perPeriod[1] + monthly.perPeriod[2]
    expect(quarterly.perPeriod[0]).toBeCloseTo(q1Monthly, 6)
  })

  it('matches S-curve CDF differences per period', () => {
    const p = project({ curve: 'S-Curve', alpha: 2, beta: 2 })
    const series = computePortfolioCashflow([p], 'Monthly')!
    const start = parseUtc(p.planStart)
    const span = parseUtc(p.planFinish) - start
    const per = series.periods[3]
    const expected =
      120 *
      (scurveCdf((per.endMs - start) / span, 2, 2) - scurveCdf((per.startMs - start) / span, 2, 2))
    expect(series.perPeriod[3]).toBeCloseTo(expected, 6)
  })

  it('aggregates multiple projects with per-project rows', () => {
    const projects = [project({ id: 'a', bac: 100 }), project({ id: 'b', bac: 50 })]
    const series = computePortfolioCashflow(projects, 'Quarterly')!
    expect(series.perProject).toHaveLength(2)
    series.perPeriod.forEach((v, i) => {
      expect(v).toBeCloseTo(series.perProject[0].values[i] + series.perProject[1].values[i], 9)
    })
    expect(series.total).toBeCloseTo(150, 6)
  })

  it('lands a zero-duration project entirely in its period', () => {
    const p = project({ planStart: '2026-05-10', planFinish: '2026-05-10', bac: 30 })
    const series = computePortfolioCashflow([p], 'Monthly')!
    expect(series.periods).toHaveLength(1)
    expect(series.periods[0].key).toBe('2026-05')
    expect(series.perPeriod[0]).toBeCloseTo(30)
  })

  it('excludes invalid projects and counts them', () => {
    const series = computePortfolioCashflow(
      [project(), project({ id: 'bad', bac: -5 })],
      'Monthly',
    )!
    expect(series.excluded).toBe(1)
    expect(series.total).toBeCloseTo(120, 6)
    expect(computePortfolioCashflow([project({ bac: 0 })], 'Monthly')).toBeNull()
  })

  it('extends the axis for extra period keys of the same granularity', () => {
    const series = computePortfolioCashflow([project()], 'Monthly', ['2027-03', '2026-Q1'])!
    expect(series.periods[series.periods.length - 1].key).toBe('2027-03')
    // mismatched-granularity key ignored, so the axis still starts at the plan start
    expect(series.periods[0].key).toBe('2026-01')
  })
})

describe('portfolioPv', () => {
  it('sums bac-weighted fractions across valid projects only', () => {
    const projects = [
      project({ id: 'a', bac: 100 }),
      project({ id: 'b', bac: 50 }),
      project({ id: 'bad', bac: 0 }),
    ]
    const mid = parseUtc('2026-07-02') // near the calendar midpoint of the shared range
    const expected =
      100 * projectFraction(projects[0], mid) + 50 * projectFraction(projects[1], mid)
    expect(portfolioPv(projects, mid)).toBeCloseTo(expected, 9)
    expect(portfolioPv(projects, parseUtc('2030-01-01'))).toBeCloseTo(150, 6)
  })
})
