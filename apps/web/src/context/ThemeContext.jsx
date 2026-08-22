import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Keep in sync with index.html's blocking inline script, which sets
// data-theme on <html> before first paint using this same key.
const STORAGE_KEY = 'otm-theme'

const ThemeContext = createContext(null)

function getInitialTheme() {
  // The inline script in index.html already set this before React mounted —
  // read it back rather than re-deriving from localStorage, so the two
  // never disagree.
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'light' ? 'light' : 'dark'
}

/**
 * Light/dark theme (design.md §4/§38 — both palettes have been fully wired
 * in styles/index.css since Phase 1; dark is the established default).
 * Persists the explicit choice; doesn't follow OS preference — that wasn't
 * the decision made, see memory.md §14.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Private browsing etc. — theme still applies this session, just won't persist.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
