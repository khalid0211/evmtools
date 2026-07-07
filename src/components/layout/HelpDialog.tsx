import { useEffect, useId } from 'react'
import type { HelpContent } from '../../lib/help/content'

interface Props {
  open: boolean
  content: HelpContent
  onClose: () => void
}

export default function HelpDialog({ open, content, onClose }: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ink-100 bg-white shadow-card-lg">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-ink-900">
            ❓ {content.title}
          </h2>
          <button
            type="button"
            aria-label="Close help"
            className="rounded-md px-2 py-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-4">
          <p className="text-sm text-ink-500">{content.intro}</p>
          {content.sections.map((section) => (
            <div key={section.heading}>
              <div className="subsection-title">{section.heading}</div>
              {section.intro && <p className="mb-2 text-sm text-ink-500">{section.intro}</p>}
              {section.items && (
                <dl className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.term}>
                      <dt className="text-sm font-semibold text-ink-700">{item.term}</dt>
                      <dd className="ml-0 text-sm text-ink-500">{item.desc}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-ink-100 px-6 py-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
