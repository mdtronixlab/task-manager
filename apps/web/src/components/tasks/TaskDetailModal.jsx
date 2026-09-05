import Modal from '../Modal'
import Button from '../Button'
import { TASK_STATUS, TASK_STATUS_ACTIONS, TASK_STATUS_META } from '../../constants/taskStatus'
import { TASK_PRIORITY_META } from '../../constants/taskPriority'

// Time-only (matches TaskCard's own formatTime) — every ledger row below
// shares the Date row right above it, so a month/day prefix on each one
// would only repeat that and (on the org-wide TaskOverviewTable, where
// these rows sit inside a fixed-width modal) risk overflowing the row.
function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDate(dateStr) {
  // Same UTC-shift fix as TaskCard/AdminDashboard — a bare "YYYY-MM-DD"
  // parses as UTC midnight otherwise, which can read as the previous day
  // in negative-offset timezones.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
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

// Plain colored text + a solid dot — Badge's pill is deliberately dropped
// here (an "ops ledger" reads status/priority as compact inline text, not
// chips) but rules.md §10 still applies: status is never color-only, so the
// dot is always paired with the tone's own label text right next to it,
// never just a bare colored dot on its own.
const TONE_TEXT = {
  primary: 'text-tone-primary-text',
  success: 'text-tone-success-text',
  warning: 'text-tone-warning-text',
  error: 'text-tone-error-text',
  neutral: 'text-on-surface-variant',
}
const TONE_DOT_BG = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-on-surface-variant',
}

/**
 * "Manage task" detail view — opened by tapping a TaskCard (TaskList owns
 * the open/selected-task state). Shows everything the compact card can't
 * (full, untruncated title/description) and, outside `readOnly`, the same
 * status actions and edit entry point TaskCard offers inline — one place to
 * review a task and act on it instead of hunting for the right small button
 * on the card.
 *
 * Renders as a dense "ops ledger": a compact status/priority/category/staff
 * line under the title (Modal's own header — see below), then a note row
 * and a zebra-striped key:value table (Date/Due/Created/Started/Completed)
 * instead of separated cards — built for scanning one task fast, not
 * admiring it, since an admin/staff member opens many of these in a row.
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
 *   staffName?: string, busy?: boolean,
 *   onStatusChange?: (taskId: string, nextStatus: string) => void,
 *   onEdit?: (task: object) => void, onDelete?: (task: object) => void,
 *   readOnly?: boolean,
 * }} props `staffName` — who the task belongs to; only worth passing from an
 *   org-wide view (TaskOverviewTable) where that isn't already implicit, the
 *   way it is on a staff member's own TaskList. `onDelete` is optional even
 *   outside `readOnly` — omit it to show Edit only, same as TaskCard. Both
 *   Edit and the status actions are further guarded on `onEdit`/
 *   `onStatusChange` actually being passed — TaskOverviewTable reuses this
 *   modal without status actions (admins don't drive a task's status,
 *   staff do), so `readOnly` alone can't be the only gate here.
 */
export default function TaskDetailModal({
  open,
  onClose,
  task,
  categoryName,
  staffName,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
  readOnly = false,
}) {
  const actions = task && !readOnly && onStatusChange ? TASK_STATUS_ACTIONS[task.status] || [] : []
  const statusMeta = task ? TASK_STATUS_META[task.status] : null
  const priorityMeta = task ? TASK_PRIORITY_META[task.priority] : null

  // One dense table instead of Elevated Header's separate meta-grid +
  // activity-strip — Date/Due up top, then the task's own lifecycle,
  // Started/Completed only once they've actually happened (same
  // conditions the original dt/dd list used).
  const ledgerRows = task
    ? [
        { key: 'date', label: 'Date', value: formatDate(task.taskDate) },
        task.dueTime && { key: 'due', label: 'Due', value: formatDueTime(task.dueTime) },
        { key: 'created', label: 'Created', value: formatTime(task.createdAt) },
        task.startedAt && { key: 'started', label: 'Started', value: formatTime(task.startedAt) },
        task.status === TASK_STATUS.COMPLETED &&
          task.completedAt && { key: 'completed', label: 'Completed', value: formatTime(task.completedAt), tone: true },
      ].filter(Boolean)
    : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        // Modal's `title` just renders whatever it's given inside the
        // heading (no string-only assumption) — a composed dot+text node
        // gets the reference design's "dot beside the title" look without
        // touching Modal.jsx's shared chrome. Decorative only (aria-hidden):
        // the meta line below already states the status in words, so this
        // doesn't become the sole way status is conveyed (rules.md §10).
        task && (
          <span className="inline-flex items-center gap-2.5">
            <span
              className={`size-2.5 shrink-0 rounded-full ${TONE_DOT_BG[statusMeta?.tone] || TONE_DOT_BG.neutral}`}
              aria-hidden="true"
            />
            {task.title}
          </span>
        )
      }
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
          {task && !readOnly && onEdit && (
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
        <div className="flex flex-col gap-3">
          {/* Status label (as words — the dot beside the title above is
              decorative only, see its own comment) &middot; priority
              &middot; category &middot; staff, one dense line. Staff's own
              case is left alone (normal-case) — everyone else here is a
              short uppercase label, but a person's name isn't one. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-md font-label uppercase tracking-wide text-on-surface-variant">
            <span className={TONE_TEXT[statusMeta?.tone] || TONE_TEXT.neutral}>{statusMeta?.label}</span>
            {priorityMeta && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span className={TONE_TEXT[priorityMeta.tone] || TONE_TEXT.neutral}>{priorityMeta.label}</span>
              </>
            )}
            {categoryName && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>{categoryName}</span>
              </>
            )}
            {staffName && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span className="normal-case tracking-normal text-on-surface">{staffName}</span>
              </>
            )}
          </div>

          {task.description && (
            <div className="flex items-baseline gap-2 border-t border-outline-variant pt-3">
              <span className="shrink-0 text-label-sm font-label uppercase tracking-wide text-on-surface-variant">
                Note
              </span>
              <span className="text-body-sm text-on-surface">{task.description}</span>
            </div>
          )}

          {/* Two elements so the zebra-striped rows below can clip to the
              rounded corners (overflow-hidden) without also clipping the
              border/shadow the outer div carries — putting both on one div
              squares the outer edge off right at the row boundaries. */}
          <div className="neu-sm rounded-md">
            <div className="overflow-hidden rounded-md">
              {ledgerRows.map(({ key, label, value, tone }, index) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-2.5 text-body-sm ${
                    index > 0 ? 'border-t border-outline-variant/50' : ''
                  } ${index % 2 === 1 ? 'bg-on-surface-variant/5' : ''}`}
                >
                  <span className="text-label-sm font-label uppercase tracking-wide text-on-surface-variant">
                    {label}
                  </span>
                  <span
                    className={`font-label tabular-nums ${tone ? 'text-tone-success-text' : 'text-on-surface'}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
