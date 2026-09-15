import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Select from '../Select'
import Input from '../Input'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { DATE_RANGE_OPTIONS } from '../../constants/dateRanges'
import { TASK_STATUS, TASK_STATUS_META } from '../../constants/taskStatus'
import { TASK_PRIORITY, TASK_PRIORITY_META } from '../../constants/taskPriority'

/**
 * Combinable task filters (phases.md Phase 5 — Date, Date range, Staff,
 * Department, Category, Status, Priority, and free-text Search). Controlled:
 * the parent page owns `filters` and re-fetches whenever `onChange` fires.
 *
 * @param {{
 *   filters: object, onChange: (filters: object) => void,
 *   staff?: {userId: string, name: string}[], departments?: object[], categories: object[],
 *   showStaffFilter?: boolean, showDepartmentFilter?: boolean,
 * }} props
 */
export default function TaskFilters({
  filters,
  onChange,
  staff = [],
  departments = [],
  categories,
  showStaffFilter = true,
  showDepartmentFilter = true,
}) {
  function set(key) {
    return (event) => onChange({ ...filters, [key]: event.target.value })
  }

  // Search is free text, unlike the discrete Select filters below — typing
  // needs to feel instant while the actual re-fetch waits for a pause, or
  // every keystroke would fire its own request. Local state decoupled from
  // `filters.search` so the box never stutters waiting on a round trip.
  const [searchText, setSearchText] = useState(filters.search || '')
  const debouncedSearch = useDebouncedValue(searchText, 350)

  useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) onChange({ ...filters, search: debouncedSearch })
    // Only debouncedSearch changing should trigger a re-fetch — filters/onChange
    // are read fresh from the closure, not stale (see hooks/useDebouncedValue.js).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Stay in sync if filters.search changes from elsewhere (e.g. a future
  // "clear filters" action) without fighting the debounce above.
  useEffect(() => {
    setSearchText(filters.search || '')
  }, [filters.search])

  // A grid rather than flex-wrap: fixed per-field widths (w-40/w-44) wrapped
  // unevenly at narrow widths — each field landed on its own line in a
  // slightly different position instead of lining up. Grid columns give
  // every field an equal-width cell that lines up regardless of which
  // optional filters (staff/department/custom range) are showing.
  return (
    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div className="relative col-span-2 sm:col-span-3 lg:col-span-4">
        <Search
          className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-on-surface-variant"
          aria-hidden="true"
        />
        <Input
          label="Search"
          type="search"
          placeholder="Search by task title…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="pl-9"
          containerClassName="w-full"
        />
      </div>
      <Select
        label="Date range"
        value={filters.range}
        onChange={set('range')}
        options={DATE_RANGE_OPTIONS}
        containerClassName="w-full"
      />
      {filters.range === 'custom' && (
        <>
          <Input
            label="From"
            type="date"
            value={filters.dateFrom}
            onChange={set('dateFrom')}
            containerClassName="w-full"
          />
          <Input
            label="To"
            type="date"
            value={filters.dateTo}
            onChange={set('dateTo')}
            containerClassName="w-full"
          />
        </>
      )}
      {showStaffFilter && (
        <Select
          label="Staff"
          value={filters.userId}
          onChange={set('userId')}
          options={[{ value: '', label: 'All Staff' }, ...staff.map((s) => ({ value: s.userId, label: s.name }))]}
          containerClassName="w-full"
        />
      )}
      {showDepartmentFilter && (
        <Select
          label="Department"
          value={filters.departmentId}
          onChange={set('departmentId')}
          options={[
            { value: '', label: 'All Departments' },
            ...departments.map((d) => ({ value: d.departmentId, label: d.name })),
          ]}
          containerClassName="w-full"
        />
      )}
      <Select
        label="Category"
        value={filters.categoryId}
        onChange={set('categoryId')}
        options={[
          { value: '', label: 'All Categories' },
          ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
        ]}
        containerClassName="w-full"
      />
      <Select
        label="Status"
        value={filters.status}
        onChange={set('status')}
        options={[
          { value: '', label: 'All Statuses' },
          ...Object.values(TASK_STATUS).map((s) => ({ value: s, label: TASK_STATUS_META[s].label })),
        ]}
        containerClassName="w-full"
      />
      <Select
        label="Priority"
        value={filters.priority}
        onChange={set('priority')}
        options={[
          { value: '', label: 'All Priorities' },
          ...Object.values(TASK_PRIORITY).map((p) => ({ value: p, label: TASK_PRIORITY_META[p].label })),
        ]}
        containerClassName="w-full"
      />
    </div>
  )
}
