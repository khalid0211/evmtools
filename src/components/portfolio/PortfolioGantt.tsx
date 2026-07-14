import { useMemo } from 'react'
import Plot from '../Plot'
import { buildPortfolioGanttFigure } from '../../lib/portfolio/figures'
import type { PortfolioProject } from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  dataDate: string | null
}

export default function PortfolioGantt({ projects, dataDate }: Props) {
  const figure = useMemo(() => buildPortfolioGanttFigure(projects, dataDate), [projects, dataDate])

  if (!figure) {
    return (
      <p className="text-sm text-ink-400">
        Add a project with valid dates and a BAC to see it on the Gantt chart.
      </p>
    )
  }

  return (
    <div>
      <Plot data={figure.data} layout={figure.layout} />
      {dataDate && (
        <div className="mt-2 text-xs text-ink-500">
          <span className="font-semibold text-danger">- - -</span> Data date: {dataDate}
        </div>
      )}
    </div>
  )
}
