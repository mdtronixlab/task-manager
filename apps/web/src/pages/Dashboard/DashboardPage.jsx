import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'
import StaffLayout from '../../layouts/StaffLayout'
import AdminLayout from '../../layouts/AdminLayout'
import StaffDashboard from './StaffDashboard'
import AdminDashboard from './AdminDashboard'

// Single entry point that branches by role (architecture.md §11 login flow
// ends at "Dashboard"). Revisit as nested layout routes (StaffLayout/
// AdminLayout each wrapping several child routes) once Phase 3+ adds more
// staff/admin pages beyond this one dashboard — one route per role isn't
// worth the extra routing structure yet (rules.md §1 simple over complicated).
export default function DashboardPage() {
  const { appUser } = useAuth()

  if (appUser.role === ROLES.SUPER_ADMIN) {
    return (
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    )
  }

  return (
    <StaffLayout>
      <StaffDashboard />
    </StaffLayout>
  )
}
