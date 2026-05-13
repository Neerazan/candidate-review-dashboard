import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { LogoutIcon } from './Icons'

export function Navbar() {
  const { user, logout } = useAuth()
  const { confirm } = useConfirm()

  async function handleLogout() {
    const approved = await confirm({
      title: 'Log out of your session?',
      description: 'You will need to sign in again to continue reviewing candidates.',
      confirmText: 'Logout',
      tone: 'danger',
    })
    if (!approved) {
      return
    }
    await logout()
  }

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
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 rounded-lg border border-ng-red/30 bg-ng-red-light px-4 py-2 text-sm font-semibold text-ng-red transition hover:bg-ng-red-light/80"
          >
            <LogoutIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
