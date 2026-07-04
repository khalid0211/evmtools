import { useMemo } from 'react'
import Plot from '../Plot'
import type { EvmInputs } from '../../types/evm'
import { buildEvmFigure } from '../../lib/evm/figure'

interface Props {
  inputs: EvmInputs
}

export default function EvmChart({ inputs }: Props) {
  const figure = useMemo(() => buildEvmFigure(inputs), [inputs])

  if (!figure) return null

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div>EVM Curve Analysis</div>
          <div className="mt-1 text-sm font-medium text-ink-400">
            Compare planned, earned, and actual cost curves over the project timeline.
          </div>
        </div>
      </div>
      <Plot
        data={figure.data}
        layout={figure.layout}
        config={{ modeBarButtonsToRemove: ['lasso2d', 'select2d'] }}
        style={{ height: 460 }}
      />
    </div>
  )
}
