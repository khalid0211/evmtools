import { useState, type ReactNode } from 'react'

const STORAGE_KEY = 'pmtools.expanders.v1'

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>
    }
  } catch {
    // storage unavailable or corrupt — fall back to defaults
  }
  return {}
}

function writeMap(key: string, open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readMap(), [key]: open }))
  } catch {
    // storage unavailable — state stays session-only
  }
}

interface Props {
  /** Stable id, e.g. 'portfolio.gantt'; the open/closed choice is remembered per browser. */
  storageKey: string
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Collapsible card section. Children are unmounted while closed, so hidden
 * Plotly charts cost nothing.
 */
export default function Expander({ storageKey, title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState<boolean>(() => readMap()[storageKey] ?? defaultOpen)

  const toggle = () => {
    setOpen((prev) => {
      writeMap(storageKey, !prev)
      return !prev
    })
  }

  return (
    <div className="card">
      <button
        type="button"
        className={`section-header flex w-full items-center justify-between text-left ${open ? '' : '!mb-0 !border-b-0 !pb-0'}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <span>{title}</span>
        <span className="text-xs text-ink-400" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && children}
    </div>
  )
}
