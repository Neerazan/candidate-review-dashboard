import { useEffect, useState } from 'react'
import { CandidateFilters } from '../components/CandidateFilters'
import { CandidateTable } from '../components/CandidateTable'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { Navbar } from '../components/Navbar'
import { listCandidates } from '../api/candidates'
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
  const [filters, setFilters] = useState(defaultFilters)
  const [data, setData] = useState<CandidateListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, new: 0, reviewed: 0, hired: 0 })

  useEffect(() => {
    void (async () => {
      try {
        const [total, newItems, reviewed, hired] = await Promise.all([
          listCandidates({ ...defaultFilters, page_size: 1 }),
          listCandidates({ ...defaultFilters, status: 'new', page_size: 1 }),
          listCandidates({ ...defaultFilters, status: 'reviewed', page_size: 1 }),
          listCandidates({ ...defaultFilters, status: 'hired', page_size: 1 }),
        ])
        setStats({ total: total.total, new: newItems.total, reviewed: reviewed.total, hired: hired.total })
      } catch {
        setStats({ total: 0, new: 0, reviewed: 0, hired: 0 })
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listCandidates(filters)
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load candidates')
      } finally {
        setLoading(false)
      }
    })()
  }, [filters])

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-extrabold">Candidates</h1>
            <p className="text-sm text-ng-muted">TechKraft recruitment dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card p-4">
            <p className="text-sm text-ng-muted">Total</p>
            <p className="text-3xl font-bold text-ng-ink">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-ng-ghost">New</p>
            <p className="text-3xl font-bold text-ng-blue">{stats.new}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-ng-muted">Reviewed</p>
            <p className="text-3xl font-bold text-ng-ink">{stats.reviewed}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-ng-ghost">Hired</p>
            <p className="text-3xl font-bold text-ng-blue">{stats.hired}</p>
          </div>
        </div>
        <CandidateFilters value={filters} onChange={setFilters} />
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState label="Loading candidates..." /> : null}
        {!loading && data ? <CandidateTable items={data.items} /> : null}
        {data ? (
          <div className="card flex items-center justify-between p-3 text-sm">
            <p className="text-ng-muted">
              Page {data.page} • {data.total} total candidates
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={filters.page <= 1 || loading}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={loading || data.page * data.page_size >= data.total}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
