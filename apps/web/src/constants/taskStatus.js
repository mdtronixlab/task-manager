// Task status model — rules.md §20, memory.md §8.
// Do not introduce additional status values without updating this file,
// the backend, and the documentation together (rules.md §16).

export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
}

// Semantic colour mapping per design.md §6. Status must never be
// communicated by colour alone — `label` is always rendered alongside
// `tone` (rules.md §10).
export const TASK_STATUS_META = {
  [TASK_STATUS.PENDING]: { label: 'Pending', tone: 'warning' },
  [TASK_STATUS.IN_PROGRESS]: { label: 'In Progress', tone: 'primary' },
  [TASK_STATUS.COMPLETED]: { label: 'Completed', tone: 'success' },
  [TASK_STATUS.BLOCKED]: { label: 'Blocked', tone: 'error' },
}
