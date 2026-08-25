import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Animates a numeric value counting up from its previous value to `target`
 * over `duration`ms (KPI tiles feeling "alive" without a new animation
 * dependency — see index.css §Motion). Non-finite targets (e.g. StatTile's
 * "12/20" staff ratio) are returned as-is so callers don't need to guard.
 * Respects prefers-reduced-motion by jumping straight to the target.
 *
 * Starts from 0 rather than from the initial `target` — every current
 * caller (StatTile/CompletionMeter) only mounts once its data has already
 * loaded (dashboards render a LoadingState until then), so if the "from"
 * value started equal to the first `target`, the very first render would
 * always skip the animation entirely — the one case this hook exists for.
 */
export function useCountUp(target, duration = 600) {
  const isNumeric = typeof target === 'number' && Number.isFinite(target)
  const [displayValue, setDisplayValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!isNumeric) return undefined

    const from = fromRef.current
    const to = target
    if (from === to) return undefined

    if (typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches) {
      setDisplayValue(to)
      fromRef.current = to
      return undefined
    }

    let frame
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-cubic, matching the CSS ease-out used on the accompanying
      // entrance/hover transitions elsewhere on these tiles.
      const eased = 1 - (1 - progress) ** 3
      setDisplayValue(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, isNumeric])

  return isNumeric ? displayValue : target
}

export default useCountUp
