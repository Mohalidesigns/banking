import { cx } from '@/utils/cx'

/**
 * 5×5 risk heat map per DS §8.14 and the DS §2.8 colour scale:
 * grid = 40px label column + 5 equal columns, 5 data rows + label row,
 * 3px gap, 280px height; 6px-radius cells, white text (dark-amber #744210 on
 * the yellow band), counts in semi-transparent badges; 10px axis labels in
 * #718096 with the Y axis rotated. Colour is never the only indicator —
 * every cell prints its score band label.
 */
export interface HeatCell {
  /** Column 1–5 (x axis, e.g. inherent risk). */
  x: number
  /** Row 1–5 (y axis, e.g. control weakness). */
  y: number
  /** Short label rendered in the cell, e.g. a category initial or score. */
  label?: string
  /** Item count rendered in the semi-transparent badge. */
  count: number
  /** Heat band 1–5 → very-low…critical (DS §2.8). */
  tone: 1 | 2 | 3 | 4 | 5
  /** Accessible description of what the cell holds. */
  title?: string
}

const toneClasses: Record<HeatCell['tone'], string> = {
  1: 'bg-heat-very-low text-white',
  2: 'bg-heat-low text-[#744210]',
  3: 'bg-heat-medium text-white',
  4: 'bg-heat-high text-white',
  5: 'bg-heat-critical text-white',
}

const toneNames: Record<HeatCell['tone'], string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
}

export function RiskHeatMap({
  cells,
  xLabel,
  yLabel,
  xTicks = ['1', '2', '3', '4', '5'],
  yTicks = ['1', '2', '3', '4', '5'],
  className,
}: {
  cells: HeatCell[]
  xLabel: string
  yLabel: string
  xTicks?: string[]
  yTicks?: string[]
  className?: string
}) {
  const cellAt = (x: number, y: number): HeatCell | undefined =>
    cells.find((c) => c.x === x && c.y === y)

  return (
    <figure className={cx('m-0', className)} aria-label={`${yLabel} by ${xLabel} heat map`}>
      <div
        className="grid h-[280px] gap-[3px]"
        style={{ gridTemplateColumns: '40px repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr) 24px' }}
      >
        {/* Y axis label */}
        <div
          className="row-span-5 flex items-center justify-center text-[10px] font-semibold text-[#718096]"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {yLabel}
        </div>

        {/* Data rows — y = 5 (top) down to y = 1 (bottom) */}
        {[5, 4, 3, 2, 1].map((y) => (
          [1, 2, 3, 4, 5].map((x) => {
            const cell = cellAt(x, y)
            const key = `${x}-${y}`
            if (!cell || cell.count === 0) {
              return (
                <div
                  key={key}
                  className="rounded-md bg-page"
                  role="img"
                  aria-label={`${xTicks[x - 1]} / ${yTicks[y - 1]}: empty`}
                />
              )
            }
            return (
              <div
                key={key}
                role="img"
                aria-label={`${cell.title ?? `${xTicks[x - 1]} / ${yTicks[y - 1]}`}: ${cell.count}, ${toneNames[cell.tone]}`}
                title={cell.title ?? `${toneNames[cell.tone]} (${cell.count})`}
                className={cx(
                  'flex cursor-default flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center',
                  toneClasses[cell.tone],
                )}
              >
                {cell.label && <span className="text-[11px] leading-tight font-semibold">{cell.label}</span>}
                <span className="rounded-[10px] bg-white/30 px-1.5 text-[10px] leading-4 font-semibold">
                  {cell.count}
                </span>
              </div>
            )
          })
        ))}

        {/* Y tick column is implicit; bottom row = X ticks + label */}
        <div />
        {xTicks.map((tick) => (
          <div key={tick} className="flex items-center justify-center text-[10px] font-medium text-[#718096]">
            {tick}
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-center text-[10px] font-semibold tracking-wide text-[#718096] uppercase">
        {xLabel}
      </figcaption>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-ink-secondary">
        {([1, 2, 3, 4, 5] as const).map((tone) => (
          <span key={tone} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className={cx('h-2.5 w-2.5 rounded-sm', toneClasses[tone].split(' ')[0])} />
            {toneNames[tone]}
          </span>
        ))}
        <span className="text-[9px] text-ink-secondary">(demo colour scale — illustrative only)</span>
      </p>
    </figure>
  )
}
