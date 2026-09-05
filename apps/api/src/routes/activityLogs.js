import { Router } from 'express';
import { ADMIN_ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getActivityLogs } from '../services/activityLogService.js';

const router = Router();

router.use(authenticate);
// Org-wide activity log — Admin and Super Admin share this authority (config.js's ADMIN_ROLES).
router.use(requireRole(ADMIN_ROLES));

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getActivityLogs(req.query)));
  } catch (err) {
    next(err);
  }
});

export default router;
