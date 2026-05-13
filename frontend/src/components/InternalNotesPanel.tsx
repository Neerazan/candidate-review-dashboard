import { useEffect, useState } from 'react'

interface InternalNotesPanelProps {
  value: string | null
  onSave: (next: string) => Promise<void>
  onDelete: () => Promise<void>
}

export function InternalNotesPanel({ value, onSave, onDelete }: InternalNotesPanelProps) {
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
    <section className="card border-ng-red/30 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ng-red">Internal Notes (Admin only)</h3>
      <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={loading || !notes.trim()}>
          Save Notes
        </button>
        <button type="button" className="btn-danger" onClick={() => void handleDelete()} disabled={loading}>
          Clear Notes
        </button>
      </div>
    </section>
  )
}
