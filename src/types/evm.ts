export type DurationMode = 'duration' | 'dates'
export type PvMethod = 'Linear' | 'S-Curve' | 'Enter Value'
export type EvMethod = 'Enter Value' | '% Complete' | 'Estimate'

export interface EvmInputs {
  bac: number
  ac: number

  /** Whether duration is entered directly (months) or derived from dates. */
  durationMode: DurationMode
  /** Used when durationMode === 'duration'. In months. */
  originalDurationInput: number
  actualDurationInput: number
  /** Used when durationMode === 'dates'. ISO date strings (yyyy-mm-dd). */
  planStart: string
  planFinish: string
  statusDate: string

  pvMethod: PvMethod
  pvManual: number
  /** S-curve shape parameters (Beta distribution), default 2/2. */
  alpha: number
  beta: number

  evMethod: EvMethod
  evManual: number
  percentComplete: number
  /** Annual inflation rate (%), used by the "Estimate" EV method. */
  inflationRate: number
}

export interface EvmResult {
  /** Resolved duration values in months, regardless of durationMode. */
  originalDuration: number
  actualDuration: number

  ev: number
  pv: number
  timeElapsedPct: number
  budgetUtilizedPct: number
  completionEfficiency: number
  es: number | null
  spie: number | null
  cv: number
  sv: number
  cpi: number | null
  spi: number
  etc: number | null
  eac: number | null
  vac: number | null
  tcpiBac: number
  costStatus: 'Under Budget' | 'Over Budget' | 'On Budget'
  scheduleStatus: 'Ahead' | 'Behind' | 'On Schedule'
  healthScore: number
  healthStatus: 'Excellent' | 'At Risk' | 'Critical'
  valid: boolean
  warning?: string
}

export interface EvmCurveSeries {
  pvTimeline: number[]
  pvCurve: number[]
  actualTimeline: number[]
  evCurve: number[]
  acCurve: number[]
}
