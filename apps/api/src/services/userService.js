// User management. createUser below is the first piece of the Phase 4
// scope (prd.md §4.1 "Add staff"). updateUser/disableUser still belong to
// a later pass; this file grows as those are implemented.

import { prisma } from '../db.js';
import { ROLES } from '../config.js';
import { generateUserId } from '../lib/ids.js';
import { requireString, requireEnum } from '../lib/validate.js';
import { ValidationError } from '../lib/errors.js';
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
