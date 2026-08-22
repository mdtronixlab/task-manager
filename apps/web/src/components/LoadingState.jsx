import { Loader2 } from 'lucide-react'

// Avoid showing stale/misleading data while a request is in flight
// (rules.md §30, design.md §27).

export default function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div
      role="status"
      className={[
        'flex flex-col items-center justify-center gap-3 py-12 text-on-surface-variant',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-body-sm">{label}</p>
    </div>
  )
}
