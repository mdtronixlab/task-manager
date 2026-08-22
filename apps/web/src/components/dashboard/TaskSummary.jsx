import StatTile from './StatTile'
import CompletionMeter from './CompletionMeter'

/** Staff dashboard's own-tasks KPI row (prd.md §11). */
export default function TaskSummary({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Total" value={summary.total} />
      <StatTile label="Pending" value={summary.pending} tone="warning" />
      <StatTile label="In Progress" value={summary.inProgress} tone="primary" />
      <StatTile label="Completed" value={summary.completed} tone="success" />
      <StatTile label="Blocked" value={summary.blocked} tone="error" />
      <CompletionMeter rate={summary.completionRate} className="col-span-2 sm:col-span-1" />
    </div>
  )
}
