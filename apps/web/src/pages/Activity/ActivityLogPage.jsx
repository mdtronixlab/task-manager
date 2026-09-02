import { useCallback, useEffect, useState } from 'react'
import { getActivityLogs } from '../../services/activityLogs'
import { getUsers } from '../../services/users'
import { ACTIVITY_ACTIONS, ACTIVITY_ACTION_LABELS } from '../../constants/activityActions'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table'
import Select from '../../components/Select'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import { History } from 'lucide-react'

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Turns a log row into one readable line — rules.md §26 "logs should
// contain enough information to understand what happened," not just raw
// field/oldValue/newValue for the reader to piece together themselves.
function describeLog(log) {
  const task = log.taskTitle ? `"${log.taskTitle}"` : log.taskId
  switch (log.action) {
    case ACTIVITY_ACTIONS.TASK_CREATED:
      return `created task ${task}`
    case ACTIVITY_ACTIONS.TASK_COMPLETED:
      return `completed task ${task}`
    case ACTIVITY_ACTIONS.TASK_BLOCKED:
      return `blocked task ${task}`
    case ACTIVITY_ACTIONS.STATUS_CHANGED:
      return `changed status of ${task} from ${log.oldValue} to ${log.newValue}`
    case ACTIVITY_ACTIONS.TASK_UPDATED:
      return `updated ${log.field} of ${task}`
    case ACTIVITY_ACTIONS.SETTINGS_UPDATED:
      return `updated setting "${log.field}"`
    case ACTIVITY_ACTIONS.USER_CREATED:
      return `added user ${log.newValue}`
    case ACTIVITY_ACTIONS.USER_UPDATED:
      return `updated ${log.field} of a user from "${log.oldValue}" to "${log.newValue}"`
    case ACTIVITY_ACTIONS.USER_DISABLED:
      return 'deactivated a user'
    case ACTIVITY_ACTIONS.DEPARTMENT_CREATED:
      return `added department "${log.newValue}"`
    case ACTIVITY_ACTIONS.DEPARTMENT_UPDATED:
      return `updated ${log.field} of a department`
    case ACTIVITY_ACTIONS.CATEGORY_CREATED:
      return `added category "${log.newValue}"`
    case ACTIVITY_ACTIONS.CATEGORY_UPDATED:
      return `updated ${log.field} of a category`
    case ACTIVITY_ACTIONS.CUSTOM_NOTIFICATION_SENT:
      return `sent notification "${log.newValue}"`
    default:
      return ACTIVITY_ACTION_LABELS[log.action] || log.action
  }
}

// phases.md Phase 7 "Admin Interface" — the writing side (activityLog.js
// logActivity) has existed since Phase 1; this is the missing viewer.
export default function ActivityLogPage() {
  const [filters, setFilters] = useState({ userId: '', action: '' })
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadUsers = useCallback(async () => {
    setUsers(await getUsers())
  }, [])

  const loadLogs = useCallback(async (currentFilters) => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await getActivityLogs(currentFilters))
    } catch (err) {
      setError(err.message || 'Could not load the activity log. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadLogs(filters)
  }, [filters, loadLogs])

  function set(key) {
    return (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-headline text-on-surface">Activity Log</h1>
        <p className="text-body-md text-on-surface-variant">
          The most recent 200 actions, most recent first.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="User"
          value={filters.userId}
          onChange={set('userId')}
          options={[{ value: '', label: 'Everyone' }, ...users.map((u) => ({ value: u.userId, label: u.name }))]}
          containerClassName="w-48"
        />
        <Select
          label="Activity type"
          value={filters.action}
          onChange={set('action')}
          options={[
            { value: '', label: 'All Activity' },
            ...Object.values(ACTIVITY_ACTIONS).map((a) => ({ value: a, label: ACTIVITY_ACTION_LABELS[a] })),
          ]}
          containerClassName="w-48"
        />
      </div>

      {loading ? (
        <LoadingState label="Loading activity…" />
      ) : error ? (
        <ErrorState description={error} onRetry={() => loadLogs(filters)} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity found."
          description="Nothing matches these filters yet."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.logId}>
                <TableCell className="whitespace-nowrap text-on-surface-variant">
                  {formatTimestamp(log.timestamp)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium text-on-surface">{log.userName}</TableCell>
                <TableCell>{describeLog(log)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
