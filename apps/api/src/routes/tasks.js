import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getCarryForwardCandidates,
  carryForwardTask,
  dismissCarryForward,
} from '../services/taskService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(success(await getTasks(req.user, req.query)));
  } catch (err) {
    next(err);
  }
});

// Ahead of GET /:taskId-shaped routes below it would matter, but there
// isn't one yet — kept here anyway so it stays first if one's ever added.
router.get('/carry-forward-candidates', async (req, res, next) => {
  try {
    res.json(success(await getCarryForwardCandidates(req.user)));
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

router.post('/:taskId/carry-forward', async (req, res, next) => {
  try {
    res.status(201).json(success(await carryForwardTask(req.user, req.params.taskId), 'Task added to today.'));
  } catch (err) {
    next(err);
  }
});

router.post('/:taskId/dismiss-carry-forward', async (req, res, next) => {
  try {
    res.json(success(await dismissCarryForward(req.user, req.params.taskId)));
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

router.delete('/:taskId', async (req, res, next) => {
  try {
    res.json(success(await deleteTask(req.user, req.params.taskId), 'Task deleted.'));
  } catch (err) {
    next(err);
  }
});

export default router;
