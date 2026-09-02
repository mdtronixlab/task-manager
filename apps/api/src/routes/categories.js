import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getCategories, createCategory, updateCategory } from '../services/categoryService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getCategories(req.query)));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.status(201).json(success(await createCategory(req.user, req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:categoryId', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await updateCategory(req.user, req.params.categoryId, req.body), 'Category updated.'));
  } catch (err) {
    next(err);
  }
});

export default router;
