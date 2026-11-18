import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cx } from '@/utils/cx'

export interface BreadcrumbItem {
  label: string
  path?: string
}

/** Breadcrumbs per DS §8.20: 6px gap, 12–14px, secondary colour, current page medium. */
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cx('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" aria-hidden="true" />}
              {item.path && !isLast ? (
                <Link to={item.path} className="transition-colors hover:text-primary hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cx('truncate', isLast && 'font-medium text-ink')}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
