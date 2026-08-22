import { useCallback, useEffect, useState } from 'react'
import { getTasks } from '../../services/tasks'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskList from '../../components/tasks/TaskList'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

// prd.md §11 "Staff... View their own task history" / architecture.md §2's
// /tasks/history route. getTasks already forces STAFF requests to their own
// userId regardless of params (rules.md §13) — no userId is passed here at
// all, so this reuses that guarantee rather than re-deriving it. Read-only
// (TaskList/TaskCard readOnly) — prd.md §10: past tasks may be viewed but
// shouldn't be casually modified.
export default function StaffHistoryPage() {
  // "Today" already has its own place (the dashboard) — history exists for
  // everything before that, so start one step back rather than repeating it.
  const [filters, setFilters] = useState({ ...defaultTaskFilters(), range: 'thisWeek' })
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        <TaskList tasks={tasks} categoriesById={categoriesById} readOnly />
      )}
    </div>
  )
}
