import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './LoadingState'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Checking session..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.force_password_change && location.pathname !== '/account/password') {
    return <Navigate to="/account/password" replace />
  }

  return <Outlet />
}
