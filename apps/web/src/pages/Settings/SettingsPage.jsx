import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Trash2, UserPlus, FolderPlus } from 'lucide-react'
import { useBranding } from '../../context/BrandingContext'
import { useToast } from '../../context/ToastContext'
import { updateLogo, removeLogo } from '../../services/settings'
import { getUsers, createUser } from '../../services/users'
import { getDepartments, createDepartment } from '../../services/departments'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import Logo from '../../components/Logo'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import UserFormModal from '../../components/users/UserFormModal'
import DepartmentFormModal from '../../components/departments/DepartmentFormModal'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

// architecture.md §2 /settings route. Branding + adding staff for now
// (rules.md §5 — don't build broader settings/user management before it's
// needed; edit/deactivate can follow once asked for).
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
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [addDeptOpen, setAddDeptOpen] = useState(false)
  const [addingDept, setAddingDept] = useState(false)
  const departmentsById = Object.fromEntries(departments.map((d) => [d.departmentId, d.name]))

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setTeamError(null)
    try {
      const [userData, departmentData] = await Promise.all([getUsers(), getDepartments()])
      setUsers(userData)
      setDepartments(departmentData)
    } catch (err) {
      setTeamError(err.message || 'Could not load the team. Please try again.')
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  async function handleAddUser(data) {
    setAddingUser(true)
    try {
      await createUser(data)
      setAddUserOpen(false)
      showToast(`${data.name} added.`)
      await loadTeam()
    } finally {
      setAddingUser(false)
    }
  }

  async function handleAddDepartment(data) {
    setAddingDept(true)
    try {
      await createDepartment(data)
      setAddDeptOpen(false)
      showToast(`${data.name} department added.`)
      await loadTeam()
    } finally {
      setAddingDept(false)
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
            <Button size="sm" onClick={() => setAddUserOpen(true)} className="shrink-0">
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
            <Button size="sm" onClick={() => setAddDeptOpen(true)} className="shrink-0">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.departmentId}>
                    <TableCell className="font-medium text-on-surface">{d.name}</TableCell>
                    <TableCell className="text-on-surface-variant">{d.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormModal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSubmit={handleAddUser}
        departments={departments}
        submitting={addingUser}
      />
      <DepartmentFormModal
        open={addDeptOpen}
        onClose={() => setAddDeptOpen(false)}
        onSubmit={handleAddDepartment}
        submitting={addingDept}
      />
    </div>
  )
}
