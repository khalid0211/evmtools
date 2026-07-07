import type {
  CashFlowBasis,
  CashFlowBucket,
  MonteCarloResult,
  WbsCashFlowSeries,
  WbsComputed,
  WbsState,
} from '../../types/wbs'
import { scurveCdf } from '../shared/statistics'
import { isLeaf } from './tree'

const MS_DAY = 86_400_000
const MS_WEEK = 7 * MS_DAY

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

interface Bucket {
  label: string
  startMs: number
  endMs: number // exclusive
}

function monthlyBuckets(startMs: number, endMs: number): Bucket[] {
  const buckets: Bucket[] = []
  const start = new Date(startMs)
  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()
  for (;;) {
    const bucketStart = Date.UTC(year, month, 1)
    const bucketEnd = Date.UTC(year, month + 1, 1)
    buckets.push({ label: `${MONTHS[month]} ${year}`, startMs: bucketStart, endMs: bucketEnd })
    if (bucketEnd > endMs) break
    month += 1
    if (month === 12) {
      month = 0
      year += 1
    }
  }
  return buckets
}

function weeklyBuckets(startMs: number, endMs: number): Bucket[] {
  const buckets: Bucket[] = []
  let cursor = startMs
  for (;;) {
    const next = cursor + MS_WEEK
    const d = new Date(cursor)
    const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    buckets.push({ label, startMs: cursor, endMs: next })
    if (next > endMs) break
    cursor = next
  }
  return buckets
}

export interface CashFlowOptions {
  bucket: CashFlowBucket
  /** Multiplier applied to every item (basis total ÷ deterministic total). */
  scale: number
}

/**
 * Spread each dated dictionary item's most-likely budget over its date range —
 * linearly or along an S-curve (regularized beta CDF with the item's α/β) —
 * and aggregate into monthly or weekly buckets across the project timeline.
 */
export function computeWbsCashFlow(
  state: WbsState,
  computed: WbsComputed,
  opts: CashFlowOptions,
): WbsCashFlowSeries | null {
  interface Item {
    cost: number
    startMs: number
    endMs: number
    fraction: (t: number) => number
  }
  const items: Item[] = []
  let excluded = 0

  for (const id of computed.orderedIds) {
    const node = state.nodes[id]
    if (!isLeaf(node)) continue
    const { startDate, endDate, budget, costCurve, curveAlpha, curveBeta } = node.dict
    if (!startDate || !endDate || endDate < startDate) {
      excluded += 1
      continue
    }
    const startMs = parseUtc(startDate)
    const endMs = parseUtc(endDate)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      excluded += 1
      continue
    }
    const alpha = curveAlpha ?? 2
    const beta = curveBeta ?? 2
    items.push({
      cost: budget * opts.scale,
      startMs,
      endMs,
      fraction:
        costCurve === 'S-Curve'
          ? (t: number) => scurveCdf(t, alpha, beta)
          : (t: number) => Math.max(0, Math.min(1, t)),
    })
  }
  if (items.length === 0) return null

  const projectStart = Math.min(...items.map((i) => i.startMs))
  const projectEnd = Math.max(...items.map((i) => i.endMs))
  const buckets =
    opts.bucket === 'Weekly'
      ? weeklyBuckets(projectStart, projectEnd)
      : monthlyBuckets(projectStart, projectEnd)

  const perPeriod = buckets.map(() => 0)
  for (const item of items) {
    const span = item.endMs - item.startMs
    for (let b = 0; b < buckets.length; b++) {
      const bucket = buckets[b]
      if (bucket.endMs <= item.startMs || bucket.startMs > item.endMs) continue
      if (span === 0) {
        // zero-duration item: entire cost lands in the bucket containing its date
        if (item.startMs >= bucket.startMs && item.startMs < bucket.endMs) {
          perPeriod[b] += item.cost
        }
        continue
      }
      const t1 = Math.max(0, (bucket.startMs - item.startMs) / span)
      const t2 = Math.min(1, (bucket.endMs - item.startMs) / span)
      perPeriod[b] += item.cost * (item.fraction(t2) - item.fraction(t1))
    }
  }

  const cumulative: number[] = []
  let running = 0
  for (const v of perPeriod) {
    running += v
    cumulative.push(running)
  }

  return {
    labels: buckets.map((b) => b.label),
    perPeriod,
    cumulative,
    total: running,
    excluded,
  }
}

export interface ResolvedBasis {
  total: number
  label: string
  available: boolean
}

/**
 * Total project cost for the selected curve basis. Percentile bases require a
 * current (non-stale) Monte Carlo result; unavailable bases fall back to the
 * plain budget with `available: false` so the UI can explain.
 */
export function resolveCashFlowBasis(
  basis: CashFlowBasis,
  computed: WbsComputed,
  pertCost: number,
  mc: MonteCarloResult | null,
): ResolvedBasis {
  // orderedIds is DFS from the root, so the first entry is the project node
  const budget = computed.perNode[computed.orderedIds[0]]?.budget ?? 0
  switch (basis) {
    case 'PERT':
      return { total: pertCost, label: 'PERT', available: true }
    case 'P50':
    case 'P80':
    case 'P90': {
      if (!mc) return { total: budget, label: 'Budget', available: false }
      const value =
        basis === 'P50' ? mc.costStats.p50 : basis === 'P80' ? mc.costStats.p80 : mc.costStats.p90
      return { total: value, label: basis, available: true }
    }
    default:
      return { total: budget, label: 'Budget', available: true }
  }
}
