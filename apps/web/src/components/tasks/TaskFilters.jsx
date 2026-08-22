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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Date range"
        value={filters.range}
        onChange={set('range')}
        options={DATE_RANGE_OPTIONS}
        containerClassName="w-40"
      />
      {filters.range === 'custom' && (
        <>
          <Input
            label="From"
            type="date"
            value={filters.dateFrom}
            onChange={set('dateFrom')}
            containerClassName="w-40"
          />
          <Input
            label="To"
            type="date"
            value={filters.dateTo}
            onChange={set('dateTo')}
            containerClassName="w-40"
          />
        </>
      )}
      {showStaffFilter && (
        <Select
          label="Staff"
          value={filters.userId}
          onChange={set('userId')}
          options={[{ value: '', label: 'All Staff' }, ...staff.map((s) => ({ value: s.userId, label: s.name }))]}
          containerClassName="w-44"
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
          containerClassName="w-44"
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
        containerClassName="w-44"
      />
      <Select
        label="Status"
        value={filters.status}
        onChange={set('status')}
        options={[
          { value: '', label: 'All Statuses' },
          ...Object.values(TASK_STATUS).map((s) => ({ value: s, label: TASK_STATUS_META[s].label })),
        ]}
        containerClassName="w-40"
      />
      <Select
        label="Priority"
        value={filters.priority}
        onChange={set('priority')}
        options={[
          { value: '', label: 'All Priorities' },
          ...Object.values(TASK_PRIORITY).map((p) => ({ value: p, label: TASK_PRIORITY_META[p].label })),
        ]}
        containerClassName="w-40"
      />
    </div>
  )
}
