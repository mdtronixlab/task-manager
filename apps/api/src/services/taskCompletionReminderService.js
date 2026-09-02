// End-of-day "mark your tasks completed" reminder — the counterpart to
// taskReminderService.js's morning "add your task" nudge. Fires once, at
// 6:00 PM in the org's configured timezone, for every staff member who
// still has a PENDING or IN_PROGRESS task dated today. BLOCKED tasks are
// deliberately excluded — nagging someone to complete something they've
// already flagged as blocked isn't useful (same reasoning taskService.js's
// status-transition rules already apply elsewhere).
//
// Same in-process interval approach as the other two reminder services,
// for the same reason: the org timezone can change at runtime (Settings),
// so recomputing the local time on every tick tracks that without a cron
// dependency.

import { prisma } from '../db.js';
import { ROLES, TASK_STATUS } from '../config.js';
import { getOrgTimezone, today } from '../lib/time.js';
import { isPushConfigured, sendTaskCompletionReminder } from './pushService.js';

const CHECK_INTERVAL_MS = 60 * 1000;

// Minutes-since-local-midnight for the single reminder attempt: 6:00 PM.
const REMINDER_SLOT_MINUTES = 18 * 60;

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
 * POST /api/push/task-completion-reminder-sweep for testing.
 * @return {Promise<{staffCount: number, pendingCount: number, notified: number}>}
 */
export async function runTaskCompletionReminderSweep() {
  if (!isPushConfigured()) return { staffCount: 0, pendingCount: 0, notified: 0 };

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

  const results = await Promise.allSettled(pending.map((u) => sendTaskCompletionReminder(u)));
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value.sent > 0).length;

  return { staffCount: staff.length, pendingCount: pending.length, notified };
}

async function tick() {
  const minuteOfDay = await currentOrgMinuteOfDay();
  if (minuteOfDay !== REMINDER_SLOT_MINUTES) return;

  const date = await today();
  const slotKey = `${date}-${minuteOfDay}`;
  if (slotKey === lastFiredSlot) return;
  lastFiredSlot = slotKey;

  try {
    await runTaskCompletionReminderSweep();
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
