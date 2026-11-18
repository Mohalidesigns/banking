import type { ReactNode, RefObject } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { cx } from '@/utils/cx'

/**
 * Dropdown menu per DS §8.19: white panel, rounded-md, shadow-lg,
 * ring-1 ring-black/5, enter 200ms ease-out / leave 75ms ease-in.
 * Keyboard: trigger toggles, Escape closes and restores focus, Tab is
 * contained inside the panel while open.
 */
export interface DropdownMenuRenderProps {
  open: boolean
  toggle: () => void
  close: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
  triggerProps: {
    'aria-haspopup': 'menu' | 'dialog' | 'true'
    'aria-expanded': boolean
    'aria-controls': string
    onClick: () => void
    ref: RefObject<HTMLButtonElement | null>
  }
}

interface DropdownMenuProps {
  renderTrigger: (props: DropdownMenuRenderProps) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  align?: 'left' | 'right'
  panelClassName?: string
  /** 'menu' for navigation/action lists, 'dialog' for panels like notifications. */
  semantics?: 'menu' | 'dialog'
  ariaLabel: string
}

export function DropdownMenu({
  renderTrigger,
  children,
  align = 'right',
  panelClassName,
  semantics = 'menu',
  ariaLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onPointerDown)
    // Move focus into the panel when it opens (DS §12 / Spec §17.3).
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    )
    focusables?.[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative" aria-label={ariaLabel}>
      {renderTrigger({
        open,
        toggle: () => setOpen((v) => !v),
        close,
        triggerRef,
        triggerProps: {
          'aria-haspopup': semantics === 'dialog' ? 'dialog' : 'menu',
          'aria-expanded': open,
          'aria-controls': open ? panelId : '',
          onClick: () => setOpen((v) => !v),
          ref: triggerRef,
        },
      })}
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role={semantics === 'dialog' ? 'dialog' : 'menu'}
          aria-label={ariaLabel}
          className={cx(
            'animate-dropdown-in absolute top-full z-50 mt-2 min-w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children({ close })}
        </div>
      )}
    </div>
  )
}

/** Standard menu item styling per DS §8.19. */
export function DropdownMenuItem({
  children,
  onSelect,
  danger = false,
  icon,
}: {
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cx(
        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm leading-5 transition-colors cursor-pointer',
        danger ? 'text-error hover:bg-tint-red' : 'text-ink hover:bg-gray-100',
      )}
    >
      {icon && <span className="shrink-0 text-ink-secondary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}
