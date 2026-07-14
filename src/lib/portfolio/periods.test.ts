import { describe, expect, it } from 'vitest'
import {
  comparePeriodKeys,
  convertFundingAmounts,
  enumeratePeriods,
  parsePeriodKey,
  parseUtc,
  periodForDate,
  periodLabel,
} from './periods'

describe('periodForDate', () => {
  it('maps a date to its canonical key at each granularity', () => {
    expect(periodForDate('2026-07-14', 'Monthly')).toBe('2026-07')
    expect(periodForDate('2026-07-14', 'Quarterly')).toBe('2026-Q3')
    expect(periodForDate('2026-07-14', 'Yearly')).toBe('2026')
    expect(periodForDate('2026-12-31', 'Quarterly')).toBe('2026-Q4')
  })
})

describe('parsePeriodKey', () => {
  it('round-trips keys produced by periodForDate', () => {
    for (const [key, g] of [
      ['2026-07', 'Monthly'],
      ['2026-Q3', 'Quarterly'],
      ['2026', 'Yearly'],
    ] as const) {
      const parsed = parsePeriodKey(key)
      expect(parsed).not.toBeNull()
      expect(parsed!.granularity).toBe(g)
      expect(periodForDate(new Date(parsed!.startMs).toISOString().slice(0, 10), g)).toBe(key)
    }
  })

  it('gives exclusive end bounds', () => {
    const q = parsePeriodKey('2026-Q4')!
    expect(q.startMs).toBe(Date.UTC(2026, 9, 1))
    expect(q.endMs).toBe(Date.UTC(2027, 0, 1))
  })

  it('rejects malformed keys', () => {
    for (const bad of ['2026-13', '2026-00', '2026-Q5', '2026-Q0', 'foo', '26-01', '2026-1']) {
      expect(parsePeriodKey(bad)).toBeNull()
    }
  })
})

describe('periodLabel', () => {
  it('formats human labels', () => {
    expect(periodLabel('2026-01')).toBe('Jan 2026')
    expect(periodLabel('2026-Q3')).toBe('Q3 2026')
    expect(periodLabel('2026')).toBe('2026')
  })
})

describe('enumeratePeriods', () => {
  it('spans year boundaries monthly', () => {
    const periods = enumeratePeriods(parseUtc('2026-11-15'), parseUtc('2027-02-10'), 'Monthly')
    expect(periods.map((p) => p.key)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('spans year boundaries quarterly and yearly', () => {
    expect(
      enumeratePeriods(parseUtc('2026-11-15'), parseUtc('2027-02-10'), 'Quarterly').map((p) => p.key),
    ).toEqual(['2026-Q4', '2027-Q1'])
    expect(
      enumeratePeriods(parseUtc('2026-11-15'), parseUtc('2028-02-10'), 'Yearly').map((p) => p.key),
    ).toEqual(['2026', '2027', '2028'])
  })

  it('returns the single containing period when the range is degenerate', () => {
    const periods = enumeratePeriods(parseUtc('2026-07-14'), parseUtc('2026-07-01'), 'Monthly')
    expect(periods.map((p) => p.key)).toEqual(['2026-07'])
  })
})

describe('comparePeriodKeys', () => {
  it('orders keys chronologically', () => {
    const keys = ['2027-01', '2026-12', '2026-02']
    expect([...keys].sort(comparePeriodKeys)).toEqual(['2026-02', '2026-12', '2027-01'])
  })
})

describe('convertFundingAmounts', () => {
  const total = (amounts: Record<string, number>) =>
    Object.values(amounts).reduce((s, v) => s + v, 0)

  it('sums exactly when going coarser', () => {
    const monthly = { '2026-01': 10, '2026-02': 20, '2026-03': 30, '2026-04': 5 }
    const quarterly = convertFundingAmounts(monthly, 'Monthly', 'Quarterly')
    expect(quarterly).toEqual({ '2026-Q1': 60, '2026-Q2': 5 })
    expect(total(convertFundingAmounts(monthly, 'Monthly', 'Yearly'))).toBe(65)
  })

  it('splits evenly when going finer, preserving totals', () => {
    const quarterly = { '2026-Q1': 60 }
    const monthly = convertFundingAmounts(quarterly, 'Quarterly', 'Monthly')
    expect(monthly).toEqual({ '2026-01': 20, '2026-02': 20, '2026-03': 20 })
    const yearly = { '2026': 120 }
    expect(total(convertFundingAmounts(yearly, 'Yearly', 'Quarterly'))).toBeCloseTo(120)
    expect(total(convertFundingAmounts(yearly, 'Yearly', 'Monthly'))).toBeCloseTo(120)
  })

  it('drops keys that do not match the source granularity', () => {
    const mixed = { '2026-01': 10, '2026-Q1': 99, junk: 5 }
    expect(convertFundingAmounts(mixed, 'Monthly', 'Quarterly')).toEqual({ '2026-Q1': 10 })
  })

  it('returns a copy when granularities match', () => {
    const amounts = { '2026-01': 10 }
    const out = convertFundingAmounts(amounts, 'Monthly', 'Monthly')
    expect(out).toEqual(amounts)
    expect(out).not.toBe(amounts)
  })
})
