import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Labelled select. Pass either `options` (`{ value, label }[]`) or native
 * `<option>` children.
 */
const Select = forwardRef(function Select(
  {
    label,
    id,
    error,
    hint,
    required,
    options,
    className = '',
    containerClassName = '',
    children,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const selectId = id || generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const hintId = hint ? `${selectId}-hint` : undefined

  return (
    <div className={['flex flex-col gap-1.5', containerClassName].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={selectId} className="text-body-sm font-medium text-on-surface">
          {label}
          {required && (
            <span className="text-error" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={[
            'h-10 w-full appearance-none rounded-md border bg-surface-container-low px-3 pr-9 text-body-md text-on-surface',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            error ? 'border-error' : 'border-outline-variant',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
        />
      </div>
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

export default Select
