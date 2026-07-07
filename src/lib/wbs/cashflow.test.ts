import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { computeWbsCashFlow, resolveCashFlowBasis } from './cashflow'
import { computeWbs } from './calculations'
import { createDefaultState, setIdGenerator, wbsReducer } from './tree'
import type { MonteCarloResult, WbsDictionary, WbsState } from '../../types/wbs'

let restoreIds: () => void

beforeEach(() => {
  let counter = 0
  restoreIds = setIdGenerator(() => `n${++counter}`)
})

afterEach(() => {
  restoreIds()
})

function dictPatch(id: string, patch: Partial<WbsDictionary>) {
  return { type: 'update-dict' as const, id, patch }
}

/** n2: 3000 over Jan (31d); n3: 900 over Feb 1 – Mar 1 (28d). */
function fixture(): WbsState {
  let state = createDefaultState()
  state = wbsReducer(
    state,
    dictPatch('n2', { budget: 3000, startDate: '2026-01-01', endDate: '2026-02-01' }),
  )
  state = wbsReducer(
    state,
    dictPatch('n3', { budget: 900, startDate: '2026-02-01', endDate: '2026-03-01' }),
  )
  return state
}

function series(state: WbsState, bucket: 'Monthly' | 'Weekly' = 'Monthly', scale = 1) {
  return computeWbsCashFlow(state, computeWbs(state), { bucket, scale })!
}

describe('computeWbsCashFlow - linear', () => {
  it('splits linearly by day count into monthly buckets', () => {
    const s = series(fixture())
    expect(s.labels).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026'])
    expect(s.perPeriod[0]).toBeCloseTo(3000, 6) // all of n2 in Jan
    expect(s.perPeriod[1]).toBeCloseTo(900, 6) // all of n3 in Feb
    expect(s.total).toBeCloseTo(3900, 6)
    expect(s.cumulative[2]).toBeCloseTo(3900, 6)
  })

  it('splits an item spanning two months proportionally to days', () => {
    let state = createDefaultState()
    state = wbsReducer(state, { type: 'delete', id: 'n3' })
    // Jan 16 → Feb 5: 20 days total, 16 in Jan, 4 in Feb
    state = wbsReducer(
      state,
      dictPatch('n2', { budget: 2000, startDate: '2026-01-16', endDate: '2026-02-05' }),
    )
    const s = series(state)
    expect(s.perPeriod[0]).toBeCloseTo(2000 * (16 / 20), 6)
    expect(s.perPeriod[1]).toBeCloseTo(2000 * (4 / 20), 6)
  })

  it('applies the scale factor to every bucket', () => {
    const s = series(fixture(), 'Monthly', 1.2)
    expect(s.total).toBeCloseTo(3900 * 1.2, 6)
    expect(s.perPeriod[0]).toBeCloseTo(3600, 6)
  })

  it('handles weekly buckets', () => {
    const s = series(fixture(), 'Weekly')
    expect(s.labels[0]).toBe('2026-01-01')
    // 31 + 28 days ⇒ 9 weeks span
    expect(s.labels.length).toBe(9)
    expect(s.total).toBeCloseTo(3900, 6)
    // first full week of a 31-day linear 3000 item: 7/31 of the cost
    expect(s.perPeriod[0]).toBeCloseTo(3000 * (7 / 31), 6)
  })
})

describe('computeWbsCashFlow - S-curve', () => {
  it('keeps the total but shifts spend toward the middle for α=β=2', () => {
    let state = fixture()
    state = wbsReducer(state, { type: 'delete', id: 'n3' })
    // stretch n2 over four months so quartiles land on month edges
    state = wbsReducer(
      state,
      dictPatch('n2', {
        budget: 1000,
        startDate: '2026-01-01',
        endDate: '2026-05-01',
        costCurve: 'S-Curve',
      }),
    )
    const s = series(state)
    const linear = series(
      wbsReducer(state, dictPatch('n2', { costCurve: 'Linear' })),
    )
    expect(s.total).toBeCloseTo(linear.total, 6)
    // S-curve spends less than linear in the first month (slow start)
    expect(s.perPeriod[0]).toBeLessThan(linear.perPeriod[0])
    // cumulative at the midpoint of a symmetric S-curve ≈ half the total
    const midCumulative = s.cumulative[1] // end of Feb ≈ half of Jan-Apr window
    expect(midCumulative / s.total).toBeGreaterThan(0.45)
    expect(midCumulative / s.total).toBeLessThan(0.55)
  })

  it('front-loads with α<β', () => {
    let state = fixture()
    state = wbsReducer(state, { type: 'delete', id: 'n3' })
    state = wbsReducer(
      state,
      dictPatch('n2', {
        budget: 1000,
        startDate: '2026-01-01',
        endDate: '2026-05-01',
        costCurve: 'S-Curve',
        curveAlpha: 1.5,
        curveBeta: 3,
      }),
    )
    const s = series(state)
    expect(s.perPeriod[0]).toBeGreaterThan(s.perPeriod[3])
    expect(s.total).toBeCloseTo(1000, 4)
  })
})

describe('computeWbsCashFlow - edge cases', () => {
  it('puts a zero-duration item entirely in its bucket', () => {
    let state = fixture()
    state = wbsReducer(
      state,
      dictPatch('n3', { budget: 900, startDate: '2026-02-10', endDate: '2026-02-10' }),
    )
    const s = series(state)
    expect(s.perPeriod[1]).toBeCloseTo(900, 6)
  })

  it('excludes undated leaves and counts them', () => {
    let state = fixture()
    state = wbsReducer(state, dictPatch('n3', { startDate: '', endDate: '' }))
    const s = series(state)
    expect(s.excluded).toBe(1)
    expect(s.total).toBeCloseTo(3000, 6)
  })

  it('returns null when no leaf has dates', () => {
    const state = createDefaultState()
    expect(computeWbsCashFlow(state, computeWbs(state), { bucket: 'Monthly', scale: 1 })).toBeNull()
  })
})

describe('resolveCashFlowBasis', () => {
  const mc = {
    costStats: { p50: 4000, p80: 4400, p90: 4700 },
  } as MonteCarloResult

  it('resolves Budget and PERT without MC', () => {
    const computed = computeWbs(fixture())
    expect(resolveCashFlowBasis('Budget', computed, 4100, null)).toEqual({
      total: 3900,
      label: 'Budget',
      available: true,
    })
    expect(resolveCashFlowBasis('PERT', computed, 4100, null).total).toBe(4100)
  })

  it('resolves percentiles from MC and falls back without it', () => {
    const computed = computeWbs(fixture())
    expect(resolveCashFlowBasis('P80', computed, 4100, mc).total).toBe(4400)
    const fallback = resolveCashFlowBasis('P80', computed, 4100, null)
    expect(fallback.available).toBe(false)
    expect(fallback.total).toBe(3900)
  })
})
