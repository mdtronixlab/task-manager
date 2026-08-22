// Mirrors apps/api/src/config.js ROLES — an explicit shared constant
// instead of role strings scattered/duplicated across the frontend
// (rules.md §16: these values are part of the application contract).
export const ROLES = {
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
}
