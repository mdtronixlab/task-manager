import { useCallback, useEffect, useState } from 'react'
import { getTasks, updateTask, deleteTask } from '../../services/tasks'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import { useToast } from '../../context/ToastContext'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskList from '../../components/tasks/TaskList'
import TaskFormModal from '../../components/tasks/TaskFormModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

// prd.md §11 "Staff... View their own task history" / architecture.md §2's
// /tasks/history route. getTasks already forces STAFF requests to their own
// userId regardless of params (rules.md §13) — no userId is passed here at
// all, so this reuses that guarantee rather than re-deriving it.
//
// Editable (title/description/priority/category/due time) and deletable,
// same as TasksPage.jsx's org-wide table — the backend's updateTask/
// deleteTask never restricted this to today's tasks in the first place
// (isOwner || isAdmin, no date check), so this was always a frontend-only
// restriction. No status actions here, though (Start/Complete/Block don't
// map cleanly onto a task from a past day) and no Add Task — this stays a
// browse-and-correct view of what already happened, not where a new task
// gets entered; that's the dashboard's job, "today" only.
export default function StaffHistoryPage() {
  // "Today" already has its own place (the dashboard) — history exists for
  // everything before that, so start one step back rather than repeating it.
  // (Also where today's now-completed tasks live — the dashboard hides
  // those once done, per useOwnTaskWorkflow's `visibleTasks`.)
  const [filters, setFilters] = useState({ ...defaultTaskFilters(), range: 'thisWeek' })
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingTask, setDeletingTask] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  const loadCategories = useCallback(async () => {
    setCategories(await getCategories())
  }, [])

  const loadTasks = useCallback(async (currentFilters) => {
    setLoading(true)
    setError(null)
    try {
      setTasks(await getTasks(buildTaskQueryParams(currentFilters)))
    } catch (err) {
      setError(err.message || 'Could not load your history. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadTasks(filters)
  }, [filters, loadTasks])

  const categoriesById = Object.fromEntries(categories.map((c) => [c.categoryId, c.name]))

  function openEditModal(task) {
    setEditingTask(task)
    setModalOpen(true)
  }

  async function handleFormSubmit(data) {
    setSubmitting(true)
    try {
      await updateTask(editingTask.taskId, data)
      showToast('Task updated.')
      setModalOpen(false)
      setEditingTask(null)
      await loadTasks(filters)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingTask) return
    setDeleting(true)
    try {
      await deleteTask(deletingTask.taskId)
      showToast('Task deleted.')
      setDeletingTask(null)
      await loadTasks(filters)
    } catch (err) {
      setError(err.message || 'Could not delete the task. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">History</h1>
        <p className="text-body-md text-on-surface-variant">Your past tasks, by date, status, or priority.</p>
      </div>

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        showStaffFilter={false}
        showDepartmentFilter={false}
      />

      {loading ? (
        <LoadingState label="Loading history…" />
      ) : error ? (
        <ErrorState description={error} onRetry={() => loadTasks(filters)} />
      ) : (
        <TaskList
          tasks={tasks}
          categoriesById={categoriesById}
          onEdit={openEditModal}
          onDelete={setDeletingTask}
          showDate
        />
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        categories={categories}
        task={editingTask}
        submitting={submitting}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete this task?"
        description={deletingTask ? `"${deletingTask.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        busy={deleting}
        danger
      />
    </div>
  )
}
