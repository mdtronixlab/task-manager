// Staff task workflow (prd.md §6/§7/§8, phases.md Phase 1/3).
//
// Ownership (rules.md §13): a STAFF request can never read or write another
// user's tasks, regardless of what userId the frontend sends — the service
// always decides based on the authenticated identity, never the request body.

import { prisma } from '../db.js';
import { ROLES, TASK_STATUS, TASK_PRIORITY, DEFAULT_PRIORITY, isElevatedRole } from '../config.js';
import { generateTaskId } from '../lib/ids.js';
import { today, resolveDateRange, addDays } from '../lib/time.js';
import { requireString, requireEnum, requireDueTimeOrNull } from '../lib/validate.js';
import { AppError, NotFound, Forbidden, ValidationError } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';
import { sendTaskAssignedNotification } from './pushService.js';

// Allowed status transitions — prd.md §8, rules.md §22.
const TASK_STATUS_TRANSITIONS = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS'],
  COMPLETED: ['IN_PROGRESS'], // reopen — rules.md §23
};

function shapeTask(t) {
  return {
    taskId: t.taskId,
    userId: t.userId,
    taskDate: t.taskDate,
    title: t.title,
    description: t.description,
    categoryId: t.categoryId,
    priority: t.priority,
    status: t.status,
    dueTime: t.dueTime,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  };
}

/**
 * @param {object} currentUser
 * @param {object} params Optional filters: userId, departmentId (admin only),
 *   range (phases.md Phase 5 — one of lib/time.js DATE_RANGE_KEYS), date,
 *   dateFrom, dateTo, status, priority, categoryId.
 *   STAFF requests are always forced to their own userId regardless of params.userId.
 */
export async function getTasks(currentUser, params = {}) {
  const isAdmin = isElevatedRole(currentUser.role);
  const targetUserId = isAdmin ? params.userId : currentUser.userId;

  const where = {
    // rules.md §25 — a soft-deleted task never appears in a normal list.
    deletedAt: null,
    ...(targetUserId ? { userId: targetUserId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.priority ? { priority: params.priority } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    // Department lives on the user, not the task — filter through the
    // relation rather than doing a separate userId lookup. Staff never need
    // this (they only ever see their own tasks regardless), so it's admin-only.
    ...(isAdmin && params.departmentId ? { user: { departmentId: params.departmentId } } : {}),
  };

  if (params.range) {
    // Named ranges (Today/Yesterday/This week/...) are resolved from the
    // org's own calendar, never the browser's clock (rules.md §18/§19).
    const resolved = await resolveDateRange(params.range);
    if (!resolved) throw ValidationError(`Unknown range "${params.range}".`);
    where.taskDate = { gte: resolved.dateFrom, lte: resolved.dateTo };
  } else if (params.date) {
    // 'today' lets the frontend ask for "today's tasks" without computing a
    // date itself, same reasoning as above.
    where.taskDate = params.date === 'today' ? await today() : params.date;
  } else if (params.dateFrom || params.dateTo) {
    where.taskDate = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }

  const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } });
  return tasks.map(shapeTask);
}

// How far back getTaskTitleSuggestions looks, and how many titles it
// returns — staff tend to repeat the same handful of daily tasks, so this
// is generous enough to catch that pattern without dredging up a title
// used once, months ago, that's no longer relevant.
const SUGGESTION_LOOKBACK_DAYS = 90;
const MAX_SUGGESTIONS = 20;

/**
 * Distinct past task titles for one user, most-frequently-used first —
 * powers the "Add task" form's title autocomplete (prd.md-adjacent: staff
 * re-enter the same recurring tasks daily). Frequency over recency because
 * a task done every day for months should outrank one added twice last week.
 * @param {object} currentUser
 * @param {{userId?: string}} params `userId` — a Super Admin asking for a
 *   specific staff member's suggestions (e.g. assigning them a task from
 *   TasksPage/StaffDetailPage) rather than their own. Ignored for a STAFF
 *   caller, same ownership rule as getTasks.
 * @return {Promise<string[]>}
 */
