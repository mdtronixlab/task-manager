// User service layer (rules.md §34) — architecture.md §13. Both are Super
// Admin only, enforced server-side.

import { api } from './api'

export function getUsers() {
  return api.get('/api/users')
}

/** @param {{name: string, email: string, role: string, departmentId?: string, designation?: string, phone?: string, weeklyOff?: string[]}} data */
export function createUser(data) {
  return api.post('/api/users', data)
}

/**
 * @param {string} userId
 * @param {{name?: string, role?: string, departmentId?: string|null, designation?: string|null, phone?: string|null, weeklyOff?: string[], active?: boolean}} data
 *   Partial — only send the fields being changed. Server blocks a Super
 *   Admin deactivating or demoting their own account.
 */
export function updateUser(userId, data) {
  return api.patch(`/api/users/${userId}`, data)
}

/** POST /api/users/:userId/test-whatsapp — sends a real WhatsApp message to that user right now, to confirm their number works. */
export function sendTestWhatsApp(userId) {
  return api.post(`/api/users/${userId}/test-whatsapp`)
}

/**
 * GET /api/users/admin-visibility — Super Admin only. Every Admin's
 * currently-granted-visible-Admins, as `{ [viewerUserId]: string[] }`.
 */
export function getAdminVisibility() {
  return api.get('/api/users/admin-visibility')
}

/**
 * PUT /api/users/:userId/admin-visibility — Super Admin only. Replaces the
 * full set of other Admins' userIds `userId` (an Admin) may see tasks for.
 */
export function setAdminVisibility(userId, visibleAdminIds) {
  return api.put(`/api/users/${userId}/admin-visibility`, { visibleAdminIds })
}
