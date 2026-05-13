import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate } from 'react-router-dom'
import { registerReviewer } from '../api/auth'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { Navbar } from '../components/Navbar'
import { SaveIcon, StaffIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'

export function AddStaffPage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password123')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (user?.role !== 'admin') {
    return <Navigate to="/candidates" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const created = await registerReviewer({ name, email, password })
      setSuccess(`Reviewer account created for ${created.email}`)
      toast.success(`Reviewer created: ${created.email}`)
      setName('')
      setEmail('')
      setPassword('password123')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create staff reviewer'
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
          <Link to="/candidates" className="text-sm font-semibold text-ng-blue hover:text-ng-blue-dark">
            ← Back to Candidates
          </Link>
        </div>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <StaffIcon className="h-5 w-5 text-ng-blue" />
            <h1 className="text-xl font-extrabold text-ng-ink">Add Staff Reviewer</h1>
          </div>
          <p className="mb-4 text-sm text-ng-muted">Create a reviewer account. Role is set by backend policy and cannot be admin.</p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={100} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error ? <ErrorState message={error} /> : null}
            {success ? <p className="text-sm font-medium text-ng-blue">{success}</p> : null}

            <div className="pt-1">
              <Button type="submit" variant="primary" disabled={saving} leftIcon={<SaveIcon className="h-4 w-4" />}>
                {saving ? 'Creating...' : 'Create Reviewer'}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
