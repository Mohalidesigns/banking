import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { History, UserRound } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { Select, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { PageHeader } from '@/components/ui/PageHeader'
import { directorService } from '@/services/mock/MockDirectorService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import type { Director, Institution } from '@/types/institution'
import { cx } from '@/utils/cx'
import { formatDate } from '@/utils/datetime'

/**
 * Directors & Key Officers (Spec §5.6): person register with institution,
 * position, appointment, fit-and-proper and approval status, conflict
 * declarations, plus a profile drawer with appointment/status history.
 */

const FP_TONES: Record<string, StatusTone> = {
  Approved: 'active',
  Conditional: 'fieldwork',
  'Under Review': 'planning',
  Pending: 'draft',
  Rejected: 'overdue',
}

const CATEGORIES = ['Executive', 'Non-Executive', 'Independent', 'Key Officer']
const FP_STATUSES = ['Approved', 'Conditional', 'Under Review', 'Pending', 'Rejected']

const HISTORY_TONES: Record<string, string> = {
  Appointed: 'bg-primary-surface',
  Approved: 'bg-success',
  Conditional: 'bg-warning',
  'Under Review': 'bg-accent',
  Pending: 'bg-ink-tertiary',
  Rejected: 'bg-error',
  Suspended: 'bg-error',
  Reinstated: 'bg-success',
  Resigned: 'bg-ink-tertiary',
}

export function DirectorsPage() {
  const navigate = useNavigate()
  const [directors, setDirectors] = useState<Director[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fpFilter, setFpFilter] = useState('')
  const [search, setSearch] = useState('')
  const [activeDirector, setActiveDirector] = useState<Director | null>(null)

  const load = useCallback(async () => {
    const [list, instPage] = await Promise.all([
      directorService.list({
        institutionId: institutionFilter || undefined,
        category: categoryFilter || undefined,
        fitAndProperStatus: fpFilter || undefined,
        search,
      }),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setDirectors(list)
    setInstitutions(instPage.items)
  }, [institutionFilter, categoryFilter, fpFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const columns = useMemo<Array<ColumnDef<Director, unknown>>>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Person',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-blue text-[10px] font-bold text-primary">
              {row.original.fullName
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <span className="block text-[13px] font-medium text-ink">{row.original.fullName}</span>
              <span className="block text-[10px] text-ink-secondary">{row.original.category}</span>
            </span>
          </span>
        ),
      },
      {
        id: 'institution',
        accessorFn: (row) => instById.get(row.institutionId)?.tradingName ?? '',
        header: 'Institution',
      },
      { accessorKey: 'position', header: 'Position' },
      {
        accessorKey: 'appointmentDate',
        header: 'Appointed',
        cell: ({ getValue }) => <span className="text-xs">{formatDate(getValue<string>())}</span>,
      },
      {
        accessorKey: 'fitAndProperStatus',
        header: 'Fit & proper',
        cell: ({ row }) => (
          <StatusBadge status={row.original.fitAndProperStatus} tone={FP_TONES[row.original.fitAndProperStatus]} />
        ),
      },
      {
        accessorKey: 'approvalStatus',
        header: 'Approval',
        cell: ({ getValue }) => <span className="text-xs text-ink-secondary">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'conflictDeclarations',
        header: 'Conflicts',
        cell: ({ getValue }) => {
          const n = getValue<number>()
          return n > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tint-orange px-1.5 text-[11px] font-semibold text-warning">
              {n}
            </span>
          ) : (
            <span className="text-xs text-ink-tertiary">0</span>
          )
        },
      },
    ],
    [instById],
  )

  return (
    <div>
      <PageHeader
        title="Directors & Key Officers"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Fit-and-proper register across all supervised demo institutions</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Fictional people
            </span>
          </span>
        }
      />

      {directors === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<Director>
          columns={columns}
          data={directors}
          title="Person register"
          headerAction={<span className="text-xs text-ink-secondary">{directors.length} records · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => setActiveDirector(row)}
          initialPageSize={10}
          emptyTitle="No people match"
          emptyDescription="Adjust the filters — the demo register covers boards and key officers of all eight institutions."
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextInput
                aria-label="Search people"
                placeholder="Search name or position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Filter by institution"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="All categories"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by fit-and-proper status"
                value={fpFilter}
                onChange={(e) => setFpFilter(e.target.value)}
                placeholder="All fit-and-proper statuses"
                options={FP_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      )}

      {/* Person profile drawer with appointment/status history */}
      <Drawer
        open={activeDirector !== null}
        onClose={() => setActiveDirector(null)}
        width="520px"
        title={
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
            {activeDirector?.fullName ?? ''}
          </span>
        }
        footer={
          activeDirector && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  const id = activeDirector.institutionId
                  setActiveDirector(null)
                  navigate(`/app/institutions/${id}?tab=board`)
                }}
              >
                Open institution board tab
              </Button>
            </div>
          )
        }
      >
        {activeDirector && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="overline">Position</p>
                <p className="mt-0.5 text-xs font-medium text-ink">{activeDirector.position}</p>
              </div>
              <div>
                <p className="overline">Category</p>
                <p className="mt-0.5 text-xs text-ink">{activeDirector.category}</p>
              </div>
              <div>
                <p className="overline">Institution</p>
                <p className="mt-0.5 text-xs text-ink">
                  {instById.get(activeDirector.institutionId)?.tradingName ?? '—'}
                </p>
              </div>
              <div>
                <p className="overline">Appointed</p>
                <p className="mt-0.5 text-xs text-ink">{formatDate(activeDirector.appointmentDate)}</p>
              </div>
              <div>
                <p className="overline">Fit & proper</p>
                <div className="mt-0.5">
                  <StatusBadge status={activeDirector.fitAndProperStatus} tone={FP_TONES[activeDirector.fitAndProperStatus]} />
                </div>
              </div>
              <div>
                <p className="overline">Approval status</p>
                <p className="mt-0.5 text-xs text-ink">{activeDirector.approvalStatus}</p>
              </div>
            </div>

            <div>
              <p className="overline">Committee memberships</p>
              {activeDirector.committeeMemberships.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">None recorded (demo).</p>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeDirector.committeeMemberships.map((c) => (
                    <li key={c} className="rounded-full bg-tint-blue px-2.5 py-1 text-[10px] font-semibold text-primary">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="overline">Conflict declarations</p>
              <p className="mt-1 text-xs text-ink">
                {activeDirector.conflictDeclarations} on file
              </p>
              {activeDirector.conflictNotes && (
                <p className="mt-1 rounded-lg bg-page p-2.5 text-[11px] leading-snug text-ink-secondary">
                  {activeDirector.conflictNotes}
                </p>
              )}
            </div>

            <div>
              <p className="overline flex items-center gap-1.5">
                <History className="h-3 w-3" aria-hidden="true" />
                Appointment & status history
              </p>
              <ol className="relative mt-2 ml-2 border-l border-line pl-5">
                {activeDirector.statusHistory.map((event, idx) => (
                  <li key={`${event.date}-${idx}`} className="relative pb-4 last:pb-0">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'absolute top-1 -left-[26px] h-2.5 w-2.5 rounded-full ring-4 ring-card',
                        HISTORY_TONES[event.status] ?? 'bg-ink-tertiary',
                      )}
                    />
                    <p className="text-xs font-semibold text-ink">{event.status}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">{event.note}</p>
                    <p className="mt-0.5 text-[10px] text-ink-tertiary">{formatDate(event.date)}</p>
                  </li>
                ))}
              </ol>
            </div>

            <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Prototype drawer — this person is fictional and the register carries no regulatory effect.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
