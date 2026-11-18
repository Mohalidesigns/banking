import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

/**
 * Tabs. Accessible tablist pattern: roving focus with arrow keys,
 * aria-selected/aria-controls, navy active tab with gold underline
 * (gold = active-state accent, DS §14.5).
 */
export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  /** Optional demo count shown as a pill. */
  count?: number
  disabled?: boolean
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  const onKeyDown = (event: React.KeyboardEvent) => {
    const enabled = items.filter((t) => !t.disabled)
    const index = enabled.findIndex((t) => t.id === activeId)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onChange(enabled[(index + 1) % enabled.length].id)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onChange(enabled[(index - 1 + enabled.length) % enabled.length].id)
    }
  }

  return (
    <div className={cx('min-w-0', className)}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line"
        aria-label="Content tabs"
      >
        {items.map((tab) => {
          const active = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cx(
                '-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-150',
                active
                  ? 'border-accent text-primary'
                  : 'border-transparent text-ink-secondary hover:border-line hover:text-ink',
                tab.disabled && 'cursor-not-allowed opacity-40 hover:border-transparent',
              )}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className="rounded-full bg-page px-1.5 py-0.5 text-[10px] font-semibold text-ink-secondary">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {items
        .filter((t) => t.id === activeId)
        .map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
            className="pt-4 outline-none"
          >
            {tab.content}
          </div>
        ))}
    </div>
  )
}
