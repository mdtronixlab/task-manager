// Empty states must tell the user what to do next, not just say "nothing
// here" (rules.md §31, design.md §26).

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-outline-variant px-6 py-12 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
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
