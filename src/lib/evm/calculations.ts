import type { EvmInputs, EvmResult, EvmCurveSeries, PvMethod } from '../../types/evm'
import { scurveCdf } from '../shared/statistics'

const DAYS_PER_MONTH = 30.44

/** Below this, an index (CPI or SPI) is considered underperforming for Health classification. */
const HEALTH_LOW_THRESHOLD = 0.9
/** At/above this, an index (CPI or SPI) is considered overperforming for Health classification. */
const HEALTH_HIGH_THRESHOLD = 1.0

/**
 * Classify project Health from CPI/SPI individually (not a blended average):
 * - Critical: both indices are underperforming (< 0.9)
 * - Excellent: both indices are overperforming (>= 1.0)
 * - At Risk: everything else (mixed, or both sitting in the 0.9-1.0 band)
 */
function classifyHealth(cpi: number | null, spi: number): 'Excellent' | 'At Risk' | 'Critical' {
  const costOk = cpi === null || cpi >= HEALTH_HIGH_THRESHOLD
  const scheduleOk = spi >= HEALTH_HIGH_THRESHOLD
  if (costOk && scheduleOk) return 'Excellent'

  const costCritical = cpi !== null && cpi < HEALTH_LOW_THRESHOLD
  const scheduleCritical = spi < HEALTH_LOW_THRESHOLD
  if (costCritical && scheduleCritical) return 'Critical'

  return 'At Risk'
}

/** Months between two ISO (yyyy-mm-dd) dates, ported from `calculate_durations` in core/evm_engine.py. */
export function monthsBetween(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(diffDays / DAYS_PER_MONTH, 0)
}

/** Resolve Original/Used duration (months) from either direct input or dates. */
export function resolveDurations(input: EvmInputs): { originalDuration: number; actualDuration: number } {
  if (input.durationMode === 'dates') {
    return {
      originalDuration: monthsBetween(input.planStart, input.planFinish),
      actualDuration: monthsBetween(input.planStart, input.statusDate),
    }
  }
  return {
    originalDuration: input.originalDurationInput,
    actualDuration: input.actualDurationInput,
  }
}

/**
 * Present value of an amount spread evenly (as an annuity) over
 * `durationMonths`, discounted back to today using a monthly rate derived
 * from the annual inflation rate: (1 + annualRate)^(1/12) - 1.
 *
 * Ported from `calculate_present_value` in core/evm_engine.py. Used by the
 * "Estimate" Earned Value method to discount the Actual Cost cash flow.
 */
export function presentValueOfCashflow(
  amount: number,
  durationMonths: number,
  annualInflationRatePct: number,
): number {
  if (durationMonths <= 0) return Math.max(amount, 0)
  const annualRate = annualInflationRatePct / 100
  if (annualRate === 0) return Math.max(amount, 0)

  const monthlyRate = (1 + annualRate) ** (1 / 12) - 1
  const pmt = amount / Math.max(durationMonths, 1e-9)
  if (Math.abs(monthlyRate) < 1e-12) return Math.max(amount, 0)

  try {
    const factor = (1 - (1 + monthlyRate) ** -durationMonths) / monthlyRate
    const result = pmt * factor
    if (!isFinite(result) || isNaN(result)) return Math.max(amount, 0)
    return Math.max(result, 0)
  } catch {
    return Math.max(amount, 0)
  }
}

/** Planned Value curve position for Linear or S-Curve methods (0..1 progress ratio scaled by BAC). */
function pvCurveValue(
  pvMethod: Extract<PvMethod, 'Linear' | 'S-Curve'>,
  bac: number,
  currentDuration: number,
  totalDuration: number,
  alpha: number,
  beta: number,
): number {
  if (totalDuration <= 0) return currentDuration > 0 ? bac : 0
  if (currentDuration >= totalDuration) return bac
  const ratio = Math.max(Math.min(currentDuration / totalDuration, 1), 0)
  return pvMethod === 'S-Curve' ? bac * scurveCdf(ratio, alpha, beta) : bac * ratio
}

/** Progress ratio (0..1) for a curve shape at a given point, used to shape EV/AC display curves. */
function curveRatio(
  pvMethod: Extract<PvMethod, 'Linear' | 'S-Curve'>,
  ratio: number,
  alpha: number,
  beta: number,
): number {
  const r = Math.max(Math.min(ratio, 1), 0)
  return pvMethod === 'S-Curve' ? scurveCdf(r, alpha, beta) : r
}

