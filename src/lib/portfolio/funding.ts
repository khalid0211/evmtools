import type { FundingSchedule } from '../../types/portfolio'
import type { PortfolioCashflowSeries } from './cashflow'
import type { Period } from './periods'

export interface OverloadRange {
  fromLabel: string
  toLabel: string
  /** Most negative net value in the range (the worst shortfall). */
  worst: number
}

export interface FundingAnalysis {
  periods: Period[]
  labels: string[]
  perPeriodFunding: number[]
  cumulativeFunding: number[]
  /** Cumulative cash requirement (= series.cumulative). */
  cumulativeRequirement: number[]
  /** Cumulative funding − cumulative requirement; negative = overload. */
  net: number[]
  overloaded: boolean[]
  /** Contiguous runs of overloaded periods, for the summary text. */
  overloadedRanges: OverloadRange[]
  totalFunding: number
  totalRequirement: number
}

/**
 * Funding schedule that exactly covers the cash requirement: each period's
 * requirement rounded UP to 2 decimals (never below the requirement, so
 * applying it produces no overload). Zero-requirement periods are omitted.
 */
export function autoFundingAmounts(series: PortfolioCashflowSeries): Record<string, number> {
  const amounts: Record<string, number> = {}
  series.periods.forEach((period, i) => {
    const requirement = series.perPeriod[i]
    if (requirement <= 0) return
    // the 1e-9 guard keeps float noise (e.g. 40.000000000000004) from bumping a value a cent up
    amounts[period.key] = Math.ceil((requirement - 1e-9) * 100) / 100
  })
  return amounts
}

/**
 * Overlay a time-phased funding schedule on the portfolio cash requirement.
 * Both series share the cashflow series' period axis, so the schedule's
 * granularity must match the one the series was computed with.
 */
export function computeFundingAnalysis(
  series: PortfolioCashflowSeries,
  funding: FundingSchedule,
): FundingAnalysis {
  const perPeriodFunding = series.periods.map((p) => funding.amounts[p.key] ?? 0)
  const cumulativeFunding: number[] = []
  let running = 0
  for (const v of perPeriodFunding) {
    running += v
    cumulativeFunding.push(running)
  }

  const totalRequirement = series.total
  const epsilon = 1e-6 * Math.max(1, totalRequirement)
  const net = cumulativeFunding.map((f, i) => f - series.cumulative[i])
  const overloaded = net.map((n) => n < -epsilon)

  const overloadedRanges: OverloadRange[] = []
  for (let i = 0; i < overloaded.length; i++) {
    if (!overloaded[i]) continue
    let j = i
    let worst = net[i]
    while (j + 1 < overloaded.length && overloaded[j + 1]) {
      j += 1
      worst = Math.min(worst, net[j])
    }
    overloadedRanges.push({
      fromLabel: series.labels[i],
      toLabel: series.labels[j],
      worst,
    })
    i = j
  }

  return {
    periods: series.periods,
    labels: series.labels,
    perPeriodFunding,
    cumulativeFunding,
    cumulativeRequirement: series.cumulative,
    net,
    overloaded,
    overloadedRanges,
    totalFunding: running,
    totalRequirement,
  }
}
