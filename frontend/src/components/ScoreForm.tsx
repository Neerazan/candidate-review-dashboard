import { useState } from 'react'
import type { ScoreCategory, ScoreCreatePayload } from '../types/score'

interface ScoreFormProps {
  onSubmit: (payload: ScoreCreatePayload) => Promise<void>
  disabled?: boolean
}

const categoryOptions: { value: ScoreCategory; label: string }[] = [
  { value: 'technical_skills', label: 'Technical Skills' },
  { value: 'problem_solving', label: 'Problem Solving' },
  { value: 'communication', label: 'Communication' },
  { value: 'experience', label: 'Experience' },
  { value: 'culture_fit', label: 'Culture Fit' },
]

export function ScoreForm({ onSubmit, disabled }: ScoreFormProps) {
  const [category, setCategory] = useState<ScoreCategory>('technical_skills')
  const [score, setScore] = useState(3)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({ category, score, note: note || null })
      setScore(3)
      setCategory('technical_skills')
      setNote('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card p-4" onSubmit={handleSubmit}>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ng-ghost">Add a score</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <select className="input" value={score} onChange={(e) => setScore(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="label">Note</label>
        <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary mt-4 w-full" disabled={disabled || loading}>
        {loading ? 'Saving...' : 'Submit Score'}
      </button>
    </form>
  )
}
