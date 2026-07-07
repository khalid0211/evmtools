import { useEffect, useMemo, useState } from 'react'
import NumberField from '../layout/NumberField'
import DateField from '../layout/DateField'
import SelectField from '../layout/SelectField'
import type {
  CashFlowCurve,
  RiskLevel,
  WbsComputed,
  WbsDictionary,
  WbsState,
} from '../../types/wbs'
import { costTriple, durationTriple, leafWarnings, pertMean } from '../../lib/wbs/calculations'
import { MAX_DEPTH, nodeDepth } from '../../lib/wbs/tree'

interface Props {
  state: WbsState
  computed: WbsComputed
  selectedId: string
  onSave: (id: string, name: string, dict: WbsDictionary) => void
  onDirtyChange: (dirty: boolean) => void
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
  onSave,
  onDirtyChange,
  onAddChild,
  onDelete,
}: Props) {
  const node = state.nodes[selectedId]
  // draft form state — committed to the WBS only on Save
  const [draftName, setDraftName] = useState(node?.name ?? '')
  const [draftDict, setDraftDict] = useState<WbsDictionary>(node?.dict ?? ({} as WbsDictionary))

  const dirty =
    !!node &&
    (draftName !== node.name || JSON.stringify(draftDict) !== JSON.stringify(node.dict))

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  // clear the page-level dirty flag if this editor unmounts mid-edit
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const draftWarnings = useMemo(() => leafWarnings(draftDict), [draftDict])

  if (!node) return null
  const roll = computed.perNode[selectedId]
  const advanced = state.settings.advanced
  const depth = nodeDepth(state.nodes, selectedId)
  const canAddChild = depth < MAX_DEPTH
  const isRoot = node.parentId === null
  const cost = costTriple(draftDict)
  const dur = durationTriple(draftDict)
  const draftPertCost = pertMean(cost.o, cost.ml, cost.p)

  const patchDraft = (patch: Partial<WbsDictionary>) =>
    setDraftDict((prev) => ({ ...prev, ...patch }))

  const revert = () => {
    setDraftName(node.name)
    setDraftDict(node.dict)
  }

  return (
    <div className="card space-y-4">
      <div className="section-header">
        <span>
          <span className="mr-2 font-mono text-sm text-brand-700">{roll.code}</span>
          {roll.isLeaf ? 'Work Package' : 'Summary Element'}
        </span>
        {dirty && (
          <span className="status-badge bg-warn/20 text-ink-700">unsaved changes</span>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="wbs-node-name">
          Name
        </label>
        <input
          id="wbs-node-name"
          className="input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
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
              value={draftDict.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
            />
          </div>
          <NumberField
            label="Budget (Most Likely)"
            value={draftDict.budget}
            min={0}
            onChange={(v) => patchDraft({ budget: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Start Date"
              value={draftDict.startDate}
              onChange={(v) => patchDraft({ startDate: v })}
            />
            <DateField
              label="End Date"
              value={draftDict.endDate}
              onChange={(v) => patchDraft({ endDate: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Risk Likelihood"
              value={draftDict.riskLikelihood}
              options={RISK_OPTIONS}
              onChange={(v) => patchDraft({ riskLikelihood: v as RiskLevel })}
            />
            <SelectField
              label="Risk Impact"
              value={draftDict.riskImpact}
              options={RISK_OPTIONS}
              onChange={(v) => patchDraft({ riskImpact: v as RiskLevel })}
            />
          </div>
          <SelectField
            label="Cash Flow Curve"
            value={draftDict.costCurve ?? 'Linear'}
            options={['Linear', 'S-Curve']}
            help="How this item's budget is spread across its dates in the cash flow chart"
            onChange={(v) => patchDraft({ costCurve: v as CashFlowCurve })}
          />
          {(draftDict.costCurve ?? 'Linear') === 'S-Curve' && (
            <div className="grid grid-cols-2 items-end gap-3">
              <NumberField
                label="Alpha (α)"
                value={draftDict.curveAlpha ?? 2}
                min={0.1}
                step={0.1}
                onChange={(v) => patchDraft({ curveAlpha: v })}
              />
              <NumberField
                label="Beta (β)"
                value={draftDict.curveBeta ?? 2}
                min={0.1}
                step={0.1}
                onChange={(v) => patchDraft({ curveBeta: v })}
              />
            </div>
          )}

          {advanced && (
            <div className="card-muted space-y-3">
              <div className="subsection-title">Three-Point Estimates</div>
              <div className="grid grid-cols-2 items-end gap-3">
                <NumberField
                  label="Optimistic Cost"
                  value={draftDict.costOptimistic ?? cost.ml}
                  min={0}
                  onChange={(v) => patchDraft({ costOptimistic: v })}
                />
                <NumberField
                  label="Pessimistic Cost"
                  value={draftDict.costPessimistic ?? cost.ml}
                  min={0}
                  onChange={(v) => patchDraft({ costPessimistic: v })}
                />
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <NumberField
                  label="Optimistic Duration"
                  value={draftDict.durOptimisticDays ?? dur.ml}
                  min={0}
                  suffix="d"
                  onChange={(v) => patchDraft({ durOptimisticDays: v })}
                />
                <NumberField
                  label="Pessimistic Duration"
                  value={draftDict.durPessimisticDays ?? dur.ml}
                  min={0}
                  suffix="d"
                  onChange={(v) => patchDraft({ durPessimisticDays: v })}
                />
              </div>
              <div className="text-xs text-ink-400">
                Most likely: cost {fmt(cost.ml)}, duration {fmt(dur.ml)} days (from Budget and
                dates). PERT cost: {fmt(draftPertCost)}.
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

      {roll.isLeaf && draftWarnings.length > 0 && (
        <ul className="space-y-1">
          {draftWarnings.map((w) => (
            <li key={w} className="text-xs font-semibold text-danger">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!dirty}
          onClick={() => onSave(node.id, draftName, draftDict)}
        >
          💾 Save
        </button>
        <button
          type="button"
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!dirty}
          onClick={revert}
        >
          Revert
        </button>
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
