import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import { ROLES, ADMIN_ROLES } from './constants/roles'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import MyTasksPage from './pages/MyTasks/MyTasksPage'
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

      {/* Admin/Super Admin pages (phases.md Phase 5/6) — nested under
          AdminLayout as a proper layout route (see AdminLayout.jsx for why
          /dashboard itself isn't folded in here too). Org-wide task/report/
          activity authority is shared by both roles (ADMIN_ROLES); Settings
          (user/department/category management, custom notifications) is
          Super Admin only — a separate ProtectedRoute below. */}
      <Route element={<ProtectedRoute role={ADMIN_ROLES} />}>
        <Route element={<AdminLayout />}>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/staff/:userId" element={<StaffDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/activity" element={<ActivityLogPage />} />
        </Route>
      </Route>

      {/* An Admin's own operational work (rules.md §16-adjacent: a Super
          Admin's role is oversight, not doing tasks themselves) — separate
          ProtectedRoute since it's neither of ADMIN_ROLES, just ADMIN. */}
      <Route element={<ProtectedRoute role={ROLES.ADMIN} />}>
        <Route element={<AdminLayout />}>
          <Route path="/my-tasks" element={<MyTasksPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role={ROLES.SUPER_ADMIN} />}>
        <Route element={<AdminLayout />}>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
