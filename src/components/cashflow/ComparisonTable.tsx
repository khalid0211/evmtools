import type { ScenarioRecord } from '../../types/cashflow'

interface Props {
  baseline: ScenarioRecord | null
  comparisons: ScenarioRecord[]
}

export default function ComparisonTable({ baseline, comparisons }: Props) {
  if (!baseline) return null

  const rows: ScenarioRecord[] = [
    { ...baseline, scenarioType: 'Baseline', deltaFromBaseline: 0 },
    ...comparisons.map((c) => ({ ...c, scenarioType: 'Comparison' as const })),
  ]

  const maxDelta = comparisons.length
    ? Math.max(...comparisons.map((r) => Math.abs(r.deltaFromBaseline ?? 0)))
    : 0
  const avgDelta = comparisons.length
    ? comparisons.reduce((s, r) => s + (r.deltaFromBaseline ?? 0), 0) / comparisons.length
    : 0

  return (
    <div className="card space-y-3">
      <div className="font-semibold text-ink-500">📊 Baseline &amp; Comparison Analysis</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-ink-50 text-ink-500">
              {['Scenario', 'Time', 'Duration', 'Pattern', 'Start Delay', 'Proj. Delay', 'Inflation', 'Sim. Budget', 'Budget Var.', 'Δ from Baseline'].map(
                (h) => (
                  <th key={h} className="px-2 py-1 border border-ink-200 font-semibold text-center">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="even:bg-ink-50/50">
                <td className="px-2 py-1 border border-ink-200 text-center">
                  {r.scenarioType === 'Baseline' ? '🔵 Baseline' : `⚖️ Comparison ${i}`}
                </td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.timestamp}</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.duration} mo</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.pattern}</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.startDelay} mo</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.projectDelay} mo</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.inflation}%</td>
                <td className="px-2 py-1 border border-ink-200 text-center">{r.simulatedBudget.toFixed(1)}M</td>
                <td className="px-2 py-1 border border-ink-200 text-center">
                  {r.budgetVariance >= 0 ? '+' : ''}
                  {r.budgetVariance.toFixed(1)}%
                </td>
                <td className="px-2 py-1 border border-ink-200 text-center">
                  {(r.deltaFromBaseline ?? 0) >= 0 ? '+' : ''}
                  {(r.deltaFromBaseline ?? 0).toFixed(1)}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparisons.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="metric-card">
            <div className="metric-label">Max Budget Impact</div>
            <div className="text-lg font-bold text-ink-500">{maxDelta.toFixed(1)}M</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Budget Impact</div>
            <div className="text-lg font-bold text-ink-500">
              {avgDelta >= 0 ? '+' : ''}
              {avgDelta.toFixed(1)}M
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Comparisons</div>
            <div className="text-lg font-bold text-ink-500">{comparisons.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
