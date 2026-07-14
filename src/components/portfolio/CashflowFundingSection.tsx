import { useMemo } from 'react'
import Plot from '../Plot'
import ToggleGroup from '../layout/ToggleGroup'
import FundingTable from './FundingTable'
import { computePortfolioCashflow } from '../../lib/portfolio/cashflow'
import { computeFundingAnalysis } from '../../lib/portfolio/funding'
import {
  buildCashflowFigure,
  buildFundingOverlayFigure,
  buildNetFundingFigure,
} from '../../lib/portfolio/figures'
import type {
  FundingSchedule,
  PeriodGranularity,
  PortfolioProject,
} from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  funding: FundingSchedule
  onSetGranularity: (g: PeriodGranularity) => void
  onSetAmount: (periodKey: string, amount: number) => void
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

export default function CashflowFundingSection({
  projects,
  funding,
  onSetGranularity,
  onSetAmount,
}: Props) {
  // funded periods outside the plan range must stay visible on the shared axis
  const fundedKeys = useMemo(
    () => Object.keys(funding.amounts).filter((k) => funding.amounts[k] > 0),
    [funding.amounts],
  )
  const series = useMemo(
    () => computePortfolioCashflow(projects, funding.granularity, fundedKeys),
    [projects, funding.granularity, fundedKeys],
  )
  const analysis = useMemo(
    () => (series ? computeFundingAnalysis(series, funding) : null),
    [series, funding],
  )
  const cashflowFigure = useMemo(() => (series ? buildCashflowFigure(series) : null), [series])
  const overlayFigure = useMemo(
    () => (analysis ? buildFundingOverlayFigure(analysis) : null),
    [analysis],
  )
  const netFigure = useMemo(() => (analysis ? buildNetFundingFigure(analysis) : null), [analysis])

  const granularityToggle = (
    <ToggleGroup<PeriodGranularity>
      value={funding.granularity}
      label="Period granularity"
      options={[
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Quarterly', label: 'Quarterly' },
        { value: 'Yearly', label: 'Yearly' },
      ]}
      onChange={onSetGranularity}
    />
  )

  if (!series || !analysis) {
    return (
      <div className="card">
        <div className="section-header">
          <span>💰 Cash Flow & Funding</span>
        </div>
        <p className="text-sm text-ink-400">
          Add a project with valid dates and a BAC to see the portfolio cash flow.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="section-header">
          <span>💰 Portfolio Cash Flow</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {granularityToggle}
          <div className="mb-4 text-xs text-ink-500">
            Changing the granularity converts funding amounts (finer periods are split evenly).
          </div>
        </div>
        {series.excluded > 0 && (
          <div className="mb-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-semibold text-ink-700">
            {series.excluded} project(s) excluded — check dates and BAC on the Projects tab.
          </div>
        )}
        {cashflowFigure && <Plot data={cashflowFigure.data} layout={cashflowFigure.layout} />}
      </div>

      <div className="card">
        <div className="section-header">
          <span>🏦 Funding Schedule</span>
        </div>
        <p className="mb-3 text-xs text-ink-500">
          Enter the maximum funding available in each period. Rows highlighted in red are
          overloaded: the cumulative cash requirement exceeds the cumulative funding.
        </p>
        <FundingTable series={series} analysis={analysis} onSetAmount={onSetAmount} />
      </div>

      <div className="card">
        <div className="section-header">
          <span>📉 Funding vs Requirement</span>
        </div>
        {analysis.overloadedRanges.length > 0 ? (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs font-semibold text-danger">
            Funding overload detected:{' '}
            {analysis.overloadedRanges
              .map((r) =>
                r.fromLabel === r.toLabel
                  ? `${r.fromLabel} (shortfall ${fmt(-r.worst)})`
                  : `${r.fromLabel} – ${r.toLabel} (worst shortfall ${fmt(-r.worst)})`,
              )
              .join('; ')}
            . Move or stretch projects, or add funding, to remove the overload.
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-good/30 bg-good/5 p-3 text-xs font-semibold text-good">
            No funding overload — cumulative funding covers the cash requirement in every period.
          </div>
        )}
        {overlayFigure && <Plot data={overlayFigure.data} layout={overlayFigure.layout} />}
        {netFigure && <Plot data={netFigure.data} layout={netFigure.layout} />}
      </div>
    </div>
  )
}
