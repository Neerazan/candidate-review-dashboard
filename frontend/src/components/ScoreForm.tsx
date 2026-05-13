import { useEffect, useState } from 'react'
import type { ScoreCategory, ScoreCreatePayload } from '../types/score'

interface ScoreFormProps {
  onSubmit: (payload: ScoreCreatePayload) => Promise<void>
  disabled?: boolean
  initialValue?: ScoreCreatePayload | null
  mode?: 'create' | 'update'
  onCancelEdit?: () => void
}

const categoryOptions: { value: ScoreCategory; label: string }[] = [
  { value: 'technical_skills', label: 'Technical Skills' },
  { value: 'problem_solving', label: 'Problem Solving' },
  { value: 'communication', label: 'Communication' },
  { value: 'experience', label: 'Experience' },
  { value: 'culture_fit', label: 'Culture Fit' },
]

export function ScoreForm({ onSubmit, disabled, initialValue, mode = 'create', onCancelEdit }: ScoreFormProps) {
  const [category, setCategory] = useState<ScoreCategory>(initialValue?.category ?? 'technical_skills')
  const [score, setScore] = useState(initialValue?.score ?? 3)
  const [note, setNote] = useState(initialValue?.note ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCategory(initialValue?.category ?? 'technical_skills')
    setScore(initialValue?.score ?? 3)
    setNote(initialValue?.note ?? '')
  }, [initialValue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({ category, score, note: note || null })
      if (mode === 'create') {
        setScore(3)
        setCategory('technical_skills')
        setNote('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card p-4" onSubmit={handleSubmit}>
      <h3 className="mb-3 text-lg font-semibold text-ng-ink">{mode === 'update' ? 'Edit score' : 'Add a score'}</h3>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ScoreCategory)}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Score</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value === score
              return (
                <button
                  key={value}
                  type="button"
                  className={`h-10 w-10 rounded-lg border text-sm font-semibold ${
                    active
                      ? 'border-ng-blue bg-ng-blue-light text-ng-blue'
                      : 'border-ng-line bg-ng-white text-ng-muted hover:bg-ng-surface'
                  }`}
                  onClick={() => setScore(value)}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="label">Note</label>
        <textarea className="input min-h-24" placeholder="Add observations..." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn-primary w-full" disabled={disabled || loading}>
          {loading ? 'Saving...' : mode === 'update' ? 'Update Score' : 'Submit Score'}
        </button>
        {mode === 'update' && onCancelEdit ? (
          <button type="button" className="btn-secondary" onClick={onCancelEdit} disabled={loading}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
