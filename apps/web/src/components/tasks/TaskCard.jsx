import { Pencil } from 'lucide-react'
import { Card } from '../Card'
import Button from '../Button'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import { TASK_STATUS, TASK_STATUS_ACTIONS } from '../../constants/taskStatus'

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
 *   onEdit?: (task: object) => void, onView?: (task: object) => void,
 *   readOnly?: boolean,
 * }} props `readOnly` drops the edit button and status actions and shows
 *   the task's date — for history views (prd.md §10: "Historical tasks may
 *   be viewed but should not be casually modified"), where cards span
 *   multiple days so the date can't stay implicit like it can on "today."
 *   `onView` opens the full "manage task" detail modal (TaskDetailModal, via
 *   TaskList) on a click anywhere on the card that isn't the edit button or
 *   a status action — those stopPropagation so they fire their own action
 *   instead of also opening the detail modal underneath it.
 */
export default function TaskCard({ task, categoryName, busy, onStatusChange, onEdit, onView, readOnly = false }) {
  const actions = readOnly ? [] : TASK_STATUS_ACTIONS[task.status] || []

  return (
    <Card
      interactive={Boolean(onView)}
      onClick={onView ? () => onView(task) : undefined}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onKeyDown={
        onView
          ? (event) => {
              // Card renders a plain div, not a real <button> — a real one
              // can't wrap the edit/status-action buttons inside it (nested
              // interactive elements are invalid HTML), so Enter/Space
              // activation has to be done by hand here instead of coming
              // free from the browser.
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onView(task)
            }
          : undefined
      }
      className={[
        'flex flex-col gap-3 p-4',
        onView ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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
            onClick={(event) => {
              event.stopPropagation()
              onEdit(task)
            }}
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
              onClick={(event) => {
                event.stopPropagation()
                onStatusChange(task.taskId, action.next)
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
