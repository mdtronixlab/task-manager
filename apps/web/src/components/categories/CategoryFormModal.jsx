import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Input from '../Input'
import Textarea from '../Textarea'
import Select from '../Select'
import Button from '../Button'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

function emptyForm() {
  return { name: '', description: '', active: true }
}

function formFromCategory(category) {
  return { name: category.name, description: category.description || '', active: category.active }
}

/**
 * Add/Edit category form — the task category picker's source (rules.md
 * §14 Super Admin capability, previously read-only).
 * @param {{
 *   open: boolean, onClose: () => void, onSubmit: (data: object) => Promise<void>,
 *   category?: object|null, submitting?: boolean,
 * }} props `category` present = editing (adds Active); absent/null = creating.
 */
export default function CategoryFormModal({ open, onClose, onSubmit, category, submitting }) {
  const isEditing = Boolean(category)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(category ? formFromCategory(category) : emptyForm())
    setError(null)
  }, [open, category])

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setError(null)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() }
      if (isEditing) payload.active = form.active === true || form.active === 'true'
      await onSubmit(payload)
    } catch (err) {
      setError(err.message || `Could not ${isEditing ? 'update' : 'add'} the category. Please try again.`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit category' : 'Add category'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={submitting} loadingText="Saving…">
            {isEditing ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={updateField('name')}
          maxLength={100}
          placeholder="e.g. Technical"
          autoFocus
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={updateField('description')}
          maxLength={500}
          placeholder="Optional…"
        />
        {isEditing && (
          <Select
            label="Status"
            value={String(form.active)}
            onChange={updateField('active')}
            options={STATUS_OPTIONS}
            hint="An inactive category is hidden from the Add Task picker but stays on existing tasks."
          />
        )}
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
