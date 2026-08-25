import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { Card } from '../Card'
import { useCountUp } from '../../hooks/useCountUp'

// Completion is a ratio against a limit (0–100%), not a magnitude to
// compare — a meter, not another bare number (dataviz skill: choosing-a-form).
// Styled as a Lovelace tile with its progress bar as the tile's "feature"
// row, matching StatTile's icon-badge layout above it.
export default function CompletionMeter({ rate, className = '' }) {
  const displayRate = useCountUp(rate)

  // Bar starts at 0 and transitions to `rate` right after mount, so the
  // fill reads as motion rather than appearing pre-filled (the width
  // transition below only animates on a *change*, not the initial paint).
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarWidth(rate))
    return () => cancelAnimationFrame(frame)
  }, [rate])

  return (
    <Card interactive className={['rounded-2xl p-4', className].filter(Boolean).join(' ')}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tone-primary-bg text-tone-primary-text shadow-[-3px_-3px_7px_var(--neu-light),3px_3px_7px_var(--neu-dark)]">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-label-md font-label uppercase text-on-surface-variant">Completion</p>
          <p className="text-headline-md font-headline tabular-nums text-on-surface">{displayRate}%</p>
        </div>
      </div>
      {/* neu-inset: the track reads as a carved-in groove (soft UI's usual
          progress-bar treatment) instead of a flat fill. */}
      <div className="neu-inset mt-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-chart-series-1 transition-[width] duration-700 ease-out"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </Card>
  )
}
