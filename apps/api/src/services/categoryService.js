// Category *reads* only — enough for the Phase 3 Add Task form's category
// picker (phases.md Phase 3). Full CRUD (create/rename/deactivate) is a
// Super Admin capability (prd.md §4.1, rules.md §14) that belongs to the
// admin-management phase, not here.

import { prisma } from '../db.js';

function shapeCategory(c) {
  return {
    categoryId: c.categoryId,
    name: c.name,
    description: c.description,
    active: c.active,
    createdAt: c.createdAt,
  };
}

/** Active categories, for populating task category pickers. Any authenticated user. */
export async function getCategories() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  return categories.map(shapeCategory);
}
