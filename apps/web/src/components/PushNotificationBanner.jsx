import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Button from './Button'

// Session-only — reappears next visit if still not subscribed. A one-time
// permanent dismissal would defeat the point (getting everyone actually
// subscribed so every future push, e.g. taskReminderService.js's 8am
// reminder, actually reaches them), but nagging on every single navigation
// within one sitting is worse than just asking once per session.
const DISMISSED_KEY = 'otm-push-banner-dismissed'

/**
 * A visible, dismissible nudge to turn on push notifications — rendered in
 * AppShell so every signed-in page gets it, not just the dashboard. The
 * equivalent toggle already lives in ProfileMenu, but buried inside a menu
 * most people never open; this is the same `subscribe()` call
 * (usePushNotifications.js), just surfaced somewhere it's actually seen.
 *
 * Renders nothing once subscribed, when the browser doesn't support push at
 * all, or when notification permission is already `denied` — that last one
 * can only be undone from the browser's own site settings, not by asking
 * again here, so repeating the prompt would just be noise.
 */
export default function PushNotificationBanner() {
  const { supported, permission, subscribed, busy, error, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  if (!supported || subscribed || permission === 'denied' || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Private browsing etc. — just won't persist across a reload this session.
    }
  }

  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant bg-primary-container px-4 py-3 text-on-primary-container"
    >
      <Bell className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium">Turn on notifications to get task reminders and updates.</p>
        {error && <p className="mt-1 text-body-sm">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" loading={busy} loadingText="Enabling…" onClick={subscribe}>
          Turn on notifications
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1.5 transition-all hover:brightness-95"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
