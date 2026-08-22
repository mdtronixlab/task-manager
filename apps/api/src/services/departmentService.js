// Department reads (Phase 5 filter dropdown) + createDepartment (prd.md
// §4.1 Super Admin capability). Rename/deactivate still belong to a later
// pass; this file grows as those are asked for.

import { prisma } from '../db.js';
import { generateDepartmentId } from '../lib/ids.js';
import { requireString } from '../lib/validate.js';
import { ValidationError } from '../lib/errors.js';
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

/** Active departments, for populating filter/assignment pickers. Any authenticated user. */
export async function getDepartments() {
  const departments = await prisma.department.findMany({
    where: { active: true },
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
