import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import type { PrudentialTrendPoint } from '@/services/contracts/DashboardService'

/**
 * Prudential trend chart: portfolio capital adequacy, NPL and liquidity
 * ratios (Spec §5.2). Asset-weighted averages from the mock financial
 * snapshots; the period selector changes the visible window.
 */
export function PrudentialTrendChart({ data }: { data: PrudentialTrendPoint[] }) {
  const latest = data[data.length - 1]
  return (
    <div>
      <div
        role="img"
        aria-label={`Prudential trend. Latest period ${latest?.periodLabel ?? 'n/a'}: capital adequacy ${latest?.capitalAdequacyPct ?? 'n/a'}%, NPL ${latest?.nplPct ?? 'n/a'}%, liquidity ${latest?.liquidityRatioPct ?? 'n/a'}%. Illustrative demo figures.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
              unit="%"
              width={56}
            />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_COLORS.axis }}
              iconType="plainline"
              iconSize={14}
            />
            <Line
              type="monotone"
              dataKey="capitalAdequacyPct"
              name="Capital adequacy (avg)"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="nplPct"
              name="NPL ratio (avg)"
              stroke={CHART_COLORS.error}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="liquidityRatioPct"
              name="Liquidity ratio (avg)"
              stroke={CHART_COLORS.primarySurface}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
