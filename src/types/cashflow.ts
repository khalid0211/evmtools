export type CashFlowPattern = 'Linear' | 'Highway' | 'Building' | 'S-Curve'
export type DisplayBasis = 'Monthly' | 'Quarterly' | 'Yearly'

export interface CashFlowInputs {
  budget: number
  duration: number
  pattern: CashFlowPattern
  displayBasis: DisplayBasis
  startDelay: number
  projectDelay: number
  inflation: number
}

export interface CashFlowResult {
  labels: string[]
  baselineData: number[]
  simulatedData: number[]
  baselineAccumulated: number[]
  simulatedAccumulated: number[]
  baselineBudget: number
  simulatedBudget: number
  budgetVariance: number
  xLabel: string
  yLabel: string
  rawBaselineMonthly: number[]
  rawSimulatedMonthly: number[]
}

export interface ScenarioRecord {
  timestamp: string
  duration: number
  pattern: CashFlowPattern
  startDelay: number
  projectDelay: number
  inflation: number
  simulatedBudget: number
  budgetVariance: number
  deltaFromBaseline?: number
  scenarioType?: 'Baseline' | 'Comparison'
}
