// Cards per design.md §3/§11: rounded, separated by border + surface
// contrast rather than heavy shadows. Redesigned 2026-08-25 as neumorphic
// "soft UI" (.neu, styles/index.css) — the card is the same colour as the
// page and reads as a raised bump purely through a light/dark shadow
// pair, replacing the 08-24 frosted-glass pass (no more border, tint, or
// backdrop-blur here).

// Shared tactile treatment for cards that act like a single click target
// (KPI tiles, task cards) — .neu-interactive owns the actual hover/active
// shadow states (styles/index.css); one definition instead of the same
// string copy-pasted across StatTile/CompletionMeter/TaskCard.
const INTERACTIVE_CLASSES = 'neu-interactive cursor-pointer'

export function Card({ as: Component = 'div', interactive = false, className = '', children, ...props }) {
  return (
    <Component
      className={['neu rounded-2xl text-on-surface', interactive && INTERACTIVE_CLASSES, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={['flex flex-col gap-1 p-5 pb-0', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ as: Component = 'h3', className = '', children, ...props }) {
  return (
    <Component
      className={['text-body-lg font-headline font-semibold text-on-surface', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={['text-body-sm text-on-surface-variant', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={['p-5', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={['flex items-center gap-3 p-5 pt-0', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
