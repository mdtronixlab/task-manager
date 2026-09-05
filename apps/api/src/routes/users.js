import { Router } from 'express';
import { ROLES, ADMIN_ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getUsers, getCurrentUser, createUser, updateUser } from '../services/userService.js';

const router = Router();

router.use(authenticate);

router.get('/me', (req, res) => {
  res.json(success(getCurrentUser(req.user)));
});

// Read-only for both elevated roles — Admin needs the roster to populate
// Tasks/Reports' staff filter and the "Assign to" picker, even though
// actually managing users (below) stays Super Admin only.
router.get('/', requireRole(ADMIN_ROLES), async (req, res, next) => {
  try {
    res.json(success(await getUsers()));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.status(201).json(success(await createUser(req.user, req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:userId', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await updateUser(req.user, req.params.userId, req.body), 'User updated.'));
  } catch (err) {
    next(err);
  }
});

export default router;
