import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { makeEnvelope, parseImportedJson, validateWbsState } from './persistence'
import { createDefaultState, setIdGenerator, wbsReducer } from './tree'
import type { WbsState } from '../../types/wbs'

let restoreIds: () => void

beforeEach(() => {
  let counter = 0
  restoreIds = setIdGenerator(() => `n${++counter}`)
})

afterEach(() => {
  restoreIds()
})

function roundTrip(state: WbsState) {
  return parseImportedJson(JSON.stringify(makeEnvelope(state)))
}

describe('round trip', () => {
  it('re-imports its own export losslessly', () => {
    let state = createDefaultState()
    state = wbsReducer(state, { type: 'add-child', parentId: 'n2' })
    state = wbsReducer(state, {
      type: 'update-dict',
      id: 'n4',
      patch: {
        budget: 1234,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        riskLikelihood: 'High',
        riskImpact: 'Medium',
        costOptimistic: 1000,
        costPessimistic: 2000,
        costCurve: 'S-Curve',
        curveAlpha: 1.5,
        curveBeta: 3,
      },
    })
    state = wbsReducer(state, {
      type: 'update-settings',
      patch: { advanced: true, usePert: true, mcSeed: 99 },
    })
    const result = roundTrip(state)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state).toEqual(state)
  })
})

describe('rejection paths', () => {
  it('rejects non-JSON and foreign files', () => {
    expect(parseImportedJson('not json').ok).toBe(false)
    expect(parseImportedJson('{"foo": 1}').ok).toBe(false)
    expect(
      parseImportedJson(JSON.stringify({ app: 'other-app', version: 1, state: {} })).ok,
    ).toBe(false)
    expect(
      parseImportedJson(JSON.stringify({ app: 'pm-tools-wbs', version: 2, state: {} })).ok,
    ).toBe(false)
  })

  it('rejects a missing root', () => {
    const result = validateWbsState({ rootId: 'missing', nodes: {}, settings: {} })
    expect(result.ok).toBe(false)
  })

  it('rejects orphan nodes', () => {
    const state = createDefaultState()
    const bad = JSON.parse(JSON.stringify(state)) as WbsState
    bad.nodes.orphan = { ...bad.nodes.n2, id: 'orphan' }
    const result = validateWbsState(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('Orphan')
  })

  it('rejects inconsistent parent references', () => {
    const state = createDefaultState()
    const bad = JSON.parse(JSON.stringify(state)) as WbsState
    bad.nodes.n2 = { ...bad.nodes.n2, parentId: 'n3' }
    expect(validateWbsState(bad).ok).toBe(false)
  })

  it('rejects cycles', () => {
    const state = createDefaultState()
    const bad = JSON.parse(JSON.stringify(state)) as WbsState
    bad.nodes.n2 = { ...bad.nodes.n2, childIds: ['n2'] }
    expect(validateWbsState(bad).ok).toBe(false)
  })

  it('accepts depth 4 but rejects depth 5', () => {
    let state = createDefaultState()
    state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n4 at depth 3
    state = wbsReducer(state, { type: 'add-child', parentId: 'n4' }) // n5 at depth 4
    expect(validateWbsState(JSON.parse(JSON.stringify(state))).ok).toBe(true)

    const bad = JSON.parse(JSON.stringify(state)) as WbsState
    // hand-craft an illegal depth-5 node
    bad.nodes.n6 = {
      id: 'n6',
      name: 'Too deep',
      parentId: 'n5',
      childIds: [],
      dict: bad.nodes.n5.dict,
    }
    bad.nodes.n5 = { ...bad.nodes.n5, childIds: ['n6'] }
    const result = validateWbsState(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('depth')
  })

  it('rejects bad enums and non-finite budgets', () => {
    const state = createDefaultState()
    const badRisk = JSON.parse(JSON.stringify(state))
    badRisk.nodes.n2.dict.riskLikelihood = 'Extreme'
    expect(validateWbsState(badRisk).ok).toBe(false)

    const badBudget = JSON.parse(JSON.stringify(state))
    badBudget.nodes.n2.dict.budget = 'lots'
    expect(validateWbsState(badBudget).ok).toBe(false)
  })
})

describe('defaults and tolerance', () => {
  it('fills missing settings with defaults', () => {
    const state = createDefaultState()
    const raw = JSON.parse(JSON.stringify(state))
    delete raw.settings
    const result = validateWbsState(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.settings.mcIterations).toBe(5000)
      expect(result.state.settings.viewMode).toBe('Chart')
    }
  })

  it('strips invalid optional overrides instead of failing', () => {
    const state = createDefaultState()
    const raw = JSON.parse(JSON.stringify(state))
    raw.nodes.n2.dict.costOptimistic = 'abc'
    const result = validateWbsState(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.nodes.n2.dict.costOptimistic).toBeUndefined()
  })

  it('strips invalid curve fields and defaults cash flow settings', () => {
    const state = createDefaultState()
    const raw = JSON.parse(JSON.stringify(state))
    raw.nodes.n2.dict.costCurve = 'Exponential'
    raw.nodes.n2.dict.curveAlpha = -1
    raw.settings.cfBasis = 'P99'
    delete raw.settings.cfBucket
    const result = validateWbsState(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.nodes.n2.dict.costCurve).toBeUndefined()
      expect(result.state.nodes.n2.dict.curveAlpha).toBeUndefined()
      expect(result.state.settings.cfBasis).toBe('Budget')
      expect(result.state.settings.cfBucket).toBe('Monthly')
    }
  })
})
