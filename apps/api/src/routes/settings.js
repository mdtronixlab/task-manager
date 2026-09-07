import { Router, raw } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getPublicSettings, updateLogo } from '../services/settingsService.js';
import { createBackupFile, deleteBackupFile, restoreFromBackup, createReadStream, MAX_RESTORE_BYTES } from '../services/backupService.js';

const router = Router();

// Deliberately unauthenticated (like /api/health) — the login page needs
// the org's name/logo before any session exists. Mixed auth per route
// below, not router.use(authenticate), unlike this project's other routers.
router.get('/public', async (req, res, next) => {
  try {
    res.json(success(await getPublicSettings()));
  } catch (err) {
    next(err);
  }
});

router.patch('/logo', authenticate, requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await updateLogo(req.user, req.body.logo ?? null)));
  } catch (err) {
    next(err);
  }
});

// architecture.md §30 Backup Strategy — self-service instead of (or
// alongside) an ops-level cron copy. Not the {success,data} JSON envelope:
// this returns a file, same reasoning as reports.js's /export.
router.get('/backup', authenticate, requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  let file;
  try {
    file = await createBackupFile(req.user);
  } catch (err) {
    return next(err);
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  const cleanup = () => deleteBackupFile(file.path);
  const stream = createReadStream(file.path);
  stream.on('error', (err) => {
    cleanup();
    next(err);
  });
  stream.on('close', cleanup);
  stream.pipe(res);
});

// Raw binary body, not JSON — a Super-Admin-only, rarely-used upload
// doesn't justify a multer/streaming dependency (rules.md §33) when
// express's own raw() body parser, scoped to just this route, covers it.
router.post(
  '/restore',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN),
  raw({ type: '*/*', limit: MAX_RESTORE_BYTES }),
  async (req, res, next) => {
    try {
      await restoreFromBackup(req.user, req.body);
    } catch (err) {
      return next(err);
    }
    res.json(success({ restarting: true }, 'Database restored. The server is restarting — this page will reconnect in a few seconds.'));
    // There's no in-process way to safely re-point the running Prisma
    // connection at the file that was just swapped in — see
    // backupService.js's restoreFromBackup doc comment. Exiting (after the
    // response above has had a moment to flush) is the actual "apply the
    // restore" step; the host's process supervisor brings up a fresh
    // process that opens the new file cleanly.
    setTimeout(() => process.exit(0), 300);
  },
);

export default router;
