import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import Modal from '../Modal'
import Input from '../Input'
import Textarea from '../Textarea'
import Select from '../Select'
import Button from '../Button'
import { TASK_PRIORITY, TASK_PRIORITY_META, DEFAULT_TASK_PRIORITY } from '../../constants/taskPriority'
import { getTaskTitleSuggestions } from '../../services/tasks'

const PRIORITY_OPTIONS = Object.values(TASK_PRIORITY).map((value) => ({
  value,
  label: TASK_PRIORITY_META[value].label,
}))

const TITLE_SUGGESTIONS_LIST_ID = 'task-title-suggestions'

let rowIdCounter = 0
function emptyRow() {
  rowIdCounter += 1
  return {
    id: rowIdCounter,
    title: '',
    description: '',
    priority: DEFAULT_TASK_PRIORITY,
    categoryId: '',
    dueTime: '',
  }
}

function rowFromTask(task) {
  return {
    id: 'editing',
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    categoryId: task.categoryId || '',
    dueTime: task.dueTime || '',
  }
}

/**
 * Add/Edit task form (phases.md Phase 3 — fields: Title, Description,
 * Priority, Category, Due time). Task date and status are never set here —
 * the backend owns taskDate (memory.md Decision 1) and status changes go
 * through the dedicated action buttons on `TaskCard`, not this form. Due
 * time is optional (prd.md §25 V2) — when set, taskDueReminderService sends
 * a push notification to the task's owner at that org-local time.
 *
 * Two extras on top of the original single-task form: the title field
 * autocompletes from the assignee's own past task titles (staff tend to
 * re-enter the same recurring tasks daily — getTaskTitleSuggestions), and
 * — creating only, not editing — "+ Add another task" lets several tasks
 * go in with one Assign-to/Save round trip instead of reopening the dialog
 * per task.
 *
 * @param {{
 *   open: boolean, onClose: () => void,
 *   onSubmit: (data: object | object[]) => Promise<void>,
 *   categories: {categoryId: string, name: string}[], task?: object|null, submitting?: boolean,
 *   staffOptions?: {userId: string, name: string}[],
 * }} props `task` present = editing (onSubmit gets one plain object, same
 *   as before); absent/null = creating (onSubmit always gets an array, one
 *   entry per row — even when there's only one). `staffOptions` is
 *   Admin-only — TasksPage/StaffDetailPage pass the assignable staff list,
 *   which adds an "Assign to" field (required, one choice for the whole
 *   batch) and folds `userId` into every row's payload; StaffDashboard
 *   (self-service) omits it entirely and the field never renders.
 *   Reassigning an *existing* task's owner isn't in scope — the field only
 *   shows up when creating.
 */
export default function TaskFormModal({ open, onClose, onSubmit, categories, task, submitting, staffOptions }) {
  const isEditing = Boolean(task)
  const showAssignee = Boolean(staffOptions) && !isEditing
  const singleAssignee = showAssignee && staffOptions.length === 1 ? staffOptions[0].userId : ''

  const [rows, setRows] = useState(() => [emptyRow()])
  const [userId, setUserId] = useState('')
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!open) return
    setError(null)
    setRows([task ? rowFromTask(task) : emptyRow()])
    setUserId(singleAssignee)
    // staffOptions/task are only re-passed as genuinely new values when the
    // page's own data reloads, not every render — safe to leave out of the
    // deps without risking staleness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  // Refetches suggestions when the modal opens and again whenever the
  // effective target user changes (an admin picking a different assignee
  // should see *that* person's recurring titles, not the previous pick's).
  // requestIdRef guards against an in-flight request from a fast assignee
  // switch resolving after a newer one and clobbering the current list.
  useEffect(() => {
    if (!open) return
    if (showAssignee && !userId) {
      setSuggestions([])
      return
    }
    const requestId = ++requestIdRef.current
    getTaskTitleSuggestions(showAssignee ? { userId } : {})
      .then((titles) => {
        if (requestIdRef.current === requestId) setSuggestions(titles)
      })
      .catch(() => {
        // Autocomplete is a convenience, not a requirement — a failed fetch
        // just means no suggestions this time, not a form error.
      })
  }, [open, showAssignee, userId])

  function updateRow(id, field) {
    return (event) => {
      const value = event.target.value
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
    }
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(id) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev))
  }

  function isBlankRow(row) {
    return !row.title.trim() && !row.description.trim() && !row.categoryId && !row.dueTime
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (showAssignee && !userId) {
      setError('Choose who this task is for.')
      return
    }

    // A row left completely untouched (added via "+ Add another task" then
    // never filled in) is dropped silently rather than forcing a title on
    // it or blocking the rows that *are* filled in.
    const candidateRows = isEditing ? rows : rows.filter((row) => !isBlankRow(row))
    if (candidateRows.length === 0) {
      setError('Add at least one task.')
      return
    }
    const emptyTitleRow = candidateRows.find((row) => !row.title.trim())
    if (emptyTitleRow) {
      setError('Every task needs a title.')
      return
    }

    const payloads = candidateRows.map((row) => ({
      title: row.title.trim(),
      description: row.description.trim(),
      priority: row.priority,
      categoryId: row.categoryId || null,
      dueTime: row.dueTime || null,
      ...(showAssignee ? { userId } : {}),
    }))

    try {
      await onSubmit(isEditing ? payloads[0] : payloads)
    } catch (err) {
      setError(err.message || 'Could not save the task. Please try again.')
    }
  }

  const taskCount = rows.length

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
            {isEditing ? 'Save changes' : taskCount > 1 ? `Add ${taskCount} tasks` : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {showAssignee && (
          <Select
            label="Assign to"
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={[
              { value: '', label: 'Choose a staff member' },
              ...staffOptions.map((s) => ({ value: s.userId, label: s.name })),
            ]}
          />
        )}

        {rows.map((row, index) => (
          <div
            key={row.id}
            className={
              rows.length > 1
                ? 'flex flex-col gap-4 rounded-lg border border-outline-variant p-4'
                : 'flex flex-col gap-4'
            }
          >
            {rows.length > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-on-surface-variant">Task {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remove task ${index + 1}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
            <Input
              label="Title"
              required
              value={row.title}
              onChange={updateRow(row.id, 'title')}
              maxLength={200}
              placeholder="e.g. Prepare client quotation"
              list={TITLE_SUGGESTIONS_LIST_ID}
              autoFocus={index === 0}
            />
            <Textarea
              label="Description"
              value={row.description}
              onChange={updateRow(row.id, 'description')}
              maxLength={2000}
              placeholder="Optional details…"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Priority"
                value={row.priority}
                onChange={updateRow(row.id, 'priority')}
                options={PRIORITY_OPTIONS}
              />
              <Select
                label="Category"
                value={row.categoryId}
                onChange={updateRow(row.id, 'categoryId')}
                options={[
                  { value: '', label: 'No category' },
                  ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
                ]}
              />
            </div>
            <Input
              type="time"
              label="Due time"
              hint="Optional — you'll get a notification at this time."
              value={row.dueTime}
              onChange={updateRow(row.id, 'dueTime')}
            />
          </div>
        ))}

        {!isEditing && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow} className="self-start">
            <Plus className="size-4" aria-hidden="true" />
            Add another task
          </Button>
        )}

        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
      </form>

      <datalist id={TITLE_SUGGESTIONS_LIST_ID}>
        {suggestions.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </Modal>
  )
}
