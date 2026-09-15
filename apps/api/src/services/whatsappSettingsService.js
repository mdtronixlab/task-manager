// WhatsApp *template* overrides — Settings > WhatsApp lets a Super Admin
// swap which OpenWA template each automatic message uses (Sessions >
// Templates in OpenWA's own dashboard) without a redeploy, stored in the
// existing Setting table (same key/value mechanism as settingsService.js's
// APP_LOGO / lib/time.js's TIMEZONE — no schema change).
//
// Connection settings (API URL, API key, session ID) deliberately stay
// env-only (config.js / docker-compose) rather than moving into this same
// table — they're infra credentials tied to a specific OpenWA deployment,
// not day-to-day content a Super Admin should be pasting into a web form,
// and whatsappService.js's isWhatsAppConfigured() gate stays a cheap sync
// check because of it.

import { prisma } from '../db.js';
import { config } from '../config.js';
import { logActivity } from '../activityLog.js';

const TEMPLATE_SETTING_KEYS = {
  taskReminderTemplateId: 'WHATSAPP_TASK_REMINDER_TEMPLATE_ID',
  welcomeTemplateId: 'WHATSAPP_WELCOME_TEMPLATE_ID',
};

let cache = null;

/**
 * @return {Promise<{taskReminderTemplateId: string|null, welcomeTemplateId: string|null}>}
 *   A DB override falls back to the matching OPENWA_*_TEMPLATE_ID env var
 *   (config.js) when no row exists yet, so an existing env-configured
 *   deployment keeps working unchanged until someone actually edits it here.
 */
export async function getWhatsAppTemplateSettings() {
  if (cache) return cache;

  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(TEMPLATE_SETTING_KEYS) } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cache = {
    taskReminderTemplateId: byKey[TEMPLATE_SETTING_KEYS.taskReminderTemplateId] || config.openwaTaskReminderTemplateId,
    welcomeTemplateId: byKey[TEMPLATE_SETTING_KEYS.welcomeTemplateId] || config.openwaWelcomeTemplateId,
  };
  return cache;
}

/** Call after updateWhatsAppTemplateSettings (below already does) so the next read picks up the change. */
export function clearWhatsAppTemplateSettingsCache() {
  cache = null;
}

/**
 * @param {object} currentUser
 * @param {{taskReminderTemplateId?: string|null, welcomeTemplateId?: string|null}} data
 *   A field left `undefined` is untouched; an empty string/null clears the
 *   override and reverts that message to its env default (or the plain
 *   built-in wording if no env var is set either) — same "unset = fall
 *   back" shape sendTaskReminderWhatsApp/sendWelcomeWhatsApp already use.
 *   Super Admin only — enforced by requireRole in the route.
 */
export async function updateWhatsAppTemplateSettings(currentUser, data = {}) {
  for (const [field, key] of Object.entries(TEMPLATE_SETTING_KEYS)) {
    if (!(field in data)) continue;
    const trimmed = typeof data[field] === 'string' ? data[field].trim() : '';
    if (trimmed) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: trimmed },
        create: { key, value: trimmed, description: `WhatsApp override: ${field}` },
      });
    } else {
      await prisma.setting.deleteMany({ where: { key } });
    }
  }

  clearWhatsAppTemplateSettingsCache();
  await logActivity(currentUser.userId, null, 'SETTINGS_UPDATED', 'WHATSAPP_TEMPLATES', 'previous', 'updated', data);

  return getWhatsAppTemplateSettings();
}
