import { apiRequest } from './client'
import type { AuthUser, ChangePasswordPayload, LoginPayload, RegisterPayload, StaffUser } from '../types/auth'

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

export function registerReviewer(payload: RegisterPayload): Promise<AuthUser> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listStaff(): Promise<{ items: StaffUser[] }> {
  return apiRequest('/auth/staff')
}

export function archiveStaff(staffId: string): Promise<StaffUser> {
  return apiRequest(`/auth/staff/${staffId}/archive`, { method: 'PATCH' })
}

export function unarchiveStaff(staffId: string): Promise<StaffUser> {
  return apiRequest(`/auth/staff/${staffId}/unarchive`, { method: 'PATCH' })
}

export function deleteStaff(staffId: string): Promise<StaffUser> {
  return apiRequest(`/auth/staff/${staffId}`, { method: 'DELETE' })
}
