import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getCarryForwardCandidates,
  carryForwardTask,
  dismissCarryForward,
} from "../../services/tasks";
import { getCategories } from "../../services/categories";
import { TASK_STATUS, TASK_STATUS_META } from "../../constants/taskStatus";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/Button";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";
import ConfirmDialog from "../../components/ConfirmDialog";
import TaskSummary from "../../components/dashboard/TaskSummary";
import TaskList from "../../components/tasks/TaskList";
import TaskFormModal from "../../components/tasks/TaskFormModal";
import CarryForwardList from "../../components/tasks/CarryForwardList";

function summarize(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(
    (t) => t.status === TASK_STATUS.COMPLETED,
  ).length;
  const pending = tasks.filter((t) => t.status === TASK_STATUS.PENDING).length;
  const inProgress = tasks.filter(
    (t) => t.status === TASK_STATUS.IN_PROGRESS,
  ).length;
  const blocked = tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, inProgress, blocked, completionRate };
}

// prd.md §6/§11 — the staff daily workflow: today's summary, add task,
// today's task list, status actions. Task date is never picked by the user
// — the backend resolves "today" itself (memory.md Decision 1). No greeting
// hero banner — the "Add Task" trigger lives on the Today's Tasks header
// instead (plus StaffLayout's mobile "+" quick-add, and TaskList's own
// empty-state button when there's nothing yet).
export default function StaffDashboard() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, categoryData, candidateData] = await Promise.all([
        getTasks({ date: "today" }),
        getCategories(),
        getCarryForwardCandidates(),
      ]);
      setTasks(taskData);
      setCategories(categoryData);
      setCandidates(candidateData);
    } catch (err) {
      setError(err.message || "Could not load your tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const summary = useMemo(() => summarize(tasks), [tasks]);
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.categoryId, c.name])),
    [categories],
  );

  function openAddModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleFormSubmit(data) {
    setSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.taskId, data);
        showToast("Task updated.");
      } else {
        await createTask(data);
        showToast("Task added.");
      }
      setModalOpen(false);
      setEditingTask(null);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      await deleteTask(deletingTask.taskId);
      showToast("Task deleted.");
      setDeletingTask(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not delete the task. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(taskId, nextStatus) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      await updateTask(taskId, { status: nextStatus });
      showToast(`Marked as ${TASK_STATUS_META[nextStatus].label}.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not update the task. Please try again.");
    } finally {
      setBusyTaskId(null);
    }
  }

  // busyTaskId is reused here rather than a separate state — a candidate's
  // taskId is always from a past day, so it can never collide with an id
  // already in `tasks` (today's), and only one of these two lists' buttons
  // can be mid-request at a time anyway.
  async function handleCarryForward(taskId) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      await carryForwardTask(taskId);
      showToast("Added to today.");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not add that task to today. Please try again.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDismissCarryForward(taskId) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      await dismissCarryForward(taskId);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not dismiss that task. Please try again.");
    } finally {
      setBusyTaskId(null);
    }
  }

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
        </>
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
        description={deletingTask ? `"${deletingTask.title}" will be removed from your task list.` : undefined}
        confirmLabel="Delete"
        busy={deleting}
        danger
      />
    </div>
  );
}
