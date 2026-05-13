import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as loginRequest, logout as logoutRequest } from '../api/auth'
import type { AuthUser } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearSessionExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await refreshUser()
      setLoading(false)
    })()
  }, [refreshUser])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setSessionExpired(true)
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password })
    await refreshUser()
    setSessionExpired(false)
  }, [refreshUser])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    setSessionExpired(false)
  }, [])

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, refreshUser, clearSessionExpired }),
    [user, loading, sessionExpired, login, logout, refreshUser, clearSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
