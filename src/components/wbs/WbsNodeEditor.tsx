import NumberField from '../layout/NumberField'
import DateField from '../layout/DateField'
import SelectField from '../layout/SelectField'
import type { RiskLevel, WbsComputed, WbsDictionary, WbsState } from '../../types/wbs'
import { costTriple, durationTriple } from '../../lib/wbs/calculations'
import { MAX_DEPTH, nodeDepth } from '../../lib/wbs/tree'

interface Props {
  state: WbsState
  computed: WbsComputed
  selectedId: string
  onRename: (id: string, name: string) => void
  onUpdateDict: (id: string, patch: Partial<WbsDictionary>) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

const RISK_OPTIONS = ['Low', 'Medium', 'High']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export default function WbsNodeEditor({
  state,
  computed,
  selectedId,
  onRename,
  onUpdateDict,
  onAddChild,
  onDelete,
}: Props) {
  const node = state.nodes[selectedId]
  if (!node) return null
  const roll = computed.perNode[selectedId]
  const advanced = state.settings.advanced
  const depth = nodeDepth(state.nodes, selectedId)
  const canAddChild = depth < MAX_DEPTH
  const isRoot = node.parentId === null
  const cost = costTriple(node.dict)
  const dur = durationTriple(node.dict)

  return (
    <div className="card space-y-4">
      <div className="section-header">
        <span>
          <span className="mr-2 font-mono text-sm text-brand-700">{roll.code}</span>
          {roll.isLeaf ? 'Work Package' : 'Summary Element'}
        </span>
      </div>

      <div>
        <label className="field-label" htmlFor="wbs-node-name">
          Name
        </label>
        <input
          id="wbs-node-name"
          className="input"
          value={node.name}
          onChange={(e) => onRename(node.id, e.target.value)}
        />
      </div>

      {roll.isLeaf ? (
        <>
          <div>
            <label className="field-label" htmlFor="wbs-node-desc">
              Description
            </label>
            <textarea
              id="wbs-node-desc"
              className="input h-20 py-2"
              value={node.dict.description}
              onChange={(e) => onUpdateDict(node.id, { description: e.target.value })}
            />
          </div>
          <NumberField
            label="Budget (Most Likely)"
            value={node.dict.budget}
            min={0}
            onChange={(v) => onUpdateDict(node.id, { budget: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Start Date"
              value={node.dict.startDate}
              onChange={(v) => onUpdateDict(node.id, { startDate: v })}
            />
            <DateField
              label="End Date"
              value={node.dict.endDate}
              onChange={(v) => onUpdateDict(node.id, { endDate: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Risk Likelihood"
              value={node.dict.riskLikelihood}
              options={RISK_OPTIONS}
              onChange={(v) => onUpdateDict(node.id, { riskLikelihood: v as RiskLevel })}
            />
            <SelectField
              label="Risk Impact"
              value={node.dict.riskImpact}
              options={RISK_OPTIONS}
              onChange={(v) => onUpdateDict(node.id, { riskImpact: v as RiskLevel })}
            />
          </div>

          {advanced && (
            <div className="card-muted space-y-3">
              <div className="subsection-title">Three-Point Estimates</div>
              {/* raw stored values so typing isn't snapped mid-edit; checks surface as warnings */}
              <div className="grid grid-cols-2 items-end gap-3">
                <NumberField
                  label="Optimistic Cost"
                  value={node.dict.costOptimistic ?? cost.ml}
                  min={0}
                  onChange={(v) => onUpdateDict(node.id, { costOptimistic: v })}
                />
                <NumberField
                  label="Pessimistic Cost"
                  value={node.dict.costPessimistic ?? cost.ml}
                  min={0}
                  onChange={(v) => onUpdateDict(node.id, { costPessimistic: v })}
                />
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <NumberField
                  label="Optimistic Duration"
                  value={node.dict.durOptimisticDays ?? dur.ml}
                  min={0}
                  suffix="d"
                  onChange={(v) => onUpdateDict(node.id, { durOptimisticDays: v })}
                />
                <NumberField
                  label="Pessimistic Duration"
                  value={node.dict.durPessimisticDays ?? dur.ml}
                  min={0}
                  suffix="d"
                  onChange={(v) => onUpdateDict(node.id, { durPessimisticDays: v })}
                />
              </div>
              <div className="text-xs text-ink-400">
                Most likely: cost {fmt(cost.ml)}, duration {fmt(dur.ml)} days (from Budget and
                dates). PERT cost: {fmt(roll.pertCost)}.
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card-muted space-y-1 text-sm text-ink-500">
          <div className="subsection-title">Rolled Up From Children</div>
          <div>
            Budget: <strong className="text-ink-900">{fmt(roll.budget)}</strong>
          </div>
          {advanced && (
            <div>
              PERT cost: <strong className="text-ink-900">{fmt(roll.pertCost)}</strong>
            </div>
          )}
          <div>
            Dates: {roll.startDate ?? '—'} → {roll.endDate ?? '—'}
          </div>
          <div className="pt-1 text-xs text-ink-400">
            Values roll up from children — edit the work packages below this element.
          </div>
        </div>
      )}

      {roll.warnings.length > 0 && (
        <ul className="space-y-1">
          {roll.warnings.map((w) => (
            <li key={w} className="text-xs font-semibold text-danger">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        {canAddChild && (
          <button type="button" className="btn-success" onClick={() => onAddChild(node.id)}>
            + Add Child
          </button>
        )}
        {!isRoot && (
          <button
            type="button"
            className="btn bg-danger hover:brightness-110"
            onClick={() => onDelete(node.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
