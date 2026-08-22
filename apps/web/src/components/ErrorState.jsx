import { AlertTriangle } from 'lucide-react'
import Button from './Button'

// Error messages must be clear and actionable (design.md §28, rules.md §29).

export default function ErrorState({
  title = 'Something went wrong.',
  description,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-outline-variant px-6 py-12 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-tone-error-bg text-tone-error-text">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-body-md font-medium text-on-surface">{title}</p>
        {description && <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
