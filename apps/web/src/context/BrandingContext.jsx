import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { getPublicSettings } from '../services/settings'

// `timezone` falls back to the browser's own zone until the real (org-
// configured) value loads — same fallback lib/time.js's getOrgTimezone
// itself uses server-side, so the sidebar clock never renders with no zone
// at all while the fetch below is in flight.
const DEFAULTS = {
  applicationName: 'Organisation Task Manager',
  logoUrl: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}

const BrandingContext = createContext(null)

/**
 * App identity (name/logo) — deliberately independent of AuthContext, since
 * the login page needs to render the org's branding before any session
 * exists (services/settings.js getPublicSettings is unauthenticated).
 * Branding is cosmetic: a failed fetch silently keeps the built-in
 * defaults rather than blocking or erroring the app.
 */
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS)

  const refresh = useCallback(async () => {
    try {
      const data = await getPublicSettings()
      setBranding({
        applicationName: data.applicationName,
        logoUrl: data.logoUrl,
        timezone: data.timezone || DEFAULTS.timezone,
      })
    } catch {
      setBranding(DEFAULTS)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <BrandingContext.Provider value={{ ...branding, refresh }}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider')
  return ctx
}
