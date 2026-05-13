export type UserRole = 'admin' | 'reviewer'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface LoginPayload {
  email: string
  password: string
}
