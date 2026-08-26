// Per-task due-time push reminder (prd.md §25 V2 "Due times" / "Notifications").
// Distinct from taskReminderService.js's daily "add your task" nudge: this
// fires (at most) once per task, at the minute matching the `dueTime` its
// owner set when adding/editing it, in the org's configured timezone.
//
// Runs as the same kind of plain in-process interval as taskReminderService,
// for the same reason: the org timezone can change at runtime, so recomputing
// the local time every tick tracks that without a cron dependency.

import { prisma } from '../db.js';
import { getOrgTimezone, today } from '../lib/time.js';
import { TASK_STATUS } from '../config.js';
import { isPushConfigured, sendTaskDueReminder } from './pushService.js';

const CHECK_INTERVAL_MS = 60 * 1000;

/** @return {Promise<string>} "HH:mm" in the org timezone, matching the <input type="time"> shape dueTime is stored in. */
async function currentOrgHHMM() {
  const timeZone = await getOrgTimezone();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour').value;
  const minute = parts.find((p) => p.type === 'minute').value;
  return `${hour}:${minute}`;
}

let intervalHandle = null;

/**
 * Sends the due-time push for every task whose dueTime matches the current
 * org-local minute. Exported (not just called from tick()) so it can be
 * triggered on demand the same way runTaskReminderSweep is.
 * @return {Promise<{matched: number, notified: number}>}
 */
export async function runTaskDueReminderSweep() {
  if (!isPushConfigured()) return { matched: 0, notified: 0 };

  const hhmm = await currentOrgHHMM();
  const date = await today();

  const due = await prisma.task.findMany({
    where: {
      taskDate: date,
      dueTime: hhmm,
      dueReminderSentAt: null,
      deletedAt: null,
      status: { not: TASK_STATUS.COMPLETED }, // already done — no need to remind
    },
    include: { user: true },
  });
  if (due.length === 0) return { matched: 0, notified: 0 };

  // Marked sent *before* attempting the send, not after — so a slow or
  // erroring webpush call in this tick can't leave the task still eligible
  // on the very next tick a minute later (same "at most once" trade-off
  // taskReminderService's lastFiredSlot guard makes).
  await prisma.task.updateMany({
    where: { taskId: { in: due.map((t) => t.taskId) } },
    data: { dueReminderSentAt: new Date() },
  });

  const results = await Promise.allSettled(due.map((t) => sendTaskDueReminder(t.user, t)));
  const notified = results.filter((r) => r.status === 'fulfilled' && r.value.sent > 0).length;

  return { matched: due.length, notified };
}

async function tick() {
  try {
    await runTaskDueReminderSweep();
  } catch (err) {
    console.error('[taskDueReminderService] sweep failed:', err);
  }
}

/** Starts the reminder loop. Call once at process startup (server.js). */
export function startTaskDueReminderScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    tick().catch((err) => console.error('[taskDueReminderService] tick failed:', err));
  }, CHECK_INTERVAL_MS);
  // Don't hold the process open just for this timer (e.g. in tests).
  intervalHandle.unref?.();
}

/** Stops the reminder loop — for tests. */
export function stopTaskDueReminderScheduler() {
  clearInterval(intervalHandle);
  intervalHandle = null;
}
