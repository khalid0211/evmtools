import { useMemo } from 'react'
import Plot from '../Plot'
import { buildCashFlowChartFigure } from '../../lib/cashflow/figure'
import type { CashFlowResult, CashFlowInputs } from '../../types/cashflow'

interface Props {
  inputs: CashFlowInputs
  result: CashFlowResult
}

export default function CashFlowChart({ inputs, result }: Props) {
  const figure = useMemo(() => buildCashFlowChartFigure(inputs, result), [inputs, result])
  return <Plot data={figure.data} layout={figure.layout} style={{ height: 360 }} />
}
