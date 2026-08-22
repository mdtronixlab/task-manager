// Category service layer (rules.md §34) — read-only for now; see
// apps/api/src/services/categoryService.js.

import { api } from './api'

export function getCategories() {
  return api.get('/api/categories')
}
