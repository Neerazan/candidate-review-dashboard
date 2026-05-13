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
import { StatusBadge } from '../components/StatusBadge'
import { SummaryCard } from '../components/SummaryCard'
import { ArchiveIcon, EditIcon, ListIcon, SaveIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import type { CandidateDetail, CandidateDetailAdmin } from '../types/candidate'
import type { ScoreCreatePayload } from '../types/score'
import { formatLongDate } from '../utils/date'

function isAdminDetail(candidate: CandidateDetail | CandidateDetailAdmin): candidate is CandidateDetailAdmin {
  return 'internal_notes' in candidate
}

export function CandidateDetailPage() {
  const { candidateId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const [candidate, setCandidate] = useState<CandidateDetail | CandidateDetailAdmin | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState('')

  const isAdmin = user?.role === 'admin'
  const reviewerStatusLocked = ['archived', 'hired', 'rejected'].includes(candidate?.status ?? '')

  const canReviewerEditScores = useMemo(
    () => user?.role === 'reviewer' && !reviewerStatusLocked,
    [user?.role, reviewerStatusLocked],
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

  useEffect(() => {
    if (candidate) {
      setStatusDraft(candidate.status)
    }
  }, [candidate])

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
    const approved = await confirm({
      title: 'Clear internal notes?',
      description: 'This will remove the internal notes for this candidate.',
      confirmText: 'Clear Notes',
      tone: 'danger',
    })
    if (!approved) {
      return
    }
    await deleteInternalNotes(candidateId)
    setNotes(null)
    await fetchCandidate()
  }

  async function handleArchiveCandidate(skipConfirm = false) {
    if (!skipConfirm) {
      const approved = await confirm({
        title: 'Archive candidate?',
        description: 'The candidate will move to archived status and reviewer actions will be locked.',
        confirmText: 'Archive',
        tone: 'danger',
      })
      if (!approved) {
        return
      }
    }
    await archiveCandidate(candidateId)
    await fetchCandidate()
  }

  async function handleSaveStatus() {
    if (!candidate) {
      return
    }
    if (statusDraft === candidate.status) {
      return
    }

    const approved = await confirm({
      title: 'Update candidate status?',
      description: `Change status from ${candidate.status} to ${statusDraft}?`,
      confirmText: 'Save Status',
    })
    if (!approved) {
      return
    }

    if (statusDraft === 'archived') {
      await handleArchiveCandidate(true)
      return
    }
    setError('Status update is currently limited to archive only.')
  }

  function renderStars(score: number) {
    return '★'.repeat(score) + '☆'.repeat(5 - score)
  }

  const adminReviewerGroups = useMemo(() => {
    if (!isAdmin || !candidate) {
      return []
    }
    const map = new Map<
      string,
      {
        reviewerName: string
        reviewerEmail: string
        items: Array<{ category: string; note: string | null; score: number; created_at: string }>
      }
    >()

    candidate.scores.forEach((score) => {
      const adminScore = score as CandidateDetailAdmin['scores'][number]
      const key = adminScore.reviewer_id
      if (!map.has(key)) {
        map.set(key, {
          reviewerName: adminScore.reviewer_name,
          reviewerEmail: adminScore.reviewer_email,
          items: [],
        })
      }
      map.get(key)?.items.push({
        category: adminScore.category,
        note: adminScore.note,
        score: adminScore.score,
        created_at: adminScore.created_at,
      })
    })
    return Array.from(map.values())
  }, [candidate, isAdmin])

  const adminAverages = useMemo(() => {
    if (!isAdmin || !candidate || candidate.scores.length === 0) {
      return []
    }
    const aggregate: Record<string, { total: number; count: number }> = {}
    candidate.scores.forEach((item) => {
      const key = item.category
      if (!aggregate[key]) {
        aggregate[key] = { total: 0, count: 0 }
      }
      aggregate[key].total += item.score
      aggregate[key].count += 1
    })
    return Object.entries(aggregate).map(([category, value]) => ({
      category,
      avg: Number((value.total / value.count).toFixed(1)),
    }))
  }, [candidate, isAdmin])

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/candidates" className="text-sm font-semibold text-ng-blue hover:text-ng-blue-dark">
            ← Back to Candidates
          </Link>
          <button type="button" className="btn-secondary" onClick={() => navigate('/candidates')}>
            <span className="inline-flex items-center gap-2"><ListIcon className="h-4 w-4" />Candidate List</span>
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
                        <span className="inline-flex items-center gap-2"><ArchiveIcon className="h-4 w-4" />Archive</span>
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
                    <p className="text-sm text-ng-muted">{formatLongDate(candidate.created_at)}</p>
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
                                  disabled={!canReviewerEditScores}
                                  onClick={() => setEditingScoreId(score.id)}
                                >
                                  <span className="inline-flex items-center gap-1"><EditIcon className="h-3.5 w-3.5" />Edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn-danger px-2 py-1 text-xs"
                                  disabled={!canReviewerEditScores}
                                  onClick={() => void handleDeleteScore(score.id)}
                                >
                                  <span className="inline-flex items-center gap-1"><ArchiveIcon className="h-3.5 w-3.5" />Delete</span>
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
                <section className="card p-5">
                  <h3 className="mb-3 text-lg font-semibold text-ng-ink">All reviewer scores</h3>
                  {adminReviewerGroups.length === 0 ? (
                    <p className="text-sm text-ng-muted">No reviewer scores yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {adminReviewerGroups.map((group, index) => (
                        <div key={`${group.reviewerEmail}-${index}`} className="border-b border-ng-line pb-4 last:border-b-0 last:pb-0">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ng-blue-light text-xs font-bold text-ng-blue">
                                {group.reviewerName
                                  .split(' ')
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() ?? '')
                                  .join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-ng-ink">{group.reviewerName}</p>
                                <p className="text-xs text-ng-muted">{group.reviewerEmail}</p>
                              </div>
                            </div>
                            <p className="text-xs text-ng-muted">
                              {new Date(group.items[0]?.created_at ?? candidate.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="mb-3 h-px w-full bg-ng-line" />
                          <div className="space-y-2">
                            {group.items.map((item, itemIndex) => (
                              <div
                                key={`${item.category}-${itemIndex}`}
                                className={`rounded-lg px-2 py-1.5 ${itemIndex % 2 === 1 ? 'bg-ng-line/45' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium text-ng-ink">{item.category.replaceAll('_', ' ')}</p>
                                  <p className="text-xl leading-none text-ng-blue">{renderStars(item.score)}</p>
                                </div>
                                {item.note ? <p className="text-sm italic text-ng-muted">{item.note}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {adminAverages.length > 0 ? (
                        <div className="rounded-xl border border-ng-line bg-ng-surface p-3">
                          <p className="mb-2 text-sm font-semibold text-ng-ink">Score averages</p>
                          <div className="space-y-2">
                            {adminAverages.map((item) => (
                              <div key={item.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
                                <div>
                                  <p className="mb-1 text-xs text-ng-muted">{item.category.replaceAll('_', ' ')}</p>
                                  <div className="h-2 rounded-full bg-ng-line">
                                    <div className="h-2 rounded-full bg-ng-blue" style={{ width: `${(item.avg / 5) * 100}%` }} />
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-ng-ink">{item.avg.toFixed(1)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              )}

              <SummaryCard
                summary={candidate.ai_summary}
                loading={summaryLoading}
                generatedAt={candidate.ai_summary ? candidate.updated_at : undefined}
                disabled={user?.role === 'reviewer' && reviewerStatusLocked}
                onGenerate={handleGenerateSummary}
              />
            </div>

            <div className="space-y-4">
              {user?.role === 'reviewer' ? (
                <>
                  <div className="rounded-xl border border-ng-line bg-ng-blue-light p-3 text-sm text-ng-blue">
                    {canReviewerEditScores
                      ? 'You can only see your own scores.'
                      : `Scoring is disabled when candidate status is ${candidate.status}.`}
                  </div>
                  <ScoreForm
                    onSubmit={async (payload) => {
                      if (!canReviewerEditScores) {
                        return
                      }
                      if (!editingScoreId) {
                        await handleCreateScore(payload)
                        return
                      }
                      await handleUpdateScore(editingScoreId, payload.score, payload.note)
                      setEditingScoreId(null)
                    }}
                    disabled={!canReviewerEditScores}
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

              {isAdmin ? (
                <section className="card p-4">
                  <p className="mb-2 inline-flex rounded-full bg-ng-blue-light px-3 py-1 text-xs font-semibold text-ng-blue">Admin view</p>
                  <p className="mb-1 text-sm font-semibold text-ng-ink">Candidate status</p>
                  <select className="input" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                    <option value="new">new</option>
                    <option value="reviewed">reviewed</option>
                    <option value="hired">hired</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                  <button type="button" className="btn-secondary mt-3 w-full" onClick={() => void handleSaveStatus()}>
                    <span className="inline-flex items-center gap-2"><SaveIcon className="h-4 w-4" />Save status</span>
                  </button>
                </section>
              ) : null}

              {isAdmin && isAdminDetail(candidate) ? (
                <section className="card border-ng-red/30 p-4">
                  <p className="mb-3 text-sm font-semibold text-ng-red">Internal notes (Admin only)</p>
                  <InternalNotesPanel
                    value={notes ?? candidate.internal_notes}
                    onSave={handleSaveNotes}
                    onDelete={handleDeleteNotes}
                    compact
                    canClear={Boolean((notes ?? candidate.internal_notes)?.trim())}
                  />
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
