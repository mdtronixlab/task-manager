// Add/Edit task date picker (TaskFormModal) — memory.md Decision 1 used to
// mean staff/admins never picked a date at all; the picker now lets them
// backfill a missed day or plan ahead, but only within a bounded window so
// task lists can't be seeded arbitrarily far off. TASK_DATE_WINDOW_DAYS
// mirrors apps/api/src/lib/time.js's TASK_DATE_WINDOW_DAYS — this copy only
// drives the date input's min/max (a UI hint using the browser's own
// clock), the backend re-validates against its own org-timezone "today"
// and is the enforced copy (rules.md §18/§19 — the browser's clock is
// never trusted for enforcement, only for this kind of hint).
export const TASK_DATE_WINDOW_DAYS = 7

function toDateOnly(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** @return {string} The browser's local today, YYYY-MM-DD. */
export function todayLocal() {
  return toDateOnly(new Date())
}

/** @return {{min: string, max: string}} Date-input bounds, browser-local. */
export function taskDateBounds() {
  const min = new Date()
  min.setDate(min.getDate() - TASK_DATE_WINDOW_DAYS)
  const max = new Date()
  max.setDate(max.getDate() + TASK_DATE_WINDOW_DAYS)
  return { min: toDateOnly(min), max: toDateOnly(max) }
}

/**
 * A short "Sep 15" label for a taskDate that isn't today — for a toast
 * confirming where a just-added task landed, since a non-today date means
 * it won't show up in whatever "today" list the add form was opened from.
 * @param {string|undefined} dateStr YYYY-MM-DD
 * @return {string|null} null when dateStr is today (or missing) — nothing worth calling out.
 */
export function describeTaskDateIfNotToday(dateStr) {
  if (!dateStr || dateStr === todayLocal()) return null
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
