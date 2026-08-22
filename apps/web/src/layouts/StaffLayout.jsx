import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Logo from '../components/Logo'
import ProfileIcon from '../components/ProfileIcon'
import ThemeToggle from '../components/ThemeToggle'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks/history', label: 'History' },
]

function navLinkClassName({ isActive }) {
  return [
    'rounded-sm text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive ? 'text-on-surface font-medium' : 'text-on-surface-variant hover:text-on-surface',
  ].join(' ')
}

// Used two ways, same reasoning as AdminLayout.jsx: explicit `children` for
// /dashboard (shared path, can't be a nested route here), or as a
// react-router layout route via <Outlet/> for /tasks/history.
export default function StaffLayout({ children }) {
  const { appUser, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-outline-variant px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Logo size="sm" />
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
          <p className="hidden text-body-sm text-on-surface-variant sm:block">{appUser?.name}</p>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children ?? <Outlet />}</main>
    </div>
  )
}
