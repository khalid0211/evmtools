import type { PeriodGranularity, PortfolioProject } from '../../types/portfolio'
import { scurveCdf } from '../shared/statistics'
import { enumeratePeriods, parsePeriodKey, parseUtc, type Period } from './periods'

export interface PortfolioCashflowSeries {
  periods: Period[]
  labels: string[]
  /** Portfolio total per period. */
  perPeriod: number[]
  cumulative: number[]
  /** Per-project rows aligned to `periods`, in project order. */
  perProject: { id: string; name: string; values: number[] }[]
  total: number
  /** Projects skipped for invalid dates or non-positive BAC. */
  excluded: number
}

/** A project participates in calculations only with a positive BAC and a valid date range. */
export function isValidProject(p: PortfolioProject): boolean {
  if (!(p.bac > 0)) return false
  if (!p.planStart || !p.planFinish) return false
  const startMs = parseUtc(p.planStart)
  const endMs = parseUtc(p.planFinish)
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
}

/**
 * Cumulative fraction (0..1) of a project's BAC consumed by calendar time
 * `ms` — linear or S-curve (regularized beta CDF). Zero-duration projects
 * step from 0 to 1 at planStart.
 */
export function projectFraction(p: PortfolioProject, ms: number): number {
  const startMs = parseUtc(p.planStart)
  const endMs = parseUtc(p.planFinish)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0
  const span = endMs - startMs
  if (span === 0) return ms > startMs ? 1 : 0
  const t = Math.max(0, Math.min(1, (ms - startMs) / span))
  return p.curve === 'S-Curve' ? scurveCdf(t, p.alpha, p.beta) : t
}

/** Aggregate planned value of the portfolio at calendar time `ms` (monotone in ms). */
export function portfolioPv(projects: PortfolioProject[], ms: number): number {
  let total = 0
  for (const p of projects) {
    if (!isValidProject(p)) continue
    total += p.bac * projectFraction(p, ms)
  }
  return total
}

/**
 * Spread every valid project's BAC over its date range along its curve and
 * bucket into calendar periods at the given granularity. Per-period values
 * are CDF differences, so totals are exact at any granularity.
 * `extraPeriodKeys` (e.g. funded periods outside the plan range) extend the
 * period axis; keys of a different granularity are ignored.
 */
export function computePortfolioCashflow(
  projects: PortfolioProject[],
  granularity: PeriodGranularity,
  extraPeriodKeys: string[] = [],
): PortfolioCashflowSeries | null {
  const valid = projects.filter(isValidProject)
  const excluded = projects.length - valid.length
  if (valid.length === 0) return null

  let minMs = Math.min(...valid.map((p) => parseUtc(p.planStart)))
  let maxMs = Math.max(...valid.map((p) => parseUtc(p.planFinish)))
  for (const key of extraPeriodKeys) {
    const parsed = parsePeriodKey(key)
    if (!parsed || parsed.granularity !== granularity) continue
    minMs = Math.min(minMs, parsed.startMs)
    maxMs = Math.max(maxMs, parsed.endMs)
  }

  // maxMs - 1 keeps a range ending exactly on a period boundary from adding a trailing empty period
  const periods = enumeratePeriods(minMs, Math.max(minMs, maxMs - 1), granularity)

  const perProject = valid.map((p) => ({
    id: p.id,
    name: p.name,
    values: periods.map(
      (per) => p.bac * (projectFraction(p, per.endMs) - projectFraction(p, per.startMs)),
    ),
  }))

  const perPeriod = periods.map((_, i) =>
    perProject.reduce((sum, row) => sum + row.values[i], 0),
  )
  const cumulative: number[] = []
  let running = 0
  for (const v of perPeriod) {
    running += v
    cumulative.push(running)
  }

  return {
    periods,
    labels: periods.map((p) => p.label),
    perPeriod,
    cumulative,
    perProject,
    total: running,
    excluded,
  }
}
