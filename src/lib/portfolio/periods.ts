import type { PeriodGranularity } from '../../types/portfolio'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const RANK: Record<PeriodGranularity, number> = { Monthly: 0, Quarterly: 1, Yearly: 2 }

export interface Period {
  key: string
  label: string
  startMs: number
  /** Exclusive. */
  endMs: number
}

export function parseUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Start/end bounds of the period (at the given granularity) containing `ms`. */
function boundsForMs(ms: number, g: PeriodGranularity): { startMs: number; endMs: number } {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  if (g === 'Monthly') return { startMs: Date.UTC(y, m, 1), endMs: Date.UTC(y, m + 1, 1) }
  if (g === 'Quarterly') {
    const q = Math.floor(m / 3)
    return { startMs: Date.UTC(y, q * 3, 1), endMs: Date.UTC(y, q * 3 + 3, 1) }
  }
  return { startMs: Date.UTC(y, 0, 1), endMs: Date.UTC(y + 1, 0, 1) }
}

function keyForStartMs(startMs: number, g: PeriodGranularity): string {
  const d = new Date(startMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  if (g === 'Monthly') return `${y}-${pad2(m + 1)}`
  if (g === 'Quarterly') return `${y}-Q${Math.floor(m / 3) + 1}`
  return String(y)
}

function labelForStartMs(startMs: number, g: PeriodGranularity): string {
  const d = new Date(startMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  if (g === 'Monthly') return `${MONTHS[m]} ${y}`
  if (g === 'Quarterly') return `Q${Math.floor(m / 3) + 1} ${y}`
  return String(y)
}

/** Canonical period key for the period containing an ISO date. */
export function periodForDate(iso: string, g: PeriodGranularity): string {
  return keyForStartMs(boundsForMs(parseUtc(iso), g).startMs, g)
}

/**
 * Parse a canonical period key back into bounds. Returns null for anything
 * that is not a well-formed 'YYYY-MM' / 'YYYY-Qn' / 'YYYY' key.
 */
export function parsePeriodKey(
  key: string,
): { startMs: number; endMs: number; granularity: PeriodGranularity } | null {
  let m = /^(\d{4})-(\d{2})$/.exec(key)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    if (month < 1 || month > 12) return null
    return {
      startMs: Date.UTC(year, month - 1, 1),
      endMs: Date.UTC(year, month, 1),
      granularity: 'Monthly',
    }
  }
  m = /^(\d{4})-Q([1-4])$/.exec(key)
  if (m) {
    const year = Number(m[1])
    const q = Number(m[2])
    return {
      startMs: Date.UTC(year, (q - 1) * 3, 1),
      endMs: Date.UTC(year, q * 3, 1),
      granularity: 'Quarterly',
    }
  }
  m = /^(\d{4})$/.exec(key)
  if (m) {
    const year = Number(m[1])
    return { startMs: Date.UTC(year, 0, 1), endMs: Date.UTC(year + 1, 0, 1), granularity: 'Yearly' }
  }
  return null
}

/** Human label for a canonical key: 'Jan 2026' / 'Q1 2026' / '2026'. */
export function periodLabel(key: string): string {
  const parsed = parsePeriodKey(key)
  if (!parsed) return key
  return labelForStartMs(parsed.startMs, parsed.granularity)
}

/**
 * Consecutive periods from the one containing `startMs` through the one
 * containing `endMs` (inclusive). If endMs < startMs, returns just the period
 * containing startMs.
 */
export function enumeratePeriods(
  startMs: number,
  endMs: number,
  g: PeriodGranularity,
): Period[] {
  const periods: Period[] = []
  let bounds = boundsForMs(startMs, g)
  for (;;) {
    periods.push({
      key: keyForStartMs(bounds.startMs, g),
      label: labelForStartMs(bounds.startMs, g),
      startMs: bounds.startMs,
      endMs: bounds.endMs,
    })
    if (bounds.endMs > endMs) break
    bounds = boundsForMs(bounds.endMs, g)
  }
  return periods
}

/** Chronological compare of two canonical keys (unparseable keys sort last, by string). */
export function comparePeriodKeys(a: string, b: string): number {
  const pa = parsePeriodKey(a)
  const pb = parsePeriodKey(b)
  if (pa && pb) return pa.startMs - pb.startMs
  if (pa) return -1
  if (pb) return 1
  return a.localeCompare(b)
}

/**
 * Re-key funding amounts to a new granularity, preserving the total: coarser
 * conversions sum exactly; finer conversions split each amount evenly across
 * its child periods. Keys that do not match `from` are dropped.
 */
export function convertFundingAmounts(
  amounts: Record<string, number>,
  from: PeriodGranularity,
  to: PeriodGranularity,
): Record<string, number> {
  if (from === to) return { ...amounts }
  const out: Record<string, number> = {}
  for (const [key, amount] of Object.entries(amounts)) {
    if (!Number.isFinite(amount) || amount === 0) continue
    const parsed = parsePeriodKey(key)
    if (!parsed || parsed.granularity !== from) continue
    if (RANK[to] > RANK[from]) {
      const target = keyForStartMs(boundsForMs(parsed.startMs, to).startMs, to)
      out[target] = (out[target] ?? 0) + amount
    } else {
      const subs = enumeratePeriods(parsed.startMs, parsed.endMs - 1, to)
      const share = amount / subs.length
      for (const sub of subs) out[sub.key] = (out[sub.key] ?? 0) + share
    }
  }
  return out
}
