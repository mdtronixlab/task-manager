import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Input from '../Input'
import Select from '../Select'
import Button from '../Button'
import { ROLES } from '../../constants/roles'

const ROLE_OPTIONS = [
  { value: ROLES.STAFF, label: 'Staff' },
  { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
]

function emptyForm() {
  return { name: '', email: '', role: ROLES.STAFF, departmentId: '', designation: '' }
}

/**
 * Add-user form (prd.md §4.1 "Add staff"). Google sign-in is the only auth
 * method (rules.md §11) — this pre-authorizes an email to sign in, it
 * doesn't set a password. Whatever name is entered is just a placeholder;
 * the real Google profile name/avatar overwrite it on first login
 * (apps/api/src/middleware/auth.js).
 *
 * @param {{
 *   open: boolean, onClose: () => void, onSubmit: (data: object) => Promise<void>,
 *   departments: {departmentId: string, name: string}[], submitting?: boolean,
 * }} props
 */
export default function UserFormModal({ open, onClose, onSubmit, departments, submitting }) {
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
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setError(null)
    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        departmentId: form.departmentId || null,
        designation: form.designation.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Could not add the user. Please try again.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add user"
      description="They'll sign in with this exact Google email — there's no password to set."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={submitting} loadingText="Adding…">
            Add user
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={updateField('name')}
          maxLength={100}
          placeholder="e.g. Priya Sharma"
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={updateField('email')}
          maxLength={200}
          placeholder="name@company.com"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Role" value={form.role} onChange={updateField('role')} options={ROLE_OPTIONS} />
          <Select
            label="Department"
            value={form.departmentId}
            onChange={updateField('departmentId')}
            options={[
              { value: '', label: 'No department' },
              ...departments.map((d) => ({ value: d.departmentId, label: d.name })),
            ]}
          />
        </div>
        <Input
          label="Designation"
          value={form.designation}
          onChange={updateField('designation')}
          maxLength={100}
          placeholder="e.g. Developer (optional)"
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