export async function getTaskTitleSuggestions(currentUser, params = {}) {
  const isAdmin = isElevatedRole(currentUser.role);
  const targetUserId = isAdmin && params.userId ? params.userId : currentUser.userId;
  const earliest = addDays(await today(), -SUGGESTION_LOOKBACK_DAYS);

  const rows = await prisma.task.groupBy({
    by: ['title'],
    where: { userId: targetUserId, deletedAt: null, taskDate: { gte: earliest } },
    _count: { title: true },
    orderBy: { _count: { title: 'desc' } },
    take: MAX_SUGGESTIONS,
  });

  return rows.map((r) => r.title);
}

// How far back getCarryForwardCandidates looks — a generous safety net for
// someone who skipped a few days, not an invitation to resurface a task from
// months ago. Same reasoning as lib/time.js's MAX_ENUMERATED_DAYS: a cap,
// not a real product decision.
const CARRY_FORWARD_LOOKBACK_DAYS = 14;

/**
 * Past, unfinished tasks (own only — carrying forward someone else's task
 * makes no sense) that haven't already been resolved one way or the other —
 * carried forward already, or explicitly dismissed. "Resolved" is tracked
 * via ActivityLog rather than a new column: TASK_CARRIED_FORWARD /
 * TASK_CARRY_FORWARD_DISMISSED logged against the *original* taskId is what
 * excludes it here, so a task only ever gets offered once.
 * @param {object} currentUser
 * @return {Promise<object[]>} Oldest first — clears the backlog in order.
 */
export async function getCarryForwardCandidates(currentUser) {
  const todayStr = await today();
  const earliest = addDays(todayStr, -CARRY_FORWARD_LOOKBACK_DAYS);

  const tasks = await prisma.task.findMany({
    where: {
      userId: currentUser.userId,
      deletedAt: null,
      taskDate: { gte: earliest, lt: todayStr },
      status: { not: TASK_STATUS.COMPLETED },
      activityLogs: {
        none: {
          action: { in: ['TASK_CARRIED_FORWARD', 'TASK_CARRY_FORWARD_DISMISSED'] },
        },
      },
    },
    orderBy: { taskDate: 'asc' },
  });

  return tasks.map(shapeTask);
}

/**
 * True once a task has already been carried forward or dismissed — the same
 * condition getCarryForwardCandidates' query excludes on, re-checked here
 * so carryForwardTask/dismissCarryForward reject a stale/duplicate request
 * (e.g. a double-click, or two tabs open on the same candidate) instead of
 * silently creating a second copy or logging a second dismissal.
 */
async function isCarryForwardResolved(taskId) {
  const existing = await prisma.activityLog.findFirst({
    where: { taskId, action: { in: ['TASK_CARRIED_FORWARD', 'TASK_CARRY_FORWARD_DISMISSED'] } },
  });
  return Boolean(existing);
}

/**
 * Creates a fresh copy of a past, unfinished task dated today — the staff
 * member "fetching" yesterday's leftover task instead of retyping it. The
 * original is left exactly as it was (still shows its real history/status
 * on its own day); only a TASK_CARRIED_FORWARD log against it marks it
 * resolved so getCarryForwardCandidates stops offering it.
 * @param {object} currentUser
 * @param {string} taskId The original (past) task.
 */
export async function carryForwardTask(currentUser, taskId) {
  requireString(taskId, 'taskId');

  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task || task.deletedAt) throw NotFound('Task not found.');
  if (task.userId !== currentUser.userId) {
    throw Forbidden("You cannot carry forward another user's task.");
  }

  const todayStr = await today();
  if (task.taskDate >= todayStr) {
    throw ValidationError('Only a task from a past day can be carried forward.');
  }
  if (task.status === TASK_STATUS.COMPLETED) {
    throw ValidationError('This task is already completed.');
  }
  if (await isCarryForwardResolved(taskId)) {
    throw ValidationError('This task has already been carried forward or dismissed.');
  }

  const newTask = await prisma.task.create({
    data: {
      taskId: await generateTaskId(),
      userId: currentUser.userId,
      taskDate: todayStr,
      title: task.title,
      description: task.description,
      categoryId: task.categoryId,
      priority: task.priority,
      status: TASK_STATUS.PENDING,
    },
  });

  await logActivity(currentUser.userId, newTask.taskId, 'TASK_CREATED', null, null, null, {
    title: task.title,
    carriedFromTaskId: taskId,
  });
  await logActivity(currentUser.userId, taskId, 'TASK_CARRIED_FORWARD', null, null, null, {
    newTaskId: newTask.taskId,
  });

  return shapeTask(newTask);
}

