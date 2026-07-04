import type { EvmInputs, PvMethod, EvMethod, DurationMode } from '../../types/evm'
import NumberField from '../layout/NumberField'
import SelectField from '../layout/SelectField'
import DateField from '../layout/DateField'
import ToggleGroup from '../layout/ToggleGroup'

interface Props {
  inputs: EvmInputs
  onChange: (patch: Partial<EvmInputs>) => void
}

export default function EvmInputsPanel({ inputs, onChange }: Props) {
  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div>Project Parameters</div>
          <div className="mt-1 text-sm font-medium text-ink-400">
            Define the budget, timeline, and value calculation methods.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-muted">
          <div className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Budget &amp; Cost</div>
          <div className="space-y-3">
            <NumberField
              label="Budget at Completion (BAC)"
              value={inputs.bac}
              step={100}
              min={0}
              help="Total project budget"
              onChange={(v) => onChange({ bac: v })}
            />
            <NumberField
              label="Actual Cost (AC)"
              value={inputs.ac}
              step={50}
              min={0}
              help="Actual cost incurred for work completed"
              onChange={(v) => onChange({ ac: v })}
            />
          </div>
        </div>

        <div className="card-muted">
          <div className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Duration</div>
          <ToggleGroup<DurationMode>
            label="Duration input mode"
            value={inputs.durationMode}
            onChange={(v) => onChange({ durationMode: v })}
            options={[
              { value: 'duration', label: 'Enter Duration' },
              { value: 'dates', label: 'Enter Dates' },
            ]}
          />
          {inputs.durationMode === 'duration' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                label="Original Duration (Months)"
                value={inputs.originalDurationInput}
                step={1}
                min={0.1}
                help="Planned project duration"
                onChange={(v) => onChange({ originalDurationInput: v })}
              />
              <NumberField
                label="Used Duration (Months)"
                value={inputs.actualDurationInput}
                step={1}
                min={0}
                help="Actual time elapsed"
                onChange={(v) => onChange({ actualDurationInput: v })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DateField
                label="Plan Start"
                value={inputs.planStart}
                help="Project planned start date"
                onChange={(v) => onChange({ planStart: v })}
              />
              <DateField
                label="Plan Finish"
                value={inputs.planFinish}
                help="Project planned finish date"
                onChange={(v) => onChange({ planFinish: v })}
              />
              <DateField
                label="Status Date"
                value={inputs.statusDate}
                help="As-of / data date"
                onChange={(v) => onChange({ statusDate: v })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-muted">
          <div className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Planned Value</div>
          <div className="space-y-3">
            <SelectField
              label="PV Method"
              value={inputs.pvMethod}
              options={['Linear', 'S-Curve', 'Enter Value']}
              help="Choose how to determine Planned Value"
              onChange={(v) => onChange({ pvMethod: v as PvMethod })}
            />
            {inputs.pvMethod === 'S-Curve' && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Alpha (α)"
                  value={inputs.alpha}
                  step={0.1}
                  min={0.1}
                  max={10}
                  help="S-curve shape parameter (default 2)"
                  onChange={(v) => onChange({ alpha: v })}
                />
                <NumberField
                  label="Beta (β)"
                  value={inputs.beta}
                  step={0.1}
                  min={0.1}
                  max={10}
                  help="S-curve shape parameter (default 2)"
                  onChange={(v) => onChange({ beta: v })}
                />
              </div>
            )}
            {inputs.pvMethod === 'Enter Value' && (
              <NumberField
                label="Planned Value (PV)"
                value={inputs.pvManual}
                step={50}
                min={0}
                help="Budgeted cost of work scheduled"
                onChange={(v) => onChange({ pvManual: v })}
              />
            )}
          </div>
        </div>

        <div className="card-muted">
          <div className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Earned Value</div>
          <div className="space-y-3">
            <SelectField
              label="EV Method"
              value={inputs.evMethod}
              options={['Enter Value', '% Complete', 'Estimate']}
              help="Choose how to determine Earned Value"
              onChange={(v) => onChange({ evMethod: v as EvMethod })}
            />
            {inputs.evMethod === 'Enter Value' && (
              <NumberField
                label="Earned Value (EV)"
                value={inputs.evManual}
                step={50}
                min={0}
                help="Budgeted cost of work performed"
                onChange={(v) => onChange({ evManual: v })}
              />
            )}
            {inputs.evMethod === '% Complete' && (
              <NumberField
                label="% Complete"
                value={inputs.percentComplete}
                step={1}
                min={0}
                max={100}
                help="Percentage of project completed. EV = BAC x % Complete"
                onChange={(v) => onChange({ percentComplete: v })}
              />
            )}
            {inputs.evMethod === 'Estimate' && (
              <NumberField
                label="Inflation Rate (%)"
                value={inputs.inflationRate}
                step={0.5}
                min={0}
                max={99.9}
                help="Annual inflation rate. EV = present value of the AC cash flow at the equivalent monthly rate"
                onChange={(v) => onChange({ inflationRate: v })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
