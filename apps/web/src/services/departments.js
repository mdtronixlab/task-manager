// Department service layer (rules.md §34) — see
// apps/api/src/services/departmentService.js.

import { api } from './api'

export function getDepartments() {
  return api.get('/api/departments')
}

/** @param {{name: string, description?: string}} data Super Admin only. */
export function createDepartment(data) {
  return api.post('/api/departments', data)
}
