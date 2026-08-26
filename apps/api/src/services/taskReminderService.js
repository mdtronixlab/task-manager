// Daily "add your task" reminder for staff (prd/rules extension — no
// automatic push triggers existed before this; see pushService.js).
//
// Fires at 8:00, 8:30 and 9:00 AM in the org's configured timezone — three
// attempts, then stops for the day regardless of whether the task ever gets
// added (product decision: don't nag past 9am). Each slot only notifies
// staff who still have zero tasks for today; anyone who's already added one
// is silently skipped.
//
// Runs as a plain in-process interval rather than pulling in a cron
// dependency: the org timezone can change at runtime (Settings), so a
// scheduler registered once with a static timezone wouldn't track it
// anyway — recomputing the local time on every tick, the way lib/time.js's
// today() already does, is simpler and matches this codebase's preference
// for built-in Intl over a date/scheduling library.

import { prisma } from '../db.js';
import { ROLES } from '../config.js';
import { getOrgTimezone, today } from '../lib/time.js';
import { isPushConfigured, sendTaskReminder } from './pushService.js';

const CHECK_INTERVAL_MS = 60 * 1000;

// Minutes-since-local-midnight for each reminder attempt: 8:00, 8:30, 9:00.
const REMINDER_SLOTS_MINUTES = [8 * 60, 8 * 60 + 30, 9 * 60];

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
 * it on demand via POST /api/push/task-reminder-sweep for testing.
 * @return {Promise<{staffCount: number, pendingCount: number, notified: number}>}
 */
export async function runTaskReminderSweep() {
  if (!isPushConfigured()) return { staffCount: 0, pendingCount: 0, notified: 0 };

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

  const results = await Promise.allSettled(pending.map((u) => sendTaskReminder(u)));
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value.sent > 0).length;

  return { staffCount: staff.length, pendingCount: pending.length, notified };
}

async function tick() {
  const minuteOfDay = await currentOrgMinuteOfDay();
  if (!REMINDER_SLOTS_MINUTES.includes(minuteOfDay)) return;

  const date = await today();
  const slotKey = `${date}-${minuteOfDay}`;
  if (slotKey === lastFiredSlot) return;
  lastFiredSlot = slotKey;

  try {
    await runTaskReminderSweep();
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
