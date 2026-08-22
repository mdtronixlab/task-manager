// Shared between TasksPage and StaffDetailPage (phases.md Phase 5) —
// converts TaskFilters' UI state into GET /api/tasks query params.
// services/tasks.js already drops undefined/empty values, so unset filters
// simply aren't sent.

export function defaultTaskFilters() {
  return {
    range: 'today',
    dateFrom: '',
    dateTo: '',
    userId: '',
    departmentId: '',
    categoryId: '',
    status: '',
    priority: '',
  }
}

export function buildTaskQueryParams(filters) {
  const params = {
    userId: filters.userId || undefined,
    departmentId: filters.departmentId || undefined,
    categoryId: filters.categoryId || undefined,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
  }

  if (filters.range === 'custom') {
    params.dateFrom = filters.dateFrom || undefined
    params.dateTo = filters.dateTo || undefined
  } else {
    params.range = filters.range
  }

  return params
}
