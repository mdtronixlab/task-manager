import Select from '../Select'
import Input from '../Input'
import { DATE_RANGE_OPTIONS } from '../../constants/dateRanges'

// Deliberately narrower than tasks/TaskFilters — a report breaks totals
// down BY status/priority, so pre-filtering by status/priority would make
// those breakdowns incoherent (interaction.md: "filters scope everything
// below them, so the numbers always agree" — here, agreeing means not
// filtering out the very dimension being reported on).
export default function ReportFilters({ filters, onChange, staff = [], departments }) {
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
      <Select
        label="Staff"
        value={filters.userId}
        onChange={set('userId')}
        options={[{ value: '', label: 'All Staff' }, ...staff.map((s) => ({ value: s.userId, label: s.name }))]}
        containerClassName="w-44"
      />
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
    </div>
  )
}
