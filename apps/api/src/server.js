import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config.js';
import { startTaskReminderScheduler } from './services/taskReminderService.js';
import { startTaskCompletionReminderScheduler } from './services/taskCompletionReminderService.js';
import { startTaskDueReminderScheduler } from './services/taskDueReminderService.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`OTM API listening on http://localhost:${config.port}`);
});

// Background jobs, not request-driven routes — started here (process
// startup) rather than in app.js, which stays a pure app factory.
startTaskReminderScheduler();
startTaskCompletionReminderScheduler();
startTaskDueReminderScheduler();
