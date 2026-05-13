import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  archiveCandidate,
  createScore,
  deleteInternalNotes,
  deleteScore,
  generateSummary,
  getCandidate,
  getInternalNotes,
  updateInternalNotes,
  updateScore,
} from '../api/candidates'
import { ErrorState } from '../components/ErrorState'
import { InternalNotesPanel } from '../components/InternalNotesPanel'
import { LoadingState } from '../components/LoadingState'
import { Navbar } from '../components/Navbar'
import { ScoreForm } from '../components/ScoreForm'
import { ScoreTable } from '../components/ScoreTable'
import { StatusBadge } from '../components/StatusBadge'
import { SummaryCard } from '../components/SummaryCard'
import { useAuth } from '../context/AuthContext'
import type { CandidateDetail, CandidateDetailAdmin } from '../types/candidate'
import type { ScoreCreatePayload } from '../types/score'

function isAdminDetail(candidate: CandidateDetail | CandidateDetailAdmin): candidate is CandidateDetailAdmin {
  return 'internal_notes' in candidate
}

export function CandidateDetailPage() {
  const { candidateId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [candidate, setCandidate] = useState<CandidateDetail | CandidateDetailAdmin | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const canReviewerEditScores = useMemo(
    () => user?.role === 'reviewer' && candidate?.status !== 'archived',
    [user?.role, candidate?.status],
  )

  async function fetchCandidate() {
    if (!candidateId) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const detail = await getCandidate(candidateId)
      setCandidate(detail)
      if (isAdmin) {
        const notesResponse = await getInternalNotes(candidateId)
        setNotes(notesResponse.internal_notes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCandidate()
  }, [candidateId, isAdmin])

  async function handleCreateScore(payload: ScoreCreatePayload) {
    await createScore(candidateId, payload)
    await fetchCandidate()
  }

  async function handleUpdateScore(scoreId: string, nextScore: number, note: string | null) {
    await updateScore(candidateId, scoreId, { score: nextScore, note })
    await fetchCandidate()
  }

  async function handleDeleteScore(scoreId: string) {
    await deleteScore(candidateId, scoreId)
    await fetchCandidate()
  }

  async function handleGenerateSummary() {
    setSummaryLoading(true)
    try {
      await generateSummary(candidateId)
      await fetchCandidate()
    } finally {
      setSummaryLoading(false)
    }
  }

  async function handleSaveNotes(next: string) {
    const response = await updateInternalNotes(candidateId, next)
    setNotes(response.internal_notes)
    await fetchCandidate()
  }

  async function handleDeleteNotes() {
    await deleteInternalNotes(candidateId)
    setNotes(null)
    await fetchCandidate()
  }

  async function handleArchiveCandidate() {
    await archiveCandidate(candidateId)
    await fetchCandidate()
  }

  function renderStars(score: number) {
    return '★'.repeat(score) + '☆'.repeat(5 - score)
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/candidates" className="text-sm font-semibold text-ng-blue hover:text-ng-blue-dark">
            ← Back to Candidates
          </Link>
          <button type="button" className="btn-secondary" onClick={() => navigate('/candidates')}>
            Candidate List
          </button>
        </div>

        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState label="Loading candidate details..." /> : null}

        {!loading && candidate ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ng-blue-light text-lg font-bold text-ng-blue">
                      {candidate.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? '')
                        .join('')}
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold">{candidate.name}</h1>
                      <p className="text-sm text-ng-muted">{candidate.email}</p>
                      <p className="mt-2 text-sm text-ng-muted">Role: {candidate.role_applied}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={candidate.status} />
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => void handleArchiveCandidate()}
                        disabled={candidate.status === 'archived'}
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-ng-muted md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-ng-ink">Experience:</span>{' '}
                    {candidate.experience_summary ?? 'Not provided'}
                  </p>
                  <div className="md:pl-10">
                    <p className="text-sm font-semibold text-ng-ink">Applied</p>
                    <p className="text-sm text-ng-muted">
                      {new Date(candidate.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-ng-ink">Skills</p>
                  <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-ng-line bg-ng-surface px-2.5 py-1 text-xs text-ng-muted">
                      {skill}
                    </span>
                  ))}
                  </div>
                </div>
              </section>

              {user?.role === 'reviewer' ? (
                <section className="card p-5">
                  <h3 className="mb-3 text-lg font-semibold text-ng-ink">Your scores</h3>
                  {candidate.scores.length === 0 ? (
                    <p className="text-sm text-ng-muted">No scores submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {candidate.scores.map((score) => (
                        <div key={score.id} className="border-b border-ng-line pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ng-ink">{score.category.replaceAll('_', ' ')}</p>
                              <p className="mt-1 text-sm text-ng-muted">{score.note ?? 'No note added.'}</p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  className="btn-secondary px-2 py-1 text-xs"
                                  onClick={() => setEditingScoreId(score.id)}
                                >
                                  ✎ Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-danger px-2 py-1 text-xs"
                                  onClick={() => void handleDeleteScore(score.id)}
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </div>
                            <p className="text-lg text-ng-blue">{renderStars(score.score)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <ScoreTable
                  scores={candidate.scores}
                  canEdit={Boolean(canReviewerEditScores)}
                  onUpdate={handleUpdateScore}
                  onDelete={handleDeleteScore}
                />
              )}

              <SummaryCard
                summary={candidate.ai_summary}
                loading={summaryLoading}
                generatedAt={candidate.ai_summary ? candidate.updated_at : undefined}
                onGenerate={handleGenerateSummary}
              />
            </div>

            <div className="space-y-4">
              {canReviewerEditScores ? (
                <>
                  <div className="rounded-xl border border-ng-line bg-ng-blue-light p-3 text-sm text-ng-blue">
                    You can only see your own scores.
                  </div>
                  <ScoreForm
                    onSubmit={async (payload) => {
                      if (!editingScoreId) {
                        await handleCreateScore(payload)
                        return
                      }
                      await handleUpdateScore(editingScoreId, payload.score, payload.note)
                      setEditingScoreId(null)
                    }}
                    disabled={candidate.status === 'archived'}
                    mode={editingScoreId ? 'update' : 'create'}
                    initialValue={
                      editingScoreId
                        ? {
                            category:
                              (candidate.scores.find((score) => score.id === editingScoreId)?.category as ScoreCreatePayload['category']) ??
                              'technical_skills',
                            score: candidate.scores.find((score) => score.id === editingScoreId)?.score ?? 3,
                            note: candidate.scores.find((score) => score.id === editingScoreId)?.note ?? null,
                          }
                        : null
                    }
                    onCancelEdit={() => setEditingScoreId(null)}
                  />
                </>
              ) : null}

              {isAdmin && isAdminDetail(candidate) ? (
                <InternalNotesPanel
                  value={notes ?? candidate.internal_notes}
                  onSave={handleSaveNotes}
                  onDelete={handleDeleteNotes}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
