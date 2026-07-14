import { describe, expect, it } from 'vitest'
import type { CashFlowInputs, ScenarioRecord } from '../../types/cashflow'
import { computeCashFlow } from './calculations'
import { buildCashFlowReportHtml } from './report'

const inputs: CashFlowInputs = {
  budget: 1000,
  duration: 12,
  pattern: 'S-Curve',
  displayBasis: 'Monthly',
  startDelay: 2,
  projectDelay: 3,
  inflation: 5,
}

const meta = { projectName: 'Metro <Line>', organization: 'PMO' }

function baselineRecord(): ScenarioRecord {
  return {
    timestamp: '2026-07-14 10:00:00',
    duration: 12,
    pattern: 'S-Curve',
    startDelay: 0,
    projectDelay: 0,
    inflation: 5,
    simulatedBudget: 1020,
    budgetVariance: 2,
  }
}

describe('buildCashFlowReportHtml', () => {
  it('includes inputs, financial impact, and chart sections', () => {
    const result = computeCashFlow(inputs)
    const html = buildCashFlowReportHtml(inputs, result, null, [], meta, {
      chart: 'data:image/png;base64,CHART',
    })
    expect(html).toContain('Cash Flow Simulation Report')
    expect(html).toContain('S-Curve')
    expect(html).toContain('Scenario Inputs')
    expect(html).toContain('Financial Impact')
    expect(html).toContain('data:image/png;base64,CHART')
    expect(html).toContain('No baseline set')
    expect(html).toContain('window.print()')
  })

  it('escapes HTML in the report title', () => {
    const result = computeCashFlow(inputs)
    const html = buildCashFlowReportHtml(inputs, result, null, [], meta, {})
    expect(html).toContain('Metro &lt;Line&gt;')
    expect(html).not.toContain('Metro <Line>')
  })

  it('renders the baseline and comparison rows when present', () => {
    const result = computeCashFlow(inputs)
    const comparison: ScenarioRecord = {
      ...baselineRecord(),
      timestamp: '2026-07-14 10:05:00',
      startDelay: 2,
      projectDelay: 3,
      simulatedBudget: 1080,
      budgetVariance: 8,
      deltaFromBaseline: 60,
      scenarioType: 'Comparison',
    }
    const html = buildCashFlowReportHtml(inputs, result, baselineRecord(), [comparison], meta, {})
    expect(html).toContain('Baseline &amp; Scenario Comparison')
    expect(html).toContain('2026-07-14 10:00:00')
    expect(html).toContain('2026-07-14 10:05:00')
    expect(html).toContain('+8.0%')
    expect(html).not.toContain('No baseline set')
  })
})
