// WhatsApp *reminder schedules* — Settings > WhatsApp's single "Scheduler"
// list lets a Super Admin build the morning "add your task" nudge
// (taskReminderService.js) and the evening "wrap up your tasks" nudge
// (taskCompletionReminderService.js) out of any number of {time, templateId}
// entries: at each entry's time (org timezone), that entry's OpenWA
// template goes out (or the plain built-in wording, if templateId is left
// unset) — no fixed time or single "the" template baked into code. Which of
// the two nudges an entry belongs to is which array it's in here, not a
// field on the entry itself — the frontend's one combined "Scheduler" list
// (WhatsAppSettingsCard.jsx) is presentation only; it splits back into
// these two arrays before saving and merges them back into one list on
// load. An empty schedule turns that reminder off entirely. Stored in the
// existing Setting table (same key/value mechanism as settingsService.js's
// APP_LOGO / lib/time.js's TIMEZONE — no schema change), each schedule as a
// JSON array under one key.
//
// Connection settings (API URL, API key, session ID) deliberately stay
// env-only (config.js / docker-compose) rather than moving into this same
// table — they're infra credentials tied to a specific OpenWA deployment,
// not day-to-day content a Super Admin should be pasting into a web form,
// and whatsappService.js's isWhatsAppConfigured() gate stays a cheap sync
// check because of it.

import { prisma } from '../db.js';
import { logActivity } from '../activityLog.js';
import { ValidationError } from '../lib/errors.js';

const SCHEDULE_SETTING_KEYS = {
  taskReminderSchedules: 'WHATSAPP_TASK_REMINDER_SCHEDULES',
  taskCompletionReminderSchedules: 'WHATSAPP_TASK_COMPLETION_REMINDER_SCHEDULES',
};

// Used only the very first time these are read, before any Super Admin has
// saved a value — this app's original fixed 8:00/8:30/9:00 + 18:00 schedule,
// each slot defaulting to the built-in wording (no template), now just the
// starting value of an editable setting rather than a hardcoded behavior.
const DEFAULT_TASK_REMINDER_SCHEDULES = [
  { time: '08:00', templateId: null },
  { time: '08:30', templateId: null },
  { time: '09:00', templateId: null },
];
const DEFAULT_TASK_COMPLETION_REMINDER_SCHEDULES = [{ time: '18:00', templateId: null }];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(hhmm) {
  const match = TIME_RE.exec(hhmm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Parses a stored schedule value, discarding any entry that's since become malformed rather than failing the whole read. */
function parseSchedules(raw, defaults) {
  if (raw === undefined) return defaults;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((entry) => entry && typeof entry.time === 'string' && TIME_RE.test(entry.time))
    .map((entry) => ({ time: entry.time, templateId: entry.templateId || null }));
}

function withMinutes(schedule) {
  return { ...schedule, minutes: timeToMinutes(schedule.time) };
}

let scheduleCache = null;

/**
 * @return {Promise<{
 *   taskReminderSchedules: {time: string, templateId: string|null, minutes: number}[],
 *   taskCompletionReminderSchedules: {time: string, templateId: string|null, minutes: number}[],
 * }>}
 *   `time` is the "HH:mm" value (org timezone) shown/edited in Settings >
 *   WhatsApp; `minutes` is what the reminder schedulers actually compare
 *   the clock against. `templateId` is `null` for "use the built-in
 *   wording". An empty array means that reminder is off entirely.
 */
export async function getWhatsAppScheduleSettings() {
  if (scheduleCache) return scheduleCache;

  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(SCHEDULE_SETTING_KEYS) } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  scheduleCache = {
    taskReminderSchedules: parseSchedules(
      byKey[SCHEDULE_SETTING_KEYS.taskReminderSchedules],
      DEFAULT_TASK_REMINDER_SCHEDULES,
    ).map(withMinutes),
    taskCompletionReminderSchedules: parseSchedules(
      byKey[SCHEDULE_SETTING_KEYS.taskCompletionReminderSchedules],
      DEFAULT_TASK_COMPLETION_REMINDER_SCHEDULES,
    ).map(withMinutes),
  };
  return scheduleCache;
}

/** Call after updateWhatsAppScheduleSettings (below already does) so the next read/tick picks up the change. */
export function clearWhatsAppScheduleSettingsCache() {
  scheduleCache = null;
}

/** Validates and dedupes (by time, last one wins) one schedule array before it's persisted. */
function normalizeSchedules(schedules, label) {
  const byTime = new Map();
  for (const entry of Array.isArray(schedules) ? schedules : []) {
    const time = typeof entry?.time === 'string' ? entry.time.trim() : '';
    if (!time) continue;
    if (!TIME_RE.test(time)) throw ValidationError(`"${time}" is not a valid ${label} time — use 24-hour HH:mm.`);
    const templateId = typeof entry.templateId === 'string' ? entry.templateId.trim() : '';
    byTime.set(time, templateId || null);
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([time, templateId]) => ({ time, templateId }));
}

async function saveSchedule(key, schedules, label) {
  const cleaned = normalizeSchedules(schedules, label);
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(cleaned) },
    create: {
      key,
      value: JSON.stringify(cleaned),
      description: `WhatsApp: ${label} schedule — JSON array of {time, templateId} in the org timezone (empty disables it)`,
    },
  });
}

/**
 * @param {object} currentUser
 * @param {{
 *   taskReminderSchedules?: {time: string, templateId?: string|null}[],
 *   taskCompletionReminderSchedules?: {time: string, templateId?: string|null}[],
 * }} data
 *   A field left `undefined` is untouched. An empty array turns that
 *   reminder off entirely. `templateId` left unset/blank on an entry means
 *   that slot uses the built-in wording. Super Admin only — enforced by
 *   requireRole in the route.
 */
export async function updateWhatsAppScheduleSettings(currentUser, data = {}) {
  if ('taskReminderSchedules' in data) {
    await saveSchedule(SCHEDULE_SETTING_KEYS.taskReminderSchedules, data.taskReminderSchedules, 'task reminder');
  }

  if ('taskCompletionReminderSchedules' in data) {
    await saveSchedule(
      SCHEDULE_SETTING_KEYS.taskCompletionReminderSchedules,
      data.taskCompletionReminderSchedules,
      'task completion reminder',
    );
  }

  clearWhatsAppScheduleSettingsCache();
  await logActivity(currentUser.userId, null, 'SETTINGS_UPDATED', 'WHATSAPP_SCHEDULE', 'previous', 'updated', data);

  return getWhatsAppScheduleSettings();
}
