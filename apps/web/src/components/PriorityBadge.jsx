import Badge from './Badge'
import { TASK_PRIORITY_META } from '../constants/taskPriority'

/** Renders a task's priority as a `Badge` using the design.md §7 mapping. */
export default function PriorityBadge({ priority, className = '', ...props }) {
  const meta = TASK_PRIORITY_META[priority]
  if (!meta) return null

  return (
    <Badge tone={meta.tone} className={className} {...props}>
      {meta.label}
    </Badge>
  )
}
