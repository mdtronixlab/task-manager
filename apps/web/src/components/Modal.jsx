import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDelayedUnmount } from '../hooks/useDelayedUnmount'

// Matches the CSS animate-fade-out/animate-scale-out durations below —
// the dialog stays mounted this long after `open` goes false so the exit
// animation can finish instead of the dialog just vanishing.
const EXIT_ANIMATION_MS = 180

/**
 * Accessible dialog: traps Escape to close, restores focus to the trigger
 * on close, and is announced via role="dialog"/aria-modal (rules.md §10).
 * Rendered through a portal so it always sits above page layout.
 */
export default function Modal({ open, onClose, title, description, children, footer }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const { visible, closing } = useDelayedUnmount(open, EXIT_ANIMATION_MS)

  // Tied to `visible` (not `open`): the dialog stays mounted and fully
  // interactive for EXIT_ANIMATION_MS after `open` goes false while its
  // exit animation plays, so Escape must keep working and focus must not
  // jump back to the trigger until it's actually gone — otherwise there's
  // a window where the "closed" dialog is still visible/focusable but
  // Escape no longer closes it and focus has already left.
  useEffect(() => {
    if (!visible) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previouslyFocused = document.activeElement
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [visible, onClose])

  if (!visible) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-md ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`neu-strong relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg p-6 text-on-surface focus-visible:outline-none ${closing ? 'animate-scale-out' : 'animate-scale-in'}`}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <div>
            {title && (
              <h2 id={titleId} className="text-headline-md font-headline">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-1 text-body-sm text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-white/[0.08] hover:text-on-surface"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {/* min-h-0 lets this shrink below its content size inside the flex
            column above — without it, a tall form (e.g. TaskFormModal's
            multi-row Add Task) pushes the dialog past the viewport instead
            of scrolling internally. overflow-x-hidden is deliberate, not
            redundant: per the CSS overflow spec, setting overflow-y to
            anything but `visible` computes overflow-x as `auto` too when
            it's left at its default — any content even a few px too wide
            (a long label, an unwrapped grid column) silently grows a
            horizontal scrollbar instead of wrapping. This forces it back
            to the dialog's actual failure mode: content should wrap or
            shrink, never scroll sideways. */}
        <div className="min-h-0 overflow-x-hidden overflow-y-auto pr-1">{children}</div>
        {footer && <div className="mt-6 flex shrink-0 justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
