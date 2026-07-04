import { useId } from 'react'

interface Props {
  label: string
  value: string
  options: string[]
  help?: string
  onChange: (v: string) => void
}

export default function SelectField({
  label,
  value,
  options,
  help,
  onChange,
}: Props) {
  const selectId = useId()
  const helpId = help ? `${selectId}-help` : undefined

  return (
    <div>
      <label className="field-label" htmlFor={selectId} title={help}>
        {label}
      </label>
      <select
        id={selectId}
        className="input"
        value={value}
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {help && (
        <div id={helpId} className="mt-1 text-xs leading-relaxed text-ink-400">
          {help}
        </div>
      )}
    </div>
  )
}
