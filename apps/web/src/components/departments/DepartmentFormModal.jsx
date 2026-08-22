import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Input from '../Input'
import Textarea from '../Textarea'
import Button from '../Button'

function emptyForm() {
  return { name: '', description: '' }
}

/** @param {{open: boolean, onClose: () => void, onSubmit: (data: object) => Promise<void>, submitting?: boolean}} props */
export default function DepartmentFormModal({ open, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setError(null)
  }, [open])

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
      await onSubmit({ name: form.name.trim(), description: form.description.trim() })
    } catch (err) {
      setError(err.message || 'Could not add the department. Please try again.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add department"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" loading={submitting} loadingText="Adding…">
            Add department
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={updateField('name')}
          maxLength={100}
          placeholder="e.g. Sales"
          autoFocus
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={updateField('description')}
          maxLength={500}
          placeholder="Optional…"
        />
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
