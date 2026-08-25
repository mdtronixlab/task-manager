import { useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAnimationReplay } from '../hooks/useAnimationReplay'
import Logo from '../components/Logo'
import ProfileMenu from '../components/ProfileMenu'
import ThemeToggle from '../components/ThemeToggle'

// Desktop sidebar link: icon + label side by side. Soft UI's idiom for
// "currently engaged" is pressed-in, not filled — active uses .neu-inset
// (a recessed well) instead of the old tinted-pill treatment, still paired
// with the primary tone on the label/icon so active state isn't shadow-only
// (design.md §6–7, rules.md §10).
function sidebarNavLinkClassName({ isActive }) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-body-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive
      ? 'neu-inset font-medium text-tone-primary-text'
      : 'text-on-surface-variant hover:neu-sm hover:text-on-surface',
  ].join(' ')
}

// Mobile bottom-bar tab: icon gets the M3-style pill highlight when active
// (same tone token as the sidebar above), label stays small underneath.
function bottomNavLinkClassName({ isActive }) {
  return [
    'flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-label-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    isActive ? 'text-tone-primary-text' : 'text-on-surface-variant hover:text-on-surface',
  ].join(' ')
}

function BottomNavLink({ link }) {
  return (
    <NavLink to={link.to} className={bottomNavLinkClassName}>
      {({ isActive }) => (
        <>
          <span
            className={[
              'flex size-8 items-center justify-center rounded-full transition-all',
              isActive ? 'neu-inset' : '',
            ].join(' ')}
          >
            <link.icon className="size-5" aria-hidden="true" />
          </span>
          {link.label}
        </>
      )}
    </NavLink>
  )
}

/**
 * Shared chrome for AdminLayout/StaffLayout.
 *
 * - Below `sm`: a compact sticky top bar (branding + account) plus a fixed
 *   bottom tab bar for primary nav — there isn't room for a permanent
 *   sidebar on a phone-width screen.
 * - `sm` and up: primary nav moves into a persistent left sidebar (branding
 *   + nav + account all in one place) instead of a horizontal header, which
 *   is the nav placement desktop users expect and scales better than the
 *   header's old horizontal-scroll-on-overflow fallback ever did.
 *
 * AdminLayout and StaffLayout are thin wrappers around this — only nav
 * links, content max-width, and an optional brand-cluster extra
 * (AdminLayout's "Super Admin" badge) differ between them.
 *
 * @param {{
 *   navLinks: {to: string, label: string, icon: object}[],
 *   maxWidthClassName?: string, brandExtra?: import('react').ReactNode,
 *   quickAction?: {icon: object, label: string, onClick: () => void},
 *   children?: import('react').ReactNode,
 * }} props `quickAction` is an optional primary action (StaffLayout's
 *   "Add task") rendered as a raised circular button in the middle of the
 *   mobile bottom bar, poking above it — not a nav destination, so it's
 *   deliberately not a NavLink. Desktop's sidebar has no equivalent; that
 *   action lives inline on the page itself there (e.g. StaffDashboard's
 *   header "Add Task" button), same as it always has.
 */
export default function AppShell({ navLinks, maxWidthClassName = 'max-w-5xl', brandExtra, quickAction, children }) {
  const { appUser, signOut } = useAuth()
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  useAnimationReplay(mainRef, pathname)

  const profileMenu = (
    <ProfileMenu name={appUser?.name} email={appUser?.email} avatarUrl={appUser?.avatar} onSignOut={signOut} />
  )

  return (
    <div className="min-h-screen text-on-surface sm:flex">
      {/* Mobile-only top bar: branding + account cluster. Below sm, primary
          nav lives in the bottom tab bar; sm and up, nav/branding/account
          all move into the sidebar instead and this bar is hidden. */}
      <div className="pointer-events-none sticky top-0 z-40 px-4 pt-4 sm:hidden">
        <header className="neu-strong pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-4 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" showWordmark={false} />
            {brandExtra}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {profileMenu}
          </div>
        </header>
      </div>

      {/* Desktop sidebar — sm and up only. Sticky (not fixed) so it lives
          inside the sm:flex row below and the flex-1 content column next to
          it gets the remaining width automatically, rather than hand-tuned
          left padding on `main` that would have to match the sidebar's
          width by hand. Same floating rounded-card language (border, blur,
          shadow) as the bars it replaces. */}
      <aside className="neu-strong sticky top-4 z-40 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col self-start rounded-2xl p-4 sm:ml-4 sm:flex">
        <div className="flex items-center gap-3 px-2 pb-4">
          <Logo size="sm" />
        </div>
        {brandExtra && <div className="px-2 pb-4">{brandExtra}</div>}
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={sidebarNavLinkClassName}>
              <link.icon className="size-5 shrink-0" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 px-1 pt-3">
          {profileMenu}
          <ThemeToggle />
        </div>
      </aside>

      {/* flex-1 + min-w-0 so this column takes exactly the width left over
          after the sidebar at sm and up, instead of overflowing it. */}
      <div className="sm:min-w-0 sm:flex-1">
        {/* Extra bottom padding on mobile clears the fixed tab bar below;
            sm and up neither mobile bar exists, so the normal py-8 spacing
            is enough. */}
        <main ref={mainRef} className={`mx-auto ${maxWidthClassName} px-6 pb-24 pt-8 sm:pb-8 sm:pt-8 animate-fade-in-up`}>
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Mobile bottom tab bar — replaces the sidebar's nav below sm, same
          floating-card language so the two read as one system. quickAction
          (if given) splits navLinks in half so it lands in the visual
          centre regardless of how many links there are. */}
      <nav
        aria-label="Primary"
        className="neu-strong fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl px-2 py-2 sm:hidden"
      >
        {(quickAction ? navLinks.slice(0, Math.ceil(navLinks.length / 2)) : navLinks).map((link) => (
          <BottomNavLink key={link.to} link={link} />
        ))}

        {quickAction && (
          <button
            type="button"
            onClick={quickAction.onClick}
            aria-label={quickAction.label}
            className="-mt-8 flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-series-1 text-on-primary shadow-[-4px_-4px_10px_var(--neu-light),4px_4px_10px_var(--neu-dark),0_6px_18px_-4px_var(--color-primary)] transition-transform hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <quickAction.icon className="size-6" aria-hidden="true" />
          </button>
        )}

        {quickAction &&
          navLinks.slice(Math.ceil(navLinks.length / 2)).map((link) => <BottomNavLink key={link.to} link={link} />)}
      </nav>
    </div>
  )
}
