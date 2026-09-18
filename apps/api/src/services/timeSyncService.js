// Reference-clock sync — corrects this process's own clock against a
// public HTTPS server's `Date` response header, in case the host machine's
// system clock has drifted or was simply never set correctly. Distinct
// from lib/time.js's org *timezone* handling (that's what zone "now" is
// displayed in; this is what "now" actually is).
//
// Not full NTP (no UDP round-trip protocol, no extra dependency — rules.md
// §33 Dependency Rules): an HTTP Date header is accurate to the second,
// which is all a UI clock (GET /api/settings/time, ServerClock.jsx's
// sidebar clock) needs, and it travels over 443 so it works anywhere
// outbound HTTPS is already allowed.

const TIME_SERVERS = ['https://www.cloudflare.com', 'https://www.google.com'];
// A clock that's already this-process-correct doesn't need to phone home
// often — hourly is plenty to catch real drift without being chatty.
const SYNC_INTERVAL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

let offsetMs = 0;
let lastSyncedAt = null;
let intervalHandle = null;

async function offsetFrom(url) {
  // A manually-owned AbortController/setTimeout pair, not
  // AbortSignal.timeout() — Node's own internal timer for that has a known
  // libuv race with process exit/restart on Windows (surfaces as an
  // "Assertion failed... UV_HANDLE_CLOSING" crash); clearing our own timer
  // the moment the request settles avoids depending on that cleanup path.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  const t0 = Date.now();
  try {
    res = await fetch(url, { method: 'HEAD', signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  const t1 = Date.now();

  const dateHeader = res.headers.get('date');
  if (!dateHeader) throw new Error('response had no Date header');
  const serverMs = new Date(dateHeader).getTime();
  if (Number.isNaN(serverMs)) throw new Error('unparseable Date header');

  // Assume symmetric network latency — the header corresponds to roughly
  // the midpoint of our own round trip, the same approximation real NTP
  // clients use.
  return serverMs - (t0 + (t1 - t0) / 2);
}

/**
 * Re-syncs this process's clock offset against the first time server that
 * answers. Best-effort: a failed sync (offline, every server unreachable)
 * just keeps whatever offset it already had (possibly still 0, i.e. the raw
 * local clock) — a UI clock running slightly off is never worth failing a
 * request over.
 */
export async function syncTime() {
  for (const url of TIME_SERVERS) {
    try {
      offsetMs = await offsetFrom(url);
      lastSyncedAt = new Date();
      return;
    } catch (err) {
      console.error(`[timeSyncService] ${url} failed:`, err.message);
    }
  }
  console.error('[timeSyncService] All time servers unreachable — keeping the previous offset.');
}

/** @return {Date} This process's clock, corrected by the last-synced offset. */
export function syncedNow() {
  return new Date(Date.now() + offsetMs);
}

/** @return {Date|null} When the offset was last successfully corrected — null before the first sync completes. */
export function getLastSyncedAt() {
  return lastSyncedAt;
}

/** Starts periodic re-sync. Call once at process startup (server.js) — syncs immediately, then hourly. */
export function startTimeSyncScheduler() {
  if (intervalHandle) return;
  syncTime().catch((err) => console.error('[timeSyncService] initial sync failed:', err));
  intervalHandle = setInterval(() => {
    syncTime().catch((err) => console.error('[timeSyncService] sync failed:', err));
  }, SYNC_INTERVAL_MS);
  // Don't hold the process open just for this timer (e.g. in tests).
  intervalHandle.unref?.();
}

/** Stops periodic re-sync — for tests. */
export function stopTimeSyncScheduler() {
  clearInterval(intervalHandle);
  intervalHandle = null;
}
