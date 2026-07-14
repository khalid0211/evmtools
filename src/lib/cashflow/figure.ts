import type { CashFlowInputs, CashFlowResult } from '../../types/cashflow'

export interface CashFlowFigure {
  data: Plotly.Data[]
  layout: Partial<Plotly.Layout>
}

/**
 * Baseline vs simulated cash flow bars with both cumulative curves on a
 * secondary axis. Shared by the on-screen chart and the printable report.
 */
export function buildCashFlowChartFigure(
  inputs: CashFlowInputs,
  result: CashFlowResult,
): CashFlowFigure {
  return {
    data: [
      {
        x: result.labels,
        y: result.baselineData,
        type: 'bar',
        name: 'Baseline Cash Flow',
        marker: {
          color: 'rgba(40, 167, 69, 0.7)',
          line: { color: 'rgba(40, 167, 69, 1)', width: 1 },
        },
      },
      {
        x: result.labels,
        y: result.simulatedData,
        type: 'bar',
        name: 'Simulated Cash Flow',
        marker: {
          color: 'rgba(0, 123, 255, 0.7)',
          line: { color: 'rgba(0, 123, 255, 1)', width: 1 },
        },
      },
      {
        x: result.labels,
        y: result.baselineAccumulated,
        name: 'Baseline Cumulative',
        mode: 'lines+markers',
        line: { color: '#28a745', width: 3 },
        marker: { size: 5, color: '#28a745' },
        yaxis: 'y2',
      },
      {
        x: result.labels,
        y: result.simulatedAccumulated,
        name: 'Simulated Cumulative',
        mode: 'lines+markers',
        line: { color: '#007bff', width: 3 },
        marker: { size: 5, color: '#007bff' },
        yaxis: 'y2',
      },
    ] as Plotly.Data[],
    layout: {
      title: {
        text: `Project Cash Flow Analysis - ${inputs.pattern} Pattern`,
        x: 0.5,
        xanchor: 'center',
        font: { size: 16, color: '#495057', family: 'Arial, sans-serif' },
      },
      xaxis: {
        title: result.xLabel,
        showgrid: false,
        showline: true,
        linecolor: '#dee2e6',
        tickcolor: '#6c757d',
      },
      yaxis: {
        title: result.yLabel,
        side: 'left',
        showgrid: true,
        gridcolor: 'rgba(222, 226, 230, 0.5)',
        showline: true,
        linecolor: '#dee2e6',
        tickcolor: '#6c757d',
      },
      yaxis2: {
        title: 'Cumulative Cash Flow (Millions)',
        side: 'right',
        overlaying: 'y',
        showgrid: false,
        showline: true,
        linecolor: '#dee2e6',
        tickcolor: '#6c757d',
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'center',
        x: 0.5,
        bgcolor: 'rgba(248, 249, 250, 0.9)',
        bordercolor: '#dee2e6',
        borderwidth: 1,
        font: { size: 11 },
      },
      plot_bgcolor: '#ffffff',
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 40, r: 50, t: 60, b: 40 },
    },
  }
}
