import { Card } from '../Card'

// Completion is a ratio against a limit (0–100%), not a magnitude to
// compare — a meter, not another bare number (dataviz skill: choosing-a-form).
export default function CompletionMeter({ rate, className = '' }) {
  return (
    <Card className={['p-4', className].filter(Boolean).join(' ')}>
      <div className="flex items-baseline justify-between">
        <p className="text-label-md font-label uppercase text-on-surface-variant">Completion</p>
        <p className="text-body-md font-medium tabular-nums text-on-surface">{rate}%</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${rate}%` }}
        />
      </div>
    </Card>
  )
}
