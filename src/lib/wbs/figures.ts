import type {
  MonteCarloResult,
  SummaryStats,
  WbsCashFlowSeries,
  WbsComputed,
  WbsState,
} from '../../types/wbs'
import { riskTone, type RiskTone } from './calculations'
import { isLeaf } from './tree'

const MS_DAY = 86_400_000

export interface WbsFigure {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
}

/** chi-square quantile, 2 degrees of freedom, for the 80% confidence region */
const CHI2_80 = 3.219

const TONE_COLORS: Record<RiskTone, string> = {
  good: '#28a745',
  warn: '#ffc107',
  danger: '#dc3545',
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
export function confidenceEllipse(
  xs: number[],
  ys: number[],
): { x: number[]; y: number[] } | null {
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

export function buildCostHistogramFigure(result: MonteCarloResult): WbsFigure {
  return {
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
    },
  }
}

export function buildDurationHistogramFigure(result: MonteCarloResult): WbsFigure {
  return {
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
    },
  }
}

export function buildScatterFigure(result: MonteCarloResult): WbsFigure {
  const ellipse = confidenceEllipse(result.durations, result.costs)
  const data: unknown[] = [
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
    data.push({
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
    data: data as Plotly.Data[],
    layout: {
      title: { text: 'Cost vs Duration', font: { size: 14 } },
      xaxis: { title: { text: 'Duration (days)' } },
      yaxis: { title: { text: 'Total Cost' } },
      margin: { t: 40, r: 20, b: 45, l: 55 },
      height: 360,
      showlegend: true,
      legend: { orientation: 'h' as const, y: -0.2 },
    },
  }
}

/** Per-period spend bars with the cumulative S-curve on a secondary axis. */
export function buildCashFlowFigure(series: WbsCashFlowSeries, basisLabel: string): WbsFigure {
  return {
    data: [
      {
        x: series.labels,
        y: series.perPeriod,
        type: 'bar',
        name: 'Per-period spend',
        marker: { color: '#3498db', opacity: 0.75 },
        hovertemplate: '%{x}<br>Spend: %{y:,.0f}<extra></extra>',
      },
      {
        x: series.labels,
        y: series.cumulative,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Cumulative (S-curve)',
        yaxis: 'y2',
        line: { color: '#6f42c1', width: 3 },
        marker: { size: 5 },
        hovertemplate: '%{x}<br>Cumulative: %{y:,.0f}<extra></extra>',
      },
    ] as Plotly.Data[],
    layout: {
      title: { text: `Project Cash Flow (${basisLabel})`, font: { size: 14 } },
      xaxis: { tickangle: -35 },
      yaxis: { title: { text: 'Spend per period' }, rangemode: 'tozero' },
      yaxis2: {
        title: { text: 'Cumulative' },
        overlaying: 'y',
        side: 'right',
        rangemode: 'tozero',
        showgrid: false,
      },
      margin: { t: 40, r: 60, b: 70, l: 60 },
      height: 360,
      showlegend: true,
      legend: { orientation: 'h' as const, y: -0.3 },
      bargap: 0.25,
    },
  }
}

/**
 * Horizontal-bar Gantt of dictionary (leaf) items with valid dates, in WBS
 * order top-down, colored by risk category. Null when no leaf has dates.
 */
export function buildGanttFigure(state: WbsState, computed: WbsComputed): WbsFigure | null {
  const rows: {
    label: string
    start: string
    end: string
    durationMs: number
    color: string
    risk: string
  }[] = []
  for (const id of computed.orderedIds) {
    const node = state.nodes[id]
    if (!isLeaf(node)) continue
    const { startDate, endDate, riskLikelihood, riskImpact } = node.dict
    if (!startDate || !endDate || endDate < startDate) continue
    const roll = computed.perNode[id]
    const durationMs = Math.max(
      Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`),
      MS_DAY / 2, // zero-duration items still get a visible sliver
    )
    const tone = riskTone(
      (riskLikelihood === 'Low' ? 1 : riskLikelihood === 'Medium' ? 2 : 3) *
        (riskImpact === 'Low' ? 1 : riskImpact === 'Medium' ? 2 : 3),
    )
    rows.push({
      label: `${roll.code} ${node.name}`,
      start: startDate,
      end: endDate,
      durationMs,
      color: TONE_COLORS[tone],
      risk: `${riskLikelihood} / ${riskImpact}`,
    })
  }
  if (rows.length === 0) return null

  // reverse so the first WBS item appears at the top of the chart
  const ordered = [...rows].reverse()
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: ordered.map((r) => r.label),
        base: ordered.map((r) => r.start),
        x: ordered.map((r) => r.durationMs),
        marker: { color: ordered.map((r) => r.color), opacity: 0.85 },
        customdata: ordered.map((r) => [r.start, r.end, r.risk]) as unknown as Plotly.Datum[],
        hovertemplate:
          '%{y}<br>%{customdata[0]} → %{customdata[1]}<br>Risk: %{customdata[2]}<extra></extra>',
      },
    ] as unknown as Plotly.Data[],
    layout: {
      xaxis: { type: 'date' },
      yaxis: { automargin: true },
      margin: { t: 20, r: 20, b: 45, l: 20 },
      height: 90 + ordered.length * 36,
      bargap: 0.35,
      showlegend: false,
    },
  }
}
