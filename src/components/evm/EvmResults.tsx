import type { EvmInputs, EvmResult } from '../../types/evm'
import MetricCard from '../layout/MetricCard'

function fmt(n: number | null, decimals = 0): string {
  if (n === null || !isFinite(n)) return 'N/A'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function statusColor(n: number): string {
  if (n > 0) return '#28a745'
  if (n < 0) return '#dc3545'
  return '#ffc107'
}

type BadgeTone = 'good' | 'warn' | 'danger' | 'neutral' | 'info'

function varianceTone(n: number): BadgeTone {
  if (n > 0) return 'good'
  if (n < 0) return 'danger'
  return 'warn'
}

function indexTone(n: number | null, neutralAtOne = true): BadgeTone {
  if (n === null) return 'neutral'
  if (neutralAtOne) {
    if (n > 1) return 'good'
    if (n < 1) return 'danger'
    return 'warn'
  }
  if (n >= 1) return 'good'
  if (n < 0.8) return 'danger'
  return 'warn'
}

function indexColor(n: number | null, neutralAtOne = true): string {
  if (n === null) return '#6c757d'
  if (neutralAtOne) {
    if (n > 1) return '#28a745'
    if (n < 1) return '#dc3545'
    return '#ffc107'
  }
  if (n >= 1) return '#28a745'
  if (n < 0.8) return '#dc3545'
  return '#ffc107'
}

const healthToneMap: Record<EvmResult['healthStatus'], BadgeTone> = {
  Excellent: 'good',
  'At Risk': 'warn',
  Critical: 'danger',
}

const healthColorMap: Record<EvmResult['healthStatus'], string> = {
  Excellent: '#28a745',
  'At Risk': '#ffc107',
  Critical: '#dc3545',
}

function pvFormula(inputs: EvmInputs): string {
  if (inputs.pvMethod === 'Enter Value') return 'Manual Entry'
  if (inputs.pvMethod === 'S-Curve') return `S-Curve (α=${inputs.alpha}, β=${inputs.beta})`
  return 'Linear'
}

function evFormula(inputs: EvmInputs): string {
  if (inputs.evMethod === 'Enter Value') return 'Manual Entry'
  if (inputs.evMethod === '% Complete') return `BAC × ${inputs.percentComplete.toFixed(1)}%`
  return `PV of AC @ ${inputs.inflationRate}% infl.`
}

interface Props {
  inputs: EvmInputs
  result: EvmResult
}

export default function EvmResults({ inputs, result }: Props) {
  if (!result.valid) {
    return (
      <div className="card">
        <div className="rounded-xl border border-warn/40 bg-warn/20 px-4 py-3 text-sm font-semibold text-ink-700">
          {result.warning}
        </div>
      </div>
    )
  }

  const percentCompleteEffective = inputs.bac > 0 ? (result.ev / inputs.bac) * 100 : 0
  const showEs = inputs.pvMethod !== 'Enter Value'
  const healthTone: BadgeTone = healthToneMap[result.healthStatus]

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="section-header">
          <div>
            <div>Project Status Summary</div>
            <div className="mt-1 text-sm font-medium text-ink-400">
              Current cost, schedule, health, and earned progress at a glance.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Cost"
            value={result.costStatus}
            formula={`CV ${fmt(result.cv)}`}
            color={statusColor(result.cv)}
            badge={result.cv >= 0 ? 'On track' : 'Action'}
            badgeTone={varianceTone(result.cv)}
            featured
          />
          <MetricCard
            label="Schedule"
            value={result.scheduleStatus}
            formula={`SV ${fmt(result.sv)}`}
            color={statusColor(result.sv)}
            badge={result.sv >= 0 ? 'On track' : 'Action'}
            badgeTone={varianceTone(result.sv)}
            featured
          />
          <MetricCard
            label="Health"
            value={result.healthStatus}
            formula={`CPI ${fmt(result.cpi, 2)} · SPI ${fmt(result.spi, 2)}`}
            color={healthColorMap[result.healthStatus]}
            badge={healthTone === 'good' ? 'Strong' : healthTone === 'warn' ? 'Watch' : 'Risk'}
            badgeTone={healthTone}
            featured
          />
          <MetricCard
            label="Progress"
            value={`${percentCompleteEffective.toFixed(1)}%`}
            formula="EV / BAC"
            color="#007bff"
            badge="Earned"
            badgeTone="info"
            featured
          />
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div>Calculated Values</div>
            <div className="mt-1 text-sm font-medium text-ink-400">
              Intermediate values used by the performance and forecast metrics.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            label="Time Elapsed"
            value={`${result.timeElapsedPct.toFixed(1)}%`}
            formula="Used duration / original duration"
          />
          <MetricCard
            label="Budget Utilized"
            value={`${result.budgetUtilizedPct.toFixed(1)}%`}
            formula="Actual cost / BAC"
            color={result.budgetUtilizedPct <= 100 ? '#28a745' : '#dc3545'}
            badge={result.budgetUtilizedPct <= 100 ? 'Within BAC' : 'Over BAC'}
            badgeTone={result.budgetUtilizedPct <= 100 ? 'good' : 'danger'}
          />
          <MetricCard
            label="Completion Efficiency"
            value={result.completionEfficiency.toFixed(2)}
            formula="Complete percent / elapsed percent"
            color={indexColor(result.completionEfficiency, false)}
            badge={indexTone(result.completionEfficiency, false) === 'good' ? 'Efficient' : indexTone(result.completionEfficiency, false) === 'warn' ? 'Watch' : 'Lagging'}
            badgeTone={indexTone(result.completionEfficiency, false)}
          />
          <MetricCard
            label="Planned Value (PV)"
            value={fmt(result.pv)}
            formula={pvFormula(inputs)}
            color="#28a745"
          />
          <MetricCard
            label="Earned Value (EV)"
            value={fmt(result.ev)}
            formula={evFormula(inputs)}
            color="#007bff"
          />
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div>EVM Analysis Results</div>
            <div className="mt-1 text-sm font-medium text-ink-400">
              Variance, performance, and forecast indicators for project control.
            </div>
          </div>
        </div>

        <div className="subsection-title">Performance Metrics</div>
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${showEs ? 'xl:grid-cols-6' : 'lg:grid-cols-4'}`}>
          <MetricCard label="Cost Variance (CV)" value={fmt(result.cv)} formula="EV - AC" color={statusColor(result.cv)} badge={result.cv >= 0 ? 'Favorable' : 'Unfavorable'} badgeTone={varianceTone(result.cv)} />
          <MetricCard label="Schedule Variance (SV)" value={fmt(result.sv)} formula="EV - PV" color={statusColor(result.sv)} badge={result.sv >= 0 ? 'Favorable' : 'Unfavorable'} badgeTone={varianceTone(result.sv)} />
          <MetricCard label="Cost Performance (CPI)" value={fmt(result.cpi, 3)} formula="EV / AC" color={result.cpi !== null ? indexColor(result.cpi) : '#6c757d'} badge={indexTone(result.cpi) === 'good' ? 'Good' : indexTone(result.cpi) === 'warn' ? 'Neutral' : 'Low'} badgeTone={indexTone(result.cpi)} />
          <MetricCard label="Schedule Performance (SPI)" value={fmt(result.spi, 3)} formula="EV / PV" color={indexColor(result.spi)} badge={indexTone(result.spi) === 'good' ? 'Good' : indexTone(result.spi) === 'warn' ? 'Neutral' : 'Low'} badgeTone={indexTone(result.spi)} />
          {showEs && (
            <MetricCard
              label="Earned Schedule (ES)"
              value={result.es !== null ? `${result.es.toFixed(1)} mo` : 'N/A'}
              formula="Months @ PV=EV"
              color="#6f42c1"
            />
          )}
          {showEs && (
            <MetricCard
              label="SPIe"
              value={result.spie !== null ? result.spie.toFixed(3) : 'N/A'}
              formula="ES/AD"
              color={result.spie !== null ? indexColor(result.spie) : '#6c757d'}
            />
          )}
        </div>

        <div className="subsection-title mt-4">Project Forecasting</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Estimate at Completion"
            value={fmt(result.eac)}
            formula="AC + ETC"
            color={result.eac !== null && result.eac <= inputs.bac ? '#28a745' : '#dc3545'}
            badge={result.eac !== null && result.eac <= inputs.bac ? 'Within BAC' : 'Over BAC'}
            badgeTone={result.eac !== null && result.eac <= inputs.bac ? 'good' : 'danger'}
          />
          <MetricCard label="Estimate to Complete" value={fmt(result.etc)} formula="(BAC-EV)/CPI" />
          <MetricCard label="Variance at Completion" value={fmt(result.vac)} formula="BAC - EAC" color={result.vac !== null ? (result.vac >= 0 ? '#28a745' : '#dc3545') : '#6c757d'} badge={result.vac !== null && result.vac >= 0 ? 'Favorable' : 'Unfavorable'} badgeTone={result.vac !== null ? varianceTone(result.vac) : 'neutral'} />
          <MetricCard
            label="To Complete Index"
            value={fmt(result.tcpiBac, 3)}
            formula="(BAC-EV)/(BAC-AC)"
            color={result.tcpiBac <= 1 ? '#28a745' : result.tcpiBac <= 1.2 ? '#ffc107' : '#dc3545'}
            badge={result.tcpiBac <= 1 ? 'Achievable' : result.tcpiBac <= 1.2 ? 'Stretch' : 'High risk'}
            badgeTone={result.tcpiBac <= 1 ? 'good' : result.tcpiBac <= 1.2 ? 'warn' : 'danger'}
          />
        </div>
      </div>
    </div>
  )
}
