import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const TONE_ICON = { success: CheckCircle2, error: AlertTriangle }
const TONE_ICON_CLASS = { success: 'text-tone-success-text', error: 'text-tone-error-text' }
const DEFAULT_DURATION_MS = 4000

/**
 * Transient confirmation for a mutating action (task saved, status changed,
 * logo updated) — phases.md Phase 9. Not a replacement for the existing
 * inline error banners (a form/page error should stay visible near its
 * context, not vanish after 4s); this is additive, for success feedback
 * that was otherwise silent.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, { tone = 'success', duration = DEFAULT_DURATION_MS } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((prev) => [...prev, { id, message, tone }])
      if (duration) {
        setTimeout(() => dismissToast(id), duration)
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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone] || CheckCircle2
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3 text-on-surface shadow-xl"
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
