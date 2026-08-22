// Cards per design.md §3/§11: rounded, separated by border + surface
// contrast rather than heavy shadows.

export function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={[
        'rounded-lg border border-outline-variant bg-surface-container text-on-surface',
        className,
      ]
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
