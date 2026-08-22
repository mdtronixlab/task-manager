import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Gate for any route that requires a signed-in, registered, active user
 * (rules.md §11/§12), and optionally a specific role. This is UX only — the
 * Express API independently re-checks identity/role/permission on every
 * request; hiding a route here is never the security boundary
 * (architecture.md §12, rules.md §12).
 *
 * @param {{ role?: string }} props Pass `role` (e.g. ROLES.SUPER_ADMIN) to
 *   additionally require that role; omit to just require any signed-in user.
 */
export default function ProtectedRoute({ role }) {
  const { status, appUser } = useAuth()
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && appUser.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
