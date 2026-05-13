import { Link } from 'react-router-dom'
import type { UserRole } from '../types/auth'
import type { CandidateListItem } from '../types/candidate'
import { ReviewIcon, ViewIcon } from './Icons'
import { StatusBadge } from './StatusBadge'
import { formatLongDate } from '../utils/date'

interface CandidateTableProps {
  items: CandidateListItem[]
  viewerRole: UserRole
}

export function CandidateTable({ items, viewerRole }: CandidateTableProps) {
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
              <td className="px-4 py-3 text-ng-muted">{formatLongDate(candidate.created_at)}</td>
              <td className="px-4 py-3">
                {viewerRole === 'admin' ? (
                  <Link to={`/candidates/${candidate.id}`} className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs">
                    <ViewIcon className="h-3.5 w-3.5" />
                    View
                  </Link>
                ) : candidate.status === 'new' || candidate.status === 'reviewed' ? (
                  <Link to={`/candidates/${candidate.id}`} className="btn-primary inline-flex items-center gap-1 px-3 py-1 text-xs">
                    <ReviewIcon className="h-3.5 w-3.5" />
                    Review
                  </Link>
                ) : (
                  <Link to={`/candidates/${candidate.id}`} className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs">
                    <ViewIcon className="h-3.5 w-3.5" />
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
