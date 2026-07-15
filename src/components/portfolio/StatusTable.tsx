import { useMemo } from 'react'
import { computeProjectStatus, type ProjectStatusRow } from '../../lib/portfolio/evm'
import { entryFor } from '../../lib/portfolio/history'
import { isValidProject } from '../../lib/portfolio/cashflow'
import type {
  PortfolioProject,
  ProjectStatusEntry,
  StatusSnapshot,
} from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  snapshot: StatusSnapshot
  onUpdateEntry: (projectId: string, patch: Partial<ProjectStatusEntry>) => void
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmtIndex = (v: number | null, started: boolean) =>
  !started || v === null ? '—' : v.toFixed(2)

function indexTone(v: number | null, started: boolean): string {
  if (!started || v === null) return 'text-ink-400'
  if (v >= 1) return 'text-good'
  if (v >= 0.9) return 'text-ink-700'
  return 'text-danger'
}

function slipLabel(row: ProjectStatusRow): string {
  if (!row.started || row.slipMonths === null) return '—'
  const months = Math.abs(row.slipMonths)
  if (months < 0.05) return 'on plan'
  return row.slipMonths > 0 ? `${months.toFixed(1)} mo late` : `${months.toFixed(1)} mo early`
}

export default function StatusTable({ projects, snapshot, onUpdateEntry }: Props) {
  const rows = useMemo(
    () =>
      projects
        .filter(isValidProject)
        .map((p) => computeProjectStatus(p, snapshot.dataDate, entryFor(snapshot, p.id))),
    [projects, snapshot],
  )

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-400">
        Add a project with valid dates and a BAC to progress the portfolio.
      </p>
    )
  }

  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-[1] bg-white">
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-3">Project</th>
            <th className="py-2 pr-3 text-right">BAC</th>
            <th className="py-2 pr-3 text-right">PV</th>
            <th className="py-2 pr-3">AC</th>
            <th className="py-2 pr-3">% Complete</th>
            <th className="py-2 pr-3 text-right">EV</th>
            <th className="py-2 pr-3 text-right">SPI</th>
            <th className="py-2 pr-3 text-right">SPIe</th>
            <th className="py-2 pr-3 text-right">CPI</th>
            <th className="py-2 pr-3">Expected Finish</th>
            <th className="py-2">Slip</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId} className="border-b border-ink-50">
              <td className="py-1 pr-3 font-semibold text-ink-700">
                {row.name || 'Unnamed project'}
                {!row.started && (
                  <span className="ml-2 text-xs font-normal text-ink-400">(not started)</span>
                )}
              </td>
              <td className="py-1 pr-3 text-right text-ink-600">{fmt(row.bac)}</td>
              <td className="py-1 pr-3 text-right text-ink-600">{fmt(row.pv)}</td>
              <td className="py-1 pr-3">
                <input
                  type="number"
                  className="input !w-24 !py-0.5"
                  min={0}
                  value={row.ac || ''}
                  placeholder="0"
                  aria-label={`Actual cost of ${row.name}`}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    onUpdateEntry(row.projectId, { ac: Number.isFinite(v) && v >= 0 ? v : 0 })
                  }}
                />
              </td>
              <td className="py-1 pr-3">
                <input
                  type="number"
                  className="input !w-20 !py-0.5"
                  min={0}
                  max={100}
                  value={row.pctComplete || ''}
                  placeholder="0"
                  aria-label={`Percent complete of ${row.name}`}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    onUpdateEntry(row.projectId, {
                      pctComplete: Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0,
                    })
                  }}
                />
              </td>
              <td className="py-1 pr-3 text-right text-ink-600">{fmt(row.ev)}</td>
              <td className={`py-1 pr-3 text-right font-semibold ${indexTone(row.spi, row.started)}`}>
                {fmtIndex(row.started ? row.spi : null, row.started)}
              </td>
              <td className={`py-1 pr-3 text-right font-semibold ${indexTone(row.spie, row.started)}`}>
                {fmtIndex(row.spie, row.started)}
              </td>
              <td className={`py-1 pr-3 text-right font-semibold ${indexTone(row.cpi, row.started)}`}>
                {fmtIndex(row.cpi, row.started)}
              </td>
              <td className="py-1 pr-3 text-ink-600">
                {row.started && row.expectedFinish ? row.expectedFinish : '—'}
              </td>
              <td
                className={`py-1 text-xs font-semibold ${
                  row.started && row.slipMonths !== null && row.slipMonths > 0.05
                    ? 'text-danger'
                    : 'text-ink-500'
                }`}
              >
                {slipLabel(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
