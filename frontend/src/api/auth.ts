import { apiRequest } from './client'
import type { AuthUser, LoginPayload } from '../types/auth'

export function login(payload: LoginPayload): Promise<{ access_token: string; token_type: string }> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST' })
}

export function getMe(): Promise<AuthUser> {
  return apiRequest('/auth/me')
}
