import { Users, ListChecks, Clock, PlayCircle, CheckCircle2, Ban } from 'lucide-react'
import StatTile from './StatTile'
import CompletionMeter from './CompletionMeter'

/** Super Admin dashboard's organisation-wide KPI row (prd.md §12, phases.md Phase 4). */
export default function OrgSummary({ organisation }) {
  return (
    <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatTile
        label="Staff"
        value={`${organisation.activeStaffCount}/${organisation.staffCount}`}
        icon={Users}
      />
      <StatTile label="Total Tasks" value={organisation.total} icon={ListChecks} />
      <StatTile label="Pending" value={organisation.pending} tone="warning" icon={Clock} />
      <StatTile label="In Progress" value={organisation.inProgress} tone="primary" icon={PlayCircle} />
      <StatTile label="Completed" value={organisation.completed} tone="success" icon={CheckCircle2} />
      <StatTile label="Blocked" value={organisation.blocked} tone="error" icon={Ban} />
      <CompletionMeter rate={organisation.completionRate} className="col-span-2 sm:col-span-1" />
    </div>
  )
}
