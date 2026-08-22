// Activity log service layer (rules.md §34) — architecture.md §13.

import { api } from './api'

/** @param {{userId?: string, action?: string}} params */
export function getActivityLogs(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString()
  return api.get(`/api/activity-logs${query ? `?${query}` : ''}`)
}
