import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CandidateFilters } from '../components/CandidateFilters'
import { Button } from '../components/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/Icons'
import { ClearIcon, HiredIcon, ReviewIcon, SubmitIcon, ViewIcon } from '../components/Icons'
import { CandidateTable } from '../components/CandidateTable'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { getCandidateStats, listCandidates } from '../api/candidates'
import { useAuth } from '../context/AuthContext'
import type { CandidateFilters as CandidateFiltersType, CandidateListResponse } from '../types/candidate'

const defaultFilters: CandidateFiltersType = {
  status: '',
  role_applied: '',
  skill: '',
  keyword: '',
  page: 1,
  page_size: 20,
}

export function CandidateListPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState(defaultFilters)
  const [effectiveFilters, setEffectiveFilters] = useState(defaultFilters)
  const [data, setData] = useState<CandidateListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, new: 0, reviewed: 0, hired: 0, rejected: 0 })
  const includeArchivedOption = user?.role === 'admin'
  const previousFiltersRef = useRef(defaultFilters)

  useEffect(() => {
    if (!includeArchivedOption && filters.status === 'archived') {
      setFilters((prev) => ({ ...prev, status: '', page: 1 }))
    }
  }, [includeArchivedOption, filters.status])

  useEffect(() => {
    void (async () => {
      try {
        const response = await getCandidateStats()
        setStats(response)
      } catch {
        setStats({ total: 0, new: 0, reviewed: 0, hired: 0, rejected: 0 })
        toast('Dashboard stats are unavailable right now.', { icon: 'ℹ️' })
      }
    })()
  }, [])

  useEffect(() => {
    const previous = previousFiltersRef.current
    const textFieldsChanged =
      previous.keyword !== filters.keyword ||
      previous.role_applied !== filters.role_applied ||
      previous.skill !== filters.skill

    previousFiltersRef.current = filters

    if (!textFieldsChanged) {
      setEffectiveFilters(filters)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setEffectiveFilters(filters)
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [filters])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listCandidates(effectiveFilters)
        setData(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load candidates'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    })()
  }, [effectiveFilters])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-extrabold">Candidates</h1>
            <p className="text-sm text-ng-muted">TechKraft recruitment dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="card relative overflow-hidden p-4">
            <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-ng-blue-light/60" />
            <div className="mb-2 inline-flex rounded-lg bg-ng-surface p-2 text-ng-muted">
              <ViewIcon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ng-muted">Total Candidates</p>
            <p className="mt-2 text-3xl font-extrabold text-ng-ink">{stats.total}</p>
            <p className="mt-1 text-xs text-ng-ghost">Across active recruitment pipeline</p>
          </div>
          <div className="card relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-ng-blue-light" />
            <div className="mb-2 inline-flex rounded-lg bg-ng-blue-light p-2 text-ng-blue">
              <SubmitIcon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ng-muted">New</p>
            <p className="mt-2 text-3xl font-extrabold text-ng-blue">{stats.new}</p>
            <p className="mt-1 text-xs text-ng-ghost">Awaiting first review</p>
          </div>
          <div className="card relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-violet-100" />
            <div className="mb-2 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700">
              <ReviewIcon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ng-muted">Reviewed</p>
            <p className="mt-2 text-3xl font-extrabold text-violet-700">{stats.reviewed}</p>
            <p className="mt-1 text-xs text-ng-ghost">Scored by at least one reviewer</p>
          </div>
          <div className="card relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-emerald-100" />
            <div className="mb-2 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <HiredIcon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ng-muted">Hired</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">{stats.hired}</p>
            <p className="mt-1 text-xs text-ng-ghost">Moved to final offer stage</p>
          </div>
          <div className="card relative overflow-hidden p-4">
            <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-ng-red-light/90" />
            <div className="mb-2 inline-flex rounded-lg bg-ng-red-light p-2 text-ng-red">
              <ClearIcon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ng-muted">Rejected</p>
            <p className="mt-2 text-3xl font-extrabold text-ng-red">{stats.rejected}</p>
            <p className="mt-1 text-xs text-ng-ghost">Closed with no further action</p>
          </div>
        </div>
        <CandidateFilters value={filters} onChange={setFilters} includeArchivedOption={includeArchivedOption} />
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState label="Loading candidates..." variant="list" /> : null}
        {!loading && data && user ? <CandidateTable items={data.items} viewerRole={user.role} /> : null}
        {data ? (
          <div className="card flex items-center justify-between p-3 text-sm">
            <p className="text-ng-muted">
              Page {data.page} • {data.total} total candidates
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={filters.page <= 1 || loading}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                leftIcon={<ChevronLeftIcon className="h-4 w-4" />}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading || data.page * data.page_size >= data.total}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                rightIcon={<ChevronRightIcon className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
    </main>
  )
}
