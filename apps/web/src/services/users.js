// User service layer (rules.md §34) — architecture.md §13. Both are Super
// Admin only, enforced server-side.

import { api } from './api'

export function getUsers() {
  return api.get('/api/users')
}

/** @param {{name: string, email: string, role: string, departmentId?: string, designation?: string}} data */
export function createUser(data) {
  return api.post('/api/users', data)
}

/**
 * @param {string} userId
 * @param {{name?: string, role?: string, departmentId?: string|null, designation?: string|null, active?: boolean}} data
 *   Partial — only send the fields being changed. Server blocks a Super
 *   Admin deactivating or demoting their own account.
 */
export function updateUser(userId, data) {
  return api.patch(`/api/users/${userId}`, data)
}
