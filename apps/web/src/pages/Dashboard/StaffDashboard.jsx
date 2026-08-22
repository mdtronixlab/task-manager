import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { getTasks, createTask, updateTask } from "../../services/tasks";
import { getCategories } from "../../services/categories";
import { TASK_STATUS, TASK_STATUS_META } from "../../constants/taskStatus";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/Button";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";
import TaskSummary from "../../components/dashboard/TaskSummary";
import TaskList from "../../components/tasks/TaskList";
import TaskFormModal from "../../components/tasks/TaskFormModal";

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

// prd.md §6/§11 — the staff daily workflow: greeting, today's summary, add
// task, today's task list, status actions. Task date is never picked by the
// user — the backend resolves "today" itself (memory.md Decision 1).
export default function StaffDashboard() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, categoryData] = await Promise.all([
        getTasks({ date: "today" }),
        getCategories(),
      ]);
      setTasks(taskData);
      setCategories(categoryData);
    } catch (err) {
      setError(err.message || "Could not load your tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* <h1 className="text-headline-lg font-headline text-on-surface">
            Good day, {appUser.name.split(' ')[0]} 👋
          </h1> */}
          <p className="text-body-md text-on-surface-variant">{today}</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="size-4" aria-hidden="true" />
          Add Task
        </Button>
      </div>

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

          <div>
            <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">
              Today&rsquo;s Tasks
            </h2>
            <TaskList
              tasks={tasks}
              categoriesById={categoriesById}
              busyTaskId={busyTaskId}
              onStatusChange={handleStatusChange}
              onEdit={openEditModal}
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
    </div>
  );
}
