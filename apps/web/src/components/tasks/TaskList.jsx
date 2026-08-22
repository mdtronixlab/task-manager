import { ClipboardList } from 'lucide-react'
import EmptyState from '../EmptyState'
import Button from '../Button'
import TaskCard from './TaskCard'

/**
 * @param {{
 *   tasks: object[], categoriesById: Record<string, string>, busyTaskId?: string|null,
 *   onStatusChange?: (taskId: string, nextStatus: string) => void,
 *   onEdit?: (task: object) => void, onAddTask?: () => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function TaskList({
  tasks,
  categoriesById,
  busyTaskId,
  onStatusChange,
  onEdit,
  onAddTask,
  readOnly = false,
}) {
  if (tasks.length === 0) {
    return readOnly ? (
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
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.taskId}
          task={task}
          categoryName={task.categoryId ? categoriesById[task.categoryId] : null}
          busy={busyTaskId === task.taskId}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}
