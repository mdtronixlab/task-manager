// User management (prd.md §4.1 "Add/manage staff") — createUser, plus
// updateUser covering edit and deactivate/reactivate (a dedicated
// disableUser never ended up needed; toggling `active` through updateUser
// covers it and logs USER_DISABLED specifically when it flips off).

import { prisma } from '../db.js';
import { ROLES, ACTIVITY_ACTIONS } from '../config.js';
import { generateUserId } from '../lib/ids.js';
import { requireString, requireEnum } from '../lib/validate.js';
import { ValidationError, Forbidden, NotFound } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function shapeUser(u) {
  return {
    userId: u.userId,
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId,
    designation: u.designation,
    avatar: u.avatar,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** Returns all users. Super Admin only — enforced by requireRole in the route. */
export async function getUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(shapeUser);
}

/** Returns the calling user's own profile. Any authenticated user. */
export function getCurrentUser(currentUser) {
  return shapeUser(currentUser);
}

/**
 * Registers a new user by email. Google sign-in is the only auth method
 * (rules.md §11) — there's no password to set here, "adding a user" means
 * pre-authorizing an email to sign in. Whatever name is entered is only a
 * placeholder: the real Google profile name/avatar overwrite it on that
 * person's first login (middleware/auth.js's profileUpdates sync).
 *
 * @param {object} currentUser The admin performing this action (for the
 *   activity log). Super Admin only — enforced by requireRole in the route.
 * @param {object} data {name, email, role, departmentId?, designation?}
 */
export async function createUser(currentUser, data = {}) {
  const name = requireString(data.name, 'Name', 100);
  const email = normalizeEmail(requireString(data.email, 'Email', 200));
  if (!EMAIL_PATTERN.test(email)) {
    throw ValidationError('Enter a valid email address.');
  }
  const role = requireEnum(data.role, ROLES, 'Role');
  const designation =
    typeof data.designation === 'string' && data.designation.trim() ? data.designation.trim().slice(0, 100) : null;

  let departmentId = null;
  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { departmentId: data.departmentId } });
    if (!department) throw ValidationError('Department does not exist.');
    departmentId = data.departmentId;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ValidationError('A user with this email is already registered.');
  }

  const user = await prisma.user.create({
    data: {
      userId: await generateUserId(),
      name,
      email,
      role,
      departmentId,
      designation,
      active: true,
    },
  });

  await logActivity(currentUser.userId, null, 'USER_CREATED', 'email', null, email, { role });

  return shapeUser(user);
}

/**
 * Edits an existing user — name/role/department/designation, and
 * active/inactive (deactivating is the only "removal" a user gets: rules.md
 * users are never hard-deleted, since their tasks/activity history must
 * stay intact — memory.md Decision 3). Two self-service guards: a Super
 * Admin can't deactivate or demote their own account, since either would
 * lock them out with no other admin able to undo it from here.
 *
 * @param {object} currentUser The admin performing this action. Super
 *   Admin only — enforced by requireRole in the route.
 * @param {string} userId
 * @param {object} data {name?, role?, departmentId?, designation?, active?}
 */
export async function updateUser(currentUser, userId, data = {}) {
  requireString(userId, 'userId');

  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) throw NotFound('User not found.');

  const isSelf = userId === currentUser.userId;
  const updates = {};
  const changedFields = [];

  if (data.name !== undefined) {
    const name = requireString(data.name, 'Name', 100);
    if (name !== user.name) changedFields.push(['name', user.name, name]);
    updates.name = name;
  }

  if (data.role !== undefined) {
    const role = requireEnum(data.role, ROLES, 'Role');
    if (isSelf && role !== ROLES.SUPER_ADMIN) {
      throw Forbidden('You cannot change your own role away from Super Admin.');
    }
    if (role !== user.role) changedFields.push(['role', user.role, role]);
    updates.role = role;
  }

  if (data.departmentId !== undefined) {
    if (data.departmentId) {
      const department = await prisma.department.findUnique({ where: { departmentId: data.departmentId } });
      if (!department) throw ValidationError('Department does not exist.');
    }
    if (data.departmentId !== user.departmentId) {
      changedFields.push(['departmentId', user.departmentId, data.departmentId]);
    }
    updates.departmentId = data.departmentId || null;
  }

  if (data.designation !== undefined) {
    updates.designation =
      typeof data.designation === 'string' && data.designation.trim() ? data.designation.trim().slice(0, 100) : null;
  }

  if (data.active !== undefined) {
    const active = Boolean(data.active);
    if (isSelf && !active) {
      throw Forbidden('You cannot deactivate your own account.');
    }
    if (active !== user.active) changedFields.push(['active', user.active, active]);
    updates.active = active;
  }

  const updated = await prisma.user.update({ where: { userId }, data: updates });

  for (const [field, oldValue, newValue] of changedFields) {
    if (field === 'active' && newValue === false) {
      await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.USER_DISABLED, 'active', oldValue, newValue, {
        userId,
        name: user.name,
      });
    } else {
      await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.USER_UPDATED, field, oldValue, newValue, {
        userId,
        name: user.name,
      });
    }
  }

  return shapeUser(updated);
}
