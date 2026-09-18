// Super Admin-controlled Admin-to-Admin task visibility (extends rules.md
// §14 — see prisma/schema.prisma's AdminTaskVisibility doc comment). An
// Admin's own tasks and every Staff-owned task stay visible to every Admin
// regardless of this table; only *another Admin's* tasks are gated, and
// only a Super Admin can grant/revoke that. Read by taskService.js's
// getTasks to scope an Admin's task list.

import { prisma } from '../db.js';
import { ROLES } from '../config.js';
import { requireString } from '../lib/validate.js';
import { ValidationError, NotFound } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

/** @param {string} viewerId @return {Promise<string[]>} Other Admins' userIds this Admin may see tasks for. */
export async function getVisibleAdminIds(viewerId) {
  const grants = await prisma.adminTaskVisibility.findMany({
    where: { viewerId },
    select: { targetId: true },
  });
  return grants.map((g) => g.targetId);
}

/**
 * Every Admin's current grants, keyed by viewer userId — powers Settings >
 * Visibility's table. Super Admin only, enforced by requireRole in the route.
 * @return {Promise<Record<string, string[]>>}
 */
export async function getAllAdminVisibility() {
  const admins = await prisma.user.findMany({ where: { role: ROLES.ADMIN }, select: { userId: true } });
  const grants = await prisma.adminTaskVisibility.findMany();

  const byViewer = Object.fromEntries(admins.map((a) => [a.userId, []]));
  for (const grant of grants) {
    if (byViewer[grant.viewerId]) byViewer[grant.viewerId].push(grant.targetId);
  }
  return byViewer;
}

/**
 * Replaces one Admin's full set of granted-visible Admins (diffed, not
 * dropped-and-recreated, so createdAt is preserved for grants that survive
 * unchanged). Super Admin only, enforced by requireRole in the route.
 * @param {object} currentUser The Super Admin performing this action (for the activity log).
 * @param {string} viewerId The Admin being granted visibility.
 * @param {string[]} targetAdminIds Other Admins' userIds `viewerId` may now see tasks for.
 */
export async function setAdminVisibility(currentUser, viewerId, targetAdminIds) {
  requireString(viewerId, 'viewerId');
  if (!Array.isArray(targetAdminIds)) {
    throw ValidationError('targetAdminIds must be a list of user IDs.');
  }

  const viewer = await prisma.user.findUnique({ where: { userId: viewerId } });
  if (!viewer) throw NotFound('User not found.');
  if (viewer.role !== ROLES.ADMIN) {
    throw ValidationError('Task visibility can only be configured for Admins.');
  }

  const targetIds = [...new Set(targetAdminIds)].filter((id) => id !== viewerId);
  if (targetIds.length > 0) {
    const targets = await prisma.user.findMany({ where: { userId: { in: targetIds } } });
    if (targets.length !== targetIds.length) {
      throw ValidationError('One or more selected admins do not exist.');
    }
    if (targets.some((t) => t.role !== ROLES.ADMIN)) {
      throw ValidationError('Task visibility can only be granted for other Admins.');
    }
  }

  const existing = await getVisibleAdminIds(viewerId);
  const toAdd = targetIds.filter((id) => !existing.includes(id));
  const toRemove = existing.filter((id) => !targetIds.includes(id));

  if (toRemove.length > 0) {
    await prisma.adminTaskVisibility.deleteMany({ where: { viewerId, targetId: { in: toRemove } } });
  }
  if (toAdd.length > 0) {
    await prisma.adminTaskVisibility.createMany({
      data: toAdd.map((targetId) => ({ viewerId, targetId })),
    });
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    await logActivity(
      currentUser.userId,
      null,
      'ADMIN_VISIBILITY_UPDATED',
      'visibleAdminIds',
      existing.join(','),
      targetIds.join(','),
      { userId: viewerId, name: viewer.name },
    );
  }

  return { viewerId, visibleAdminIds: targetIds };
}
