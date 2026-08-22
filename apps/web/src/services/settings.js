// Settings service layer (rules.md §34) — architecture.md §13.

import { api } from './api'

/** GET /api/settings/public — unauthenticated; the login page needs this too. */
export function getPublicSettings() {
  return api.get('/api/settings/public')
}

/** @param {string} dataUri A `data:image/...;base64,...` URI. Super Admin only. */
export function updateLogo(dataUri) {
  return api.patch('/api/settings/logo', { logo: dataUri })
}

/** Reverts to the built-in mark. Super Admin only. */
export function removeLogo() {
  return api.patch('/api/settings/logo', { logo: null })
}
