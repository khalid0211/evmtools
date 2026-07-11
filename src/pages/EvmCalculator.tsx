import { useMemo, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { EvmInputs } from '../types/evm'
import { computeEvm } from '../lib/evm/calculations'
import { buildEvmFigure } from '../lib/evm/figure'
import { buildReportHtml, type ReportMeta } from '../lib/evm/report'
import EvmInputsPanel from '../components/evm/EvmInputs'
import EvmResults from '../components/evm/EvmResults'
import EvmChart from '../components/evm/EvmChart'
import ReportDialog from '../components/evm/ReportDialog'
import HelpDialog from '../components/layout/HelpDialog'
import { evmHelp } from '../lib/help/content'
import { useLogToolUsage } from '../lib/auth/useLogToolUsage'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultDates() {
  const statusDate = new Date()
  const planStart = new Date(statusDate)
  planStart.setMonth(planStart.getMonth() - 6)
  const planFinish = new Date(planStart)
  planFinish.setMonth(planFinish.getMonth() + 12)
  return {
    planStart: isoDate(planStart),
    planFinish: isoDate(planFinish),
    statusDate: isoDate(statusDate),
  }
}

const DEFAULT_INPUTS: EvmInputs = {
  bac: 5000,
  ac: 900,
  durationMode: 'duration',
  originalDurationInput: 12,
  actualDurationInput: 6,
  ...defaultDates(),
  pvMethod: 'Linear',
  pvManual: 1000,
  alpha: 2,
  beta: 2,
  evMethod: '% Complete',
  evManual: 1000,
  percentComplete: 20,
  inflationRate: 5,
}

export default function EvmCalculator() {
  useLogToolUsage('evm-calculator')
  const [inputs, setInputs] = useState<EvmInputs>(DEFAULT_INPUTS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const result = useMemo(() => computeEvm(inputs), [inputs])

  const handleChange = (patch: Partial<EvmInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }))

  const generateReport = async (meta: ReportMeta) => {
    setReportBusy(true)
    try {
      const figure = buildEvmFigure(inputs)
      let chartImg = ''
      if (figure) {
        chartImg = await Plotly.toImage(
          { data: figure.data, layout: figure.layout },
          { format: 'png', width: 1000, height: 520, scale: 2 },
        )
      }

      const html = buildReportHtml(inputs, result, meta, chartImg)
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
      console.error('Failed to generate EVM report', err)
      window.alert('Something went wrong while generating the report.')
    } finally {
      setReportBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/80 px-6 py-7 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="page-kicker">Earned Value Management</div>
          <h1 className="page-header !text-left">EVM Calculator</h1>
          <p className="page-subtitle !mx-0 !text-left">
            Track budget, schedule, and forecast performance from one calculation workspace.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setHelpOpen(true)}
            title="How to use the EVM Calculator"
          >
            ❓ Help
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setDialogOpen(true)}
            disabled={!result.valid}
            title={result.valid ? 'Generate a printable report' : 'Enter valid inputs to enable the report'}
          >
            Print Report
          </button>
        </div>
      </div>

      <EvmInputsPanel inputs={inputs} onChange={handleChange} />
      <EvmResults inputs={inputs} result={result} />
      <EvmChart inputs={inputs} />

      <ReportDialog
        open={dialogOpen}
        busy={reportBusy}
        onCancel={() => setDialogOpen(false)}
        onSubmit={generateReport}
      />
      <HelpDialog open={helpOpen} content={evmHelp} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
