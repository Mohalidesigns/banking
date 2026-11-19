import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Hourglass,
  Inbox,
  Layers,
  Building,
  TriangleExclamationPoint,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { returnsService } from '@/services/mock/MockReturnsService'
import type { ReturnsDashboardData } from '@/services/contracts/ReturnsService'
import type { Institution } from '@/types/institution'
import type {
  InstitutionComplianceRow,
  ReturnTypeRow,
  SubmissionRow,
  ValidationExceptionRow,
} from '@/types/returns'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'
import { ReturnDefinitionsView, ReturnTemplateDesigner } from '@/features/returns/ReturnTemplateDesignerPage'

/**
 * Returns dashboard (Spec §11.1): six KPI cards plus five views —
 * submission register (all §11.1 columns), calendar, institution
 * compliance, return type and validation exceptions. Deep-links honoured:
 * ?status=overdue from the Command Centre KPI, ?institutionId= and
 * ?returnCode= from the compliance/type views, ?view= selects the tab.
 * Also renders /app/submission-monitoring (register view) so the sidebar
 * has no dead end. Demo data only.
 */

export type ReturnsViewId = 'register' | 'calendar' | 'compliance' | 'types' | 'exceptions' | 'templates'

const STATUS_TONES: Record<string, StatusTone> = {
  Submitted: 'active',
  'Due Soon': 'planning',
  Overdue: 'overdue',
  'In Review': 'fieldwork',
  Accepted: 'completed',
  Rejected: 'overdue',
}

const REVIEW_TONES: Record<string, StatusTone> = {
  'Awaiting Review': 'planning',
  'Under Review': 'fieldwork',
  Accepted: 'completed',
  Rejected: 'overdue',
  'Returned for Correction': 'overdue',
}

const VALIDATION_TONES: Record<string, StatusTone> = {
  Passed: 'active',
  Warnings: 'fieldwork',
  Errors: 'overdue',
  'Not Run': 'draft',
}

const DEMO_NOTE = 'Illustrative demo data — no real submissions, institutions or validation services.'

const STATUSES = ['Submitted', 'Due Soon', 'Overdue', 'In Review', 'Accepted', 'Rejected']
const REVIEW_STATUSES = ['Awaiting Review', 'Under Review', 'Accepted', 'Rejected', 'Returned for Correction']
const VALIDATIONS = ['Passed', 'Warnings', 'Errors', 'Not Run']

