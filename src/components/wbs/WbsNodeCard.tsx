import type { NodeRollup, WbsNode } from '../../types/wbs'
import { riskTone } from '../../lib/wbs/calculations'

interface Props {
  node: WbsNode
  rollup: NodeRollup
  selected: boolean
  canAddChild: boolean
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

const toneClasses = {
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/20 text-ink-700',
  danger: 'bg-danger/10 text-danger',
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function WbsNodeCard({
  node,
  rollup,
  selected,
  canAddChild,
  onSelect,
  onAddChild,
  onDelete,
}: Props) {
  const isRoot = node.parentId === null
  const risk = rollup.isLeaf
    ? riskTone(
        (node.dict.riskLikelihood === 'Low' ? 1 : node.dict.riskLikelihood === 'Medium' ? 2 : 3) *
          (node.dict.riskImpact === 'Low' ? 1 : node.dict.riskImpact === 'Medium' ? 2 : 3),
      )
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.id)
        }
      }}
      className={`group relative inline-block w-44 cursor-pointer rounded-xl border bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-lg ${
        selected ? 'border-brand-500 ring-2 ring-brand-100' : 'border-ink-200'
      } ${isRoot ? 'bg-brand-50/60' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700">
          {rollup.code}
        </span>
        {risk && (
          <span className={`status-badge ${toneClasses[risk]} !px-1.5 !py-0.5 !text-[10px]`}>
            {node.dict.riskLikelihood[0]}/{node.dict.riskImpact[0]}
          </span>
        )}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-ink-900" title={node.name}>
        {node.name}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-ink-700">
        {fmt(rollup.activeCost)}
      </div>
      <div className="text-[10px] text-ink-400">
        {rollup.startDate && rollup.endDate ? `${rollup.startDate} → ${rollup.endDate}` : 'no dates'}
      </div>
      {rollup.warnings.length > 0 && (
        <div className="absolute -top-1.5 -right-1.5 text-xs" title={rollup.warnings.join('; ')}>
          ⚠️
        </div>
      )}
      <div className="absolute inset-x-0 -bottom-3 hidden justify-center gap-1 group-hover:flex">
        {canAddChild && (
          <button
            type="button"
            aria-label={`Add child to ${node.name}`}
            className="rounded-full bg-good px-2 text-xs font-bold text-white shadow-sm hover:brightness-110"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node.id)
            }}
          >
            +
          </button>
        )}
        {!isRoot && (
          <button
            type="button"
            aria-label={`Delete ${node.name}`}
            className="rounded-full bg-danger px-2 text-xs font-bold text-white shadow-sm hover:brightness-110"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.id)
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
