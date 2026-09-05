import { ArrowRight, X } from 'lucide-react'
import { Card } from '../Card'
import Button from '../Button'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'

function formatDate(dateStr) {
  // Same UTC-shift fix as TaskCard/AdminDashboard — a bare "YYYY-MM-DD"
  // parses as UTC midnight otherwise, which can read as the previous day
  // in negative-offset timezones.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * "You didn't finish these" prompt on the staff dashboard — one row per
 * not-yet-started task (PENDING/BLOCKED) from an earlier day
 * (apps/api/src/services/taskService.js getCarryForwardCandidates), each
 * with its own add/dismiss so the list shrinks as they're resolved instead
 * of an all-or-nothing action. IN_PROGRESS tasks skip this prompt entirely
 * — useOwnTaskWorkflow.js already surfaces those directly, live, in the
 * main task list (no "do you still want this" decision needed for
 * something already underway).
 *
 * @param {{
 *   tasks: object[], categoriesById: Record<string, string>, busyTaskId?: string|null,
 *   onCarryForward: (taskId: string) => void, onDismiss: (taskId: string) => void,
 * }} props Renders nothing when `tasks` is empty — the caller doesn't need
 *   its own conditional around this.
 */
export default function CarryForwardList({ tasks, categoriesById, busyTaskId, onCarryForward, onDismiss }) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">
        Carried over from earlier
      </h2>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => {
          const busy = busyTaskId === task.taskId
          const categoryName = task.categoryId ? categoriesById[task.categoryId] : null

          return (
            <Card key={task.taskId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-body-md font-medium text-on-surface">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-body-sm text-on-surface-variant">{formatDate(task.taskDate)}</span>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {categoryName && (
                    <span className="text-label-md font-label uppercase text-on-surface-variant">
                      {categoryName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDismiss(task.taskId)}
                  aria-label={`Dismiss "${task.title}" — don't carry it forward`}
                  className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
                <Button size="sm" loading={busy} onClick={() => onCarryForward(task.taskId)}>
                  <ArrowRight className="size-4" aria-hidden="true" />
                  Add to today
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
