import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getDailyReport } from '../../services/reports'
import { getTasks } from '../../services/tasks'
import { getCategories } from '../../services/categories'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import OrgSummary from '../../components/dashboard/OrgSummary'
import StaffSummaryTable from '../../components/staff/StaffSummaryTable'
import TaskOverviewTable from '../../components/tasks/TaskOverviewTable'

// prd.md §12 / phases.md Phase 4 — "What is happening in the organisation
// today?" answered from one view: org KPIs, per-staff rollup, all of
// today's tasks. Filtering/history (rules.md §18 — don't build ahead) is
// Phase 5; this is the live snapshot only.
export default function AdminDashboard() {
  const { appUser } = useAuth()
  const [report, setReport] = useState(null)
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reportData, taskData, categoryData] = await Promise.all([
        getDailyReport(),
        getTasks({ date: 'today' }),
        getCategories(),
      ])
      setReport(reportData)
      setTasks(taskData)
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

  const staffById = useMemo(
    () => Object.fromEntries((report?.staff || []).map((s) => [s.userId, s.name])),
    [report],
  )
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
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">Organisation Dashboard</h1>
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
