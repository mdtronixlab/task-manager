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

// Mirrors the backend's authoritative transition map
// (apps/api/src/services/taskService.js TASK_STATUS_TRANSITIONS,
// rules.md §22) — this only decides which buttons to *show*; the backend
// independently re-validates every transition (architecture.md §12). Shared
// by TaskCard (inline actions) and TaskDetailModal (the same actions,
// surfaced again in the "manage task" view) so the two never drift apart.
export const TASK_STATUS_ACTIONS = {
  [TASK_STATUS.PENDING]: [{ label: 'Start', next: TASK_STATUS.IN_PROGRESS, variant: 'primary' }],
  [TASK_STATUS.IN_PROGRESS]: [
    { label: 'Complete', next: TASK_STATUS.COMPLETED, variant: 'primary' },
    { label: 'Block', next: TASK_STATUS.BLOCKED, variant: 'secondary' },
  ],
  [TASK_STATUS.BLOCKED]: [{ label: 'Resume', next: TASK_STATUS.IN_PROGRESS, variant: 'primary' }],
  [TASK_STATUS.COMPLETED]: [{ label: 'Reopen', next: TASK_STATUS.IN_PROGRESS, variant: 'ghost' }],
}
