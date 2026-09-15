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

import { prisma } from '../db.js';
import { config, WHATSAPP_MESSAGE_KIND, WHATSAPP_MESSAGE_STATUS } from '../config.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { resolveNotificationTargets } from '../lib/notificationTargets.js';
import { generateWhatsAppMessageLogId } from '../lib/ids.js';
import { orgDayOfWeek } from '../lib/time.js';
import { getWhatsAppTemplateSettings } from './whatsappSettingsService.js';

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

/**
 * OpenWA-authored templates for the current session (Sessions > Templates
 * in its own dashboard) — powers the custom-broadcast composer's template
 * picker (NotificationComposerCard.jsx) so a Super Admin selects one by
 * name instead of having to go copy a UUID out of OpenWA first.
 * @return {Promise<Array<{id: string, name: string, header: string|null, body: string, footer: string|null}>>}
 */
export async function listWhatsAppTemplates() {
  ensureConfigured();
  const res = await fetch(`${config.openwaApiUrl}/api/sessions/${config.openwaSessionId}/templates`, {
    headers: { 'X-API-Key': config.openwaApiKey },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `OpenWA request failed (HTTP ${res.status}).`);
  }
  const templates = await res.json();
  return templates.map((t) => ({ id: t.id, name: t.name, header: t.header, body: t.body, footer: t.footer }));
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
 * Records one outbound send attempt — Settings > WhatsApp's "Recent
 * messages" log. Best-effort: a logging failure (e.g. a momentary DB hiccup)
 * must never take down the send it's describing, so this only ever logs its
 * own errors to the console rather than throwing.
 */
async function logMessage(user, kind, templateId, status, error) {
  try {
    await prisma.whatsAppMessageLog.create({
      data: {
        logId: await generateWhatsAppMessageLogId(),
        userId: user.userId,
        phone: user.phone,
        kind,
        templateId: templateId || null,
        status,
        error: error || null,
      },
    });
  } catch (err) {
    console.error('[whatsappService] failed to record message log:', err.message);
  }
}

/**
 * True on this user's weekly off day (User.weeklyOff, set in Team
 * management) — whatsappService.js's blanket "no texts on a day off" rule.
 */
async function isWeeklyOff(user) {
  if (!user.weeklyOff) return false;
  const days = user.weeklyOff.split(',').filter(Boolean);
  if (days.length === 0) return false;
  return days.includes(await orgDayOfWeek());
}

// Kinds the weekly-off gate below never applies to — each is a one-off,
// not one of the recurring/broadcast nags the "no texts on a day off" rule
// is actually about: TEST is a Super Admin's explicit "does this number
// work" check, and WELCOME is the very first message a new hire ever gets
// (userService.js, right after they're added) — it should always go out,
// even if their weekly off happens to include today.
const WEEKLY_OFF_EXEMPT_KINDS = new Set([WHATSAPP_MESSAGE_KIND.TEST, WHATSAPP_MESSAGE_KIND.WELCOME]);

/**
 * Sends one message to a user's WhatsApp number, same {sent, total} shape
 * as pushService's sendToUser (total: 0/1 — whether they have a number on
 * file at all — sent: 0/1 — whether the send actually succeeded), so the
 * reminder services' existing "count who got notified" logic works
 * unchanged across both channels. `send` does the actual OpenWA call
 * (sendText or sendTemplate, already bound to its message/template) —
 * kept as a callback rather than a pre-built string so a template send's
 * `vars` never has to round-trip through here.
 *
 * `kind` (WHATSAPP_MESSAGE_KIND) identifies which trigger this was, for the
 * message log below — every attempt is recorded, success, failure, or
 * skipped, not just failures (which is all that used to reach the console).
 *
 * Every kind except WEEKLY_OFF_EXEMPT_KINDS respects the recipient's weekly
 * off day.
 */
async function sendToUser(user, send, kind, templateId = null) {
  if (!user?.phone) return { sent: 0, total: 0 };
  if (!WEEKLY_OFF_EXEMPT_KINDS.has(kind) && (await isWeeklyOff(user))) {
    await logMessage(user, kind, templateId, WHATSAPP_MESSAGE_STATUS.SKIPPED, "Recipient's weekly off day.");
    return { sent: 0, total: 1 };
  }
  try {
    await send(user.phone);
    await logMessage(user, kind, templateId, WHATSAPP_MESSAGE_STATUS.SENT, null);
    return { sent: 1, total: 1 };
  } catch (err) {
    console.error(`[whatsappService] failed to message ${user.userId || user.phone}:`, err.message);
    await logMessage(user, kind, templateId, WHATSAPP_MESSAGE_STATUS.FAILED, err.message);
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
  const result = await sendToUser(user, (phone) => sendText(phone, text), WHATSAPP_MESSAGE_KIND.TEST);
  if (result.sent === 0) {
    throw ValidationError('Could not deliver the test message — check the number and the OpenWA session status.');
  }
  return result;
}

/**
 * Nudges one staff member who hasn't added a task for today yet — called
 * by taskReminderService's sweep, alongside pushService's sendTaskReminder.
 * Uses the OpenWA-authored template picked in Settings > WhatsApp (falls
 * back to OPENWA_TASK_REMINDER_TEMPLATE_ID, then to a plain built-in
 * message — see whatsappSettingsService.js) when set (Sessions > Templates
 * in the OpenWA dashboard — edit the wording there, no redeploy needed).
 */
export async function sendTaskReminderWhatsApp(user) {
  ensureConfigured();
  const firstName = user.name.split(' ')[0];
  const { taskReminderTemplateId: templateId } = await getWhatsAppTemplateSettings();
  return sendToUser(
    user,
    templateId
      ? (phone) => sendTemplate(phone, templateId, { staff_name: firstName })
      : (phone) => sendText(phone, formatMessage('Add your task for today', `Hi ${firstName}, you haven't added a task for today yet.`)),
    WHATSAPP_MESSAGE_KIND.TASK_REMINDER,
    templateId,
  );
}

/**
 * One-time "you've been added" message — fired by userService.js the
 * moment a user first gets a WhatsApp number on file (create, or an edit
 * that sets one where there wasn't one before), never on every edit
 * thereafter. Same template-or-fallback shape as sendTaskReminderWhatsApp
 * above, via Settings > WhatsApp / OPENWA_WELCOME_TEMPLATE_ID.
 */
export async function sendWelcomeWhatsApp(user) {
  ensureConfigured();
  const firstName = user.name.split(' ')[0];
  const { welcomeTemplateId: templateId } = await getWhatsAppTemplateSettings();
  return sendToUser(
    user,
    templateId
      ? (phone) => sendTemplate(phone, templateId, { staff_name: firstName })
      : (phone) =>
          sendText(
            phone,
            formatMessage(
              'Welcome to the team!',
              `Hi ${firstName}, you've been added to Organisation Task Manager — you'll get your task updates here on WhatsApp.`,
            ),
          ),
    WHATSAPP_MESSAGE_KIND.WELCOME,
    templateId,
  );
}

/** Nudges one staff member who still has an unfinished task at end of day — called by taskCompletionReminderService's 6pm sweep. */
export async function sendTaskCompletionReminderWhatsApp(user) {
  ensureConfigured();
  const text = formatMessage(
    'Wrap up your tasks',
    `Hi ${user.name.split(' ')[0]}, you still have unfinished tasks for today — mark them completed once you're done.`,
  );
  return sendToUser(user, (phone) => sendText(phone, text), WHATSAPP_MESSAGE_KIND.TASK_COMPLETION_REMINDER);
}

/** Nudges a task's owner at its due time — called by taskDueReminderService's per-minute tick. */
export async function sendTaskDueReminderWhatsApp(user, task) {
  ensureConfigured();
  const text = formatMessage('Task due', `"${task.title}" is due now.`);
  return sendToUser(user, (phone) => sendText(phone, text), WHATSAPP_MESSAGE_KIND.TASK_DUE_REMINDER);
}

/** Notifies a staff member that a Super Admin just assigned them a task — called by taskService.js's createTask, admin-assigning branch only. */
export async function sendTaskAssignedWhatsApp(user, task, assignedByName) {
  ensureConfigured();
  const text = formatMessage('New task assigned to you', `${assignedByName} assigned you: "${task.title}"`);
  return sendToUser(user, (phone) => sendText(phone, text), WHATSAPP_MESSAGE_KIND.TASK_ASSIGNED);
}

/** Shared by both custom-broadcast senders below — fans `send` out to every recipient and counts how many actually got it. */
async function broadcastToRecipients(recipients, send, templateId) {
  const results = await Promise.allSettled(
    recipients.map((r) => sendToUser(r, send, WHATSAPP_MESSAGE_KIND.CUSTOM_BROADCAST, templateId)),
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value.sent > 0).length;
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
  const notified = await broadcastToRecipients(recipients, (phone) => sendText(phone, text));
  return { notified };
}

/**
 * Template variant of the broadcast above — same recipients/no-op-when-
 * unconfigured shape, but sends an OpenWA-authored template (Sessions >
 * Templates in its own dashboard) instead of plain text, the same way
 * sendTaskReminderWhatsApp's OPENWA_TASK_REMINDER_TEMPLATE_ID path does.
 * Lets a Super Admin's custom broadcast use a pre-approved WhatsApp
 * template (e.g. for numbers outside the 24-hour session window, which
 * OpenWA/WhatsApp Business API restricts to template messages only).
 * @param {Array<{userId: string, phone: string|null}>} recipients
 * @param {string} templateId OpenWA Templates entry's id (not its editable name).
 * @param {Record<string, string>} [vars] `{{key}}` substitutions the template defines.
 * @return {Promise<{notified: number}>}
 */
export async function sendCustomWhatsAppTemplateBroadcast(recipients, templateId, vars = {}) {
  if (!isWhatsAppConfigured()) return { notified: 0 };
  const notified = await broadcastToRecipients(recipients, (phone) => sendTemplate(phone, templateId, vars), templateId);
  return { notified };
}

/**
 * Settings > WhatsApp's per-staff delivery status — every active user
 * paired with their most recent WhatsAppMessageLog row (if any), so a
 * Super Admin can see who's actually receiving messages and who isn't at a
 * glance, rather than a raw scrolling log of individual sends.
 * @return {Promise<Array<{userId: string, name: string, phone: string|null,
 *   weeklyOff: string[], isOffToday: boolean,
 *   status: 'NO_NUMBER'|'NOT_SENT_YET'|'SENT'|'FAILED'|'SKIPPED', lastKind: string|null,
 *   lastAt: Date|null, lastError: string|null}>>}
 */
export async function getWhatsAppDeliveryStatus() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { userId: true, name: true, phone: true, weeklyOff: true },
    orderBy: { name: 'asc' },
  });
  const todayCode = await orgDayOfWeek();

  const userIdsWithPhone = users.filter((u) => u.phone).map((u) => u.userId);
  // `distinct: ['userId']` on rows already ordered newest-first keeps just
  // the latest row per user — one query instead of N per-user lookups.
  const latest = userIdsWithPhone.length
    ? await prisma.whatsAppMessageLog.findMany({
        where: { userId: { in: userIdsWithPhone } },
        orderBy: { createdAt: 'desc' },
        distinct: ['userId'],
      })
    : [];
  const latestByUser = Object.fromEntries(latest.map((l) => [l.userId, l]));

  return users.map((u) => {
    const entry = latestByUser[u.userId];
    const weeklyOff = u.weeklyOff ? u.weeklyOff.split(',').filter(Boolean) : [];
    return {
      userId: u.userId,
      name: u.name,
      phone: u.phone,
      weeklyOff,
      isOffToday: weeklyOff.includes(todayCode),
      status: !u.phone ? 'NO_NUMBER' : !entry ? 'NOT_SENT_YET' : entry.status,
      lastKind: entry?.kind || null,
      lastAt: entry?.createdAt || null,
      lastError: entry?.error || null,
    };
  });
}
