import { useId, useRef } from 'react'

interface Props {
  name: string
  onSetName: (name: string) => void
  onNew: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  importErrors: string[]
}

export default function PortfolioToolbar({
  name,
  onSetName,
  onNew,
  onExportJson,
  onImportJson,
  importErrors,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const nameId = useId()

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-64 flex-1 sm:max-w-sm">
          <label className="field-label" htmlFor={nameId}>
            Portfolio name
          </label>
          <input
            id={nameId}
            type="text"
            className="input"
            value={name}
            placeholder="My Portfolio"
            onChange={(e) => onSetName(e.target.value)}
          />
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
          <button type="button" className="btn bg-danger hover:brightness-110" onClick={onNew}>
            New Portfolio
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
