import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import EmptyState from '../EmptyState'
import Button from '../Button'
import TaskCard from './TaskCard'
import TaskDetailModal from './TaskDetailModal'

/**
 * @param {{
 *   tasks: object[], categoriesById: Record<string, string>, busyTaskId?: string|null,
 *   onStatusChange?: (taskId: string, nextStatus: string) => void,
 *   onEdit?: (task: object) => void, onDelete?: (task: object) => void,
 *   onAddTask?: () => void, readOnly?: boolean,
 * }} props Owns the "manage task" detail modal (TaskDetailModal) — opened by
 *   tapping any TaskCard — so every TaskList consumer (StaffDashboard,
 *   StaffHistoryPage) gets it for free without wiring its own state.
 */
export default function TaskList({
  tasks,
  categoriesById,
  busyTaskId,
  onStatusChange,
  onEdit,
  onDelete,
  onAddTask,
  readOnly = false,
}) {
  const [detailTask, setDetailTask] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function openDetail(task) {
    setDetailTask(task)
    setDetailOpen(true)
  }

  // The detail modal is rendered unconditionally below (not inside either
  // branch here) so it can't be yanked out from under itself mid-animation
  // if `tasks` empties out while it's open (e.g. a History filter change).
  return (
    <>
      {tasks.length === 0 ? (
        readOnly ? (
          <EmptyState
            icon={ClipboardList}
            title="No tasks found."
            description="Nothing matches this period and these filters."
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No tasks for today."
            description="Plan your work by adding your first task."
            action={<Button onClick={onAddTask}>+ Add Task</Button>}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              categoryName={task.categoryId ? categoriesById[task.categoryId] : null}
              busy={busyTaskId === task.taskId}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={openDetail}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <TaskDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        task={detailTask}
        categoryName={detailTask?.categoryId ? categoriesById[detailTask.categoryId] : null}
        busy={detailTask && busyTaskId === detailTask.taskId}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
        onDelete={onDelete}
        readOnly={readOnly}
      />
    </>
  )
}
