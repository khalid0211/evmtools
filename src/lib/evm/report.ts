import type { EvmInputs, EvmResult } from '../../types/evm'

export interface ReportMeta {
  projectName: string
  organization: string
}

function num(n: number | null, decimals = 0): string {
  if (n === null || !isFinite(n)) return 'N/A'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const GOOD = '#1b7f3b'
const BAD = '#c0392b'
const WARN = '#b8860b'
const NEUTRAL = '#495057'

function varianceColor(n: number): string {
  if (n > 0) return GOOD
  if (n < 0) return BAD
  return WARN
}

function indexColor(n: number | null, neutralAtOne = true): string {
  if (n === null) return NEUTRAL
  if (neutralAtOne) {
    if (n > 1) return GOOD
    if (n < 1) return BAD
    return WARN
  }
  if (n >= 1) return GOOD
  if (n < 0.8) return BAD
  return WARN
}

function healthColor(status: EvmResult['healthStatus']): string {
  if (status === 'Excellent') return GOOD
  if (status === 'At Risk') return WARN
  return BAD
}

function pvMethodLabel(inputs: EvmInputs): string {
  if (inputs.pvMethod === 'Enter Value') return 'Manual Entry'
  if (inputs.pvMethod === 'S-Curve') return `S-Curve (\u03b1=${inputs.alpha}, \u03b2=${inputs.beta})`
  return 'Linear'
}

function evMethodLabel(inputs: EvmInputs): string {
  if (inputs.evMethod === 'Enter Value') return 'Manual Entry'
  if (inputs.evMethod === '% Complete') return `% Complete (${inputs.percentComplete.toFixed(1)}%)`
  return `Estimate — PV of AC @ ${inputs.inflationRate}% inflation`
}

function row(label: string, value: string, hint = ''): string {
  const hintHtml = hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ''
  return `<tr><th>${escapeHtml(label)}</th><td>${value} ${hintHtml}</td></tr>`
}

function metric(label: string, value: string, formula: string, color = NEUTRAL): string {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value" style="color:${color}">${value}</div>
      <div class="metric-formula">${escapeHtml(formula)}</div>
    </div>`
}

function statusPill(label: string, value: string, color: string): string {
  return `
    <div class="status">
      <span class="status-label">${escapeHtml(label)}</span>
      <span class="status-value" style="color:${color}">${escapeHtml(value)}</span>
    </div>`
}

/**
 * Build a self-contained, A4 print-ready HTML report for an EVM calculation.
 * `chartImg` is an optional PNG data URL of the EVM curve chart.
 */
export function buildReportHtml(
  inputs: EvmInputs,
  result: EvmResult,
  meta: ReportMeta,
  chartImg: string,
): string {
  const generated = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const projectName = escapeHtml(meta.projectName || 'Sample Project')
  const organization = escapeHtml(meta.organization || 'PMO')

  const showEs = inputs.pvMethod !== 'Enter Value'
  const progressPct = inputs.bac > 0 ? (result.ev / inputs.bac) * 100 : 0

  const durationRows =
    inputs.durationMode === 'dates'
      ? row('Plan Start', escapeHtml(inputs.planStart)) +
        row('Plan Finish', escapeHtml(inputs.planFinish)) +
        row('Status Date', escapeHtml(inputs.statusDate)) +
        row('Original Duration', `${num(result.originalDuration, 1)} months`, 'derived from dates') +
        row('Used Duration', `${num(result.actualDuration, 1)} months`, 'derived from dates')
      : row('Original Duration', `${num(result.originalDuration, 1)} months`) +
        row('Used Duration', `${num(result.actualDuration, 1)} months`)

  const pvRow =
    inputs.pvMethod === 'Enter Value'
      ? row('Planned Value (manual)', num(inputs.pvManual))
      : ''

  const evRow =
    inputs.evMethod === 'Enter Value'
      ? row('Earned Value (manual)', num(inputs.evManual))
      : ''

  const chartSection = chartImg
    ? `<div class="section chart-section">
         <h2>EVM Curve Analysis</h2>
         <img class="chart" src="${chartImg}" alt="EVM Curve Analysis chart" />
       </div>`
    : `<div class="section chart-section">
         <h2>EVM Curve Analysis</h2>
         <p class="muted">Curve chart is unavailable for the selected Planned Value method.</p>
       </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>EVM Report — ${projectName}</title>
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
    border-bottom: 3px solid #3498db;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .report-kicker {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 10px;
    font-weight: 700;
    color: #2980b9;
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
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th, table.kv td {
    border: 1px solid #e2e8f0;
    padding: 6px 9px;
    text-align: left;
    vertical-align: top;
    font-size: 11px;
  }
  table.kv th { background: #f5f8fb; width: 42%; font-weight: 600; color: #34495e; }
  .hint { color: #94a3b8; font-size: 10px; }
  .grid { display: grid; gap: 8px; }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-5 { grid-template-columns: repeat(5, 1fr); }
  .metric {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdff;
  }
  .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; color: #7c8a99; }
  .metric-value { font-size: 16px; font-weight: 800; margin: 3px 0 1px; }
  .metric-formula { font-size: 9.5px; color: #94a3b8; }
  .status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .status {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #f8fafc;
    text-align: center;
  }
  .status-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #7c8a99; }
  .status-value { font-size: 14px; font-weight: 800; }
  .chart { width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
  .muted { color: #94a3b8; }
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
      <div class="report-kicker">Earned Value Management Report</div>
      <div class="report-title">${projectName}</div>
      <div class="report-meta">
        <span><strong>Organization:</strong> ${organization}</span>
        <span><strong>Generated:</strong> ${escapeHtml(generated)}</span>
      </div>
    </header>

    <div class="section">
      <h2>Project Parameters</h2>
      <table class="kv">
        ${row('Budget at Completion (BAC)', num(inputs.bac))}
        ${row('Actual Cost (AC)', num(inputs.ac))}
        ${durationRows}
        ${row('Planned Value Method', escapeHtml(pvMethodLabel(inputs)))}
        ${pvRow}
        ${row('Earned Value Method', escapeHtml(evMethodLabel(inputs)))}
        ${evRow}
      </table>
    </div>

    <div class="section">
      <h2>Calculated Values</h2>
      <div class="grid grid-5">
        ${metric('Time Elapsed', `${result.timeElapsedPct.toFixed(1)}%`, 'Used / Original')}
        ${metric('Budget Utilized', `${result.budgetUtilizedPct.toFixed(1)}%`, 'AC / BAC', result.budgetUtilizedPct <= 100 ? GOOD : BAD)}
        ${metric('Completion Efficiency', result.completionEfficiency.toFixed(2), '%Complete / %Time', indexColor(result.completionEfficiency, false))}
        ${metric('Planned Value (PV)', num(result.pv), pvMethodLabel(inputs), GOOD)}
        ${metric('Earned Value (EV)', num(result.ev), evMethodLabel(inputs), '#2563eb')}
      </div>
    </div>

    <div class="section">
      <h2>Performance Metrics</h2>
      <div class="grid ${showEs ? 'grid-3' : 'grid-4'}">
        ${metric('Cost Variance (CV)', num(result.cv), 'EV - AC', varianceColor(result.cv))}
        ${metric('Schedule Variance (SV)', num(result.sv), 'EV - PV', varianceColor(result.sv))}
        ${metric('Cost Performance (CPI)', num(result.cpi, 3), 'EV / AC', indexColor(result.cpi))}
        ${metric('Schedule Performance (SPI)', num(result.spi, 3), 'EV / PV', indexColor(result.spi))}
        ${showEs ? metric('Earned Schedule (ES)', result.es !== null ? `${result.es.toFixed(1)} mo` : 'N/A', 'Months @ PV=EV', '#6f42c1') : ''}
        ${showEs ? metric('SPIe', result.spie !== null ? result.spie.toFixed(3) : 'N/A', 'ES / AD', indexColor(result.spie)) : ''}
      </div>
    </div>

    <div class="section">
      <h2>Project Forecasting</h2>
      <div class="grid grid-4">
        ${metric('Estimate at Completion (EAC)', num(result.eac), 'AC + ETC', result.eac !== null && result.eac <= inputs.bac ? GOOD : BAD)}
        ${metric('Estimate to Complete (ETC)', num(result.etc), '(BAC - EV) / CPI')}
        ${metric('Variance at Completion (VAC)', num(result.vac), 'BAC - EAC', result.vac !== null ? varianceColor(result.vac) : NEUTRAL)}
        ${metric('To Complete Index (TCPI)', num(result.tcpiBac, 3), '(BAC-EV)/(BAC-AC)', result.tcpiBac <= 1 ? GOOD : result.tcpiBac <= 1.2 ? WARN : BAD)}
      </div>
    </div>

    <div class="section">
      <h2>Project Status Summary</h2>
      <div class="status-grid">
        ${statusPill('Cost', result.costStatus, varianceColor(result.cv))}
        ${statusPill('Schedule', result.scheduleStatus, varianceColor(result.sv))}
        ${statusPill('Health', result.healthStatus, healthColor(result.healthStatus))}
        ${statusPill('Progress', `${progressPct.toFixed(1)}% Complete`, '#2563eb')}
      </div>
    </div>

    ${chartSection}

    <footer class="report-footer">
      <span>Portfolio Analysis Suite — EVM Calculator</span>
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
