const TONE_CLASSES = {
  primary: 'bg-tone-primary-bg text-tone-primary-text',
  success: 'bg-tone-success-bg text-tone-success-text',
  warning: 'bg-tone-warning-bg text-tone-warning-text',
  error: 'bg-tone-error-bg text-tone-error-text',
  neutral: 'bg-tone-neutral-bg text-tone-neutral-text',
}

/**
 * Status/priority indicator. Always pairs colour with a text label
 * (design.md §6–7, rules.md §10) — the label text alone already satisfies
 * that; a redundant leading dot (the 08-25 neumorphic pass's signature)
 * was decorative only and dropped in the 2026-09-05 redesign in favour of
 * a plain solid-tint chip.
 */
export default function Badge({ tone = 'neutral', children, className = '', ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1',
        'text-label-md font-label uppercase',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
