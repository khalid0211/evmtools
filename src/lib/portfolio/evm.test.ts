import { describe, expect, it } from 'vitest'
import type { PortfolioProject, StatusSnapshot } from '../../types/portfolio'
import { computeEvm } from '../evm/calculations'
import { computePortfolioRollup, computeProjectStatus, isoAddMonths } from './evm'

function project(overrides: Partial<PortfolioProject> = {}): PortfolioProject {
  return {
    id: overrides.id ?? 'p1',
    name: 'Test',
    bac: 100,
    planStart: '2026-01-01',
    planFinish: '2026-12-31',
    curve: 'Linear',
    alpha: 2,
    beta: 2,
    ...overrides,
  }
}

describe('computeProjectStatus', () => {
  it('matches a direct computeEvm call through the adapter', () => {
    const p = project({ curve: 'S-Curve', alpha: 2, beta: 3 })
    const row = computeProjectStatus(p, '2026-07-01', { ac: 40, pctComplete: 45 })
    const direct = computeEvm({
      bac: 100,
      ac: 40,
      durationMode: 'dates',
      originalDurationInput: 0,
      actualDurationInput: 0,
      planStart: '2026-01-01',
      planFinish: '2026-12-31',
      statusDate: '2026-07-01',
      pvMethod: 'S-Curve',
      pvManual: 0,
      alpha: 2,
      beta: 3,
      evMethod: '% Complete',
      evManual: 0,
      percentComplete: 45,
      inflationRate: 0,
    })
    expect(row.pv).toBeCloseTo(direct.pv, 9)
    expect(row.ev).toBeCloseTo(direct.ev, 9)
    expect(row.spi).toBeCloseTo(direct.spi, 9)
    expect(row.cpi).toBeCloseTo(direct.cpi!, 9)
    expect(row.spie).toBeCloseTo(direct.spie!, 9)
    expect(row.health).toBe(direct.healthStatus)
  })

  it('has SPIe ≈ 1 and no slip for an on-plan linear project', () => {
    // EV set to exactly the linear PV at the status date
    const p = project()
    const preview = computeProjectStatus(p, '2026-07-01', { ac: 0, pctComplete: 0 })
    const pctOnPlan = preview.pv // bac = 100, so PV equals % complete
    const row = computeProjectStatus(p, '2026-07-01', { ac: pctOnPlan, pctComplete: pctOnPlan })
    expect(row.spie!).toBeCloseTo(1, 3)
    expect(row.slipMonths!).toBeCloseTo(0, 1)
    expect(row.expectedFinish).toBeTruthy()
  })

  it('projects a delay when behind schedule', () => {
    const p = project()
    const row = computeProjectStatus(p, '2026-07-01', { ac: 30, pctComplete: 25 })
    expect(row.spie!).toBeLessThan(1)
    expect(row.slipMonths!).toBeGreaterThan(0)
    expect(row.expectedFinish! > p.planFinish).toBe(true)
  })

  it('flags a project as not started before its plan start', () => {
    const row = computeProjectStatus(project(), '2025-06-01', { ac: 0, pctComplete: 0 })
    expect(row.started).toBe(false)
    expect(row.pv).toBe(0)
  })
})

describe('isoAddMonths', () => {
  it('adds 30.44-day months', () => {
    expect(isoAddMonths('2026-01-01', 0)).toBe('2026-01-01')
    // 12 × 30.44 = 365.28 days
    expect(isoAddMonths('2026-01-01', 12)).toBe('2027-01-01')
  })
})

describe('computePortfolioRollup', () => {
  const snapshotFor = (entries: StatusSnapshot['entries']): StatusSnapshot => ({
    dataDate: '2026-07-01',
    entries,
  })

  it('sums PV/EV/AC/BAC across projects', () => {
    const projects = [project({ id: 'a', bac: 100 }), project({ id: 'b', bac: 60 })]
    const rollup = computePortfolioRollup(projects, '2026-07-01', snapshotFor({
      a: { ac: 40, pctComplete: 50 },
      b: { ac: 20, pctComplete: 40 },
    }))!
    expect(rollup.bac).toBe(160)
    expect(rollup.ev).toBeCloseTo(100 * 0.5 + 60 * 0.4, 9)
    expect(rollup.ac).toBe(60)
    const rowA = computeProjectStatus(projects[0], '2026-07-01', { ac: 40, pctComplete: 50 })
    const rowB = computeProjectStatus(projects[1], '2026-07-01', { ac: 20, pctComplete: 40 })
    expect(rollup.pv).toBeCloseTo(rowA.pv + rowB.pv, 6)
    expect(rollup.spi).toBeCloseTo(rollup.ev / rollup.pv, 9)
    expect(rollup.cpi).toBeCloseTo(rollup.ev / rollup.ac, 9)
    expect(rollup.eac).toBeCloseTo(rollup.ac + rollup.etc!, 9)
    expect(rollup.vac).toBeCloseTo(rollup.bac - rollup.eac!, 9)
  })

  it('has SPIe ≈ 1 when the portfolio tracks its aggregate PV curve', () => {
    const projects = [
      project({ id: 'a', bac: 100, curve: 'S-Curve' }),
      project({ id: 'b', bac: 60, planStart: '2026-04-01', planFinish: '2027-03-31' }),
    ]
    // set each project's % complete to exactly its planned fraction at the data date
    const previewA = computeProjectStatus(projects[0], '2026-07-01', { ac: 0, pctComplete: 0 })
    const previewB = computeProjectStatus(projects[1], '2026-07-01', { ac: 0, pctComplete: 0 })
    const rollup = computePortfolioRollup(projects, '2026-07-01', snapshotFor({
      a: { ac: previewA.pv, pctComplete: previewA.pv },
      b: { ac: previewB.pv, pctComplete: (previewB.pv / 60) * 100 },
    }))!
    expect(rollup.spie!).toBeCloseTo(1, 3)
    expect(rollup.slipMonths!).toBeCloseTo(0, 1)
  })

  it('projects a delayed finish when EV lags PV', () => {
    const projects = [project({ id: 'a', bac: 100 })]
    const rollup = computePortfolioRollup(projects, '2026-07-01', snapshotFor({
      a: { ac: 30, pctComplete: 20 },
    }))!
    expect(rollup.spie!).toBeLessThan(1)
    expect(rollup.slipMonths!).toBeGreaterThan(0)
    expect(rollup.expectedFinish! > rollup.portfolioFinish).toBe(true)
  })

  it('handles degenerate inputs', () => {
    expect(computePortfolioRollup([], '2026-07-01', snapshotFor({}))).toBeNull()
    expect(
      computePortfolioRollup([project({ bac: 0 })], '2026-07-01', snapshotFor({})),
    ).toBeNull()
    const zero = computePortfolioRollup([project({ id: 'a' })], '2026-07-01', snapshotFor({}))!
    expect(zero.ev).toBe(0)
    expect(zero.es).toBe(0)
    expect(zero.cpi).toBeNull()
    expect(zero.expectedDurationMonths).toBeNull()
  })
})
