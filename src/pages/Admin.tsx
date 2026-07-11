import { useEffect, useState } from 'react'
import {
  ApiError,
  exportAdminCsv,
  fetchAdminSummary,
  type AdminSummary,
  type Period,
} from '../lib/auth/api'

const ADMIN_KEY_STORAGE = 'evmtools_admin_key'

const TOOL_LABELS: Record<string, string> = {
  'evm-calculator': 'EVM Calculator',
  'cash-flow-simulator': 'Cash Flow Simulator',
  'wbs-maker': 'WBS Maker',
}

function loadStoredKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

function saveStoredKey(key: string) {
  try {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, key)
  } catch {
    // sessionStorage unavailable — key just won't survive a reload
  }
}

export default function Admin() {
  const [keyInput, setKeyInput] = useState(loadStoredKey)
  const [activeKey, setActiveKey] = useState(loadStoredKey)
  const [period, setPeriod] = useState<Period>('day')
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!activeKey) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminSummary(period, activeKey)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((e) => {
        if (cancelled) return
        setSummary(null)
        setError(e instanceof ApiError && e.status === 401 ? 'Invalid admin key.' : 'Failed to load activity data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeKey, period])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    saveStoredKey(keyInput)
    setActiveKey(keyInput)
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const blob = await exportAdminCsv(activeKey)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? 'Invalid admin key.' : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Activity Dashboard</h1>
        <p className="page-subtitle">Registered users and tool usage.</p>
      </div>

      <div className="card max-w-md">
        <form onSubmit={handleUnlock} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="field-label" htmlFor="admin-key">
              Admin key
            </label>
            <input
              id="admin-key"
              type="password"
              className="input"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste the admin key"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!keyInput.trim()}>
            Unlock
          </button>
        </form>
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}

      {activeKey && (
        <>
          <div className="flex items-center gap-2">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  period === p ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
            <div className="flex-1" />
            <button type="button" className="btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {loading && <div className="text-sm text-ink-400">Loading…</div>}

          {summary && (
            <>
              <div className="card">
                <h2 className="section-header">Top 5 Users</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-400 uppercase text-xs">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Organization</th>
                      <th className="pb-2 text-right">Tool opens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topUsers.map((u) => (
                      <tr key={u.email} className="border-t border-ink-100">
                        <td className="py-2">{u.displayName ?? '—'}</td>
                        <td className="py-2">{u.email}</td>
                        <td className="py-2">{u.organization ?? '—'}</td>
                        <td className="py-2 text-right font-semibold">{u.count}</td>
                      </tr>
                    ))}
                    {summary.topUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-ink-400">
                          No activity yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2 className="section-header">Tool Usage ({period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'})</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-400 uppercase text-xs">
                      <th className="pb-2">Period</th>
                      <th className="pb-2">Tool</th>
                      <th className="pb-2 text-right">Unique users</th>
                      <th className="pb-2 text-right">Opens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.toolCounts.map((row) => (
                      <tr key={`${row.bucket}-${row.tool}`} className="border-t border-ink-100">
                        <td className="py-2">{row.bucket}</td>
                        <td className="py-2">{TOOL_LABELS[row.tool] ?? row.tool}</td>
                        <td className="py-2 text-right">{row.uniqueUsers}</td>
                        <td className="py-2 text-right">{row.opens}</td>
                      </tr>
                    ))}
                    {summary.toolCounts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-ink-400">
                          No activity yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
