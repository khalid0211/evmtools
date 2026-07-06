import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  computeCodes,
  createDefaultState,
  descendants,
  nodeDepth,
  orderedIds,
  setIdGenerator,
  wbsReducer,
} from './tree'
import type { WbsState } from '../../types/wbs'

let restoreIds: () => void

beforeEach(() => {
  let counter = 0
  restoreIds = setIdGenerator(() => `n${++counter}`)
})

afterEach(() => {
  restoreIds()
})

function threeLevelState(): WbsState {
  // root n1 with children n2, n3; n2 gets children n4, n5
  let state = createDefaultState() // n1, n2, n3
  state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n4
  state = wbsReducer(state, { type: 'add-child', parentId: 'n2' }) // n5
  return state
}

describe('wbsReducer - add-child', () => {
  it('adds a child and preserves ordering', () => {
    const state = threeLevelState()
    expect(state.nodes.n2.childIds).toEqual(['n4', 'n5'])
    expect(state.nodes.n4.parentId).toBe('n2')
  })

  it('refuses to add children below depth 3', () => {
    const state = threeLevelState()
    expect(nodeDepth(state.nodes, 'n4')).toBe(3)
    const next = wbsReducer(state, { type: 'add-child', parentId: 'n4' })
    expect(next).toBe(state)
  })

  it('does not mutate the previous state', () => {
    const state = createDefaultState()
    const before = JSON.parse(JSON.stringify(state))
    wbsReducer(state, { type: 'add-child', parentId: state.rootId })
    expect(state).toEqual(before)
  })
})

describe('wbsReducer - delete', () => {
  it('removes a node and all descendants', () => {
    const state = threeLevelState()
    const next = wbsReducer(state, { type: 'delete', id: 'n2' })
    expect(next.nodes.n2).toBeUndefined()
    expect(next.nodes.n4).toBeUndefined()
    expect(next.nodes.n5).toBeUndefined()
    expect(next.nodes.n1.childIds).toEqual(['n3'])
  })

  it('refuses to delete the root', () => {
    const state = createDefaultState()
    const next = wbsReducer(state, { type: 'delete', id: state.rootId })
    expect(next).toBe(state)
  })
})

describe('wbsReducer - rename and update-dict', () => {
  it('renames a node', () => {
    const state = createDefaultState()
    const next = wbsReducer(state, { type: 'rename', id: 'n2', name: 'Design' })
    expect(next.nodes.n2.name).toBe('Design')
  })

  it('patches dictionary fields and clamps negative budget to 0', () => {
    const state = createDefaultState()
    const next = wbsReducer(state, {
      type: 'update-dict',
      id: 'n2',
      patch: { budget: -50, description: 'x' },
    })
    expect(next.nodes.n2.dict.budget).toBe(0)
    expect(next.nodes.n2.dict.description).toBe('x')
  })
})

describe('wbsReducer - move', () => {
  it('swaps siblings and renumbers codes', () => {
    const state = threeLevelState()
    const next = wbsReducer(state, { type: 'move', id: 'n3', direction: 'up' })
    expect(next.nodes.n1.childIds).toEqual(['n3', 'n2'])
    const codes = computeCodes(next)
    expect(codes.n3).toBe('1.1')
    expect(codes.n2).toBe('1.2')
  })

  it('is a no-op at the edges', () => {
    const state = createDefaultState()
    const next = wbsReducer(state, { type: 'move', id: 'n2', direction: 'up' })
    expect(next).toBe(state)
  })
})

describe('codes and ordering', () => {
  it('computes positional codes 1 / 1.n / 1.n.n', () => {
    const codes = computeCodes(threeLevelState())
    expect(codes.n1).toBe('1')
    expect(codes.n2).toBe('1.1')
    expect(codes.n3).toBe('1.2')
    expect(codes.n4).toBe('1.1.1')
    expect(codes.n5).toBe('1.1.2')
  })

  it('renumbers codes after a delete', () => {
    const state = wbsReducer(threeLevelState(), { type: 'delete', id: 'n4' })
    const codes = computeCodes(state)
    expect(codes.n5).toBe('1.1.1')
  })

  it('orders nodes depth-first', () => {
    expect(orderedIds(threeLevelState())).toEqual(['n1', 'n2', 'n4', 'n5', 'n3'])
  })

  it('collects descendants transitively', () => {
    const state = threeLevelState()
    expect(descendants(state.nodes, 'n1').sort()).toEqual(['n2', 'n3', 'n4', 'n5'])
    expect(descendants(state.nodes, 'n4')).toEqual([])
  })
})
