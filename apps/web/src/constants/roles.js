// Mirrors apps/api/src/config.js ROLES — an explicit shared constant
// instead of role strings scattered/duplicated across the frontend
// (rules.md §16: these values are part of the application contract).
export const ROLES = {
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
}

// Admin and Super Admin share the same org-wide Tasks/Reports/Activity
// pages (AdminLayout/AdminDashboard) — Super Admin alone additionally gets
// Settings (users, departments, categories, custom notifications), mirrors
// apps/api/src/config.js's ADMIN_ROLES/isElevatedRole.
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN]

export function isElevatedRole(role) {
  return ADMIN_ROLES.includes(role)
}
