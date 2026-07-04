interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  label?: string
  onChange: (v: T) => void
}

export default function ToggleGroup<T extends string>({ value, options, label, onChange }: Props<T>) {
  return (
    <div className="mb-4 inline-flex rounded-lg border border-ink-200 bg-white p-1 shadow-sm" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-brand-100 ${
            value === opt.value
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-ink-500 hover:bg-ink-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
