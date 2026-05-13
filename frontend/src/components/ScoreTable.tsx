import { useState } from 'react'
import type { AdminScore, Score } from '../types/score'
import { Button } from './Button'

interface ScoreTableProps {
  scores: Score[] | AdminScore[]
  canEdit: boolean
  onUpdate: (scoreId: string, nextScore: number, note: string | null) => Promise<void>
  onDelete: (scoreId: string) => Promise<void>
}

function isAdminScore(score: Score | AdminScore): score is AdminScore {
  return 'reviewer_email' in score
}

export function ScoreTable({ scores, canEdit, onUpdate, onDelete }: ScoreTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  if (scores.length === 0) {
    return <div className="card p-4 text-sm text-ng-muted">No scores submitted yet.</div>
  }

  async function handleQuickAdjust(score: Score | AdminScore, delta: number) {
    const nextScore = Math.min(5, Math.max(1, score.score + delta))
    if (nextScore === score.score) {
      return
    }
    setBusyId(score.id)
    try {
      await onUpdate(score.id, nextScore, score.note)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(scoreId: string) {
    setBusyId(scoreId)
    try {
      await onDelete(scoreId)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-ng-line text-sm">
        <thead className="bg-ng-surface text-left text-ng-muted">
          <tr>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Note</th>
            <th className="px-4 py-3">Reviewer</th>
            {canEdit ? <th className="px-4 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-ng-line">
          {scores.map((score) => (
            <tr key={score.id}>
              <td className="px-4 py-3 font-medium text-ng-ink">{score.category}</td>
              <td className="px-4 py-3 text-ng-muted">{score.score}/5</td>
              <td className="px-4 py-3 text-ng-muted">{score.note ?? '—'}</td>
              <td className="px-4 py-3 text-ng-muted">
                {isAdminScore(score) ? `${score.reviewer_name} (${score.reviewer_email})` : 'You'}
              </td>
              {canEdit ? (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busyId === score.id}
                      onClick={() => void handleQuickAdjust(score, 1)}
                    >
                      +1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busyId === score.id}
                      onClick={() => void handleQuickAdjust(score, -1)}
                    >
                      -1
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={busyId === score.id}
                      onClick={() => void handleDelete(score.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
