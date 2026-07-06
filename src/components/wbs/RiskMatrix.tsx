import { Fragment } from 'react'
import type { RiskCell, RiskLevel } from '../../types/wbs'
import { riskTone } from '../../lib/wbs/calculations'

interface Props {
  cells: RiskCell[]
}

const toneCell = {
  good: 'bg-good/15 border-good/30',
  warn: 'bg-warn/20 border-warn/40',
  danger: 'bg-danger/15 border-danger/30',
}

const toneText = {
  good: 'text-good',
  warn: 'text-ink-700',
  danger: 'text-danger',
}

// rows top→bottom: High, Medium, Low
const ROW_ORDER: RiskLevel[] = ['High', 'Medium', 'Low']
const COL_ORDER: RiskLevel[] = ['Low', 'Medium', 'High']

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function RiskMatrix({ cells }: Props) {
  return (
    <div>
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-2">
        <div />
        {COL_ORDER.map((impact) => (
          <div
            key={impact}
            className="text-center text-xs font-bold uppercase tracking-wide text-ink-400"
          >
            {impact} Impact
          </div>
        ))}
        {ROW_ORDER.map((likelihood) => (
          <Fragment key={likelihood}>
            <div className="flex items-center pr-2 text-xs font-bold uppercase tracking-wide text-ink-400">
              {likelihood}
              <br />
              Likelihood
            </div>
            {COL_ORDER.map((impact) => {
              const cell = cells.find(
                (c) => c.likelihood === likelihood && c.impact === impact,
              )!
              const tone = riskTone(cell.score)
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  className={`rounded-xl border p-3 text-center ${toneCell[tone]}`}
                >
                  <div className={`text-lg font-bold tabular-nums ${toneText[tone]}`}>
                    {cell.count > 0 ? fmt(cell.totalCost) : '—'}
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    {cell.count} item{cell.count === 1 ? '' : 's'}
                  </div>
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-good/40" /> Low risk (score ≤ 2)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-warn/50" /> Moderate (3–4)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-danger/40" /> High (≥ 6)
        </span>
        <span className="text-ink-400">
          Cell values sum the active cost estimate of work packages in that category.
        </span>
      </div>
    </div>
  )
}
