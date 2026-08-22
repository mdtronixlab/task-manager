import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getDailyReport, getReport, getCompletionTrend } from '../services/reportService.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/daily', async (req, res, next) => {
  try {
    res.json(success(await getDailyReport()));
  } catch (err) {
    next(err);
  }
});

// phases.md Phase 6 — same shape as /daily, over any period/staff/department.
router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getReport(req.query)));
  } catch (err) {
    next(err);
  }
});

router.get('/trend', async (req, res, next) => {
  try {
    res.json(success(await getCompletionTrend(req.query)));
  } catch (err) {
    next(err);
  }
});

export default router;
