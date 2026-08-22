import { Pencil } from 'lucide-react'
import { Card } from '../Card'
import Button from '../Button'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import { TASK_STATUS } from '../../constants/taskStatus'

// Mirrors the backend's authoritative transition map
// (apps/api/src/services/taskService.js TASK_STATUS_TRANSITIONS,
// rules.md §22) — this only decides which buttons to *show*; the backend
// independently re-validates every transition (architecture.md §12).
const STATUS_ACTIONS = {
  [TASK_STATUS.PENDING]: [{ label: 'Start', next: TASK_STATUS.IN_PROGRESS, variant: 'primary' }],
  [TASK_STATUS.IN_PROGRESS]: [
    { label: 'Complete', next: TASK_STATUS.COMPLETED, variant: 'primary' },
    { label: 'Block', next: TASK_STATUS.BLOCKED, variant: 'secondary' },
  ],
  [TASK_STATUS.BLOCKED]: [{ label: 'Resume', next: TASK_STATUS.IN_PROGRESS, variant: 'primary' }],
  [TASK_STATUS.COMPLETED]: [{ label: 'Reopen', next: TASK_STATUS.IN_PROGRESS, variant: 'ghost' }],
}

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDate(dateStr) {
  // Appending a local midnight time avoids the UTC-shift bug where parsing
  // a bare "YYYY-MM-DD" string reads as UTC (same fix as AdminDashboard.jsx).
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * @param {{
 *   task: object, categoryName?: string, busy?: boolean,
 *   onStatusChange?: (taskId: string, nextStatus: string) => void,
 *   onEdit?: (task: object) => void,
 *   readOnly?: boolean,
 * }} props `readOnly` drops the edit button and status actions and shows
 *   the task's date — for history views (prd.md §10: "Historical tasks may
 *   be viewed but should not be casually modified"), where cards span
 *   multiple days so the date can't stay implicit like it can on "today."
 */
export default function TaskCard({ task, categoryName, busy, onStatusChange, onEdit, readOnly = false }) {
  const actions = readOnly ? [] : STATUS_ACTIONS[task.status] || []

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-body-md font-medium text-on-surface">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-body-sm text-on-surface-variant">{task.description}</p>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            className="shrink-0 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {categoryName && (
          <span className="text-label-md font-label uppercase text-on-surface-variant">
            {categoryName}
          </span>
        )}
      </div>

      <p className="text-body-sm text-on-surface-variant">
        {readOnly && <>{formatDate(task.taskDate)} · </>}
        Created {formatTime(task.createdAt)}
        {task.status === TASK_STATUS.COMPLETED && task.completedAt && (
          <> · Completed {formatTime(task.completedAt)}</>
        )}
      </p>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map((action) => (
            <Button
              key={action.next}
              size="sm"
              variant={action.variant}
              loading={busy}
              onClick={() => onStatusChange(task.taskId, action.next)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
