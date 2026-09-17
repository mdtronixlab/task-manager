import { useEffect, useState } from 'react'
import { RefreshCw, Plus, X } from 'lucide-react'
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
import Select from '../Select'
import Button from '../Button'
import LoadingState from '../LoadingState'
import ErrorState from '../ErrorState'
import { WEEKDAYS } from '../../constants/weekdays'

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

// The Scheduler's own per-entry type — which sweep a time belongs to.
// Mirrors taskReminderService.js ('REMINDER') / taskCompletionReminderService.js
// ('COMPLETION'); kept as one UI concept (one combined list) even though the
// two API fields (taskReminderSchedules/taskCompletionReminderSchedules)
// stay separate under the hood — see mergeSchedules/splitSchedules below.
// There's no separate "which type" control in the UI — picking a template
// (grouped by type in SchedulerEditor's one dropdown) sets both at once, so
// TYPE_LABELS only needs to cover the built-in-wording option within each
// group, not a standalone type picker.
const TYPE_LABELS = {
  REMINDER: "Reminder — hasn't added a task yet",
  COMPLETION: 'Completion — still has an unfinished task',
}

/** `getWhatsAppSettings()`'s two separate arrays -> one combined, type-tagged list for the Scheduler UI. */
function mergeSchedules(data) {
  return [
    ...(data.taskReminderSchedules || []).map((entry) => ({ ...entry, type: 'REMINDER' })),
    ...(data.taskCompletionReminderSchedules || []).map((entry) => ({ ...entry, type: 'COMPLETION' })),
  ]
}

/** The Scheduler's combined list -> the two separate arrays updateWhatsAppSettings expects. */
function splitSchedules(schedules) {
  const strip = (list) => list.map(({ time, templateId }) => ({ time, templateId: templateId || null }))
  return {
    taskReminderSchedules: strip(schedules.filter((e) => e.type === 'REMINDER')),
    taskCompletionReminderSchedules: strip(schedules.filter((e) => e.type === 'COMPLETION')),
  }
}

