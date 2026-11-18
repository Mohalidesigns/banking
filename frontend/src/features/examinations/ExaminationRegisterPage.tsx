import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  FolderSearch,
  Plus,
  Table2,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import { libraryService } from '@/services/mock/MockLibraryService'
import type { Institution } from '@/types/institution'
import type { ExaminationDetail } from '@/types/examination'
import type { ExaminationStatus } from '@/types/supervision'
import { cx } from '@/utils/cx'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Examination Register (Spec §7.1): table / calendar / kanban-by-stage
 * views with the seven specified filters and register actions. The Command
 * Centre "examinations in progress" deep-link arrives as
 * ?status=in-progress and maps to the active-stage set.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  Planned: 'planning',
  'In Progress': 'active',
  Fieldwork: 'fieldwork',
  Reporting: 'reporting',
  Completed: 'completed',
  Cancelled: 'closed',
}

const KANBAN_STAGES: ExaminationStatus[] = ['Draft', 'Planned', 'Fieldwork', 'In Progress', 'Reporting', 'Completed']

const ACTIVE_STATUSES: ExaminationStatus[] = ['In Progress', 'Fieldwork', 'Reporting']

const monthLabel = (d: Date): string => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export function ExaminationRegisterPage({
  initialView = 'table',
  initialTitle,
}: {
  /** Route variant: /app/examination-calendar opens directly in calendar view. */
  initialView?: 'table' | 'calendar' | 'kanban'
  initialTitle?: string
} = {}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const actor = useActor()
  const canCreate = can(actor.actorRole, 'create-examination')
  const canFieldwork = can(actor.actorRole, 'record-fieldwork')

  const [exams, setExams] = useState<ExaminationDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [view, setView] = useState<'table' | 'calendar' | 'kanban'>(initialView)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Seven filters (Spec §7.1); institution/status prefilled from deep-links.
  const [fInstitution, setFInstitution] = useState(searchParams.get('institutionId') ?? '')
  const [fType, setFType] = useState(searchParams.get('type') ?? '')
  const [fDomain, setFDomain] = useState(searchParams.get('domain') ?? '')
  const [fTeam, setFTeam] = useState('')
  const [fStatus, setFStatus] = useState(searchParams.get('status') ?? '')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fPriority, setFPriority] = useState(searchParams.get('priority') ?? '')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const [list, instPage, domainList] = await Promise.all([
      examinationService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
      libraryService.domains(),
    ])
    setExams(list)
    setInstitutions(instPage.items)
    setDomains(domainList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])
  const teamLeads = useMemo(
    () => Array.from(new Set((exams ?? []).map((e) => e.leadExaminerName))).sort(),
    [exams],
  )

  const rows = useMemo(() => {
    if (!exams) return []
    const s = search.trim().toLowerCase()
    return exams
      .filter((e) => !fInstitution || e.institutionId === fInstitution)
      .filter((e) => !fType || e.type === fType)
      .filter(
        (e) =>
          !fDomain ||
          e.scope.domains.includes(fDomain) ||
          e.scopeAreas.some((a) => a.toLowerCase().includes(fDomain.toLowerCase())),
      )
      .filter((e) => !fTeam || e.leadExaminerName === fTeam || e.teamMemberNames.includes(fTeam))
      .filter((e) => {
        if (!fStatus) return true
        if (fStatus === 'in-progress') return ACTIVE_STATUSES.includes(e.status)
        return e.status === fStatus
      })
      .filter((e) => !fFrom || e.plannedEndDate >= fFrom)
      .filter((e) => !fTo || e.startDate <= fTo)
      .filter((e) => !fPriority || e.riskRating === fPriority)
      .filter((e) => !s || `${e.reference} ${e.title} ${e.leadExaminerName}`.toLowerCase().includes(s))
  }, [exams, fInstitution, fType, fDomain, fTeam, fStatus, fFrom, fTo, fPriority, search])

  const handleExport = () => {
    if (!can(actor.actorRole, 'export')) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-examination-register-demo.csv',
      ['Reference', 'Institution', 'Type', 'Domains', 'Team lead', 'Start', 'Planned end', 'Stage', 'Progress %', 'Risk priority', 'Status'],
      rows.map((e) => [
        e.reference,
        instById.get(e.institutionId)?.tradingName ?? e.institutionId,
        e.type,
        e.scope.domains.join('; '),
        e.leadExaminerName,
        e.startDate,
        e.plannedEndDate,
        e.status,
        e.progressPct,
        e.riskRating,
        e.status,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<ExaminationDetail, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold text-ink">{row.original.reference}</p>
            <p className="max-w-52 truncate text-[10px] text-ink-secondary">{row.original.title}</p>
          </div>
        ),
      },
      {
        id: 'institution',
        accessorFn: (e) => instById.get(e.institutionId)?.tradingName ?? '',
        header: 'Institution',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={(ev) => {
              ev.stopPropagation()
              navigate(`/app/institutions/${row.original.institutionId}`)
            }}
          >
            {instById.get(row.original.institutionId)?.tradingName ?? '—'}
          </button>
        ),
      },
      { accessorKey: 'type', header: 'Type' },
      {
        id: 'domains',
        accessorFn: (e) => e.scope.domains.join(', '),
        header: 'Scope / domains',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-56 text-xs text-ink-secondary">
            {row.original.scope.domains.join(', ') || row.original.scopeAreas.join(', ')}
          </span>
        ),
      },
      { accessorKey: 'leadExaminerName', header: 'Team lead' },
      {
        id: 'dates',
        accessorFn: (e) => e.startDate,
        header: 'Planned dates',
        cell: ({ row }) => (
          <span className="text-xs text-ink-secondary">
            {formatDate(row.original.startDate)} → {formatDate(row.original.plannedEndDate)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Stage',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
      {
        id: 'progress',
        accessorFn: (e) => e.progressPct,
        header: 'Progress',
        cell: ({ row }) => (
          <div className="w-24">
            <ProgressBar
              value={row.original.progressPct}
              showValue
              tone={row.original.progressPct >= 100 ? 'success' : 'primary'}
              label={`${row.original.reference} progress`}
            />
          </div>
        ),
      },
      {
        accessorKey: 'riskRating',
        header: 'Risk priority',
        cell: ({ row }) => <RiskBadge rating={row.original.riskRating} />,
      },
    ],
    [instById, navigate],
  )

  // --- calendar helpers -------------------------------------------------------

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const startPad = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ date: Date | null; exams: ExaminationDetail[] }> = []
    for (let i = 0; i < startPad; i += 1) cells.push({ date: null, exams: [] })
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      const iso = date.toISOString().slice(0, 10)
      cells.push({ date, exams: rows.filter((e) => e.startDate <= iso && iso <= e.plannedEndDate) })
    }
    return cells
  }, [cursor, rows])

  const viewSwitcher = (
    <div className="flex overflow-hidden rounded-lg border border-line">
      {(
        [
          ['table', Table2, 'Table'],
          ['calendar', CalendarDays, 'Calendar'],
          ['kanban', Columns3, 'Kanban'],
        ] as const
      ).map(([id, Icon, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          onClick={() => setView(id)}
          className={cx(
            'flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
            view === id ? 'bg-primary text-white' : 'bg-card text-ink-secondary hover:text-primary',
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  )

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TextInput
        aria-label="Search examinations"
        placeholder="Search reference, title or team lead…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        aria-label="Filter by institution"
        value={fInstitution}
        onChange={(e) => setFInstitution(e.target.value)}
        placeholder="All institutions"
        options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
      />
      <Select
        aria-label="Filter by examination type"
        value={fType}
        onChange={(e) => setFType(e.target.value)}
        placeholder="All types"
        options={['Maiden', 'Routine', 'Comprehensive', 'Special', 'Targeted', 'Thematic', 'Follow-up', 'Spot Check', 'Joint', 'AML/CFT', 'Cybersecurity'].map((t) => ({ value: t, label: t }))}
      />
      <Select
        aria-label="Filter by domain"
        value={fDomain}
        onChange={(e) => setFDomain(e.target.value)}
        placeholder="All domains"
        options={domains.map((d) => ({ value: d, label: d }))}
      />
      <Select
        aria-label="Filter by team lead"
        value={fTeam}
        onChange={(e) => setFTeam(e.target.value)}
        placeholder="All teams / leads"
        options={teamLeads.map((t) => ({ value: t, label: t }))}
      />
      <Select
        aria-label="Filter by status"
        value={fStatus}
        onChange={(e) => setFStatus(e.target.value)}
        placeholder="All stages"
        options={[
          { value: 'in-progress', label: 'In progress (active stages)' },
          ...KANBAN_STAGES.map((s) => ({ value: s, label: s })),
          { value: 'Cancelled', label: 'Cancelled' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextInput aria-label="Planned from date" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        <TextInput aria-label="Planned to date" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
      </div>
      <Select
        aria-label="Filter by risk priority"
        value={fPriority}
        onChange={(e) => setFPriority(e.target.value)}
        placeholder="All priorities"
        options={['Critical', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))}
      />
    </div>
  )

  return (
    <div>
      <PageHeader
        title={initialTitle ?? 'Examination Register'}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>All supervisory examinations across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            {viewSwitcher}
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export register
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              disabled={!canCreate}
              title={canCreate ? undefined : 'Your demo role cannot create examinations (Spec §19)'}
              onClick={() => navigate('/app/examinations/new')}
            >
              Create examination
            </Button>
          </>
        }
      />

      {exams === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : view === 'table' ? (
        <DataTable<ExaminationDetail>
          columns={columns}
          data={rows}
          title="Examinations"
          headerAction={<span className="text-xs text-ink-secondary">{rows.length} examinations · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/app/examinations/${row.id}`)}
          initialPageSize={10}
          emptyTitle="No examinations match"
          emptyDescription="Adjust the seven filters, or create an examination with the six-step wizard."
          emptyAction={canCreate ? { label: 'Create examination', onClick: () => navigate('/app/examinations/new') } : undefined}
          onRetry={() => void load()}
          toolbar={filterBar}
          rowActions={(row) =>
            canFieldwork && ACTIVE_STATUSES.includes(row.status) ? (
              <Button
                variant="outline"
                size="sm"
                iconLeft={<FolderSearch className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/app/examinations/${row.id}/workspace`)}
              >
                Open workspace
              </Button>
            ) : undefined
          }
        />
      ) : view === 'calendar' ? (
        <Card>
          <CardHeader
            title={monthLabel(cursor)}
            subtitle="Examinations overlapping each day of their planned fieldwork window (demo schedule)."
            action={
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
                  Today
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </span>
            }
          />
          <CardBody>
            <div className="mb-2">{filterBar}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink-secondary">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, i) => (
                <div
                  key={i}
                  className={cx('min-h-24 rounded-lg border p-1.5', cell.date ? 'border-line bg-card' : 'border-transparent')}
                >
                  {cell.date && (
                    <>
                      <p className="text-[10px] font-semibold text-ink-secondary">{cell.date.getDate()}</p>
                      <div className="mt-1 flex flex-col gap-1">
                        {cell.exams.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            title={`${e.reference} — ${instById.get(e.institutionId)?.tradingName ?? ''} (${e.status})`}
                            onClick={() => navigate(`/app/examinations/${e.id}`)}
                            className="flex cursor-pointer items-center gap-1 truncate rounded bg-page px-1.5 py-0.5 text-left text-[9px] text-ink hover:bg-tint-blue"
                          >
                            <StatusBadge status={e.status} tone={STATUS_TONES[e.status]} />
                            <span className="truncate font-mono">{e.reference}</span>
                          </button>
                        ))}
                        {cell.exams.length > 2 && (
                          <span className="px-1 text-[9px] text-ink-secondary">+{cell.exams.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div>
          <div className="mb-3">{filterBar}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {KANBAN_STAGES.map((stage) => {
              const stageExams = rows.filter((e) => e.status === stage)
              return (
                <div key={stage} className="flex min-h-60 flex-col rounded-xl border border-line bg-page/60">
                  <div className="flex items-center justify-between border-b border-line px-3 py-2">
                    <StatusBadge status={stage} tone={STATUS_TONES[stage]} />
                    <span className="rounded-full bg-card px-1.5 text-[10px] font-semibold text-ink-secondary">
                      {stageExams.length}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {stageExams.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => navigate(`/app/examinations/${e.id}`)}
                        className="cursor-pointer rounded-lg border border-line bg-card p-2.5 text-left shadow-card transition-transform hover:-translate-y-0.5"
                      >
                        <p className="font-mono text-[10px] font-semibold text-primary">{e.reference}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-ink">
                          {instById.get(e.institutionId)?.tradingName ?? '—'}
                        </p>
                        <p className="mt-0.5 text-[9px] text-ink-secondary">{e.type} · {e.leadExaminerName}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-1">
                          <PriorityBadge priority={e.riskRating} />
                          <span className="text-[9px] text-ink-secondary">{e.progressPct}%</span>
                        </div>
                        <ProgressBar value={e.progressPct} className="mt-1" label={`${e.reference} progress`} />
                      </button>
                    ))}
                    {stageExams.length === 0 && (
                      <p className="px-1 py-4 text-center text-[10px] text-ink-tertiary">No examinations at this stage</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {rows.length === 0 && (
            <EmptyState
              className="mt-4 rounded-xl border border-line bg-card"
              title="No examinations match the filters"
              description="Kanban columns group examinations by current stage (Spec §7.1)."
            />
          )}
        </div>
      )}
    </div>
  )
}
