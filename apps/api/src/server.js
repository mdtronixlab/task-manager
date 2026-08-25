import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config.js';
import { startTaskReminderScheduler } from './services/taskReminderService.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`OTM API listening on http://localhost:${config.port}`);
});

// Background job, not a request-driven route — started here (process
// startup) rather than in app.js, which stays a pure app factory.
startTaskReminderScheduler();
