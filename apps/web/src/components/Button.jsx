import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

// Three levels per design.md §31 — do not make every button visually
// prominent. `ghost` is a low-emphasis fourth option for icon-only /
// toolbar-style actions, still mapped to the same semantic tokens.
const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary:
    'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high',
  destructive: 'bg-error text-on-error hover:opacity-90',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-high',
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
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
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
