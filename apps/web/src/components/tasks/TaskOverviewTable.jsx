import { useState } from 'react'
import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import EmptyState from '../EmptyState'
import TaskDetailModal from './TaskDetailModal'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Org-wide task list (phases.md Phase 4: "Admin can view all tasks";
 * filtering/history is Phase 5). Edit/delete act on any staff member's
 * task — the backend already allows a Super Admin to (taskService.js
 * updateTask/deleteTask's `isOwner || isAdmin` check); this just exposes
 * it here, same Pencil/Trash2 affordance as TaskCard's self-service view.
 *
 * Clicking a row (anywhere but the Edit/Delete buttons, which
 * stopPropagation) opens TaskDetailModal — the same "full task info" view
 * TaskCard/TaskList use, reused here rather than duplicated, minus status
 * actions (an admin edits a task's fields, not its status — that stays the
 * owning staff member's call). Owns that modal's open/selected-task state
 * itself, same reasoning as TaskList, so every TaskOverviewTable consumer
 * (TasksPage, StaffDetailPage, AdminDashboard) gets it for free.
 *
 * @param {{
 *   tasks: object[], staffById: Record<string,string>, categoriesById: Record<string,string>,
 *   onEdit?: (task: object) => void, onDelete?: (task: object) => void,
 * }} props Edit/delete columns — and the detail modal's Edit/Delete
 *   buttons — are omitted entirely when the handlers aren't passed (e.g.
 *   AdminDashboard's read-only "today, org-wide" view).
 */
export default function TaskOverviewTable({ tasks, staffById, categoriesById, onEdit, onDelete }) {
  const editable = Boolean(onEdit || onDelete)
  const [detailTask, setDetailTask] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function openDetail(task) {
    setDetailTask(task)
    setDetailOpen(true)
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks recorded today."
        description="Tasks staff create today will appear here."
      />
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Created</TableHead>
            {editable && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.taskId}
              onClick={() => openDetail(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                // Only react to Enter/Space landing on the row itself — this
                // also catches the same keydown bubbling up from a nested
                // Edit/Delete button, which would otherwise get preventDefault()'d
                // here and never fire its own click-on-Enter/Space activation.
                if (event.target !== event.currentTarget) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                openDetail(task)
              }}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <TableCell className="max-w-xs truncate">{task.title}</TableCell>
              <TableCell>{staffById[task.userId] || task.userId}</TableCell>
              <TableCell>{task.categoryId ? categoriesById[task.categoryId] || '—' : '—'}</TableCell>
              <TableCell>
                <PriorityBadge priority={task.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={task.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatTime(task.createdAt)}</TableCell>
              {editable && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
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
                    )}
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
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TaskDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        task={detailTask}
        categoryName={detailTask?.categoryId ? categoriesById[detailTask.categoryId] : null}
        staffName={detailTask ? staffById[detailTask.userId] || detailTask.userId : null}
        onEdit={onEdit}
        onDelete={onDelete}
        readOnly={!editable}
      />
    </>
  )
}
