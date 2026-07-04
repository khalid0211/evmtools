import { useId } from 'react'

interface Props {
  label: string
  value: string
  help?: string
  onChange: (v: string) => void
}

export default function DateField({ label, value, help, onChange }: Props) {
  const inputId = useId()
  const helpId = help ? `${inputId}-help` : undefined

  return (
    <div>
      <label className="field-label" htmlFor={inputId} title={help}>
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        className="input"
        value={value}
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && (
        <div id={helpId} className="mt-1 text-xs leading-relaxed text-ink-400">
          {help}
        </div>
      )}
    </div>
  )
}
