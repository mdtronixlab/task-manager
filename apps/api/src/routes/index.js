import { Router } from 'express';
import { success } from '../lib/response.js';
import usersRouter from './users.js';
import tasksRouter from './tasks.js';
import categoriesRouter from './categories.js';
import departmentsRouter from './departments.js';
import reportsRouter from './reports.js';
import settingsRouter from './settings.js';
import activityLogsRouter from './activityLogs.js';

const router = Router();

// Unauthenticated health check.
router.get('/health', (req, res) => {
  res.json(success({ status: 'ok' }, 'OTM API is running.'));
});

router.use('/users', usersRouter);
router.use('/tasks', tasksRouter);
router.use('/categories', categoriesRouter);
router.use('/departments', departmentsRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/activity-logs', activityLogsRouter);

export default router;
