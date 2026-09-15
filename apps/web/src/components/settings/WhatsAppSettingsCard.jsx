import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getWhatsAppTemplates,
  getWhatsAppDeliveryStatus,
} from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table'
import Badge from '../Badge'
import Input from '../Input'
import Select from '../Select'
import Button from '../Button'
import LoadingState from '../LoadingState'
import ErrorState from '../ErrorState'
import { WEEKDAYS } from '../../constants/weekdays'

const NO_OVERRIDE = { value: '', label: 'Use the built-in wording' }

// Mirrors apps/api/src/config.js's WHATSAPP_MESSAGE_KIND — every trigger
// whatsappService.js's sendToUser can be called with.
const KIND_LABELS = {
  TASK_REMINDER: 'Task reminder',
  WELCOME: 'Welcome message',
  TASK_COMPLETION_REMINDER: 'Completion reminder',
  TASK_DUE_REMINDER: 'Task due reminder',
  TASK_ASSIGNED: 'Task assigned',
  CUSTOM_BROADCAST: 'Broadcast',
  TEST: 'Test message',
}

// Mirrors the `status` values getWhatsAppDeliveryStatus() (whatsappService.js) returns.
const DELIVERY_STATUS = {
  SENT: { label: 'Getting texts', tone: 'success' },
  FAILED: { label: 'Delivery failing', tone: 'error' },
  SKIPPED: { label: 'Skipped (weekly off)', tone: 'warning' },
  NOT_SENT_YET: { label: 'Not sent yet', tone: 'neutral' },
  NO_NUMBER: { label: 'No number on file', tone: 'neutral' },
}

const WEEKDAY_LABELS = Object.fromEntries(WEEKDAYS.map((d) => [d.value, d.label]))

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Settings > WhatsApp — its own section, separate from Team (per-user
 * numbers) and Send Notification (one-off broadcasts): connection status,
 * which OpenWA-authored template each *automatic* WhatsApp message uses
 * (the daily task reminder, and the one-time welcome message —
 * whatsappService.js sendTaskReminderWhatsApp/sendWelcomeWhatsApp), and a
 * per-staff delivery status so it's obvious at a glance who's actually
 * receiving messages and who isn't.
 *
 * Connection fields (API URL, session ID) are read-only — real values for
 * troubleshooting, but env-configured (config.js / docker-compose), not
 * something to paste into a web form alongside an API key. Template IDs
 * are the editable part, persisted via whatsappSettingsService.js.
 */
