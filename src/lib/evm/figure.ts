import type { EvmInputs } from '../../types/evm'
import { buildEvmCurves, computeEvm } from './calculations'

export const chartColors = {
  pv: '#16a34a',
  ev: '#2563eb',
  ac: '#dc2626',
  es: '#7c3aed',
  grid: 'rgba(148, 163, 184, 0.22)',
  axis: '#cbd5e1',
  text: '#34495e',
}

export interface EvmFigure {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
}

/**
 * Build the Plotly figure (data + layout) for the EVM curve chart.
 * Shared by the on-screen chart and the printable report so both stay in sync.
 * Returns null when the chart cannot be drawn (e.g. manual PV or invalid input).
 */
export function buildEvmFigure(inputs: EvmInputs): EvmFigure | null {
  const series = buildEvmCurves(inputs)
  const result = computeEvm(inputs)
  if (!series || !result.valid) return null

  const { pvTimeline, pvCurve, actualTimeline, evCurve, acCurve } = series
  const { actualDuration, originalDuration, pv, ev, es } = result

  const data: Plotly.Data[] = [
    {
      x: pvTimeline,
      y: pvCurve,
      mode: 'lines',
      name: `Planned Value (${inputs.pvMethod})`,
      line: { color: chartColors.pv, width: 3, shape: 'spline' },
      hovertemplate: 'Month %{x:.1f}<br>PV %{y:,.0f}<extra></extra>',
    },
    {
      x: actualTimeline,
      y: evCurve,
      mode: 'lines',
      name: 'Earned Value (EV)',
      line: { color: chartColors.ev, width: 3, shape: 'spline' },
      hovertemplate: 'Month %{x:.1f}<br>EV %{y:,.0f}<extra></extra>',
    },
    {
      x: actualTimeline,
      y: acCurve,
      mode: 'lines',
      name: 'Actual Cost (AC)',
      line: { color: chartColors.ac, width: 3, shape: 'spline' },
      hovertemplate: 'Month %{x:.1f}<br>AC %{y:,.0f}<extra></extra>',
    },
    {
      x: [actualDuration],
      y: [pv],
      mode: 'markers',
      name: 'Current PV',
      marker: { size: 11, color: chartColors.pv, symbol: 'circle', line: { color: '#ffffff', width: 2 } },
      hovertemplate: 'Current PV<br>Month %{x:.1f}<br>%{y:,.0f}<extra></extra>',
    },
    {
      x: [actualDuration],
      y: [ev],
      mode: 'markers',
      name: 'Current EV',
      marker: { size: 11, color: chartColors.ev, symbol: 'square', line: { color: '#ffffff', width: 2 } },
      hovertemplate: 'Current EV<br>Month %{x:.1f}<br>%{y:,.0f}<extra></extra>',
    },
    {
      x: [actualDuration],
      y: [inputs.ac],
      mode: 'markers',
      name: 'Current AC',
      marker: { size: 11, color: chartColors.ac, symbol: 'diamond', line: { color: '#ffffff', width: 2 } },
      hovertemplate: 'Current AC<br>Month %{x:.1f}<br>%{y:,.0f}<extra></extra>',
    },
  ]

  const shapes: Partial<Plotly.Shape>[] = [
    {
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: actualDuration,
      x1: actualDuration,
      y0: 0,
      y1: 1,
      line: { dash: 'dot', color: '#64748b', width: 2 },
    },
  ]
  if (es !== null) {
    shapes.push({
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: es,
      x1: es,
      y0: 0,
      y1: 1,
      line: { dash: 'dash', color: chartColors.es, width: 2 },
    })
  }

  const annotations: Partial<Plotly.Annotations>[] = [
    {
      x: actualDuration,
      yref: 'paper',
      y: 1,
      text: `Used Duration: ${actualDuration.toFixed(1)} mo`,
      showarrow: false,
      yanchor: 'bottom',
      font: { size: 12, color: '#475569' },
      bgcolor: 'rgba(255,255,255,0.88)',
      bordercolor: '#e2e8f0',
      borderpad: 4,
    },
  ]
  if (es !== null) {
    annotations.push({
      x: es,
      yref: 'paper',
      y: 0,
      text: `Earned Schedule: ${es.toFixed(1)} mo`,
      showarrow: false,
      yanchor: 'top',
      font: { size: 12, color: chartColors.es },
      bgcolor: 'rgba(255,255,255,0.88)',
      bordercolor: '#ede9fe',
      borderpad: 4,
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `EVM Curve Analysis - ${inputs.pvMethod}`,
      x: 0,
      xanchor: 'left',
      font: { size: 16, color: chartColors.text },
    },
    xaxis: {
      title: 'Project Timeline (Months)',
      showgrid: true,
      gridcolor: chartColors.grid,
      showline: true,
      linecolor: chartColors.axis,
      zeroline: false,
      range: [0, originalDuration * 1.05],
    },
    yaxis: {
      title: 'Cost',
      showgrid: true,
      gridcolor: chartColors.grid,
      showline: true,
      linecolor: chartColors.axis,
      zeroline: false,
      tickformat: ',',
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: 'rgba(0,0,0,0)',
    hovermode: 'x unified',
    margin: { l: 56, r: 24, t: 76, b: 64 },
    legend: {
      orientation: 'h',
      yanchor: 'top',
      y: -0.18,
      xanchor: 'left',
      x: 0,
      bgcolor: 'rgba(248, 250, 252, 0.92)',
      bordercolor: '#e2e8f0',
      borderwidth: 1,
      font: { size: 11, color: chartColors.text },
    },
    shapes,
    annotations,
  }

  return { data, layout }
}
