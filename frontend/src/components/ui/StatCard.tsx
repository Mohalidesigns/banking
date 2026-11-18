import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cx } from '@/utils/cx'

/**
 * StatCard / KPICard per DS §8.4: 20px padding, 40×40 icon box (10px radius,
 * semantic tint pair), trend badge, 28px/700 navy value, 12px label.
 */
export type StatTone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'yellow'

const toneClasses: Record<StatTone, string> = {
  blue: 'bg-tint-blue text-primary',
  green: 'bg-tint-green text-success',
  orange: 'bg-tint-orange text-warning',
  red: 'bg-tint-red text-error',
  purple: 'bg-tint-purple text-purple',
  yellow: 'bg-tint-yellow text-yellow',
}

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: StatTone
  trend?: {
    direction: 'up' | 'down'
    value: string
    /** Semantic meaning of the trend; drives colour (colour is never decorative). */
    positive: boolean
    suffix?: string
  }
  footer?: string
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  trend,
  footer,
  onClick,
}: StatCardProps) {
  return (
    <Card
      hoverable={Boolean(onClick)}
      className={cx('p-5', onClick && 'cursor-pointer')}
      onClick={onClick}
      {...(onClick ? { role: 'button', tabIndex: 0 } : {})}
    >
      <div className="flex items-start justify-between">
        <span
          aria-hidden="true"
          className={cx('flex h-10 w-10 items-center justify-center rounded-[10px]', toneClasses[tone])}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {trend && (
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold',
              trend.positive ? 'bg-tint-green text-success' : 'bg-tint-red text-error',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="kpi-value mt-3">{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{label}</p>
      {trend?.suffix && <p className="mt-0.5 text-[10px] text-ink-tertiary">{trend.suffix}</p>}
      {footer && <p className="mt-2 border-t border-line-light pt-2 text-[11px] text-ink-secondary">{footer}</p>}
    </Card>
  )
}

/** Compact KPI variant (24px value) per DS §3.2 "Stat Value (compact)". */
export function KPICard(props: StatCardProps) {
  return <StatCard {...props} />
}
