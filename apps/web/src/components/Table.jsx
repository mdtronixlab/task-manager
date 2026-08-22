// Composable table primitives (design.md §20/§33). `Table` wraps its
// content in a horizontally scrollable container so wide tables degrade
// gracefully on small screens instead of breaking layout (rules.md §9).

export function Table({ className = '', children, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-outline-variant">
      <table
        className={['w-full border-collapse text-left text-body-sm', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead className={['bg-surface-container-low', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className = '', children, ...props }) {
  return (
    <tbody
      className={['divide-y divide-outline-variant', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </tbody>
  )
}

export function TableRow({ className = '', children, ...props }) {
  return (
    <tr
      className={['transition-colors hover:bg-surface-container-low', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ className = '', children, ...props }) {
  return (
    <th
      scope="col"
      className={[
        'px-4 py-3 text-label-md font-label uppercase text-on-surface-variant',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className = '', children, ...props }) {
  return (
    <td className={['px-4 py-3 text-on-surface', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </td>
  )
}
