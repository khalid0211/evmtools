import { monthsBetween } from '../../lib/evm/calculations'
import { isoAddMonths } from '../../lib/portfolio/evm'
import { parseUtc } from '../../lib/portfolio/periods'
import type { PortfolioProject } from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  onUpdate: (id: string, patch: Partial<Omit<PortfolioProject, 'id'>>) => void
}

/**
 * What-if table: shifting Plan Start keeps the duration (the finish moves
 * with it); editing the duration recomputes Plan Finish from the start.
 */
export default function ProjectMoveTable({ projects, onUpdate }: Props) {
  function shiftStart(p: PortfolioProject, newStart: string) {
    const startMs = parseUtc(p.planStart)
    const finishMs = parseUtc(p.planFinish)
    const newStartMs = parseUtc(newStart)
    if (!Number.isFinite(newStartMs)) return
    if (Number.isFinite(startMs) && Number.isFinite(finishMs) && finishMs >= startMs) {
      const durationMs = finishMs - startMs
      const newFinish = new Date(newStartMs + durationMs).toISOString().slice(0, 10)
      onUpdate(p.id, { planStart: newStart, planFinish: newFinish })
    } else {
      onUpdate(p.id, { planStart: newStart })
    }
  }

  function stretchDuration(p: PortfolioProject, months: number) {
    if (!Number.isFinite(months) || months < 0 || !p.planStart) return
    onUpdate(p.id, { planFinish: isoAddMonths(p.planStart, months) })
  }

  if (projects.length === 0) {
    return <p className="text-sm text-ink-400">Add projects to move them on the timeline.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-4">Project</th>
            <th className="py-2 pr-4">Plan Start (shifts project)</th>
            <th className="py-2 pr-4">Duration (months)</th>
            <th className="py-2">Plan Finish</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const duration = monthsBetween(p.planStart, p.planFinish)
            return (
              <tr key={p.id} className="border-b border-ink-50">
                <td className="py-2 pr-4 font-semibold text-ink-700">
                  {p.name || 'Unnamed project'}
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="date"
                    className="input !w-auto"
                    value={p.planStart}
                    aria-label={`Plan start of ${p.name}`}
                    onChange={(e) => shiftStart(p, e.target.value)}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    className="input !w-24"
                    min={0}
                    step={0.5}
                    value={Number(duration.toFixed(1))}
                    aria-label={`Duration of ${p.name} in months`}
                    onChange={(e) => stretchDuration(p, parseFloat(e.target.value))}
                  />
                </td>
                <td className="py-2 text-ink-600">{p.planFinish || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
