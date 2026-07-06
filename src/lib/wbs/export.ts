import type { WbsComputed, WbsState } from '../../types/wbs'
import { isLeaf } from './tree'
import { riskLevelValue, riskTone } from './calculations'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function buildOutlineRows(state: WbsState, computed: WbsComputed): Record<string, unknown>[] {
  return computed.orderedIds.map((id) => {
    const node = state.nodes[id]
    const roll = computed.perNode[id]
    const leaf = isLeaf(node)
    return {
      code: roll.code,
      name: node.name,
      level: roll.depth,
      is_dictionary_item: leaf ? 'yes' : 'no',
      description: leaf ? node.dict.description : '',
      budget: roll.budget.toFixed(2),
      pert_cost: roll.pertCost.toFixed(2),
      start_date: roll.startDate ?? '',
      end_date: roll.endDate ?? '',
      risk_likelihood: leaf ? node.dict.riskLikelihood : '',
      risk_impact: leaf ? node.dict.riskImpact : '',
      risk_score: leaf
        ? riskLevelValue(node.dict.riskLikelihood) * riskLevelValue(node.dict.riskImpact)
        : '',
    }
  })
}

export function exportOutlineCsv(state: WbsState, computed: WbsComputed) {
  downloadCsv(toCsv(buildOutlineRows(state, computed)), `wbs_outline_${timestamp()}.csv`)
}

function mermaidLabel(s: string): string {
  // double quotes end a Mermaid quoted label; angle brackets would parse as HTML
  return s.replace(/"/g, "'").replace(/</g, '(').replace(/>/g, ')')
}

/**
 * WBS tree as a Mermaid top-down flowchart (graph TD) for import into
 * draw.io (Insert → Advanced → Mermaid) and other Mermaid-aware tools.
 * Leaf nodes are colored by risk category.
 */
export function buildMermaid(state: WbsState, computed: WbsComputed): string {
  const idFor = (code: string) => `n${code.replace(/\./g, '_')}`
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const nodes: string[] = []
  const edges: string[] = []
  const classes: string[] = []

  for (const id of computed.orderedIds) {
    const node = state.nodes[id]
    const roll = computed.perNode[id]
    const mid = idFor(roll.code)
    const parts = [`${roll.code} ${mermaidLabel(node.name)}`, `Budget: ${fmt(roll.activeCost)}`]
    if (roll.startDate && roll.endDate) parts.push(`${roll.startDate} → ${roll.endDate}`)
    nodes.push(`  ${mid}["${parts.join('<br/>')}"]`)
    for (const childId of node.childIds) {
      edges.push(`  ${mid} --> ${idFor(computed.perNode[childId].code)}`)
    }
    if (isLeaf(node)) {
      const tone = riskTone(
        riskLevelValue(node.dict.riskLikelihood) * riskLevelValue(node.dict.riskImpact),
      )
      classes.push(`  class ${mid} risk${tone === 'good' ? 'Low' : tone === 'warn' ? 'Med' : 'High'}`)
    }
  }

  return [
    'graph TD',
    ...nodes,
    ...edges,
    '  classDef riskLow fill:#e4f5e9,stroke:#28a745,color:#1b7f3b',
    '  classDef riskMed fill:#fdf3d7,stroke:#ffc107,color:#8a6d1a',
    '  classDef riskHigh fill:#fbe4e6,stroke:#dc3545,color:#c0392b',
    ...classes,
    '',
  ].join('\n')
}

export function exportMermaid(state: WbsState, computed: WbsComputed) {
  const blob = new Blob([buildMermaid(state, computed)], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wbs_${timestamp()}.mmd`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
