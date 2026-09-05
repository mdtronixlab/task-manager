// Shared between StaffDashboard and AdminDashboard's own "My Tasks" section
// (both reduce a day's task list down to the same KPI row) — extracted here
// rather than duplicated so the two "what does my day look like" views stay
// in lockstep as the status set evolves.

import { TASK_STATUS } from '../constants/taskStatus'

export function summarizeTasks(tasks) {
  const total = tasks.length
  const completed = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length
  const pending = tasks.filter((t) => t.status === TASK_STATUS.PENDING).length
  const inProgress = tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length
  const blocked = tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, pending, inProgress, blocked, completionRate }
}
