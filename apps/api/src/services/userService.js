// User management (prd.md §4.1 "Add/manage staff") — createUser, plus
// updateUser covering edit and deactivate/reactivate (a dedicated
// disableUser never ended up needed; toggling `active` through updateUser
// covers it and logs USER_DISABLED specifically when it flips off).

import { prisma } from '../db.js';
import { ROLES, ACTIVITY_ACTIONS, WEEKDAYS } from '../config.js';
import { generateUserId } from '../lib/ids.js';
import { requireString, requireEnum } from '../lib/validate.js';
import { ValidationError, Forbidden, NotFound } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';
import { sendTestWhatsAppMessage, sendWelcomeWhatsApp, isWhatsAppConfigured } from './whatsappService.js';
import { getVisibleAdminIds } from './adminVisibilityService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits only, optional leading "+", 7-15 of them — loose enough to catch
// an obviously wrong number at entry time without over-constraining format.
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
// This deployment is India-only (rules.md/product decision) — a plain
// 10-digit mobile number is assumed Indian so an admin never has to type
// the country code themselves. whatsappService.js's toChatId() applies the
// same default as a fallback for numbers already stored before this
// existed, but new/edited entries are normalized to the full number here
// so what's stored and what's shown (Settings > Team) already matches
// what actually gets sent.
const INDIA_COUNTRY_CODE = '91';

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** `''`/`null`/`undefined` all mean "no WhatsApp number" and pass through as `null` (clearing it on an edit). */
function normalizePhoneOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const trimmed = String(value).trim();
  if (!PHONE_PATTERN.test(trimmed)) {
    throw ValidationError('WhatsApp number must be 7-15 digits (e.g. 9776373738, or with country code for a non-Indian number).');
  }
  const digits = trimmed.replace(/^\+/, '');
  return digits.length === 10 ? `${INDIA_COUNTRY_CODE}${digits}` : digits;
}

/**
 * `['SUN', 'SAT']` (from Team management's weekly-off checkboxes) <->
 * `"SUN,SAT"` (User.weeklyOff). `undefined`/`[]` both mean "no weekly off"
 * and normalize to `null`, matching normalizePhoneOrNull's "empty clears
 * it" shape.
 */
function normalizeWeeklyOffOrNull(value) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw ValidationError('weeklyOff must be a list of day codes.');
  }
  const days = [...new Set(value)];
  for (const day of days) {
    if (!WEEKDAYS.includes(day)) {
      throw ValidationError(`"${day}" is not a valid day — use one of ${WEEKDAYS.join(', ')}.`);
    }
  }
  return days.length > 0 ? days.join(',') : null;
}

/**
 * Best-effort welcome WhatsApp for a user who just got a (new) number on
 * file — called from createUser (phone set at creation) and updateUser
 * (phone added or changed to a different one). Never blocks or fails its caller:
 * skips quietly when WhatsApp isn't configured at all (same
 * check-before-call pattern as taskReminderService's sweep, so a server
 * without OpenWA set up doesn't log a "not configured" error on every
 * single user add), and any real send failure is logged, not thrown.
 */
async function notifyWelcome(user) {
  if (!isWhatsAppConfigured()) return;
  try {
    await sendWelcomeWhatsApp(user);
  } catch (err) {
    console.error(`[userService] welcome WhatsApp failed for ${user.userId}:`, err.message);
  }
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
    phone: u.phone,
    weeklyOff: u.weeklyOff ? u.weeklyOff.split(',') : [],
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

/**
 * Returns the calling user's own profile. Any authenticated user.
 * For an Admin, also includes `visibleAdminIds` — the other Admins' tasks
 * they're currently allowed to see (adminVisibilityService) — so the
 * frontend can filter its own "whose tasks" pickers without a second
 * round trip. Omitted for Staff/Super Admin, who this never restricts.
 */
export async function getCurrentUser(currentUser) {
  const shaped = shapeUser(currentUser);
  if (currentUser.role === ROLES.ADMIN) {
    shaped.visibleAdminIds = await getVisibleAdminIds(currentUser.userId);
  }
  return shaped;
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
 * @param {object} data {name, email, role, departmentId?, designation?, phone?, weeklyOff?}
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
  const phone = normalizePhoneOrNull(data.phone);
  const weeklyOff = normalizeWeeklyOffOrNull(data.weeklyOff);

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
      phone,
      weeklyOff,
      active: true,
    },
  });

  await logActivity(currentUser.userId, null, 'USER_CREATED', 'email', null, email, { role });

  // Added with a number on file from the start, so this is their very first
  // WhatsApp contact — same trigger as updateUser giving an existing user
  // their first number below. Awaited (like taskService.js's task-assigned
  // notification) so a slow/failed send never throws past notifyWelcome's
  // own catch, but still completes before the request responds.
  if (phone) await notifyWelcome(user);

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
 * @param {object} data {name?, role?, departmentId?, designation?, phone?, weeklyOff?, active?}
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

  if (data.phone !== undefined) {
    const phone = normalizePhoneOrNull(data.phone);
    if (phone !== user.phone) changedFields.push(['phone', user.phone, phone]);
    updates.phone = phone;
  }

  if (data.weeklyOff !== undefined) {
    const weeklyOff = normalizeWeeklyOffOrNull(data.weeklyOff);
    if (weeklyOff !== user.weeklyOff) changedFields.push(['weeklyOff', user.weeklyOff, weeklyOff]);
    updates.weeklyOff = weeklyOff;
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

  // Any edit that leaves a real number on file — added where there wasn't
  // one, or corrected to a different one — re-sends the welcome message,
  // since either way it's the first message *that number* has had from us.
  // Only clearing the number (newValue falsy) skips it, since there's
  // nowhere left to send it.
  const phoneChange = changedFields.find(([field]) => field === 'phone');
  if (phoneChange && phoneChange[2]) await notifyWelcome(updated);

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

/**
 * Settings > Team's per-row "Send test WhatsApp" action — lets a Super
 * Admin confirm a number they just entered actually works, without having
 * to go through the general-purpose notification composer. Super Admin
 * only — enforced by requireRole in the route.
 * @param {string} userId
 */
export async function sendTestWhatsApp(userId) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) throw NotFound('User not found.');
  return sendTestWhatsAppMessage(user);
}
