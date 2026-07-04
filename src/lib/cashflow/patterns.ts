import type { CashFlowPattern } from '../../types/cashflow'
import { betaPdf } from '../shared/statistics'

export { betaPdf } from '../shared/statistics'

/** Normalize raw weights so the monthly cashflows sum exactly to the budget. */
function normalizeToBudget(budget: number, raw: number[]): number[] {
  const total = raw.reduce((s, v) => s + v, 0)
  if (total === 0) return raw.map(() => 0)
  const scale = 100 / total
  return raw.map((p) => (budget * p * scale) / 100)
}

export function linearCashflow(budget: number, duration: number): number[] {
  const per = budget / duration
  return new Array(duration).fill(per)
}

export function highwayCashflow(budget: number, duration: number): number[] {
  const raw: number[] = []
  for (let t = 1; t <= duration; t++) {
    const x = duration > 1 ? (t - 1) / (duration - 1) : 0
    let p: number
    if (x <= 0.125) {
      p = 0.3 + 0.8 * (x / 0.125) ** 1.5
    } else if (x <= 0.333) {
      p = 1.8 + 1.4 * ((x - 0.125) / 0.208) ** 0.7
    } else if (x <= 0.75) {
      p = 2.0 + 6.1 * Math.exp(-0.5 * ((x - 0.625) / 0.15) ** 2)
    } else {
      p = 5.8 * Math.exp(-2.0 * ((x - 0.75) / 0.25)) + 1.5
    }
    raw.push(p)
  }
  return normalizeToBudget(budget, raw)
}

export function buildingCashflow(budget: number, duration: number): number[] {
  const raw: number[] = []
  for (let t = 1; t <= duration; t++) {
    const x = duration > 1 ? (t - 1) / (duration - 1) : 0
    let p: number
    if (x <= 0.167) {
      p = 0.5 + 2.0 * (x / 0.167) ** 1.2
    } else if (x <= 0.556) {
      const term = Math.abs((x - 0.167) / 0.389 - 0.6) / 0.25
      p = 4.0 + 7.5 * Math.exp(-0.5 * term ** 2)
    } else if (x <= 0.833) {
      p = 8.5 + 3.0 * Math.sin((Math.PI * (x - 0.556)) / 0.277)
    } else {
      p = 7.0 * Math.exp(-2.0 * (x - 0.833) / 0.167) + 1.0
    }
    raw.push(p)
  }
  return normalizeToBudget(budget, raw)
}

export function scurveCashflow(
  budget: number,
  duration: number,
  alpha = 2,
  beta = 2,
): number[] {
  const raw: number[] = []
  for (let t = 1; t <= duration; t++) {
    const x = (t - 0.5) / duration
    raw.push(betaPdf(x, alpha, beta))
  }
  return normalizeToBudget(budget, raw)
}

export function generateCashflow(
  pattern: CashFlowPattern,
  budget: number,
  duration: number,
): number[] {
  switch (pattern) {
    case 'Linear':
      return linearCashflow(budget, duration)
    case 'Highway':
      return highwayCashflow(budget, duration)
    case 'Building':
      return buildingCashflow(budget, duration)
    case 'S-Curve':
      return scurveCashflow(budget, duration)
  }
}
