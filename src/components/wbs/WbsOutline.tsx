import type { WbsComputed, WbsState } from '../../types/wbs'
import { riskTone } from '../../lib/wbs/calculations'

interface Props {
  state: WbsState
  computed: WbsComputed
  selectedId: string
  onSelect: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

const toneClasses = {
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/20 text-ink-700',
  danger: 'bg-danger/10 text-danger',
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function WbsOutline({ state, computed, selectedId, onSelect, onMove }: Props) {
  const advanced = state.settings.advanced
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-2">Code</th>
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2 text-right">Budget</th>
            {advanced && <th className="py-2 pr-2 text-right">PERT</th>}
            <th className="py-2 pr-2">Start</th>
            <th className="py-2 pr-2">End</th>
            <th className="py-2 pr-2">Risk</th>
            <th className="py-2 w-16" aria-label="Reorder" />
          </tr>
        </thead>
        <tbody>
          {computed.orderedIds.map((id) => {
            const node = state.nodes[id]
            const roll = computed.perNode[id]
            const selected = id === selectedId
            const risk = roll.isLeaf
              ? riskTone(
                  computed.riskMatrix.find(
                    (c) =>
                      c.likelihood === node.dict.riskLikelihood &&
                      c.impact === node.dict.riskImpact,
                  )!.score,
                )
              : null
            return (
              <tr
                key={id}
                onClick={() => onSelect(id)}
                className={`cursor-pointer border-b border-ink-50 transition ${
                  selected ? 'bg-brand-50' : 'hover:bg-ink-50'
                }`}
              >
                <td className="py-2 pr-2 font-mono text-xs text-brand-700">{roll.code}</td>
                <td
                  className="py-2 pr-2 font-medium text-ink-900"
                  style={{ paddingLeft: `${(roll.depth - 1) * 16}px` }}
                >
                  {node.name}
                  {!roll.isLeaf && <span className="ml-1 text-xs text-ink-400">(roll-up)</span>}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{fmt(roll.budget)}</td>
                {advanced && (
                  <td className="py-2 pr-2 text-right tabular-nums">{fmt(roll.pertCost)}</td>
                )}
                <td className="py-2 pr-2 text-ink-500">{roll.startDate ?? '—'}</td>
                <td className="py-2 pr-2 text-ink-500">{roll.endDate ?? '—'}</td>
                <td className="py-2 pr-2">
                  {risk && (
                    <span className={`status-badge ${toneClasses[risk]}`}>
                      {node.dict.riskLikelihood[0]}/{node.dict.riskImpact[0]}
                    </span>
                  )}
                </td>
                <td className="py-2">
                  {node.parentId !== null && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${node.name} up`}
                        className="rounded px-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMove(id, 'up')
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${node.name} down`}
                        className="rounded px-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMove(id, 'down')
                        }}
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
