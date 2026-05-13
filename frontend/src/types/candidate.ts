import type { AdminScore, Score } from './score'

export interface CandidateListItem {
  id: string
  name: string
  email: string
  role_applied: string
  status: string
  skills: string[]
  created_at: string
}

export interface CandidateListResponse {
  items: CandidateListItem[]
  total: number
  page: number
  page_size: number
}

export interface CandidateDetail {
  id: string
  name: string
  email: string
  role_applied: string
  status: string
  skills: string[]
  experience_summary: string | null
  resume_url: string | null
  ai_summary: string | null
  created_at: string
  updated_at: string
  scores: Score[]
}

export interface CandidateDetailAdmin extends Omit<CandidateDetail, 'scores'> {
  internal_notes: string | null
  scores: AdminScore[]
}

export interface CandidateFilters {
  status: string
  role_applied: string
  skill: string
  keyword: string
  page: number
  page_size: number
}

export interface InternalNotesResponse {
  candidate_id: string
  internal_notes: string | null
}
