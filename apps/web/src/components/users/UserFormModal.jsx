import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Input from '../Input'
import Select from '../Select'
import Button from '../Button'
import { ROLES } from '../../constants/roles'
import { WEEKDAYS } from '../../constants/weekdays'

const ROLE_OPTIONS = [
  { value: ROLES.STAFF, label: 'Staff' },
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
]

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

function emptyForm() {
  return {
    name: '',
    email: '',
    role: ROLES.STAFF,
    departmentId: '',
    designation: '',
    phone: '',
    weeklyOff: [],
    active: true,
  }
}

function formFromUser(user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId || '',
    designation: user.designation || '',
    phone: user.phone || '',
    weeklyOff: user.weeklyOff || [],
    active: user.active,
  }
}

/**
 * Add/Edit user form (prd.md §4.1 "Add/manage staff"). Google sign-in is
 * the only auth method (rules.md §11) — there's no password. Whatever name
 * is entered on *add* is just a placeholder; the real Google profile name/
 * avatar overwrite it on first login (apps/api/src/middleware/auth.js).
 * Email is the sign-in identity, so it's fixed once created — not
 * editable, and updateUser doesn't accept it.
 *
 * @param {{
 *   open: boolean, onClose: () => void, onSubmit: (data: object) => Promise<void>,
 *   departments: {departmentId: string, name: string}[], user?: object|null, submitting?: boolean,
 * }} props `user` present = editing (adds Active, drops the create-only
 *   description); absent/null = creating.
 */
export default function UserFormModal({ open, onClose, onSubmit, departments, user, submitting }) {
  const isEditing = Boolean(user)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(user ? formFromUser(user) : emptyForm())
    setError(null)
  }, [open, user])

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function toggleWeeklyOff(day) {
    setForm((prev) => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day) ? prev.weeklyOff.filter((d) => d !== day) : [...prev.weeklyOff, day],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim() || (!isEditing && !form.email.trim())) {
      setError('Name and email are required.')
      return
    }
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        departmentId: form.departmentId || null,
        designation: form.designation.trim() || null,
        phone: form.phone.trim() || null,
        weeklyOff: form.weeklyOff,
      }
      if (isEditing) {
        payload.active = form.active === true || form.active === 'true'
      } else {
        payload.email = form.email.trim()
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err.message || `Could not ${isEditing ? 'update' : 'add'} the user. Please try again.`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit user' : 'Add user'}
      description={isEditing ? undefined : "They'll sign in with this exact Google email — there's no password to set."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={submitting} loadingText="Saving…">
            {isEditing ? 'Save changes' : 'Add user'}
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
          disabled={isEditing}
          hint={isEditing ? "Sign-in identity — can't be changed here." : undefined}
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
        <Input
          label="WhatsApp number"
          value={form.phone}
          onChange={updateField('phone')}
          maxLength={20}
          placeholder="e.g. 9776373738 (optional)"
          hint="Just the 10-digit number — country code is added automatically. Enables WhatsApp reminders and task-assigned messages for this person."
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium text-on-surface">Weekly off</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const selected = form.weeklyOff.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeeklyOff(day.value)}
                  aria-pressed={selected}
                  className={[
                    'rounded-md border px-2.5 py-1.5 text-body-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-tone-primary-bg text-tone-primary-text'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest',
                  ].join(' ')}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
          <p className="text-body-sm text-on-surface-variant">
            No WhatsApp reminders or broadcasts go to this person on the days picked here.
          </p>
        </div>
        {isEditing && (
          <Select
            label="Status"
            value={String(form.active)}
            onChange={updateField('active')}
            options={STATUS_OPTIONS}
            hint="An inactive user can't sign in and stops receiving reminders."
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
