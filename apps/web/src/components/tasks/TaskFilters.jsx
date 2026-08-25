import Select from '../Select'
import Input from '../Input'
import { DATE_RANGE_OPTIONS } from '../../constants/dateRanges'
import { TASK_STATUS, TASK_STATUS_META } from '../../constants/taskStatus'
import { TASK_PRIORITY, TASK_PRIORITY_META } from '../../constants/taskPriority'

/**
 * Combinable task filters (phases.md Phase 5 — Date, Date range, Staff,
 * Department, Category, Status, Priority). Controlled: the parent page owns
 * `filters` and re-fetches whenever `onChange` fires.
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

  // A grid rather than flex-wrap: fixed per-field widths (w-40/w-44) wrapped
  // unevenly at narrow widths — each field landed on its own line in a
  // slightly different position instead of lining up. Grid columns give
  // every field an equal-width cell that lines up regardless of which
  // optional filters (staff/department/custom range) are showing.
  return (
    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
