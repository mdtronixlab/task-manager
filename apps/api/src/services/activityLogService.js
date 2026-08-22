// Activity log *reads* (phases.md Phase 7 "Admin Interface" — writing has
// existed since Phase 1 via activityLog.js's logActivity, called from every
// service that changes something worth tracing). Super Admin only.

import { prisma } from '../db.js';
import { requireEnum } from '../lib/validate.js';
import { ACTIVITY_ACTIONS } from '../config.js';

function shapeLog(log) {
  return {
    logId: log.logId,
    userId: log.userId,
    userName: log.user?.name || log.userId,
    taskId: log.taskId,
    taskTitle: log.task?.title || null,
    action: log.action,
    field: log.field,
    oldValue: log.oldValue,
    newValue: log.newValue,
    timestamp: log.timestamp,
  };
}

// A viewer, not an export tool — caps result size instead of paginating
// (rules.md §43; revisit with real pagination if volume ever justifies it).
const MAX_RESULTS = 200;

/** @param {{userId?: string, action?: string}} params */
export async function getActivityLogs(params = {}) {
  const where = {
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.action ? { action: requireEnum(params.action, ACTIVITY_ACTIONS, 'action') } : {}),
  };

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: true, task: true },
    orderBy: { timestamp: 'desc' },
    take: MAX_RESULTS,
  });

  return logs.map(shapeLog);
}
