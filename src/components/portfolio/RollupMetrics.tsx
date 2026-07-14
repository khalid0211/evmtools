import MetricCard from '../layout/MetricCard'
import type { PortfolioRollup } from '../../lib/portfolio/evm'

interface Props {
  rollup: PortfolioRollup
  /** Set when the user is editing a snapshot other than the one driving these metrics. */
  editingOtherDate: string | null
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
const fmtIndex = (v: number | null) => (v === null ? '—' : v.toFixed(2))

function indexBadge(v: number | null): { badge?: string; tone?: 'good' | 'warn' | 'danger' } {
  if (v === null) return {}
  if (v >= 1) return { badge: 'On track', tone: 'good' }
  if (v >= 0.9) return { badge: 'Watch', tone: 'warn' }
  return { badge: 'Behind', tone: 'danger' }
}

export default function RollupMetrics({ rollup, editingOtherDate }: Props) {
  const spiBadge = indexBadge(rollup.spi)
  const spieBadge = indexBadge(rollup.spie)
  const cpiBadge = indexBadge(rollup.cpi)
  const slip = rollup.slipMonths
  const slipText =
    slip === null
      ? undefined
      : Math.abs(slip) < 0.05
        ? 'on plan'
        : slip > 0
          ? `${slip.toFixed(1)} months late`
          : `${Math.abs(slip).toFixed(1)} months early`

  return (
    <div className="space-y-3">
      <div className="text-xs text-ink-500">
        Portfolio status as of <strong>{rollup.dataDate}</strong> (latest data date)
        {editingOtherDate && (
          <span className="ml-1 font-semibold text-ink-500">
            — you are editing the {editingOtherDate} update; the roll-up always reflects the
            latest one.
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Planned Value (PV)" value={fmt(rollup.pv)} featured />
        <MetricCard label="Earned Value (EV)" value={fmt(rollup.ev)} featured />
        <MetricCard label="Actual Cost (AC)" value={fmt(rollup.ac)} featured />
        <MetricCard label="Budget (BAC)" value={fmt(rollup.bac)} />
        <MetricCard
          label="Expected Finish"
          value={rollup.expectedFinish ?? '—'}
          formula="Plan duration ÷ SPIe"
          badge={slipText}
          badgeTone={slip !== null && slip > 0.05 ? 'danger' : 'good'}
        />
        <MetricCard
          label="SPI"
          value={fmtIndex(rollup.spi)}
          formula="EV ÷ PV"
          badge={spiBadge.badge}
          badgeTone={spiBadge.tone}
        />
        <MetricCard
          label="SPIe"
          value={fmtIndex(rollup.spie)}
          formula="ES ÷ AT"
          badge={spieBadge.badge}
          badgeTone={spieBadge.tone}
        />
        <MetricCard
          label="CPI"
          value={fmtIndex(rollup.cpi)}
          formula="EV ÷ AC"
          badge={cpiBadge.badge}
          badgeTone={cpiBadge.tone}
        />
        <MetricCard
          label="ETC"
          value={rollup.etc === null ? '—' : fmt(rollup.etc)}
          formula="(BAC − EV) ÷ CPI"
        />
        <MetricCard
          label="EAC / VAC"
          value={rollup.eac === null ? '—' : fmt(rollup.eac)}
          formula={rollup.vac === null ? 'AC + ETC' : `VAC = ${fmt(rollup.vac)}`}
          color={rollup.vac !== null && rollup.vac < 0 ? '#dc3545' : undefined}
        />
      </div>
    </div>
  )
}
