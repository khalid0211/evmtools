import { useMemo } from 'react'
import SelectField from '../layout/SelectField'
import NumberField from '../layout/NumberField'
import MetricCard from '../layout/MetricCard'
import Plot from '../Plot'
import type { MonteCarloResult, SummaryStats, WbsSettings } from '../../types/wbs'

interface Props {
  settings: WbsSettings
  result: MonteCarloResult | null
  stale: boolean
  onUpdateSettings: (patch: Partial<WbsSettings>) => void
  onRun: () => void
}

const ITERATION_OPTIONS = ['1000', '5000', '10000']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function percentileShapes(stats: SummaryStats): Partial<Plotly.Layout>['shapes'] {
  return [
    { p: stats.p50, label: 'P50' },
    { p: stats.p80, label: 'P80' },
    { p: stats.p90, label: 'P90' },
  ].map(({ p }) => ({
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

function statCards(prefix: string, stats: SummaryStats, unit: string) {
  return (
    <>
      <MetricCard label={`${prefix} Mean`} value={`${fmt(stats.mean)}${unit}`} />
      <MetricCard label={`${prefix} P50`} value={`${fmt(stats.p50)}${unit}`} />
      <MetricCard label={`${prefix} P80`} value={`${fmt(stats.p80)}${unit}`} badge="80%" badgeTone="info" />
      <MetricCard label={`${prefix} P90`} value={`${fmt(stats.p90)}${unit}`} />
    </>
  )
}

export default function MonteCarloSection({
  settings,
  result,
  stale,
  onUpdateSettings,
  onRun,
}: Props) {
  // memoized so 3 Plotly charts don't redraw on unrelated page re-renders
  const figures = useMemo(() => {
    if (!result) return null
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
        data: [
          {
            x: result.durations,
            y: result.costs,
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#3498db', size: 4, opacity: 0.3 },
            hovertemplate: 'Duration: %{x:.0f} d<br>Cost: %{y}<extra></extra>',
          },
        ] as Plotly.Data[],
        layout: {
          title: { text: 'Cost vs Duration', font: { size: 14 } },
          xaxis: { title: { text: 'Duration (days)' } },
          yaxis: { title: { text: 'Total Cost' } },
          margin: { t: 40, r: 20, b: 45, l: 55 },
          height: 360,
        } as Partial<Plotly.Layout>,
      },
    }
  }, [result])

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
            help="Same seed reproduces the same simulation"
            onChange={(v) => onUpdateSettings({ mcSeed: Math.round(v) })}
          />
        </div>
        <button
          type="button"
          className="btn-secondary mb-6"
          onClick={() => onUpdateSettings({ mcSeed: Math.floor(Math.random() * 1_000_000) })}
        >
          🎲 Re-roll
        </button>
        <button type="button" className="btn-primary mb-6" onClick={onRun}>
          Run Simulation
        </button>
      </div>

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

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards('Cost', result.costStats, '')}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards('Duration', result.durationStats, ' d')}
          </div>
          {result.excludedFromDuration > 0 && (
            <p className="text-xs text-ink-400">
              ⚠ {result.excludedFromDuration} work package
              {result.excludedFromDuration === 1 ? '' : 's'} without valid dates excluded from the
              duration model.
            </p>
          )}

          {figures && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card-muted">
                  <Plot data={figures.costHist.data} layout={figures.costHist.layout} />
                </div>
                <div className="card-muted">
                  <Plot data={figures.durHist.data} layout={figures.durHist.layout} />
                </div>
              </div>
              <div className="card-muted">
                <Plot data={figures.scatter.data} layout={figures.scatter.layout} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
