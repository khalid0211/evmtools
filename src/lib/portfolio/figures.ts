import type { PortfolioProject } from '../../types/portfolio'
import type { PortfolioCashflowSeries } from './cashflow'
import { isValidProject } from './cashflow'
import type { FundingAnalysis } from './funding'
import type { ActualCurves, PvTimeSeries } from './history'
import { parseUtc } from './periods'

const MS_DAY = 86_400_000

export interface PortfolioFigure {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
}

/** One stable color per project (cycled), shared by the Gantt and the stacked cash flow. */
export const PROJECT_PALETTE = [
  '#3498db',
  '#667eea',
  '#28a745',
  '#6f42c1',
  '#e67e22',
  '#17a2b8',
  '#e83e8c',
  '#20c997',
]

export function projectColor(index: number): string {
  return PROJECT_PALETTE[index % PROJECT_PALETTE.length]
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

/**
 * Horizontal-bar Gantt of valid projects in entry order top-down, with an
 * optional dashed data-date line. Null when no project has valid dates.
 */
export function buildPortfolioGanttFigure(
  projects: PortfolioProject[],
  dataDate: string | null,
): PortfolioFigure | null {
  const rows = projects
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => isValidProject(p))
    .map(({ p, index }) => ({
      label: p.name || 'Unnamed project',
      start: p.planStart,
      end: p.planFinish,
      durationMs: Math.max(parseUtc(p.planFinish) - parseUtc(p.planStart), MS_DAY / 2),
      color: projectColor(index),
      bac: p.bac,
      curve: p.curve,
    }))
  if (rows.length === 0) return null

  // reverse so the first project appears at the top of the chart
  const ordered = [...rows].reverse()
  const shapes: Partial<Plotly.Layout>['shapes'] = []
  if (dataDate && Number.isFinite(parseUtc(dataDate))) {
    shapes.push({
      type: 'line',
      x0: dataDate,
      x1: dataDate,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#dc3545', width: 1.5, dash: 'dash' },
    })
  }
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: ordered.map((r) => r.label),
        base: ordered.map((r) => r.start),
        x: ordered.map((r) => r.durationMs),
        marker: { color: ordered.map((r) => r.color), opacity: 0.85 },
        customdata: ordered.map((r) => [r.start, r.end, fmt(r.bac), r.curve]) as unknown as Plotly.Datum[],
        hovertemplate:
          '%{y}<br>%{customdata[0]} → %{customdata[1]}<br>BAC: %{customdata[2]} (%{customdata[3]})<extra></extra>',
      },
    ] as unknown as Plotly.Data[],
    layout: {
      xaxis: { type: 'date' },
      yaxis: { automargin: true },
      margin: { t: 20, r: 20, b: 45, l: 20 },
      height: 90 + ordered.length * 36,
      bargap: 0.35,
      showlegend: false,
      shapes,
    },
  }
}

/** Stacked per-project spend bars with the portfolio cumulative curve on a secondary axis. */
export function buildCashflowFigure(series: PortfolioCashflowSeries): PortfolioFigure {
  const bars = series.perProject.map((row, index) => ({
    x: series.labels,
    y: row.values,
    type: 'bar',
    name: row.name || 'Unnamed project',
    marker: { color: projectColor(index), opacity: 0.8 },
    hovertemplate: '%{x}<br>%{fullData.name}: %{y:,.1f}<extra></extra>',
  }))
  return {
    data: [
      ...bars,
      {
        x: series.labels,
        y: series.cumulative,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Cumulative cash flow',
        yaxis: 'y2',
        line: { color: '#6f42c1', width: 3 },
        marker: { size: 5 },
        hovertemplate: '%{x}<br>Cumulative: %{y:,.1f}<extra></extra>',
      },
    ] as unknown as Plotly.Data[],
    layout: {
      title: { text: 'Portfolio Cash Flow', font: { size: 14 } },
      barmode: 'stack',
      // 'category' keeps yearly labels like "2026" from being parsed as numbers
      xaxis: { tickangle: -35, type: 'category' },
      yaxis: { title: { text: 'Cash per period' }, rangemode: 'tozero' },
      yaxis2: {
        title: { text: 'Cumulative' },
        overlaying: 'y',
        side: 'right',
        rangemode: 'tozero',
        showgrid: false,
      },
      margin: { t: 40, r: 60, b: 70, l: 60 },
      height: 380,
      showlegend: true,
      legend: { orientation: 'h' as const, y: -0.3 },
      bargap: 0.25,
    },
  }
}

