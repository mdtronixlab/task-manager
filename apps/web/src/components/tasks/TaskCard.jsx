import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '../Card'
import Button from '../Button'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import { TASK_STATUS, TASK_STATUS_ACTIONS } from '../../constants/taskStatus'

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "14:30" -> "2:30 PM" — dueTime is stored as a bare "HH:mm" (validate.js),
 * not an ISO instant, so it's parsed against an arbitrary local date purely
 * to borrow Intl's am/pm formatting rather than hand-rolling it. */
function formatDueTime(hhmm) {
  if (!hhmm) return null
  return new Date(`2000-01-01T${hhmm}:00`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
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
 *   onEdit?: (task: object) => void, onDelete?: (task: object) => void,
 *   onView?: (task: object) => void, readOnly?: boolean, showDate?: boolean,
 * }} props `readOnly` drops the edit/delete buttons and status actions
 *   entirely, for a genuinely view-only list. `showDate` is independent of
 *   that — StaffHistoryPage is editable (rules.md §25-adjacent: the backend
 *   never actually restricted editing to today's tasks, only this UI did)
 *   but still spans multiple days, so its cards need the date shown same as
 *   a read-only history view would; `readOnly` alone sets `showDate` true
 *   too, so a future genuinely-read-only multi-day list doesn't need both.
 *   `task.isCarriedOver` (useOwnTaskWorkflow.js) also forces the date on,
 *   card by card, on an otherwise same-day list — an in-progress task from
 *   an earlier day mixed in among today's own still needs to say which day
 *   it's actually from.
 *   Status actions additionally need `onStatusChange` actually passed —
 *   StaffHistoryPage omits it (Start/Complete/Block don't map cleanly onto
 *   a task from a past day), and without this guard they'd render anyway
 *   and throw on click instead of just not appearing.
 *   `onDelete` is optional even outside `readOnly` — omit it to show edit
 *   only. `onView` opens the full "manage task" detail modal (TaskDetailModal,
 *   via TaskList) on a click anywhere on the card that isn't the edit/delete
 *   button or a status action — those stopPropagation so they fire their own
 *   action instead of also opening the detail modal underneath it.
 */
export default function TaskCard({
  task,
  categoryName,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
  readOnly = false,
  showDate = false,
}) {
  const actions = !readOnly && onStatusChange ? TASK_STATUS_ACTIONS[task.status] || [] : []

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
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(task)
              }}
              aria-label={`Edit ${task.title}`}
              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(task)
                }}
                aria-label={`Delete ${task.title}`}
                className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-tone-error-bg hover:text-tone-error-text"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
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
        {(readOnly || showDate || task.isCarriedOver) && <>{formatDate(task.taskDate)} · </>}
        Created {formatTime(task.createdAt)}
        {task.dueTime && <> · Due {formatDueTime(task.dueTime)}</>}
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