/** Earned Schedule: the point on the PV curve where PV = EV. */
function findEarnedSchedule(
  pvMethod: Extract<PvMethod, 'Linear' | 'S-Curve'>,
  ev: number,
  bac: number,
  totalDuration: number,
  alpha: number,
  beta: number,
): number | null {
  if (totalDuration <= 0 || bac <= 0) return null
  const target = Math.max(Math.min(ev / bac, 1), 0)

  if (pvMethod === 'Linear') {
    return Math.max(Math.min(target * totalDuration, totalDuration), 0)
  }

  if (target === 0) return 0
  if (target === 1) return totalDuration

  let low = 0
  let high = totalDuration
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const cdf = scurveCdf(mid / totalDuration, alpha, beta)
    if (Math.abs(cdf - target) < 1e-4) return mid
    if (cdf < target) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export function computeEvm(input: EvmInputs): EvmResult {
  const {
    bac,
    ac,
    pvMethod,
    pvManual,
    alpha,
    beta,
    evMethod,
    evManual,
    percentComplete,
    inflationRate,
  } = input

  const { originalDuration, actualDuration } = resolveDurations(input)

  const pv =
    pvMethod === 'Enter Value'
      ? pvManual
      : pvCurveValue(pvMethod, bac, actualDuration, originalDuration, alpha, beta)

  let ev: number
  if (evMethod === 'Enter Value') {
    ev = evManual
  } else if (evMethod === '% Complete') {
    ev = bac * (percentComplete / 100)
  } else {
    // Estimate: present value of the AC cash flow, discounted at the given inflation rate
    ev = presentValueOfCashflow(ac, actualDuration, inflationRate)
  }

  const timeElapsedPct = originalDuration > 0 ? (actualDuration / originalDuration) * 100 : 0
  const budgetUtilizedPct = bac > 0 ? (ac / bac) * 100 : 0
  const percentCompleteEffective = bac > 0 ? (ev / bac) * 100 : 0
  const completionEfficiency = timeElapsedPct > 0 ? percentCompleteEffective / timeElapsedPct : 0

  let es: number | null = null
  let spie: number | null = null
  if (pvMethod !== 'Enter Value') {
    es = findEarnedSchedule(pvMethod, ev, bac, originalDuration, alpha, beta)
    spie = es !== null && actualDuration > 0 ? es / actualDuration : null
  }

  const valid = bac > 0 && ev >= 0 && ac >= 0 && pv >= 0

  if (!valid) {
    return {
      originalDuration, actualDuration,
      ev, pv, timeElapsedPct, budgetUtilizedPct, completionEfficiency,
      es, spie,
      cv: 0, sv: 0, cpi: null, spi: 0,
      etc: null, eac: null, vac: null, tcpiBac: 0,
      costStatus: 'On Budget', scheduleStatus: 'On Schedule',
      healthScore: 0, healthStatus: 'Critical',
      valid: false,
      warning: 'Please ensure all input values are valid and Budget at Completion is greater than zero.',
    }
  }

  const cv = ev - ac
  const sv = ev - pv
  const cpi = ac > 0 ? ev / ac : null
  const spi = pv > 0 ? ev / pv : 0

  const etc = ac > 0 && cpi !== null && cpi > 0 ? (bac - ev) / cpi : Infinity
  const eac = etc === Infinity ? null : ac + etc
  const vac = eac !== null ? bac - eac : null
  const tcpiBac = bac - ac !== 0 ? (bac - ev) / (bac - ac) : 0

  const costStatus: EvmResult['costStatus'] =
    cv > 0 ? 'Under Budget' : cv < 0 ? 'Over Budget' : 'On Budget'
  const scheduleStatus: EvmResult['scheduleStatus'] =
    sv > 0 ? 'Ahead' : sv < 0 ? 'Behind' : 'On Schedule'

  const healthScore = cpi !== null ? (cpi + spi) / 2 : spi
  const healthStatus = classifyHealth(cpi, spi)

  return {
    originalDuration, actualDuration,
    ev, pv, timeElapsedPct, budgetUtilizedPct, completionEfficiency,
    es, spie, cv, sv, cpi, spi, etc, eac, vac, tcpiBac,
    costStatus, scheduleStatus, healthScore, healthStatus,
    valid: true,
  }
}

/** Build smooth PV/EV/AC curves for the chart. Returns null when PV is manually entered. */
export function buildEvmCurves(input: EvmInputs): EvmCurveSeries | null {
  const { bac, ac, pvMethod, alpha, beta } = input
  if (pvMethod === 'Enter Value') return null

  const result = computeEvm(input)
  const { originalDuration: od, actualDuration: ad, ev } = result
  if (od <= 0 || ad <= 0) return null

  const steps = 60
  const pvTimeline: number[] = []
  const pvCurve: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (od * i) / steps
    pvTimeline.push(t)
    pvCurve.push(bac * curveRatio(pvMethod, t / od, alpha, beta))
  }

  // EV/AC follow the same project curve shape as PV (normalized by the full
  // original duration), tracing only the [0, dataDate] segment. Scale by the
  // shape value at the data date so each curve still terminates exactly at the
  // current EV/AC values, matching the plotted "Current" markers.
  const shapeAtData = curveRatio(pvMethod, ad / od, alpha, beta)
  const shapeNorm = shapeAtData > 1e-9 ? shapeAtData : 1

  const actualTimeline: number[] = []
  const evCurve: number[] = []
  const acCurve: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (ad * i) / steps
    actualTimeline.push(t)
    const shape = curveRatio(pvMethod, t / od, alpha, beta) / shapeNorm
    evCurve.push(ev * shape)
    acCurve.push(ac * shape)
  }

  return { pvTimeline, pvCurve, actualTimeline, evCurve, acCurve }
}
