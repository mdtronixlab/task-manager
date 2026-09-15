import { useEffect, useState } from 'react'
import { Send, Plus, X } from 'lucide-react'
import { sendCustomPushNotification, getWhatsAppTemplates } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'
import Input from '../Input'
import Textarea from '../Textarea'
import Select from '../Select'
import Button from '../Button'

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'All active staff' },
  { value: 'DEPARTMENT', label: 'A specific department' },
  { value: 'USERS', label: 'Choose staff members' },
]

const WHATSAPP_MODE_OPTIONS = [
  { value: 'text', label: 'Custom text (same as Title/Message above)' },
  { value: 'template', label: 'OpenWA template' },
]

const EMPTY_VAR_ROW = { key: '', value: '' }

/** `{{var_name}}` placeholders a template's own header/body/footer reference — seeds the vars editor so a Super Admin doesn't have to guess names. */
function extractTemplateVarNames(template) {
  if (!template) return []
  const text = [template.header, template.body, template.footer].filter(Boolean).join('\n')
  const names = new Set()
  for (const match of text.matchAll(/{{\s*([\w.]+)\s*}}/g)) names.add(match[1])
  return [...names]
}

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
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [sendWhatsApp, setSendWhatsApp] = useState(false)
  const [whatsappMode, setWhatsappMode] = useState('text')
  const [whatsappTemplateId, setWhatsappTemplateId] = useState('')
  const [whatsappVars, setWhatsappVars] = useState([EMPTY_VAR_ROW])
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const staffOptions = users.filter((u) => u.active).map((u) => ({ value: u.userId, label: u.name }))
  const departmentOptions = departments.map((d) => ({ value: d.departmentId, label: d.name }))
  const selectedTemplate = templates.find((t) => t.id === whatsappTemplateId) || null

  // Every active staff member starts checked — switching to "Choose staff
  // members" is then just a way to *exclude* a few people from an otherwise
  // all-staff send, not an empty list you have to build up from scratch.
  function handleScopeChange(value) {
    setScope(value)
    if (value === 'USERS') setSelectedUserIds(staffOptions.map((s) => s.value))
  }
  function toggleUserId(userId) {
    setSelectedUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]))
  }

  // Lazy-loaded — only once the composer's actually in template mode, so
  // picking "Custom text" (the default) never needs OpenWA reachable at all.
  useEffect(() => {
    if (whatsappMode !== 'template' || templates.length > 0 || templatesLoading) return
    setTemplatesLoading(true)
    setTemplatesError(null)
    getWhatsAppTemplates()
      .then(setTemplates)
      .catch((err) => setTemplatesError(err.message || 'Could not load WhatsApp templates.'))
      .finally(() => setTemplatesLoading(false))
  }, [whatsappMode, templates.length, templatesLoading])

  function selectTemplate(templateId) {
    setWhatsappTemplateId(templateId)
    const template = templates.find((t) => t.id === templateId)
    const varNames = extractTemplateVarNames(template)
    setWhatsappVars(varNames.length > 0 ? varNames.map((key) => ({ key, value: '' })) : [EMPTY_VAR_ROW])
  }

  function updateVarRow(index, field, value) {
    setWhatsappVars((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }
  function addVarRow() {
    setWhatsappVars((rows) => [...rows, EMPTY_VAR_ROW])
  }
  function removeVarRow(index) {
    setWhatsappVars((rows) => rows.filter((_, i) => i !== index))
  }

  function resetForm() {
    setTitle('')
    setBody('')
    setScope('ALL')
    setDepartmentId('')
    setSelectedUserIds([])
    setSendWhatsApp(false)
    setWhatsappMode('text')
    setWhatsappTemplateId('')
    setWhatsappVars([EMPTY_VAR_ROW])
  }

  async function handleSend(event) {
    event.preventDefault()
    setError(null)

    if (scope === 'DEPARTMENT' && !departmentId) {
      setError('Choose a department.')
      return
    }
    if (scope === 'USERS' && selectedUserIds.length === 0) {
      setError('Choose at least one staff member.')
      return
    }
    const useTemplate = sendWhatsApp && whatsappMode === 'template'
    if (useTemplate && !whatsappTemplateId) {
      setError('Choose a WhatsApp template, or switch WhatsApp message back to Custom text.')
      return
    }

    setSending(true)
    try {
      const target =
        scope === 'DEPARTMENT'
          ? { scope, departmentId }
          : scope === 'USERS'
            ? { scope, userIds: selectedUserIds }
            : { scope }
      const result = await sendCustomPushNotification({
        title,
        body,
        target,
        sendWhatsApp,
        ...(useTemplate
          ? {
              whatsappTemplateId: whatsappTemplateId.trim(),
              whatsappVars: Object.fromEntries(
                whatsappVars.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
              ),
            }
          : {}),
      })
      const whatsappSuffix =
        sendWhatsApp && result.whatsappNotified > 0 ? ` (+${result.whatsappNotified} via WhatsApp)` : ''
      showToast(
        result.notified > 0
          ? `Sent to ${result.notified} of ${result.targetCount} recipient(s).${whatsappSuffix}`
          : `${result.targetCount} recipient(s) matched, but none have notifications enabled right now.${whatsappSuffix}`,
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
          <Select
            label="Send to"
            value={scope}
            onChange={(e) => handleScopeChange(e.target.value)}
            options={SCOPE_OPTIONS}
          />
          {scope === 'DEPARTMENT' && (
            <Select
              label="Department"
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[{ value: '', label: 'Select a department…' }, ...departmentOptions]}
            />
          )}
          {scope === 'USERS' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-on-surface">
                  Staff members <span className="text-error">*</span>
                </span>
                <div className="flex gap-3 text-body-sm">
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds(staffOptions.map((s) => s.value))}
                    className="font-medium text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="font-medium text-primary hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-outline-variant p-2">
                {staffOptions.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">No active staff.</p>
                ) : (
                  staffOptions.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 rounded px-1 py-1 text-body-sm text-on-surface hover:bg-surface-container-highest">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(s.value)}
                        onChange={() => toggleUserId(s.value)}
                        className="size-4 rounded border-outline-variant text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      {s.label}
                    </label>
                  ))
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {selectedUserIds.length} of {staffOptions.length} selected — everyone starts checked, so Send with no
                changes reaches all active staff.
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="size-4 rounded border-outline-variant text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            Also send via WhatsApp (to recipients with a number on file)
          </label>

          {sendWhatsApp && (
            <div className="flex flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <Select
                label="WhatsApp message"
                value={whatsappMode}
                onChange={(e) => setWhatsappMode(e.target.value)}
                options={WHATSAPP_MODE_OPTIONS}
              />
              {whatsappMode === 'template' ? (
                <>
                  {templatesLoading ? (
                    <p className="text-body-sm text-on-surface-variant">Loading templates…</p>
                  ) : templatesError ? (
                    <p role="alert" className="rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text">
                      {templatesError}
                    </p>
                  ) : templates.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">
                      No templates found — add one in OpenWA&rsquo;s own dashboard (Sessions &gt; Templates) first.
                    </p>
                  ) : (
                    <Select
                      label="Template"
                      required
                      value={whatsappTemplateId}
                      onChange={(e) => selectTemplate(e.target.value)}
                      options={[
                        { value: '', label: 'Select a template…' },
                        ...templates.map((t) => ({ value: t.id, label: t.name })),
                      ]}
                    />
                  )}
                  {selectedTemplate && (
                    <p className="whitespace-pre-wrap rounded-md border border-outline-variant bg-surface p-3 text-body-sm text-on-surface-variant">
                      {[selectedTemplate.header, selectedTemplate.body, selectedTemplate.footer]
                        .filter(Boolean)
                        .join('\n\n')}
                    </p>
                  )}
                  {selectedTemplate && (
                    <div className="flex flex-col gap-2">
                      <span className="text-body-sm font-medium text-on-surface">
                        Template variables{' '}
                        <span className="text-on-surface-variant">
                          {extractTemplateVarNames(selectedTemplate).length > 0 ? '' : '(optional)'}
                        </span>
                      </span>
                      {whatsappVars.map((row, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            aria-label={`Variable ${index + 1} name`}
                            value={row.key}
                            onChange={(e) => updateVarRow(index, 'key', e.target.value)}
                            placeholder="key, e.g. staff_name"
                            containerClassName="flex-1"
                          />
                          <Input
                            aria-label={`Variable ${index + 1} value`}
                            value={row.value}
                            onChange={(e) => updateVarRow(index, 'value', e.target.value)}
                            placeholder="value"
                            containerClassName="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeVarRow(index)}
                            disabled={whatsappVars.length === 1}
                            aria-label={`Remove variable ${index + 1}`}
                            className="shrink-0 rounded-md p-2 text-on-surface-variant transition-colors hover:bg-tone-error-bg hover:text-tone-error-text disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={addVarRow} className="self-start">
                        <Plus className="size-4" aria-hidden="true" />
                        Add variable
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-body-sm text-on-surface-variant">
                  Sends the Title/Message above as plain WhatsApp text.
                </p>
              )}
            </div>
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