/**
 * Marks a past, unfinished task as "not carrying this forward" — same
 * resolution effect as carryForwardTask for getCarryForwardCandidates'
 * purposes, just without creating a new task.
 * @param {object} currentUser
 * @param {string} taskId The original (past) task.
 */
export async function dismissCarryForward(currentUser, taskId) {
  requireString(taskId, 'taskId');

  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task || task.deletedAt) throw NotFound('Task not found.');
  if (task.userId !== currentUser.userId) {
    throw Forbidden("You cannot dismiss another user's task.");
  }
  if (await isCarryForwardResolved(taskId)) {
    throw ValidationError('This task has already been carried forward or dismissed.');
  }

  await logActivity(currentUser.userId, taskId, 'TASK_CARRY_FORWARD_DISMISSED');

  return { dismissed: true };
}

/**
 * @param {object} currentUser
 * @param {object} data {title, description, priority, categoryId, userId?}
 *   `userId` — an Admin/Super Admin assigning this task to a staff member
 *   instead of themselves. Silently ignored for a STAFF caller (rules.md
 *   §13: never trust a userId the client supplies) — they always get their
 *   own task regardless of what's in the request body, same as getTasks
 *   already does.
 */
export async function createTask(currentUser, data = {}) {
  const title = requireString(data.title, 'Task title', 200);
  const description = typeof data.description === 'string' ? data.description.trim().slice(0, 2000) : '';
  const priority = data.priority ? requireEnum(data.priority, TASK_PRIORITY, 'Priority') : DEFAULT_PRIORITY;
  const dueTime = requireDueTimeOrNull(data.dueTime);

  let categoryId = null;
  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { categoryId: data.categoryId } });
    if (!category) throw ValidationError('Category does not exist.');
    categoryId = data.categoryId;
  }

  const isAdmin = isElevatedRole(currentUser.role);
  let targetUserId = currentUser.userId;
  let assignee = null; // set below only when an admin assigns to someone else — powers the push notification after creation.
  if (isAdmin && data.userId && data.userId !== currentUser.userId) {
    assignee = await prisma.user.findUnique({ where: { userId: data.userId } });
    if (!assignee) throw ValidationError('Staff member does not exist.');
    if (assignee.role !== ROLES.STAFF) throw ValidationError('Tasks can only be assigned to staff.');
    if (!assignee.active) throw ValidationError('Cannot assign a task to a disabled account.');
    targetUserId = assignee.userId;
  }

  const task = await prisma.task.create({
    data: {
      taskId: await generateTaskId(),
      userId: targetUserId,
      taskDate: await today(), // never manual — prd.md #10 / memory.md Decision 1
      title,
      description,
      categoryId,
      priority,
      dueTime,
      status: TASK_STATUS.PENDING,
    },
  });

  // logActivity's userId is the *acting* user, not necessarily the task
  // owner (its own doc comment already anticipates exactly this case) — an
  // admin assigning a task shows up as themselves in the log, with
  // `assignedTo` in metadata distinguishing it from a self-created task.
  await logActivity(currentUser.userId, task.taskId, 'TASK_CREATED', null, null, null, {
    title,
    ...(targetUserId !== currentUser.userId ? { assignedTo: targetUserId } : {}),
  });

  if (assignee) {
    // Best-effort — push not configured, no subscriptions, or a provider
    // outage should never fail the task creation request itself.
    try {
      await sendTaskAssignedNotification(assignee, task, currentUser.name);
    } catch (err) {
      console.error('[taskService] task-assigned notification failed:', err);
    }
  }

  return shapeTask(task);
}

/**
 * @param {object} currentUser
 * @param {string} taskId
 * @param {object} data {title?, description?, priority?, categoryId?, status?}
 */
