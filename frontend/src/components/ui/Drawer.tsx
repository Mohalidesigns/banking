import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '@/utils/cx'

/**
 * Right-side contextual drawer (Spec §3.1 item 4, §17.3). Same focus
 * management contract as Modal: focus in on open, Tab trap, Escape closes,
 * focus restored. Full-screen width on mobile.
 */
export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Drawer({ open, onClose, title, children, footer, width = '480px' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Callers pass inline arrow onClose props; keeping the latest one in a ref
  // stops the focus/keydown effect from re-running (and stealing focus back
  // to the first focusable — the X close button) on every parent re-render
  // of a controlled form inside the drawer. Same fix as Modal (Phase 2B).
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
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
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
        style={{ maxWidth: width }}
        className={cx(
          'animate-slide-in absolute inset-y-0 right-0 flex w-full flex-col bg-card shadow-2xl outline-none',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-sm font-semibold text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="-mr-1 shrink-0 cursor-pointer rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-page hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
