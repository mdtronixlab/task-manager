import { Router } from 'express';
import { ROLES } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendTestNotification,
} from '../services/pushService.js';
import { runTaskReminderSweep } from '../services/taskReminderService.js';
import { runTaskDueReminderSweep } from '../services/taskDueReminderService.js';

const router = Router();

router.use(authenticate);

router.get('/vapid-public-key', (req, res, next) => {
  try {
    res.json(success({ publicKey: getVapidPublicKey() }));
  } catch (err) {
    next(err);
  }
});

router.post('/subscribe', async (req, res, next) => {
  try {
    await saveSubscription(req.user, req.body.subscription);
    res.status(201).json(success({ subscribed: true }));
  } catch (err) {
    next(err);
  }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    res.json(success(await removeSubscription(req.user, req.body.endpoint)));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    res.json(success(await sendTestNotification(req.user), 'Test notification sent.'));
  } catch (err) {
    next(err);
  }
});

// Manual "run it now" trigger for the 8am task reminder sweep — the
// scheduler (taskReminderService.js) fires this automatically at 8:00/8:30/
// 9:00 org time; this lets a Super Admin verify it works without waiting.
router.post('/task-reminder-sweep', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await runTaskReminderSweep(), 'Task reminder sweep run.'));
  } catch (err) {
    next(err);
  }
});

// Same "run it now" idea for the per-task due-time sweep
// (taskDueReminderService.js), which otherwise only fires at the exact
// minute a task's dueTime matches the org clock.
router.post('/task-due-reminder-sweep', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await runTaskDueReminderSweep(), 'Task due-reminder sweep run.'));
  } catch (err) {
    next(err);
  }
});

export default router;
