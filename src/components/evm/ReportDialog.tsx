import { useEffect, useId, useState } from 'react'
import type { ReportMeta } from '../../lib/evm/report'

interface Props {
  open: boolean
  busy?: boolean
  onCancel: () => void
  onSubmit: (meta: ReportMeta) => void
}

export default function ReportDialog({ open, busy = false, onCancel, onSubmit }: Props) {
  const projectId = useId()
  const orgId = useId()
  const [projectName, setProjectName] = useState('Sample Project')
  const [organization, setOrganization] = useState('PMO')

  useEffect(() => {
    if (open) {
      setProjectName('Sample Project')
      setOrganization('PMO')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      projectName: projectName.trim() || 'Sample Project',
      organization: organization.trim() || 'PMO',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${projectId}-title`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-6 shadow-card-lg"
      >
        <h2 id={`${projectId}-title`} className="text-lg font-bold text-ink-900">
          Generate EVM Report
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Enter the project details for the printable report header.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="field-label" htmlFor={projectId}>
              Project Name
            </label>
            <input
              id={projectId}
              className="input"
              value={projectName}
              autoFocus
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor={orgId}>
              Organization
            </label>
            <input
              id={orgId}
              className="input"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Preparing…' : 'Generate Report'}
          </button>
        </div>
      </form>
    </div>
  )
}
