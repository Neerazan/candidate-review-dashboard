import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, login, sessionExpired, clearSessionExpired } = useAuth()
  const [email, setEmail] = useState('admin@techkraft.local')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Navigate to="/candidates" replace />
  }

  useEffect(() => {
    if (sessionExpired) {
      toast('Your session expired. Please sign in again.', { icon: '⚠️' })
    }
    return () => {
      if (sessionExpired) {
        clearSessionExpired()
      }
    }
  }, [clearSessionExpired, sessionExpired])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/candidates')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <form className="card w-full p-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-extrabold">Candidate Review Dashboard</h1>
        <p className="mt-1 text-sm text-ng-ghost">Sign in to continue</p>
        {sessionExpired ? (
          <div className="mt-3 rounded-lg border border-ng-line bg-ng-surface px-3 py-2 text-sm text-ng-muted">
            Your session expired. Please sign in again.
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}
        <Button type="submit" variant="primary" fullWidth className="mt-4" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </main>
  )
}
