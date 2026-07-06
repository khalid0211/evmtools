import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runMonteCarlo } from './montecarlo'
import { computeWbs } from './calculations'
import { createDefaultState, setIdGenerator, wbsReducer } from './tree'
import type { WbsDictionary, WbsState } from '../../types/wbs'

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

/** Two leaves with three-point cost + duration spread. */
function fixture(): WbsState {
  let state = createDefaultState() // n1 root, leaves n2, n3
  state = wbsReducer(
    state,
    dictPatch('n2', {
      budget: 1000,
      startDate: '2026-01-01',
      endDate: '2026-01-31', // ML 30 days
      costOptimistic: 800,
      costPessimistic: 1600,
      durOptimisticDays: 20,
      durPessimisticDays: 60,
    }),
  )
  state = wbsReducer(
    state,
    dictPatch('n3', {
      budget: 2000,
      startDate: '2026-02-01',
      endDate: '2026-03-01', // ML 28 days
      costOptimistic: 1500,
      costPessimistic: 3500,
      durOptimisticDays: 14,
      durPessimisticDays: 56,
    }),
  )
  return state
}

describe('runMonteCarlo', () => {
  it('is deterministic for the same seed', () => {
    const state = fixture()
    const a = runMonteCarlo(state, { iterations: 500, seed: 42 })
    const b = runMonteCarlo(state, { iterations: 500, seed: 42 })
    expect(a).toEqual(b)
  })

  it('differs across seeds', () => {
    const state = fixture()
    const a = runMonteCarlo(state, { iterations: 500, seed: 1 })
    const b = runMonteCarlo(state, { iterations: 500, seed: 2 })
    expect(a.costs[0]).not.toBe(b.costs[0])
  })

  it('cost mean converges to the PERT total', () => {
    let state = fixture()
    state = wbsReducer(state, {
      type: 'update-settings',
      patch: { advanced: true, usePert: true },
    })
    const computed = computeWbs(state)
    const mc = runMonteCarlo(state, { iterations: 20000, seed: 7 })
    expect(mc.costStats.mean).toBeGreaterThan(computed.totalCost * 0.99)
    expect(mc.costStats.mean).toBeLessThan(computed.totalCost * 1.01)
  })

  it('has zero spread when all triples are constant', () => {
    let state = createDefaultState()
    state = wbsReducer(
      state,
      dictPatch('n2', { budget: 1000, startDate: '2026-01-01', endDate: '2026-01-31' }),
    )
    state = wbsReducer(
      state,
      dictPatch('n3', { budget: 500, startDate: '2026-01-01', endDate: '2026-02-15' }),
    )
    const mc = runMonteCarlo(state, { iterations: 200, seed: 5 })
    expect(mc.costStats.std).toBe(0)
    expect(mc.costStats.mean).toBe(1500)
    // duration deterministic: max end (Feb 15) - min start (Jan 1) = 45 days
    expect(mc.durationStats.std).toBe(0)
    expect(mc.durationStats.mean).toBe(45)
  })

  it('duration equals max simulated finish minus earliest start (parallel items)', () => {
    let state = createDefaultState()
    // n2 starts Jan 1, fixed 10 days; n3 starts Jan 20, fixed 5 days
    state = wbsReducer(
      state,
      dictPatch('n2', { budget: 1, startDate: '2026-01-01', endDate: '2026-01-11' }),
    )
    state = wbsReducer(
      state,
      dictPatch('n3', { budget: 1, startDate: '2026-01-20', endDate: '2026-01-25' }),
    )
    const mc = runMonteCarlo(state, { iterations: 50, seed: 3 })
    // project spans Jan 1 → Jan 25 = 24 days, driven by the later-starting item
    expect(mc.durationStats.mean).toBe(24)
  })

  it('excludes undated leaves from the duration model but not the cost model', () => {
    let state = createDefaultState()
    state = wbsReducer(
      state,
      dictPatch('n2', { budget: 1000, startDate: '2026-01-01', endDate: '2026-01-31' }),
    )
    state = wbsReducer(state, dictPatch('n3', { budget: 500 })) // no dates
    const mc = runMonteCarlo(state, { iterations: 100, seed: 9 })
    expect(mc.excludedFromDuration).toBe(1)
    expect(mc.costStats.mean).toBe(1500)
    expect(mc.durationStats.mean).toBe(30)
  })
})
