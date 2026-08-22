import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTasks } from '../../services/tasks'
import { getUsers } from '../../services/users'
import { getDepartments } from '../../services/departments'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import { ROLES } from '../../constants/roles'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

// prd.md §13 / phases.md Phase 5 — combinable org-wide task filters,
// answering "what happened across the organisation in period X". Read-only
// (no status actions) — same reasoning as the dashboard's task overview.
export default function TasksPage() {
  const [filters, setFilters] = useState(defaultTaskFilters)
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.categoryId, c.name])),
    [categories],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">Tasks</h1>
        <p className="text-body-md text-on-surface-variant">Browse and filter tasks across the organisation.</p>
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
    </div>
  )
}
