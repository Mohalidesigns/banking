import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/utils/cx'

/**
 * Card per DS §8.3: white surface, 12px radius, 1px #E2E8F0 border,
 * shadow 0 1px 3px rgba(0,0,0,0.08); optional hover lift (translateY(-2px)
 * + elevated shadow, 200ms).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  children: ReactNode
}

export function Card({ hoverable = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-xl border border-line bg-card shadow-card',
        hoverable && 'card-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Card header per DS §8.3: 16px/20px padding, bottom border, 14px/600 navy title. */
export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-center justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <div className="section-title truncate">{title}</div>
        {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 text-xs font-medium text-primary-surface">{action}</div>}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('p-5', className)}>{children}</div>
}
