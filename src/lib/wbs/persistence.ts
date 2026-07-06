import type {
  RiskLevel,
  WbsDictionary,
  WbsFileEnvelope,
  WbsNode,
  WbsState,
} from '../../types/wbs'
import { createDefaultSettings, MAX_DEPTH } from './tree'

export const STORAGE_KEY = 'pmtools.wbs.v1'

const RISK_VALUES: RiskLevel[] = ['Low', 'Medium', 'High']

type ValidationResult = { ok: true; state: WbsState } | { ok: false; errors: string[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function optionalFinite(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function sanitizeDict(raw: unknown, errors: string[], path: string): WbsDictionary | null {
  if (!isRecord(raw)) {
    errors.push(`${path}: dictionary data is missing`)
    return null
  }
  const budget = raw.budget
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0) {
    errors.push(`${path}: budget must be a non-negative number`)
    return null
  }
  const likelihood = raw.riskLikelihood
  const impact = raw.riskImpact
  if (!RISK_VALUES.includes(likelihood as RiskLevel)) {
    errors.push(`${path}: risk likelihood must be Low, Medium, or High`)
    return null
  }
  if (!RISK_VALUES.includes(impact as RiskLevel)) {
    errors.push(`${path}: risk impact must be Low, Medium, or High`)
    return null
  }
  return {
    description: typeof raw.description === 'string' ? raw.description : '',
    budget,
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    endDate: typeof raw.endDate === 'string' ? raw.endDate : '',
    riskLikelihood: likelihood as RiskLevel,
    riskImpact: impact as RiskLevel,
    costOptimistic: optionalFinite(raw.costOptimistic),
    costPessimistic: optionalFinite(raw.costPessimistic),
    durOptimisticDays: optionalFinite(raw.durOptimisticDays),
    durPessimisticDays: optionalFinite(raw.durPessimisticDays),
  }
}

/**
 * Structurally validate an unknown payload (imported JSON or localStorage) into a
 * WbsState. Unknown keys are stripped; missing settings are defaulted.
 */
export function validateWbsState(raw: unknown): ValidationResult {
  const errors: string[] = []
  if (!isRecord(raw)) return { ok: false, errors: ['Payload is not an object'] }

  const rootId = raw.rootId
  if (typeof rootId !== 'string' || rootId.length === 0) {
    return { ok: false, errors: ['Missing root node id'] }
  }
  if (!isRecord(raw.nodes)) return { ok: false, errors: ['Missing nodes map'] }

  const nodes: Record<string, WbsNode> = {}
  for (const [id, value] of Object.entries(raw.nodes)) {
    if (!isRecord(value)) {
      errors.push(`Node ${id}: not an object`)
      continue
    }
    const name = typeof value.name === 'string' ? value.name : ''
    const parentId = value.parentId === null ? null : value.parentId
    if (parentId !== null && typeof parentId !== 'string') {
      errors.push(`Node ${id}: invalid parent reference`)
      continue
    }
    const childIds = Array.isArray(value.childIds)
      ? value.childIds.filter((c): c is string => typeof c === 'string')
      : null
    if (childIds === null) {
      errors.push(`Node ${id}: invalid children list`)
      continue
    }
    const dict = sanitizeDict(value.dict, errors, `Node ${id}`)
    if (!dict) continue
    nodes[id] = { id, name, parentId, childIds, dict }
  }
  if (errors.length > 0) return { ok: false, errors }

  const root = nodes[rootId]
  if (!root) return { ok: false, errors: [`Root node ${rootId} not found`] }
  if (root.parentId !== null) return { ok: false, errors: ['Root node must not have a parent'] }

  // cross-consistency + cycle/depth check via DFS from root
  const visited = new Set<string>()
  const walk = (id: string, depth: number): boolean => {
    if (visited.has(id)) {
      errors.push(`Node ${id} is referenced more than once (cycle or duplicate)`)
      return false
    }
    visited.add(id)
    if (depth > MAX_DEPTH) {
      errors.push(`Node ${id} exceeds the maximum depth of ${MAX_DEPTH}`)
      return false
    }
    for (const childId of nodes[id].childIds) {
      const child = nodes[childId]
      if (!child) {
        errors.push(`Node ${id} references missing child ${childId}`)
        return false
      }
      if (child.parentId !== id) {
        errors.push(`Node ${childId} has inconsistent parent reference`)
        return false
      }
      if (!walk(childId, depth + 1)) return false
    }
    return true
  }
  if (!walk(rootId, 1)) return { ok: false, errors }

  const orphans = Object.keys(nodes).filter((id) => !visited.has(id))
  if (orphans.length > 0) {
    return { ok: false, errors: [`Orphan nodes not reachable from root: ${orphans.join(', ')}`] }
  }

  const defaults = createDefaultSettings()
  const rawSettings = isRecord(raw.settings) ? raw.settings : {}
  const settings = {
    advanced: typeof rawSettings.advanced === 'boolean' ? rawSettings.advanced : defaults.advanced,
    usePert: typeof rawSettings.usePert === 'boolean' ? rawSettings.usePert : defaults.usePert,
    viewMode:
      rawSettings.viewMode === 'Chart' || rawSettings.viewMode === 'Outline'
        ? rawSettings.viewMode
        : defaults.viewMode,
    mcIterations:
      optionalFinite(rawSettings.mcIterations) && (rawSettings.mcIterations as number) > 0
        ? (rawSettings.mcIterations as number)
        : defaults.mcIterations,
    mcSeed: optionalFinite(rawSettings.mcSeed) ?? defaults.mcSeed,
  }

  return { ok: true, state: { rootId, nodes, settings } }
}

export function makeEnvelope(state: WbsState): WbsFileEnvelope {
  return { app: 'pm-tools-wbs', version: 1, savedAt: new Date().toISOString(), state }
}

export function saveToStorage(state: WbsState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeEnvelope(state)))
    return true
  } catch {
    return false
  }
}

export function loadFromStorage(): WbsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.app !== 'pm-tools-wbs') return null
    const result = validateWbsState(parsed.state)
    return result.ok ? result.state : null
  } catch {
    return null
  }
}

export function parseImportedJson(text: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['File is not valid JSON'] }
  }
  if (!isRecord(parsed)) return { ok: false, errors: ['File is not a WBS export'] }
  if (parsed.app !== 'pm-tools-wbs') {
    return { ok: false, errors: ['File was not exported by the WBS Maker (missing app marker)'] }
  }
  if (parsed.version !== 1) {
    return { ok: false, errors: [`Unsupported file version: ${String(parsed.version)}`] }
  }
  return validateWbsState(parsed.state)
}

export function exportJson(state: WbsState) {
  const blob = new Blob([JSON.stringify(makeEnvelope(state), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  a.href = url
  a.download = `wbs_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
