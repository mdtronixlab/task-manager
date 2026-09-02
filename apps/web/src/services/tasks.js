// Task service layer (rules.md §34) — architecture.md §13.

import { api } from './api'

/** @param {{date?: string, status?: string, priority?: string, categoryId?: string}} params */
export function getTasks(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString()
  return api.get(`/api/tasks${query ? `?${query}` : ''}`)
}

/** @param {{title: string, description?: string, priority?: string, categoryId?: string, dueTime?: string}} data */
export function createTask(data) {
  return api.post('/api/tasks', data)
}

/**
 * Creates several tasks at once (TaskFormModal's multi-row Add Task) —
 * there's no bulk endpoint, so this is just `createTask` fired in
 * parallel. Not atomic: if one rejects, whichever others already landed
 * stay created — acceptable for this scale (a handful of rows a staff
 * member is entering themselves, not an untrusted batch import).
 * @param {object[]} rows
 */
export function createTasks(rows) {
  return Promise.all(rows.map((row) => createTask(row)))
}

/**
 * Distinct past task titles for the current user (or, for a Super Admin,
 * the staff member named by `userId`), most-frequent first — powers the
 * Add Task form's title autocomplete.
 * @param {{userId?: string}} params
 */
export function getTaskTitleSuggestions(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString()
  return api.get(`/api/tasks/title-suggestions${query ? `?${query}` : ''}`)
}

/** @param {string} taskId @param {object} data Partial task fields to update. */
export function updateTask(taskId, data) {
  return api.patch(`/api/tasks/${taskId}`, data)
}

/** Soft-deletes a task — owner or Super Admin only (apps/api/src/services/taskService.js). */
export function deleteTask(taskId) {
  return api.delete(`/api/tasks/${taskId}`)
}

/** Past, unfinished tasks of the current user's that haven't been carried
 * forward or dismissed yet — see apps/api/src/services/taskService.js. */
export function getCarryForwardCandidates() {
  return api.get('/api/tasks/carry-forward-candidates')
}

/** Creates today's copy of a past unfinished task and marks the original resolved. */
export function carryForwardTask(taskId) {
  return api.post(`/api/tasks/${taskId}/carry-forward`)
}

/** Marks a past unfinished task as "not carrying this forward" — leaves it as-is. */
export function dismissCarryForward(taskId) {
  return api.post(`/api/tasks/${taskId}/dismiss-carry-forward`)
}
