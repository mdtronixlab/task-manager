import { LayoutDashboard, ClipboardList, ListChecks, BarChart3, Activity, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../constants/roles'
import Badge from '../components/Badge'
import AppShell from './AppShell'

// `icon` is only used by the mobile bottom nav bar (AppShell) — the
// header's text nav (sm and up) doesn't need one. My Tasks and Settings are
// appended separately below, gated the opposite way from each other (My
// Tasks: Admin only; Settings: Super Admin only) — App.jsx gates both
// routes the same way, this just keeps each role from seeing a nav link to
// a page they'd immediately bounce out of.
const BASE_NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/activity', label: 'Activity', icon: Activity },
]
// A Super Admin's role is oversight, not doing tasks themselves — see
// MyTasksPage.jsx — so this is Admin-only, not the whole ADMIN_ROLES group.
const MY_TASKS_LINK = { to: '/my-tasks', label: 'My Tasks', icon: ClipboardList }
const SETTINGS_LINK = { to: '/settings', label: 'Settings', icon: Settings }

// rules.md §46 — Admin prioritises desktop while remaining usable smaller
// (max-w-7xl vs StaffLayout's max-w-5xl), not a separate mobile-only
// design. Five nav links plus branding plus the profile cluster don't fit
// one row under ~1100px, so below that AppShell's header scrolls
// horizontally as a single line instead of wrapping or overflowing
// (phases.md Phase 9 — table/layout responsiveness).
//
// Used two ways: with explicit `children` (DashboardPage wraps
// AdminDashboard directly, since /dashboard is shared with StaffLayout and
// can't be a nested route under this layout without a path collision), or
// as a react-router layout route via `<Outlet/>` (phases.md Phase 5's
// /tasks, /staff/:userId) — both handled by AppShell.
export default function AdminLayout({ children }) {
  const { appUser } = useAuth()
  const isSuperAdmin = appUser?.role === ROLES.SUPER_ADMIN
  const navLinks = isSuperAdmin
    ? [...BASE_NAV_LINKS, SETTINGS_LINK]
    : [BASE_NAV_LINKS[0], MY_TASKS_LINK, ...BASE_NAV_LINKS.slice(1)]

  return (
    <AppShell
      navLinks={navLinks}
      maxWidthClassName="max-w-7xl"
      headerGapClassName="gap-5"
      brandExtra={<Badge tone="primary">{isSuperAdmin ? 'Super Admin' : 'Admin'}</Badge>}
    >
      {children}
    </AppShell>
  )
}
