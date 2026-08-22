import { useCallback, useEffect, useState } from 'react'
import { getReport, getCompletionTrend } from '../../services/reports'
import { getUsers } from '../../services/users'
import { getDepartments } from '../../services/departments'
import { defaultTaskFilters } from '../../utils/taskFilters'
import { ROLES } from '../../constants/roles'
import ReportFilters from '../../components/reports/ReportFilters'
import CompletionTrendChart from '../../components/reports/CompletionTrendChart'
import OrgSummary from '../../components/dashboard/OrgSummary'
import StaffSummaryTable from '../../components/staff/StaffSummaryTable'
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

  const loadReferenceData = useCallback(async () => {
    const [users, departmentData] = await Promise.all([getUsers(), getDepartments()])
    setStaff(users.filter((u) => u.role === ROLES.STAFF))
    setDepartments(departmentData)
  }, [])

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">Reports</h1>
        <p className="text-body-md text-on-surface-variant">
          Operational summary for the selected period — not a performance score.
        </p>
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
