// Database backup/restore — architecture.md §30 called for periodic
// file-level SQLite backups as an ops-level cron task; this is that same
// idea exposed as a Super-Admin self-service feature instead (or in
// addition to one), since a solo/small-org deployment often has no
// separate ops process to run one.
//
// Everything here works on the actual SQLite file (via lib/dbPath.js),
// not through Prisma's query interface — VACUUM INTO, file swaps, and
// PRAGMA integrity_check aren't things the ORM layer has a place for.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';
import { getDatabaseFilePath, getApiRootDir } from '../lib/dbPath.js';
import { ValidationError } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';
import { ACTIVITY_ACTIONS } from '../config.js';

const execFileAsync = promisify(execFile);

const SQLITE_HEADER = Buffer.from('SQLite format 3\0');
// Generous for a small-org SQLite file (the real one is ~1-2MB at the time
// of writing) while still bounding how much a single upload can hold in
// memory — express.raw() buffers the whole body (rules.md §33: no
// multer/streaming dependency for a Super-Admin-only, rarely-used upload).
export const MAX_RESTORE_BYTES = 200 * 1024 * 1024;

// Tables every real OTM database must have — confirms an uploaded file is
// actually one of ours before anything is allowed to overwrite the live
// database with it (rules.md §27: validate input, don't trust a filename
// or extension).
const REQUIRED_TABLES = ['users', 'tasks', 'categories', 'departments', 'activity_log', 'settings', 'counters'];

function backupsDir() {
  return path.join(path.dirname(getDatabaseFilePath()), 'backups');
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19); // 2026-09-07T12-34-56
}

/**
 * Produces a consistent point-in-time snapshot of the live database via
 * SQLite's own `VACUUM INTO` — safe regardless of journal mode, unlike a
 * raw file copy of the main db, which can miss pending WAL-only writes.
 *
 * @param {object|null} currentUser Logs a DATABASE_BACKUP_CREATED activity
 *   entry when given. Pass `null` for the automatic pre-restore safety
 *   snapshot below — logging that one would be pointless, since the table
 *   it'd be written to is about to be replaced anyway.
 * @param {{prefix?: string}} options `prefix` distinguishes a manual
 *   download (`otm-backup-`) from the automatic pre-restore safety copy
 *   (`pre-restore-`) in the backups folder.
 */
export async function createBackupFile(currentUser, { prefix = 'otm-backup-' } = {}) {
  const dir = backupsDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${prefix}${timestampForFilename()}.db`;
  const targetPath = path.join(dir, filename);

  // VACUUM INTO refuses to overwrite an existing file — a genuine
  // collision is essentially impossible at second resolution, but clear
  // the path defensively anyway rather than let a rare retry fail.
  await fs.rm(targetPath, { force: true });
  await prisma.$executeRawUnsafe(`VACUUM INTO '${targetPath.replace(/'/g, "''")}'`);

  if (currentUser) {
    await logActivity(currentUser.userId, null, ACTIVITY_ACTIONS.DATABASE_BACKUP_CREATED, 'database', null, filename);
  }

  return { path: targetPath, filename };
}

export async function deleteBackupFile(filePath) {
  await fs.rm(filePath, { force: true }).catch(() => {});
}

function validateRestoreBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw ValidationError('The uploaded file is empty.');
  }
  if (buffer.length > MAX_RESTORE_BYTES) {
    throw ValidationError('That file is too large to be a valid backup.');
  }
  if (!buffer.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
    throw ValidationError('That file is not a SQLite database.');
  }
}

/**
 * Opens the *uploaded* file (not the live one) as its own short-lived
 * Prisma client, pointed at it via a datasource override, to confirm it's
 * really an OTM backup and not just any valid SQLite file before it's
 * allowed anywhere near the live database.
 */
