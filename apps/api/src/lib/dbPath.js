// Resolves DATABASE_URL's `file:...` value to an absolute filesystem path —
// used by backupService.js, which needs to VACUUM INTO/read/replace the
// actual SQLite file rather than go through Prisma's query interface.
//
// Prisma resolves a relative `file:` URL against schema.prisma's own
// directory, not the process's cwd — a documented gotcha (see apps/api/
// Dockerfile's DATABASE_URL comment, hit firsthand while developing this
// project). Mirroring that resolution here, rather than process.cwd(),
// keeps this consistent with what Prisma itself actually opens.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRISMA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prisma');

export function getDatabaseFilePath() {
  const url = process.env.DATABASE_URL || '';
  const match = /^file:(.+)$/.exec(url);
  if (!match) {
    throw new Error(`DATABASE_URL must be a "file:" SQLite URL for backup/restore (got "${url}").`);
  }
  const raw = match[1];
  return path.isAbsolute(raw) ? raw : path.resolve(PRISMA_DIR, raw);
}

/** apps/api's own root directory (parent of prisma/) — used to run `prisma migrate deploy` with the right cwd. */
export function getApiRootDir() {
  return path.resolve(PRISMA_DIR, '..');
}
