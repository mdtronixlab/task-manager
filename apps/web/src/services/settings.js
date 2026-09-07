// Settings service layer (rules.md §34) — architecture.md §13.

import { api, downloadFile, uploadFile } from './api'

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

/** GET /api/settings/backup — downloads a fresh snapshot of the live database. Super Admin only. */
export function downloadBackup() {
  return downloadFile('/api/settings/backup', 'otm-backup.db')
}

/**
 * POST /api/settings/restore — replaces the live database with `file`
 * (a .db File from an <input type="file">). Super Admin only. On success
 * the API process restarts itself within a second or two (backupService.js
 * — there's no safe in-process way to re-point the live connection at a
 * different file), so the caller should expect a brief window where
 * requests fail before things come back.
 */
export function restoreBackup(file) {
  return uploadFile('/api/settings/restore', file)
}
