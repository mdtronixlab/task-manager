import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table'
import Badge from '../Badge'
import EmptyState from '../EmptyState'

/** Per-staff rollup table (prd.md §12). @param {{staff: object[]}} props */
export default function StaffSummaryTable({ staff }) {
  if (staff.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No staff registered yet."
        description="Staff accounts will appear here once added."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff</TableHead>
          <TableHead className="text-right">Tasks</TableHead>
          <TableHead className="text-right">Completed</TableHead>
          <TableHead className="text-right">Pending</TableHead>
          <TableHead className="text-right">Blocked</TableHead>
          <TableHead className="text-right">Completion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.userId}>
            <TableCell>
              <Link
                to={`/staff/${s.userId}`}
                className="font-medium text-on-surface underline-offset-2 hover:text-primary hover:underline"
              >
                {s.name}
              </Link>
              {!s.active && (
                <Badge tone="neutral" className="ml-2">
                  Inactive
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{s.total}</TableCell>
            <TableCell className="text-right tabular-nums">{s.completed}</TableCell>
            <TableCell className="text-right tabular-nums">{s.pending}</TableCell>
            <TableCell className="text-right tabular-nums">{s.blocked}</TableCell>
            <TableCell className="text-right tabular-nums">{s.completionRate}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
