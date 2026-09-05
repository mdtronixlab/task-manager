import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getTasks,
  createTasks,
  updateTask,
  deleteTask,
  getCarryForwardCandidates,
  carryForwardTask,
  dismissCarryForward,
} from '../services/tasks'
import { getCategories } from '../services/categories'
import { TASK_STATUS, TASK_STATUS_META } from '../constants/taskStatus'
import { summarizeTasks } from '../utils/taskSummary'
import { useToast } from '../context/ToastContext'

/**
 * "My own tasks, today (plus anything still in progress from before today)"
 * workflow — the task list plus the carry-forward backlog, full status/
 * edit/delete actions, and the add/edit form's submit handling. Shared by
 * StaffDashboard (a STAFF member's whole dashboard) and MyTasksPage (an
 * Admin's own task page) — both need the exact same behaviour for what's
 * otherwise a per-role concept, so this exists in one place rather than
 * being hand-rolled twice and drifting (e.g. a new status-transition toast
 * added to one but not the other).
 *
 * `userId` is always passed to `getTasks` explicitly, even though a STAFF
 * caller doesn't strictly need it (taskService.js's getTasks ignores
 * `params.userId` for a non-elevated caller and always uses their own
 * identity) — an elevated caller (Admin, via MyTasksPage) does need it: an
 * omitted `userId` means "no filter, every org task today" for them, not
 * "just mine". Passing it unconditionally keeps this one call correct for
 * both callers without the hook needing to know the caller's role itself.
 *
 * @param {string} userId The signed-in user's own id.
 * @return Everything a page needs to render this workflow: `tasks` (today's
 *   own tasks, completed included, plus any of the caller's IN_PROGRESS
 *   tasks from an earlier day — each carried-over one flagged
 *   `isCarriedOver: true`, a client-only field TaskCard uses to show its
 *   real date — what `summary`'s KPIs count against), `visibleTasks` (the
 *   same list minus COMPLETED ones — completed tasks move to History
 *   instead of cluttering the "what's left" list; `allCaughtUp` is true
 *   when `tasks` isn't empty but `visibleTasks` is, so a page can render
 *   "all done" rather than the misleading "no tasks yet" empty state),
 *   `categories`, `candidates`, `categoriesById`,
 *   `summary`, `loading`, `error`, plus modal/busy state and every handler
 *   (openAddModal, openEditModal, closeModal, handleFormSubmit,
 *   handleDeleteConfirm, handleStatusChange, handleCarryForward,
 *   handleDismissCarryForward, setDeletingTask) and the raw `loadData` for
 *   a caller-specific refresh trigger (StaffDashboard's quickAddTask
 *   effect doesn't call this directly, but future callers might).
 */
export function useOwnTaskWorkflow(userId) {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [todayData, inProgressData, categoryData, candidateData] = await Promise.all([
        getTasks({ date: 'today', userId }),
        // No date/range param — getTasks only forces a date filter when one
        // is given, so this is every one of the caller's tasks that's
        // IN_PROGRESS, any day, unbounded. A task still being worked on
        // doesn't stop being relevant just because it wasn't started today;
        // unlike PENDING/BLOCKED carry-forward candidates (a separate,
        // explicit "do you still want this" prompt — see
        // getCarryForwardCandidates), it belongs directly in today's list,
        // live and actionable, with no "copy to today" step in between.
        getTasks({ userId, status: TASK_STATUS.IN_PROGRESS }),
        getCategories(),
        getCarryForwardCandidates(),
      ])
      // Today's own copy of an in-progress task (if any) already came back
      // from the first call — dedupe rather than exclude by date, since
      // "today" here would otherwise have to be re-derived client-side
      // from a value the backend already resolved once for the call above.
      const todayIds = new Set(todayData.map((t) => t.taskId))
      const carriedOver = inProgressData
        .filter((t) => !todayIds.has(t.taskId))
        // `isCarriedOver` is a client-only display flag (never sent to or
        // read from the API) — TaskCard uses it to show this task's actual
        // date, same as a History card would, since it isn't from today.
        .map((t) => ({ ...t, isCarriedOver: true }))
      setTasks([...carriedOver, ...todayData])
      setCategories(categoryData)
      setCandidates(candidateData)
    } catch (err) {
      setError(err.message || 'Could not load your tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const summary = useMemo(() => summarizeTasks(tasks), [tasks])
  // Completed tasks stay in `tasks` (so the KPI row and carry-forward logic
  // still see them) but drop out of the rendered list — once you're done
  // with something today, it belongs in History, not still taking up space
  // in the "what's left" view.
  const visibleTasks = useMemo(() => tasks.filter((t) => t.status !== TASK_STATUS.COMPLETED), [tasks])
  const allCaughtUp = tasks.length > 0 && visibleTasks.length === 0
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

  function closeModal() {
    setModalOpen(false)
  }

  async function handleFormSubmit(data) {
    setSubmitting(true)
    try {
      // TaskFormModal's creating flow always hands back an array now (its
      // multi-row "Add another task") — one entry even for a single task.
      if (editingTask) {
        await updateTask(editingTask.taskId, data)
        showToast('Task updated.')
      } else {
        await createTasks(data)
        showToast(data.length > 1 ? `${data.length} tasks added.` : 'Task added.')
      }
      setModalOpen(false)
      setEditingTask(null)
      await loadData()
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
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not delete the task. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleStatusChange(taskId, nextStatus) {
    setBusyTaskId(taskId)
    setError(null)
    try {
      await updateTask(taskId, { status: nextStatus })
      showToast(`Marked as ${TASK_STATUS_META[nextStatus].label}.`)
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not update the task. Please try again.')
    } finally {
      setBusyTaskId(null)
    }
  }

  // busyTaskId is reused here rather than a separate state — a candidate's
  // taskId is always from a past day, so it can never collide with an id
  // already in `tasks` (today's), and only one of these two lists' buttons
  // can be mid-request at a time anyway.
  async function handleCarryForward(taskId) {
    setBusyTaskId(taskId)
    setError(null)
    try {
      await carryForwardTask(taskId)
      showToast('Added to today.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not add that task to today. Please try again.')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleDismissCarryForward(taskId) {
    setBusyTaskId(taskId)
    setError(null)
    try {
      await dismissCarryForward(taskId)
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not dismiss that task. Please try again.')
    } finally {
      setBusyTaskId(null)
    }
  }

  return {
    tasks,
    visibleTasks,
    allCaughtUp,
    categories,
    candidates,
    categoriesById,
    summary,
    loading,
    error,
    modalOpen,
    editingTask,
    submitting,
    busyTaskId,
    deletingTask,
    deleting,
    loadData,
    openAddModal,
    openEditModal,
    closeModal,
    setDeletingTask,
    handleFormSubmit,
    handleDeleteConfirm,
    handleStatusChange,
    handleCarryForward,
    handleDismissCarryForward,
  }
}

export default useOwnTaskWorkflow
