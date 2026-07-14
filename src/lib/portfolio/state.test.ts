import { describe, expect, it } from 'vitest'
import type { PortfolioState } from '../../types/portfolio'
import { buildActualCurves, entryFor, latestSnapshot, samplePortfolioPvCurve, sortedHistory } from './history'
import { createDefaultPortfolio, createProject, portfolioReducer } from './state'

function baseState(): PortfolioState {
  return {
    name: 'Test Portfolio',
    projects: [
      createProject({ id: 'a', name: 'A', bac: 100, planStart: '2026-01-01', planFinish: '2026-12-31', curve: 'Linear' }),
      createProject({ id: 'b', name: 'B', bac: 60, planStart: '2026-04-01', planFinish: '2027-03-31', curve: 'Linear' }),
    ],
    funding: { granularity: 'Quarterly', amounts: { '2026-Q1': 40, '2026-Q2': 40 } },
    statusHistory: [
      { dataDate: '2026-04-01', entries: { a: { ac: 10, pctComplete: 20 } } },
      { dataDate: '2026-07-01', entries: { a: { ac: 40, pctComplete: 50 }, b: { ac: 5, pctComplete: 10 } } },
    ],
  }
}

describe('portfolioReducer projects', () => {
  it('adds, updates and deletes projects', () => {
    let state = portfolioReducer(baseState(), { type: 'add-project' })
    expect(state.projects).toHaveLength(3)
    expect(state.projects[2].name).toBe('Project 3')

    state = portfolioReducer(state, {
      type: 'update-project',
      id: 'a',
      patch: { bac: 150, planFinish: '2027-06-30' },
    })
    expect(state.projects[0].bac).toBe(150)
    expect(state.projects[0].planFinish).toBe('2027-06-30')

    state = portfolioReducer(state, { type: 'delete-project', id: 'a' })
    expect(state.projects.map((p) => p.id)).not.toContain('a')
  })

  it('scrubs a deleted project from every snapshot', () => {
    const state = portfolioReducer(baseState(), { type: 'delete-project', id: 'a' })
    for (const snap of state.statusHistory) {
      expect('a' in snap.entries).toBe(false)
    }
    expect(state.statusHistory[1].entries.b).toEqual({ ac: 5, pctComplete: 10 })
  })
})

describe('portfolioReducer funding', () => {
  it('converts amounts when the granularity changes', () => {
    const yearly = portfolioReducer(baseState(), {
      type: 'set-funding-granularity',
      granularity: 'Yearly',
    })
    expect(yearly.funding.amounts).toEqual({ '2026': 80 })

    const monthly = portfolioReducer(baseState(), {
      type: 'set-funding-granularity',
      granularity: 'Monthly',
    })
    const total = Object.values(monthly.funding.amounts).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(80)
    expect(monthly.funding.amounts['2026-01']).toBeCloseTo(40 / 3)
  })

  it('sets and clears per-period amounts', () => {
    let state = portfolioReducer(baseState(), {
      type: 'set-funding-amount',
      periodKey: '2026-Q3',
      amount: 25,
    })
    expect(state.funding.amounts['2026-Q3']).toBe(25)
    state = portfolioReducer(state, { type: 'set-funding-amount', periodKey: '2026-Q3', amount: 0 })
    expect('2026-Q3' in state.funding.amounts).toBe(false)
  })
})

describe('portfolioReducer snapshots', () => {
  it('inserts a snapshot sorted and carries the previous entries forward', () => {
    const state = portfolioReducer(baseState(), { type: 'upsert-snapshot', dataDate: '2026-10-01' })
    expect(state.statusHistory.map((s) => s.dataDate)).toEqual([
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
    ])
    expect(state.statusHistory[2].entries.a).toEqual({ ac: 40, pctComplete: 50 })
    // carried entries are copies, not shared references
    expect(state.statusHistory[2].entries.a).not.toBe(state.statusHistory[1].entries.a)
  })

  it('ignores duplicate or invalid data dates', () => {
    expect(
      portfolioReducer(baseState(), { type: 'upsert-snapshot', dataDate: '2026-07-01' }).statusHistory,
    ).toHaveLength(2)
    expect(
      portfolioReducer(baseState(), { type: 'upsert-snapshot', dataDate: 'nonsense' }).statusHistory,
    ).toHaveLength(2)
  })

  it('updates entries with partial patches', () => {
    const state = portfolioReducer(baseState(), {
      type: 'update-snapshot-entry',
      dataDate: '2026-07-01',
      projectId: 'b',
      patch: { pctComplete: 25 },
    })
    expect(state.statusHistory[1].entries.b).toEqual({ ac: 5, pctComplete: 25 })
  })

  it('re-sorts on date change and rejects collisions', () => {
    const moved = portfolioReducer(baseState(), {
      type: 'change-snapshot-date',
      from: '2026-04-01',
      to: '2026-12-01',
    })
    expect(moved.statusHistory.map((s) => s.dataDate)).toEqual(['2026-07-01', '2026-12-01'])

    const collided = portfolioReducer(baseState(), {
      type: 'change-snapshot-date',
      from: '2026-04-01',
      to: '2026-07-01',
    })
    expect(collided).toEqual(baseState())
  })

  it('deletes snapshots', () => {
    const state = portfolioReducer(baseState(), { type: 'delete-snapshot', dataDate: '2026-04-01' })
    expect(state.statusHistory.map((s) => s.dataDate)).toEqual(['2026-07-01'])
  })
})

describe('createDefaultPortfolio', () => {
  it('provides a demo-ready sample', () => {
    const state = createDefaultPortfolio()
    expect(state.projects.length).toBeGreaterThanOrEqual(3)
    expect(state.funding.granularity).toBe('Quarterly')
    expect(Object.keys(state.funding.amounts).length).toBeGreaterThan(0)
    expect(state.statusHistory).toEqual([])
  })
})

describe('history helpers', () => {
  it('sorts and finds the latest snapshot', () => {
    const history = [...baseState().statusHistory].reverse()
    expect(sortedHistory(history)[0].dataDate).toBe('2026-04-01')
    expect(latestSnapshot(history)!.dataDate).toBe('2026-07-01')
    expect(latestSnapshot([])).toBeNull()
  })

  it('defaults missing entries to zero', () => {
    const snap = baseState().statusHistory[0]
    expect(entryFor(snap, 'b')).toEqual({ ac: 0, pctComplete: 0 })
  })

  it('builds EV/AC curves treating missing projects as not started', () => {
    const state = baseState()
    const curves = buildActualCurves(state.projects, state.statusHistory)
    expect(curves.dates).toEqual(['2026-04-01', '2026-07-01'])
    expect(curves.ev[0]).toBeCloseTo(100 * 0.2) // project b absent from the first snapshot
    expect(curves.ev[1]).toBeCloseTo(100 * 0.5 + 60 * 0.1)
    expect(curves.ac).toEqual([10, 45])
    expect(curves.pv[1]).toBeGreaterThan(curves.pv[0])
  })

  it('samples the aggregate PV curve from zero to total BAC', () => {
    const state = baseState()
    const curve = samplePortfolioPvCurve(state.projects, 40)!
    expect(curve.dates[0]).toBe('2026-01-01')
    expect(curve.dates[curve.dates.length - 1]).toBe('2027-03-31')
    expect(curve.values[0]).toBeCloseTo(0, 6)
    expect(curve.values[curve.values.length - 1]).toBeCloseTo(160, 6)
    expect(samplePortfolioPvCurve([])).toBeNull()
  })
})
