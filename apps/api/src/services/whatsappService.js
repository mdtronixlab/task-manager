// WhatsApp plumbing via a self-hosted OpenWA instance — mirrors
// pushService.js's shape (ensureConfigured/isConfigured, one sendToUser
// primitive, a manual test send, a Super Admin's custom broadcast, and the
// same automatic triggers: task assigned, the daily "add your task"
// reminder, the end-of-day "mark completed" reminder, and the per-task
// due-time reminder). Every trigger here is best-effort from its caller's
// point of view — callers already wrap these in try/catch or
// Promise.allSettled the same way they do for pushService, so a missing
// phone number, an unconfigured server, or an OpenWA outage never blocks
// the task/reminder flow that triggered it.
//
// Unlike push (opt-in per browser via PushSubscription), WhatsApp has no
// separate opt-in: a user is enrolled simply by having `phone` set — an
// admin's job in Team management (routes/users.js).

import { config } from '../config.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { resolveNotificationTargets } from '../lib/notificationTargets.js';

export function isWhatsAppConfigured() {
  return Boolean(config.openwaApiUrl && config.openwaApiKey && config.openwaSessionId);
}

function ensureConfigured() {
  if (!isWhatsAppConfigured()) {
    throw new AppError(
      'WHATSAPP_NOT_CONFIGURED',
      'WhatsApp notifications are not configured on this server yet.',
      503,
    );
  }
}

/** `*title*\nbody` — OpenWA sends plain text, so a title needs WhatsApp's own markdown bold rather than a separate field like push's {title, body}. */
function formatMessage(title, body) {
  return `*${title}*\n${body}`;
}

/**
 * OpenWA chat IDs are `<digits, with country code>@c.us` for a 1:1 chat —
 * mirrors the digit-stripping OpenWA's own Message Sender page does client-
 * side. Anything left with fewer than 6 digits isn't a real phone number.
 *
 * This deployment is India-only, so a bare 10-digit number is assumed
 * Indian — userService.js's normalizePhoneOrNull already stores new/edited
 * numbers with "91" prepended, but this covers any number written before
 * that existed (or a restored backup / direct DB edit that bypassed it).
 */
function toChatId(phone) {
  let digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 6 ? `${digits}@c.us` : null;
}

