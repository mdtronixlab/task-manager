import { ListChecks, Clock, PlayCircle, CheckCircle2, Ban } from 'lucide-react'
import StatTile from './StatTile'
import CompletionMeter from './CompletionMeter'

/** Staff dashboard's own-tasks KPI row (prd.md §11). */
export default function TaskSummary({ summary }) {
  return (
    <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Total" value={summary.total} icon={ListChecks} />
      <StatTile label="Pending" value={summary.pending} tone="warning" icon={Clock} />
      <StatTile label="In Progress" value={summary.inProgress} tone="primary" icon={PlayCircle} />
      <StatTile label="Completed" value={summary.completed} tone="success" icon={CheckCircle2} />
      <StatTile label="Blocked" value={summary.blocked} tone="error" icon={Ban} />
      <CompletionMeter rate={summary.completionRate} className="col-span-2 sm:col-span-1" />
    </div>
  )
}
