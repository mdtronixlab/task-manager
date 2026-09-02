// Category service layer (rules.md §34) — see
// apps/api/src/services/categoryService.js.

import { api } from './api'

/** @param {{includeInactive?: boolean}} params includeInactive — Settings' management table, to see and re-enable a deactivated category. */
export function getCategories(params = {}) {
  return api.get(`/api/categories${params.includeInactive ? '?includeInactive=true' : ''}`)
}

/** @param {{name: string, description?: string}} data Super Admin only. */
export function createCategory(data) {
  return api.post('/api/categories', data)
}

/** @param {string} categoryId @param {{name?: string, description?: string, active?: boolean}} data Super Admin only. */
export function updateCategory(categoryId, data) {
  return api.patch(`/api/categories/${categoryId}`, data)
}
