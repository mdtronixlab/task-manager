import { Router } from 'express';
import { ROLES, config } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success } from '../lib/response.js';
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendTestNotification,
  sendCustomNotification,
} from '../services/pushService.js';
import { runTaskReminderSweep } from '../services/taskReminderService.js';
import { runTaskCompletionReminderSweep } from '../services/taskCompletionReminderService.js';
import { runTaskDueReminderSweep } from '../services/taskDueReminderService.js';
import { listWhatsAppTemplates, getWhatsAppDeliveryStatus, isWhatsAppConfigured } from '../services/whatsappService.js';
import { getWhatsAppScheduleSettings, updateWhatsAppScheduleSettings } from '../services/whatsappSettingsService.js';

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

// A Super Admin's free-form broadcast — { title, body, target: { scope:
// 'ALL'|'DEPARTMENT'|'USERS', departmentId?, userIds? }, sendWhatsApp?,
// whatsappTemplateId?, whatsappVars? }. sendCustomNotification validates the
// payload and resolves recipients itself; sendWhatsApp additionally fans it
// out over WhatsApp, as a template instead of plain text when
// whatsappTemplateId is set.
router.post('/send', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { title, body, target, sendWhatsApp, whatsappTemplateId, whatsappVars } = req.body;
    res.json(
      success(
        await sendCustomNotification(req.user, { title, body, target, sendWhatsApp, whatsappTemplateId, whatsappVars }),
        'Notification sent.',
      ),
    );
  } catch (err) {
    next(err);
  }
});

// Manual "run it now" trigger for the morning task reminder sweep — the
// scheduler (taskReminderService.js) fires this automatically at whatever
// times Settings > WhatsApp has configured, org time; this lets a Super
// Admin verify it works without waiting.
router.post('/task-reminder-sweep', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await runTaskReminderSweep(), 'Task reminder sweep run.'));
  } catch (err) {
    next(err);
  }
});

// Manual "run it now" trigger for the "mark completed" sweep — fires
// automatically at whatever time Settings > WhatsApp has configured, org
// time (taskCompletionReminderService.js); this lets a Super Admin verify
// it works without waiting.
router.post('/task-completion-reminder-sweep', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await runTaskCompletionReminderSweep(), 'Task completion reminder sweep run.'));
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

// Backs the custom-broadcast composer's template picker (NotificationComposerCard.jsx)
// — same OPENWA_NOT_CONFIGURED error as any other whatsappService call if
// WhatsApp isn't set up, which the frontend surfaces same as any other error.
router.get('/whatsapp-templates', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await listWhatsAppTemplates()));
  } catch (err) {
    next(err);
  }
});

// Settings > WhatsApp. Connection fields (apiUrl, sessionId) are read-only
// here — real info for troubleshooting, but env-only to change (config.js /
// docker-compose), never the API key itself. The two reminder schedules
// (each a list of {time, templateId} entries — WhatsAppSettingsCard.jsx
// presents them merged into one "Scheduler" list, picking a template also
// picks which of the two an entry belongs to) are the editable part (see
// whatsappSettingsService.js) — the welcome message's template is env-only
// (OPENWA_WELCOME_TEMPLATE_ID), not editable here.
router.get('/whatsapp-settings', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const schedule = await getWhatsAppScheduleSettings();
    res.json(
      success({
        configured: isWhatsAppConfigured(),
        apiUrl: config.openwaApiUrl,
        sessionId: config.openwaSessionId,
        ...schedule,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.patch('/whatsapp-settings', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { taskReminderSchedules, taskCompletionReminderSchedules } = req.body;
    const schedule = await updateWhatsAppScheduleSettings(req.user, {
      taskReminderSchedules,
      taskCompletionReminderSchedules,
    });
    res.json(success(schedule, 'WhatsApp settings updated.'));
  } catch (err) {
    next(err);
  }
});

// Settings > WhatsApp's per-staff delivery status — who's actually
// receiving messages vs. who isn't (whatsappService.js's message log,
// collapsed to one row per active user).
router.get('/whatsapp-delivery-status', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    res.json(success(await getWhatsAppDeliveryStatus()));
  } catch (err) {
    next(err);
  }
});

export default router;