export default function WhatsAppSettingsCard() {
  const { showToast } = useToast()

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(null)

  const [taskReminderTemplateId, setTaskReminderTemplateId] = useState('')
  const [welcomeTemplateId, setWelcomeTemplateId] = useState('')
  const [saving, setSaving] = useState(false)

  const [staffStatus, setStaffStatus] = useState([])
  const [staffStatusLoading, setStaffStatusLoading] = useState(true)
  const [staffStatusError, setStaffStatusError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getWhatsAppSettings()
      setSettings(data)
      setTaskReminderTemplateId(data.taskReminderTemplateId || '')
      setWelcomeTemplateId(data.welcomeTemplateId || '')
    } catch (err) {
      setError(err.message || 'Could not load WhatsApp settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadStaffStatus() {
    setStaffStatusLoading(true)
    setStaffStatusError(null)
    try {
      setStaffStatus(await getWhatsAppDeliveryStatus())
    } catch (err) {
      setStaffStatusError(err.message || 'Could not load staff delivery status. Please try again.')
    } finally {
      setStaffStatusLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadStaffStatus()
  }, [])

  // Only once connected — an unconfigured OpenWA session can't list
  // templates at all, so the pickers below fall back to plain text fields.
  useEffect(() => {
    if (!settings?.configured) return
    setTemplatesLoading(true)
    setTemplatesError(null)
    getWhatsAppTemplates()
      .then(setTemplates)
      .catch((err) => setTemplatesError(err.message || 'Could not load WhatsApp templates.'))
      .finally(() => setTemplatesLoading(false))
  }, [settings?.configured])

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await updateWhatsAppSettings({
        taskReminderTemplateId: taskReminderTemplateId || null,
        welcomeTemplateId: welcomeTemplateId || null,
      })
      setSettings((prev) => ({ ...prev, ...updated }))
      showToast('WhatsApp settings updated.')
    } catch (err) {
      showToast(err.message || 'Could not save WhatsApp settings. Please try again.', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <LoadingState label="Loading WhatsApp settings…" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <ErrorState description={error} onRetry={load} />
        </CardContent>
      </Card>
    )
  }

  const templateOptions = [NO_OVERRIDE, ...templates.map((t) => ({ value: t.id, label: t.name }))]
  const canPickTemplates = settings.configured && !templatesLoading && !templatesError && templates.length > 0

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Connection status and which OpenWA template the automatic reminders use.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={load} className="shrink-0">
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <div className="flex items-center gap-2">
                <Badge tone={settings.configured ? 'success' : 'error'}>
                  {settings.configured ? 'Connected' : 'Not configured'}
                </Badge>
                {!settings.configured && (
                  <span className="text-body-sm text-on-surface-variant">
                    Set OPENWA_API_URL / OPENWA_API_KEY / OPENWA_SESSION_ID on the server to enable WhatsApp.
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
                <dt className="text-on-surface-variant">API URL</dt>
                <dd className="truncate font-mono text-on-surface">{settings.apiUrl || '—'}</dd>
                <dt className="text-on-surface-variant">Session ID</dt>
                <dd className="truncate font-mono text-on-surface">{settings.sessionId || '—'}</dd>
              </dl>
              <p className="text-body-sm text-on-surface-variant">
                Read-only here — these come from the server&rsquo;s environment, not this page.
              </p>
            </div>

            {templatesError && (
              <p role="alert" className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text">
                {templatesError} — paste a template id directly below instead.
              </p>
            )}

            {canPickTemplates ? (
              <Select
                label="Daily task reminder template"
                hint="Sent each morning to staff who haven't added a task yet."
                value={taskReminderTemplateId}
                onChange={(e) => setTaskReminderTemplateId(e.target.value)}
                options={templateOptions}
              />
            ) : (
              <Input
                label="Daily task reminder template id"
                hint="Sent each morning to staff who haven't added a task yet. Leave blank for the built-in wording."
                value={taskReminderTemplateId}
                onChange={(e) => setTaskReminderTemplateId(e.target.value)}
                placeholder="OpenWA template id (optional)"
              />
            )}

            {canPickTemplates ? (
              <Select
                label="Welcome message template"
                hint="Sent once, the moment a user first gets a WhatsApp number on file."
                value={welcomeTemplateId}
                onChange={(e) => setWelcomeTemplateId(e.target.value)}
                options={templateOptions}
              />
            ) : (
              <Input
                label="Welcome message template id"
                hint="Sent once, the moment a user first gets a WhatsApp number on file. Leave blank for the built-in wording."
                value={welcomeTemplateId}
                onChange={(e) => setWelcomeTemplateId(e.target.value)}
                placeholder="OpenWA template id (optional)"
              />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={saving} loadingText="Saving…">
              Save WhatsApp settings
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Staff delivery status</CardTitle>
              <CardDescription>
                Who&rsquo;s actually receiving WhatsApp messages, based on their most recent send —
                not a delivered/read receipt, just whether OpenWA accepted it.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadStaffStatus} className="shrink-0">
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {staffStatusLoading ? (
            <LoadingState label="Loading staff delivery status…" />
          ) : staffStatusError ? (
            <ErrorState description={staffStatusError} onRetry={loadStaffStatus} />
          ) : staffStatus.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No active staff.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Weekly off</TableHead>
                  <TableHead>Last message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffStatus.map((s) => {
                  const status = DELIVERY_STATUS[s.status] || { label: s.status, tone: 'neutral' }
                  return (
                    <TableRow key={s.userId}>
                      <TableCell className="text-on-surface">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-body-sm text-on-surface-variant">{s.phone || 'No number on file'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          {s.isOffToday && s.status !== 'SKIPPED' && <Badge tone="warning">Off today</Badge>}
                        </div>
                        {s.status === 'FAILED' && s.lastError && (
                          <p className="mt-1 max-w-xs text-body-sm text-on-surface-variant">{s.lastError}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-on-surface-variant">
                        {s.weeklyOff.length > 0 ? s.weeklyOff.map((d) => WEEKDAY_LABELS[d] || d).join(', ') : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-on-surface-variant">
                        {s.lastAt ? `${KIND_LABELS[s.lastKind] || s.lastKind} · ${formatTimestamp(s.lastAt)}` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
