import type { WbsComputed, WbsState } from '../../types/wbs'
import { isLeaf } from './tree'
import { riskLevelValue } from './calculations'

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
