import StatTile from './StatTile'
import CompletionMeter from './CompletionMeter'

/** Super Admin dashboard's organisation-wide KPI row (prd.md §12, phases.md Phase 4). */
export default function OrgSummary({ organisation }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatTile label="Staff" value={`${organisation.activeStaffCount}/${organisation.staffCount}`} />
      <StatTile label="Total Tasks" value={organisation.total} />
      <StatTile label="Pending" value={organisation.pending} tone="warning" />
      <StatTile label="In Progress" value={organisation.inProgress} tone="primary" />
      <StatTile label="Completed" value={organisation.completed} tone="success" />
      <StatTile label="Blocked" value={organisation.blocked} tone="error" />
      <CompletionMeter rate={organisation.completionRate} className="col-span-2 sm:col-span-1" />
    </div>
  )
}
