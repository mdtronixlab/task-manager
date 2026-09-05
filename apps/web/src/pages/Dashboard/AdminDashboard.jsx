import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getDailyReport } from '../../services/reports'
import { getTasks } from '../../services/tasks'
import { getUsers } from '../../services/users'
import { getCategories } from '../../services/categories'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import OrgSummary from '../../components/dashboard/OrgSummary'
import StaffSummaryTable from '../../components/staff/StaffSummaryTable'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'

// prd.md §12 / phases.md Phase 4 — "What is happening in the organisation
// today?" answered from one view: org KPIs, per-staff rollup, all of
// today's tasks. Filtering/history (rules.md §18 — don't build ahead) is
// Phase 5; this is the live snapshot only. An Admin's own operational work
// lives on its own page (MyTasksPage, /my-tasks) rather than here — this
// stays the org-wide read-only view for both Admin and Super Admin.
export default function AdminDashboard() {
  const { appUser } = useAuth()
  const [report, setReport] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reportData, taskData, userData, categoryData] = await Promise.all([
        getDailyReport(),
        getTasks({ date: 'today' }),
        getUsers(),
        getCategories(),
      ])
      setReport(reportData)
      setTasks(taskData)
      setUsers(userData)
      setCategories(categoryData)
    } catch (err) {
      setError(err.message || 'Could not load the dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // From the full user roster, not report.staff — reportService.js's
  // buildOrgAndStaffSummary hard-filters that to role: STAFF (it's meant
  // for the Staff Overview table below), so it never has an Admin's own
  // name. Since MyTasksPage lets an Admin self-create tasks that land in
  // this same org-wide `tasks` list, staffById needs to resolve those too
  // or the Staff column falls back to a raw userId for them.
  const staffById = useMemo(() => Object.fromEntries(users.map((u) => [u.userId, u.name])), [users])
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.categoryId, c.name])),
    [categories],
  )

  if (loading) {
    return <LoadingState label="Loading organisation dashboard…" className="min-h-[50vh]" />
  }

  if (error) {
    return <ErrorState description={error} onRetry={loadData} />
  }

  // Appending a local midnight time avoids the UTC-shift bug where parsing
  // a bare "YYYY-MM-DD" string reads as UTC and can display as the
  // previous day in negative-offset timezones.
  const dateLabel = new Date(`${report.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="neu flex flex-col gap-1 rounded-lg px-6 py-5">
        <h1 className="bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-headline-lg font-headline text-transparent">
          Organisation Dashboard
        </h1>
        <p className="text-body-md text-on-surface-variant">
          {dateLabel} · Signed in as {appUser.name}
        </p>
      </div>

      <OrgSummary organisation={report.organisation} />

      <div>
        <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">Staff Overview</h2>
        <StaffSummaryTable staff={report.staff} />
      </div>

      <div>
        <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">
          Today&rsquo;s Tasks — Organisation
        </h2>
        <TaskOverviewTable tasks={tasks} staffById={staffById} categoriesById={categoriesById} />
      </div>
    </div>
  )
}
