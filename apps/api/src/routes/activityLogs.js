import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getActivityLogs } from '../services/activityLogService.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getActivityLogs(req.query)));
  } catch (err) {
    next(err);
  }
});

export default router;
