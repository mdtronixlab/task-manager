// Organisation-wide reporting (phases.md Phase 4 "today" dashboard, Phase 6
// "Daily Report"/"Staff Report"/"Trends"). Calculations happen here, not in
// React (architecture.md §20, rules.md §22/§43) — the frontend never sees
// more than it needs to render.

import { prisma } from '../db.js';
import { ROLES, TASK_STATUS } from '../config.js';
import { today, resolveDateBounds, enumerateDates } from '../lib/time.js';

function emptyCounts() {
  return { total: 0, completed: 0, inProgress: 0, pending: 0, blocked: 0 };
}

function tally(counts, status) {
  counts.total += 1;
  if (status === TASK_STATUS.COMPLETED) counts.completed += 1;
  else if (status === TASK_STATUS.IN_PROGRESS) counts.inProgress += 1;
  else if (status === TASK_STATUS.PENDING) counts.pending += 1;
  else if (status === TASK_STATUS.BLOCKED) counts.blocked += 1;
}

// prd.md §15 — an operational indicator, not a productivity judgment
// (phases.md Phase 6 "Important Rule"): a plain completed/total ratio,
// nothing weighted or inferred.
function completionRate(counts) {
  return counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
}

/**
 * Shared by getDailyReport and getReport — org totals + a per-staff rollup
 * for the given [dateFrom, dateTo] window, optionally scoped to one staff
 * member or department.
 */
async function buildOrgAndStaffSummary({ dateFrom, dateTo, userId, departmentId }) {
  const staffWhere = {
    role: ROLES.STAFF,
    ...(departmentId ? { departmentId } : {}),
    ...(userId ? { userId } : {}),
  };
  const taskWhere = {
    deletedAt: null, // rules.md §25 — a soft-deleted task never counts here
    taskDate: { gte: dateFrom, lte: dateTo },
    ...(userId ? { userId } : {}),
    ...(departmentId ? { user: { departmentId } } : {}),
  };

  const [staffUsers, tasks] = await Promise.all([
    prisma.user.findMany({ where: staffWhere, orderBy: { name: 'asc' } }),
    prisma.task.findMany({ where: taskWhere }),
  ]);

  const orgCounts = emptyCounts();
  const byStaff = new Map(
    staffUsers.map((u) => [u.userId, { ...emptyCounts(), userId: u.userId, name: u.name, active: u.active }]),
  );

  for (const task of tasks) {
    tally(orgCounts, task.status);
    // Tasks belonging to a non-STAFF user (e.g. a Super Admin's own tasks)
    // still count toward the org totals above; there's just no staff row
    // for them, since this table is specifically the staff roster.
    const staffCounts = byStaff.get(task.userId);
    if (staffCounts) tally(staffCounts, task.status);
  }

  const staff = [...byStaff.values()].map((s) => ({
    userId: s.userId,
    name: s.name,
    active: s.active,
    total: s.total,
    completed: s.completed,
    inProgress: s.inProgress,
    pending: s.pending,
    blocked: s.blocked,
    completionRate: completionRate(s),
  }));

  return {
    organisation: {
      staffCount: staffUsers.length,
      activeStaffCount: staffUsers.filter((u) => u.active).length,
      ...orgCounts,
      completionRate: completionRate(orgCounts),
    },
    staff,
  };
}

/**
 * Today's live snapshot for the Super Admin dashboard (phases.md Phase 4).
 * Super Admin only — enforced by requireRole in the route.
 * @return {Promise<{date: string, organisation: object, staff: object[]}>}
 */
export async function getDailyReport() {
  const date = await today();
  const summary = await buildOrgAndStaffSummary({ dateFrom: date, dateTo: date });
  return { date, ...summary };
}

/**
 * The historical counterpart to getDailyReport — same shape, but over any
 * period/staff/department (phases.md Phase 6 "Daily Report"/"Staff
 * Report"), reusing Phase 5's range resolution. Super Admin only.
 * @param {{range?: string, date?: string, dateFrom?: string, dateTo?: string, userId?: string, departmentId?: string}} params
 */
export async function getReport(params = {}) {
  const { dateFrom, dateTo } = await resolveDateBounds(params);
  const summary = await buildOrgAndStaffSummary({
    dateFrom,
    dateTo,
    userId: params.userId,
    departmentId: params.departmentId,
  });
  return { dateFrom, dateTo, ...summary };
}

/**
 * Day-by-day completion series across the period (phases.md Phase 6
 * "Trends" — Daily completion / Completion trend). One point per calendar
 * day in [dateFrom, dateTo], including zero-task days, so a line chart
 * doesn't silently skip gaps. Super Admin only.
 * @param {{range?: string, date?: string, dateFrom?: string, dateTo?: string, userId?: string, departmentId?: string}} params
 */
// Title Case for a SCREAMING_SNAKE_CASE enum value — apps/web has its own
// human labels (constants/taskStatus.js, taskPriority.js) but those are
// frontend-only; the export is generated entirely server-side (routes/
// reports.js), so it needs its own minimal version rather than importing
// across that boundary for two words.
function titleCase(value) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Row-level task data for the Excel export (routes/reports.js) — same
 * [dateFrom, dateTo]/staff/department scoping as getReport, but the
 * individual tasks rather than aggregate counts. Super Admin only.
 * @param {{range?: string, date?: string, dateFrom?: string, dateTo?: string, userId?: string, departmentId?: string}} params
 */
export async function getTaskExportRows(params = {}) {
  const { dateFrom, dateTo } = await resolveDateBounds(params);
  const taskWhere = {
    deletedAt: null,
    taskDate: { gte: dateFrom, lte: dateTo },
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.departmentId ? { user: { departmentId: params.departmentId } } : {}),
  };

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: { user: { include: { department: true } }, category: true },
    orderBy: [{ taskDate: 'asc' }, { user: { name: 'asc' } }],
  });

  return {
    dateFrom,
    dateTo,
    rows: tasks.map((task) => ({
      date: task.taskDate,
      staff: task.user.name,
      department: task.user.department?.name || '',
      title: task.title,
      description: task.description || '',
      category: task.category?.name || '',
      priority: titleCase(task.priority),
      status: titleCase(task.status),
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    })),
  };
}

export async function getCompletionTrend(params = {}) {
  const { dateFrom, dateTo } = await resolveDateBounds(params);

  const taskWhere = {
    deletedAt: null,
    taskDate: { gte: dateFrom, lte: dateTo },
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.departmentId ? { user: { departmentId: params.departmentId } } : {}),
  };
  const tasks = await prisma.task.findMany({ where: taskWhere, select: { taskDate: true, status: true } });

  const byDate = new Map();
  for (const task of tasks) {
    if (!byDate.has(task.taskDate)) byDate.set(task.taskDate, emptyCounts());
    tally(byDate.get(task.taskDate), task.status);
  }

  return enumerateDates(dateFrom, dateTo).map((date) => {
    const counts = byDate.get(date) || emptyCounts();
    return { date, total: counts.total, completed: counts.completed, completionRate: completionRate(counts) };
  });
}
