// Application branding settings, stored in the existing Setting table
// (no schema change — a new APP_LOGO row alongside APPLICATION_NAME/
// TIMEZONE). Only the logo is writable here; broader settings management
// is a later concern.
//
// The logo is stored as a validated data URI rather than a file on disk —
// deliberate: this is one small, rarely-changed image, not a bulk-upload
// feature, so it doesn't justify multer/disk storage or object storage
// (rules.md §33 Dependency Rules). It rides along with the SQLite file for
// backup purposes (architecture.md §30) instead of needing a second thing
// to back up.

import { prisma } from '../db.js';
import { ValidationError } from '../lib/errors.js';
import { logActivity } from '../activityLog.js';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB raw (~2.7MB as base64)
const LOGO_DATA_URI_PATTERN = /^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/]+=*)$/;

/**
 * Settings any client needs to render the app's identity — deliberately
 * unauthenticated (like /api/health) since the login page needs this
 * before any session exists, and none of it is sensitive.
 */
export async function getPublicSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: ['APPLICATION_NAME', 'APP_LOGO'] } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    applicationName: byKey.APPLICATION_NAME || 'Organisation Task Manager',
    logoUrl: byKey.APP_LOGO || null,
  };
}

/**
 * @param {object} currentUser
 * @param {string|null} dataUri A `data:image/{png,jpeg,webp,svg+xml};base64,...`
 *   URI, or null to remove the custom logo and revert to the built-in mark.
 *   Super Admin only — enforced by requireRole in the route.
 */
export async function updateLogo(currentUser, dataUri) {
  if (dataUri === null) {
    await prisma.setting.deleteMany({ where: { key: 'APP_LOGO' } });
    await logActivity(currentUser.userId, null, 'SETTINGS_UPDATED', 'APP_LOGO', 'set', 'removed');
    return { logoUrl: null };
  }

  const match = LOGO_DATA_URI_PATTERN.exec(dataUri);
  if (!match) {
    throw ValidationError('Logo must be a PNG, JPEG, WEBP, or SVG image.');
  }

  // SVG is safe here specifically because it's only ever rendered via
  // <img src>, never inline/dangerouslySetInnerHTML — browsers don't
  // execute scripts embedded in an <img>-loaded SVG (apps/web/src/
  // components/Logo.jsx). Don't relax that rendering rule without
  // reconsidering this.
  const approxBytes = Math.ceil((match[2].length * 3) / 4);
  if (approxBytes > MAX_LOGO_BYTES) {
    throw ValidationError('Logo must be 2MB or smaller.');
  }

  await prisma.setting.upsert({
    where: { key: 'APP_LOGO' },
    update: { value: dataUri, description: 'Application logo (data URI)' },
    create: { key: 'APP_LOGO', value: dataUri, description: 'Application logo (data URI)' },
  });

  await logActivity(currentUser.userId, null, 'SETTINGS_UPDATED', 'APP_LOGO', 'previous', 'updated', { approxBytes });

  return { logoUrl: dataUri };
}
