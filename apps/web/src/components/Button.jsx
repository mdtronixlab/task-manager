import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

// Three levels per design.md §31 — do not make every button visually
// prominent. `ghost` is a low-emphasis fourth option for icon-only /
// toolbar-style actions, still mapped to the same semantic tokens.
// Redesigned 2026-08-25 as neumorphic (soft UI): primary/destructive keep
// a gradient fill (colour hierarchy still needs to read at a glance) but
// its shadow is now a raised bump off the page rather than a glass glow;
// secondary is a plain .neu button (same colour as the page, shape read
// through shadow alone); ghost stays flat until hover, when it pops up
// into a small raised .neu-sm — mirrors a physical button that only
// shows its bevel once you reach for it.
const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-br from-primary to-chart-series-1 text-on-primary shadow-[-4px_-4px_10px_var(--neu-light),4px_4px_10px_var(--neu-dark),0_4px_16px_-4px_var(--color-primary)] hover:brightness-110 active:shadow-[inset_-3px_-3px_7px_var(--neu-light),inset_3px_3px_7px_var(--neu-dark)]',
  secondary: 'neu neu-interactive text-on-surface',
  destructive:
    'bg-gradient-to-br from-error to-tertiary-container text-on-error shadow-[-4px_-4px_10px_var(--neu-light),4px_4px_10px_var(--neu-dark),0_4px_16px_-4px_var(--color-error)] hover:brightness-110 active:shadow-[inset_-3px_-3px_7px_var(--neu-light),inset_3px_3px_7px_var(--neu-dark)]',
  ghost: 'bg-transparent text-on-surface-variant hover:neu-sm active:neu-inset',
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-body-sm gap-1.5',
  md: 'h-10 px-4 text-body-sm gap-2',
  lg: 'h-12 px-5 text-body-md gap-2',
}

/**
 * Primary interactive control. Prevents duplicate submissions while
 * `loading` is true (design.md §27, §30).
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    loadingText,
    type = 'button',
    className = '',
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
})

export default Button
