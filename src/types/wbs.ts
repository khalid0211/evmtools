export type RiskLevel = 'Low' | 'Medium' | 'High'
export type WbsViewMode = 'Chart' | 'Outline'
export type CashFlowCurve = 'Linear' | 'S-Curve'
export type CashFlowBasis = 'Budget' | 'PERT' | 'P50' | 'P80' | 'P90'
export type CashFlowBucket = 'Monthly' | 'Weekly'

export interface WbsDictionary {
  description: string
  budget: number
  startDate: string
  endDate: string
  riskLikelihood: RiskLevel
  riskImpact: RiskLevel
  /** undefined ⇒ equals most-likely (budget) */
  costOptimistic?: number
  costPessimistic?: number
  /** undefined ⇒ equals most-likely duration derived from start/end dates */
  durOptimisticDays?: number
  durPessimisticDays?: number
  /** undefined ⇒ Linear */
  costCurve?: CashFlowCurve
  /** undefined ⇒ 2 (only used when costCurve is 'S-Curve') */
  curveAlpha?: number
  curveBeta?: number
}

export interface WbsNode {
  id: string
  name: string
  parentId: string | null
  childIds: string[]
  /** Active only when the node has no children (leaf = dictionary item). */
  dict: WbsDictionary
}

export interface WbsSettings {
  advanced: boolean
  usePert: boolean
  viewMode: WbsViewMode
  mcIterations: number
  mcSeed: number
  cfBasis: CashFlowBasis
  cfBucket: CashFlowBucket
}

export interface WbsState {
  rootId: string
  nodes: Record<string, WbsNode>
  settings: WbsSettings
}

export type WbsAction =
  | { type: 'add-child'; parentId: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'update-dict'; id: string; patch: Partial<WbsDictionary> }
  | { type: 'move'; id: string; direction: 'up' | 'down' }
  | { type: 'update-settings'; patch: Partial<WbsSettings> }
  | { type: 'replace-state'; state: WbsState }

// ---- computed (never stored) ----

export interface NodeRollup {
  code: string
  depth: 1 | 2 | 3
  isLeaf: boolean
  budget: number
  pertCost: number
  activeCost: number
  startDate: string | null
  endDate: string | null
  warnings: string[]
}

export interface RiskCell {
  likelihood: RiskLevel
  impact: RiskLevel
  score: number
  totalCost: number
  count: number
}

export interface WbsComputed {
  perNode: Record<string, NodeRollup>
  orderedIds: string[]
  totalCost: number
  projectStart: string | null
  projectEnd: string | null
  riskMatrix: RiskCell[]
  leafCount: number
  valid: boolean
  warnings: string[]
}

export interface SummaryStats {
  mean: number
  std: number
  min: number
  max: number
  p10: number
  p50: number
  p80: number
  p90: number
}

export interface MonteCarloResult {
  iterations: number
  seed: number
  costs: number[]
  durations: number[]
  costStats: SummaryStats
  durationStats: SummaryStats
  /** Leaves excluded from the duration model (missing/invalid dates). */
  excludedFromDuration: number
}

export interface WbsCashFlowSeries {
  labels: string[]
  perPeriod: number[]
  cumulative: number[]
  total: number
  /** Leaves excluded for missing/invalid dates. */
  excluded: number
}

export interface WbsFileEnvelope {
  app: 'pm-tools-wbs'
  version: 1
  savedAt: string
  state: WbsState
}
