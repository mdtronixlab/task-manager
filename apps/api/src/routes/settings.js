import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getPublicSettings, updateLogo } from '../services/settingsService.js';

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

export default router;
