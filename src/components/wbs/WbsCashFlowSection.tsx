import { useMemo } from 'react'
import Plot from '../Plot'
import SelectField from '../layout/SelectField'
import ToggleGroup from '../layout/ToggleGroup'
import { computeWbsCashFlow, resolveCashFlowBasis } from '../../lib/wbs/cashflow'
import { buildCashFlowFigure } from '../../lib/wbs/figures'
import type {
  CashFlowBasis,
  CashFlowBucket,
  MonteCarloResult,
  WbsComputed,
  WbsSettings,
  WbsState,
} from '../../types/wbs'

interface Props {
  state: WbsState
  computed: WbsComputed
  mcResult: MonteCarloResult | null
  mcStale: boolean
  pertCost: number
  onUpdateSettings: (patch: Partial<WbsSettings>) => void
}

export default function WbsCashFlowSection({
  state,
  computed,
  mcResult,
  mcStale,
  pertCost,
  onUpdateSettings,
}: Props) {
  const { cfBasis, cfBucket } = state.settings
  const mc = mcStale ? null : mcResult
  const basisOptions: CashFlowBasis[] = mc
    ? ['Budget', 'PERT', 'P50', 'P80', 'P90']
    : ['Budget', 'PERT']

  const resolved = useMemo(
    () => resolveCashFlowBasis(cfBasis, computed, pertCost, mc),
    [cfBasis, computed, pertCost, mc],
  )

  const figure = useMemo(() => {
    const rootBudget = computed.perNode[state.rootId]?.budget ?? 0
    const scale = rootBudget > 0 ? resolved.total / rootBudget : 1
    const series = computeWbsCashFlow(state, computed, { bucket: cfBucket, scale })
    if (!series) return null
    return { figure: buildCashFlowFigure(series, resolved.label), excluded: series.excluded }
  }, [state, computed, cfBucket, resolved])

  return (
    <div className="card space-y-3">
      <div className="section-header">
        <span>💰 Cash Flow</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <SelectField
            label="Basis"
            value={basisOptions.includes(cfBasis) ? cfBasis : resolved.label}
            options={basisOptions}
            onChange={(v) => onUpdateSettings({ cfBasis: v as CashFlowBasis })}
          />
        </div>
        <ToggleGroup<CashFlowBucket>
          value={cfBucket}
          label="Bucket size"
          options={[
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Weekly', label: 'Weekly' },
          ]}
          onChange={(v) => onUpdateSettings({ cfBucket: v })}
        />
      </div>

      {!mc && (
        <p className="text-xs text-ink-400">
          Run a Monte Carlo simulation (and keep it current) to enable P50 / P80 / P90 curve bases.
        </p>
      )}
      {!resolved.available && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs font-semibold text-ink-700">
          {cfBasis} needs a current simulation — showing the Budget basis instead.
        </div>
      )}

      {figure ? (
        <>
          <Plot data={figure.figure.data} layout={figure.figure.layout} />
          <p className="text-xs text-ink-400">
            Each work package spreads its budget across its dates (linear or S-curve, set in the
            editor). Non-Budget bases scale all items proportionally so the curve ends at the
            project-level {resolved.label} total.
            {figure.excluded > 0 &&
              ` ${figure.excluded} work package${figure.excluded === 1 ? '' : 's'} without valid dates excluded.`}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-400">
          Set start and end dates on your work packages to see the cash flow chart.
        </p>
      )}
    </div>
  )
}
