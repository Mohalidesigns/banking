import { cx } from '@/utils/cx'

/**
 * Progress indicators per DS §8.11: 6px bar with contextual fill (500ms
 * width transition) and circular SVG ring (default 80px, 6px stroke, green,
 * 1000ms transition) with bold center percentage.
 */
export type ProgressTone = 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'purple'

const toneBg: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-accent',
  purple: 'bg-purple',
}

const toneText: Record<ProgressTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  accent: 'text-accent-dark',
  purple: 'text-purple',
}

export function ProgressBar({
  value,
  tone = 'primary',
  label,
  showValue = false,
  className,
}: {
  /** 0–100 */
  value: number
  tone?: ProgressTone
  label?: string
  showValue?: boolean
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cx('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-ink-secondary">{label}</span>
          {showValue && <span className={cx('font-semibold', toneText[tone])}>{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-500 ease-out', toneBg[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function ProgressRing({
  value,
  size = 80,
  stroke = 6,
  tone = 'success',
  label,
}: {
  value: number
  size?: number
  stroke?: number
  tone?: ProgressTone
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeColor: Record<ProgressTone, string> = {
    primary: 'var(--tld-primary)',
    success: 'var(--tld-success)',
    warning: 'var(--tld-warning)',
    error: 'var(--tld-error)',
    accent: 'var(--tld-accent)',
    purple: 'var(--tld-purple)',
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--tld-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold text-primary">{clamped}%</span>
    </div>
  )
}
