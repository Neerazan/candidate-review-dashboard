export type UserRole = 'admin' | 'reviewer'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  deleted_at: string | null
  created_at: string
}
