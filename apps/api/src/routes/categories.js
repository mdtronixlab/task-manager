import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getCategories } from '../services/categoryService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getCategories()));
  } catch (err) {
    next(err);
  }
});

export default router;
