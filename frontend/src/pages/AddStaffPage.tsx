import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate } from 'react-router-dom'
import { archiveStaff, deleteStaff, listStaff, registerReviewer, unarchiveStaff } from '../api/auth'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { Navbar } from '../components/Navbar'
import { ArchiveIcon, ClearIcon, SaveIcon, StaffIcon, UnarchiveIcon } from '../components/Icons'
import { LoadingState } from '../components/LoadingState'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import type { StaffUser } from '../types/auth'
import { formatLongDate } from '../utils/date'

export function AddStaffPage() {
  const { user } = useAuth()
  const { confirm } = useConfirm()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password123')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  if (user?.role !== 'admin') {
    return <Navigate to="/candidates" replace />
  }

  async function fetchStaff() {
    setLoadingStaff(true)
    try {
      const response = await listStaff()
      setStaff(response.items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff list')
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    void fetchStaff()
  }, [])

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
      await fetchStaff()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create staff reviewer'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(staffItem: StaffUser) {
    const approved = await confirm({
      title: 'Archive this reviewer?',
      description: `${staffItem.name} will be deactivated and cannot log in.`,
      confirmText: 'Archive Reviewer',
      tone: 'danger',
    })
    if (!approved) {
      return
    }
    try {
      await archiveStaff(staffItem.id)
      toast.success(`Archived ${staffItem.name}`)
      await fetchStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive staff')
    }
  }

  async function handleDelete(staffItem: StaffUser) {
    const approved = await confirm({
      title: 'Delete this reviewer?',
      description: `${staffItem.name} will be soft-deleted and their reviews hidden.`,
      confirmText: 'Delete Reviewer',
      tone: 'danger',
    })
    if (!approved) {
      return
    }
    try {
      await deleteStaff(staffItem.id)
      toast.success(`Deleted ${staffItem.name}`)
      await fetchStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete staff')
    }
  }

  async function handleUnarchive(staffItem: StaffUser) {
    const approved = await confirm({
      title: 'Unarchive this reviewer?',
      description: `${staffItem.name} will be reactivated and can log in again.`,
      confirmText: 'Unarchive Reviewer',
    })
    if (!approved) {
      return
    }

    try {
      await unarchiveStaff(staffItem.id)
      toast.success(`Unarchived ${staffItem.name}`)
      await fetchStaff()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unarchive staff')
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/candidates" className="text-sm font-semibold text-ng-blue hover:text-ng-blue-dark">
            ← Back to Candidates
          </Link>
        </div>

        <section className="card mx-auto w-full max-w-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <StaffIcon className="h-5 w-5 text-ng-blue" />
            <h1 className="text-xl font-extrabold text-ng-ink">Manage Staff</h1>
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

        <section className="card mx-auto w-full max-w-4xl p-5">
          <h2 className="text-lg font-bold text-ng-ink">Reviewer Accounts</h2>
          <p className="mb-3 mt-1 text-sm text-ng-muted">Archive disables login. Delete performs soft delete and hides reviews.</p>
          {loadingStaff ? (
            <div className="space-y-2">
              <LoadingState label="Loading reviewer accounts..." variant="inline" />
              <div className="card p-3">
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="h-10 animate-pulse rounded-md bg-ng-line/60" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ng-line text-left text-xs uppercase tracking-wide text-ng-muted">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((item) => (
                    <tr key={item.id} className="border-b border-ng-line/70">
                      <td className="px-3 py-3 font-medium text-ng-ink">{item.name}</td>
                      <td className="px-3 py-3 text-ng-muted">{item.email}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${item.deleted_at ? 'bg-ng-red-light text-ng-red' : item.active ? 'bg-ng-blue-light text-ng-blue' : 'bg-ng-surface text-ng-muted'}`}>
                          {item.deleted_at ? 'deleted' : item.active ? 'active' : 'archived'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ng-muted">{formatLongDate(item.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {!item.deleted_at ? (
                            item.active ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleArchive(item)}
                                leftIcon={<ArchiveIcon className="h-3.5 w-3.5" />}
                                className="min-w-[104px] justify-center text-amber-700"
                              >
                                Archive
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleUnarchive(item)}
                                leftIcon={<UnarchiveIcon className="h-3.5 w-3.5" />}
                                className="min-w-[104px] justify-center text-ng-blue"
                              >
                                Unarchive
                              </Button>
                            )
                          ) : null}
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={Boolean(item.deleted_at)}
                            onClick={() => void handleDelete(item)}
                            leftIcon={<ClearIcon className="h-3.5 w-3.5" />}
                            className="min-w-[92px] justify-center"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
