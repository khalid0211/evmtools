import type { CashFlowInputs, CashFlowResult, ScenarioRecord } from '../../types/cashflow'

export interface CashFlowReportMeta {
  projectName: string
  organization: string
}

export interface CashFlowReportImages {
  chart: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function signedPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

function metric(label: string, value: string, hint = ''): string {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="metric-formula">${escapeHtml(hint)}</div>` : ''}
    </div>`
}

function comparisonTable(baseline: ScenarioRecord, comparisons: ScenarioRecord[]): string {
  const rows = [
    { ...baseline, scenarioType: 'Baseline' as const, deltaFromBaseline: 0 },
    ...comparisons,
  ]
    .map((r) => {
      const delta = r.deltaFromBaseline ?? 0
      return `
        <tr${r.scenarioType === 'Baseline' ? ' class="summary-row"' : ''}>
          <td>${escapeHtml(r.scenarioType ?? 'Comparison')}</td>
          <td>${escapeHtml(r.timestamp)}</td>
          <td>${escapeHtml(r.pattern)}</td>
          <td class="num">${fmt(r.duration)}</td>
          <td class="num">${fmt(r.startDelay)}</td>
          <td class="num">${fmt(r.projectDelay)}</td>
          <td class="num">${r.inflation.toFixed(1)}%</td>
          <td class="num">${fmt(r.simulatedBudget)}</td>
          <td class="num">${signedPct(r.budgetVariance)}</td>
          <td class="num ${delta > 0 ? 'neg' : delta < 0 ? 'pos' : ''}">${delta === 0 ? '—' : fmt(delta)}</td>
        </tr>`
    })
    .join('')
  return `
    <table class="data">
      <tr>
        <th>Scenario</th><th>Recorded</th><th>Pattern</th><th class="num">Duration (mo)</th>
        <th class="num">Start Delay</th><th class="num">Project Delay</th><th class="num">Inflation</th>
        <th class="num">Simulated Budget</th><th class="num">Variance</th><th class="num">Δ vs Baseline</th>
      </tr>
      ${rows}
    </table>`
}

/**
 * Self-contained, A4 print-ready HTML report for a cash flow simulation:
 * scenario inputs, financial impact, the chart, and the baseline comparison
 * table when one exists. Mirrors the EVM/WBS/Portfolio report pattern.
 */
export function buildCashFlowReportHtml(
  inputs: CashFlowInputs,
  result: CashFlowResult,
  baseline: ScenarioRecord | null,
  comparisons: ScenarioRecord[],
  meta: CashFlowReportMeta,
  images: Partial<CashFlowReportImages>,
): string {
  const generated = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const projectName = escapeHtml(meta.projectName || 'Project')
  const organization = escapeHtml(meta.organization || 'PMO')

  const chartSection = images.chart
    ? `<div class="section">
         <h2>Cash Flow Chart</h2>
         <img class="chart chart-wide" src="${images.chart}" alt="Baseline versus simulated cash flow with cumulative curves" />
         <p class="muted small">
           Bars show per-period cash flow (baseline vs simulated); lines show the cumulative
           totals on the right axis. The simulated series applies the start delay, project
           delay, and monthly-compounded inflation to the baseline.
         </p>
       </div>`
    : ''

  const comparisonSection = baseline
    ? `<div class="section">
         <h2>Baseline &amp; Scenario Comparison</h2>
         ${comparisonTable(baseline, comparisons)}
         ${comparisons.length === 0 ? '<p class="muted small">No comparison scenarios recorded yet — only the baseline is shown.</p>' : ''}
       </div>`
    : `<div class="section">
         <h2>Baseline &amp; Scenario Comparison</h2>
         <p class="muted small">No baseline set — use "Set Baseline" and "Compare to Baseline" in the simulator to build a scenario comparison.</p>
       </div>`

  const varianceClass = result.budgetVariance > 0 ? 'neg-value' : 'pos-value'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Cash Flow Report — ${projectName}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #2c3e50;
    font-size: 12px;
    line-height: 1.45;
    background: #ffffff;
  }
  .toolbar {
    background: #1f6f9e;
    color: #fff;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .toolbar button {
    font: inherit;
    font-weight: 600;
    border: 0;
    border-radius: 6px;
    padding: 8px 14px;
    cursor: pointer;
    background: #ffffff;
    color: #1f6f9e;
  }
  .page { max-width: 190mm; margin: 0 auto; padding: 6mm 4mm; }
  header.report-header {
    border-bottom: 3px solid #28a745;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .report-kicker {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 10px;
    font-weight: 700;
    color: #1e7e34;
  }
  .report-title { font-size: 22px; font-weight: 800; margin: 2px 0 6px; }
  .report-meta { display: flex; flex-wrap: wrap; gap: 4px 24px; color: #495057; font-size: 11px; }
  .report-meta strong { color: #2c3e50; }
  h2 {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #dee2e6;
    color: #1f2d3d;
  }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .grid { display: grid; gap: 8px; margin-bottom: 10px; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .metric {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdff;
  }
  .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; color: #7c8a99; }
  .metric-value { font-size: 15px; font-weight: 800; margin: 3px 0 1px; }
  .metric-formula { font-size: 9.5px; color: #94a3b8; }
  .metric-value.neg-value { color: #c0392b; }
  .metric-value.pos-value { color: #1b7f3b; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.data th, table.data td {
    border: 1px solid #e2e8f0;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
    font-size: 10.5px;
  }
  table.data th { background: #f5f8fb; font-weight: 700; color: #34495e; }
  table.data td.num, table.data th.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.data tr.summary-row td { background: #f8fafc; font-weight: 700; }
  td.neg { color: #c0392b; font-weight: 700; }
  td.pos { color: #1b7f3b; font-weight: 700; }
  .chart { width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
  .chart-wide { margin-top: 8px; }
  .muted { color: #94a3b8; }
  .small { font-size: 10px; margin: 2px 0 8px; }
  footer.report-footer {
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #dee2e6;
    color: #94a3b8;
    font-size: 10px;
    display: flex;
    justify-content: space-between;
  }
  @media print {
    .toolbar { display: none; }
    .page { max-width: none; padding: 0; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <span>Report ready — use your browser's print dialog to print or "Save as PDF".</span>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page">
    <header class="report-header">
      <div class="report-kicker">Cash Flow Simulation Report</div>
      <div class="report-title">${projectName}</div>
      <div class="report-meta">
        <span><strong>Organization:</strong> ${organization}</span>
        <span><strong>Generated:</strong> ${escapeHtml(generated)}</span>
        <span><strong>Pattern:</strong> ${escapeHtml(inputs.pattern)}</span>
      </div>
    </header>

    <div class="section">
      <h2>Scenario Inputs</h2>
      <div class="grid grid-4">
        ${metric('Budget', `${fmt(inputs.budget)} M`)}
        ${metric('Duration', `${fmt(inputs.duration)} months`)}
        ${metric('Pattern', inputs.pattern)}
        ${metric('View', inputs.displayBasis)}
        ${metric('Start Delay', `${fmt(inputs.startDelay)} months`)}
        ${metric('Project Delay', `${fmt(inputs.projectDelay)} months`)}
        ${metric('Inflation', `${inputs.inflation.toFixed(1)}% / year`)}
      </div>
    </div>

    <div class="section">
      <h2>Financial Impact</h2>
      <div class="grid grid-4">
        ${metric('Original Budget', `${fmt(result.baselineBudget)} M`)}
        ${metric('Simulated Budget', `${fmt(result.simulatedBudget)} M`, 'after delays and inflation')}
        <div class="metric">
          <div class="metric-label">Budget Variance</div>
          <div class="metric-value ${varianceClass}">${signedPct(result.budgetVariance)}</div>
        </div>
      </div>
    </div>

    ${chartSection}

    ${comparisonSection}

    <footer class="report-footer">
      <span>Project Management Tools — Cash Flow Simulator</span>
      <span>${projectName} · ${organization}</span>
    </footer>
  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 350);
    });
  </script>
</body>
</html>`
}
