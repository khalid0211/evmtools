import type { CashFlowInputs, CashFlowPattern, DisplayBasis } from '../../types/cashflow'
import NumberField from '../layout/NumberField'
import SelectField from '../layout/SelectField'

interface Props {
  inputs: CashFlowInputs
  onChange: (patch: Partial<CashFlowInputs>) => void
}

export default function CashFlowInputsPanel({ inputs, onChange }: Props) {
  return (
    <div className="card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="param-card-header">💰 Budget &amp; Duration</div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Budget (Millions)"
              value={inputs.budget}
              step={1}
              min={1}
              max={999999}
              help="Total project budget in millions"
              onChange={(v) => onChange({ budget: v })}
            />
            <NumberField
              label="Duration (Mo)"
              value={inputs.duration}
              step={1}
              min={1}
              max={999}
              help="Project duration in months"
              onChange={(v) => onChange({ duration: v })}
            />
          </div>
        </div>

        <div>
          <div className="param-card-header">📊 Cash Flow Model</div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Pattern"
              value={inputs.pattern}
              options={['Linear', 'Highway', 'Building', 'S-Curve']}
              help="Cash flow distribution pattern"
              onChange={(v) => onChange({ pattern: v as CashFlowPattern })}
            />
            <SelectField
              label="View"
              value={inputs.displayBasis}
              options={['Monthly', 'Quarterly', 'Yearly']}
              help="Chart time scale"
              onChange={(v) => onChange({ displayBasis: v as DisplayBasis })}
            />
          </div>
        </div>

        <div>
          <div className="param-card-header">⚠️ Risk Factors</div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label="Start Delay"
              value={inputs.startDelay}
              step={1}
              min={0}
              max={100}
              help="Delay before project starts (months)"
              onChange={(v) => onChange({ startDelay: v })}
            />
            <NumberField
              label="Project Delay"
              value={inputs.projectDelay}
              step={1}
              min={0}
              max={100}
              help="Additional project duration (months)"
              onChange={(v) => onChange({ projectDelay: v })}
            />
            <NumberField
              label="Inflation (%)"
              value={inputs.inflation}
              step={0.1}
              min={0}
              max={99.9}
              help="Annual inflation rate"
              onChange={(v) => onChange({ inflation: v })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
