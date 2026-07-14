import type { FundingAnalysis } from '../../lib/portfolio/funding'
import type { PortfolioCashflowSeries } from '../../lib/portfolio/cashflow'

interface Props {
  series: PortfolioCashflowSeries
  analysis: FundingAnalysis
  onSetAmount: (periodKey: string, amount: number) => void
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

export default function FundingTable({ series, analysis, onSetAmount }: Props) {
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4 text-right">Cash requirement</th>
            <th className="py-2 pr-4">Funding</th>
            <th className="py-2 pr-4 text-right">Cumulative funding</th>
            <th className="py-2 text-right">Headroom</th>
          </tr>
        </thead>
        <tbody>
          {analysis.periods.map((period, i) => (
            <tr
              key={period.key}
              className={`border-b border-ink-50 ${analysis.overloaded[i] ? 'bg-danger/5' : ''}`}
            >
              <td className="py-1.5 pr-4 font-semibold text-ink-700">{period.label}</td>
              <td className="py-1.5 pr-4 text-right text-ink-600">{fmt(series.perPeriod[i])}</td>
              <td className="py-1.5 pr-4">
                <input
                  type="number"
                  className="input !w-28 !py-1"
                  min={0}
                  value={analysis.perPeriodFunding[i] || ''}
                  placeholder="0"
                  aria-label={`Funding for ${period.label}`}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    onSetAmount(period.key, Number.isFinite(v) ? v : 0)
                  }}
                />
              </td>
              <td className="py-1.5 pr-4 text-right text-ink-600">
                {fmt(analysis.cumulativeFunding[i])}
              </td>
              <td
                className={`py-1.5 text-right font-semibold ${
                  analysis.overloaded[i] ? 'text-danger' : 'text-good'
                }`}
              >
                {fmt(analysis.net[i])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-xs font-bold text-ink-700">
            <td className="py-2 pr-4">Total</td>
            <td className="py-2 pr-4 text-right">{fmt(analysis.totalRequirement)}</td>
            <td className="py-2 pr-4">{fmt(analysis.totalFunding)}</td>
            <td className="py-2 pr-4" />
            <td
              className={`py-2 text-right ${
                analysis.totalFunding < analysis.totalRequirement ? 'text-danger' : 'text-good'
              }`}
            >
              {fmt(analysis.totalFunding - analysis.totalRequirement)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
