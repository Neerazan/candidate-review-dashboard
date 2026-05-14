import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Navbar } from '../components/Navbar'
import { SaveIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'

export function ChangePasswordPage() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
          <LoadingState label="Loading account settings..." variant="inline" />
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      const message = 'New password and confirmation do not match'
      setError(message)
      toast.error(message)
      return
    }

    setSaving(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      await refreshUser()
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      navigate('/candidates', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          {!user.force_password_change ? (
            <Link to="/candidates" className="text-sm font-semibold text-ng-blue hover:text-ng-blue-dark">
              ← Back to Candidates
            </Link>
          ) : <span />}
        </div>

        <section className="card p-5">
          <h1 className="text-xl font-extrabold text-ng-ink">Change Password</h1>
          <p className="mb-4 mt-1 text-sm text-ng-muted">Use a strong password with at least 8 characters.</p>

          {user.force_password_change ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Temporary password detected. You must change your password before you can access the app.
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="label">Current Password</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error ? <ErrorState message={error} /> : null}

            <Button type="submit" variant="primary" disabled={saving} leftIcon={<SaveIcon className="h-4 w-4" />}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
