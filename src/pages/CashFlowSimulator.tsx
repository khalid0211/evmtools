import { useMemo, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { CashFlowInputs, ScenarioRecord } from '../types/cashflow'
import { computeCashFlow } from '../lib/cashflow/calculations'
import { exportComparisons, exportCurrentCashflow } from '../lib/cashflow/export'
import { buildCashFlowChartFigure } from '../lib/cashflow/figure'
import {
  buildCashFlowReportHtml,
  type CashFlowReportImages,
  type CashFlowReportMeta,
} from '../lib/cashflow/report'
import CashFlowInputsPanel from '../components/cashflow/CashFlowInputs'
import TimelineBar from '../components/cashflow/TimelineBar'
import CashFlowChart from '../components/cashflow/CashFlowChart'
import ComparisonTable from '../components/cashflow/ComparisonTable'
import HelpDialog from '../components/layout/HelpDialog'
import ReportDialog from '../components/evm/ReportDialog'
import { cashFlowHelp } from '../lib/help/content'
import { useLogToolUsage } from '../lib/auth/useLogToolUsage'

const DEFAULT_INPUTS: CashFlowInputs = {
  budget: 1000,
  duration: 12,
  pattern: 'Linear',
  displayBasis: 'Monthly',
  startDelay: 0,
  projectDelay: 0,
  inflation: 5.0,
}

function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function CashFlowSimulator() {
  useLogToolUsage('cash-flow-simulator')
  const [inputs, setInputs] = useState<CashFlowInputs>(DEFAULT_INPUTS)
  const [baseline, setBaseline] = useState<ScenarioRecord | null>(null)
  const [comparisons, setComparisons] = useState<ScenarioRecord[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)

  const result = useMemo(() => computeCashFlow(inputs), [inputs])

  const handleChange = (patch: Partial<CashFlowInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }))

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const currentRecord = (): ScenarioRecord => ({
    timestamp: nowStamp(),
    duration: inputs.duration,
    pattern: inputs.pattern,
    startDelay: inputs.startDelay,
    projectDelay: inputs.projectDelay,
    inflation: inputs.inflation,
    simulatedBudget: result.simulatedBudget,
    budgetVariance: result.budgetVariance,
  })

  const handleSetBaseline = () => {
    setBaseline(currentRecord())
    setComparisons([])
    flash('✓ Baseline set successfully!')
  }

  const handleCompare = () => {
    if (!baseline) {
      flash('⚠️ Please set a baseline first')
      return
    }
    const rec = currentRecord()
    rec.deltaFromBaseline = rec.simulatedBudget - baseline.simulatedBudget
    setComparisons((prev) => [...prev, rec])
    flash('✓ Comparison added!')
  }

  const handleExportComparisons = () => {
    if (!baseline || comparisons.length === 0) {
      flash('⚠️ No comparison data available')
      return
    }
    exportComparisons([
      { ...baseline, scenarioType: 'Baseline', deltaFromBaseline: 0 },
      ...comparisons,
    ])
  }

  const handleExportCashflow = () => {
    exportCurrentCashflow(result)
    flash('📈 Cashflow CSV downloaded')
  }

  async function generateReport(meta: CashFlowReportMeta) {
    setReportBusy(true)
    try {
      const figure = buildCashFlowChartFigure(inputs, result)
      const images: Partial<CashFlowReportImages> = {
        chart: await Plotly.toImage(
          { data: figure.data, layout: figure.layout },
          { format: 'png', width: 1000, height: 420, scale: 2 },
        ),
      }
      const html = buildCashFlowReportHtml(inputs, result, baseline, comparisons, meta, images)
      const win = window.open('', '_blank')
      if (!win) {
        window.alert('Please allow pop-ups for this site to generate the report.')
        return
      }
      win.document.open()
      win.document.write(html)
      win.document.close()
      setDialogOpen(false)
    } catch (err) {
      console.error('Failed to generate cash flow report', err)
      window.alert('Something went wrong while generating the report.')
    } finally {
      setReportBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/80 px-6 py-7 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="page-kicker !text-left">Cash Flow Analysis</div>
          <h1 className="page-header !text-left">💸 Cash Flow Simulator</h1>
          <p className="page-subtitle !mx-0 !text-left">Model cash flow under different scenarios</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setHelpOpen(true)}
            title="How to use the Cash Flow Simulator"
          >
            ❓ Help
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setDialogOpen(true)}
            title="Generate a printable A4 report of the scenario, chart, and comparisons"
          >
            Print Report
          </button>
        </div>
      </div>

      <CashFlowInputsPanel inputs={inputs} onChange={handleChange} />
      <TimelineBar pattern={inputs.pattern} />

      <div className="card">
        <CashFlowChart inputs={inputs} result={result} />
      </div>

      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button className="btn-primary" onClick={handleSetBaseline}>
            📊 Set Baseline
          </button>
          <button className="btn-secondary" onClick={handleCompare}>
            ⚖️ Compare to Baseline
          </button>
          <button className="btn-success" onClick={handleExportComparisons}>
            💾 Export Comparisons
          </button>
          <button className="btn-success" onClick={handleExportCashflow}>
            💰 Export Current Cashflow
          </button>
        </div>

        <div className="font-semibold text-ink-500 mb-2">Financial Impact Analysis</div>
        <div className="bg-ink-50 px-4 py-3 rounded-md border border-ink-200 flex flex-wrap justify-between items-center gap-4 text-sm">
          <span>
            <strong>Original Budget:</strong> {result.baselineBudget.toFixed(1)}M
          </span>
          <span>
            <strong>Simulated Budget:</strong> {result.simulatedBudget.toFixed(1)}M
          </span>
          <span>
            <strong>Budget Variance:</strong>{' '}
            <span
              style={{
                color: result.budgetVariance > 0 ? '#dc3545' : '#28a745',
                fontWeight: 600,
              }}
            >
              {result.budgetVariance > 0 ? '+' : ''}
              {result.budgetVariance.toFixed(1)}%
            </span>
          </span>
        </div>

        {toast && (
          <div className="mt-3 px-4 py-2 rounded-md bg-brand-50 text-brand-700 border border-brand-100 text-sm">
            {toast}
          </div>
        )}
      </div>

      <ComparisonTable baseline={baseline} comparisons={comparisons} />
      <ReportDialog
        open={dialogOpen}
        busy={reportBusy}
        title="Generate Cash Flow Report"
        onCancel={() => setDialogOpen(false)}
        onSubmit={generateReport}
      />
      <HelpDialog open={helpOpen} content={cashFlowHelp} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
