import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const TONE_ICON = { success: CheckCircle2, error: AlertTriangle }
const TONE_ICON_CLASS = { success: 'text-tone-success-text', error: 'text-tone-error-text' }
const DEFAULT_DURATION_MS = 4000
// Matches the CSS animate-toast-out duration — a toast is kept in state
// (marked `leaving`) this long after dismissal so its exit animation can
// play before it's actually removed from the list. Deliberately not
// hooks/useDelayedUnmount.js (Modal.jsx's version of this same "stay
// mounted N ms after close" idea): that hook manages one boolean pair for
// a single element, whereas this manages a *list* of independently
// dismissible toasts, each needing its own per-id `leaving` flag and timer
// — a shape that hook doesn't fit.
const EXIT_ANIMATION_MS = 200

/**
 * Transient confirmation for a mutating action (task saved, status changed,
 * logo updated) — phases.md Phase 9. Not a replacement for the existing
 * inline error banners (a form/page error should stay visible near its
 * context, not vanish after 4s); this is additive, for success feedback
 * that was otherwise silent.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // Every pending timer (auto-dismiss and exit-removal), keyed by toast id,
  // so a provider unmount can clear them all instead of letting a stray
  // setTimeout fire setToasts after the component is gone.
  const timersRef = useRef(new Map())
  const leavingRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((toastTimers) => {
        clearTimeout(toastTimers.auto)
        clearTimeout(toastTimers.exit)
      })
      timers.clear()
    }
  }, [])

  const dismissToast = useCallback((id) => {
    // A toast can be dismissed twice in quick succession (its own
    // auto-dismiss timeout firing right as the user clicks the X) — only
    // the first call should start the exit animation/timer.
    if (leavingRef.current.has(id)) return
    leavingRef.current.add(id)

    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    const exit = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      leavingRef.current.delete(id)
      timersRef.current.delete(id)
    }, EXIT_ANIMATION_MS)
    timersRef.current.set(id, { ...timersRef.current.get(id), exit })
  }, [])

  const showToast = useCallback(
    (message, { tone = 'success', duration = DEFAULT_DURATION_MS } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((prev) => [...prev, { id, message, tone }])
      if (duration) {
        const auto = setTimeout(() => dismissToast(id), duration)
        timersRef.current.set(id, { ...timersRef.current.get(id), auto })
      }
      return id
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return createPortal(
    // bottom-24 on mobile clears AdminLayout/StaffLayout's fixed bottom tab
    // bar (also anchored at bottom-4); sm and up there's no tab bar so it
    // sits at the usual bottom-4.
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end">
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone] || CheckCircle2
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3 text-on-surface shadow-xl ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <Icon className={`size-5 shrink-0 ${TONE_ICON_CLASS[toast.tone] || TONE_ICON_CLASS.success}`} aria-hidden="true" />
            <p className="flex-1 text-body-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
