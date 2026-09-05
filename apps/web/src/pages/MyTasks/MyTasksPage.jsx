import { useAuth } from '../../context/AuthContext'
import { useOwnTaskWorkflow } from '../../hooks/useOwnTaskWorkflow'
import FloatingActionButton from '../../components/FloatingActionButton'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import ConfirmDialog from '../../components/ConfirmDialog'
import TaskSummary from '../../components/dashboard/TaskSummary'
import TaskList from '../../components/tasks/TaskList'
import TaskFormModal from '../../components/tasks/TaskFormModal'
import CarryForwardList from '../../components/tasks/CarryForwardList'

/**
 * An Admin's own task workflow — App.jsx gates this route to ROLES.ADMIN
 * only (a Super Admin's role is oversight, not doing tasks themselves; see
 * AdminLayout.jsx's nav-link gating for the same split). Same "today's
 * work" shape as StaffDashboard — summary, carry-forward backlog, a task
 * list with full status actions — both built on useOwnTaskWorkflow so the
 * two stay in lockstep, but its own page rather than folded into
 * AdminDashboard's org-wide view, so an admin's personal to-do list
 * doesn't get lost among everyone else's tasks, and "Add Task" is a
 * floating button here instead of a header button that only appears once
 * the list isn't empty.
 */
export default function MyTasksPage() {
  const { appUser } = useAuth()
  const {
    tasks,
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
  } = useOwnTaskWorkflow(appUser.userId)

  if (loading) {
    return <LoadingState label="Loading your tasks…" className="min-h-[50vh]" />
  }

  if (error && tasks.length === 0) {
    return <ErrorState description={error} onRetry={loadData} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">My Tasks</h1>
        <p className="text-body-md text-on-surface-variant">Your own tasks for today.</p>
      </div>

      <TaskSummary summary={summary} />

      {error && (
        <p role="alert" className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text">
          {error}
        </p>
      )}

      <CarryForwardList
        tasks={candidates}
        categoriesById={categoriesById}
        busyTaskId={busyTaskId}
        onCarryForward={handleCarryForward}
        onDismiss={handleDismissCarryForward}
      />

      <div>
        <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">Today&rsquo;s Tasks</h2>
        <TaskList
          tasks={tasks}
          categoriesById={categoriesById}
          busyTaskId={busyTaskId}
          onStatusChange={handleStatusChange}
          onEdit={openEditModal}
          onDelete={setDeletingTask}
          onAddTask={openAddModal}
        />
      </div>

      <FloatingActionButton onClick={openAddModal} label="Add task" />

      <TaskFormModal
        open={modalOpen}
        onClose={closeModal}
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
        description={deletingTask ? `"${deletingTask.title}" will be removed from your task list.` : undefined}
        confirmLabel="Delete"
        busy={deleting}
        danger
      />
    </div>
  )
}
