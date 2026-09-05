import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Gate for any route that requires a signed-in, registered, active user
 * (rules.md §11/§12), and optionally a specific role. This is UX only — the
 * Express API independently re-checks identity/role/permission on every
 * request; hiding a route here is never the security boundary
 * (architecture.md §12, rules.md §12).
 *
 * @param {{ role?: string|string[] }} props Pass `role` (e.g. ROLES.SUPER_ADMIN,
 *   or an array like constants/roles.js's ADMIN_ROLES) to additionally
 *   require one of those roles; omit to just require any signed-in user.
 */
export default function ProtectedRoute({ role }) {
  const { status, appUser } = useAuth()
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : null
  if (allowedRoles && !allowedRoles.includes(appUser.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
