import { Card } from '../Card'
import { useCountUp } from '../../hooks/useCountUp'

// Reuses this app's existing status-tone tokens (constants/taskStatus.js
// TASK_STATUS_META) rather than a new palette — same tones already used
// everywhere via StatusBadge (dataviz skill: a handful of headline numbers
// → stat tiles, colored by the status palette parameter, not invented hues).
// Same bg/text pairing as Badge.jsx's TONE_CLASSES.
const TONE_CLASSES = {
  neutral: 'bg-tone-neutral-bg text-tone-neutral-text',
  warning: 'bg-tone-warning-bg text-tone-warning-text',
  primary: 'bg-tone-primary-bg text-tone-primary-text',
  success: 'bg-tone-success-bg text-tone-success-text',
  error: 'bg-tone-error-bg text-tone-error-text',
}

// A small raised bump, same --neu-* shadow pair as everything else, laid
// over each tone's own flat colour instead of the page's — soft UI's
// dual light/dark shadow reads as "a bump" on *any* background, so the
// coloured tone doesn't need to match --neu-surface the way a full panel
// (.neu on Card) does.
const NEU_ICON_SHADOW = 'shadow-[-3px_-3px_7px_var(--neu-light),3px_3px_7px_var(--neu-dark)]'

// Home Assistant Lovelace "tile" layout: a colour-washed icon badge leading
// a name/state stack, inside a generously rounded card. The icon carries the
// tone here (not the number) so status still isn't colour-only — the label
// text next to it says the same thing in words (rules.md §10).
export default function StatTile({ label, value, tone = 'neutral', icon: Icon, className = '' }) {
  const displayValue = useCountUp(value)

  return (
    <Card
      interactive
      className={['flex items-center gap-3 rounded-2xl p-4', className].filter(Boolean).join(' ')}
    >
      {Icon && (
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${NEU_ICON_SHADOW} ${TONE_CLASSES[tone]}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-label-md font-label uppercase text-on-surface-variant">{label}</p>
        <p className="text-headline-md font-headline tabular-nums text-on-surface">{displayValue}</p>
      </div>
    </Card>
  )
}
