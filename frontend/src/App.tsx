import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout } from './components/ProtectedLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AddStaffPage } from './pages/AddStaffPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { CandidateListPage } from './pages/CandidateListPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { LoginPage } from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/candidates" element={<CandidateListPage />} />
          <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
          <Route path="/staff/new" element={<AddStaffPage />} />
          <Route path="/account/password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/candidates" replace />} />
    </Routes>
  )
}

export default App
