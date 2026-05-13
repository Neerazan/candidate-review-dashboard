import type { CandidateFilters as CandidateFiltersType } from '../types/candidate'

interface CandidateFiltersProps {
  value: CandidateFiltersType
  onChange: (next: CandidateFiltersType) => void
}

export function CandidateFilters({ value, onChange }: CandidateFiltersProps) {
  function update<K extends keyof CandidateFiltersType>(key: K, next: CandidateFiltersType[K]) {
    onChange({ ...value, [key]: next, page: 1 })
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          className="input xl:col-span-2"
          placeholder="Search by name, email, role"
          value={value.keyword}
          onChange={(e) => update('keyword', e.target.value)}
        />
        <select className="input" value={value.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">All status</option>
          <option value="new">new</option>
          <option value="reviewed">reviewed</option>
          <option value="hired">hired</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
        <input
          className="input"
          placeholder="All roles"
          value={value.role_applied}
          onChange={(e) => update('role_applied', e.target.value)}
        />
        <input
          className="input"
          placeholder="All skills"
          value={value.skill}
          onChange={(e) => update('skill', e.target.value)}
        />
        <div>
          <button
            type="button"
            className="btn-secondary w-full xl:w-auto"
            onClick={() =>
              onChange({ status: '', role_applied: '', skill: '', keyword: '', page: 1, page_size: value.page_size })
            }
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
