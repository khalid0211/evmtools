import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildMermaid, buildOutlineRows } from './export'
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

function fixture(): WbsState {
  let state = createDefaultState() // n1 root, n2, n3
  state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n4
  state = wbsReducer(state, { type: 'rename', id: 'n2', name: 'Civil "Works" <phase 1>' })
  state = wbsReducer(
    state,
    dictPatch('n4', { budget: 1000, startDate: '2026-01-01', endDate: '2026-03-01' }),
  )
  state = wbsReducer(
    state,
    dictPatch('n3', { budget: 500, riskLikelihood: 'High', riskImpact: 'High' }),
  )
  return state
}

describe('buildMermaid', () => {
  it('emits a top-down flowchart with one node per WBS element and parent-child edges', () => {
    const state = fixture()
    const mermaid = buildMermaid(state, computeWbs(state))
    expect(mermaid.startsWith('graph TD')).toBe(true)
    // root rolls up n4's dates, so its label carries budget and date lines
    expect(mermaid).toContain('n1["1 New Project<br/>Budget: 1,500<br/>2026-01-01 → 2026-03-01"]')
    expect(mermaid).toContain('n1 --> n1_1')
    expect(mermaid).toContain('n1 --> n1_2')
    expect(mermaid).toContain('n1_1 --> n1_1_1')
    // dates included when set
    expect(mermaid).toContain('2026-01-01 → 2026-03-01')
  })

  it('sanitizes characters that break Mermaid labels', () => {
    const state = fixture()
    const mermaid = buildMermaid(state, computeWbs(state))
    expect(mermaid).toContain("Civil 'Works' (phase 1)")
    expect(mermaid).not.toMatch(/\[".*".*"\]/) // no stray quotes inside labels
  })

  it('colors leaves by risk category and leaves parents unstyled', () => {
    const state = fixture()
    const mermaid = buildMermaid(state, computeWbs(state))
    expect(mermaid).toContain('class n1_1_1 riskLow')
    expect(mermaid).toContain('class n1_2 riskHigh')
    expect(mermaid).not.toContain('class n1 risk') // root is a parent
    expect(mermaid).toContain('classDef riskHigh')
  })
})

describe('buildOutlineRows', () => {
  it('produces one row per node in DFS order with codes', () => {
    const state = fixture()
    const rows = buildOutlineRows(state, computeWbs(state))
    expect(rows.map((r) => r.code)).toEqual(['1', '1.1', '1.1.1', '1.2'])
    expect(rows[0].budget).toBe('1500.00')
    expect(rows[3].risk_score).toBe(9)
  })
})
