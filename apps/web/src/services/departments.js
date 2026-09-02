// Department service layer (rules.md §34) — see
// apps/api/src/services/departmentService.js.

import { api } from './api'

/** @param {{includeInactive?: boolean}} params includeInactive — Settings' management table, to see and re-enable a deactivated department. */
export function getDepartments(params = {}) {
  return api.get(`/api/departments${params.includeInactive ? '?includeInactive=true' : ''}`)
}

/** @param {{name: string, description?: string}} data Super Admin only. */
export function createDepartment(data) {
  return api.post('/api/departments', data)
}

/** @param {string} departmentId @param {{name?: string, description?: string, active?: boolean}} data Super Admin only. */
export function updateDepartment(departmentId, data) {
  return api.patch(`/api/departments/${departmentId}`, data)
}
