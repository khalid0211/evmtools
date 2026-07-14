import { useId, useState } from 'react'
import type { StatusSnapshot } from '../../types/portfolio'

interface Props {
  history: StatusSnapshot[]
  selectedDate: string | null
  onSelect: (dataDate: string) => void
  onAdd: (dataDate: string) => void
  onChangeDate: (from: string, to: string) => void
  onDelete: (dataDate: string) => void
}

export default function SnapshotBar({
  history,
  selectedDate,
  onSelect,
  onAdd,
  onChangeDate,
  onDelete,
}: Props) {
  const [newDate, setNewDate] = useState('')
  const selectId = useId()
  const addId = useId()
  const moveId = useId()

  return (
    <div className="flex flex-wrap items-end gap-4">
      {history.length > 0 && (
        <div>
          <label className="field-label" htmlFor={selectId}>
            Data date
          </label>
          <select
            id={selectId}
            className="input !w-auto"
            value={selectedDate ?? ''}
            onChange={(e) => onSelect(e.target.value)}
          >
            {history.map((s) => (
              <option key={s.dataDate} value={s.dataDate}>
                {s.dataDate}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div>
          <label className="field-label" htmlFor={addId}>
            New data date
          </label>
          <input
            id={addId}
            type="date"
            className="input !w-auto"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!newDate || history.some((s) => s.dataDate === newDate)}
          onClick={() => {
            onAdd(newDate)
            setNewDate('')
          }}
        >
          ＋ Add
        </button>
      </div>
      {selectedDate && (
        <>
          <div className="flex items-end gap-2">
            <div>
              <label className="field-label" htmlFor={moveId}>
                Move selected date to
              </label>
              <input
                id={moveId}
                type="date"
                className="input !w-auto"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onChangeDate(selectedDate, e.target.value)
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn bg-danger hover:brightness-110"
            onClick={() => {
              if (window.confirm(`Delete the status update dated ${selectedDate}?`)) {
                onDelete(selectedDate)
              }
            }}
          >
            Delete update
          </button>
        </>
      )}
    </div>
  )
}
