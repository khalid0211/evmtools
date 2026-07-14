import { describe, expect, it } from 'vitest'
import type { PortfolioState } from '../../types/portfolio'
import { makeEnvelope, parseImportedJson, validatePortfolioState } from './persistence'
import { createProject } from './state'

function sampleState(): PortfolioState {
  return {
    name: 'Roundtrip',
    projects: [
      createProject({ id: 'a', name: 'A', bac: 100, planStart: '2026-01-01', planFinish: '2026-12-31' }),
      createProject({ id: 'b', name: 'B', bac: 60, curve: 'Linear' }),
    ],
    funding: { granularity: 'Quarterly', amounts: { '2026-Q1': 40, '2026-Q2': 35 } },
    statusHistory: [
      { dataDate: '2026-07-01', entries: { a: { ac: 40, pctComplete: 50 } } },
    ],
  }
}

describe('parseImportedJson', () => {
  it('round-trips an exported envelope', () => {
    const state = sampleState()
    const text = JSON.stringify(makeEnvelope(state), null, 2)
    const result = parseImportedJson(text)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state).toEqual(state)
  })

  it('rejects non-JSON, foreign files and unsupported versions', () => {
    expect(parseImportedJson('not json').ok).toBe(false)
    expect(parseImportedJson(JSON.stringify({ app: 'pm-tools-wbs', version: 1, state: {} })).ok).toBe(false)
    const wrongVersion = { ...makeEnvelope(sampleState()), version: 2 }
    expect(parseImportedJson(JSON.stringify(wrongVersion)).ok).toBe(false)
  })
})

describe('validatePortfolioState', () => {
  it('fails on structural breakage', () => {
    expect(validatePortfolioState(null).ok).toBe(false)
    expect(validatePortfolioState({ projects: 'nope' }).ok).toBe(false)
    expect(validatePortfolioState({ projects: [{ id: 'a', bac: 'lots' }] }).ok).toBe(false)
    expect(validatePortfolioState({ projects: [{ bac: 5 }] }).ok).toBe(false)
    expect(
      validatePortfolioState({ projects: [{ id: 'a', bac: 5 }, { id: 'a', bac: 5 }] }).ok,
    ).toBe(false)
  })

  it('sanitizes recoverable problems', () => {
    const result = validatePortfolioState({
      name: 42,
      projects: [
        { id: 'a', bac: 100, planStart: '2026-01-01', planFinish: '2026-12-31', curve: 'Wiggly', alpha: -1, beta: 0 },
      ],
      funding: {
        granularity: 'Quarterly',
        amounts: { '2026-Q1': 40, '2026-01': 10, junk: 5, '2026-Q2': -3 },
      },
      statusHistory: [
        { dataDate: '2026-07-01', entries: { a: { ac: -5, pctComplete: 150 }, ghost: { ac: 1, pctComplete: 1 } } },
        { dataDate: '2026-07-01', entries: { a: { ac: 10, pctComplete: 20 } } },
        { dataDate: 'bogus', entries: {} },
        { dataDate: '2026-04-01', entries: {} },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const state = result.state
    expect(state.name).toBe('Untitled Portfolio')
    expect(state.projects[0].curve).toBe('Linear')
    expect(state.projects[0].alpha).toBe(2)
    expect(state.projects[0].beta).toBe(2)
    // only well-formed keys matching the granularity survive
    expect(state.funding.amounts).toEqual({ '2026-Q1': 40 })
    // deduped (last wins), sorted, unknown ids stripped, values clamped
    expect(state.statusHistory.map((s) => s.dataDate)).toEqual(['2026-04-01', '2026-07-01'])
    const snap = state.statusHistory[1]
    expect(snap.entries.a).toEqual({ ac: 10, pctComplete: 20 })
    expect('ghost' in snap.entries).toBe(false)
  })

  it('clamps out-of-range status values', () => {
    const result = validatePortfolioState({
      projects: [{ id: 'a', bac: 100 }],
      statusHistory: [
        { dataDate: '2026-07-01', entries: { a: { ac: -5, pctComplete: 150 } } },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.statusHistory[0].entries.a).toEqual({ ac: 0, pctComplete: 100 })
    }
  })
})
