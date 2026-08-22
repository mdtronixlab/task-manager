import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import { getTasks, createTask, updateTask } from '../services/taskService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getTasks(req.user, req.query)));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(success(await createTask(req.user, req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:taskId', async (req, res, next) => {
  try {
    res.json(success(await updateTask(req.user, req.params.taskId, req.body)));
  } catch (err) {
    next(err);
  }
});

export default router;
