import type { ReactNode } from 'react'
import { CircleCheck, CircleExclamationPoint, Info, TriangleExclamationPoint } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cx } from '@/utils/cx'

/**
 * Confirm dialog per DS §8.17: coloured icon background per variant
 * (danger red, warning amber, primary blue, success green), full-width
 * confirm/cancel buttons, processing spinner state.
 */
export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success'

const iconByVariant: Record<ConfirmVariant, { icon: typeof Info; classes: string }> = {
  danger: { icon: CircleExclamationPoint, classes: 'bg-tint-red text-error' },
  warning: { icon: TriangleExclamationPoint, classes: 'bg-tint-orange text-warning' },
  primary: { icon: Info, classes: 'bg-tint-blue text-primary' },
  success: { icon: CircleCheck, classes: 'bg-tint-green text-success' },
}

const buttonByVariant: Record<ConfirmVariant, 'danger' | 'warning' | 'primary' | 'success'> = {
  danger: 'danger',
  warning: 'warning',
  primary: 'primary',
  success: 'success',
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  const { icon: Icon, classes } = iconByVariant[variant]
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className={cx('flex h-8 w-8 items-center justify-center rounded-full', classes)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </span>
      }
      size="sm"
      hideCloseButton={loading}
    >
      <div className="text-sm leading-relaxed text-ink">{message}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading} className="w-full py-2.5">
          {cancelLabel}
        </Button>
        <Button
          variant={buttonByVariant[variant]}
          onClick={onConfirm}
          loading={loading}
          className="w-full py-2.5"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
