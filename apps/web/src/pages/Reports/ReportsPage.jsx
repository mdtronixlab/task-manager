import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getReport, getCompletionTrend, exportTasksReport } from '../../services/reports'
import { getUsers } from '../../services/users'
import { getDepartments } from '../../services/departments'
import { defaultTaskFilters } from '../../utils/taskFilters'
import { ROLES } from '../../constants/roles'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import ReportFilters from '../../components/reports/ReportFilters'
import CompletionTrendChart from '../../components/reports/CompletionTrendChart'
import OrgSummary from '../../components/dashboard/OrgSummary'
import StaffSummaryTable from '../../components/staff/StaffSummaryTable'
import Button from '../../components/Button'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'

function toReportParams(filters) {
  const params = { userId: filters.userId || undefined, departmentId: filters.departmentId || undefined }
  if (filters.range === 'custom') {
    params.dateFrom = filters.dateFrom || undefined
    params.dateTo = filters.dateTo || undefined
  } else {
    params.range = filters.range
  }
  return params
}

// phases.md Phase 6 — "turn task data into useful operational information."
// The historical/period counterpart to Phase 4's live dashboard, plus a
// trend chart. Important Rule (phases.md): a plain completion ratio, never
// a weighted/inferred productivity score.
export default function ReportsPage() {
  const [filters, setFilters] = useState(defaultTaskFilters)
  const [staff, setStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [report, setReport] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const { showToast } = useToast()
  const { appUser } = useAuth()

  const loadReferenceData = useCallback(async () => {
    const [users, departmentData] = await Promise.all([getUsers(), getDepartments()])
    // Same reasoning as TasksPage.jsx — include the signed-in Super Admin
    // so their own tasks (which do count toward org totals, per
    // reportService.js) can be selected in the Staff filter. Note this
    // filters the org summary/export/trend to their tasks only; the Staff
    // Report table below stays a staff-only roster either way (reportService.js's
    // buildOrgAndStaffSummary deliberately gives non-staff no row there).
    setStaff(users.filter((u) => u.role === ROLES.STAFF || u.userId === appUser?.userId))
    setDepartments(departmentData)
  }, [appUser?.userId])

  const loadReport = useCallback(async (currentFilters) => {
    setLoading(true)
    setError(null)
    try {
      const params = toReportParams(currentFilters)
      const [reportData, trendData] = await Promise.all([getReport(params), getCompletionTrend(params)])
      setReport(reportData)
      setTrend(trendData)
    } catch (err) {
      setError(err.message || 'Could not load the report. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    loadReport(filters)
  }, [filters, loadReport])

  async function handleExport() {
    setExporting(true)
    try {
      await exportTasksReport(toReportParams(filters))
    } catch (err) {
      showToast(err.message || 'Could not export the report. Please try again.', { tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline text-on-surface">Reports</h1>
          <p className="text-body-md text-on-surface-variant">
            Operational summary for the selected period — not a performance score.
          </p>
        </div>
        {/* Same [dateFrom, dateTo]/staff/department scope as the report
            below (toReportParams) — the row-level export of what's already
            being summarised, not a separate query the user has to line up
            themselves. */}
        <Button variant="secondary" loading={exporting} loadingText="Exporting…" onClick={handleExport}>
          <Download className="size-4" aria-hidden="true" />
          Export to Excel
        </Button>
      </div>

      <ReportFilters filters={filters} onChange={setFilters} staff={staff} departments={departments} />

      {loading ? (
        <LoadingState label="Loading report…" />
      ) : error ? (
        <ErrorState description={error} onRetry={() => loadReport(filters)} />
      ) : (
        <>
          <OrgSummary organisation={report.organisation} />
          <CompletionTrendChart data={trend} />
          <div>
            <h2 className="mb-3 text-body-lg font-headline font-semibold text-on-surface">Staff Report</h2>
            <StaffSummaryTable staff={report.staff} />
          </div>
        </>
      )}
    </div>
  )
}
