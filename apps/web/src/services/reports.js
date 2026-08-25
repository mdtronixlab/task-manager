// Report service layer (rules.md §34) — architecture.md §13.

import { api, downloadFile } from './api'

function toQuery(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ).toString()
  return query ? `?${query}` : ''
}

/** GET /api/reports/daily — Super Admin only (phases.md Phase 4). */
export function getDailyReport() {
  return api.get('/api/reports/daily')
}

/** GET /api/reports — same shape as getDailyReport, over any period (phases.md Phase 6). */
export function getReport(params) {
  return api.get(`/api/reports${toQuery(params)}`)
}

/** GET /api/reports/trend — day-by-day completion series (phases.md Phase 6). */
export function getCompletionTrend(params) {
  return api.get(`/api/reports/trend${toQuery(params)}`)
}

/** GET /api/reports/export — downloads the individual tasks for the given
 * range/staff/department filters as an .xlsx file (same params as
 * getReport — the row-level counterpart to its aggregate counts). */
export function exportTasksReport(params) {
  return downloadFile(`/api/reports/export${toQuery(params)}`, 'tasks.xlsx')
}
