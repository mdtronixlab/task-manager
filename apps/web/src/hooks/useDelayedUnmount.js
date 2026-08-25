import { useEffect, useState } from 'react'

/**
 * Keeps a single conditionally-rendered element mounted for `durationMs`
 * after `open` goes false, so a CSS exit animation has time to finish
 * instead of the element just vanishing. Returns `visible` (render while
 * true) and `closing` (true only during that grace window — pick an
 * exit-animation class off it).
 *
 * Extracted out of Modal.jsx so the "stay mounted N ms after close" timing
 * logic exists in exactly one place rather than being hand-rolled again by
 * every future exit-animated component. ToastContext.jsx's toasts don't fit
 * this shape — it's a *list* of independently-dismissible items, each with
 * its own timer — so it tracks per-item `leaving` state instead of reusing
 * this hook.
 */
export function useDelayedUnmount(open, durationMs) {
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
      return undefined
    }
    if (!visible) return undefined
    setClosing(true)
    const timeout = setTimeout(() => {
      setVisible(false)
      setClosing(false)
    }, durationMs)
    return () => clearTimeout(timeout)
    // `visible` deliberately excluded — this should only re-run when `open`
    // itself changes, not when the timeout above updates `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationMs])

  return { visible, closing }
}

export default useDelayedUnmount
