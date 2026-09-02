// Department reads (Phase 5 filter dropdown) + create/update (prd.md §4.1
// Super Admin capability). Same soft-disable convention as users/categories
// — `active: false` rather than a hard delete, since departments are
// referenced by users' historical records.

import { prisma } from '../db.js';
import { ACTIVITY_ACTIONS } from '../config.js';
import { generateDepartmentId } from '../lib/ids.js';
import { requireString } from '../lib/validate.js';
import { ValidationError, NotFound } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

function shapeDepartment(d) {
  return {
    departmentId: d.departmentId,
    name: d.name,
    description: d.description,
    active: d.active,
    createdAt: d.createdAt,
  };
}

/**
 * Departments — active only by default, for populating filter/assignment
 * pickers. Any authenticated user.
 * @param {{includeInactive?: boolean}} params `includeInactive` — Settings'
 *   management table needs to see (and re-enable) a deactivated department,
 *   not just the ones still assignable.
 */
export async function getDepartments(params = {}) {
  // req.query values are always strings — 'false' would otherwise pass a
  // naive truthiness check.
  const includeInactive = params.includeInactive === true || params.includeInactive === 'true';
  const departments = await prisma.department.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
  return departments.map(shapeDepartment);
}

/**
 * @param {object} currentUser The admin performing this action (for the
 *   activity log). Super Admin only — enforced by requireRole in the route.
 * @param {object} data {name, description?}
 */
export async function createDepartment(currentUser, data = {}) {
  const name = requireString(data.name, 'Name', 100);
  const description =
    typeof data.description === 'string' && data.description.trim() ? data.description.trim().slice(0, 500) : null;

  const existing = await prisma.department.findFirst({ where: { name } });
  if (existing) {
    throw ValidationError('A department with this name already exists.');
  }

  const department = await prisma.department.create({
    data: { departmentId: await generateDepartmentId(), name, description, active: true },
  });

  await logActivity(currentUser.userId, null, 'DEPARTMENT_CREATED', 'name', null, name);

  return shapeDepartment(department);
}

/**
 * Edits an existing department — rename, re-describe, or toggle active.
 * Deactivating never deletes the row (users still reference it) — it just
 * drops out of getDepartments' default (active-only) list, same convention
 * as categories.
 * @param {object} currentUser Super Admin only — enforced by requireRole
 *   in the route.
 * @param {string} departmentId
 * @param {object} data {name?, description?, active?}
 */
export async function updateDepartment(currentUser, departmentId, data = {}) {
  requireString(departmentId, 'departmentId');

  const department = await prisma.department.findUnique({ where: { departmentId } });
  if (!department) throw NotFound('Department not found.');

  const updates = {};
  const changedFields = [];

  if (data.name !== undefined) {
    const name = requireString(data.name, 'Name', 100);
    const existing = await prisma.department.findFirst({ where: { name, departmentId: { not: departmentId } } });
    if (existing) throw ValidationError('A department with this name already exists.');
    if (name !== department.name) changedFields.push(['name', department.name, name]);
    updates.name = name;
  }

  if (data.description !== undefined) {
    updates.description =
      typeof data.description === 'string' && data.description.trim() ? data.description.trim().slice(0, 500) : null;
  }

  if (data.active !== undefined) {
    const active = Boolean(data.active);
    if (active !== department.active) changedFields.push(['active', department.active, active]);
    updates.active = active;
  }

  const updated = await prisma.department.update({ where: { departmentId }, data: updates });

  for (const [field, oldValue, newValue] of changedFields) {
    await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.DEPARTMENT_UPDATED, field, oldValue, newValue, {
      departmentId,
      name: department.name,
    });
  }

  return shapeDepartment(updated);
}
