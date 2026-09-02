import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Trash2, UserPlus, FolderPlus, Tag, Pencil } from 'lucide-react'
import { useBranding } from '../../context/BrandingContext'
import { useToast } from '../../context/ToastContext'
import { updateLogo, removeLogo } from '../../services/settings'
import { getUsers, createUser, updateUser } from '../../services/users'
import { getDepartments, createDepartment, updateDepartment } from '../../services/departments'
import { getCategories, createCategory, updateCategory } from '../../services/categories'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import Logo from '../../components/Logo'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import UserFormModal from '../../components/users/UserFormModal'
import DepartmentFormModal from '../../components/departments/DepartmentFormModal'
import CategoryFormModal from '../../components/categories/CategoryFormModal'
import NotificationComposerCard from '../../components/notifications/NotificationComposerCard'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

/** Small icon-button used as each management table row's "Edit" action. */
function EditButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
    >
      <Pencil className="size-4" aria-hidden="true" />
    </button>
  )
}

// architecture.md §2 /settings route — Branding, Team, Departments,
// Categories, and the notification composer. Every management table here
// supports add + edit (including reactivating/deactivating) — a Super
// Admin has full control over org data (rules.md §14), short of hard-
// deleting anything with historical records attached (memory.md Decision
// 3) — deactivating is the "removal" primitive throughout.
export default function SettingsPage() {
  const { logoUrl, applicationName, refresh } = useBranding()
  const { showToast } = useToast()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef(null)

  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState(null)

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [savingUser, setSavingUser] = useState(false)

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [savingDept, setSavingDept] = useState(false)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [savingCategory, setSavingCategory] = useState(false)

  const departmentsById = Object.fromEntries(departments.map((d) => [d.departmentId, d.name]))

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setTeamError(null)
    try {
      const [userData, departmentData, categoryData] = await Promise.all([
        getUsers(),
        getDepartments({ includeInactive: true }),
        getCategories({ includeInactive: true }),
      ])
      setUsers(userData)
      setDepartments(departmentData)
      setCategories(categoryData)
    } catch (err) {
      setTeamError(err.message || 'Could not load the team. Please try again.')
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  function openAddUser() {
    setEditingUser(null)
    setUserModalOpen(true)
  }

  function openEditUser(user) {
    setEditingUser(user)
    setUserModalOpen(true)
  }

  async function handleSubmitUser(data) {
    setSavingUser(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.userId, data)
        showToast('User updated.')
      } else {
        await createUser(data)
        showToast(`${data.name} added.`)
      }
      setUserModalOpen(false)
      setEditingUser(null)
      await loadTeam()
    } finally {
      setSavingUser(false)
    }
  }

  function openAddDepartment() {
    setEditingDept(null)
    setDeptModalOpen(true)
  }

  function openEditDepartment(department) {
    setEditingDept(department)
    setDeptModalOpen(true)
  }

  async function handleSubmitDepartment(data) {
    setSavingDept(true)
    try {
      if (editingDept) {
        await updateDepartment(editingDept.departmentId, data)
        showToast('Department updated.')
      } else {
        await createDepartment(data)
        showToast(`${data.name} department added.`)
      }
      setDeptModalOpen(false)
      setEditingDept(null)
      await loadTeam()
    } finally {
      setSavingDept(false)
    }
  }

  function openAddCategory() {
    setEditingCategory(null)
    setCategoryModalOpen(true)
  }

  function openEditCategory(category) {
    setEditingCategory(category)
    setCategoryModalOpen(true)
  }

  async function handleSubmitCategory(data) {
    setSavingCategory(true)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.categoryId, data)
        showToast('Category updated.')
      } else {
        await createCategory(data)
        showToast(`${data.name} category added.`)
      }
      setCategoryModalOpen(false)
      setEditingCategory(null)
      await loadTeam()
    } finally {
      setSavingCategory(false)
    }
  }

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Logo must be a PNG, JPEG, WEBP, or SVG image.')
      resetFileInput()
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be 2MB or smaller.')
      resetFileInput()
      return
    }

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.onerror = () => setError('Could not read that file. Please try again.')
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    setError(null)
    try {
      await updateLogo(preview)
      await refresh()
      setPreview(null)
      resetFileInput()
      showToast('Logo updated.')
    } catch (err) {
      setError(err.message || 'Could not save the logo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancelPreview() {
    setPreview(null)
    setError(null)
    resetFileInput()
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    try {
      await removeLogo()
      await refresh()
      setPreview(null)
      resetFileInput()
      showToast('Custom logo removed.')
    } catch (err) {
      setError(err.message || 'Could not remove the logo. Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">Settings</h1>
        <p className="text-body-md text-on-surface-variant">{applicationName}</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Replace the default mark with your organisation&rsquo;s logo. PNG, JPEG, WEBP, or SVG
            — up to 2MB. Shown in the header for every signed-in user.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low p-2">
              {preview ? (
                <img src={preview} alt="New logo preview" className="max-h-full max-w-full object-contain" />
              ) : (
                <Logo showWordmark={false} size="lg" />
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" aria-hidden="true" />
                Choose image
              </Button>
              {logoUrl && !preview && (
                <Button variant="ghost" size="sm" onClick={handleRemove} loading={removing} loadingText="Removing…">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove custom logo
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text">
              {error}
            </p>
          )}
        </CardContent>
        {preview && (
          <CardFooter>
            <Button variant="secondary" onClick={handleCancelPreview} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} loadingText="Saving…">
              Save logo
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Team</CardTitle>
              <CardDescription>
                Registered users — sign-in is Google only, so adding someone here just
                pre-authorizes their email; there&rsquo;s nothing else for them to set up.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddUser} className="shrink-0">
              <UserPlus className="size-4" aria-hidden="true" />
              Add user
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <LoadingState label="Loading team…" />
          ) : teamError ? (
            <ErrorState description={teamError} onRetry={loadTeam} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium text-on-surface">{u.name}</TableCell>
                    <TableCell className="text-on-surface-variant">{u.email}</TableCell>
                    <TableCell>
                      <Badge tone={u.role === 'SUPER_ADMIN' ? 'primary' : 'neutral'}>
                        {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-on-surface-variant">
                      {u.departmentId ? departmentsById[u.departmentId] || '—' : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditButton onClick={() => openEditUser(u)} label={`Edit ${u.name}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Used to group staff and filter tasks/reports by team.</CardDescription>
            </div>
            <Button size="sm" onClick={openAddDepartment} className="shrink-0">
              <FolderPlus className="size-4" aria-hidden="true" />
              Add department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <LoadingState label="Loading departments…" />
          ) : teamError ? (
            <ErrorState description={teamError} onRetry={loadTeam} />
          ) : departments.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No departments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.departmentId}>
                    <TableCell className="font-medium text-on-surface">{d.name}</TableCell>
                    <TableCell className="text-on-surface-variant">{d.description || '—'}</TableCell>
                    <TableCell>
                      <Badge tone={d.active ? 'success' : 'neutral'}>{d.active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditButton onClick={() => openEditDepartment(d)} label={`Edit ${d.name}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Used to classify tasks — shown in the Add Task category picker.</CardDescription>
            </div>
            <Button size="sm" onClick={openAddCategory} className="shrink-0">
              <Tag className="size-4" aria-hidden="true" />
              Add category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <LoadingState label="Loading categories…" />
          ) : teamError ? (
            <ErrorState description={teamError} onRetry={loadTeam} />
          ) : categories.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No categories yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.categoryId}>
                    <TableCell className="font-medium text-on-surface">{c.name}</TableCell>
                    <TableCell className="text-on-surface-variant">{c.description || '—'}</TableCell>
                    <TableCell>
                      <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditButton onClick={() => openEditCategory(c)} label={`Edit ${c.name}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!teamLoading && !teamError && <NotificationComposerCard users={users} departments={departments} />}

      <UserFormModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSubmit={handleSubmitUser}
        departments={departments}
        user={editingUser}
        submitting={savingUser}
      />
      <DepartmentFormModal
        open={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        onSubmit={handleSubmitDepartment}
        department={editingDept}
        submitting={savingDept}
      />
      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSubmit={handleSubmitCategory}
        category={editingCategory}
        submitting={savingCategory}
      />
    </div>
  )
}
