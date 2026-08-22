import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Logo from '../components/Logo'
import ProfileIcon from '../components/ProfileIcon'
import ThemeToggle from '../components/ThemeToggle'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/reports', label: 'Reports' },
  { to: '/activity', label: 'Activity' },
  { to: '/settings', label: 'Settings' },
]

function navLinkClassName({ isActive }) {
  return [
    'rounded-sm text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive ? 'text-on-surface font-medium' : 'text-on-surface-variant hover:text-on-surface',
  ].join(' ')
}

// rules.md §46 — Admin prioritises desktop while remaining usable smaller
// (max-w-7xl vs StaffLayout's max-w-5xl), not a separate mobile-only
// design — hence flex-wrap below rather than a hamburger/mobile-nav
// pattern: five nav links plus branding plus the profile cluster don't fit
// one row under ~1100px, so the header wraps onto multiple lines instead
// of overflowing (phases.md Phase 9 — table/layout responsiveness).
//
// Used two ways: with explicit `children` (DashboardPage wraps
// AdminDashboard directly, since /dashboard is shared with StaffLayout and
// can't be a nested route under this layout without a path collision), or
// as a react-router layout route via `<Outlet/>` (phases.md Phase 5's
// /tasks, /staff/:userId).
export default function AdminLayout({ children }) {
  const { appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-outline-variant px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <Badge tone="primary">Super Admin</Badge>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClassName}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileIcon name={appUser?.name} avatarUrl={appUser?.avatar} size="sm" />
          <p className="text-body-sm text-on-surface-variant">{appUser?.name}</p>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children ?? <Outlet />}</main>
    </div>
  )
}
