import { ClipboardList } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table'
import StatusBadge from '../StatusBadge'
import PriorityBadge from '../PriorityBadge'
import EmptyState from '../EmptyState'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Read-only, org-wide task list (phases.md Phase 4: "Admin can view all
 * tasks" — no status actions here; filtering/history is Phase 5).
 * @param {{tasks: object[], staffById: Record<string,string>, categoriesById: Record<string,string>}} props
 */
export default function TaskOverviewTable({ tasks, staffById, categoriesById }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks recorded today."
        description="Tasks staff create today will appear here."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Staff</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.taskId}>
            <TableCell className="max-w-xs truncate">{task.title}</TableCell>
            <TableCell>{staffById[task.userId] || task.userId}</TableCell>
            <TableCell>{task.categoryId ? categoriesById[task.categoryId] || '—' : '—'}</TableCell>
            <TableCell>
              <PriorityBadge priority={task.priority} />
            </TableCell>
            <TableCell>
              <StatusBadge status={task.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatTime(task.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
