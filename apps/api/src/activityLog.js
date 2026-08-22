// Implements rules.md §26 — every important operation must be traceable
// back to a user and timestamp.

import { prisma } from './db.js';
import { generateLogId } from './lib/ids.js';

/**
 * @param {string} userId Acting user's ID (not necessarily the task owner —
 *   e.g. a Super Admin editing someone else's task).
 * @param {string|null} taskId
 * @param {string} action One of the ACTIVITY actions, e.g. "TASK_CREATED".
 * @param {string=} field Field that changed, if applicable.
 * @param {*=} oldValue
 * @param {*=} newValue
 * @param {object=} metadata Extra context, stored as JSON.
 */
export async function logActivity(userId, taskId, action, field, oldValue, newValue, metadata) {
  await prisma.activityLog.create({
    data: {
      logId: await generateLogId(),
      userId,
      taskId: taskId || null,
      action,
      field: field || null,
      oldValue: oldValue === undefined || oldValue === null ? null : String(oldValue),
      newValue: newValue === undefined || newValue === null ? null : String(newValue),
      metadata: metadata ? JSON.stringify(metadata) : '{}',
    },
  });
}
