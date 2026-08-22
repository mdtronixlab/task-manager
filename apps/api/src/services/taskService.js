// Staff task workflow (prd.md §6/§7/§8, phases.md Phase 1/3).
//
// Ownership (rules.md §13): a STAFF request can never read or write another
// user's tasks, regardless of what userId the frontend sends — the service
// always decides based on the authenticated identity, never the request body.

import { prisma } from '../db.js';
import { ROLES, TASK_STATUS, TASK_PRIORITY, DEFAULT_PRIORITY } from '../config.js';
import { generateTaskId } from '../lib/ids.js';
import { today, resolveDateRange } from '../lib/time.js';
import { requireString, requireEnum } from '../lib/validate.js';
import { AppError, NotFound, Forbidden, ValidationError } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

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
  const isAdmin = currentUser.role === ROLES.SUPER_ADMIN;
  const targetUserId = isAdmin ? params.userId : currentUser.userId;

  const where = {
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

/**
 * @param {object} currentUser
 * @param {object} data {title, description, priority, categoryId}
 */
export async function createTask(currentUser, data = {}) {
  const title = requireString(data.title, 'Task title', 200);
  const description = typeof data.description === 'string' ? data.description.trim().slice(0, 2000) : '';
  const priority = data.priority ? requireEnum(data.priority, TASK_PRIORITY, 'Priority') : DEFAULT_PRIORITY;

  let categoryId = null;
  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { categoryId: data.categoryId } });
    if (!category) throw ValidationError('Category does not exist.');
    categoryId = data.categoryId;
  }

  const task = await prisma.task.create({
    data: {
      taskId: await generateTaskId(),
      userId: currentUser.userId, // never trust a userId supplied by the client
      taskDate: await today(), // never manual — prd.md #10 / memory.md Decision 1
      title,
      description,
      categoryId,
      priority,
      status: TASK_STATUS.PENDING,
    },
  });

  await logActivity(currentUser.userId, task.taskId, 'TASK_CREATED', null, null, null, { title });

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
  if (!task) throw NotFound('Task not found.');

  const isOwner = task.userId === currentUser.userId;
  const isAdmin = currentUser.role === ROLES.SUPER_ADMIN;
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
