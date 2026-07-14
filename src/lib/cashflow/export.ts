import type { CashFlowResult, ScenarioRecord } from '../../types/cashflow'
import { downloadTextFile, timestampedFilename } from '../shared/download'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(csv: string, filename: string) {
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8;')
}

export function exportComparisons(records: ScenarioRecord[]) {
  const rows = records.map((r) => ({
    scenario_type: r.scenarioType ?? '',
    timestamp: r.timestamp,
    duration: r.duration,
    pattern: r.pattern,
    start_delay: r.startDelay,
    project_delay: r.projectDelay,
    inflation: r.inflation,
    simulated_budget: r.simulatedBudget.toFixed(2),
    budget_variance: r.budgetVariance.toFixed(2),
    delta_from_baseline: (r.deltaFromBaseline ?? 0).toFixed(2),
  }))
  downloadCsv(toCsv(rows), timestampedFilename('baseline_comparison', 'csv'))
}

export function exportCurrentCashflow(result: CashFlowResult) {
  const rows = result.labels.map((label, i) => ({
    period: label,
    period_number: i + 1,
    baseline_cashflow: result.baselineData[i].toFixed(4),
    simulated_cashflow: result.simulatedData[i].toFixed(4),
    variance: (result.simulatedData[i] - result.baselineData[i]).toFixed(4),
    baseline_cumulative: result.baselineAccumulated[i].toFixed(4),
    simulated_cumulative: result.simulatedAccumulated[i].toFixed(4),
  }))
  downloadCsv(toCsv(rows), timestampedFilename('project_cashflow', 'csv'))
}
