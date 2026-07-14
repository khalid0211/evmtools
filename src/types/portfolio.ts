export type CurveType = 'Linear' | 'S-Curve'
export type PeriodGranularity = 'Monthly' | 'Quarterly' | 'Yearly'

export interface PortfolioProject {
  id: string
  name: string
  /** Budget at Completion (unit-agnostic, consistent with the other tools). */
  bac: number
  /** ISO yyyy-mm-dd, parsed as UTC. */
  planStart: string
  planFinish: string
  curve: CurveType
  /** Beta-distribution shape parameters; only used when curve === 'S-Curve'. */
  alpha: number
  beta: number
}

export interface FundingSchedule {
  granularity: PeriodGranularity
  /**
   * Sparse funding amounts keyed by canonical calendar period:
   * '2026-01' (Monthly) | '2026-Q1' (Quarterly) | '2026' (Yearly).
   * A missing key means zero funding in that period.
   */
  amounts: Record<string, number>
}

export interface ProjectStatusEntry {
  /** Cumulative Actual Cost as of the snapshot's data date. */
  ac: number
  /** Physical % complete, 0..100. */
  pctComplete: number
}

export interface StatusSnapshot {
  /** ISO yyyy-mm-dd data date; unique within the history. */
  dataDate: string
  /** Keyed by project id; a missing project reads as {ac: 0, pctComplete: 0}. */
  entries: Record<string, ProjectStatusEntry>
}

export interface PortfolioState {
  name: string
  projects: PortfolioProject[]
  funding: FundingSchedule
  /** Invariant: sorted ascending by dataDate, dates unique. */
  statusHistory: StatusSnapshot[]
}

export interface PortfolioFileEnvelope {
  app: 'pm-tools-portfolio'
  version: 1
  savedAt: string
  state: PortfolioState
}
