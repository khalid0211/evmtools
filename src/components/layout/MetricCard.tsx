interface Props {
  label: string
  value: string
  formula?: string
  color?: string
  badge?: string
  badgeTone?: 'good' | 'warn' | 'danger' | 'neutral' | 'info'
  featured?: boolean
}

const badgeToneClasses: Record<NonNullable<Props['badgeTone']>, string> = {
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/20 text-ink-700',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-ink-100 text-ink-500',
  info: 'bg-brand-50 text-brand-700',
}

export default function MetricCard({
  label,
  value,
  formula,
  color,
  badge,
  badgeTone = 'neutral',
  featured = false,
}: Props) {
  return (
    <div className={`metric-card ${featured ? 'border-brand-100 bg-brand-50/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="metric-label">{label}</div>
        {badge && <div className={`status-badge ${badgeToneClasses[badgeTone]}`}>{badge}</div>}
      </div>
      <div className={`${featured ? 'text-2xl' : 'text-xl'} mt-2 font-bold leading-tight`} style={{ color: color ?? '#2c3e50' }}>
        {value}
      </div>
      {formula && <div className="metric-formula">{formula}</div>}
    </div>
  )
}
