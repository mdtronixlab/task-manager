// Daily "add your task" reminder for staff (prd/rules extension — no
// automatic push triggers existed before this; see pushService.js).
//
// Fires at whatever times Settings > WhatsApp's task-reminder schedule has
// configured (org timezone) — a Super Admin can add as many {time,
// template} entries as they like, or clear them all to turn this reminder
// off entirely (see whatsappSettingsService.js's getWhatsAppScheduleSettings).
// Each slot only notifies staff who still have zero tasks for today; anyone
// who's already added one is silently skipped.
//
// Runs as a plain in-process interval rather than pulling in a cron
// dependency: the org timezone (and now the schedule itself) can change at
// runtime (Settings), so a scheduler registered once with static values
// wouldn't track it anyway — recomputing both on every tick, the way
// lib/time.js's today() already does, is simpler and matches this
// codebase's preference for built-in Intl over a date/scheduling library.

import { prisma } from '../db.js';
import { ROLES } from '../config.js';
import { getOrgTimezone, today } from '../lib/time.js';
import { isPushConfigured, sendTaskReminder } from './pushService.js';
import { isWhatsAppConfigured, sendTaskReminderWhatsApp } from './whatsappService.js';
import { getWhatsAppScheduleSettings } from './whatsappSettingsService.js';

const CHECK_INTERVAL_MS = 60 * 1000;

// `${date}-${minuteOfDay}` of the most recently fired slot — guards against
// firing twice for the same slot (e.g. two ticks landing in the same
// minute) without needing any DB state.
let lastFiredSlot = null;
let intervalHandle = null;

async function currentOrgMinuteOfDay() {
  const timeZone = await getOrgTimezone();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const minute = Number(parts.find((p) => p.type === 'minute').value);
  return hour * 60 + minute;
}

/**
 * Notifies every active staff member who has no task logged for today.
 * Exported (not just called from tick()) so a Super Admin can also trigger
 * it on demand via POST /api/push/task-reminder-sweep for testing — a
 * manual run has no schedule entry to pull a template from, so it defaults
 * to the built-in wording unless one is passed explicitly.
 * @param {string|null} [templateId] The OpenWA template the firing schedule entry picked, or null for the built-in wording.
 * @return {Promise<{staffCount: number, pendingCount: number, notified: number}>}
 */
export async function runTaskReminderSweep(templateId = null) {
  const pushOn = isPushConfigured();
  const waOn = isWhatsAppConfigured();
  if (!pushOn && !waOn) return { staffCount: 0, pendingCount: 0, notified: 0 };

  const date = await today();
  const staff = await prisma.user.findMany({ where: { role: ROLES.STAFF, active: true } });
  if (staff.length === 0) return { staffCount: 0, pendingCount: 0, notified: 0 };

  const withTaskToday = await prisma.task.findMany({
    // deletedAt: null — someone who deleted their only task for today
    // should still get nudged, same as if they'd never added one.
    where: { taskDate: date, deletedAt: null, userId: { in: staff.map((u) => u.userId) } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const doneIds = new Set(withTaskToday.map((t) => t.userId));
  const pending = staff.filter((u) => !doneIds.has(u.userId));

  // Each staff member counts as "notified" if either channel got through —
  // avoids double-counting someone who has both push and WhatsApp enabled.
  const results = await Promise.allSettled(
    pending.map(async (u) => {
      const outcomes = await Promise.allSettled([
        pushOn ? sendTaskReminder(u) : null,
        waOn ? sendTaskReminderWhatsApp(u, templateId) : null,
      ]);
      return outcomes.some((o) => o.status === 'fulfilled' && o.value?.sent > 0);
    }),
  );
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value).length;

  return { staffCount: staff.length, pendingCount: pending.length, notified };
}

async function tick() {
  const { taskReminderSchedules } = await getWhatsAppScheduleSettings();
  if (taskReminderSchedules.length === 0) return;

  const minuteOfDay = await currentOrgMinuteOfDay();
  const schedule = taskReminderSchedules.find((s) => s.minutes === minuteOfDay);
  if (!schedule) return;

  const date = await today();
  const slotKey = `${date}-${minuteOfDay}`;
  if (slotKey === lastFiredSlot) return;
  lastFiredSlot = slotKey;

  try {
    await runTaskReminderSweep(schedule.templateId);
  } catch (err) {
    console.error('[taskReminderService] sweep failed:', err);
  }
}

/** Starts the reminder loop. Call once at process startup (server.js). */
export function startTaskReminderScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    tick().catch((err) => console.error('[taskReminderService] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  // Don't hold the process open just for this timer (e.g. in tests).
  intervalHandle.unref?.();
}

/** Stops the reminder loop — for tests. */
export function stopTaskReminderScheduler() {
  clearInterval(intervalHandle);
  intervalHandle = null;
  lastFiredSlot = null;
}
