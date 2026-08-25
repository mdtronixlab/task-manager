// Empty states must tell the user what to do next, not just say "nothing
// here" (rules.md §31, design.md §26).

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={[
        // A sunken tray rather than a raised card: nothing here *yet* reads
        // naturally as a recessed empty slot in soft UI, and it keeps this
        // visually distinct from the raised cards around it without a border.
        'neu-inset flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-12 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (
        <div className="neu-sm flex size-12 items-center justify-center rounded-full text-on-surface-variant">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      )}
      <div>
        <p className="text-body-md font-medium text-on-surface">{title}</p>
        {description && <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>}
      </div>
      {action}
    </div>
  )
}
