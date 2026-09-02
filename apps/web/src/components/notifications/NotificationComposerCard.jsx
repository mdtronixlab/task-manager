import { useState } from 'react'
import { Send } from 'lucide-react'
import { sendCustomPushNotification } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'
import Input from '../Input'
import Textarea from '../Textarea'
import Select from '../Select'
import Button from '../Button'

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'All active staff' },
  { value: 'DEPARTMENT', label: 'A specific department' },
  { value: 'USER', label: 'A specific staff member' },
]

/**
 * Settings > Send Notification — a Super Admin's free-form Web Push
 * broadcast (apps/api/src/services/pushService.js sendCustomNotification).
 * Only reaches staff who've actually enabled notifications (usePushNotifications
 * hook); the server reports how many of the matched recipients that was.
 */
export default function NotificationComposerCard({ users, departments }) {
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState('ALL')
  const [departmentId, setDepartmentId] = useState('')
  const [userId, setUserId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const staffOptions = users.filter((u) => u.active).map((u) => ({ value: u.userId, label: u.name }))
  const departmentOptions = departments.map((d) => ({ value: d.departmentId, label: d.name }))

  function resetForm() {
    setTitle('')
    setBody('')
    setScope('ALL')
    setDepartmentId('')
    setUserId('')
  }

  async function handleSend(event) {
    event.preventDefault()
    setError(null)

    if (scope === 'DEPARTMENT' && !departmentId) {
      setError('Choose a department.')
      return
    }
    if (scope === 'USER' && !userId) {
      setError('Choose a staff member.')
      return
    }

    setSending(true)
    try {
      const target =
        scope === 'DEPARTMENT' ? { scope, departmentId } : scope === 'USER' ? { scope, userId } : { scope }
      const result = await sendCustomPushNotification({ title, body, target })
      showToast(
        result.notified > 0
          ? `Sent to ${result.notified} of ${result.targetCount} recipient(s).`
          : `${result.targetCount} recipient(s) matched, but none have notifications enabled right now.`,
      )
      resetForm()
    } catch (err) {
      setError(err.message || 'Could not send the notification. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Send Notification</CardTitle>
        <CardDescription>
          Push a custom message to staff who have notifications enabled — everyone, one department,
          or one person.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSend}>
        <CardContent className="flex flex-col gap-4">
          <Input
            label="Title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Office closed tomorrow"
          />
          <Textarea
            label="Message"
            required
            maxLength={500}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want to tell them?"
          />
          <Select label="Send to" value={scope} onChange={(e) => setScope(e.target.value)} options={SCOPE_OPTIONS} />
          {scope === 'DEPARTMENT' && (
            <Select
              label="Department"
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[{ value: '', label: 'Select a department…' }, ...departmentOptions]}
            />
          )}
          {scope === 'USER' && (
            <Select
              label="Staff member"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              options={[{ value: '', label: 'Select a staff member…' }, ...staffOptions]}
            />
          )}
          {error && (
            <p role="alert" className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" loading={sending} loadingText="Sending…">
            <Send className="size-4" aria-hidden="true" />
            Send notification
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