// One <select> value has to carry both which nudge an entry belongs to and
// which template it sends — "type::templateId", templateId blank for the
// built-in wording. Encoding it into the value (rather than two selects) is
// what makes picking a template also pick the type, per the product call:
// grouping templates by type in the dropdown *is* the type choice.
function encodeChoice(type, templateId) {
  return `${type}::${templateId || ''}`
}
function decodeChoice(value) {
  const [type, templateId] = value.split('::')
  return { type, templateId: templateId || null }
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
 * One combined list of {time, type, templateId} entries — every automatic
 * WhatsApp nudge (the morning task reminder and the evening completion
 * reminder) lives in this one "Scheduler" list instead of two separate
 * sections. Each entry's one dropdown picks a template grouped under which
 * nudge it belongs to — picking a template also picks the type, there's no
 * separate type control (see encodeChoice/decodeChoice above). Split back
 * into the two API arrays on save — see splitSchedules.
 *
 * `canPickTemplates` (settings.configured && templates actually loaded)
 * gates whether the dropdown offers real OpenWA templates at all — when it
 * can't (not connected yet, or nothing created in OpenWA), it falls back to
 * a plain two-option type choice, built-in wording only.
 */
function SchedulerEditor({ schedules, onChange, templates, canPickTemplates }) {
  function updateChoice(index, value) {
    const { type, templateId } = decodeChoice(value)
    onChange(schedules.map((entry, i) => (i === index ? { ...entry, type, templateId } : entry)))
  }

  function updateTime(index, value) {
    onChange(schedules.map((entry, i) => (i === index ? { ...entry, time: value } : entry)))
  }

  function removeEntry(index) {
    onChange(schedules.filter((_, i) => i !== index))
  }

  function addEntry() {
    const last = schedules[schedules.length - 1]
    onChange([...schedules, { time: last?.time || '09:00', type: last?.type || 'REMINDER', templateId: null }])
  }

  return (
    <div className="flex flex-col gap-2 border-t border-outline-variant pt-5">
      <span className="text-body-sm font-medium text-on-surface">Scheduler</span>
      <p className="text-body-sm text-on-surface-variant">
        Automatic WhatsApp nudges — add a time and pick which template it sends; the template also decides who gets
        it. Remove every entry of a type to turn that nudge off.
      </p>
      <div className="flex flex-col gap-2">
        {schedules.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={entry.time}
              onChange={(e) => updateTime(index, e.target.value)}
              autoComplete="off"
              className="h-10 w-36 shrink-0 rounded-md border border-outline-variant bg-surface-container-low px-3 text-body-md text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {canPickTemplates ? (
              <Select
                value={encodeChoice(entry.type, entry.templateId)}
                onChange={(e) => updateChoice(index, e.target.value)}
                containerClassName="min-w-[18rem] flex-1"
              >
                {Object.entries(TYPE_LABELS).map(([type, groupLabel]) => (
                  <optgroup key={type} label={groupLabel}>
                    <option value={encodeChoice(type, null)}>Built-in wording</option>
                    {templates.map((t) => (
                      <option key={`${type}-${t.id}`} value={encodeChoice(type, t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            ) : (
              <Select
                value={entry.type}
                onChange={(e) =>
                  onChange(schedules.map((s, i) => (i === index ? { ...s, type: e.target.value, templateId: null } : s)))
                }
                options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                containerClassName="min-w-[18rem] flex-1"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeEntry(index)}
              aria-label="Remove this schedule entry"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">No times set — both nudges are off.</p>
        )}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addEntry} className="self-start">
        <Plus className="size-4" aria-hidden="true" />
        Add a time
      </Button>
    </div>
  )
}

/**
 * Settings > WhatsApp — its own section, separate from Team (per-user
 * numbers) and Send Notification (one-off broadcasts): connection status,
 * and one Scheduler — a single combined list of {time, type, templateId}
 * entries driving both automatic nudges, the morning task reminder and the
 * evening completion reminder (taskReminderService.js /
 * taskCompletionReminderService.js) — instead of a fixed time (or two
 * separate sections) baked into code. Each entry's one dropdown picks an
 * OpenWA template (or the plain built-in wording), grouped by which nudge
 * it belongs to — picking a template picks the type too, no separate
 * control for it (the one-time welcome message, by contrast, has no
 * Scheduler entry at all — its template is env-only,
 * OPENWA_WELCOME_TEMPLATE_ID). A per-staff delivery status rounds it out,
 * so it's obvious at a glance who's actually receiving messages and who
 * isn't.
 *
 * Connection fields (API URL, session ID) are read-only — real values for
 * troubleshooting, but env-configured (config.js / docker-compose), not
 * something to paste into a web form alongside an API key. The Scheduler is
 * the editable part — the API still stores/serves it as two separate arrays
 * (whatsappSettingsService.js), merged/split at the edges here (see
 * mergeSchedules/splitSchedules) so this page can present it as one list.
 */
export default function WhatsAppSettingsCard() {
  const { showToast } = useToast()

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(null)

  const [schedules, setSchedules] = useState([])
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
      setSchedules(mergeSchedules(data))
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

  function loadTemplates() {
    setTemplatesLoading(true)
    setTemplatesError(null)
    getWhatsAppTemplates()
      .then(setTemplates)
      .catch((err) => setTemplatesError(err.message || 'Could not load WhatsApp templates.'))
      .finally(() => setTemplatesLoading(false))
  }

  // Only once connected — an unconfigured OpenWA session can't list
  // templates at all, so the Scheduler falls back to a plain type choice.
  useEffect(() => {
    if (!settings?.configured) return
    loadTemplates()
  }, [settings?.configured])

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await updateWhatsAppSettings(splitSchedules(schedules))
      setSettings((prev) => ({ ...prev, ...updated }))
      setSchedules(mergeSchedules(updated))
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

  const canPickTemplates = settings.configured && !templatesLoading && !templatesError && templates.length > 0

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Connection status, and when each automatic reminder goes out and which template it uses.
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
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text"
              >
                <span>{templatesError} — the Scheduler will offer built-in wording only until this is retried.</span>
                <Button type="button" variant="ghost" size="sm" onClick={loadTemplates}>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            )}

            {settings.configured && !templatesLoading && !templatesError && templates.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">
                No templates found in OpenWA yet — create one under Sessions &gt; Templates in its dashboard, then{' '}
                <button type="button" onClick={loadTemplates} className="underline hover:no-underline">
                  refresh
                </button>{' '}
                here to pick it in the Scheduler below.
              </p>
            )}

            <SchedulerEditor
              schedules={schedules}
              onChange={setSchedules}
              templates={templates}
              canPickTemplates={canPickTemplates}
            />
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
