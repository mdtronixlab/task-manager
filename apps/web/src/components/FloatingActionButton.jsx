import { Plus } from 'lucide-react'

/**
 * A page-level primary action raised off the page as a fixed circular
 * button — same solid-primary-plus-shadow language as AppShell's
 * mobile-only `quickAction` FAB (StaffLayout's "Add task"), but available
 * at every breakpoint since the page that uses this (MyTasksPage) sits
 * under AdminLayout, which has no bottom tab bar FAB slot of its own.
 *
 * Positioned above where AppShell's mobile bottom tab bar sits (`fixed
 * inset-x-4 bottom-4`, ~64px tall) so the two never overlap; sm and up
 * that bar doesn't exist, so this drops down to a normal corner offset.
 *
 * @param {{ onClick: () => void, label: string, icon?: object, className?: string }} props
 *   `label` doubles as the button's aria-label (icon-only, no visible text).
 */
export default function FloatingActionButton({ onClick, label, icon: Icon = Plus, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'fixed bottom-24 right-6 z-30 flex size-14 items-center justify-center rounded-full',
        'bg-primary text-on-primary',
        'shadow-[0_12px_24px_-6px_var(--color-primary)]',
        'transition-transform hover:brightness-95 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'sm:bottom-8 sm:right-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  )
}
