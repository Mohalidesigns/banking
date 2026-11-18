import { Check, ChevronDown, MapPin } from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { useSessionStore } from '@/store/sessionStore'
import { cx } from '@/utils/cx'

/**
 * Jurisdiction/authority context selector (Spec §3.3). Prototype stub:
 * switching updates the session context and gives prototype-honest feedback.
 */
export function JurisdictionSelector() {
  const jurisdiction = useSessionStore((s) => s.jurisdiction)
  const jurisdictions = useSessionStore((s) => s.jurisdictions)
  const setJurisdiction = useSessionStore((s) => s.setJurisdiction)

  if (!jurisdiction || jurisdictions.length === 0) return null

  return (
    <DropdownMenu
      ariaLabel="Jurisdiction context"
      panelClassName="w-72"
      renderTrigger={({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={`Jurisdiction context: ${jurisdiction.name}`}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 text-xs font-medium text-ink transition-colors hover:bg-page"
        >
          <MapPin className="h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />
          <span className="hidden max-w-40 truncate lg:block">{jurisdiction.name}</span>
          <span className="rounded bg-tint-blue px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {jurisdiction.code}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1" role="none">
          <p className="overline px-4 py-2">Authorised contexts</p>
          {jurisdictions.map((j) => (
            <button
              key={j.id}
              type="button"
              role="menuitemradio"
              aria-checked={j.id === jurisdiction.id}
              onClick={() => {
                setJurisdiction(j)
                close()
                toast.info('Jurisdiction context switched', `Prototype session now scoped to ${j.name}.`)
              }}
              className={cx(
                'flex w-full cursor-pointer items-start gap-2 px-4 py-2 text-left transition-colors hover:bg-gray-100',
                j.id === jurisdiction.id && 'bg-tint-blue/60',
              )}
            >
              <Check
                className={cx('mt-0.5 h-4 w-4 shrink-0 text-success', j.id !== jurisdiction.id && 'invisible')}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{j.name}</span>
                <span className="block truncate text-xs text-ink-secondary">{j.authority}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </DropdownMenu>
  )
}