export function ReturnsDashboardPage({
  initialView,
  initialTitle,
}: {
  /** Preselect a view when this page renders another route (submission-monitoring). */
  initialView?: ReturnsViewId
  initialTitle?: string
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')

  const [data, setData] = useState<ReturnsDashboardData | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])

  const statusParam = searchParams.get('status')
  const [view, setView] = useState<ReturnsViewId>(
    initialView ?? ((searchParams.get('view') as ReturnsViewId) || 'register'),
  )
  // ?search= deep links (e.g. SUB-2026-0143 chips on the prudential screens).
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [fInstitution, setFInstitution] = useState(searchParams.get('institutionId') ?? '')
  const [fReturnCode, setFReturnCode] = useState(searchParams.get('returnCode') ?? '')
  const [fStatus, setFStatus] = useState(
    statusParam === 'overdue' ? 'Overdue' : (statusParam ?? ''),
  )
  const [fReview, setFReview] = useState(searchParams.get('review') ?? '')
  const [fValidation, setFValidation] = useState(searchParams.get('validation') ?? '')
  /** Template designer (Spec §11.2) renders inside this route: ?template=<id>. */
  const [designerId, setDesignerId] = useState<string | null>(
    searchParams.get('view') === 'designer' ? searchParams.get('template') : null,
  )

  const load = useCallback(async () => {
    const [dash, subs, instPage] = await Promise.all([
      returnsService.dashboard({}),
      returnsService.listSubmissions({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setData(dash)
    setSubmissions(subs)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const returnCodes = useMemo(
    () => [...new Set((submissions ?? []).map((s) => s.returnCode))].sort(),
    [submissions],
  )

  const rows = useMemo(() => {
    if (!submissions) return []
    const s = search.trim().toLowerCase()
    return submissions
      .filter((r) => !fInstitution || r.institutionId === fInstitution)
      .filter((r) => !fReturnCode || r.returnCode === fReturnCode)
      .filter((r) => !fStatus || r.status === fStatus)
      .filter((r) => !fReview || r.reviewStatus === fReview)
      .filter((r) => !fValidation || r.validation === fValidation)
      .filter(
        (r) =>
          !s ||
          `${r.reference} ${r.returnCode} ${r.returnName} ${r.institutionName} ${r.period}`
            .toLowerCase()
            .includes(s),
      )
  }, [submissions, search, fInstitution, fReturnCode, fStatus, fReview, fValidation])

  /** Switch to the register with a single filter applied (KPI deep-links). */
  const focusRegister = (filter: { institution?: string; returnCode?: string; status?: string; review?: string; validation?: string }) => {
    setView('register')
    setFInstitution(filter.institution ?? '')
    setFReturnCode(filter.returnCode ?? '')
    setFStatus(filter.status ?? '')
    setFReview(filter.review ?? '')
    setFValidation(filter.validation ?? '')
    setSearch('')
    setSearchParams({}, { replace: true })
  }

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-returns-demo.csv',
      ['Submission ref', 'Institution', 'Return type', 'Period', 'Due date', 'Submitted', 'Version', 'Validation', 'Status', 'Review status'],
      rows.map((r) => [
        r.reference,
        r.institutionName,
        `${r.returnCode} — ${r.returnName}`,
        r.period,
        r.dueDate,
        r.submittedAt ?? '—',
        r.version,
        r.validation,
        r.status,
        r.reviewStatus,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  // Register columns (Spec §11.1) -------------------------------------------
  const registerColumns = useMemo<Array<ColumnDef<SubmissionRow, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Submission ref',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>
        ),
      },
      {
        id: 'institution',
        accessorFn: (r) => r.institutionName,
        header: 'Institution',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.institutionName}</p>
            <p className="text-[10px] text-ink-secondary">{row.original.institutionCode}</p>
          </div>
        ),
      },
      {
        id: 'returnType',
        accessorFn: (r) => `${r.returnCode} ${r.returnName}`,
        header: 'Return type',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[11px] font-semibold text-ink">{row.original.returnCode}</p>
            <p className="line-clamp-1 max-w-52 text-[10px] text-ink-secondary">{row.original.returnName}</p>
          </div>
        ),
      },
      { accessorKey: 'period', header: 'Reporting period' },
      {
        accessorKey: 'dueDate',
        header: 'Due date',
        cell: ({ row }) => {
          const overdue = row.original.status === 'Overdue'
          return (
            <span className={cx('text-xs', overdue && 'font-semibold text-error')}>
              {formatDate(row.original.dueDate)}
            </span>
          )
        },
      },
      {
        accessorKey: 'submittedAt',
        header: 'Submitted',
        cell: ({ row }) =>
          row.original.submittedAt ? (
            <span className="text-xs text-ink-secondary">{formatDate(row.original.submittedAt)}</span>
          ) : (
            <span className="text-xs text-ink-tertiary">—</span>
          ),
      },
      {
        accessorKey: 'version',
        header: 'Ver.',
        cell: ({ row }) => <span className="font-mono text-xs text-ink">v{row.original.version}</span>,
      },
      {
        accessorKey: 'validation',
        header: 'Validation',
        cell: ({ row }) => (
          <StatusBadge status={row.original.validation} tone={VALIDATION_TONES[row.original.validation]} />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
      {
        accessorKey: 'reviewStatus',
        header: 'Review status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.reviewStatus} tone={REVIEW_TONES[row.original.reviewStatus]} />
        ),
      },
    ],
    [],
  )

  // Compliance columns --------------------------------------------------------
  const complianceColumns = useMemo<Array<ColumnDef<InstitutionComplianceRow, unknown>>>(
    () => [
      {
        id: 'institution',
        accessorFn: (c) => c.institutionName,
        header: 'Institution',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.institutionName}</p>
            <p className="text-[10px] text-ink-secondary">{row.original.institutionCode}</p>
          </div>
        ),
      },
      { accessorKey: 'expected', header: 'Expected' },
      { accessorKey: 'received', header: 'Received' },
      { accessorKey: 'onTime', header: 'On time' },
      {
        accessorKey: 'late',
        header: 'Late',
        cell: ({ row }) => (
          <span className={cx('text-xs', row.original.late > 0 && 'font-semibold text-warning')}>
            {row.original.late}
          </span>
        ),
      },
      {
        accessorKey: 'rejected',
        header: 'Rejected',
        cell: ({ row }) => (
          <span className={cx('text-xs', row.original.rejected > 0 && 'font-semibold text-error')}>
            {row.original.rejected}
          </span>
        ),
      },
      {
        accessorKey: 'compliancePct',
        header: 'On-time compliance',
        cell: ({ row }) => (
          <div className="min-w-36">
            <ProgressBar
              value={row.original.compliancePct}
              showValue
              tone={row.original.compliancePct >= 80 ? 'success' : row.original.compliancePct >= 50 ? 'warning' : 'error'}
              label="demo"
            />
          </div>
        ),
      },
    ],
    [],
  )

  // Return type columns ---------------------------------------------------------
  const typeColumns = useMemo<Array<ColumnDef<ReturnTypeRow, unknown>>>(
    () => [
      {
        accessorKey: 'returnCode',
        header: 'Return',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[11px] font-semibold text-primary">{row.original.returnCode}</p>
            <p className="line-clamp-1 max-w-64 text-[10px] text-ink-secondary">{row.original.returnName}</p>
          </div>
        ),
      },
      { accessorKey: 'frequency', header: 'Frequency' },
      { accessorKey: 'expected', header: 'Expected' },
      { accessorKey: 'received', header: 'Received' },
      {
        accessorKey: 'passed',
        header: 'Passed',
        cell: ({ row }) => <span className="text-xs font-semibold text-success">{row.original.passed}</span>,
      },
      {
        accessorKey: 'warnings',
        header: 'Warnings',
        cell: ({ row }) => <span className="text-xs font-semibold text-warning">{row.original.warnings}</span>,
      },
      {
        accessorKey: 'errors',
        header: 'Errors',
        cell: ({ row }) => <span className="text-xs font-semibold text-error">{row.original.errors}</span>,
      },
      { accessorKey: 'awaitingReview', header: 'Awaiting review' },
    ],
    [],
  )

  // Validation exception columns --------------------------------------------------
  const exceptionColumns = useMemo<Array<ColumnDef<ValidationExceptionRow, unknown>>>(
    () => [
      {
        accessorKey: 'submissionReference',
        header: 'Submission',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] font-semibold text-primary">{row.original.submissionReference}</span>
        ),
      },
      { accessorKey: 'institutionName', header: 'Institution' },
      { accessorKey: 'returnCode', header: 'Return' },
      { accessorKey: 'period', header: 'Period' },
      {
        accessorKey: 'fieldLabel',
        header: 'Field / check',
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium text-ink">{row.original.fieldLabel}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.fieldCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <StatusBadge status={row.original.severity} tone={row.original.severity === 'Error' ? 'overdue' : 'fieldwork'} />
        ),
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: ({ row }) => <span className="line-clamp-2 max-w-80 text-xs text-ink-secondary">{row.original.message}</span>,
      },
    ],
    [],
  )

  // Full-page template designer (Spec §11.2) — same registered route,
  // deep-linkable via /app/returns?view=designer&template=<definitionId>.
  if (designerId) {
    return (
      <ReturnTemplateDesigner
        definitionId={designerId}
        onBack={() => {
          setDesignerId(null)
          setView('templates')
          setSearchParams({ view: 'templates' }, { replace: true })
        }}
      />
    )
  }

  const kpis = data?.kpis

  const calendarView = (
    <Card>
      <CardHeader
        title="Submission calendar — ±30 days"
        subtitle="Due dates and receipt of the filtered register (demo schedule)."
      />
      <CardBody>
        {!data || data.calendar.length === 0 ? (
          <EmptyState
            title="Nothing scheduled in this window"
            description="No due dates or submissions for the current filters fall within ±30 days of today."
            icon={<CalendarDays className="h-7 w-7" />}
          />
        ) : (
          <ol className="flex flex-col gap-4">
            {data.calendar.map((day) => (
              <li key={day.date} className="flex gap-4">
                <div className="w-28 shrink-0 pt-0.5 text-right">
                  <p className="text-xs font-semibold text-ink">{formatDate(day.date)}</p>
                  <p className="text-[10px] text-ink-tertiary">{formatRelativeTime(day.date)}</p>
                </div>
                <div className="relative flex flex-col gap-2 border-l-2 border-line pl-4">
                  {day.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full cursor-pointer rounded-lg border border-line bg-card px-3 py-2 text-left shadow-sm transition-colors hover:bg-page"
                      onClick={() => navigate(`/app/returns/${item.id.replace(/-(due|sub)$/, '')}`)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.kind === 'due' ? 'Due' : 'Submitted'} tone={item.kind === 'due' ? 'planning' : 'active'} />
                        <span className="font-mono text-[10px] font-semibold text-primary">{item.reference}</span>
                        <span className="font-mono text-[10px] text-ink-secondary">{item.returnCode}</span>
                        <span className="text-[10px] text-ink-secondary">{item.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink">{item.institutionName}</p>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
      </CardBody>
    </Card>
  )

  return (
    <div>
      <PageHeader
        title={initialTitle ?? 'Regulatory Returns'}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Submission register, compliance and validation across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <Button
            variant="outline"
            iconLeft={<Download className="h-3.5 w-3.5" />}
            onClick={handleExport}
            disabled={view !== 'register'}
            title={view === 'register' ? undefined : 'Export is available on the submission register view'}
          >
            Export register
          </Button>
        }
      />

      {data === null || submissions === null ? (
        <LoadingSkeleton variant="cards" rows={6} />
      ) : (
        <>
          {/* KPI cards (Spec §11.1) — each filters the register */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Expected submissions" value={kpis!.expected} icon={Inbox} tone="blue" onClick={() => focusRegister({})} footer="Current demo cycle" />
            <StatCard label="Received" value={kpis!.received} icon={CircleCheck} tone="green" onClick={() => focusRegister({})} footer="Submitted on time or late" />
            <StatCard label="Pending" value={kpis!.pending} icon={CalendarClock} tone="yellow" onClick={() => focusRegister({ status: 'Due Soon' })} footer="Due soon" />
            <StatCard label="Late" value={kpis!.late} icon={Hourglass} tone="orange" onClick={() => focusRegister({ status: 'Overdue' })} footer="Past the demo deadline" />
            <StatCard label="Rejected / returned" value={kpis!.rejectedOrReturned} icon={CircleX} tone="red" onClick={() => focusRegister({ review: 'Rejected' })} footer="Correction required" />
            <StatCard label="Awaiting review" value={kpis!.awaitingReview} icon={ClipboardCheck} tone="purple" onClick={() => focusRegister({ review: 'Awaiting Review' })} footer="Supervisory review queue" />
          </div>

          <Tabs
            activeId={view}
            onChange={(id) => setView(id as ReturnsViewId)}
            items={[
              {
                id: 'register',
                label: 'Submission register',
                icon: <Inbox className="h-3.5 w-3.5" aria-hidden="true" />,
                count: rows.length,
                content: (
                  <DataTable<SubmissionRow>
                    columns={registerColumns}
                    data={rows}
                    title="Submission register"
                    headerAction={<span className="text-xs text-ink-secondary">{rows.length} submissions · demo data</span>}
                    getRowId={(r) => r.id}
                    onRowClick={(r) => navigate(`/app/returns/${r.id}`)}
                    initialPageSize={10}
                    emptyTitle="No submissions match"
                    emptyDescription="Adjust the filters — every demo submission links to a full detail screen."
                    onRetry={() => void load()}
                    toolbar={
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <TextInput
                          aria-label="Search submissions"
                          placeholder="Search reference, return or institution…"
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
                          aria-label="Filter by return type"
                          value={fReturnCode}
                          onChange={(e) => setFReturnCode(e.target.value)}
                          placeholder="All return types"
                          options={returnCodes.map((c) => ({ value: c, label: c }))}
                        />
                        <Select
                          aria-label="Filter by status"
                          value={fStatus}
                          onChange={(e) => setFStatus(e.target.value)}
                          placeholder="All statuses"
                          options={STATUSES.map((s) => ({ value: s, label: s }))}
                        />
                        <Select
                          aria-label="Filter by review status"
                          value={fReview}
                          onChange={(e) => setFReview(e.target.value)}
                          placeholder="All review statuses"
                          options={REVIEW_STATUSES.map((s) => ({ value: s, label: s }))}
                        />
                        <Select
                          aria-label="Filter by validation result"
                          value={fValidation}
                          onChange={(e) => setFValidation(e.target.value)}
                          placeholder="All validation results"
                          options={VALIDATIONS.map((s) => ({ value: s, label: s }))}
                        />
                      </div>
                    }
                  />
                ),
              },
              {
                id: 'calendar',
                label: 'Calendar',
                icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />,
                content: calendarView,
              },
              {
                id: 'compliance',
                label: 'Institution compliance',
                icon: <Building className="h-3.5 w-3.5" aria-hidden="true" />,
                content: (
                  <DataTable<InstitutionComplianceRow>
                    columns={complianceColumns}
                    data={data.compliance}
                    title="Institution compliance (current demo cycle)"
                    headerAction={<span className="text-xs text-ink-secondary">demo figures</span>}
                    getRowId={(r) => r.institutionId}
                    onRowClick={(r) => focusRegister({ institution: r.institutionId })}
                    emptyTitle="No compliance data"
                    emptyDescription="Submissions will be grouped per institution once demo data loads."
                    onRetry={() => void load()}
                  />
                ),
              },
              {
                id: 'types',
                label: 'Return type',
                icon: <Layers className="h-3.5 w-3.5" aria-hidden="true" />,
                content: (
                  <DataTable<ReturnTypeRow>
                    columns={typeColumns}
                    data={data.byType}
                    title="Submission status by return type"
                    headerAction={<span className="text-xs text-ink-secondary">demo figures</span>}
                    getRowId={(r) => r.returnCode}
                    onRowClick={(r) => focusRegister({ returnCode: r.returnCode })}
                    emptyTitle="No return types"
                    emptyDescription="Return types appear once submissions exist in the demo cycle."
                    onRetry={() => void load()}
                  />
                ),
              },
              {
                id: 'exceptions',
                label: 'Validation exceptions',
                icon: <TriangleExclamationPoint className="h-3.5 w-3.5" aria-hidden="true" />,
                count: data.validationExceptions.length,
                content: (
                  <DataTable<ValidationExceptionRow>
                    columns={exceptionColumns}
                    data={data.validationExceptions}
                    title="Open validation exceptions (demo rule engine)"
                    headerAction={<span className="text-xs text-ink-secondary">illustrative thresholds</span>}
                    getRowId={(r) => `${r.submissionId}-${r.fieldCode}`}
                    onRowClick={(r) => navigate(`/app/returns/${r.submissionId}`)}
                    emptyTitle="No validation exceptions"
                    emptyDescription="Every submitted demo return currently passes the illustrative rule engine."
                    onRetry={() => void load()}
                  />
                ),
              },
              {
                id: 'templates',
                label: 'Return definitions',
                icon: <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />,
                content: (
                  <ReturnDefinitionsView
                    onOpenDesigner={(id) => {
                      setDesignerId(id)
                      setSearchParams({ view: 'designer', template: id })
                    }}
                  />
                ),
              },
            ]}
          />
          <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
        </>
      )}
    </div>
  )
}
