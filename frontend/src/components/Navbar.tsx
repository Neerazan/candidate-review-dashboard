import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { Avatar } from './Avatar'
import { ChevronDownIcon, KeyIcon, LogoutIcon, StaffIcon } from './Icons'

export function Navbar() {
  const { user, logout } = useAuth()
  const { confirm } = useConfirm()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) {
        return
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
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
    toast.success('Logged out successfully')
  }

  return (
    <header className="relative z-50 border-b border-ng-line bg-ng-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/candidates" className="text-lg font-extrabold tracking-tight text-ng-ink">
          Candidate Review Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-ng-ink">{user?.name ?? 'Unknown User'}</p>
            <p className="text-xs text-ng-muted">{user?.role ?? 'guest'}</p>
          </div>
          {user?.force_password_change ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              <KeyIcon className="h-4 w-4" />
              Password Update Required
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-ng-line bg-ng-white px-2 py-1.5 hover:bg-ng-surface"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <Avatar name={user?.name ?? 'Unknown User'} size="sm" />
                <ChevronDownIcon className="h-4 w-4 text-ng-muted" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-ng-line bg-ng-white p-1 shadow-xl">
                  <Link
                    to="/account/password"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-amber-700 hover:bg-amber-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <KeyIcon className="h-4 w-4" />
                    Change Password
                  </Link>
                  {user?.role === 'admin' ? (
                    <Link
                      to="/staff/new"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-ng-blue hover:bg-ng-blue-light"
                      onClick={() => setMenuOpen(false)}
                    >
                      <StaffIcon className="h-4 w-4" />
                      Manage Staff
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ng-red hover:bg-ng-surface"
                    onClick={() => void handleLogout()}
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
