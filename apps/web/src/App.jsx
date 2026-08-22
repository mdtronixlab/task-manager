import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import { ROLES } from './constants/roles'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import TasksPage from './pages/Tasks/TasksPage'
import StaffHistoryPage from './pages/Tasks/StaffHistoryPage'
import StaffDetailPage from './pages/Staff/StaffDetailPage'
import ReportsPage from './pages/Reports/ReportsPage'
import SettingsPage from './pages/Settings/SettingsPage'
import ActivityLogPage from './pages/Activity/ActivityLogPage'
import AdminLayout from './layouts/AdminLayout'
import StaffLayout from './layouts/StaffLayout'
import LoadingState from './components/LoadingState'

export default function App() {
  const { status } = useAuth()

  // Firebase is still resolving whatever session it has persisted locally —
  // render nothing route-specific yet rather than flashing the login page
  // for an instant before bouncing to the dashboard (rules.md §30).
  if (status === 'loading') {
    return <LoadingState label="Loading…" className="min-h-screen" />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Staff-only pages — prd.md §11 "View their own task history."
          Admin has broader equivalent coverage via /tasks already. */}
      <Route element={<ProtectedRoute role={ROLES.STAFF} />}>
        <Route element={<StaffLayout />}>
          <Route path="/tasks/history" element={<StaffHistoryPage />} />
        </Route>
      </Route>

      {/* Admin-only pages (phases.md Phase 5/6) — nested under AdminLayout
          as a proper layout route (see AdminLayout.jsx for why /dashboard
          itself isn't folded in here too). */}
      <Route element={<ProtectedRoute role={ROLES.SUPER_ADMIN} />}>
        <Route element={<AdminLayout />}>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/staff/:userId" element={<StaffDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/activity" element={<ActivityLogPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
