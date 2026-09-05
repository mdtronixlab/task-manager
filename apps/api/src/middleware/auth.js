// Implements architecture.md §11 (as amended — see memory.md change log).
// React sends the Firebase ID token with every request; this server never
// trusts it at face value. Every authenticated route must go through
// `authenticate`, never trust a userId/email/role supplied directly in the
// request body (rules.md §12/§13).
//
// Uses the Firebase Admin SDK's verifyIdToken (local JWT/JWKS verification
// against Google's public certs) instead of the Identity Toolkit REST
// workaround the Apps Script version needed — a real Node runtime can use
// the Admin SDK directly.

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { prisma } from '../db.js';
import { Unauthorized, Forbidden } from '../lib/errors.js';

if (!getApps().length) {
  // Reads GOOGLE_APPLICATION_CREDENTIALS (path to a service account JSON) —
  // see apps/api/.env.example.
  initializeApp({ credential: applicationDefault() });
}

const auth = getAuth();

/** @param {string} email @return {string} trimmed, lowercased — architecture.md §5. */
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * Verifies the Firebase ID token, then resolves it to an active application
 * user. This is THE authorization gate (prd.md §5) — unknown or inactive
 * emails are denied here, before any route handler runs.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!idToken) throw Unauthorized();

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (err) {
      // rules.md §29 — don't silently swallow the real cause. A genuinely
      // expired/invalid token is unremarkable, but this catch also fires
      // for infrastructure misconfiguration (e.g. a missing
      // GOOGLE_APPLICATION_CREDENTIALS file) — that's not normal and is
      // otherwise invisible, since the client only ever sees the generic
      // message below by design (never leak verification internals).
      console.error('Firebase token verification failed:', err.code || err.message);
      throw Unauthorized('Your session is invalid or has expired. Please sign in again.');
    }

    if (!decoded.email) {
      throw Unauthorized('Your Google account has no email address on file.');
    }

    const email = normalizeEmail(decoded.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw Unauthorized('This Google account is not registered for this application.');
    }
    if (!user.active) {
      throw Forbidden('This account has been disabled. Contact your administrator.');
    }

    // Keep name/avatar in sync with the verified Google profile — this is
    // the only place a verified name claim is available, and it means no
    // account (including ones registered manually, e.g. the bootstrap
    // admin) is ever stuck showing a placeholder. Only writes on an actual
    // change, not every request (rules.md §43).
    const profileUpdates = {};
    if (decoded.name && decoded.name !== user.name) profileUpdates.name = decoded.name;
    if (decoded.picture && decoded.picture !== user.avatar) profileUpdates.avatar = decoded.picture;
    if (Object.keys(profileUpdates).length > 0) {
      await prisma.user.update({ where: { userId: user.userId }, data: profileUpdates });
      Object.assign(user, profileUpdates);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** @param {string|string[]} role One role (e.g. ROLES.SUPER_ADMIN), or several — e.g. config.js's ADMIN_ROLES — any of which passes. */
export function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role];
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) return next(Forbidden());
    next();
  };
}
