import { useEffect } from 'react'

/**
 * Replays a CSS animation class on `ref.current` whenever `trigger` changes,
 * by removing the class, forcing a reflow, then re-adding it.
 *
 * Deliberately not a React `key` on the animated element: keying it would
 * force a full unmount/remount of everything inside — including a routed
 * `<Outlet/>` — on every trigger change, discarding component state and
 * re-running mount effects/data fetches just to replay an entrance
 * animation (e.g. navigating /staff/1 -> /staff/2, same route component,
 * different :userId param).
 */
export function useAnimationReplay(ref, trigger, className = 'animate-fade-in-up') {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove(className)
    void el.offsetWidth // force a reflow so the removal is observed before re-adding
    el.classList.add(className)
  }, [ref, trigger, className])
}

export default useAnimationReplay
