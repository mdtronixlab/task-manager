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

function emptyForm() {
  return { title: '', description: '', priority: DEFAULT_TASK_PRIORITY, categoryId: '' }
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
 * }} props `task` present = editing; absent/null = creating.
 */
export default function TaskFormModal({ open, onClose, onSubmit, categories, task, submitting }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const isEditing = Boolean(task)

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
          }
        : emptyForm(),
    )
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
    setError(null)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        categoryId: form.categoryId || null,
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
