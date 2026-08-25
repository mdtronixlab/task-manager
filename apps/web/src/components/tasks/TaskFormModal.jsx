import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Input from '../Input'
import Textarea from '../Textarea'
import Select from '../Select'
import Button from '../Button'
import { TASK_PRIORITY, TASK_PRIORITY_META, DEFAULT_TASK_PRIORITY } from '../../constants/taskPriority'

const PRIORITY_OPTIONS = Object.values(TASK_PRIORITY).map((value) => ({
  value,
  label: TASK_PRIORITY_META[value].label,
}))

function emptyForm(staffOptions) {
  // Pre-select when there's exactly one choice (StaffDetailPage passes a
  // single-staff-member list — the assignee is already implied by the
  // page, so there's nothing to actually pick) — otherwise force a real
  // choice (TasksPage's full staff list starts unselected).
  return {
    title: '',
    description: '',
    priority: DEFAULT_TASK_PRIORITY,
    categoryId: '',
    userId: staffOptions?.length === 1 ? staffOptions[0].userId : '',
  }
}

/**
 * Add/Edit task form (phases.md Phase 3 — fields: Title, Description,
 * Priority, Category). Task date and status are never set here — the
 * backend owns taskDate (memory.md Decision 1) and status changes go
 * through the dedicated action buttons on `TaskCard`, not this form.
 *
 * @param {{
 *   open: boolean, onClose: () => void, onSubmit: (data: object) => Promise<void>,
 *   categories: {categoryId: string, name: string}[], task?: object|null, submitting?: boolean,
 *   staffOptions?: {userId: string, name: string}[],
 * }} props `task` present = editing; absent/null = creating. `staffOptions`
 *   is Admin-only — TasksPage/StaffDetailPage pass the assignable staff
 *   list, which adds an "Assign to" field (required) and folds `userId`
 *   into onSubmit's payload; StaffDashboard (self-service) omits it
 *   entirely and the field never renders. Reassigning an *existing* task's
 *   owner isn't in scope — the field only shows up when creating.
 */
export default function TaskFormModal({ open, onClose, onSubmit, categories, task, submitting, staffOptions }) {
  const [form, setForm] = useState(() => emptyForm(staffOptions))
  const [error, setError] = useState(null)
  const isEditing = Boolean(task)
  const showAssignee = Boolean(staffOptions) && !isEditing

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      task
        ? {
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            categoryId: task.categoryId || '',
            userId: '',
          }
        : emptyForm(staffOptions),
    )
    // staffOptions is only re-passed as a genuinely new array when the
    // page's own staff data reloads, not every render — safe to leave out
    // of the deps without risking a stale list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (showAssignee && !form.userId) {
      setError('Choose who this task is for.')
      return
    }
    setError(null)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        categoryId: form.categoryId || null,
        ...(showAssignee ? { userId: form.userId } : {}),
      })
    } catch (err) {
      setError(err.message || 'Could not save the task. Please try again.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit task' : 'Add task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={submitting} loadingText="Saving…">
            {isEditing ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {showAssignee && (
          <Select
            label="Assign to"
            required
            value={form.userId}
            onChange={updateField('userId')}
            options={[
              { value: '', label: 'Choose a staff member' },
              ...staffOptions.map((s) => ({ value: s.userId, label: s.name })),
            ]}
          />
        )}
        <Input
          label="Title"
          required
          value={form.title}
          onChange={updateField('title')}
          maxLength={200}
          placeholder="e.g. Prepare client quotation"
          autoFocus
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={updateField('description')}
          maxLength={2000}
          placeholder="Optional details…"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Priority"
            value={form.priority}
            onChange={updateField('priority')}
            options={PRIORITY_OPTIONS}
          />
          <Select
            label="Category"
            value={form.categoryId}
            onChange={updateField('categoryId')}
            options={[
              { value: '', label: 'No category' },
              ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
            ]}
          />
        </div>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
