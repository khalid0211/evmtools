import type {
  CashFlowInputs,
  CashFlowResult,
  DisplayBasis,
} from '../../types/cashflow'
import { generateCashflow } from './patterns'

function cumsum(arr: number[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const v of arr) {
    acc += v
    out.push(acc)
  }
  return out
}

/** Group monthly values into quarterly or yearly buckets. */
function aggregate(
  monthly: number[],
  basis: DisplayBasis,
): { values: number[]; labels: string[] } {
  const step = basis === 'Quarterly' ? 3 : 12
  const num = Math.ceil(monthly.length / step)
  const values: number[] = []
  const labels: string[] = []
  for (let i = 0; i < num; i++) {
    let s = 0
    for (let j = 0; j < step; j++) {
      const idx = i * step + j
      if (idx < monthly.length) s += monthly[idx]
    }
    values.push(s)
    labels.push(basis === 'Quarterly' ? `Q${i + 1}` : `Y${i + 1}`)
  }
  return { values, labels }
}

export function computeCashFlow(input: CashFlowInputs): CashFlowResult {
  const {
    budget,
    duration,
    pattern,
    displayBasis,
    startDelay,
    projectDelay,
    inflation,
  } = input

  const annualRate = inflation / 100
  const monthlyRate = (1 + annualRate) ** (1 / 12) - 1

  // Baseline: no delays, no inflation
  const baselineMonthly = generateCashflow(pattern, budget, duration)

  // Simulated: extended by project delay, shifted by start delay, inflated
  const simulatedDuration = duration + projectDelay
  const simulatedBase = generateCashflow(pattern, budget, simulatedDuration)

  const simulatedMonthly: number[] = []
  for (let i = 0; i < startDelay; i++) simulatedMonthly.push(0)
  for (let i = 0; i < simulatedDuration; i++) {
    const monthsPassed = startDelay + i
    const inflationFactor = (1 + monthlyRate) ** monthsPassed
    simulatedMonthly.push(simulatedBase[i] * inflationFactor)
  }

  const maxTimeline = simulatedMonthly.length
  const extendedBaseline =
    baselineMonthly.length < maxTimeline
      ? [...baselineMonthly, ...new Array(maxTimeline - baselineMonthly.length).fill(0)]
      : baselineMonthly.slice(0, maxTimeline)

  let baselineData: number[]
  let simulatedData: number[]
  let labels: string[]
  let xLabel: string
  let yLabel: string

  if (displayBasis === 'Monthly') {
    baselineData = extendedBaseline
    simulatedData = simulatedMonthly
    labels = Array.from({ length: maxTimeline }, (_, i) => `M${i + 1}`)
    yLabel = 'Monthly Cash Flow (Millions)'
    xLabel = 'Months'
  } else {
    const b = aggregate(extendedBaseline, displayBasis)
    const s = aggregate(simulatedMonthly, displayBasis)
    baselineData = b.values
    simulatedData = s.values
    // Pad labels to equal length in case buckets differ by one
    const len = Math.max(b.labels.length, s.labels.length)
    labels = displayBasis === 'Quarterly'
      ? Array.from({ length: len }, (_, i) => `Q${i + 1}`)
      : Array.from({ length: len }, (_, i) => `Y${i + 1}`)
    yLabel =
      displayBasis === 'Quarterly'
        ? 'Quarterly Cash Flow (Millions)'
        : 'Annual Cash Flow (Millions)'
    xLabel = displayBasis === 'Quarterly' ? 'Quarters' : 'Years'
    // Ensure both arrays match labels length
    while (baselineData.length < len) baselineData.push(0)
    while (simulatedData.length < len) simulatedData.push(0)
  }

  const baselineBudget = baselineMonthly.reduce((s, v) => s + v, 0)
  const simulatedBudget = simulatedMonthly.reduce((s, v) => s + v, 0)
  const budgetVariance =
    baselineBudget !== 0 ? (simulatedBudget / baselineBudget - 1) * 100 : 0

  return {
    labels,
    baselineData,
    simulatedData,
    baselineAccumulated: cumsum(baselineData),
    simulatedAccumulated: cumsum(simulatedData),
    baselineBudget,
    simulatedBudget,
    budgetVariance,
    xLabel,
    yLabel,
    rawBaselineMonthly: baselineMonthly,
    rawSimulatedMonthly: simulatedMonthly,
  }
}

export function milestoneForPattern(pattern: CashFlowInputs['pattern']) {
  if (pattern === 'Highway') {
    return [
      { pos: 0, label: 'Project Start', color: '#6c757d' },
      { pos: 0.125, label: 'Design Phase', color: '#17a2b8' },
      { pos: 0.333, label: 'Mobilization', color: '#ffc107' },
      { pos: 0.75, label: 'Construction', color: '#dc3545' },
      { pos: 1.0, label: 'Project Closeout', color: '#28a745' },
    ]
  }
  if (pattern === 'Building') {
    return [
      { pos: 0, label: 'Project Start', color: '#6c757d' },
      { pos: 0.167, label: 'Design Phase', color: '#17a2b8' },
      { pos: 0.556, label: 'Foundation/Structure', color: '#ffc107' },
      { pos: 0.833, label: 'MEP/Finishing', color: '#dc3545' },
      { pos: 1.0, label: 'Project Completion', color: '#28a745' },
    ]
  }
  // S-Curve
  return [
    { pos: 0, label: 'Project Start', color: '#6c757d' },
    { pos: 0.25, label: 'Ramp-Up', color: '#17a2b8' },
    { pos: 0.5, label: 'Peak Activity', color: '#ffc107' },
    { pos: 0.75, label: 'Wind-Down', color: '#dc3545' },
    { pos: 1.0, label: 'Project Completion', color: '#28a745' },
  ]
}
