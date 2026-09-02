import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { getUsers } from '../../services/users'
import { getTasks, createTasks } from '../../services/tasks'
import { getCategories } from '../../services/categories'
import { defaultTaskFilters, buildTaskQueryParams } from '../../utils/taskFilters'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/Button'
import TaskFilters from '../../components/tasks/TaskFilters'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'
import TaskFormModal from '../../components/tasks/TaskFormModal'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import Badge from '../../components/Badge'

// phases.md Phase 5 — "Admin can select a staff member and inspect
// historical tasks." Reached from a Staff Overview row (dashboard); the
// Staff filter is hidden here since it's implied by the route.
export default function StaffDetailPage() {
  const { userId } = useParams()
  const [staffMember, setStaffMember] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [filters, setFilters] = useState(defaultTaskFilters)
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  const loadReferenceData = useCallback(async () => {
    const [users, categoryData] = await Promise.all([getUsers(), getCategories()])
    const found = users.find((u) => u.userId === userId) || null
    setStaffMember(found)
    setNotFound(!found)
    setCategories(categoryData)
  }, [userId])

  const loadTasks = useCallback(
    async (currentFilters) => {
      setLoading(true)
      setError(null)
      try {
        setTasks(await getTasks({ ...buildTaskQueryParams(currentFilters), userId }))
      } catch (err) {
        setError(err.message || 'Could not load tasks. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    loadTasks(filters)
  }, [filters, loadTasks])

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.categoryId, c.name])),
    [categories],
  )
  const staffById = useMemo(
    () => (staffMember ? { [staffMember.userId]: staffMember.name } : {}),
    [staffMember],
  )

  async function handleAddTask(data) {
    setSubmitting(true)
    try {
      // TaskFormModal's creating flow always hands back an array now (its
      // multi-row "Add another task") — one entry even for a single task.
      await createTasks(data)
      showToast(data.length > 1 ? `${data.length} tasks added.` : 'Task added.')
      setModalOpen(false)
      await loadTasks(filters)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      {notFound ? (
        <ErrorState title="Staff member not found." description="They may have been removed." />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-headline-lg font-headline text-on-surface">
                {staffMember?.name || 'Loading…'}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                {staffMember?.email}
                {staffMember && !staffMember.active && (
                  <Badge tone="neutral" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </p>
            </div>
            {/* Assigning a new task to a disabled account is rejected
                server-side (taskService.js's createTask) — no point
                offering the button for one. */}
            {staffMember?.active && (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add Task
              </Button>
            )}
          </div>

          <TaskFilters
            filters={filters}
            onChange={setFilters}
            categories={categories}
            showStaffFilter={false}
            showDepartmentFilter={false}
          />

          {loading ? (
            <LoadingState label="Loading tasks…" />
          ) : error ? (
            <ErrorState description={error} onRetry={() => loadTasks(filters)} />
          ) : (
            <TaskOverviewTable tasks={tasks} staffById={staffById} categoriesById={categoriesById} />
          )}

          {staffMember?.active && (
            <TaskFormModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddTask}
              categories={categories}
              submitting={submitting}
              staffOptions={[staffMember]}
            />
          )}
        </>
      )}
    </div>
  )
}
