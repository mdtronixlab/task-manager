// Web Push plumbing — permission + subscription storage, a manual test
// send, the daily "add your task" reminder (taskReminderService.js), the
// end-of-day "mark completed" reminder (taskCompletionReminderService.js),
// and the per-task due-time reminder (taskDueReminderService.js). Further
// automatic triggers (e.g. a BLOCKED task notifying Super Admins) can call
// sendToUser() the same way the functions below do.

import webpush from 'web-push';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { generatePushSubscriptionId } from '../lib/ids.js';
import { requireString } from '../lib/validate.js';
import { ValidationError, AppError } from '../lib/errors.js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    throw new AppError(
      'PUSH_NOT_CONFIGURED',
      'Push notifications are not configured on this server yet.',
      503,
    );
  }
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
  configured = true;
}

/** Public key the frontend needs to create a browser PushSubscription. */
export function getVapidPublicKey() {
  ensureConfigured();
  return config.vapidPublicKey;
}

/**
 * Non-throwing config check for background jobs (taskReminderService) that
 * run on a timer rather than in response to a request — they should just
 * skip a sweep silently when push isn't set up yet, not spam the log with
 * the same PUSH_NOT_CONFIGURED error every 30 minutes.
 */
export function isPushConfigured() {
  return Boolean(config.vapidPublicKey && config.vapidPrivateKey);
}

/**
 * Upserts a browser's push subscription for the current user. Keyed on
 * `endpoint` (globally unique per browser install) rather than userId, so
 * re-subscribing after e.g. clearing site data updates the existing row
 * instead of accumulating duplicates.
 *
 * Uses a real `upsert` (single atomic INSERT ... ON CONFLICT at the DB
 * level) rather than findUnique-then-create/update — the latter is a
 * check-then-act race: two concurrent subscribe calls for the same
 * brand-new endpoint (e.g. a double-click before the UI disables the
 * button) could both see no existing row and both attempt `create`,
 * throwing an unhandled unique-constraint error on the loser.
 */
export async function saveSubscription(currentUser, subscription) {
  ensureConfigured();
  const endpoint = requireString(subscription?.endpoint, 'endpoint', 500);
  const p256dh = requireString(subscription?.keys?.p256dh, 'keys.p256dh');
  const auth = requireString(subscription?.keys?.auth, 'keys.auth');

  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: currentUser.userId, p256dh, auth },
    create: {
      subscriptionId: await generatePushSubscriptionId(),
      userId: currentUser.userId,
      endpoint,
      p256dh,
      auth,
    },
  });
}

/** Removes one subscription — e.g. the user disabled notifications. Scoped
 * to the current user so one browser's endpoint can't remove another
 * user's subscription. */
export async function removeSubscription(currentUser, endpoint) {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: requireString(endpoint, 'endpoint', 500), userId: currentUser.userId },
  });
  return { removed: true };
}

/**
 * Sends one push payload to every subscription a user has (all their
 * browsers/devices), pruning any the browser has since unregistered
 * (410 Gone / 404) instead of leaving them to fail forever.
 */
async function sendToUser(userId, payload) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return { sent: 0, total: 0 };

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  );

  const deadEndpoints = subscriptions
    .filter((_, i) => results[i].status === 'rejected' && [404, 410].includes(results[i].reason?.statusCode))
    .map((sub) => sub.endpoint);
  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: deadEndpoints } } });
  }

  return { sent: results.filter((r) => r.status === 'fulfilled').length, total: subscriptions.length };
}

/** Manual "does this actually work" check for the current user. */
export async function sendTestNotification(currentUser) {
  ensureConfigured();
  const result = await sendToUser(currentUser.userId, {
    title: 'Organisation Task Manager',
    body: `Hi ${currentUser.name.split(' ')[0]}, this is a test notification.`,
  });
  if (result.total === 0) {
    throw ValidationError('You have no push subscriptions on this account yet — enable notifications first.');
  }
  return result;
}

/**
 * Nudges one staff member who hasn't added a task for today yet. Called by
 * taskReminderService's sweep — never directly from a route — for each
 * staff member still pending at a reminder slot. A user with zero
 * subscriptions just gets {sent: 0, total: 0} back, same as anyone else
 * with notifications off; the sweep doesn't treat that as an error.
 */
export async function sendTaskReminder(user) {
  ensureConfigured();
  return sendToUser(user.userId, {
    title: 'Add your task for today',
    body: `Hi ${user.name.split(' ')[0]}, you haven't added a task for today yet.`,
  });
}

/**
 * Nudges one staff member who still has an unfinished (PENDING/
 * IN_PROGRESS) task at end of day. Called by
 * taskCompletionReminderService's 6pm sweep — never directly from a route.
 */
export async function sendTaskCompletionReminder(user) {
  ensureConfigured();
  return sendToUser(user.userId, {
    title: 'Wrap up your tasks',
    body: `Hi ${user.name.split(' ')[0]}, you still have unfinished tasks for today — mark them completed once you're done.`,
  });
}

/**
 * Nudges a task's owner at the due time they set for it. Called by
 * taskDueReminderService's per-minute tick, once per task (dueReminderSentAt
 * guards against a repeat) — never directly from a route.
 */
export async function sendTaskDueReminder(user, task) {
  ensureConfigured();
  return sendToUser(user.userId, {
    title: 'Task due',
    body: `"${task.title}" is due now.`,
  });
}
