import { useMemo } from 'react'
import SelectField from '../layout/SelectField'
import NumberField from '../layout/NumberField'
import MetricCard from '../layout/MetricCard'
import Plot from '../Plot'
import { empiricalCdf } from '../../lib/shared/random'
import {
  buildCostHistogramFigure,
  buildDurationHistogramFigure,
  buildScatterFigure,
} from '../../lib/wbs/figures'
import type { MonteCarloResult, WbsSettings } from '../../types/wbs'

interface Props {
  settings: WbsSettings
  result: MonteCarloResult | null
  stale: boolean
  pertCost: number
  pertDuration: number
  onUpdateSettings: (patch: Partial<WbsSettings>) => void
  onRun: () => void
}

const ITERATION_OPTIONS = ['1000', '5000', '10000']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

export default function MonteCarloSection({
  settings,
  result,
  stale,
  pertCost,
  pertDuration,
  onUpdateSettings,
  onRun,
}: Props) {
  // memoized so 3 Plotly charts don't redraw on unrelated page re-renders
  const figures = useMemo(() => {
    if (!result) return null
    return {
      costHist: buildCostHistogramFigure(result),
      durHist: buildDurationHistogramFigure(result),
      scatter: buildScatterFigure(result),
    }
  }, [result])

  const probabilityRows = useMemo(() => {
    if (!result) return null
    return [
      {
        label: 'P50 (median)',
        cost: result.costStats.p50,
        costProb: 0.5,
        dur: result.durationStats.p50,
        durProb: 0.5,
      },
      {
        label: 'P80',
        cost: result.costStats.p80,
        costProb: 0.8,
        dur: result.durationStats.p80,
        durProb: 0.8,
      },
      {
        label: 'P90',
        cost: result.costStats.p90,
        costProb: 0.9,
        dur: result.durationStats.p90,
        durProb: 0.9,
      },
      {
        label: 'PERT estimate',
        cost: pertCost,
        costProb: empiricalCdf(result.costs, pertCost),
        dur: pertDuration,
        durProb: empiricalCdf(result.durations, pertDuration),
      },
    ]
  }, [result, pertCost, pertDuration])

  return (
    <div className="card space-y-4">
      <div className="section-header">
        <span>🎲 Monte Carlo Analysis</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <SelectField
            label="Iterations"
            value={String(settings.mcIterations)}
            options={ITERATION_OPTIONS}
            onChange={(v) => onUpdateSettings({ mcIterations: parseInt(v, 10) })}
          />
        </div>
        <div className="w-36">
          <NumberField
            label="Seed"
            value={settings.mcSeed}
            onChange={(v) => onUpdateSettings({ mcSeed: Math.round(v) })}
          />
        </div>
        <button
          type="button"
          className="btn-secondary h-11"
          title="Pick a random seed"
          onClick={() => onUpdateSettings({ mcSeed: Math.floor(Math.random() * 1_000_000) })}
        >
          🎲 Re-roll
        </button>
        <button type="button" className="btn-primary h-11" onClick={onRun}>
          Run Simulation
        </button>
      </div>
      <p className="text-xs text-ink-400">The same seed reproduces the same simulation.</p>

      {!settings.advanced && (
        <p className="text-xs text-ink-400">
          Tip: enable <strong>Advanced (3-point)</strong> and spread optimistic/pessimistic values —
          with single-point estimates every iteration returns the same totals.
        </p>
      )}

      {stale && result && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs font-semibold text-ink-700">
          Inputs changed since this simulation — re-run to refresh the results below.
        </div>
      )}

      {result && figures && probabilityRows && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Cost Mean" value={fmt(result.costStats.mean)} />
            <MetricCard label="Cost Std Dev" value={fmt(result.costStats.std)} />
            <MetricCard label="Duration Mean" value={`${fmt(result.durationStats.mean)} d`} />
            <MetricCard label="Duration Std Dev" value={`${fmt(result.durationStats.std)} d`} />
          </div>
          {result.excludedFromDuration > 0 && (
            <p className="text-xs text-ink-400">
              ⚠ {result.excludedFromDuration} work package
              {result.excludedFromDuration === 1 ? '' : 's'} without valid dates excluded from the
              duration model.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card-muted">
              <Plot data={figures.costHist.data} layout={figures.costHist.layout} />
            </div>
            <div className="card-muted">
              <Plot data={figures.durHist.data} layout={figures.durHist.layout} />
            </div>
          </div>

          <div className="card-muted overflow-x-auto">
            <div className="subsection-title">Probability of Completion Within Estimate</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3">Estimate</th>
                  <th className="py-2 pr-3 text-right">Cost</th>
                  <th className="py-2 pr-3 text-right">Cum. Probability</th>
                  <th className="py-2 pr-3 text-right">Duration (days)</th>
                  <th className="py-2 text-right">Cum. Probability</th>
                </tr>
              </thead>
              <tbody>
                {probabilityRows.map((row) => (
                  <tr key={row.label} className="border-b border-ink-100 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-ink-700">{row.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(row.cost)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-brand-700">
                      {pct(row.costProb)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(row.dur)}</td>
                    <td className="py-2 text-right tabular-nums text-brand-700">
                      {pct(row.durProb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-ink-400">
              Cum. probability = share of simulated outcomes at or below the estimate. The PERT row
              shows where the deterministic PERT totals fall within the simulated distributions.
            </p>
          </div>

          <div className="card-muted">
            <Plot data={figures.scatter.data} layout={figures.scatter.layout} />
          </div>
        </>
      )}
    </div>
  )
}
