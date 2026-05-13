import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-ng-line bg-ng-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/candidates" className="text-lg font-extrabold tracking-tight text-ng-ink">
          NovaHire Review Desk
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-ng-ink">
              <span aria-hidden="true">◉</span>
              {user?.name ?? 'Unknown User'}
            </p>
            <p className="text-xs text-ng-muted">{user?.role ?? 'guest'}</p>
          </div>
          <button type="button" onClick={() => void logout()} className="btn-secondary inline-flex gap-2">
            <span aria-hidden="true">↗</span>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
