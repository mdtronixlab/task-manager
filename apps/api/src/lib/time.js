// Server-authoritative time helpers (rules.md §18/§19). The frontend is
// never trusted to supply timestamps or dates.
//
// Timestamps (createdAt/updatedAt/startedAt/completedAt) are stored as real
// UTC Date values via Prisma and serialize to standard ISO 8601 with a "Z"
// offset — an improvement over the Apps Script version, which stored
// hand-formatted local-time strings with no offset marker.
//
// `taskDate` stays a plain YYYY-MM-DD string (rules.md §19) computed in the
// organisation's configured timezone, since a task's "day" is a calendar
// concept, not an instant.

import { prisma } from '../db.js';
import { ValidationError } from './errors.js';

let timezoneCache = null;

/** @return {Promise<string>} IANA timezone, e.g. "Asia/Kolkata". */
export async function getOrgTimezone() {
  if (timezoneCache) return timezoneCache;

  const row = await prisma.setting.findUnique({ where: { key: 'TIMEZONE' } });
  timezoneCache = row?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return timezoneCache;
}

/** Call after changing the TIMEZONE setting so the next read picks it up. */
export function clearTimezoneCache() {
  timezoneCache = null;
}

/** @return {Promise<string>} Today's date, YYYY-MM-DD, in the org timezone. */
export async function today() {
  const timeZone = await getOrgTimezone();
  // 'en-CA' formats as YYYY-MM-DD — a built-in way to get this shape
  // without a date-formatting dependency.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

// --- Named date ranges (phases.md Phase 5) --------------------------------
// Pure calendar-date arithmetic on YYYY-MM-DD strings, anchored to UTC
// purely as a neutral clock (never a real instant) so DST/local-offset
// shifts can't move a date by a day. The actual calendar date always comes
// from today() above, i.e. the org timezone — never the browser's clock.

function parseDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function formatDateOnly(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date);
}

export function addDays(dateStr, days) {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnly(d);
}

// How far from "today" a task's date can be manually set (memory.md
// Decision 1 update — staff/admins can now backfill a missed day or plan
// ahead when adding/editing a task, rather than always getting today, but
// within a bounded window rather than any date ever, so task lists can't be
// seeded arbitrarily far off). Mirrored on the frontend
// (constants/taskDate.js) as a UI hint for the date picker's min/max — this
// copy, checked in taskService.js, is the one actually enforced.
export const TASK_DATE_WINDOW_DAYS = 7;

/**
 * Throws unless dateStr falls within TASK_DATE_WINDOW_DAYS of the org's
 * current date (org timezone, never the browser's clock — rules.md
 * §18/§19), in either direction.
 * @param {string} dateStr YYYY-MM-DD, already validated as a real date.
 */
export async function assertWithinTaskDateWindow(dateStr) {
  const todayStr = await today();
  const earliest = addDays(todayStr, -TASK_DATE_WINDOW_DAYS);
  const latest = addDays(todayStr, TASK_DATE_WINDOW_DAYS);
  if (dateStr < earliest || dateStr > latest) {
    throw ValidationError(
      `Task date must be within ${TASK_DATE_WINDOW_DAYS} days of today (${earliest} to ${latest}).`,
    );
  }
}

function startOfWeek(dateStr) {
  // Monday–Sunday (ISO 8601). Not a documented product decision — the
  // simplest reasonable default until specified otherwise.
  const dow = parseDateOnly(dateStr).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDays(dateStr, mondayOffset);
}

function monthBounds(year, month1indexed) {
  const start = `${year}-${String(month1indexed).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month1indexed, 0)).getUTCDate();
  const end = `${year}-${String(month1indexed).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom: start, dateTo: end };
}

const RANGE_RESOLVERS = {
  today: (t) => ({ dateFrom: t, dateTo: t }),
  yesterday: (t) => {
    const y = addDays(t, -1);
    return { dateFrom: y, dateTo: y };
  },
  thisWeek: (t) => {
    const start = startOfWeek(t);
    return { dateFrom: start, dateTo: addDays(start, 6) };
  },
  lastWeek: (t) => {
    const start = addDays(startOfWeek(t), -7);
    return { dateFrom: start, dateTo: addDays(start, 6) };
  },
  thisMonth: (t) => {
    const [y, m] = t.split('-').map(Number);
    return monthBounds(y, m);
  },
  lastMonth: (t) => {
    const [y, m] = t.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1)); // m is 1-indexed; m-2 = previous month, 0-indexed
    return monthBounds(prev.getUTCFullYear(), prev.getUTCMonth() + 1);
  },
};

export const DATE_RANGE_KEYS = Object.keys(RANGE_RESOLVERS);

/**
 * @param {string} rangeKey One of DATE_RANGE_KEYS.
 * @return {Promise<{dateFrom: string, dateTo: string}|null>} null if unrecognised.
 */
export async function resolveDateRange(rangeKey) {
  const resolver = RANGE_RESOLVERS[rangeKey];
  if (!resolver) return null;
  return resolver(await today());
}

/**
 * Resolves the {dateFrom, dateTo} bounds a report/trend request wants —
 * a named range, an explicit date, an explicit dateFrom+dateTo, or
 * (default) today. Centralises the fallback logic report endpoints share;
 * unlike taskService.getTasks' filters, both bounds are always required
 * here since trend generation needs a closed interval to enumerate.
 * @param {{range?: string, date?: string, dateFrom?: string, dateTo?: string}} params
 * @return {Promise<{dateFrom: string, dateTo: string}>}
 */
export async function resolveDateBounds(params = {}) {
  if (params.range) {
    const resolved = await resolveDateRange(params.range);
    if (!resolved) throw ValidationError(`Unknown range "${params.range}".`);
    return resolved;
  }
  if (params.date) {
    const d = params.date === 'today' ? await today() : params.date;
    return { dateFrom: d, dateTo: d };
  }
  if (params.dateFrom || params.dateTo) {
    if (!params.dateFrom || !params.dateTo) {
      throw ValidationError('Both dateFrom and dateTo are required for a custom range.');
    }
    return { dateFrom: params.dateFrom, dateTo: params.dateTo };
  }
  const t = await today();
  return { dateFrom: t, dateTo: t };
}

const MAX_ENUMERATED_DAYS = 366;

/**
 * Every YYYY-MM-DD from dateFrom to dateTo inclusive. String comparison is
 * valid ordering here since dates are zero-padded ISO (rules.md §19).
 * @return {string[]}
 */
export function enumerateDates(dateFrom, dateTo) {
  if (dateFrom > dateTo) throw ValidationError('dateFrom must not be after dateTo.');

  const dates = [];
  let cursor = dateFrom;
  while (cursor <= dateTo) {
    dates.push(cursor);
    if (dates.length > MAX_ENUMERATED_DAYS) {
      throw ValidationError(`Date range too large — please select ${MAX_ENUMERATED_DAYS} days or fewer.`);
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}
