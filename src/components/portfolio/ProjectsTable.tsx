import { monthsBetween } from '../../lib/evm/calculations'
import { isValidProject } from '../../lib/portfolio/cashflow'
import type { PortfolioProject } from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  editingId: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

export default function ProjectsTable({ projects, editingId, onEdit, onDelete }: Props) {
  if (projects.length === 0) {
    return <p className="text-sm text-ink-400">No projects yet — add one with the form.</p>
  }

  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-white">
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-3">Project</th>
            <th className="py-2 pr-3 text-right">BAC</th>
            <th className="py-2 pr-3">Plan Start</th>
            <th className="py-2 pr-3">Plan Finish</th>
            <th className="py-2 pr-3 text-right">Duration (mo)</th>
            <th className="py-2 pr-3">Curve</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const valid = isValidProject(p)
            const selected = p.id === editingId
            return (
              <tr
                key={p.id}
                className={`cursor-pointer border-b border-ink-50 transition hover:bg-brand-50/40 ${
                  selected ? 'bg-brand-50/70' : ''
                }`}
                onClick={() => onEdit(p.id)}
              >
                <td className="py-1.5 pr-3 font-semibold text-ink-700">
                  {p.name || 'Unnamed project'}
                  {!valid && (
                    <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                      invalid
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink-600">{fmt(p.bac)}</td>
                <td className="py-1.5 pr-3 text-ink-600">{p.planStart || '—'}</td>
                <td className="py-1.5 pr-3 text-ink-600">{p.planFinish || '—'}</td>
                <td className="py-1.5 pr-3 text-right text-ink-600">
                  {valid ? fmt(monthsBetween(p.planStart, p.planFinish)) : '—'}
                </td>
                <td className="py-1.5 pr-3 text-ink-600">
                  {p.curve === 'S-Curve' ? `S-Curve (${p.alpha}, ${p.beta})` : 'Linear'}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(p.id)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
                    title="Delete this project"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(p.id)
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
