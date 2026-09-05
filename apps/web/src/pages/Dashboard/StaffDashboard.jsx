import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOwnTaskWorkflow } from "../../hooks/useOwnTaskWorkflow";
import Button from "../../components/Button";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";
import EmptyState from "../../components/EmptyState";
import ConfirmDialog from "../../components/ConfirmDialog";
import TaskSummary from "../../components/dashboard/TaskSummary";
import TaskList from "../../components/tasks/TaskList";
import TaskFormModal from "../../components/tasks/TaskFormModal";
import CarryForwardList from "../../components/tasks/CarryForwardList";

// prd.md §6/§11 — the staff daily workflow: today's summary, add task,
// today's task list, status actions. Task date is never picked by the user
// — the backend resolves "today" itself (memory.md Decision 1). No greeting
// hero banner — the "Add Task" trigger lives on the Today's Tasks header
// instead (plus StaffLayout's mobile "+" quick-add, and TaskList's own
// empty-state button when there's nothing yet). The actual task workflow
// (data, modal/busy state, every handler) lives in useOwnTaskWorkflow,
// shared with MyTasksPage (an Admin's equivalent) — this file only owns the
// bits specific to being the staff dashboard: the layout below and the
// quickAddTask effect.
export default function StaffDashboard() {
  const { appUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
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
  } = useOwnTaskWorkflow(appUser.userId);

  // StaffLayout's mobile "+" quick-add button (AppShell's quickAction)
  // always routes here since this is the only page with the add-task
  // modal; it stamps a fresh `quickAddTask` value on navigation state so
  // this fires even when we were already on /dashboard (same pathname,
  // new state). Clears the state right after via `replace` so browser
  // back/forward — or a refresh — doesn't reopen the modal.
  useEffect(() => {
    if (!location.state?.quickAddTask) return;
    openAddModal();
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.quickAddTask]);

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <LoadingState label="Loading today's tasks…" />
      ) : error && tasks.length === 0 ? (
        <ErrorState description={error} onRetry={loadData} />
      ) : (
        <>
          <TaskSummary summary={summary} />

          {error && (
            <p
              role="alert"
              className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text"
            >
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
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-body-lg font-headline font-semibold text-on-surface">
                Today&rsquo;s Tasks
              </h2>
              {tasks.length > 0 && (
                <Button size="sm" onClick={openAddModal}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add Task
                </Button>
              )}
            </div>
            {allCaughtUp ? (
              <EmptyState
                icon={CheckCircle2}
                title="All done for today."
                description="Every task you added today is completed — find it in History."
              />
            ) : (
              <TaskList
                tasks={visibleTasks}
                categoriesById={categoriesById}
                busyTaskId={busyTaskId}
                onStatusChange={handleStatusChange}
                onEdit={openEditModal}
                onDelete={setDeletingTask}
                onAddTask={openAddModal}
              />
            )}
          </div>
        </>
      )}

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
  );
}
