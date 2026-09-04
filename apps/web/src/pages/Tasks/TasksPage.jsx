import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { getTasks, createTasks, updateTask, deleteTask } from '../../services/tasks'
import { getUsers } from '../../services/users'
import { getDepartments } from '../../services/departments'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import { ROLES } from '../../constants/roles'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/Button'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'
import TaskFormModal from '../../components/tasks/TaskFormModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

// prd.md §13 / phases.md Phase 5 — combinable org-wide task filters,
// answering "what happened across the organisation in period X". Admin can
// add a new task for any staff member (staffOptions prop) and, per rules.md
// §14's full Super Admin authority, edit or delete any staff member's task
// here too — the backend already allowed both (taskService.js's
// isOwner || isAdmin), this just exposes it.
export default function TasksPage() {
  const [filters, setFilters] = useState(defaultTaskFilters)
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingTask, setDeletingTask] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()
  const { appUser } = useAuth()

  const loadReferenceData = useCallback(async () => {
    const [users, departmentData, categoryData] = await Promise.all([
      getUsers(),
      getDepartments(),
      getCategories(),
    ])
    // Staff filter/assign-to lists are staff-role users plus the signed-in
    // Super Admin themselves — taskService.js's createTask already lets an
    // admin own tasks (targetUserId defaults to the caller), this just
    // surfaces that: without it, a Super Admin's own tasks exist in the
    // backend but never appear in this filter or the "Assign to" picker.
    // Other admins are deliberately excluded — createTask only allows
    // assigning to a STAFF member or yourself.
    setStaff(users.filter((u) => u.role === ROLES.STAFF || u.userId === appUser?.userId))
    setDepartments(departmentData)
    setCategories(categoryData)
  }, [appUser?.userId])

  const loadTasks = useCallback(async (currentFilters) => {
    setLoading(true)
    setError(null)
    try {
      setTasks(await getTasks(buildTaskQueryParams(currentFilters)))
    } catch (err) {
      setError(err.message || 'Could not load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    loadTasks(filters)
  }, [filters, loadTasks])

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.userId, s.name])), [staff])
  // The browse/filter dropdown above (TaskFilters) keeps inactive staff
  // visible — useful for filtering historical tasks by someone since
  // deactivated — but the assign-to picker shouldn't offer them: the
  // backend rejects assigning a new task to a disabled account.
  const assignableStaff = useMemo(() => staff.filter((s) => s.active), [staff])
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.categoryId, c.name])),
    [categories],
  )

  function openAddModal() {
    setEditingTask(null)
    setModalOpen(true)
  }

  function openEditModal(task) {
    setEditingTask(task)
    setModalOpen(true)
  }

  async function handleFormSubmit(data) {
    setSubmitting(true)
    try {
      if (editingTask) {
        await updateTask(editingTask.taskId, data)
        showToast('Task updated.')
      } else {
        // TaskFormModal's creating flow always hands back an array now
        // (its multi-row "Add another task") — one entry even for a
        // single task.
        await createTasks(data)
        showToast(data.length > 1 ? `${data.length} tasks added.` : 'Task added.')
      }
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline text-on-surface">Tasks</h1>
          <p className="text-body-md text-on-surface-variant">Browse and filter tasks across the organisation.</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="size-4" aria-hidden="true" />
          Add Task
        </Button>
      </div>

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        staff={staff}
        departments={departments}
        categories={categories}
      />

      {loading ? (
        <LoadingState label="Loading tasks…" />
      ) : error ? (
        <ErrorState description={error} onRetry={() => loadTasks(filters)} />
      ) : (
        <TaskOverviewTable
          tasks={tasks}
          staffById={staffById}
          categoriesById={categoriesById}
          onEdit={openEditModal}
          onDelete={setDeletingTask}
        />
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        categories={categories}
        task={editingTask}
        submitting={submitting}
        staffOptions={assignableStaff}
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
