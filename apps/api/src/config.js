// Central configuration — sheet-name-style constants carried over from the
// Google Sheets design, plus environment access. Values that differ per
// deployment (Firebase project, DB path) come from env vars, never
// hard-coded (rules.md §35).

export const ROLES = {
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

// Three-tier access (rules.md §14 extended): Staff only ever touch their
// own tasks. Admin and Super Admin share the same org-wide task/report/
// activity-log authority (see taskService.js's isElevatedRole and routes/
// reports.js, routes/activityLogs.js) — Super Admin is strictly the wider
// role, adding user management, department/category management, and
// custom push broadcasts (routes/users.js, departments.js, categories.js,
// push.js's /send all stay requireRole(ROLES.SUPER_ADMIN) alone).
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** True for either elevated role — the org-wide task/report/activity authority both share. */
export function isElevatedRole(role) {
  return ADMIN_ROLES.includes(role);
}

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

// Who a Super Admin's custom push notification (pushService.js
// sendCustomNotification) goes to.
export const NOTIFICATION_TARGET_SCOPE = {
  ALL: 'ALL',
  DEPARTMENT: 'DEPARTMENT',
  USER: 'USER',
};

export const ID_PREFIX = {
  USER: 'USR',
  TASK: 'TSK',
  CATEGORY: 'CAT',
  DEPARTMENT: 'DEP',
  LOG: 'LOG',
  PUSH_SUBSCRIPTION: 'PSH',
};

// Kept here rather than as free-text literals so the Activity Log viewer's
// action filter (apps/web/src/constants/activityActions.js mirrors this)
// always matches what can really occur (rg logActivity( — grep across
// src/ to verify before extending).
export const ACTIVITY_ACTIONS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_BLOCKED: 'TASK_BLOCKED',
  TASK_CARRIED_FORWARD: 'TASK_CARRIED_FORWARD',
  TASK_CARRY_FORWARD_DISMISSED: 'TASK_CARRY_FORWARD_DISMISSED',
  TASK_DELETED: 'TASK_DELETED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DISABLED: 'USER_DISABLED',
  DEPARTMENT_CREATED: 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED: 'DEPARTMENT_UPDATED',
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  CATEGORY_UPDATED: 'CATEGORY_UPDATED',
  CUSTOM_NOTIFICATION_SENT: 'CUSTOM_NOTIFICATION_SENT',
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
  // Web Push (generate with `npx web-push generate-vapid-keys`, or
  // node -e "console.log(require('web-push').generateVAPIDKeys())").
  // Optional at startup — pushService only requires these once a push
  // route is actually called, so a server without them still runs fine.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || null,
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:mdtronix.lab@gmail.com',
};
