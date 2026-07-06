import type {
  NodeRollup,
  RiskCell,
  RiskLevel,
  WbsComputed,
  WbsDictionary,
  WbsState,
} from '../../types/wbs'
import { isLeaf, nodeDepth, orderedIds as dfsOrder } from './tree'

const MS_DAY = 86_400_000

export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High']

export function riskLevelValue(level: RiskLevel): number {
  return level === 'Low' ? 1 : level === 'Medium' ? 2 : 3
}

export type RiskTone = 'good' | 'warn' | 'danger'

/** Conventional 3×3 matrix zoning: score ≤ 2 green, 3–4 yellow, ≥ 6 red. */
export function riskTone(score: number): RiskTone {
  if (score <= 2) return 'good'
  if (score <= 4) return 'warn'
  return 'danger'
}

export function pertMean(optimistic: number, mostLikely: number, pessimistic: number): number {
  return (optimistic + 4 * mostLikely + pessimistic) / 6
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.round((end - start) / MS_DAY))
}

/** Cost O/ML/P with unset overrides defaulting to most-likely, normalized so O ≤ ML ≤ P. */
export function costTriple(dict: WbsDictionary): { o: number; ml: number; p: number } {
  const ml = dict.budget
  const o = Math.min(dict.costOptimistic ?? ml, ml)
  const p = Math.max(dict.costPessimistic ?? ml, ml)
  return { o, ml, p }
}

/** Duration O/ML/P in days; ML derived from the entered dates. */
export function durationTriple(dict: WbsDictionary): { o: number; ml: number; p: number } {
  const ml = dict.startDate && dict.endDate ? daysBetween(dict.startDate, dict.endDate) : 0
  const o = Math.min(dict.durOptimisticDays ?? ml, ml)
  const p = Math.max(dict.durPessimisticDays ?? ml, ml)
  return { o, ml, p }
}

function leafWarnings(dict: WbsDictionary): string[] {
  const warnings: string[] = []
  if (dict.startDate && dict.endDate && dict.endDate < dict.startDate) {
    warnings.push('End date is before start date')
  }
  if (!dict.startDate || !dict.endDate) {
    warnings.push('Dates not set — excluded from schedule roll-up')
  }
  if (dict.costOptimistic !== undefined && dict.costOptimistic > dict.budget) {
    warnings.push('Optimistic cost exceeds most likely')
  }
  if (dict.costPessimistic !== undefined && dict.costPessimistic < dict.budget) {
    warnings.push('Pessimistic cost is below most likely')
  }
  return warnings
}

export function computeWbs(state: WbsState): WbsComputed {
  const { nodes, settings } = state
  const usePert = settings.advanced && settings.usePert
  const perNode: Record<string, NodeRollup> = {}
  const codes: Record<string, string> = {}
  const ordered = dfsOrder(state)

  // codes in one DFS pass
  const visitCodes = (id: string, code: string) => {
    codes[id] = code
    nodes[id].childIds.forEach((childId, i) => visitCodes(childId, `${code}.${i + 1}`))
  }
  visitCodes(state.rootId, '1')

  const rollup = (id: string): NodeRollup => {
    const node = nodes[id]
    const depth = nodeDepth(nodes, id) as 1 | 2 | 3

    if (isLeaf(node)) {
      const { o, ml, p } = costTriple(node.dict)
      const pertCost = pertMean(o, ml, p)
      const warnings = leafWarnings(node.dict)
      const hasDates = Boolean(node.dict.startDate && node.dict.endDate)
      const entry: NodeRollup = {
        code: codes[id],
        depth,
        isLeaf: true,
        budget: node.dict.budget,
        pertCost,
        activeCost: usePert ? pertCost : node.dict.budget,
        startDate: hasDates ? node.dict.startDate : null,
        endDate: hasDates ? node.dict.endDate : null,
        warnings,
      }
      perNode[id] = entry
      return entry
    }

    let budget = 0
    let pertCost = 0
    let activeCost = 0
    let startDate: string | null = null
    let endDate: string | null = null
    for (const childId of node.childIds) {
      const child = rollup(childId)
      budget += child.budget
      pertCost += child.pertCost
      activeCost += child.activeCost
      if (child.startDate && (!startDate || child.startDate < startDate)) {
        startDate = child.startDate
      }
      if (child.endDate && (!endDate || child.endDate > endDate)) {
        endDate = child.endDate
      }
    }
    const entry: NodeRollup = {
      code: codes[id],
      depth,
      isLeaf: false,
      budget,
      pertCost,
      activeCost,
      startDate,
      endDate,
      warnings: [],
    }
    perNode[id] = entry
    return entry
  }

  const rootRollup = rollup(state.rootId)

  // risk matrix over leaves, summing the active estimate
  const riskMatrix: RiskCell[] = []
  for (const likelihood of RISK_LEVELS) {
    for (const impact of RISK_LEVELS) {
      riskMatrix.push({
        likelihood,
        impact,
        score: riskLevelValue(likelihood) * riskLevelValue(impact),
        totalCost: 0,
        count: 0,
      })
    }
  }
  let leafCount = 0
  for (const id of ordered) {
    const node = nodes[id]
    if (!isLeaf(node)) continue
    leafCount += 1
    const cell = riskMatrix.find(
      (c) => c.likelihood === node.dict.riskLikelihood && c.impact === node.dict.riskImpact,
    )!
    cell.totalCost += perNode[id].activeCost
    cell.count += 1
  }

  const warnings: string[] = []
  for (const id of ordered) {
    for (const w of perNode[id].warnings) {
      warnings.push(`${perNode[id].code} ${nodes[id].name}: ${w}`)
    }
  }
  const valid = !warnings.some((w) => w.includes('End date is before start date'))

  return {
    perNode,
    orderedIds: ordered,
    totalCost: rootRollup.activeCost,
    projectStart: rootRollup.startDate,
    projectEnd: rootRollup.endDate,
    riskMatrix,
    leafCount,
    valid,
    warnings,
  }
}
