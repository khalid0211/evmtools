import { useRef } from 'react'
import ToggleGroup from '../layout/ToggleGroup'
import type { WbsSettings, WbsViewMode } from '../../types/wbs'

interface Props {
  settings: WbsSettings
  onUpdateSettings: (patch: Partial<WbsSettings>) => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onExportCsv: () => void
  onExportMermaid: () => void
  onReset: () => void
  importErrors: string[]
}

export default function WbsToolbar({
  settings,
  onUpdateSettings,
  onExportJson,
  onImportJson,
  onExportCsv,
  onExportMermaid,
  onReset,
  importErrors,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <ToggleGroup<WbsViewMode>
            value={settings.viewMode}
            label="View mode"
            options={[
              { value: 'Chart', label: '🗂️ Chart' },
              { value: 'Outline', label: '☰ Outline' },
            ]}
            onChange={(v) => onUpdateSettings({ viewMode: v })}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={settings.advanced}
              onChange={(e) => onUpdateSettings({ advanced: e.target.checked })}
            />
            Advanced (3-point)
          </label>
          <label
            className={`flex items-center gap-2 text-sm font-semibold ${
              settings.advanced ? 'text-ink-700' : 'text-ink-400'
            }`}
            title="Roll up PERT estimates instead of most-likely budgets"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              disabled={!settings.advanced}
              checked={settings.advanced && settings.usePert}
              onChange={(e) => onUpdateSettings({ usePert: e.target.checked })}
            />
            PERT roll-up
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={onExportJson}>
            Export JSON
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportJson(file)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn-secondary" onClick={onExportCsv}>
            Export CSV
          </button>
          <button
            type="button"
            className="btn-secondary"
            title="Mermaid flowchart for draw.io: Insert → Advanced → Mermaid"
            onClick={onExportMermaid}
          >
            Export Mermaid
          </button>
          <button
            type="button"
            className="btn bg-danger hover:brightness-110"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </div>
      {importErrors.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <strong>Import failed:</strong>
          <ul className="mt-1 list-disc pl-4">
            {importErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
