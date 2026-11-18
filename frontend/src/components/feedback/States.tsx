import type { ReactNode } from 'react'
import { CircleExclamationPoint, Inbox, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cx } from '@/utils/cx'

/** Empty state per DS §8.22: centered, 64px icon circle, title, description, action. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: { label: string; onClick: () => void; icon?: ReactNode }
  className?: string
}) {
  return (
    <div className={cx('px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-ink-tertiary"
      >
        {icon ?? <Inbox className="h-7 w-7" />}
      </span>
      <p className="mb-1 text-sm font-semibold text-gray-800">{title}</p>
      {description && (
        <p className="mx-auto mb-4 max-w-sm text-sm text-ink-secondary">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} iconLeft={action.icon}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** Loading skeleton rows/blocks (Spec §17.1). */
export function LoadingSkeleton({
  rows = 4,
  className,
  variant = 'table',
}: {
  rows?: number
  className?: string
  variant?: 'table' | 'cards' | 'text'
}) {
  if (variant === 'cards') {
    return (
      <div className={cx('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-line bg-card p-5">
            <div className="h-10 w-10 rounded-[10px] bg-gray-200" />
            <div className="mt-3 h-7 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    )
  }
  if (variant === 'text') {
    return (
      <div className={cx('space-y-2', className)} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded bg-gray-200"
            style={{ height: 12, width: `${90 - i * 12}%` }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className={cx('space-y-2.5 p-4', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4" aria-hidden="true">
          <div className="h-3.5 w-3.5 rounded bg-gray-200" />
          <div className="h-3.5 flex-1 rounded bg-gray-200" />
          <div className="h-3.5 w-24 rounded bg-gray-100" />
          <div className="h-3.5 w-16 rounded bg-gray-100" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Error state with retry (Spec §17.1) — never a blank screen. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'This demo view could not load its data. No real service was called.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div className={cx('px-6 py-12 text-center', className)} role="alert">
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-tint-red text-error"
      >
        <CircleExclamationPoint className="h-7 w-7" />
      </span>
      <p className="mb-1 text-sm font-semibold text-gray-800">{title}</p>
      <p className="mx-auto mb-4 max-w-sm text-sm text-ink-secondary">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} iconLeft={<RotateCcw className="h-3.5 w-3.5" />}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
