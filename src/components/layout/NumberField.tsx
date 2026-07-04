import { useId } from 'react'

interface Props {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  suffix?: string
  help?: string
  onChange: (v: number) => void
}

export default function NumberField({
  label,
  value,
  step = 1,
  min,
  max,
  suffix,
  help,
  onChange,
}: Props) {
  const inputId = useId()
  const helpId = help ? `${inputId}-help` : undefined

  return (
    <div>
      <label className="field-label" htmlFor={inputId} title={help}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          className="input pr-8"
          value={value}
          step={step}
          min={min}
          max={max}
          aria-describedby={helpId}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
            onChange(Number.isFinite(v) ? v : 0)
          }}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-400">
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <div id={helpId} className="mt-1 text-xs leading-relaxed text-ink-400">
          {help}
        </div>
      )}
    </div>
  )
}
