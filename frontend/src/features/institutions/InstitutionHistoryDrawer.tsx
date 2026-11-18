import { useEffect, useState } from 'react'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { Drawer } from '@/components/ui/Drawer'
import { institutionService } from '@/services/mock/MockInstitutionService'
import type { ActivityEvent, Institution } from '@/types/institution'
import { formatDate } from '@/utils/datetime'

/** Row-menu action: view institution history (Spec §5.4) — activity drawer. */
export function InstitutionHistoryDrawer({
  institution,
  onClose,
}: {
  institution: Institution | null
  onClose: () => void
}) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)

  useEffect(() => {
    if (!institution) {
      setEvents(null)
      return
    }
    let active = true
    setEvents(null)
    void institutionService.activity(institution.id).then((list) => {
      if (active) setEvents(list)
    })
    return () => {
      active = false
    }
  }, [institution])

  return (
    <Drawer
      open={institution !== null}
      onClose={onClose}
      title={`History — ${institution?.tradingName ?? ''}`}
    >
      {events === null ? (
        <LoadingSkeleton rows={5} variant="text" />
      ) : events.length === 0 ? (
        <EmptyState
          title="No recorded history"
          description="This demo institution has no activity events yet in the prototype session."
        />
      ) : (
        <ol className="relative ml-2 border-l border-line pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative pb-4 last:pb-0">
              <span aria-hidden="true" className="absolute top-1 -left-[26px] h-2.5 w-2.5 rounded-full bg-primary-surface ring-4 ring-card" />
              <p className="text-xs font-semibold text-ink">{event.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">{event.detail}</p>
              <p className="mt-0.5 text-[10px] text-ink-tertiary">
                {event.actor} · {formatDate(event.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
        Demo history — illustrative events from the prototype dataset.
      </p>
    </Drawer>
  )
}
