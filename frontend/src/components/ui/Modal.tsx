import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '@/utils/cx'

/**
 * Modal dialog per DS §8.17 / Spec §17.3: fixed overlay bg-gray-500/75,
 * z-50, centered white panel (rounded-lg, shadow-2xl), enter ease-out 300ms
 * (opacity 0→100, scale 95→100). Full focus management: focus moves into the
 * panel on open, Tab is trapped, Escape closes, focus is restored on close.
 * Responsive: near-full-screen on mobile.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  /** Hide the default close button (e.g. forced confirm flows). */
  hideCloseButton?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideCloseButton = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Callers pass inline arrow onClose props; keeping the latest one in a ref
  // stops the focus/keydown effect from re-running (and stealing focus back to
  // the first focusable) on every parent re-render of a controlled form.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
    ;(focusables && focusables.length > 0 ? focusables[0] : panel)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key === 'Tab' && panel) {
        const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (items.length === 0) {
          event.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-gray-500/75"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'animate-modal-in relative flex max-h-[90vh] w-full flex-col rounded-lg bg-card shadow-2xl outline-none',
          sizeClasses[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-primary">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs text-ink-secondary">{description}</p>}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 shrink-0 cursor-pointer rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-page hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
