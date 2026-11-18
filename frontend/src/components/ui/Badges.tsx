import type { ReactNode } from 'react'
import { Check, Circle, Minus, X } from 'lucide-react'
import { cx } from '@/utils/cx'

/**
 * Badges per DS §8.6–§8.8: pill (20px radius), 3px/10px padding,
 * 10–11px/600 text, tinted background + matching text colour.
 * Colour is never the only indicator: risk badges carry a dot,
 * compliance badges carry an icon.
 */

const badgeBase =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] leading-none font-semibold whitespace-nowrap'

export type StatusTone =
  | 'active'
  | 'planning'
  | 'fieldwork'
  | 'reporting'
  | 'completed'
  | 'draft'
  | 'overdue'
  | 'closed'

const statusTones: Record<StatusTone, string> = {
  active: 'bg-tint-green text-success',
  planning: 'bg-tint-blue text-primary',
  fieldwork: 'bg-tint-orange text-warning',
  reporting: 'bg-tint-purple text-purple',
  completed: 'bg-tint-purple text-purple',
  draft: 'bg-gray-100 text-gray-700',
  overdue: 'bg-tint-red text-error',
  closed: 'bg-gray-100 text-gray-700',
}

export function StatusBadge({
  status,
  tone,
  children,
}: {
  /** Raw status label; tone defaults to a lowercase-status mapping. */
  status?: string
  tone?: StatusTone
  children?: ReactNode
}) {
  const label = children ?? status ?? ''
  const resolved: StatusTone =
    tone ??
    ((): StatusTone => {
      const s = (status ?? '').toLowerCase()
      if (['active', 'in progress', 'approved', 'compliant', 'on track', 'submitted'].some((k) => s.includes(k)))
        return 'active'
      if (['planning', 'pending', 'scheduled', 'not started'].some((k) => s.includes(k))) return 'planning'
      if (['fieldwork', 'in review', 'under review', 'ongoing'].some((k) => s.includes(k))) return 'fieldwork'
      if (['reporting', 'escalated'].some((k) => s.includes(k))) return 'reporting'
      if (['completed', 'closed', 'remediated'].some((k) => s.includes(k))) return 'completed'
      if (['overdue', 'critical', 'rejected', 'breach'].some((k) => s.includes(k))) return 'overdue'
      if (['draft'].some((k) => s.includes(k))) return 'draft'
      return 'draft'
    })()
  return <span className={cx(badgeBase, statusTones[resolved])}>{label}</span>
}

export type { RiskRating } from '@/types/common'
import type { RiskRating } from '@/types/common'

const riskTones: Record<RiskRating, { bg: string; dot: string }> = {
  Critical: { bg: 'bg-tint-red text-error', dot: 'bg-error' },
  High: { bg: 'bg-tint-orange text-warning', dot: 'bg-warning' },
  Medium: { bg: 'bg-tint-yellow text-yellow', dot: 'bg-accent' },
  Low: { bg: 'bg-tint-green text-success', dot: 'bg-success' },
}

export function RiskBadge({ rating }: { rating: RiskRating }) {
  const tone = riskTones[rating]
  return (
    <span className={cx(badgeBase, tone.bg)}>
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {rating}
    </span>
  )
}

/** Standalone 8×8 risk dot for table cells (DS §8.7). */
export function RiskDot({ rating }: { rating: RiskRating }) {
  return (
    <span
      aria-hidden="true"
      className={cx('mr-1.5 inline-block h-2 w-2 rounded-full align-middle', riskTones[rating].dot)}
    />
  )
}

export type ComplianceState = 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Assessed'

const complianceTones: Record<ComplianceState, { classes: string; icon: typeof Check }> = {
  Compliant: { classes: 'bg-tint-green text-success', icon: Check },
  Partial: { classes: 'bg-tint-orange text-warning', icon: Minus },
  'Non-Compliant': { classes: 'bg-tint-red text-error', icon: X },
  'Not Assessed': { classes: 'bg-page text-ink-secondary', icon: Circle },
}

export function ComplianceBadge({ state }: { state: ComplianceState }) {
  const tone = complianceTones[state]
  const Icon = tone.icon
  return (
    <span className={cx(badgeBase, tone.classes)}>
      <Icon className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
      {state}
    </span>
  )
}

/** Risk classification chip per DS §8.9. */
export type RiskType = 'Technology' | 'Operational' | 'Compliance' | 'Financial'

const riskTypeTones: Record<RiskType, string> = {
  Technology: 'bg-tint-blue text-primary',
  Operational: 'bg-tint-orange text-warning',
  Compliance: 'bg-tint-purple text-purple',
  Financial: 'bg-tint-red text-error',
}

export function RiskTypeChip({ type }: { type: RiskType }) {
  return (
    <span className={cx(badgeBase, 'px-3 py-1.5 text-[11px]', riskTypeTones[type])}>{type}</span>
  )
}