export async function updateTask(currentUser, taskId, data = {}) {
  requireString(taskId, 'taskId');

  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task || task.deletedAt) throw NotFound('Task not found.');

  const isOwner = task.userId === currentUser.userId;
  const isAdmin = isElevatedRole(currentUser.role);
  if (!isOwner && !isAdmin) {
    throw Forbidden("You cannot modify another user's task.");
  }

  const updates = {};
  const changedFields = [];

  if (data.title !== undefined) {
    const title = requireString(data.title, 'Task title', 200);
    if (title !== task.title) changedFields.push(['title', task.title, title]);
    updates.title = title;
  }

  if (data.description !== undefined) {
    updates.description = String(data.description).trim().slice(0, 2000);
  }

  if (data.priority !== undefined) {
    const priority = requireEnum(data.priority, TASK_PRIORITY, 'Priority');
    if (priority !== task.priority) changedFields.push(['priority', task.priority, priority]);
    updates.priority = priority;
  }

  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { categoryId: data.categoryId } });
      if (!category) throw ValidationError('Category does not exist.');
    }
    updates.categoryId = data.categoryId || null;
  }

  if (data.dueTime !== undefined) {
    const dueTime = requireDueTimeOrNull(data.dueTime);
    if (dueTime !== task.dueTime) {
      changedFields.push(['dueTime', task.dueTime, dueTime]);
      updates.dueTime = dueTime;
      // Changing the due time re-arms taskDueReminderService for it — a task
      // already reminded once at 2pm that gets moved to 4pm should still
      // get a fresh push at 4pm, not silently stay skipped.
      updates.dueReminderSentAt = null;
    }
  }

  if (data.status !== undefined && data.status !== task.status) {
    const newStatus = requireEnum(data.status, TASK_STATUS, 'Status');
    const allowedNext = TASK_STATUS_TRANSITIONS[task.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        `Cannot move a task from ${task.status} to ${newStatus}.`,
      );
    }

    if (newStatus === TASK_STATUS.IN_PROGRESS && !task.startedAt) {
      updates.startedAt = new Date();
    }
    if (newStatus === TASK_STATUS.COMPLETED) {
      updates.completedAt = new Date();
    }
    if (task.status === TASK_STATUS.COMPLETED && newStatus === TASK_STATUS.IN_PROGRESS) {
      updates.completedAt = null; // reopen clears completion — rules.md §23
    }

    updates.status = newStatus;
    changedFields.push(['status', task.status, newStatus]);
  }

  const updated = await prisma.task.update({ where: { taskId }, data: updates });

  for (const [field, oldValue, newValue] of changedFields) {
    if (field === 'status') {
      await logActivity(currentUser.userId, taskId, 'STATUS_CHANGED', field, oldValue, newValue);
      if (newValue === TASK_STATUS.COMPLETED) {
        await logActivity(currentUser.userId, taskId, 'TASK_COMPLETED', field, oldValue, newValue);
      } else if (newValue === TASK_STATUS.BLOCKED) {
        await logActivity(currentUser.userId, taskId, 'TASK_BLOCKED', field, oldValue, newValue);
      }
    } else {
      await logActivity(currentUser.userId, taskId, 'TASK_UPDATED', field, oldValue, newValue);
    }
  }

  return shapeTask(updated);
}

/**
 * Soft-deletes a task (rules.md §25) — sets `deletedAt` rather than removing
 * the row, so it drops out of every normal list (getTasks/carry-forward)
 * immediately while staying in the database for administrative auditing via
 * the ActivityLog it also writes here. Same ownership rule as updateTask:
 * the task's owner or any admin (Admin/Super Admin), nobody else.
 * @param {object} currentUser
 * @param {string} taskId
 */
export async function deleteTask(currentUser, taskId) {
  requireString(taskId, 'taskId');

  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task || task.deletedAt) throw NotFound('Task not found.');

  const isOwner = task.userId === currentUser.userId;
  const isAdmin = isElevatedRole(currentUser.role);
  if (!isOwner && !isAdmin) {
    throw Forbidden("You cannot delete another user's task.");
  }

  await prisma.task.update({ where: { taskId }, data: { deletedAt: new Date() } });
  await logActivity(currentUser.userId, taskId, 'TASK_DELETED', null, null, null, { title: task.title });

  return { deleted: true };
}
