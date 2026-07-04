import type { CashFlowPattern } from '../../types/cashflow'
import { milestoneForPattern } from '../../lib/cashflow/calculations'

interface Props {
  pattern: CashFlowPattern
}

export default function TimelineBar({ pattern }: Props) {
  if (pattern === 'Linear') return null
  const milestones = milestoneForPattern(pattern)

  return (
    <div className="card">
      <div className="subsection-title text-center">Project Timeline — {pattern} Pattern</div>
      <div className="bg-ink-50 rounded-lg p-4 mt-2">
        <div className="flex w-full h-8 rounded-md overflow-hidden shadow-sm">
          {milestones.slice(1).map((m, i) => {
            const width = (m.pos - milestones[i].pos) * 100
            return (
              <div
                key={i}
                className="flex items-center justify-center text-white font-semibold text-[10px]"
                style={{
                  width: `${width}%`,
                  backgroundColor: m.color,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
                  borderRight: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {m.label}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-ink-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
