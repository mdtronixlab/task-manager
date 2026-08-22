// Task service layer (rules.md §34) — architecture.md §13.

import { api } from './api'

/** @param {{date?: string, status?: string, priority?: string, categoryId?: string}} params */
export function getTasks(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString()
  return api.get(`/api/tasks${query ? `?${query}` : ''}`)
}

/** @param {{title: string, description?: string, priority?: string, categoryId?: string}} data */
export function createTask(data) {
  return api.post('/api/tasks', data)
}

/** @param {string} taskId @param {object} data Partial task fields to update. */
export function updateTask(taskId, data) {
  return api.patch(`/api/tasks/${taskId}`, data)
}