/** Shared POST-and-check for both send-text and send-template — same request shape, different body/path. */
async function postMessage(path, body) {
  const res = await fetch(`${config.openwaApiUrl}/api/sessions/${config.openwaSessionId}/messages/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': config.openwaApiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `OpenWA request failed (HTTP ${res.status}).`);
  }
}

/** Low-level plain-text send — throws on an OpenWA-side failure (bad session, HTTP error) so callers can tell "not sent" from "sent". */
async function sendText(phone, text) {
  const chatId = toChatId(phone);
  if (!chatId) throw new Error(`"${phone}" is not a usable WhatsApp number.`);
  await postMessage('send-text', { chatId, text });
}

/**
 * Low-level template send — `templateId` (not the editable `templateName`)
 * identifies an OpenWA-authored template (Sessions > Templates); OpenWA
 * resolves it, joins header/body/footer, and fills in `{{key}}` from `vars`
 * server-side, so editing the wording there takes effect immediately with
 * no redeploy and no formatting logic duplicated on our side.
 */
async function sendTemplate(phone, templateId, vars) {
  const chatId = toChatId(phone);
  if (!chatId) throw new Error(`"${phone}" is not a usable WhatsApp number.`);
  await postMessage('send-template', { chatId, templateId, vars });
}

/**
 * Sends one message to a user's WhatsApp number, same {sent, total} shape
 * as pushService's sendToUser (total: 0/1 — whether they have a number on
 * file at all — sent: 0/1 — whether the send actually succeeded), so the
 * reminder services' existing "count who got notified" logic works
 * unchanged across both channels. `send` does the actual OpenWA call
 * (sendText or sendTemplate, already bound to its message/template) —
 * kept as a callback rather than a pre-built string so a template send's
 * `vars` never has to round-trip through here.
 */
async function sendToUser(user, send) {
  if (!user?.phone) return { sent: 0, total: 0 };
  try {
    await send(user.phone);
    return { sent: 1, total: 1 };
  } catch (err) {
    console.error(`[whatsappService] failed to message ${user.userId || user.phone}:`, err.message);
    return { sent: 0, total: 1 };
  }
}

/** Manual "does this actually work" check for the current user — Settings > Team's per-row "Send test WhatsApp" action (routes/users.js). */
export async function sendTestWhatsAppMessage(user) {
  ensureConfigured();
  if (!user.phone) {
    throw ValidationError('This user has no WhatsApp number on file yet.');
  }
  const text = formatMessage('Organisation Task Manager', 'This is a test WhatsApp message.');
  const result = await sendToUser(user, (phone) => sendText(phone, text));
  if (result.sent === 0) {
    throw ValidationError('Could not deliver the test message — check the number and the OpenWA session status.');
  }
  return result;
}

/**
 * Nudges one staff member who hasn't added a task for today yet — called
 * by taskReminderService's sweep, alongside pushService's sendTaskReminder.
 * Uses the OpenWA-authored template configured via
 * OPENWA_TASK_REMINDER_TEMPLATE_ID when set (Sessions > Templates in the
 * OpenWA dashboard — edit the wording there, no redeploy needed); falls
 * back to a plain built-in message when no template is configured.
 */
export async function sendTaskReminderWhatsApp(user) {
  ensureConfigured();
  const firstName = user.name.split(' ')[0];
  const templateId = config.openwaTaskReminderTemplateId;
  return sendToUser(
    user,
    templateId
      ? (phone) => sendTemplate(phone, templateId, { staff_name: firstName })
      : (phone) => sendText(phone, formatMessage('Add your task for today', `Hi ${firstName}, you haven't added a task for today yet.`)),
  );
}

/** Nudges one staff member who still has an unfinished task at end of day — called by taskCompletionReminderService's 6pm sweep. */
export async function sendTaskCompletionReminderWhatsApp(user) {
  ensureConfigured();
  const text = formatMessage(
    'Wrap up your tasks',
    `Hi ${user.name.split(' ')[0]}, you still have unfinished tasks for today — mark them completed once you're done.`,
  );
  return sendToUser(user, (phone) => sendText(phone, text));
}

/** Nudges a task's owner at its due time — called by taskDueReminderService's per-minute tick. */
export async function sendTaskDueReminderWhatsApp(user, task) {
  ensureConfigured();
  const text = formatMessage('Task due', `"${task.title}" is due now.`);
  return sendToUser(user, (phone) => sendText(phone, text));
}

/** Notifies a staff member that a Super Admin just assigned them a task — called by taskService.js's createTask, admin-assigning branch only. */
export async function sendTaskAssignedWhatsApp(user, task, assignedByName) {
  ensureConfigured();
  const text = formatMessage('New task assigned to you', `${assignedByName} assigned you: "${task.title}"`);
  return sendToUser(user, (phone) => sendText(phone, text));
}

/**
 * The WhatsApp half of a Super Admin's custom broadcast
 * (pushService.sendCustomNotification) — reuses the same resolved
 * recipient list (already includes `phone`) rather than re-querying.
 * Silently a no-op when WhatsApp isn't configured, since the composer
 * sends push regardless and WhatsApp is an optional extra on top of it.
 * @param {Array<{userId: string, phone: string|null}>} recipients
 * @return {Promise<{notified: number}>}
 */
export async function sendCustomWhatsAppBroadcast(recipients, title, body) {
  if (!isWhatsAppConfigured()) return { notified: 0 };
  const text = formatMessage(title, body);
  const results = await Promise.allSettled(recipients.map((r) => sendToUser(r, (phone) => sendText(phone, text))));
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value.sent > 0).length;
  return { notified };
}