async function verifyRestoreCandidate(filePath) {
  const client = new PrismaClient({ datasources: { db: { url: `file:${filePath}` } } });
  try {
    const found = new Set();
    try {
      const tables = await client.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_TABLES.map((t) => `'${t}'`).join(',')})`,
      );
      for (const row of tables) found.add(row.name);
    } catch {
      // A real "SQLite format 3" header with corrupt/truncated content
      // beyond it throws here (e.g. "file is not a database") instead of
      // just returning an empty result — same underlying problem as a
      // missing table, so it falls through to the same friendly message
      // below rather than a raw Prisma/SQLite error reaching an admin.
    }

    const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
    if (missing.length > 0) {
      throw ValidationError("That file doesn't look like an Organisation Task Manager backup.");
    }

    let integrity;
    try {
      [integrity] = await client.$queryRawUnsafe('PRAGMA integrity_check');
    } catch {
      throw ValidationError('That backup file failed a database integrity check and cannot be restored.');
    }
    if (!integrity || Object.values(integrity)[0] !== 'ok') {
      throw ValidationError('That backup file failed a database integrity check and cannot be restored.');
    }
  } finally {
    await client.$disconnect();
  }
}

/**
 * Brings the restored file's schema up to date with the running code —
 * needed when the uploaded backup predates a migration that's since
 * shipped. Best-effort: the file swap has already succeeded by the time
 * this runs, and the process is about to restart regardless, so a failure
 * here is logged rather than thrown — it would otherwise surface loudly on
 * the next startup if something is genuinely wrong.
 */
async function runMigrateDeploy() {
  // Resolved directly rather than via `npx prisma` — npm workspaces hoist
  // the prisma CLI to the repo root's node_modules/.bin (confirmed on
  // disk; apps/api/node_modules/.bin has no prisma of its own), which is
  // also exactly how the Dockerfile's COPY --from=build /app/node_modules
  // lays things out at runtime. Calling the binary directly avoids both a
  // dependency on `npx` being resolvable on PATH and the shell:true a
  // `npx` invocation would otherwise need on Windows (Node flags that
  // combination as a command-injection risk — DEP0190 — even with fully
  // static args).
  const repoRoot = path.resolve(getApiRootDir(), '..', '..');
  const prismaBin = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

  try {
    await execFileAsync(prismaBin, ['migrate', 'deploy'], {
      cwd: getApiRootDir(),
      timeout: 60_000,
      // Windows' prisma.cmd is a batch file, not a real executable — Node
      // can't spawn it directly (fails with EINVAL, confirmed while
      // testing this) without a shell to interpret it. Only enabled on
      // Windows and only for this fully-static, non-user-controlled
      // argument list (no injection surface despite Node's generic
      // shell:true warning) — Linux/production's plain `prisma` binary
      // needs no shell at all.
      shell: process.platform === 'win32',
    });
  } catch (err) {
    console.error('[backupService] prisma migrate deploy after restore failed:', err.stderr || err.message);
  }
}

/**
 * Replaces the live database with an uploaded backup file. Super Admin
 * only (enforced by the route). This is the one genuinely destructive
 * operation in the app — every safeguard below exists because of that:
 *
 * 1. Validate the upload (SQLite header, size, required tables, integrity)
 *    entirely against its own temp copy, before it touches anything live.
 * 2. Snapshot the current database first (`pre-restore-` prefix, kept on
 *    disk indefinitely) — an undo path if the uploaded file turns out to
 *    be the wrong one.
 * 3. Atomically rename the validated upload over the live file (same
 *    directory/filesystem, so this can't leave a half-written db).
 * 4. Run pending migrations, in case the backup predates the current schema.
 *
 * There is deliberately no way to swap the file underneath the process's
 * existing Prisma connection and have it take effect safely — the caller
 * (routes/settings.js) exits the process right after this resolves, and
 * the host's process supervisor (Docker's `restart: unless-stopped`, or
 * the equivalent on Render/Railway/Fly) brings up a fresh one that opens
 * the new file cleanly. A brief restart is the actual "apply the restore"
 * step, not an incidental side effect.
 */
export async function restoreFromBackup(currentUser, buffer) {
  validateRestoreBuffer(buffer);

  const dbPath = getDatabaseFilePath();
  const dir = backupsDir();
  await fs.mkdir(dir, { recursive: true });
  const uploadPath = path.join(dir, `restore-upload-${Date.now()}.db`);
  await fs.writeFile(uploadPath, buffer);

  try {
    await verifyRestoreCandidate(uploadPath);

    // Safety net before anything irreversible happens — not logged to
    // activity_log (see createBackupFile's doc comment above). Still uses
    // the shared `prisma` connection, so this has to happen before it's
    // released below.
    await createBackupFile(null, { prefix: 'pre-restore-' });

    // The shared client (db.js) has held dev.db open for this process's
    // whole lifetime. On Windows that's an exclusive-enough lock that
    // fs.rename onto the same path fails with EPERM even though source
    // and destination are on the same volume (confirmed while testing
    // this) — POSIX allows renaming over an open file, Windows doesn't.
    // Nothing after this point needs `prisma` again; the caller exits the
    // process shortly after this function returns.
    await prisma.$disconnect();

    await fs.rename(uploadPath, dbPath);
    // Stale WAL/SHM sidecars from the *old* file are meaningless against
    // the new one — leaving them risks SQLite trying to replay them.
    await Promise.all([
      fs.rm(`${dbPath}-wal`, { force: true }),
      fs.rm(`${dbPath}-shm`, { force: true }),
    ]);

    await runMigrateDeploy();

    console.log(
      `[backupService] Database restored by ${currentUser.email} (${currentUser.userId}); server restarting.`,
    );
  } catch (err) {
    await fs.rm(uploadPath, { force: true }).catch(() => {});
    throw err;
  }
}

/** Used by routes/settings.js to stream the backup file, then remove the temp copy once sent. */
export function createReadStream(filePath) {
  return fsSync.createReadStream(filePath);
}
