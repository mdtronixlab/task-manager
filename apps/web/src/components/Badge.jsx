const TONE_CLASSES = {
  primary: 'bg-tone-primary-bg text-tone-primary-text',
  success: 'bg-tone-success-bg text-tone-success-text',
  warning: 'bg-tone-warning-bg text-tone-warning-text',
  error: 'bg-tone-error-bg text-tone-error-text',
  neutral: 'bg-tone-neutral-bg text-tone-neutral-text',
}

/**
 * Status/priority indicator. Always pairs colour with a text label
 * (design.md §6–7, rules.md §10) — never render a bare coloured dot.
 */
export default function Badge({ tone = 'neutral', children, className = '', ...props }) {
  return (
    <span
      className={[
        // Soft UI reads status chips as small pressed wells rather than a
        // bordered/frosted pill — shadow-inner (Tailwind's fixed generic
        // inset shadow, not the --neu-* pair) works here because it's
        // layered on the tone's own flat colour, not the page surface.
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-inner',
        'text-label-md font-label uppercase',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}
