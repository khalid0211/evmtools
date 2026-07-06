import { useMemo } from 'react'
import SelectField from '../layout/SelectField'
import NumberField from '../layout/NumberField'
import MetricCard from '../layout/MetricCard'
import Plot from '../Plot'
import { empiricalCdf } from '../../lib/shared/random'
import type { MonteCarloResult, SummaryStats, WbsSettings } from '../../types/wbs'

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

/** chi-square quantile, 2 degrees of freedom, for the 80% confidence region */
const CHI2_80 = 3.219

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

function percentileShapes(stats: SummaryStats): Partial<Plotly.Layout>['shapes'] {
  return [stats.p50, stats.p80, stats.p90].map((p) => ({
    type: 'line' as const,
    x0: p,
    x1: p,
    y0: 0,
    y1: 1,
    yref: 'paper' as const,
    line: { color: '#6f42c1', width: 1.5, dash: 'dash' as const },
  }))
}

function percentileAnnotations(stats: SummaryStats): Partial<Plotly.Layout>['annotations'] {
  return [
    { p: stats.p50, label: 'P50' },
    { p: stats.p80, label: 'P80' },
    { p: stats.p90, label: 'P90' },
  ].map(({ p, label }) => ({
    x: p,
    y: 1,
    yref: 'paper' as const,
    text: label,
    showarrow: false,
    yanchor: 'bottom' as const,
    font: { size: 10, color: '#6f42c1' },
  }))
}

/**
 * Points tracing the 80% covariance ellipse of (x, y) samples, assuming an
 * approximately elliptical scatter. Returns null when either axis is constant.
 */
function confidenceEllipse(xs: number[], ys: number[]): { x: number[]; y: number[] } | null {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  sxx /= n - 1
  syy /= n - 1
  sxy /= n - 1
  if (sxx < 1e-9 || syy < 1e-9) return null
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const half = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2)
  const l1 = (sxx + syy) / 2 + half
  const l2 = Math.max((sxx + syy) / 2 - half, 0)
  const a = Math.sqrt(l1 * CHI2_80)
  const b = Math.sqrt(l2 * CHI2_80)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const x: number[] = []
  const y: number[] = []
  const steps = 72
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps
    x.push(mx + a * Math.cos(t) * cos - b * Math.sin(t) * sin)
    y.push(my + a * Math.cos(t) * sin + b * Math.sin(t) * cos)
  }
  return { x, y }
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
    const ellipse = confidenceEllipse(result.durations, result.costs)
    const scatterData: unknown[] = [
      {
        x: result.durations,
        y: result.costs,
        type: 'scatter',
        mode: 'markers',
        name: 'Simulations',
        marker: { color: '#3498db', size: 4, opacity: 0.3 },
        hovertemplate: 'Duration: %{x:.0f} d<br>Cost: %{y}<extra></extra>',
      },
    ]
    if (ellipse) {
      scatterData.push({
        x: ellipse.x,
        y: ellipse.y,
        type: 'scatter',
        mode: 'lines',
        name: '≈80% of outcomes',
        line: { color: '#dc3545', width: 2, dash: 'dash' },
        hoverinfo: 'skip',
      })
    }
    return {
      costHist: {
        // nbinsx is valid Plotly but missing from @types/plotly.js, hence the unknown cast
        data: [
          {
            x: result.costs,
            type: 'histogram',
            nbinsx: 40,
            marker: { color: '#667eea' },
            hovertemplate: 'Cost: %{x}<br>Runs: %{y}<extra></extra>',
          },
        ] as unknown as Plotly.Data[],
        layout: {
          title: { text: 'Project Cost Distribution', font: { size: 14 } },
          xaxis: { title: { text: 'Total Cost' } },
          yaxis: { title: { text: 'Frequency' } },
          margin: { t: 40, r: 20, b: 45, l: 55 },
          height: 300,
          shapes: percentileShapes(result.costStats),
          annotations: percentileAnnotations(result.costStats),
        } as Partial<Plotly.Layout>,
      },
      durHist: {
        data: [
          {
            x: result.durations,
            type: 'histogram',
            nbinsx: 40,
            marker: { color: '#28a745' },
            hovertemplate: 'Duration: %{x:.0f} d<br>Runs: %{y}<extra></extra>',
          },
        ] as unknown as Plotly.Data[],
        layout: {
          title: { text: 'Project Duration Distribution', font: { size: 14 } },
          xaxis: { title: { text: 'Duration (days)' } },
          yaxis: { title: { text: 'Frequency' } },
          margin: { t: 40, r: 20, b: 45, l: 55 },
          height: 300,
          shapes: percentileShapes(result.durationStats),
          annotations: percentileAnnotations(result.durationStats),
        } as Partial<Plotly.Layout>,
      },
      scatter: {
        data: scatterData as Plotly.Data[],
        layout: {
          title: { text: 'Cost vs Duration', font: { size: 14 } },
          xaxis: { title: { text: 'Duration (days)' } },
          yaxis: { title: { text: 'Total Cost' } },
          margin: { t: 40, r: 20, b: 45, l: 55 },
          height: 360,
          showlegend: true,
          legend: { orientation: 'h' as const, y: -0.2 },
        } as Partial<Plotly.Layout>,
      },
    }
  }, [result])

  const probabilityRows = useMemo(() => {
    if (!result) return null
    const rows = [
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
    return rows
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
