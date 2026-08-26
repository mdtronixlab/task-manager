import Modal from '../Modal'
import Button from '../Button'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import { TASK_STATUS, TASK_STATUS_ACTIONS } from '../../constants/taskStatus'

function formatDateTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(dateStr) {
  // Same UTC-shift fix as TaskCard/AdminDashboard — a bare "YYYY-MM-DD"
  // parses as UTC midnight otherwise, which can read as the previous day
  // in negative-offset timezones.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

/** "14:30" -> "2:30 PM" — same reasoning as TaskCard's formatDueTime. */
function formatDueTime(hhmm) {
  if (!hhmm) return null
  return new Date(`2000-01-01T${hhmm}:00`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * "Manage task" detail view — opened by tapping a TaskCard (TaskList owns
 * the open/selected-task state). Shows everything the compact card can't
 * (full, untruncated title/description) and, outside `readOnly`, the same
 * status actions and edit entry point TaskCard offers inline — one place to
 * review a task and act on it instead of hunting for the right small button
 * on the card.
 *
 * `readOnly` (history views, prd.md §10 "should not be casually modified")
 * drops both, leaving a plain read-only view.
 *
 * `task` can go null slightly before `open` goes false (TaskList clears its
 * selected task synchronously on close) — Modal keeps this mounted a beat
 * longer than that for its own exit animation, so every task-dependent bit
 * below is guarded rather than assuming `task` is always there while
 * rendering; nothing here should throw with `task` as null.
 *
 * @param {{
 *   open: boolean, onClose: () => void, task: object|null, categoryName?: string,
 *   busy?: boolean, onStatusChange?: (taskId: string, nextStatus: string) => void,
 *   onEdit?: (task: object) => void, onDelete?: (task: object) => void,
 *   readOnly?: boolean,
 * }} props `onDelete` is optional even outside `readOnly` — omit it to show
 *   Edit only, same as TaskCard.
 */
export default function TaskDetailModal({
  open,
  onClose,
  task,
  categoryName,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
  readOnly = false,
}) {
  const actions = task && !readOnly ? TASK_STATUS_ACTIONS[task.status] || [] : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task?.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {task && !readOnly && onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(task)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          {task && !readOnly && (
            <Button
              variant="secondary"
              onClick={() => {
                onEdit(task)
                onClose()
              }}
            >
              Edit
            </Button>
          )}
          {task &&
            actions.map((action) => (
              <Button
                key={action.next}
                variant={action.variant}
                loading={busy}
                onClick={() => {
                  onStatusChange(task.taskId, action.next)
                  onClose()
                }}
              >
                {action.label}
              </Button>
            ))}
        </>
      }
    >
      {task && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {categoryName && (
              <span className="text-label-md font-label uppercase text-on-surface-variant">{categoryName}</span>
            )}
          </div>

          {task.description && (
            <p className="whitespace-pre-wrap text-body-sm text-on-surface-variant">{task.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
            <dt className="text-on-surface-variant">Date</dt>
            <dd className="text-on-surface">{formatDate(task.taskDate)}</dd>

            {task.dueTime && (
              <>
                <dt className="text-on-surface-variant">Due</dt>
                <dd className="text-on-surface">{formatDueTime(task.dueTime)}</dd>
              </>
            )}

            <dt className="text-on-surface-variant">Created</dt>
            <dd className="text-on-surface">{formatDateTime(task.createdAt)}</dd>

            {task.startedAt && (
              <>
                <dt className="text-on-surface-variant">Started</dt>
                <dd className="text-on-surface">{formatDateTime(task.startedAt)}</dd>
              </>
            )}

            {task.status === TASK_STATUS.COMPLETED && task.completedAt && (
              <>
                <dt className="text-on-surface-variant">Completed</dt>
                <dd className="text-on-surface">{formatDateTime(task.completedAt)}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </Modal>
  )
}
