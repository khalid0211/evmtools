import type { PortfolioState } from '../../types/portfolio'
import { monthsBetween } from '../evm/calculations'
import { computePortfolioCashflow, isValidProject } from './cashflow'
import {
  computePortfolioRollup,
  computeProjectStatus,
  type PortfolioRollup,
  type ProjectStatusRow,
} from './evm'
import { computeFundingAnalysis, type FundingAnalysis } from './funding'
import { entryFor, latestSnapshot } from './history'
import type { PortfolioCashflowSeries } from './cashflow'

export interface PortfolioReportMeta {
  projectName: string
  organization: string
}

export interface PortfolioReportImages {
  gantt: string
  cashflow: string
  net: string
  progress: string
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

function fmtIndex(v: number | null): string {
  return v === null ? '—' : v.toFixed(2)
}

function metric(label: string, value: string, hint = ''): string {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="metric-formula">${escapeHtml(hint)}</div>` : ''}
    </div>`
}

function projectsTable(state: PortfolioState): string {
  const rows = state.projects
    .map((p) => {
      const valid = isValidProject(p)
      const curve =
        p.curve === 'S-Curve' ? `S-Curve (α ${p.alpha}, β ${p.beta})` : 'Linear'
      const duration = valid ? fmt(monthsBetween(p.planStart, p.planFinish)) : '—'
      return `
        <tr>
          <td>${escapeHtml(p.name || 'Unnamed project')}${valid ? '' : ' <span class="pill pill-danger">invalid</span>'}</td>
          <td class="num">${fmt(p.bac)}</td>
          <td>${p.planStart || '—'}</td>
          <td>${p.planFinish || '—'}</td>
          <td class="num">${duration}</td>
          <td>${escapeHtml(curve)}</td>
        </tr>`
    })
    .join('')
  return `
    <table class="data">
      <tr>
        <th>Project</th><th class="num">BAC</th><th>Plan Start</th><th>Plan Finish</th>
        <th class="num">Duration (mo)</th><th>Curve</th>
      </tr>
      ${rows}
    </table>`
}

function fundingTable(series: PortfolioCashflowSeries, analysis: FundingAnalysis): string {
  const rows = analysis.periods
    .map((period, i) => {
      const over = analysis.overloaded[i]
      return `
        <tr${over ? ' class="overload-row"' : ''}>
          <td>${escapeHtml(period.label)}</td>
          <td class="num">${fmt(series.perPeriod[i])}</td>
          <td class="num">${fmt(analysis.perPeriodFunding[i])}</td>
          <td class="num">${fmt(analysis.cumulativeRequirement[i])}</td>
          <td class="num">${fmt(analysis.cumulativeFunding[i])}</td>
          <td class="num ${over ? 'neg' : 'pos'}">${fmt(analysis.net[i])}</td>
        </tr>`
    })
    .join('')
  return `
    <table class="data">
      <tr>
        <th>Period</th><th class="num">Requirement</th><th class="num">Funding</th>
        <th class="num">Cum. Requirement</th><th class="num">Cum. Funding</th><th class="num">Headroom</th>
      </tr>
      ${rows}
      <tr class="summary-row">
        <td>Total</td>
        <td class="num">${fmt(analysis.totalRequirement)}</td>
        <td class="num">${fmt(analysis.totalFunding)}</td>
        <td></td><td></td>
        <td class="num ${analysis.totalFunding < analysis.totalRequirement ? 'neg' : 'pos'}">${fmt(analysis.totalFunding - analysis.totalRequirement)}</td>
      </tr>
    </table>`
}

function overloadSummary(analysis: FundingAnalysis): string {
  if (analysis.overloadedRanges.length === 0) {
    return `<p class="callout callout-good">No funding overload — cumulative funding covers the cash requirement in every period.</p>`
  }
  const ranges = analysis.overloadedRanges
    .map((r) =>
      r.fromLabel === r.toLabel
        ? `${escapeHtml(r.fromLabel)} (shortfall ${fmt(-r.worst)})`
        : `${escapeHtml(r.fromLabel)} – ${escapeHtml(r.toLabel)} (worst shortfall ${fmt(-r.worst)})`,
    )
    .join('; ')
  return `<p class="callout callout-danger">Funding overload detected: ${ranges}.</p>`
}

function slipText(slipMonths: number | null): string {
  if (slipMonths === null) return '—'
  const months = Math.abs(slipMonths)
  if (months < 0.05) return 'on plan'
  return slipMonths > 0 ? `${months.toFixed(1)} mo late` : `${months.toFixed(1)} mo early`
}

function statusTable(rows: ProjectStatusRow[]): string {
  const body = rows
    .map((row) => {
      const idx = (v: number | null) => (row.started ? fmtIndex(v) : '—')
      return `
        <tr>
          <td>${escapeHtml(row.name || 'Unnamed project')}${row.started ? '' : ' <span class="muted">(not started)</span>'}</td>
          <td class="num">${fmt(row.bac)}</td>
          <td class="num">${fmt(row.pv)}</td>
          <td class="num">${fmt(row.ac)}</td>
          <td class="num">${fmt(row.pctComplete)}%</td>
          <td class="num">${fmt(row.ev)}</td>
          <td class="num">${idx(row.spi)}</td>
          <td class="num">${idx(row.spie)}</td>
          <td class="num">${idx(row.cpi)}</td>
          <td>${row.started && row.expectedFinish ? row.expectedFinish : '—'}</td>
          <td>${row.started ? slipText(row.slipMonths) : '—'}</td>
        </tr>`
    })
    .join('')
  return `
    <table class="data">
      <tr>
        <th>Project</th><th class="num">BAC</th><th class="num">PV</th><th class="num">AC</th>
        <th class="num">% Comp</th><th class="num">EV</th><th class="num">SPI</th>
        <th class="num">SPIe</th><th class="num">CPI</th><th>Expected Finish</th><th>Slip</th>
      </tr>
      ${body}
    </table>`
}

function rollupSection(rollup: PortfolioRollup): string {
  return `
    <div class="grid grid-5">
      ${metric('Planned Value (PV)', fmt(rollup.pv))}
      ${metric('Earned Value (EV)', fmt(rollup.ev))}
      ${metric('Actual Cost (AC)', fmt(rollup.ac))}
      ${metric('Budget (BAC)', fmt(rollup.bac))}
      ${metric('Expected Finish', rollup.expectedFinish ?? '—', slipText(rollup.slipMonths))}
      ${metric('SPI', fmtIndex(rollup.spi), 'EV ÷ PV')}
      ${metric('SPIe', fmtIndex(rollup.spie), 'ES ÷ AT')}
      ${metric('CPI', fmtIndex(rollup.cpi), 'EV ÷ AC')}
      ${metric('ETC', rollup.etc === null ? '—' : fmt(rollup.etc), '(BAC − EV) ÷ CPI')}
      ${metric('EAC / VAC', rollup.eac === null ? '—' : fmt(rollup.eac), rollup.vac === null ? 'AC + ETC' : `VAC = ${fmt(rollup.vac)}`)}
    </div>`
}

/**
 * Self-contained, A4 print-ready HTML report for a portfolio: projects,
 * Gantt, cash flow vs funding with overload analysis, and (once progressed)
 * per-project status and the portfolio EVM roll-up. Mirrors the WBS report.
 */
export function buildPortfolioReportHtml(
  state: PortfolioState,
  meta: PortfolioReportMeta,
  images: Partial<PortfolioReportImages>,
): string {
  const generated = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const portfolioName = escapeHtml(meta.projectName || state.name || 'Portfolio')
  const organization = escapeHtml(meta.organization || 'PMO')

  const validProjects = state.projects.filter(isValidProject)
  const totalBac = validProjects.reduce((s, p) => s + p.bac, 0)
  const starts = validProjects.map((p) => p.planStart).sort()
  const finishes = validProjects.map((p) => p.planFinish).sort()
  const portfolioStart = starts[0] ?? '—'
  const portfolioFinish = finishes[finishes.length - 1] ?? '—'

  const fundedKeys = Object.keys(state.funding.amounts).filter(
    (k) => state.funding.amounts[k] > 0,
  )
  const series = computePortfolioCashflow(state.projects, state.funding.granularity, fundedKeys)
  const analysis = series ? computeFundingAnalysis(series, state.funding) : null

  const latest = latestSnapshot(state.statusHistory)
  const statusRows = latest
    ? validProjects.map((p) => computeProjectStatus(p, latest.dataDate, entryFor(latest, p.id)))
    : null
  const rollup = latest ? computePortfolioRollup(state.projects, latest.dataDate, latest) : null

  const ganttSection = images.gantt
    ? `<div class="section">
         <h2>Portfolio Schedule (Gantt)</h2>
         <img class="chart chart-wide" src="${images.gantt}" alt="Gantt chart of portfolio projects" />
         ${latest ? `<p class="muted small">The dashed line marks the data date (${escapeHtml(latest.dataDate)}).</p>` : ''}
       </div>`
    : ''

  const cashflowSection =
    series && images.cashflow
      ? `<div class="section">
           <h2>Portfolio Cash Flow vs Funding</h2>
           <img class="chart chart-wide" src="${images.cashflow}" alt="Portfolio cash flow with cumulative requirement and funding curves" />
           <p class="muted small">
             Each project spreads its BAC across its plan dates along its curve (linear or
             S-curve); bars stack per project. The cumulative cash requirement and the cumulative
             funding step curve share the right axis (${escapeHtml(state.funding.granularity.toLowerCase())}
             periods); shaded bands mark overloaded periods.
           </p>
         </div>`
      : ''

  const fundingSection =
    series && analysis
      ? `<div class="section">
           <h2>Funding vs Cash Requirement</h2>
           ${overloadSummary(analysis)}
           ${fundingTable(series, analysis)}
           <p class="muted small">Highlighted rows are overloaded: the cumulative cash requirement exceeds cumulative funding.</p>
           ${images.net ? `<img class="chart chart-wide" src="${images.net}" alt="Net funding headroom per period" />` : ''}
         </div>`
      : ''

  const progressSection =
    latest && statusRows && rollup
      ? `<div class="section">
           <h2>Portfolio Status — Data Date ${escapeHtml(latest.dataDate)}</h2>
           ${rollupSection(rollup)}
           <h3>Project Status</h3>
           ${statusTable(statusRows)}
           ${images.progress ? `<img class="chart chart-wide" src="${images.progress}" alt="Planned value, earned value, and actual cost over time" />` : ''}
         </div>`
      : `<div class="section">
           <h2>Portfolio Status</h2>
           <p class="muted small">No status updates yet — set a data date on the Progress tab to start earned-value tracking.</p>
         </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Portfolio Report — ${portfolioName}</title>
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
    border-bottom: 3px solid #dd6b20;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .report-kicker {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 10px;
    font-weight: 700;
    color: #c05621;
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
  h3 { font-size: 12px; font-weight: 700; margin: 12px 0 6px; color: #1f2d3d; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .grid { display: grid; gap: 8px; margin-bottom: 10px; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-5 { grid-template-columns: repeat(5, 1fr); }
  .metric {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdff;
  }
  .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; color: #7c8a99; }
  .metric-value { font-size: 15px; font-weight: 800; margin: 3px 0 1px; }
  .metric-formula { font-size: 9.5px; color: #94a3b8; }
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
  table.data tr.overload-row td { background: #fbe4e6; }
  td.neg { color: #c0392b; font-weight: 700; }
  td.pos { color: #1b7f3b; }
  .pill { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 9.5px; font-weight: 700; white-space: nowrap; }
  .pill-danger { background: #fbe4e6; color: #c0392b; }
  .callout { border-radius: 8px; padding: 8px 10px; font-size: 10.5px; font-weight: 600; margin: 0 0 8px; }
  .callout-danger { background: #fbe4e6; color: #c0392b; }
  .callout-good { background: #e4f5e9; color: #1b7f3b; }
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
      <div class="report-kicker">Portfolio Report</div>
      <div class="report-title">${portfolioName}</div>
      <div class="report-meta">
        <span><strong>Organization:</strong> ${organization}</span>
        <span><strong>Generated:</strong> ${escapeHtml(generated)}</span>
        ${latest ? `<span><strong>Data Date:</strong> ${escapeHtml(latest.dataDate)}</span>` : ''}
      </div>
    </header>

    <div class="section">
      <h2>Portfolio Summary</h2>
      <div class="grid grid-5">
        ${metric('Projects', String(validProjects.length))}
        ${metric('Total BAC', fmt(totalBac))}
        ${metric('Portfolio Start', portfolioStart)}
        ${metric('Portfolio Finish', portfolioFinish)}
        ${metric('Total Funding', analysis ? fmt(analysis.totalFunding) : '—')}
      </div>
    </div>

    <div class="section">
      <h2>Projects</h2>
      ${projectsTable(state)}
    </div>

    ${ganttSection}

    ${cashflowSection}

    ${fundingSection}

    ${progressSection}

    <footer class="report-footer">
      <span>Project Management Tools — Portfolio Planner</span>
      <span>${portfolioName} · ${organization}</span>
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
