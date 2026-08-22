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
