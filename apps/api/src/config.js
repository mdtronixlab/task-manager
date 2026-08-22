// Central configuration — sheet-name-style constants carried over from the
// Google Sheets design, plus environment access. Values that differ per
// deployment (Firebase project, DB path) come from env vars, never
// hard-coded (rules.md §35).

export const ROLES = {
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
};

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const DEFAULT_PRIORITY = TASK_PRIORITY.MEDIUM;

export const ID_PREFIX = {
  USER: 'USR',
  TASK: 'TSK',
  CATEGORY: 'CAT',
  DEPARTMENT: 'DEP',
  LOG: 'LOG',
};

// phases.md Phase 7 lists more (TASK_DELETED, USER_UPDATED, USER_DISABLED)
// for whenever the features that trigger them get built. This is the
// subset actually written today (rg logActivity( — grep across src/ to
// verify before extending) — kept here rather than as free-text literals
// so the Activity Log viewer's action filter (apps/web/src/constants/
// activityActions.js mirrors this) always matches what can really occur.
export const ACTIVITY_ACTIONS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_BLOCKED: 'TASK_BLOCKED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  USER_CREATED: 'USER_CREATED',
  DEPARTMENT_CREATED: 'DEPARTMENT_CREATED',
};

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable "${key}". Check .env / .env.example.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  firebaseProjectId: () => requiredEnv('FIREBASE_PROJECT_ID'),
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || null,
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || null,
};
