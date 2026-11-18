import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import type { CategorySlice } from '@/services/contracts/DashboardService'

/**
 * Supervisory portfolio by institution category (Spec §5.2). Horizontal
 * navy bars; segments navigate to the registry filtered by category.
 */
export function PortfolioCategoryBar({
  data,
  onSelect,
}: {
  data: CategorySlice[]
  onSelect?: (category: string) => void
}) {
  return (
    <div
      role="img"
      aria-label={`Supervisory portfolio by category. ${data
        .map((d) => `${d.category}: ${d.count} institutions, ${d.assetsMM} million demo assets`)
        .join('. ')}. Illustrative demo figures.`}
      className="h-64 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={150}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: 'rgba(26,54,93,0.06)' }}
            formatter={(value, name) =>
              name === 'count' ? [`${value} institutions`, 'Count'] : [value, name]
            }
            labelStyle={tooltipStyle.labelStyle}
          />
          <Bar
            dataKey="count"
            radius={[0, 6, 6, 0]}
            barSize={18}
            isAnimationActive={false}
            onClick={(entry) => {
              const slice = entry as unknown as CategorySlice
              if (onSelect && slice?.category) onSelect(slice.category)
            }}
            className={onSelect ? 'cursor-pointer' : undefined}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={CHART_COLORS.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
