import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getUsers, getCurrentUser, createUser } from '../services/userService.js';

const router = Router();

router.use(authenticate);

router.get('/me', (req, res) => {
  res.json(success(getCurrentUser(req.user)));
});

router.get('/', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
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

export default router;
