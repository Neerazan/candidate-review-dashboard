import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../types/candidate'
import { StatusBadge } from './StatusBadge'

interface CandidateTableProps {
  items: CandidateListItem[]
}

export function CandidateTable({ items }: CandidateTableProps) {
  if (items.length === 0) {
    return <div className="card p-6 text-sm text-ng-muted">No candidates found.</div>
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-ng-line text-left text-sm">
        <thead className="bg-ng-surface text-ng-muted">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role Applied</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Skills</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ng-line">
          {items.map((candidate) => (
            <tr key={candidate.id} className="hover:bg-ng-surface">
              <td className="px-4 py-3">
                <p className="font-semibold text-ng-ink">{candidate.name}</p>
                <p className="text-xs text-ng-muted">{candidate.email}</p>
              </td>
              <td className="px-4 py-3 text-ng-muted">{candidate.role_applied}</td>
              <td className="px-4 py-3">
                <StatusBadge status={candidate.status} />
              </td>
              <td className="px-4 py-3 text-ng-muted">{candidate.skills.join(', ')}</td>
              <td className="px-4 py-3 text-ng-muted">{new Date(candidate.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <Link to={`/candidates/${candidate.id}`} className="btn-secondary px-3 py-1 text-xs">
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
