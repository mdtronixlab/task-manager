import { LayoutDashboard, History, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from './AppShell'

// `icon` is only used by the mobile bottom nav bar (AppShell) — the
// header's text nav (sm and up) doesn't need one.
const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks/history', label: 'History', icon: History },
]

// Used two ways, same reasoning as AdminLayout.jsx: explicit `children` for
// /dashboard (shared path, can't be a nested route here), or as a
// react-router layout route via <Outlet/> for /tasks/history — both
// handled by AppShell.
export default function StaffLayout({ children }) {
  const navigate = useNavigate()

  return (
    <AppShell
      navLinks={NAV_LINKS}
      maxWidthClassName="max-w-5xl"
      quickAction={{
        icon: Plus,
        label: 'Add task',
        // Always routes through /dashboard — that's the only page with the
        // add-task modal (StaffDashboard.jsx). A changing `quickAddTask`
        // value (not just `true`) so clicking this while already on
        // /dashboard still produces a new location.state the page's effect
        // will notice, even though the pathname doesn't change.
        onClick: () => navigate('/dashboard', { state: { quickAddTask: Date.now() } }),
      }}
    >
      {children}
    </AppShell>
  )
}
