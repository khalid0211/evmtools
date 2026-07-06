import type { MonteCarloResult, WbsComputed, WbsState } from '../../types/wbs'
import { isLeaf } from './tree'
import { riskLevelValue, riskTone } from './calculations'
import { empiricalCdf } from '../shared/random'

export interface WbsReportMeta {
  projectName: string
  organization: string
}

export interface WbsReportImages {
  gantt: string
  costHist: string
  durHist: string
  scatter: string
}

const TONE_BG: Record<string, string> = {
  good: '#e4f5e9',
  warn: '#fdf3d7',
  danger: '#fbe4e6',
}

const TONE_FG: Record<string, string> = {
  good: '#1b7f3b',
  warn: '#8a6d1a',
  danger: '#c0392b',
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
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

function metric(label: string, value: string, hint = ''): string {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="metric-formula">${escapeHtml(hint)}</div>` : ''}
    </div>`
}

function outlineTable(state: WbsState, computed: WbsComputed, advanced: boolean): string {
  const header = `
    <tr>
      <th>Code</th><th>Element</th><th class="num">Budget</th>
      ${advanced ? '<th class="num">PERT Cost</th>' : ''}
      <th>Start</th><th>Finish</th><th>Risk (L/I)</th>
    </tr>`
  const rows = computed.orderedIds
    .map((id) => {
      const node = state.nodes[id]
      const roll = computed.perNode[id]
      const leaf = isLeaf(node)
      const indent = (roll.depth - 1) * 14
      const desc =
        leaf && node.dict.description
          ? `<div class="desc">${escapeHtml(node.dict.description)}</div>`
          : ''
      const risk = leaf
        ? (() => {
            const tone = riskTone(
              riskLevelValue(node.dict.riskLikelihood) * riskLevelValue(node.dict.riskImpact),
            )
            return `<span class="pill" style="background:${TONE_BG[tone]};color:${TONE_FG[tone]}">${node.dict.riskLikelihood} / ${node.dict.riskImpact}</span>`
          })()
        : ''
      return `
        <tr class="${leaf ? '' : 'summary-row'}">
          <td class="code">${roll.code}</td>
          <td style="padding-left:${8 + indent}px">
            ${escapeHtml(node.name)}${leaf ? '' : ' <span class="muted">(roll-up)</span>'}
            ${desc}
          </td>
          <td class="num">${fmt(roll.budget)}</td>
          ${advanced ? `<td class="num">${fmt(roll.pertCost)}</td>` : ''}
          <td>${roll.startDate ?? '—'}</td>
          <td>${roll.endDate ?? '—'}</td>
          <td>${risk}</td>
        </tr>`
    })
    .join('')
  return `<table class="data">${header}${rows}</table>`
}

function riskMatrixTable(computed: WbsComputed): string {
  const levels = ['High', 'Medium', 'Low'] as const
  const cols = ['Low', 'Medium', 'High'] as const
  const body = levels
    .map((likelihood) => {
      const cells = cols
        .map((impact) => {
          const cell = computed.riskMatrix.find(
            (c) => c.likelihood === likelihood && c.impact === impact,
          )!
          const tone = riskTone(cell.score)
          const value = cell.count > 0 ? fmt(cell.totalCost) : '—'
          return `<td style="background:${TONE_BG[tone]};color:${TONE_FG[tone]}">
            <div class="cell-value">${value}</div>
            <div class="cell-count">${cell.count} item${cell.count === 1 ? '' : 's'}</div>
          </td>`
        })
        .join('')
      return `<tr><th>${likelihood}<br/>Likelihood</th>${cells}</tr>`
    })
    .join('')
  return `
    <table class="matrix">
      <tr><th></th>${cols.map((c) => `<th>${c} Impact</th>`).join('')}</tr>
      ${body}
    </table>`
}

function monteCarloSection(
  mc: MonteCarloResult,
  pertCost: number,
  pertDuration: number,
  images: WbsReportImages,
): string {
  const rows = [
    { label: 'P50 (median)', cost: mc.costStats.p50, cp: 0.5, dur: mc.durationStats.p50, dp: 0.5 },
    { label: 'P80', cost: mc.costStats.p80, cp: 0.8, dur: mc.durationStats.p80, dp: 0.8 },
    { label: 'P90', cost: mc.costStats.p90, cp: 0.9, dur: mc.durationStats.p90, dp: 0.9 },
    {
      label: 'PERT estimate',
      cost: pertCost,
      cp: empiricalCdf(mc.costs, pertCost),
      dur: pertDuration,
      dp: empiricalCdf(mc.durations, pertDuration),
    },
  ]
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td class="num">${fmt(r.cost)}</td>
        <td class="num prob">${pct(r.cp)}</td>
        <td class="num">${fmt(r.dur)}</td>
        <td class="num prob">${pct(r.dp)}</td>
      </tr>`,
    )
    .join('')
  return `
    <div class="section">
      <h2>Monte Carlo Analysis</h2>
      <p class="muted small">
        ${fmt(mc.iterations)} iterations, seed ${mc.seed}. Costs and durations sampled per work
        package from beta-PERT distributions over the three-point estimates.
      </p>
      <div class="grid grid-4">
        ${metric('Cost Mean', fmt(mc.costStats.mean))}
        ${metric('Cost Std Dev', fmt(mc.costStats.std))}
        ${metric('Duration Mean', `${fmt(mc.durationStats.mean)} d`)}
        ${metric('Duration Std Dev', `${fmt(mc.durationStats.std)} d`)}
      </div>
      <div class="chart-pair">
        <img class="chart" src="${images.costHist}" alt="Project cost distribution histogram" />
        <img class="chart" src="${images.durHist}" alt="Project duration distribution histogram" />
      </div>
      <h3>Probability of Completion Within Estimate</h3>
      <table class="data">
        <tr>
          <th>Estimate</th><th class="num">Cost</th><th class="num">Cum. Probability</th>
          <th class="num">Duration (days)</th><th class="num">Cum. Probability</th>
        </tr>
        ${tableRows}
      </table>
      <img class="chart chart-wide" src="${images.scatter}" alt="Cost versus duration scatter plot" />
    </div>`
}

/**
 * Self-contained, A4 print-ready HTML report for a WBS: outline, Gantt, risk
 * matrix, and (when run) Monte Carlo results. Mirrors the EVM report pattern.
 */
export function buildWbsReportHtml(
  state: WbsState,
  computed: WbsComputed,
  meta: WbsReportMeta,
  mc: MonteCarloResult | null,
  pertCost: number,
  pertDuration: number,
  images: Partial<WbsReportImages>,
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
  const { advanced, usePert } = state.settings
  const estimatingMode = advanced
    ? usePert
      ? 'Three-point estimates, PERT roll-up'
      : 'Three-point estimates, most-likely roll-up'
    : 'Single-point (most likely) estimates'

  const ganttSection = images.gantt
    ? `<div class="section">
         <h2>Schedule (Gantt)</h2>
         <img class="chart chart-wide" src="${images.gantt}" alt="Gantt chart of work packages" />
         <p class="muted small">Bars are colored by risk category: green low, yellow moderate, red high.</p>
       </div>`
    : ''

  const mcSection =
    mc && images.costHist && images.durHist && images.scatter
      ? monteCarloSection(mc, pertCost, pertDuration, images as WbsReportImages)
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>WBS Report — ${projectName}</title>
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
  table.data td.prob { color: #1f6f9e; font-weight: 700; }
  table.data td.code { font-family: ui-monospace, Consolas, monospace; font-size: 10px; color: #1f6f9e; white-space: nowrap; }
  table.data tr.summary-row td { background: #f8fafc; font-weight: 600; }
  .desc { font-weight: 400; color: #64748b; font-size: 9.5px; margin-top: 2px; }
  .pill { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 9.5px; font-weight: 700; white-space: nowrap; }
  table.matrix { border-collapse: separate; border-spacing: 4px; width: 100%; margin-bottom: 4px; }
  table.matrix th { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7c8a99; padding: 4px; }
  table.matrix td { border-radius: 8px; text-align: center; padding: 10px 6px; width: 30%; }
  .cell-value { font-size: 14px; font-weight: 800; }
  .cell-count { font-size: 9.5px; margin-top: 2px; opacity: 0.8; }
  .chart { width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
  .chart-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
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
      <div class="report-kicker">Work Breakdown Structure Report</div>
      <div class="report-title">${projectName}</div>
      <div class="report-meta">
        <span><strong>Organization:</strong> ${organization}</span>
        <span><strong>Generated:</strong> ${escapeHtml(generated)}</span>
        <span><strong>Estimating:</strong> ${escapeHtml(estimatingMode)}</span>
      </div>
    </header>

    <div class="section">
      <h2>Project Summary</h2>
      <div class="grid grid-5">
        ${metric('Total Budget', fmt(computed.perNode[state.rootId].budget))}
        ${advanced ? metric('PERT Total', fmt(pertCost)) : ''}
        ${metric('Project Start', computed.projectStart ?? '—')}
        ${metric('Project Finish', computed.projectEnd ?? '—')}
        ${metric('Work Packages', String(computed.leafCount))}
      </div>
    </div>

    <div class="section">
      <h2>WBS Outline</h2>
      ${outlineTable(state, computed, advanced)}
    </div>

    ${ganttSection}

    <div class="section">
      <h2>Risk Matrix</h2>
      ${riskMatrixTable(computed)}
      <p class="muted small">Cell values sum the active cost estimate of work packages in that risk category.</p>
    </div>

    ${mcSection}

    <footer class="report-footer">
      <span>Project Management Tools — WBS Maker</span>
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
