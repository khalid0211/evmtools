import { describe, it, expect } from 'vitest'
import { computeEvm, monthsBetween, presentValueOfCashflow, resolveDurations } from './calculations'
import type { EvmInputs } from '../../types/evm'

function baseInputs(overrides: Partial<EvmInputs> = {}): EvmInputs {
  return {
    bac: 5000,
    ac: 900,
    durationMode: 'duration',
    originalDurationInput: 12,
    actualDurationInput: 6,
    planStart: '',
    planFinish: '',
    statusDate: '',
    pvMethod: 'Linear',
    pvManual: 1000,
    alpha: 2,
    beta: 2,
    evMethod: '% Complete',
    evManual: 1000,
    percentComplete: 20,
    inflationRate: 5,
    ...overrides,
  }
}

describe('monthsBetween', () => {
  it('divides day difference by 30.44', () => {
    // Exactly 304.4 days -> 10 months
    expect(monthsBetween('2024-01-01', '2024-11-01')).toBeCloseTo(
      (new Date('2024-11-01').getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24 * 30.44),
      6,
    )
  })
  it('returns 0 for missing dates', () => {
    expect(monthsBetween('', '2024-01-01')).toBe(0)
    expect(monthsBetween('2024-01-01', '')).toBe(0)
  })
  it('never returns negative durations', () => {
    expect(monthsBetween('2024-06-01', '2024-01-01')).toBe(0)
  })
})

describe('resolveDurations', () => {
  it('uses direct inputs in duration mode', () => {
    const r = resolveDurations(baseInputs({ durationMode: 'duration', originalDurationInput: 10, actualDurationInput: 4 }))
    expect(r.originalDuration).toBe(10)
    expect(r.actualDuration).toBe(4)
  })
  it('derives durations from dates in dates mode', () => {
    const r = resolveDurations(
      baseInputs({ durationMode: 'dates', planStart: '2024-01-01', planFinish: '2025-01-01', statusDate: '2024-07-01' }),
    )
    expect(r.originalDuration).toBeGreaterThan(11)
    expect(r.originalDuration).toBeLessThan(13)
    expect(r.actualDuration).toBeGreaterThan(5)
    expect(r.actualDuration).toBeLessThan(7)
  })
})

describe('presentValueOfCashflow', () => {
  it('returns the amount unchanged when inflation is 0', () => {
    expect(presentValueOfCashflow(1200, 12, 0)).toBe(1200)
  })
  it('discounts below the nominal amount for positive inflation', () => {
    const pv = presentValueOfCashflow(1200, 12, 5)
    expect(pv).toBeLessThan(1200)
    expect(pv).toBeGreaterThan(0)
  })
  it('matches the annuity-discount formula', () => {
    const ac = 1200
    const duration = 12
    const annualRate = 0.05
    const monthlyRate = (1 + annualRate) ** (1 / 12) - 1
    const pmt = ac / duration
    const expected = (pmt * (1 - (1 + monthlyRate) ** -duration)) / monthlyRate
    expect(presentValueOfCashflow(ac, duration, 5)).toBeCloseTo(expected, 6)
  })
})

describe('computeEvm - % Complete EV, Linear PV', () => {
  const r = computeEvm(baseInputs({ pvMethod: 'Linear', evMethod: '% Complete', percentComplete: 20 }))

  it('EV = BAC * %complete', () => {
    expect(r.ev).toBe(1000)
  })
  it('PV = BAC * (AD/OD)', () => {
    expect(r.pv).toBeCloseTo(5000 * (6 / 12), 6)
  })
  it('CV = EV - AC, SV = EV - PV', () => {
    expect(r.cv).toBe(100)
    expect(r.sv).toBeCloseTo(1000 - 2500, 6)
  })
  it('CPI = EV/AC, SPI = EV/PV', () => {
    expect(r.cpi).toBeCloseTo(1000 / 900, 6)
    expect(r.spi).toBeCloseTo(1000 / 2500, 6)
  })
  it('ES = (EV/BAC) * OD for linear', () => {
    expect(r.es).toBeCloseTo((1000 / 5000) * 12, 6)
  })
  it('SPIe = ES / actualDuration', () => {
    expect(r.spie).toBeCloseTo(r.es! / 6, 6)
  })
})

describe('computeEvm - Enter Value for both PV and EV', () => {
  const r = computeEvm(baseInputs({ pvMethod: 'Enter Value', pvManual: 1000, evMethod: 'Enter Value', evManual: 1000 }))

  it('uses manual PV and EV directly', () => {
    expect(r.pv).toBe(1000)
    expect(r.ev).toBe(1000)
  })
  it('does not compute Earned Schedule when PV is manual', () => {
    expect(r.es).toBeNull()
    expect(r.spie).toBeNull()
  })
})

describe('computeEvm - S-Curve PV (alpha=beta=2 matches polynomial)', () => {
  const r = computeEvm(baseInputs({ pvMethod: 'S-Curve', alpha: 2, beta: 2, evMethod: '% Complete', percentComplete: 20 }))
  const ratio = 6 / 12

  it('PV follows the 3x^2 - 2x^3 curve', () => {
    expect(r.pv).toBeCloseTo(5000 * (3 * ratio * ratio - 2 * ratio * ratio * ratio), 4)
  })
  it('computes a valid Earned Schedule via binary search', () => {
    expect(r.es).not.toBeNull()
    expect(r.es!).toBeGreaterThan(0)
    expect(r.es!).toBeLessThan(12)
  })
})

describe('computeEvm - Estimate EV method', () => {
  it('EV equals the present value of AC when inflation > 0', () => {
    const r = computeEvm(baseInputs({ evMethod: 'Estimate', inflationRate: 5, ac: 900, actualDurationInput: 6 }))
    const expected = presentValueOfCashflow(900, 6, 5)
    expect(r.ev).toBeCloseTo(expected, 6)
  })
  it('EV equals AC when inflation is 0', () => {
    const r = computeEvm(baseInputs({ evMethod: 'Estimate', inflationRate: 0, ac: 900, actualDurationInput: 6 }))
    expect(r.ev).toBe(900)
  })
})

describe('computeEvm - health classification (CPI/SPI based)', () => {
  function healthOf(ev: number, ac: number, pv: number) {
    return computeEvm(
      baseInputs({ pvMethod: 'Enter Value', pvManual: pv, evMethod: 'Enter Value', evManual: ev, ac }),
    ).healthStatus
  }

  it('is Excellent when both CPI and SPI are >= 1.0', () => {
    expect(healthOf(1200, 1000, 1000)).toBe('Excellent')
  })
  it('is Critical when both CPI and SPI are below 0.9', () => {
    expect(healthOf(800, 1000, 1000)).toBe('Critical')
  })
  it('is At Risk when one index is below 0.9 and the other is >= 1.0', () => {
    expect(healthOf(1200, 1000, 1500)).toBe('At Risk') // CPI 1.2, SPI 0.8
  })
  it('is At Risk when both indices sit in the 0.9-1.0 band', () => {
    expect(healthOf(950, 1000, 1000)).toBe('At Risk') // CPI 0.95, SPI 0.95
  })
})

describe('computeEvm - invalid', () => {
  it('flags invalid when BAC <= 0', () => {
    const r = computeEvm(baseInputs({ bac: 0 }))
    expect(r.valid).toBe(false)
  })
})
