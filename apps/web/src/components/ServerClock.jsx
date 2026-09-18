import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { useBranding } from '../context/BrandingContext'
import { getServerTime } from '../services/settings'

// How often to re-fetch the actual server instant and correct local drift —
// frequent enough that a viewer's wrong/drifted system clock or a
// long-left-open tab never falls far behind, rare enough it never reads as
// polling.
const RESYNC_INTERVAL_MS = 5 * 60 * 1000

/**
 * Live clock for the desktop sidebar (AppShell) — same "never trust the
 * viewer's own clock" reasoning as the server's date helpers (lib/time.js,
 * rules.md §18/§19): a browser's system clock routinely drifts or is just
 * set wrong, so this periodically syncs against GET /api/settings/time
 * (services/settings.js's getServerTime) instead of trusting Date.now()
 * outright, and ticks locally off that corrected offset in between syncs
 * rather than hitting the endpoint every second. Formatted in the
 * organisation's configured timezone (BrandingContext, from
 * lib/time.js's getOrgTimezone), not each viewer's own — so everyone
 * looking at it agrees on what "now" is for the org's task day.
 */
export default function ServerClock() {
  const { timezone } = useBranding()
  // ms to add to the browser's own Date.now() to land on the real server
  // instant — corrected on each resync below. Starts at 0 (trust the
  // browser clock) until the first fetch lands, so the clock shows
  // *something* immediately rather than blank while waiting on the network.
  const offsetRef = useRef(0)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false

    async function resync() {
      try {
        const { now: serverNow } = await getServerTime()
        if (cancelled) return
        offsetRef.current = new Date(serverNow).getTime() - Date.now()
      } catch {
        // Best-effort — a failed sync just leaves whatever offset (possibly
        // still 0) it already had; the clock keeps ticking regardless.
      }
    }

    resync()
    const resyncId = setInterval(resync, RESYNC_INTERVAL_MS)
    const tickId = setInterval(() => setNow(new Date(Date.now() + offsetRef.current)), 1000)
    return () => {
      cancelled = true
      clearInterval(resyncId)
      clearInterval(tickId)
    }
  }, [])

  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now)

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2">
      <Clock className="size-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-body-sm font-medium tabular-nums text-on-surface">{timeLabel}</p>
        <p className="truncate text-label-sm text-on-surface-variant">{dateLabel}</p>
      </div>
    </div>
  )
}
