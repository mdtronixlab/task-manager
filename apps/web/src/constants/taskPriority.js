// Task priority model — rules.md §21, memory.md §9.
// Do not introduce additional priority values without updating this file,
// the backend, and the documentation together (rules.md §16).

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
}

export const DEFAULT_TASK_PRIORITY = TASK_PRIORITY.MEDIUM

// Visual language per design.md §7 — priority stays subtle; only HIGH and
// URGENT get a warning/error tone, LOW and MEDIUM stay neutral.
export const TASK_PRIORITY_META = {
  [TASK_PRIORITY.LOW]: { label: 'Low', tone: 'neutral' },
  [TASK_PRIORITY.MEDIUM]: { label: 'Medium', tone: 'neutral' },
  [TASK_PRIORITY.HIGH]: { label: 'High', tone: 'warning' },
  [TASK_PRIORITY.URGENT]: { label: 'Urgent', tone: 'error' },
}
