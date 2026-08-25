import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { getTasks, createTask } from '../../services/tasks'
import { getUsers } from '../../services/users'
import { getDepartments } from '../../services/departments'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import { ROLES } from '../../constants/roles'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/Button'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'
import TaskFormModal from '../../components/tasks/TaskFormModal'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

// prd.md §13 / phases.md Phase 5 — combinable org-wide task filters,
// answering "what happened across the organisation in period X". The task
// list itself stays read-only here (no status actions — same reasoning as
// the dashboard's task overview) but Admin can add a new one for any staff
// member via the modal below (staffOptions prop), unlike a staff member's
// own dashboard where there's nobody else to assign to.
export default function TasksPage() {
  const [filters, setFilters] = useState(defaultTaskFilters)
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  const loadReferenceData = useCallback(async () => {
    const [users, departmentData, categoryData] = await Promise.all([
      getUsers(),
      getDepartments(),
      getCategories(),
    ])
    setStaff(users.filter((u) => u.role === ROLES.STAFF))
    setDepartments(departmentData)
    setCategories(categoryData)
  }, [])

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

  async function handleAddTask(data) {
    setSubmitting(true)
    try {
      await createTask(data)
      showToast('Task added.')
      setModalOpen(false)
      await loadTasks(filters)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline text-on-surface">Tasks</h1>
          <p className="text-body-md text-on-surface-variant">Browse and filter tasks across the organisation.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
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
        <TaskOverviewTable tasks={tasks} staffById={staffById} categoriesById={categoriesById} />
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddTask}
        categories={categories}
        submitting={submitting}
        staffOptions={assignableStaff}
      />
    </div>
  )
}
