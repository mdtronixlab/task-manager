import { forwardRef, useId } from 'react'

/**
 * Labelled text input. Validation renders next to the field, never only as
 * colour (design.md §30, rules.md §10).
 */
const Input = forwardRef(function Input(
  { label, id, error, hint, required, className = '', containerClassName = '', ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className={['flex flex-col gap-1.5', containerClassName].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-on-surface">
          {label}
          {required && (
            <span className="text-error" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={[
          'h-10 rounded-md border bg-surface-container-low px-3 text-body-md text-on-surface',
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

export default Input
