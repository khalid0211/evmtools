import type {
  WbsAction,
  WbsDictionary,
  WbsNode,
  WbsSettings,
  WbsState,
} from '../../types/wbs'

export const MAX_DEPTH = 3

let idGenerator: () => string = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`

export function newId(): string {
  return idGenerator()
}

/** Test hook: inject a deterministic id generator. Returns a restore function. */
export function setIdGenerator(gen: () => string): () => void {
  const prev = idGenerator
  idGenerator = gen
  return () => {
    idGenerator = prev
  }
}

export function createDefaultDict(): WbsDictionary {
  return {
    description: '',
    budget: 0,
    startDate: '',
    endDate: '',
    riskLikelihood: 'Low',
    riskImpact: 'Low',
  }
}

export function createDefaultSettings(): WbsSettings {
  return {
    advanced: false,
    usePert: false,
    viewMode: 'Chart',
    mcIterations: 5000,
    mcSeed: 42,
  }
}

export function createDefaultState(): WbsState {
  const rootId = newId()
  const childA = newId()
  const childB = newId()
  const nodes: Record<string, WbsNode> = {
    [rootId]: {
      id: rootId,
      name: 'New Project',
      parentId: null,
      childIds: [childA, childB],
      dict: createDefaultDict(),
    },
    [childA]: {
      id: childA,
      name: 'Work Package 1',
      parentId: rootId,
      childIds: [],
      dict: createDefaultDict(),
    },
    [childB]: {
      id: childB,
      name: 'Work Package 2',
      parentId: rootId,
      childIds: [],
      dict: createDefaultDict(),
    },
  }
  return { rootId, nodes, settings: createDefaultSettings() }
}

export function isLeaf(node: WbsNode): boolean {
  return node.childIds.length === 0
}

export function nodeDepth(nodes: Record<string, WbsNode>, id: string): number {
  let depth = 1
  let current = nodes[id]
  while (current && current.parentId !== null) {
    depth += 1
    current = nodes[current.parentId]
  }
  return depth
}

/** WBS codes derived from position: root '1', children '1.n', grandchildren '1.n.n'. */
export function computeCodes(state: WbsState): Record<string, string> {
  const codes: Record<string, string> = {}
  const visit = (id: string, code: string) => {
    codes[id] = code
    const node = state.nodes[id]
    node.childIds.forEach((childId, i) => visit(childId, `${code}.${i + 1}`))
  }
  visit(state.rootId, '1')
  return codes
}

/** Depth-first node order (root first), matching outline and CSV row order. */
export function orderedIds(state: WbsState): string[] {
  const out: string[] = []
  const visit = (id: string) => {
    out.push(id)
    state.nodes[id].childIds.forEach(visit)
  }
  visit(state.rootId)
  return out
}

export function descendants(nodes: Record<string, WbsNode>, id: string): string[] {
  const out: string[] = []
  const visit = (nodeId: string) => {
    for (const childId of nodes[nodeId].childIds) {
      out.push(childId)
      visit(childId)
    }
  }
  visit(id)
  return out
}

export function wbsReducer(state: WbsState, action: WbsAction): WbsState {
  switch (action.type) {
    case 'add-child': {
      const parent = state.nodes[action.parentId]
      if (!parent) return state
      if (nodeDepth(state.nodes, action.parentId) >= MAX_DEPTH) return state
      const id = newId()
      const child: WbsNode = {
        id,
        name: 'New Item',
        parentId: action.parentId,
        childIds: [],
        dict: createDefaultDict(),
      }
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: child,
          [parent.id]: { ...parent, childIds: [...parent.childIds, id] },
        },
      }
    }
    case 'rename': {
      const node = state.nodes[action.id]
      if (!node) return state
      return {
        ...state,
        nodes: { ...state.nodes, [node.id]: { ...node, name: action.name } },
      }
    }
    case 'delete': {
      const node = state.nodes[action.id]
      if (!node || node.parentId === null) return state
      const removed = new Set([action.id, ...descendants(state.nodes, action.id)])
      const nodes: Record<string, WbsNode> = {}
      for (const [id, n] of Object.entries(state.nodes)) {
        if (!removed.has(id)) nodes[id] = n
      }
      const parent = nodes[node.parentId]
      nodes[parent.id] = {
        ...parent,
        childIds: parent.childIds.filter((id) => id !== action.id),
      }
      return { ...state, nodes }
    }
    case 'update-dict': {
      const node = state.nodes[action.id]
      if (!node) return state
      const dict = { ...node.dict, ...action.patch }
      if (!Number.isFinite(dict.budget) || dict.budget < 0) dict.budget = 0
      return {
        ...state,
        nodes: { ...state.nodes, [node.id]: { ...node, dict } },
      }
    }
    case 'move': {
      const node = state.nodes[action.id]
      if (!node || node.parentId === null) return state
      const parent = state.nodes[node.parentId]
      const idx = parent.childIds.indexOf(action.id)
      const target = action.direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= parent.childIds.length) return state
      const childIds = [...parent.childIds]
      ;[childIds[idx], childIds[target]] = [childIds[target], childIds[idx]]
      return {
        ...state,
        nodes: { ...state.nodes, [parent.id]: { ...parent, childIds } },
      }
    }
    case 'update-settings': {
      return { ...state, settings: { ...state.settings, ...action.patch } }
    }
    case 'replace-state': {
      return action.state
    }
    default:
      return state
  }
}
