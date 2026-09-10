// Shared recipient resolution for a Super Admin's custom broadcast — used
// by both pushService.js and whatsappService.js's sendCustomNotification /
// sendCustomWhatsAppBroadcast, since they target the exact same audience
// (NOTIFICATION_TARGET_SCOPE) and both need `phone` on top of `userId` now
// that WhatsApp exists. Originally lived inside pushService.js alone.

import { prisma } from '../db.js';
import { NOTIFICATION_TARGET_SCOPE } from '../config.js';
import { requireString, requireEnum } from './validate.js';
import { ValidationError } from './errors.js';

const RECIPIENT_SELECT = { userId: true, phone: true };

/**
 * Resolves a Super Admin's chosen recipients. `target.scope` decides which
 * of the other fields matter — mirrors the shape apps/web's notification
 * composer sends.
 * @param {{scope: string, departmentId?: string, userId?: string}} target
 * @return {Promise<Array<{userId: string, phone: string|null}>>}
 */
export async function resolveNotificationTargets(target) {
  const scope = requireEnum(target?.scope, NOTIFICATION_TARGET_SCOPE, 'target.scope');

  if (scope === NOTIFICATION_TARGET_SCOPE.ALL) {
    return prisma.user.findMany({ where: { active: true }, select: RECIPIENT_SELECT });
  }

  if (scope === NOTIFICATION_TARGET_SCOPE.DEPARTMENT) {
    const departmentId = requireString(target.departmentId, 'target.departmentId');
    return prisma.user.findMany({ where: { active: true, departmentId }, select: RECIPIENT_SELECT });
  }

  // USER
  const userId = requireString(target.userId, 'target.userId');
  const user = await prisma.user.findUnique({ where: { userId }, select: { ...RECIPIENT_SELECT, active: true } });
  if (!user || !user.active) {
    throw ValidationError('Selected user was not found or is no longer active.');
  }
  return [{ userId: user.userId, phone: user.phone }];
}
