import { useMemo, useState } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table'
import Button from '../Button'

const WIDTH = 720
const HEIGHT = 260
const PADDING = { top: 16, right: 16, bottom: 32, left: 36 }

function formatShortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Daily completion trend (phases.md Phase 6 "Trends" — Daily completion /
 * Completion trend). Two series (Total, Completed) → a legend is required
 * (dataviz skill marks-and-anatomy.md). Colors use dedicated
 * --color-chart-series-1/2 tokens (styles/index.css), not --color-primary/
 * --color-success directly — those are tuned for small badges/text and
 * fail the palette validator's lightness/chroma checks as chart marks;
 * series-2 sits close to --color-success in hue so "Completed" still
 * reads as the same green as StatusBadge elsewhere. Table view is the
 * accessibility twin — every value the chart shows is reachable there too.
 *
 * @param {{data: {date: string, total: number, completed: number, completionRate: number}[]}} props
 */
export default function CompletionTrendChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const [showTable, setShowTable] = useState(false)

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const maxValue = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.total))
    const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 100 ? 10 : 50
    return Math.ceil(max / step) * step
  }, [data])

  const xFor = (i) => PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * plotWidth : plotWidth / 2)
  const yFor = (value) => PADDING.top + plotHeight - (value / maxValue) * plotHeight

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f))
  const labelEvery = Math.max(1, Math.ceil(data.length / 6))

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH
    const relative = data.length > 1 ? (x - PADDING.left) / plotWidth : 0
    const index = Math.round(relative * (data.length - 1))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setHoverIndex((i) => Math.min(data.length - 1, (i ?? -1) + 1))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setHoverIndex((i) => Math.max(0, (i ?? data.length) - 1))
    }
  }

  if (data.length === 0) return null

  const hovered = hoverIndex !== null ? data[hoverIndex] : null
  const last = data[data.length - 1]

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-body-md font-headline font-semibold text-on-surface">Daily Completion</h3>
          <div className="mt-1 flex items-center gap-4 text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full bg-chart-series-1" aria-hidden="true" />
              Total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full bg-chart-series-2" aria-hidden="true" />
              Completed
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Show chart' : 'Show table'}
        </Button>
      </div>

      {showTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{formatShortDate(d.date)}</TableCell>
                <TableCell className="text-right tabular-nums">{d.total}</TableCell>
                <TableCell className="text-right tabular-nums">{d.completed}</TableCell>
                <TableCell className="text-right tabular-nums">{d.completionRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="img"
            aria-label={`Daily completion trend from ${formatShortDate(data[0].date)} to ${formatShortDate(last.date)}. Use arrow keys to inspect each day, or the table view for full detail.`}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  className="stroke-outline-variant"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 8}
                  y={yFor(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-on-surface-variant text-[10px]"
                >
                  {tick}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={d.date}
                  x={xFor(i)}
                  y={HEIGHT - PADDING.bottom + 16}
                  textAnchor="middle"
                  className="fill-on-surface-variant text-[10px]"
                >
                  {formatShortDate(d.date)}
                </text>
              ) : null,
            )}

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                className="stroke-outline"
                strokeWidth="1"
              />
            )}

            <path
              d={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.total)}`).join(' ')}
              fill="none"
              className="stroke-chart-series-1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.completed)}`).join(' ')}
              fill="none"
              className="stroke-chart-series-2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Endpoint markers — labelled sparingly, per marks-and-anatomy.md */}
            <circle cx={xFor(data.length - 1)} cy={yFor(last.total)} r="4" className="fill-chart-series-1 stroke-surface-container" strokeWidth="2" />
            <circle cx={xFor(data.length - 1)} cy={yFor(last.completed)} r="4" className="fill-chart-series-2 stroke-surface-container" strokeWidth="2" />

            {hovered && (
              <>
                <circle cx={xFor(hoverIndex)} cy={yFor(hovered.total)} r="4" className="fill-chart-series-1 stroke-surface-container" strokeWidth="2" />
                <circle cx={xFor(hoverIndex)} cy={yFor(hovered.completed)} r="4" className="fill-chart-series-2 stroke-surface-container" strokeWidth="2" />
              </>
            )}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-md border border-outline-variant bg-surface-container-high px-3 py-2 text-body-sm shadow-xl"
              style={{ left: `${(xFor(hoverIndex) / WIDTH) * 100}%`, transform: 'translate(-50%, 0)' }}
            >
              <p className="font-medium text-on-surface">{formatShortDate(hovered.date)}</p>
              <p className="text-chart-series-1">
                Total: <span className="font-medium">{hovered.total}</span>
              </p>
              <p className="text-chart-series-2">
                Completed: <span className="font-medium">{hovered.completed}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
