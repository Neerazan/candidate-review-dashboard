import { useEffect, useState } from 'react'
import { ClearIcon, SaveIcon } from './Icons'

interface InternalNotesPanelProps {
  value: string | null
  onSave: (next: string) => Promise<void>
  onDelete: () => Promise<void>
  compact?: boolean
  canClear?: boolean
}

export function InternalNotesPanel({ value, onSave, onDelete, compact = false, canClear = false }: InternalNotesPanelProps) {
  const [notes, setNotes] = useState(value ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setNotes(value ?? '')
  }, [value])

  async function handleSave() {
    setLoading(true)
    try {
      await onSave(notes)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await onDelete()
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={compact ? '' : 'card border-ng-red/30 p-4'}>
      {!compact ? <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ng-red">Internal Notes (Admin only)</h3> : null}
      <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={loading || !notes.trim()}>
          <span className="inline-flex items-center gap-2"><SaveIcon className="h-4 w-4" />Save Notes</span>
        </button>
        <button type="button" className="btn-danger" onClick={() => void handleDelete()} disabled={loading || !canClear}>
          <span className="inline-flex items-center gap-2"><ClearIcon className="h-4 w-4" />Clear Notes</span>
        </button>
      </div>
    </section>
  )
}
