import { useEffect, useId, useState } from 'react'
import DateField from '../layout/DateField'
import NumberField from '../layout/NumberField'
import ToggleGroup from '../layout/ToggleGroup'
import { createProject } from '../../lib/portfolio/state'
import type { CurveType, PortfolioProject } from '../../types/portfolio'

interface Props {
  /** Project being edited, or null for "new project" mode. */
  editing: PortfolioProject | null
  onSave: (project: PortfolioProject) => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}

/**
 * Single draft-based entry card: edits stay local until Save, so charts and
 * tables don't churn while typing. New mode appends; edit mode replaces.
 */
export default function ProjectEditor({ editing, onSave, onCancel, onDirtyChange }: Props) {
  const nameId = useId()
  const [draft, setDraft] = useState<PortfolioProject>(() => editing ?? createProject())

  // reload the draft whenever the selection changes (or returns to "new" mode)
  useEffect(() => {
    setDraft(editing ?? createProject())
    onDirtyChange(false)
  }, [editing, onDirtyChange])

  const patch = (p: Partial<PortfolioProject>) => {
    setDraft((prev) => ({ ...prev, ...p }))
    onDirtyChange(true)
  }

  const invalidRange =
    draft.planStart !== '' && draft.planFinish !== '' && draft.planFinish < draft.planStart

  return (
    <div className="card-muted space-y-3">
      <div className="subsection-title">
        {editing ? `Edit: ${editing.name || 'Unnamed project'}` : 'Add a project'}
      </div>

      <div>
        <label className="field-label" htmlFor={nameId}>
          Project name
        </label>
        <input
          id={nameId}
          type="text"
          className="input"
          value={draft.name}
          placeholder="Project name"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>

      <NumberField
        label="BAC"
        value={draft.bac}
        min={0}
        help="Budget at Completion"
        onChange={(v) => patch({ bac: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <DateField
          label="Plan Start"
          value={draft.planStart}
          onChange={(v) => patch({ planStart: v })}
        />
        <DateField
          label="Plan Finish"
          value={draft.planFinish}
          onChange={(v) => patch({ planFinish: v })}
        />
      </div>

      <div>
        <div className="field-label">Cash flow curve</div>
        <ToggleGroup<CurveType>
          value={draft.curve}
          label="Cash flow curve"
          options={[
            { value: 'Linear', label: 'Linear' },
            { value: 'S-Curve', label: 'S-Curve' },
          ]}
          onChange={(v) => patch({ curve: v })}
        />
        {draft.curve === 'S-Curve' && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Alpha (α)"
              value={draft.alpha}
              step={0.1}
              min={0.1}
              onChange={(v) => patch({ alpha: v })}
            />
            <NumberField
              label="Beta (β)"
              value={draft.beta}
              step={0.1}
              min={0.1}
              onChange={(v) => patch({ beta: v })}
            />
          </div>
        )}
      </div>

      {invalidRange && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
          Plan Finish is before Plan Start — this project will be excluded from all charts.
        </div>
      )}
      {!(draft.bac > 0) && (
        <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-semibold text-ink-700">
          Enter a BAC greater than zero to include this project.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave(draft)
            onDirtyChange(false)
          }}
        >
          {editing ? 'Update Project' : '＋ Add Project'}
        </button>
        {editing && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
