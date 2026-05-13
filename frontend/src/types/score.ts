export type ScoreCategory =
  | 'technical_skills'
  | 'problem_solving'
  | 'communication'
  | 'experience'
  | 'culture_fit'

export interface Score {
  id: string
  candidate_id: string
  reviewer_id: string
  category: ScoreCategory | string
  score: number
  note: string | null
  created_at: string
}

export interface AdminScore extends Score {
  reviewer_name: string
  reviewer_email: string
}

export interface ScoreCreatePayload {
  category: ScoreCategory
  score: number
  note: string | null
}

export interface ScoreUpdatePayload {
  score?: number
  note: string | null
}
