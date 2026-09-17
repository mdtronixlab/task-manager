// End-of-day "mark your tasks completed" reminder — the counterpart to
// taskReminderService.js's morning "add your task" nudge. Fires at whatever
// times Settings > WhatsApp's completion-reminder schedule has configured
// (org timezone, empty to turn it off — see whatsappSettingsService.js's
// getWhatsAppScheduleSettings), for every staff member who still has a
// PENDING or IN_PROGRESS task dated today. BLOCKED tasks are deliberately
// excluded — nagging someone to complete something they've already flagged
// as blocked isn't useful (same reasoning taskService.js's status-transition
// rules already apply elsewhere).
//
// Same in-process interval approach as the other two reminder services,
// for the same reason: the org timezone and the schedule itself can both
// change at runtime (Settings), so recomputing them on every tick tracks
// that without a cron dependency.

import { prisma } from '../db.js';
import { ROLES, TASK_STATUS } from '../config.js';
import { getOrgTimezone, today } from '../lib/time.js';
import { isPushConfigured, sendTaskCompletionReminder } from './pushService.js';
import { isWhatsAppConfigured, sendTaskCompletionReminderWhatsApp } from './whatsappService.js';
import { getWhatsAppScheduleSettings } from './whatsappSettingsService.js';

const CHECK_INTERVAL_MS = 60 * 1000;

// `${date}-${minuteOfDay}` of the most recently fired slot — same
// same-minute double-fire guard as taskReminderService.js.
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
 * Notifies every active staff member who still has a PENDING or
 * IN_PROGRESS task dated today. Exported (not just called from tick()) so
 * a Super Admin can also trigger it on demand via
 * POST /api/push/task-completion-reminder-sweep for testing — a manual run
 * has no schedule entry to pull a template from, so it defaults to the
 * built-in wording unless one is passed explicitly.
 * @param {string|null} [templateId] The OpenWA template the firing schedule entry picked, or null for the built-in wording.
 * @return {Promise<{staffCount: number, pendingCount: number, notified: number}>}
 */
export async function runTaskCompletionReminderSweep(templateId = null) {
  const pushOn = isPushConfigured();
  const waOn = isWhatsAppConfigured();
  if (!pushOn && !waOn) return { staffCount: 0, pendingCount: 0, notified: 0 };

  const date = await today();
  const staff = await prisma.user.findMany({ where: { role: ROLES.STAFF, active: true } });
  if (staff.length === 0) return { staffCount: 0, pendingCount: 0, notified: 0 };

  const unfinishedTasks = await prisma.task.findMany({
    where: {
      taskDate: date,
      deletedAt: null,
      userId: { in: staff.map((u) => u.userId) },
      status: { in: [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS] },
    },
    select: { userId: true },
    distinct: ['userId'],
  });
  const unfinishedIds = new Set(unfinishedTasks.map((t) => t.userId));
  const pending = staff.filter((u) => unfinishedIds.has(u.userId));

  // Each staff member counts as "notified" if either channel got through —
  // avoids double-counting someone who has both push and WhatsApp enabled.
  const results = await Promise.allSettled(
    pending.map(async (u) => {
      const outcomes = await Promise.allSettled([
        pushOn ? sendTaskCompletionReminder(u) : null,
        waOn ? sendTaskCompletionReminderWhatsApp(u, templateId) : null,
      ]);
      return outcomes.some((o) => o.status === 'fulfilled' && o.value?.sent > 0);
    }),
  );
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value).length;

  return { staffCount: staff.length, pendingCount: pending.length, notified };
}

async function tick() {
  const { taskCompletionReminderSchedules } = await getWhatsAppScheduleSettings();
  if (taskCompletionReminderSchedules.length === 0) return;

  const minuteOfDay = await currentOrgMinuteOfDay();
  const schedule = taskCompletionReminderSchedules.find((s) => s.minutes === minuteOfDay);
  if (!schedule) return;

  const date = await today();
  const slotKey = `${date}-${minuteOfDay}`;
  if (slotKey === lastFiredSlot) return;
  lastFiredSlot = slotKey;

  try {
    await runTaskCompletionReminderSweep(schedule.templateId);
  } catch (err) {
    console.error('[taskCompletionReminderService] sweep failed:', err);
  }
}

/** Starts the reminder loop. Call once at process startup (server.js). */
export function startTaskCompletionReminderScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    tick().catch((err) => console.error('[taskCompletionReminderService] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  // Don't hold the process open just for this timer (e.g. in tests).
  intervalHandle.unref?.();
}

/** Stops the reminder loop — for tests. */
export function stopTaskCompletionReminderScheduler() {
  clearInterval(intervalHandle);
  intervalHandle = null;
  lastFiredSlot = null;
}
