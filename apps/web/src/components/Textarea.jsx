import { forwardRef, useId } from 'react'

/**
 * Labelled multi-line text field — same label/error/hint contract as
 * `Input` (design.md §30, rules.md §10), just for longer text.
 */
const Textarea = forwardRef(function Textarea(
  { label, id, error, hint, required, rows = 3, className = '', containerClassName = '', ...props },
  ref,
) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const errorId = error ? `${textareaId}-error` : undefined
  const hintId = hint ? `${textareaId}-hint` : undefined

  return (
    <div className={['flex flex-col gap-1.5', containerClassName].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={textareaId} className="text-body-sm font-medium text-on-surface">
          {label}
          {required && (
            <span className="text-error" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={[
          'resize-y rounded-md border bg-surface-container-low px-3 py-2 text-body-md text-on-surface',
          'placeholder:text-on-surface-variant',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          error ? 'border-error' : 'border-outline-variant',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export default Textarea
