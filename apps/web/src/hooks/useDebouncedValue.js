import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it's stopped changing for `delayMs` —
 * TaskFilters' search box uses this so free-text typing doesn't fire a
 * server request per keystroke the way the other (discrete, Select-driven)
 * filters can afford to.
 */
export function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}

export default useDebouncedValue
