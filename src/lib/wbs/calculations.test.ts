import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  computeWbs,
  costTriple,
  daysBetween,
  durationTriple,
  pertMean,
  riskTone,
} from './calculations'
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

/**
 * root n1
 * ├── n2 (parent)
 * │   ├── n4 leaf: 1000, 2026-01-01→2026-03-01, Low/Low
 * │   └── n5 leaf: 2000, 2026-02-01→2026-06-01, Low/Low
 * └── n3 leaf: 500, 2026-01-15→2026-02-15, High/High
 */
function fixture(): WbsState {
  let state = createDefaultState() // n1 root, n2, n3
  state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n4
  state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n5
  state = wbsReducer(
    state,
    dictPatch('n4', { budget: 1000, startDate: '2026-01-01', endDate: '2026-03-01' }),
  )
  state = wbsReducer(
    state,
    dictPatch('n5', { budget: 2000, startDate: '2026-02-01', endDate: '2026-06-01' }),
  )
  state = wbsReducer(
    state,
    dictPatch('n3', {
      budget: 500,
      startDate: '2026-01-15',
      endDate: '2026-02-15',
      riskLikelihood: 'High',
      riskImpact: 'High',
    }),
  )
  return state
}

describe('pertMean and triples', () => {
  it('computes (O + 4ML + P) / 6', () => {
    expect(pertMean(10, 25, 40)).toBeCloseTo(25, 10)
    expect(pertMean(10, 20, 40)).toBeCloseTo(130 / 6, 10)
  })

  it('cost triple defaults O and P to most likely', () => {
    const { o, ml, p } = costTriple({ budget: 100 } as WbsDictionary)
    expect([o, ml, p]).toEqual([100, 100, 100])
  })

  it('cost triple normalizes inverted overrides', () => {
    const t = costTriple({ budget: 100, costOptimistic: 150, costPessimistic: 50 } as WbsDictionary)
    expect(t.o).toBe(100)
    expect(t.p).toBe(100)
  })

  it('duration triple derives most likely from dates', () => {
    const t = durationTriple({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    } as WbsDictionary)
    expect(t.ml).toBe(30)
    expect(t.o).toBe(30)
    expect(t.p).toBe(30)
  })
})

describe('daysBetween', () => {
  it('computes UTC day difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })

  it('clamps negatives to 0', () => {
    expect(daysBetween('2026-02-01', '2026-01-01')).toBe(0)
  })
})

describe('computeWbs roll-up', () => {
  it('sums budgets up through every level', () => {
    const c = computeWbs(fixture())
    expect(c.perNode.n2.budget).toBe(3000)
    expect(c.perNode.n1.budget).toBe(3500)
    expect(c.totalCost).toBe(3500)
  })

  it('rolls up min start / max end dates', () => {
    const c = computeWbs(fixture())
    expect(c.perNode.n2.startDate).toBe('2026-01-01')
    expect(c.perNode.n2.endDate).toBe('2026-06-01')
    expect(c.projectStart).toBe('2026-01-01')
    expect(c.projectEnd).toBe('2026-06-01')
  })

  it('skips undated leaves in the date roll-up with a warning', () => {
    let state = fixture()
    state = wbsReducer(state, dictPatch('n3', { startDate: '', endDate: '' }))
    const c = computeWbs(state)
    expect(c.projectStart).toBe('2026-01-01')
    expect(c.warnings.some((w) => w.includes('Dates not set'))).toBe(true)
  })

  it('pertCost equals budget when no overrides are set', () => {
    const c = computeWbs(fixture())
    expect(c.perNode.n1.pertCost).toBe(c.perNode.n1.budget)
  })

  it('activeCost switches to PERT when advanced + usePert', () => {
    let state = fixture()
    state = wbsReducer(state, dictPatch('n4', { costOptimistic: 400, costPessimistic: 4000 }))
    let c = computeWbs(state)
    // advanced off: active = plain budget
    expect(c.totalCost).toBe(3500)
    state = wbsReducer(state, { type: 'update-settings', patch: { advanced: true, usePert: true } })
    c = computeWbs(state)
    const n4Pert = (400 + 4 * 1000 + 4000) / 6
    expect(c.perNode.n4.activeCost).toBeCloseTo(n4Pert, 10)
    expect(c.totalCost).toBeCloseTo(n4Pert + 2000 + 500, 10)
  })

  it('flags end-before-start and marks state invalid', () => {
    let state = fixture()
    state = wbsReducer(state, dictPatch('n4', { startDate: '2026-05-01', endDate: '2026-01-01' }))
    const c = computeWbs(state)
    expect(c.valid).toBe(false)
    expect(c.warnings.some((w) => w.includes('End date is before start date'))).toBe(true)
  })
})

describe('risk matrix', () => {
  it('sums leaf budgets per cell and counts items', () => {
    const c = computeWbs(fixture())
    const lowLow = c.riskMatrix.find((x) => x.likelihood === 'Low' && x.impact === 'Low')!
    const highHigh = c.riskMatrix.find((x) => x.likelihood === 'High' && x.impact === 'High')!
    expect(lowLow.totalCost).toBe(3000) // n4 1000 + n5 2000
    expect(lowLow.count).toBe(2)
    expect(highHigh.totalCost).toBe(500)
    expect(highHigh.count).toBe(1)
    expect(c.leafCount).toBe(3)
  })

  it('excludes parent nodes from the matrix', () => {
    const c = computeWbs(fixture())
    const total = c.riskMatrix.reduce((s, cell) => s + cell.totalCost, 0)
    expect(total).toBe(3500) // leaves only, no double counting via n2/n1
  })

  it('maps scores to tones across all nine cells', () => {
    expect(riskTone(1)).toBe('good') // L×L
    expect(riskTone(2)).toBe('good') // L×M
    expect(riskTone(3)).toBe('warn') // L×H
    expect(riskTone(4)).toBe('warn') // M×M
    expect(riskTone(6)).toBe('danger') // M×H
    expect(riskTone(9)).toBe('danger') // H×H
  })
})
