import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function ProtectedLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
    </div>
  )
}
