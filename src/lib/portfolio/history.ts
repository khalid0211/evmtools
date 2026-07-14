import type {
  PortfolioProject,
  ProjectStatusEntry,
  StatusSnapshot,
} from '../../types/portfolio'
import { isValidProject, portfolioPv } from './cashflow'
import { parseUtc } from './periods'

/** Ascending by data date; input is not mutated. */
export function sortedHistory(history: StatusSnapshot[]): StatusSnapshot[] {
  return [...history].sort((a, b) => a.dataDate.localeCompare(b.dataDate))
}

export function latestSnapshot(history: StatusSnapshot[]): StatusSnapshot | null {
  if (history.length === 0) return null
  return sortedHistory(history)[history.length - 1]
}

export function entryFor(snapshot: StatusSnapshot, projectId: string): ProjectStatusEntry {
  return snapshot.entries[projectId] ?? { ac: 0, pctComplete: 0 }
}

export interface ActualCurves {
  /** Snapshot data dates, ascending. */
  dates: string[]
  ev: number[]
  ac: number[]
  /** Aggregate PV at each snapshot date, for tabular comparison. */
  pv: number[]
}

/** Portfolio EV/AC progression through the status history. */
export function buildActualCurves(
  projects: PortfolioProject[],
  history: StatusSnapshot[],
): ActualCurves {
  const valid = projects.filter(isValidProject)
  const snapshots = sortedHistory(history)
  const dates: string[] = []
  const ev: number[] = []
  const ac: number[] = []
  const pv: number[] = []
  for (const snap of snapshots) {
    const ms = parseUtc(snap.dataDate)
    if (!Number.isFinite(ms)) continue
    let evTotal = 0
    let acTotal = 0
    for (const p of valid) {
      const entry = entryFor(snap, p.id)
      evTotal += p.bac * (entry.pctComplete / 100)
      acTotal += entry.ac
    }
    dates.push(snap.dataDate)
    ev.push(evTotal)
    ac.push(acTotal)
    pv.push(portfolioPv(valid, ms))
  }
  return { dates, ev, ac, pv }
}

export interface PvTimeSeries {
  dates: string[]
  values: number[]
}

/** Smooth aggregate PV curve sampled across the portfolio plan span. */
export function samplePortfolioPvCurve(
  projects: PortfolioProject[],
  samples = 80,
): PvTimeSeries | null {
  const valid = projects.filter(isValidProject)
  if (valid.length === 0) return null
  const startMs = Math.min(...valid.map((p) => parseUtc(p.planStart)))
  const finishMs = Math.max(...valid.map((p) => parseUtc(p.planFinish)))
  if (finishMs <= startMs) {
    const date = new Date(startMs).toISOString().slice(0, 10)
    return { dates: [date], values: [portfolioPv(valid, startMs + 1)] }
  }
  const dates: string[] = []
  const values: number[] = []
  for (let i = 0; i <= samples; i++) {
    const ms = startMs + ((finishMs - startMs) * i) / samples
    dates.push(new Date(ms).toISOString().slice(0, 10))
    values.push(portfolioPv(valid, ms))
  }
  return { dates, values }
}
