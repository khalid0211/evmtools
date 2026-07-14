import { useId } from 'react'
import DateField from '../layout/DateField'
import NumberField from '../layout/NumberField'
import ToggleGroup from '../layout/ToggleGroup'
import type { CurveType, PortfolioProject } from '../../types/portfolio'

interface Props {
  project: PortfolioProject
  onUpdate: (patch: Partial<Omit<PortfolioProject, 'id'>>) => void
  onDelete: () => void
}

export default function ProjectCard({ project, onUpdate, onDelete }: Props) {
  const nameId = useId()
  const invalidRange =
    project.planStart !== '' && project.planFinish !== '' && project.planFinish < project.planStart

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <label className="field-label" htmlFor={nameId}>
            Project name
          </label>
          <input
            id={nameId}
            type="text"
            className="input"
            value={project.name}
            placeholder="Project name"
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="mt-6 rounded-md px-2 py-1 text-sm text-danger transition hover:bg-danger/10"
          title="Delete this project"
          onClick={onDelete}
        >
          🗑
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField
          label="BAC"
          value={project.bac}
          min={0}
          help="Budget at Completion"
          onChange={(v) => onUpdate({ bac: v })}
        />
        <DateField
          label="Plan Start"
          value={project.planStart}
          onChange={(v) => onUpdate({ planStart: v })}
        />
        <DateField
          label="Plan Finish"
          value={project.planFinish}
          onChange={(v) => onUpdate({ planFinish: v })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="field-label">Cash flow curve</div>
          <ToggleGroup<CurveType>
            value={project.curve}
            label="Cash flow curve"
            options={[
              { value: 'Linear', label: 'Linear' },
              { value: 'S-Curve', label: 'S-Curve' },
            ]}
            onChange={(v) => onUpdate({ curve: v })}
          />
        </div>
        {project.curve === 'S-Curve' && (
          <div className="mb-4 flex gap-3">
            <div className="w-24">
              <NumberField
                label="Alpha (α)"
                value={project.alpha}
                step={0.1}
                min={0.1}
                onChange={(v) => onUpdate({ alpha: v })}
              />
            </div>
            <div className="w-24">
              <NumberField
                label="Beta (β)"
                value={project.beta}
                step={0.1}
                min={0.1}
                onChange={(v) => onUpdate({ beta: v })}
              />
            </div>
          </div>
        )}
      </div>

      {invalidRange && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
          Plan Finish is before Plan Start — this project is excluded from all charts.
        </div>
      )}
      {!(project.bac > 0) && (
        <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-semibold text-ink-700">
          Enter a BAC greater than zero to include this project.
        </div>
      )}
    </div>
  )
}
