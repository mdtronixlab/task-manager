// Category management (prd.md §4.1, rules.md §14 — full CRUD is a Super
// Admin capability). Same soft-disable convention as users/departments —
// `active: false` rather than a hard delete, since tasks reference a
// categoryId and rules.md §25 never lets a historical record dangle.

import { prisma } from '../db.js';
import { ACTIVITY_ACTIONS } from '../config.js';
import { generateCategoryId } from '../lib/ids.js';
import { requireString } from '../lib/validate.js';
import { ValidationError, NotFound } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

function shapeCategory(c) {
  return {
    categoryId: c.categoryId,
    name: c.name,
    description: c.description,
    active: c.active,
    createdAt: c.createdAt,
  };
}

/**
 * Categories — active only by default, for populating task category
 * pickers. Any authenticated user.
 * @param {{includeInactive?: boolean}} params `includeInactive` — Settings'
 *   management table needs to see (and re-enable) a deactivated category,
 *   not just the ones still assignable.
 */
export async function getCategories(params = {}) {
  // req.query values are always strings — 'false' would otherwise pass a
  // naive truthiness check.
  const includeInactive = params.includeInactive === true || params.includeInactive === 'true';
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
  return categories.map(shapeCategory);
}

/**
 * @param {object} currentUser The admin performing this action (for the
 *   activity log). Super Admin only — enforced by requireRole in the route.
 * @param {object} data {name, description?}
 */
export async function createCategory(currentUser, data = {}) {
  const name = requireString(data.name, 'Name', 100);
  const description =
    typeof data.description === 'string' && data.description.trim() ? data.description.trim().slice(0, 500) : null;

  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) {
    throw ValidationError('A category with this name already exists.');
  }

  const category = await prisma.category.create({
    data: { categoryId: await generateCategoryId(), name, description, active: true },
  });

  await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.CATEGORY_CREATED, 'name', null, name);

  return shapeCategory(category);
}

/**
 * Edits an existing category — rename, re-describe, or toggle active.
 * @param {object} currentUser Super Admin only — enforced by requireRole
 *   in the route.
 * @param {string} categoryId
 * @param {object} data {name?, description?, active?}
 */
export async function updateCategory(currentUser, categoryId, data = {}) {
  requireString(categoryId, 'categoryId');

  const category = await prisma.category.findUnique({ where: { categoryId } });
  if (!category) throw NotFound('Category not found.');

  const updates = {};
  const changedFields = [];

  if (data.name !== undefined) {
    const name = requireString(data.name, 'Name', 100);
    const existing = await prisma.category.findFirst({ where: { name, categoryId: { not: categoryId } } });
    if (existing) throw ValidationError('A category with this name already exists.');
    if (name !== category.name) changedFields.push(['name', category.name, name]);
    updates.name = name;
  }

  if (data.description !== undefined) {
    updates.description =
      typeof data.description === 'string' && data.description.trim() ? data.description.trim().slice(0, 500) : null;
  }

  if (data.active !== undefined) {
    const active = Boolean(data.active);
    if (active !== category.active) changedFields.push(['active', category.active, active]);
    updates.active = active;
  }

  const updated = await prisma.category.update({ where: { categoryId }, data: updates });

  for (const [field, oldValue, newValue] of changedFields) {
    await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.CATEGORY_UPDATED, field, oldValue, newValue, {
      categoryId,
      name: category.name,
    });
  }

  return shapeCategory(updated);
}
