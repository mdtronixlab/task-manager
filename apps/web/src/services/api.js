// Central API service layer (rules.md §34) — the only place in the app that
// knows about fetch(), the API base URL, or the {success,data,message} /
// {success,error} response envelope (architecture.md §14, rules.md §28).
// Components should call functions from here, never fetch() directly.

import { getIdToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = await getIdToken()
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection.', 0)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Fall through — payload stays null and the check below reports it.
  }

  if (!payload) {
    throw new ApiError('INVALID_RESPONSE', 'The server returned an unexpected response.', response.status)
  }

  if (!payload.success) {
    throw new ApiError(
      payload.error?.code,
      payload.error?.message || 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return payload.data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

/**
 * Downloads a binary file response (e.g. reports/export's Excel file)
 * rather than parsing JSON — everything above expects the {success,data}
 * envelope; a file endpoint returns raw bytes on success and only falls
 * back to that envelope to describe an error. Triggers the browser's
 * native save via a throwaway object URL; filename comes from the
 * server's Content-Disposition header, falling back to `fallbackName`.
 */
export async function downloadFile(path, fallbackName = 'download') {
  const token = await getIdToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { headers })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection.', 0)
  }

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      // Fall through — payload stays null, generic message below stands.
    }
    throw new ApiError(
      payload?.error?.code,
      payload?.error?.message || 'Could not generate the file. Please try again.',
      response.status,
    )
  }

  const blob = await response.blob()
  const match = (response.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)
  const filename = match ? match[1] : fallbackName

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Uploads a raw file as the request body (not JSON, not multipart) — the
 * counterpart to downloadFile() above, for the one endpoint that needs a
 * binary body (settings.js's database restore). Still unwraps the normal
 * {success,data}/{success,error} envelope, since the response itself is
 * plain JSON either way.
 */
export async function uploadFile(path, file) {
  const token = await getIdToken()
  const headers = { Accept: 'application/json', 'Content-Type': 'application/octet-stream' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: file })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection.', 0)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Fall through — payload stays null and the check below reports it.
  }

  if (!payload) {
    throw new ApiError('INVALID_RESPONSE', 'The server returned an unexpected response.', response.status)
  }
  if (!payload.success) {
    throw new ApiError(
      payload.error?.code,
      payload.error?.message || 'Something went wrong. Please try again.',
      response.status,
    )
  }
  return payload.data
}

/** GET /api/users/me — architecture.md §13. */
export function getCurrentUser() {
  return api.get('/api/users/me')
}

/** GET /api/push/vapid-public-key — public half of the server's VAPID key pair. */
export function getPushPublicKey() {
  return api.get('/api/push/vapid-public-key')
}

/** POST /api/push/subscribe — `subscription` is a PushSubscription.toJSON(). */
export function subscribeToPush(subscription) {
  return api.post('/api/push/subscribe', { subscription })
}

/** POST /api/push/unsubscribe */
export function unsubscribeFromPush(endpoint) {
  return api.post('/api/push/unsubscribe', { endpoint })
}

/** POST /api/push/test — sends a test notification to the current user. */
export function sendTestPushNotification() {
  return api.post('/api/push/test')
}

/**
 * POST /api/push/send — Super Admin only. `target` is
 * `{ scope: 'ALL' | 'DEPARTMENT' | 'USERS', departmentId?, userIds? }`.
 * `sendWhatsApp: true` also fans a WhatsApp message out to whichever matched
 * recipients have a number on file — by default it mirrors title/body as
 * plain text; passing `whatsappTemplateId` (+ optional `whatsappVars`) sends
 * an OpenWA-authored template instead.
 */
export function sendCustomPushNotification({ title, body, target, sendWhatsApp, whatsappTemplateId, whatsappVars }) {
  return api.post('/api/push/send', { title, body, target, sendWhatsApp, whatsappTemplateId, whatsappVars })
}

/**
 * GET /api/push/whatsapp-templates — Super Admin only. OpenWA-authored
 * templates (Sessions > Templates in its own dashboard) for the composer's
 * template picker: `[{ id, name, header, body, footer }]`.
 */
export function getWhatsAppTemplates() {
  return api.get('/api/push/whatsapp-templates')
}

/**
 * GET /api/push/whatsapp-settings — Super Admin only. Settings > WhatsApp:
 * `{ configured, apiUrl, sessionId, taskReminderTemplateId, welcomeTemplateId }`.
 * `apiUrl`/`sessionId` are read-only (env-configured); the two template IDs
 * are editable via updateWhatsAppSettings below.
 */
export function getWhatsAppSettings() {
  return api.get('/api/push/whatsapp-settings')
}

/**
 * PATCH /api/push/whatsapp-settings — Super Admin only. Pass `null` (or `''`)
 * for a template id to clear the override and fall back to its env var / the
 * plain built-in wording.
 */
export function updateWhatsAppSettings({ taskReminderTemplateId, welcomeTemplateId }) {
  return api.patch('/api/push/whatsapp-settings', { taskReminderTemplateId, welcomeTemplateId })
}

/**
 * GET /api/push/whatsapp-delivery-status — Super Admin only. One row per
 * active staff member: `[{ userId, name, phone, status, lastKind, lastAt, lastError }]`.
 * `status` is `'NO_NUMBER'` (nothing on file), `'NOT_SENT_YET'` (has a
 * number, never messaged), `'SENT'` (their most recent message went out),
 * or `'FAILED'` (it didn't) — reflects whether OpenWA accepted the send,
 * not a delivered/read receipt.
 */
export function getWhatsAppDeliveryStatus() {
  return api.get('/api/push/whatsapp-delivery-status')
}
