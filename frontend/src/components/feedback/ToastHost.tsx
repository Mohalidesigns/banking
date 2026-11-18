import { useEffect } from 'react'
import {
  CircleCheck,
  CircleExclamationPoint,
  Info,
  TriangleExclamationPoint,
  X,
} from 'lucide-react'
import { useToastStore, type Toast, type ToastType } from '@/components/feedback/toastStore'
import { cx } from '@/utils/cx'

const AUTO_DISMISS_MS = 5000

/**
 * Toast stack per DS §8.18: fixed top 80px / right 16px, z-110 (DS §10),
 * 12px gap, slide-in from right, type-coloured icon + border accent,
 * 5s auto-dismiss with animated progress bar.
 */
const typeStyles: Record<ToastType, { border: string; iconBg: string; icon: typeof Info }> = {
  success: { border: 'border-l-success', iconBg: 'bg-tint-green text-success', icon: CircleCheck },
  error: { border: 'border-l-error', iconBg: 'bg-tint-red text-error', icon: CircleExclamationPoint },
  warning: { border: 'border-l-warning', iconBg: 'bg-tint-orange text-warning', icon: TriangleExclamationPoint },
  info: { border: 'border-l-primary', iconBg: 'bg-tint-blue text-primary', icon: Info },
}

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const styles = typeStyles[toast.type]
  const Icon = styles.icon

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, dismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'animate-slide-in pointer-events-auto relative w-80 overflow-hidden rounded-lg border border-line bg-white shadow-elevated',
        styles.border,
        'border-l-4',
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', styles.iconBg)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink">{toast.title}</p>
          {toast.message && <p className="mt-0.5 text-[11px] text-ink-secondary">{toast.message}</p>}
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 cursor-pointer rounded p-1 text-ink-tertiary transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div
        aria-hidden="true"
        className={cx(
          'animate-toast-progress h-1 w-full',
          toast.type === 'success' && 'bg-success',
          toast.type === 'error' && 'bg-error',
          toast.type === 'warning' && 'bg-warning',
          toast.type === 'info' && 'bg-primary',
        )}
      />
    </div>
  )
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed top-20 right-4 flex flex-col gap-3"
      style={{ zIndex: 110 }}
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  )
}