/** Overloaded periods as translucent red bands (category axes are numeric 0..n-1 under the hood). */
function overloadBands(analysis: FundingAnalysis): Partial<Plotly.Layout>['shapes'] {
  const shapes: NonNullable<Partial<Plotly.Layout>['shapes']> = []
  analysis.overloaded.forEach((over, i) => {
    if (!over) return
    shapes.push({
      type: 'rect',
      x0: i - 0.5,
      x1: i + 0.5,
      y0: 0,
      y1: 1,
      yref: 'paper',
      fillcolor: 'rgba(220, 53, 69, 0.12)',
      line: { width: 0 },
    })
  })
  return shapes
}

/** Cumulative cash requirement vs cumulative funding, with overloaded periods shaded. */
export function buildFundingOverlayFigure(analysis: FundingAnalysis): PortfolioFigure {
  return {
    data: [
      {
        x: analysis.labels,
        y: analysis.cumulativeRequirement,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Cumulative requirement',
        line: { color: '#6f42c1', width: 3 },
        marker: { size: 5 },
        hovertemplate: '%{x}<br>Requirement: %{y:,.1f}<extra></extra>',
      },
      {
        x: analysis.labels,
        y: analysis.cumulativeFunding,
        type: 'scatter',
        mode: 'lines',
        name: 'Cumulative funding',
        line: { color: '#28a745', width: 3, shape: 'hv' },
        hovertemplate: '%{x}<br>Funding: %{y:,.1f}<extra></extra>',
      },
    ] as Plotly.Data[],
    layout: {
      title: { text: 'Funding vs Cash Requirement', font: { size: 14 } },
      xaxis: { tickangle: -35, type: 'category' },
      yaxis: { title: { text: 'Cumulative' }, rangemode: 'tozero' },
      margin: { t: 40, r: 20, b: 70, l: 60 },
      height: 360,
      showlegend: true,
      legend: { orientation: 'h' as const, y: -0.3 },
      shapes: overloadBands(analysis),
    },
  }
}

/** Net cumulative funding headroom per period; negative (red) bars = overload. */
export function buildNetFundingFigure(analysis: FundingAnalysis): PortfolioFigure {
  return {
    data: [
      {
        x: analysis.labels,
        y: analysis.net,
        type: 'bar',
        name: 'Net funding headroom',
        marker: { color: analysis.overloaded.map((over) => (over ? '#dc3545' : '#28a745')) },
        hovertemplate: '%{x}<br>Headroom: %{y:,.1f}<extra></extra>',
      },
    ] as unknown as Plotly.Data[],
    layout: {
      title: { text: 'Net Funding Headroom (cumulative funding − requirement)', font: { size: 14 } },
      xaxis: { tickangle: -35, type: 'category' },
      yaxis: { title: { text: 'Headroom' } },
      margin: { t: 40, r: 20, b: 70, l: 60 },
      height: 300,
      showlegend: false,
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: 0,
          y1: 0,
          line: { color: '#5a6268', width: 1 },
        },
      ],
    },
  }
}

/** Planned Value curve with the EV/AC history traced through snapshot data dates. */
export function buildProgressFigure(
  pvCurve: PvTimeSeries,
  actuals: ActualCurves,
  dataDate: string | null,
): PortfolioFigure {
  const data: unknown[] = [
    {
      x: pvCurve.dates,
      y: pvCurve.values,
      type: 'scatter',
      mode: 'lines',
      name: 'Planned Value (PV)',
      line: { color: '#3498db', width: 3 },
      hovertemplate: '%{x}<br>PV: %{y:,.1f}<extra></extra>',
    },
  ]
  if (actuals.dates.length > 0) {
    data.push(
      {
        x: actuals.dates,
        y: actuals.ev,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Earned Value (EV)',
        line: { color: '#28a745', width: 3 },
        marker: { size: 7 },
        hovertemplate: '%{x}<br>EV: %{y:,.1f}<extra></extra>',
      },
      {
        x: actuals.dates,
        y: actuals.ac,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Actual Cost (AC)',
        line: { color: '#dc3545', width: 3 },
        marker: { size: 7 },
        hovertemplate: '%{x}<br>AC: %{y:,.1f}<extra></extra>',
      },
    )
  }
  const shapes: Partial<Plotly.Layout>['shapes'] = []
  if (dataDate && Number.isFinite(parseUtc(dataDate))) {
    shapes.push({
      type: 'line',
      x0: dataDate,
      x1: dataDate,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#5a6268', width: 1.5, dash: 'dash' },
    })
  }
  return {
    data: data as Plotly.Data[],
    layout: {
      title: { text: 'Portfolio Progress (PV / EV / AC)', font: { size: 14 } },
      xaxis: { type: 'date' },
      yaxis: { title: { text: 'Value' }, rangemode: 'tozero' },
      margin: { t: 40, r: 20, b: 45, l: 60 },
      height: 380,
      showlegend: true,
      legend: { orientation: 'h' as const, y: -0.2 },
      shapes,
    },
  }
}
