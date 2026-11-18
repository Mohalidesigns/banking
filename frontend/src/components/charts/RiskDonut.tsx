import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RiskRating } from '@/types/common'
import { RISK_COLORS, tooltipStyle } from '@/components/charts/chartTheme'

/**
 * Institutional risk distribution donut (DS §8.13 anatomy, Recharts impl).
 * Segments are clickable (Spec §5.2) and the legend doubles as the keyboard
 * path to the same navigation, so colour is never the only indicator.
 */
export interface DonutSlice {
  rating: RiskRating
  count: number
}

export function RiskDonut({
  data,
  onSelect,
}: {
  data: DonutSlice[]
  onSelect?: (rating: RiskRating) => void
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const segments = data.filter((d) => d.count > 0)

  return (
    <div>
      <div className="relative mx-auto h-[168px] w-[168px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart
            role="img"
            aria-label={`Institutional risk distribution donut. Total ${total} institutions: ${data
              .map((d) => `${d.count} ${d.rating}`)
              .join(', ')}. Illustrative demo figures.`}
          >
            <Tooltip
              {...tooltipStyle}
              formatter={(value, _name, item) => [
                `${value} institution${Number(value) === 1 ? '' : 's'}`,
                String((item?.payload as DonutSlice | undefined)?.rating ?? ''),
              ]}
            />
            <Pie
              data={segments}
              dataKey="count"
              nameKey="rating"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
              onClick={(entry) => {
                const slice = entry as unknown as DonutSlice
                if (onSelect && slice?.rating) onSelect(slice.rating)
              }}
              className={onSelect ? 'cursor-pointer' : undefined}
              isAnimationActive={false}
            >
              {segments.map((slice) => (
                <Cell key={slice.rating} fill={RISK_COLORS[slice.rating]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* DS §8.13 center hole: total + label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] leading-none font-bold text-primary">{total}</span>
          <span className="mt-1 text-[10px] text-ink-secondary">Total</span>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {data.map((d) => (
          <li key={d.rating}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(d.rating)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] text-ink transition-colors hover:bg-page disabled:cursor-default"
              aria-label={`Filter institutions by ${d.rating} risk — ${d.count} institutions (demo)`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: RISK_COLORS[d.rating] }}
              />
              {d.rating}
              <span className="font-semibold text-ink-secondary">({d.count})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
