import { useMemo } from 'react'
import Plot from '../Plot'
import { buildProgressFigure } from '../../lib/portfolio/figures'
import { buildActualCurves, samplePortfolioPvCurve } from '../../lib/portfolio/history'
import type { PortfolioProject, StatusSnapshot } from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  history: StatusSnapshot[]
  dataDate: string | null
}

export default function ProgressChart({ projects, history, dataDate }: Props) {
  const figure = useMemo(() => {
    const pvCurve = samplePortfolioPvCurve(projects)
    if (!pvCurve) return null
    return buildProgressFigure(pvCurve, buildActualCurves(projects, history), dataDate)
  }, [projects, history, dataDate])

  if (!figure) {
    return (
      <p className="text-sm text-ink-400">
        Add a project with valid dates and a BAC to see the progress chart.
      </p>
    )
  }

  return <Plot data={figure.data} layout={figure.layout} />
}
