import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getDepartments, createDepartment, updateDepartment } from '../services/departmentService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getDepartments(req.query)));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.status(201).json(success(await createDepartment(req.user, req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:departmentId', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await updateDepartment(req.user, req.params.departmentId, req.body), 'Department updated.'));
  } catch (err) {
    next(err);
  }
});

export default router;
