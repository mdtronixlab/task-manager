import Badge from './Badge'
import { TASK_STATUS_META } from '../constants/taskStatus'

/** Renders a task's status as a `Badge` using the design.md §6 mapping. */
export default function StatusBadge({ status, className = '', ...props }) {
  const meta = TASK_STATUS_META[status]
  if (!meta) return null

  return (
    <Badge tone={meta.tone} className={className} {...props}>
      {meta.label}
    </Badge>
  )
}
