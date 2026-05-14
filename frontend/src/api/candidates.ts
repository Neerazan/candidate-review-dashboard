import { API_BASE_URL, apiRequest } from './client'
import type {
  CandidateDetail,
  CandidateDetailAdmin,
  CandidateFilters,
  CandidateListResponse,
  InternalNotesResponse,
} from '../types/candidate'
import type { Score, ScoreCreatePayload, ScoreUpdatePayload } from '../types/score'

export function listCandidates(filters: CandidateFilters): Promise<CandidateListResponse> {
  return apiRequest('/candidates', {
    query: {
      status: filters.status,
      role_applied: filters.role_applied,
      skill: filters.skill,
      keyword: filters.keyword,
      page: filters.page,
      page_size: filters.page_size,
    },
  })
}

export function getCandidateStats(): Promise<{ total: number; new: number; reviewed: number; hired: number; rejected: number }> {
  return apiRequest('/candidates/stats')
}

export function getCandidate(candidateId: string): Promise<CandidateDetail | CandidateDetailAdmin> {
  return apiRequest(`/candidates/${candidateId}`)
}

export function createScore(candidateId: string, payload: ScoreCreatePayload): Promise<Score> {
  return apiRequest(`/candidates/${candidateId}/scores`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateScore(
  candidateId: string,
  scoreId: string,
  payload: ScoreUpdatePayload,
): Promise<Score> {
  return apiRequest(`/candidates/${candidateId}/scores/${scoreId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteScore(candidateId: string, scoreId: string): Promise<void> {
  return apiRequest(`/candidates/${candidateId}/scores/${scoreId}`, { method: 'DELETE' })
}

export function generateSummary(candidateId: string): Promise<{ candidate_id: string; ai_summary: string }> {
  return apiRequest(`/candidates/${candidateId}/summary`, { method: 'POST' })
}

export function getInternalNotes(candidateId: string): Promise<InternalNotesResponse> {
  return apiRequest(`/candidates/${candidateId}/internal-notes`)
}

export function updateInternalNotes(
  candidateId: string,
  internalNotes: string,
): Promise<InternalNotesResponse> {
  return apiRequest(`/candidates/${candidateId}/internal-notes`, {
    method: 'PUT',
    body: JSON.stringify({ internal_notes: internalNotes }),
  })
}

export function deleteInternalNotes(candidateId: string): Promise<InternalNotesResponse> {
  return apiRequest(`/candidates/${candidateId}/internal-notes`, { method: 'DELETE' })
}

export function archiveCandidate(candidateId: string): Promise<{ candidate_id: string; status: string }> {
  return apiRequest(`/candidates/${candidateId}`, { method: 'DELETE' })
}

export function updateCandidateStatus(
  candidateId: string,
  status: 'new' | 'reviewed' | 'hired' | 'rejected' | 'archived',
): Promise<{ candidate_id: string; status: string }> {
  return apiRequest(`/candidates/${candidateId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export interface CandidateScoreStreamEvent {
  candidate_id: string
  action: 'created' | 'updated' | 'deleted' | string
  score_id: string
  updated_at: string
}

interface StreamCallbacks {
  onScoreUpdated: (payload: CandidateScoreStreamEvent) => void
  onOpen?: () => void
  onError?: () => void
}

export function streamCandidateEvents(candidateId: string, callbacks: StreamCallbacks): EventSource {
  const streamUrl = new URL(`/candidates/${candidateId}/stream`, API_BASE_URL)
  const source = new EventSource(streamUrl.toString(), { withCredentials: true })

  source.addEventListener('score_updated', (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent<string>).data) as CandidateScoreStreamEvent
      callbacks.onScoreUpdated(payload)
    } catch {
      // Ignore malformed event payloads.
    }
  })

  source.onopen = () => {
    callbacks.onOpen?.()
  }

  source.onerror = () => {
    callbacks.onError?.()
  }

  return source
}
