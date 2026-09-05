import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, Bell, BellOff, Send } from 'lucide-react'
import ProfileIcon from './ProfileIcon'
import { usePushNotifications } from '../hooks/usePushNotifications'

/**
 * Account menu: click the profile picture to reveal name/email + sign out,
 * instead of a separate always-visible "Sign out" button in the header.
 *
 * Portaled and positioned from the trigger's bounding rect rather than an
 * absolutely-positioned child of the header — AdminLayout/StaffLayout's
 * header has overflow-x-auto for its single-line-with-scroll layout, and
 * setting overflow-x implicitly makes overflow-y computed "auto" too (CSS
 * Overflow spec), which would clip a dropdown positioned as a descendant.
 */
export default function ProfileMenu({ name, email, avatarUrl, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const [testSent, setTestSent] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const push = usePushNotifications()

  async function handleSendTest() {
    setTestSent(false)
    const ok = await push.sendTest()
    if (ok) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 2000)
    }
  }

  useEffect(() => {
    if (!open) return undefined

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const MENU_WIDTH = 224 // w-56
      const MARGIN = 8

      // Direction-aware: the trigger used to only ever live in the
      // top-right header, so opening downward + right-aligned always
      // fit. It now also renders at the bottom of the desktop sidebar
      // (bottom-left of the screen) and in the mobile top bar — a fixed
      // "always open below, always right-align" would put the menu below
      // the viewport (sidebar case) or off the left edge (any left-side
      // trigger), so pick the side that actually has room instead.
      const openUpward = rect.top > window.innerHeight / 2
      const alignLeft = rect.left + MENU_WIDTH + MARGIN <= window.innerWidth

      setPosition({
        top: openUpward ? undefined : rect.bottom + MARGIN,
        bottom: openUpward ? window.innerHeight - rect.top + MARGIN : undefined,
        left: alignLeft ? rect.left : undefined,
        right: alignLeft ? undefined : window.innerWidth - rect.right,
      })
    }
    updatePosition()

    function getMenuItems() {
      return menuRef.current
        ? Array.from(menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)'))
        : []
    }

    function handlePointerDown(event) {
      if (triggerRef.current?.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      // Simple focus trap: cycle Tab/Shift+Tab within the menu instead of
      // letting focus escape into the rest of the page. This is a portaled
      // menu rendered at the end of <body>, so without this an un-trapped
      // Tab would jump straight to whatever follows the trigger in document
      // order rather than the next menu item.
      if (event.key === 'Tab') {
        const items = getMenuItems()
        if (items.length === 0) return
        const currentIndex = items.indexOf(document.activeElement)
        const nextIndex = event.shiftKey
          ? currentIndex <= 0
            ? items.length - 1
            : currentIndex - 1
          : currentIndex === items.length - 1
            ? 0
            : currentIndex + 1
        event.preventDefault()
        items[nextIndex]?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  // Move focus into the menu once it's positioned and rendered, so a
  // keyboard user landing here via Enter/Space on the trigger doesn't have
  // focus silently stranded on a trigger that's about to be covered by the
  // menu — this is what let a user tab straight past the whole menu before.
  useEffect(() => {
    if (!open || !position) return undefined
    const frame = requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector('[role="menuitem"]:not(:disabled)')
      firstItem?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, position])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={name ? `Account menu — ${name}` : 'Account menu'}
        className="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ProfileIcon name={name} avatarUrl={avatarUrl} size="sm" />
      </button>

      {open &&
        position &&
        createPortal(
          <>
            {/* Backdrop: blurs the page behind the menu instead of just
                closing invisibly on outside click, matching Modal's scrim
                (styles/index.css .neu language). Click-to-close falls out
                of the existing outside-pointerdown listener above — this
                div isn't inside triggerRef/menuRef, so it counts as
                "outside" already. */}
            <div className="fixed inset-0 z-40 animate-fade-in bg-black/10 backdrop-blur-sm" aria-hidden="true" />
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Account"
              style={{ top: position.top, bottom: position.bottom, left: position.left, right: position.right }}
              className="neu-strong fixed z-50 max-h-[70vh] w-56 animate-scale-in overflow-y-auto rounded-xl p-1.5 text-on-surface"
            >
              <div className="px-3 py-2">
                <p className="truncate text-body-sm font-medium text-on-surface">{name || 'Account'}</p>
                {email && <p className="truncate text-body-sm text-on-surface-variant">{email}</p>}
              </div>

              {push.supported && (
                <>
                  <div role="separator" className="my-1 h-px bg-outline-variant/30" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={push.busy}
                    onClick={push.subscribed ? push.unsubscribe : push.subscribe}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {push.subscribed ? (
                      <BellOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Bell className="size-4" aria-hidden="true" />
                    )}
                    {push.subscribed ? 'Disable push notifications' : 'Enable push notifications'}
                  </button>
                  {push.subscribed && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={push.busy}
                      onClick={handleSendTest}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="size-4" aria-hidden="true" />
                      {testSent ? 'Sent ✓' : 'Send test notification'}
                    </button>
                  )}
                  {push.error && <p className="px-3 py-1 text-body-sm text-error">{push.error}</p>}
                </>
              )}

              <div role="separator" className="my-1 h-px bg-outline-variant/30" />
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false)
                  // Tear the push subscription down before signing out — a
                  // signed-out staff member can't add a task, so pinging
                  // them to do so is just noise. Unsubscribing here (rather
                  // than at reminder-send time) needs the still-valid
                  // Firebase token to reach the server, so it has to happen
                  // before onSignOut() below invalidates it; unsubscribe()
                  // already swallows its own errors, so this never blocks
                  // sign-out on a failed network call.
                  if (push.subscribed) {
                    await push.unsubscribe()
                  }
                  onSignOut?.()
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
