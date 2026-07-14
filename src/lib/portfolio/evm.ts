import type { EvmInputs } from '../../types/evm'
import type { PortfolioProject, ProjectStatusEntry, StatusSnapshot } from '../../types/portfolio'
import { computeEvm } from '../evm/calculations'
import { isValidProject, portfolioPv, projectFraction } from './cashflow'
import { parseUtc } from './periods'

const MS_DAY = 86_400_000
const DAYS_PER_MONTH = 30.44

function msToMonths(ms: number): number {
  return Math.max(ms / (MS_DAY * DAYS_PER_MONTH), 0)
}

/** ISO date `months` (30.44-day) months after `startIso`. */
export function isoAddMonths(startIso: string, months: number): string {
  const ms = parseUtc(startIso) + months * DAYS_PER_MONTH * MS_DAY
  return new Date(ms).toISOString().slice(0, 10)
}

export interface ProjectStatusRow {
  projectId: string
  name: string
  bac: number
  pv: number
  ev: number
  ac: number
  pctComplete: number
  cv: number
  sv: number
  spi: number
  spie: number | null
  cpi: number | null
  eac: number | null
  /** Planned duration in months (from plan dates). */
  plannedDurationMonths: number
  /** IEAC(t) = planned duration / SPIe. */
  expectedDurationMonths: number | null
  expectedFinish: string | null
  /** expectedDuration − plannedDuration; positive = delay. */
  slipMonths: number | null
  health: 'Excellent' | 'At Risk' | 'Critical'
  /** False when the data date is on/before plan start — indices are meaningless. */
  started: boolean
  valid: boolean
}

function toEvmInputs(
  p: PortfolioProject,
  dataDate: string,
  entry: ProjectStatusEntry,
): EvmInputs {
  return {
    bac: p.bac,
    ac: entry.ac,
    durationMode: 'dates',
    originalDurationInput: 0,
    actualDurationInput: 0,
    planStart: p.planStart,
    planFinish: p.planFinish,
    statusDate: dataDate,
    pvMethod: p.curve,
    pvManual: 0,
    alpha: p.alpha,
    beta: p.beta,
    evMethod: '% Complete',
    evManual: 0,
    percentComplete: entry.pctComplete,
    inflationRate: 0,
  }
}

/** Per-project EVM status at a data date, via the shared computeEvm engine. */
export function computeProjectStatus(
  p: PortfolioProject,
  dataDate: string,
  entry: ProjectStatusEntry,
): ProjectStatusRow {
  const res = computeEvm(toEvmInputs(p, dataDate, entry))
  const started = parseUtc(dataDate) > parseUtc(p.planStart)
  const expectedDurationMonths =
    res.spie !== null && res.spie > 0 ? res.originalDuration / res.spie : null
  return {
    projectId: p.id,
    name: p.name,
    bac: p.bac,
    pv: res.pv,
    ev: res.ev,
    ac: entry.ac,
    pctComplete: entry.pctComplete,
    cv: res.cv,
    sv: res.sv,
    spi: res.spi,
    spie: res.spie,
    cpi: res.cpi,
    eac: res.eac,
    plannedDurationMonths: res.originalDuration,
    expectedDurationMonths,
    expectedFinish:
      expectedDurationMonths !== null ? isoAddMonths(p.planStart, expectedDurationMonths) : null,
    slipMonths:
      expectedDurationMonths !== null ? expectedDurationMonths - res.originalDuration : null,
    health: res.healthStatus,
    started,
    valid: res.valid,
  }
}

export interface PortfolioRollup {
  dataDate: string
  portfolioStart: string
  portfolioFinish: string
  plannedDurationMonths: number
  bac: number
  pv: number
  ev: number
  ac: number
  spi: number | null
  cpi: number | null
  /** Earned schedule in months from portfolio start. */
  es: number | null
  spie: number | null
  etc: number | null
  eac: number | null
  vac: number | null
  expectedDurationMonths: number | null
  expectedFinish: string | null
  /** Positive = expected delay, negative = early, per SPIe. */
  slipMonths: number | null
}

/**
 * Portfolio earned schedule: the calendar point where the aggregate PV curve
 * equals total EV, in months from portfolio start. Bisection on the monotone
 * portfolioPv curve.
 */
function findPortfolioEs(
  projects: PortfolioProject[],
  evTotal: number,
  startMs: number,
  finishMs: number,
): number | null {
  const pvAtFinish = portfolioPv(projects, finishMs)
  if (pvAtFinish <= 0 || finishMs <= startMs) return null
  if (evTotal <= 0) return 0
  if (evTotal >= pvAtFinish) return msToMonths(finishMs - startMs)
  let low = startMs
  let high = finishMs
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const pv = portfolioPv(projects, mid)
    if (Math.abs(pv - evTotal) < 1e-6 * pvAtFinish) return msToMonths(mid - startMs)
    if (pv < evTotal) low = mid
    else high = mid
  }
  return msToMonths((low + high) / 2 - startMs)
}

/**
 * Roll the portfolio up at a data date: PV from each project's own curve,
 * EV = Σ %complete × BAC, AC = Σ actuals; SPIe from earned schedule on the
 * aggregate PV curve. Null when no project is valid.
 */
export function computePortfolioRollup(
  projects: PortfolioProject[],
  dataDate: string,
  snapshot: StatusSnapshot,
): PortfolioRollup | null {
  const valid = projects.filter(isValidProject)
  if (valid.length === 0) return null
  const dataMs = parseUtc(dataDate)
  if (!Number.isFinite(dataMs)) return null

  const startMs = Math.min(...valid.map((p) => parseUtc(p.planStart)))
  const finishMs = Math.max(...valid.map((p) => parseUtc(p.planFinish)))

  let bac = 0
  let pv = 0
  let ev = 0
  let ac = 0
  for (const p of valid) {
    const entry = snapshot.entries[p.id] ?? { ac: 0, pctComplete: 0 }
    bac += p.bac
    pv += p.bac * projectFraction(p, dataMs)
    ev += p.bac * (entry.pctComplete / 100)
    ac += entry.ac
  }

  const spi = pv > 0 ? ev / pv : null
  const cpi = ac > 0 ? ev / ac : null
  const etc = cpi !== null && cpi > 0 ? (bac - ev) / cpi : null
  const eac = etc !== null ? ac + etc : null
  const vac = eac !== null ? bac - eac : null

  const plannedDurationMonths = msToMonths(finishMs - startMs)
  const actualMonths = msToMonths(dataMs - startMs)
  const es = findPortfolioEs(valid, ev, startMs, finishMs)
  const spie = es !== null && actualMonths > 0 ? es / actualMonths : null
  const expectedDurationMonths =
    spie !== null && spie > 0 ? plannedDurationMonths / spie : null
  const portfolioStart = new Date(startMs).toISOString().slice(0, 10)

  return {
    dataDate,
    portfolioStart,
    portfolioFinish: new Date(finishMs).toISOString().slice(0, 10),
    plannedDurationMonths,
    bac,
    pv,
    ev,
    ac,
    spi,
    cpi,
    es,
    spie,
    etc,
    eac,
    vac,
    expectedDurationMonths,
    expectedFinish:
      expectedDurationMonths !== null ? isoAddMonths(portfolioStart, expectedDurationMonths) : null,
    slipMonths:
      expectedDurationMonths !== null ? expectedDurationMonths - plannedDurationMonths : null,
  }
}
