import { useMemo } from 'react'
import Plot from '../Plot'
import { buildGanttFigure } from '../../lib/wbs/figures'
import type { WbsComputed, WbsState } from '../../types/wbs'

interface Props {
  state: WbsState
  computed: WbsComputed
}

export default function WbsGantt({ state, computed }: Props) {
  const figure = useMemo(() => buildGanttFigure(state, computed), [state, computed])

  if (!figure) {
    return (
      <p className="text-sm text-ink-400">
        Set start and end dates on your work packages to see them on the Gantt chart.
      </p>
    )
  }

  return (
    <div>
      <Plot data={figure.data} layout={figure.layout} />
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-good/70" /> Low risk
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-warn/80" /> Moderate risk
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-danger/70" /> High risk
        </span>
      </div>
    </div>
  )
}
