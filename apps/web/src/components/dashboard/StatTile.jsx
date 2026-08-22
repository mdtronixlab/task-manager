import { Card } from '../Card'

// Reuses this app's existing status-tone tokens (constants/taskStatus.js
// TASK_STATUS_META) rather than a new palette — same tones already used
// everywhere via StatusBadge (dataviz skill: a handful of headline numbers
// → stat tiles, colored by the status palette parameter, not invented hues).
const TONE_TEXT_CLASSES = {
  neutral: 'text-on-surface',
  warning: 'text-tone-warning-text',
  primary: 'text-tone-primary-text',
  success: 'text-tone-success-text',
  error: 'text-tone-error-text',
}

export default function StatTile({ label, value, tone = 'neutral', className = '' }) {
  return (
    <Card className={['p-4', className].filter(Boolean).join(' ')}>
      <p className="text-label-md font-label uppercase text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-headline-lg font-headline tabular-nums ${TONE_TEXT_CLASSES[tone]}`}>
        {value}
      </p>
    </Card>
  )
}
