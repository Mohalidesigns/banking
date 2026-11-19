import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  CalendarClock,
  Download,
  Pencil,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Users,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { ComplianceBadge, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { RelationChip } from '@/features/regulatory/RelationChip'
import { useActor } from '@/hooks/useActor'
import { DemoPermissionError } from '@/services/contracts/errors'
import { frameworkService, obligationService } from '@/services/mock/MockRegulatoryService'
import type { ComplianceState } from '@/components/ui/Badges'
import type {
  ObligationDetail,
  ObligationRow,
  RegulatoryFramework,
} from '@/types/regulatory'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Regulatory Obligations (Spec §10.2) — `/app/regulatory/obligations`.
 * Obligation register with every §10.2 column (applicable institutions,
 * responsible department, effective date, reporting frequency, evidence/
 * return requirement, compliance status, last/next review) plus obligation
 * detail with per-institution compliance, the applicability editor and the
 * change history. Obligations reference the §10.1 frameworks/requirements
 * and anchor the live story (Vanguard MPR-09 ↔ ENF-2026-002, Meridian STR
 * ↔ CAP-2026-003, Northstar MPR-04 ↔ EWA-2026-011 …). Mutations are gated
 * by `manage-obligations` (Spec §19) and refused for institution roles.
 */

const DEMO_NOTE =
  'All obligations, deadlines and compliance statuses are fictional demo data — not real regulatory determinations.'

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Event-Driven', 'Continuous']
const COMPLIANCE_STATES: ComplianceState[] = ['Compliant', 'Partial', 'Non-Compliant', 'Not Assessed']

/** Worst-case compliance across a set of institution statuses (register rollup). */
const WORST_RANK: Record<ComplianceState, number> = {
  'Non-Compliant': 0,
  Partial: 1,
  'Not Assessed': 2,
  Compliant: 3,
}
const worstStatus = (states: ComplianceState[]): ComplianceState =>
  states.reduce((worst, s) => (WORST_RANK[s] < WORST_RANK[worst] ? s : worst), 'Compliant' as ComplianceState)

export function RegulatoryObligationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const obligationParam = searchParams.get('obligation')

  return obligationParam ? (
    <ObligationDetailView
      referenceOrId={obligationParam}
      onBack={() => setSearchParams({}, { replace: true })}
    />
  ) : (
    <RegisterView />
  )
}

// ---------------------------------------------------------------------------
// Obligation register (list)
// ---------------------------------------------------------------------------

function RegisterView() {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')

  const [rows, setRows] = useState<ObligationRow[] | null>(null)
  const [frameworks, setFrameworks] = useState<RegulatoryFramework[]>([])
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const [fFramework, setFFramework] = useState('')
  const [fDepartment, setFDepartment] = useState('')
  const [fFrequency, setFFrequency] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fInstitution, setFInstitution] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const [obligationRows, fwList] = await Promise.all([
      obligationService.list({}),
      frameworkService.list({}),
    ])
    const instNames = new Map<string, string>()
    for (const o of obligationRows) {
      o.applicableInstitutionIds.forEach((id, idx) => instNames.set(id, o.institutionNames[idx] ?? id))
    }
    setRows(obligationRows)
    setFrameworks(fwList)
    setInstitutions([...instNames.entries()].map(([id, name]) => ({ id, name })))
    setBusy(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const departments = useMemo(
    () => [...new Set((rows ?? []).map((o) => o.responsibleDepartment))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    if (!rows) return []
    const s = search.trim().toLowerCase()
    return rows
      .filter((o) => !fFramework || o.frameworkId === fFramework)
      .filter((o) => !fDepartment || o.responsibleDepartment === fDepartment)
      .filter((o) => !fFrequency || o.frequency === fFrequency)
      .filter((o) => !fStatus || o.overallStatus === fStatus)
      .filter((o) => !fInstitution || o.applicableInstitutionIds.includes(fInstitution))
      .filter(
        (o) =>
          !s ||
          `${o.reference} ${o.title} ${o.description} ${o.evidenceRequirement} ${o.returnCode ?? ''}`
            .toLowerCase()
            .includes(s),
      )
  }, [rows, search, fFramework, fDepartment, fFrequency, fStatus, fInstitution])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-obligation-register-demo.csv',
      ['Reference', 'Title', 'Framework', 'Department', 'Frequency', 'Evidence requirement', 'Overall status', 'Last review', 'Next review', 'Institutions'],
      filtered.map((o) => [
        o.reference, o.title, o.frameworkCode, o.responsibleDepartment, o.frequency,
        o.evidenceRequirement, o.overallStatus, o.lastReviewDate, o.nextReviewDate,
        o.institutionNames.join('; '),
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const openDetail = (ref: string) => navigate(`/app/regulatory/obligations?obligation=${encodeURIComponent(ref)}`)

  const columns = useMemo<Array<ColumnDef<ObligationRow, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Obligation',
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
              onClick={() => openDetail(row.original.reference)}
            >
              {row.original.reference}
            </button>
            <p className="max-w-[300px] text-[12px] font-medium text-ink">{row.original.title}</p>
          </div>
        ),
      },
      {
        accessorKey: 'frameworkCode',
        header: 'Framework',
        cell: ({ row }) => (
          <button
            type="button"
            title={`${row.original.frameworkName} — open the framework detail (§10.1)`}
            className="cursor-pointer rounded-full bg-tint-blue px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:underline"
            onClick={() => navigate(`/app/regulatory/frameworks?framework=${encodeURIComponent(row.original.frameworkCode)}`)}
          >
            {row.original.frameworkCode}
          </button>
        ),
      },
      {
        id: 'institutions',
        header: 'Applicable institutions',
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <p className="truncate text-[11px] text-ink">{row.original.institutionNames.slice(0, 2).join(', ')}</p>
            <p className="text-[10px] text-ink-tertiary">
              {row.original.applicableInstitutionIds.length} institution{row.original.applicableInstitutionIds.length === 1 ? '' : 's'} in scope
            </p>
          </div>
        ),
      },
      { accessorKey: 'responsibleDepartment', header: 'Department', cell: ({ row }) => <span className="text-[11px] text-ink-secondary">{row.original.responsibleDepartment}</span> },
      {
        accessorKey: 'effectiveFrom',
        header: 'Effective',
        cell: ({ row }) => <span className="text-[11px]">{formatDate(row.original.effectiveFrom)}</span>,
      },
      { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-[11px]">{row.original.frequency}</span> },
      {
        id: 'evidence',
        header: 'Evidence / return',
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <p className="truncate text-[11px] text-ink-secondary">{row.original.evidenceRequirement}</p>
            {row.original.returnCode && (
              <button
                type="button"
                title={`Open the returns register filtered to ${row.original.returnCode}`}
                className="mt-0.5 cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                onClick={() => navigate(`/app/returns?returnCode=${encodeURIComponent(row.original.returnCode!)}`)}
              >
                {row.original.returnCode} →
              </button>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'overallStatus',
        header: 'Compliance',
        cell: ({ row }) => <ComplianceBadge state={row.original.overallStatus} />,
      },
      {
        accessorKey: 'nextReviewDate',
        header: 'Last / next review',
        cell: ({ row }) => (
          <div className="text-[11px]">
            <p className="text-ink-tertiary">last {formatDate(row.original.lastReviewDate)}</p>
            <p className="flex items-center gap-1.5">
              <span className={row.original.reviewOverdue ? 'font-semibold text-error' : 'text-ink'}>
                next {formatDate(row.original.nextReviewDate)}
              </span>
              {row.original.reviewOverdue && <StatusBadge status="Overdue" tone="overdue" />}
            </p>
          </div>
        ),
      },
    ],
    [navigate],
  )

  if (!rows) {
    return (
      <div>
        <PageHeader title="Regulatory Obligations" subtitle="Obligation register — loading demo data…" />
        <LoadingSkeleton variant="cards" rows={6} />
      </div>
    )
  }

  const overdueCount = rows.filter((o) => o.reviewOverdue).length
  const nonCompliantCount = rows.filter((o) => o.overallStatus === 'Non-Compliant').length

  return (
    <div>
      <PageHeader
        title="Regulatory Obligations"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Obligation register — {rows.length} demo obligations</span>
            {overdueCount > 0 && <StatusBadge status={`${overdueCount} review overdue`} tone="overdue" />}
            {nonCompliantCount > 0 && <StatusBadge status={`${nonCompliantCount} non-compliant`} tone="overdue" />}
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" iconLeft={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void load()} loading={busy}>
              Refresh
            </Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export register
            </Button>
          </>
        }
      />

      <DataTable<ObligationRow>
        columns={columns}
        data={filtered}
        title="Obligation register"
        getRowId={(o) => o.id}
        initialPageSize={10}
        onRowClick={(o) => openDetail(o.reference)}
        emptyTitle="No obligations match"
        emptyDescription="Adjust the filters — the demo register always ships the twelve core obligations."
        onRetry={() => void load()}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <TextInput
              aria-label="Search obligations"
              type="search"
              placeholder="Search reference, title or evidence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              aria-label="Filter by framework"
              value={fFramework}
              onChange={(e) => setFFramework(e.target.value)}
              placeholder="All frameworks"
              options={frameworks.map((f) => ({ value: f.id, label: f.code }))}
            />
            <Select
              aria-label="Filter by department"
              value={fDepartment}
              onChange={(e) => setFDepartment(e.target.value)}
              placeholder="All departments"
              options={departments.map((d) => ({ value: d, label: d }))}
            />
            <Select
              aria-label="Filter by frequency"
              value={fFrequency}
              onChange={(e) => setFFrequency(e.target.value)}
              placeholder="All frequencies"
              options={FREQUENCIES.map((f) => ({ value: f, label: f }))}
            />
            <Select
              aria-label="Filter by compliance status"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              placeholder="All statuses"
              options={COMPLIANCE_STATES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              aria-label="Filter by institution"
              value={fInstitution}
              onChange={(e) => setFInstitution(e.target.value)}
              placeholder="All institutions"
              options={institutions.map((i) => ({ value: i.id, label: i.name }))}
            />
          </div>
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Obligation detail (?obligation=<ref>)
// ---------------------------------------------------------------------------

function ObligationDetailView({ referenceOrId, onBack }: { referenceOrId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canManage = can(actor.actorRole, 'manage-obligations')

  const [detail, setDetail] = useState<ObligationDetail | null | undefined>(undefined)
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  // Applicability editor
  const [applicOpen, setApplicOpen] = useState(false)
  const [toAdd, setToAdd] = useState<string[]>([])
  const [toRemove, setToRemove] = useState<string[]>([])
  const [applicReason, setApplicReason] = useState('')
  const [applicError, setApplicError] = useState('')

  // Record review
  const [reviewOpen, setReviewOpen] = useState(false)
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState('')

  // Per-institution status update
  const [statusTarget, setStatusTarget] = useState<ObligationDetail['institutions'][number] | null>(null)
  const [newStatus, setNewStatus] = useState<ComplianceState>('Compliant')
  const [statusNote, setStatusNote] = useState('')
  const [statusError, setStatusError] = useState('')

  const load = useCallback(async () => {
    const d = await obligationService.detail(referenceOrId)
    setDetail(d ?? null)
    return d
  }, [referenceOrId])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const openApplicability = () => {
    if (!detail) return
    setToAdd([])
    setToRemove([])
    setApplicReason('')
    setApplicError('')
    setApplicOpen(true)
  }

  const saveApplicability = async () => {
    if (!detail) return
    if (toAdd.length === 0 && toRemove.length === 0) {
      setApplicError('Select at least one institution to add or remove (demo form).')
      return
    }
    if (!applicReason.trim()) {
      setApplicError('A reason is required — it becomes the change-history entry.')
      return
    }
    setBusy(true)
    try {
      const updated = await obligationService.updateApplicability(
        detail.obligation.id,
        { addInstitutionIds: toAdd, removeInstitutionIds: toRemove, reason: applicReason.trim() },
        actor,
      )
      if (updated) {
        setApplicOpen(false)
        await load()
        toast.success('Saved in prototype session', `Applicability updated for ${updated.reference} — change recorded in the history.`)
      }
    } catch (err) {
      guard(err, 'The applicability could not be updated in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const saveReview = async () => {
    if (!detail) return
    if (!reviewNote.trim()) {
      setReviewError('A review note is required — it becomes the change-history entry.')
      return
    }
    setBusy(true)
    try {
      const updated = await obligationService.recordReview(
        detail.obligation.id,
        { nextReviewDate: nextReviewDate || undefined, note: reviewNote.trim() },
        actor,
      )
      if (updated) {
        setReviewOpen(false)
        await load()
        toast.success('Saved in prototype session', `${updated.obligation.reference} review recorded; next review ${formatDate(updated.obligation.nextReviewDate)}.`)
      }
    } catch (err) {
      guard(err, 'The review could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const saveStatus = async () => {
    if (!detail || !statusTarget) return
    if (!statusNote.trim()) {
      setStatusError('A verification note is required (demo form).')
      return
    }
    setBusy(true)
    try {
      const updated = await obligationService.setInstitutionStatus(
        detail.obligation.id,
        statusTarget.id,
        newStatus,
        statusNote.trim(),
        actor,
      )
      if (updated) {
        setDetail(updated)
        setStatusTarget(null)
        toast.success('Saved in prototype session', `${statusTarget.name} compliance set to ${newStatus} — change recorded in the history.`)
      }
    } catch (err) {
      guard(err, 'The compliance status could not be updated in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!detail) return
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      `atheris-reg-obligation-${detail.obligation.reference.toLowerCase()}-demo.csv`,
      ['Institution', 'Code', 'Compliance status', 'Last verified', 'Note'],
      detail.institutions.map((i) => [i.name, i.code, i.status.status, i.status.lastVerifiedAt ?? '', i.status.note ?? '']),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  if (detail === undefined) {
    return (
      <div>
        <PageHeader title="Regulatory Obligation" subtitle="Loading demo obligation…" breadcrumbs={[{ label: 'Regulatory Obligations', path: '/app/regulatory/obligations' }, { label: referenceOrId }]} />
        <LoadingSkeleton variant="text" rows={12} />
      </div>
    )
  }

  if (detail === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Obligation not found"
            description={`No demo obligation matches “${referenceOrId}” — it may be from a previous prototype session.`}
            icon={<ScrollText className="h-7 w-7" />}
            action={{ label: 'Back to register', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const o = detail.obligation

  const institutionColumns: Array<ColumnDef<ObligationDetail['institutions'][number], unknown>> = [
    {
      accessorKey: 'name',
      header: 'Institution',
      cell: ({ row }) => (
        <div>
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={() => navigate(`/app/institutions/${row.original.id}`)}
          >
            {row.original.name}
          </button>
          <p className="font-mono text-[10px] text-ink-secondary">{row.original.code} · {row.original.category}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Compliance status',
      cell: ({ row }) => <ComplianceBadge state={row.original.status.status} />,
    },
    {
      id: 'verified',
      header: 'Last verified',
      cell: ({ row }) => (
        <span className="text-[11px] text-ink-secondary">
          {row.original.status.lastVerifiedAt ? formatDate(row.original.status.lastVerifiedAt) : '—'}
        </span>
      ),
    },
    {
      id: 'note',
      header: 'Supervisory note & anchors',
      cell: ({ row }) => (
        <div className="max-w-[380px]">
          {row.original.status.note && <p className="text-[11px] leading-relaxed text-ink-secondary">{row.original.status.note}</p>}
          {row.original.status.anchors.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {row.original.status.anchors.map((a) => <RelationChip key={a.id} mapping={a} />)}
            </div>
          )}
          {!row.original.status.note && row.original.status.anchors.length === 0 && (
            <span className="text-[10px] text-ink-tertiary">No verification recorded yet (demo).</span>
          )}
        </div>
      ),
    },
  ]

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Obligation" subtitle={`${o.reference} · ${detail.frameworkCode}`} />
            <CardBody>
              <p className="text-xs leading-relaxed text-ink-secondary">{o.description}</p>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2">
                <div>
                  <dt className="overline text-ink-tertiary">Source framework</dt>
                  <dd className="mt-0.5">
                    <button
                      type="button"
                      className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
                      onClick={() => navigate(`/app/regulatory/frameworks?framework=${encodeURIComponent(detail.frameworkCode)}`)}
                    >
                      {detail.frameworkCode} →
                    </button>
                    <span className="ml-2 text-ink-secondary">{detail.frameworkName}</span>
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Responsible department</dt>
                  <dd className="mt-0.5 text-ink">{o.responsibleDepartment}</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Source requirements (§10.1)</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {detail.requirements.length === 0 ? (
                      <span className="text-ink-tertiary">—</span>
                    ) : (
                      detail.requirements.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          title={`${r.title} — open the requirement in the framework detail`}
                          className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                          onClick={() =>
                            navigate(
                              `/app/regulatory/frameworks?framework=${encodeURIComponent(detail.frameworkCode)}&requirement=${encodeURIComponent(r.id)}`,
                            )
                          }
                        >
                          {r.reference} →
                        </button>
                      ))
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Reporting frequency</dt>
                  <dd className="mt-0.5 text-ink">{o.frequency} · effective {formatDate(o.effectiveFrom)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="overline text-ink-tertiary">Evidence / return requirement</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-ink">
                    <span>{o.evidenceRequirement}</span>
                    {o.returnCode && (
                      <button
                        type="button"
                        title={`Open the returns register filtered to ${o.returnCode}`}
                        className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                        onClick={() => navigate(`/app/returns?returnCode=${encodeURIComponent(o.returnCode!)}`)}
                      >
                        {o.returnCode} →
                      </button>
                    )}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Review cycle" subtitle={`Owner: ${o.reviewOwnerName}`} />
              <CardBody>
                <div className="flex flex-col gap-2 text-[12px]">
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Last review</span>
                    <span className="font-medium text-ink">{formatDate(o.lastReviewDate)}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Next review</span>
                    <span className="flex items-center gap-2">
                      <span className={o.nextReviewDate < new Date().toISOString().slice(0, 10) ? 'font-semibold text-error' : 'font-medium text-ink'}>
                        {formatDate(o.nextReviewDate)}
                      </span>
                      {o.nextReviewDate < new Date().toISOString().slice(0, 10) && <StatusBadge status="Overdue" tone="overdue" />}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Institutions in scope</span>
                    <span className="font-medium text-ink">{o.applicableInstitutionIds.length}</span>
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    iconLeft={<CalendarClock className="h-3.5 w-3.5" />}
                    disabled={!canManage}
                    title={canManage ? 'Record an obligation review (demo)' : 'Requires the manage-obligations demo action (Spec §19)'}
                    onClick={() => {
                      setNextReviewDate('')
                      setReviewNote('')
                      setReviewError('')
                      setReviewOpen(true)
                    }}
                  >
                    Record review
                  </Button>
                  <Button
                    variant="outline"
                    iconLeft={<Users className="h-3.5 w-3.5" />}
                    disabled={!canManage}
                    title={canManage ? 'Edit the applicable institutions (demo)' : 'Requires the manage-obligations demo action (Spec §19)'}
                    onClick={openApplicability}
                  >
                    Edit applicability
                  </Button>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Compliance summary" subtitle="Worst-case status across in-scope institutions" />
              <CardBody>
                <div className="flex flex-col gap-2">
                  {COMPLIANCE_STATES.map((state) => {
                    const count = detail.institutions.filter((i) => i.status.status === state).length
                    return (
                      <p key={state} className="flex items-center justify-between text-[12px]">
                        <ComplianceBadge state={state} />
                        <span className="font-semibold text-ink">{count}</span>
                      </p>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'institutions',
      label: 'Applicable institutions',
      icon: <Users className="h-3.5 w-3.5" />,
      count: detail.institutions.length,
      content: (
        <DataTable
          columns={institutionColumns}
          data={detail.institutions}
          title={`Per-institution compliance — ${o.reference}`}
          getRowId={(i) => i.id}
          initialPageSize={10}
          emptyTitle="No institutions in scope"
          emptyDescription="Use Edit applicability to bring demo institutions into scope."
          rowActions={
            canManage
              ? (row) => (
                  <Button
                    variant="ghost"
                    iconLeft={<Pencil className="h-3.5 w-3.5" />}
                    title={`Update the compliance status for ${row.name} (demo)`}
                    onClick={() => {
                      setStatusTarget(row)
                      setNewStatus(row.status.status)
                      setStatusNote(row.status.note ?? '')
                      setStatusError('')
                    }}
                  >
                    Update status
                  </Button>
                )
              : undefined
          }
        />
      ),
    },
    {
      id: 'history',
      label: 'Change history',
      icon: <RotateCcw className="h-3.5 w-3.5" />,
      count: o.changeHistory.length,
      content: (
        <Card>
          <CardHeader title="Change history" subtitle="Every applicability, review and status change recorded in the prototype session" />
          <CardBody>
            {o.changeHistory.length === 0 ? (
              <EmptyState title="No changes recorded" description="Applicability edits, reviews and status updates will appear here." icon={<RotateCcw className="h-7 w-7" />} />
            ) : (
              <ol className="flex flex-col gap-2.5">
                {[...o.changeHistory].reverse().map((h) => (
                  <li key={h.id} className="border-l-2 border-accent pl-3">
                    <p className="text-[12px] font-medium text-ink">{h.change}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{h.reason}</p>
                    <p className="mt-0.5 text-[10px] text-ink-tertiary">{formatDate(h.at)} · {h.byName}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{o.title}</span>
            <span className="font-mono text-sm text-ink-secondary">({o.reference})</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{detail.frameworkCode}</span>
            <span>·</span>
            <span>{o.responsibleDepartment}</span>
            <span>·</span>
            <span>{o.frequency}</span>
            <ComplianceBadge
              state={
                detail.institutions.length === 0
                  ? 'Not Assessed'
                  : worstStatus(detail.institutions.map((i) => i.status.status))
              }
            />
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Regulatory Obligations', path: '/app/regulatory/obligations' }, { label: o.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>Register</Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export compliance
            </Button>
          </>
        }
      />

      <Tabs items={tabs} activeId={tab} onChange={setTab} />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Applicability editor (Spec §10.2) */}
      <Modal
        open={applicOpen}
        onClose={() => setApplicOpen(false)}
        title={`Edit applicability — ${o.reference}`}
        description="Add or remove demo institutions. Every change is recorded in the obligation's change history. Saved in the prototype session only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplicOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveApplicability()}>Save applicability</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="overline text-ink-tertiary">In scope ({detail.institutions.length})</h3>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {detail.institutions.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-md bg-page px-2.5 py-1.5">
                  <span className="text-[12px] text-ink">
                    {i.name} <span className="font-mono text-[10px] text-ink-tertiary">{i.code}</span>
                  </span>
                  <Button
                    variant="ghost"
                    disabled={toRemove.includes(i.id)}
                    className={toRemove.includes(i.id) ? 'text-error line-through' : ''}
                    onClick={() => setToRemove((prev) => (prev.includes(i.id) ? prev.filter((x) => x !== i.id) : [...prev, i.id]))}
                  >
                    {toRemove.includes(i.id) ? 'Keep' : 'Remove'}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="overline text-ink-tertiary">Add institutions</h3>
            {detail.availableInstitutions.length === 0 ? (
              <p className="mt-1 text-[11px] text-ink-tertiary">Every demo institution is already in scope.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {detail.availableInstitutions.map((i) => {
                  const selected = toAdd.includes(i.id)
                  return (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={selected}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${selected ? 'bg-primary text-white' : 'bg-page text-ink-secondary hover:bg-tint-blue'}`}
                      onClick={() => setToAdd((prev) => (selected ? prev.filter((x) => x !== i.id) : [...prev, i.id]))}
                    >
                      {i.name} ({i.code})
                    </button>
                  )
                })}
              </div>
            )}
          </section>
          <TextArea
            label="Reason for change"
            required
            rows={2}
            value={applicReason}
            error={applicError}
            onChange={(e) => setApplicReason(e.target.value)}
            placeholder="Recorded in the change history (demo)…"
          />
        </div>
      </Modal>

      {/* Record review */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`Record review — ${o.reference}`}
        description="Updates the last/next review dates and records a change-history entry. Saved in the prototype session only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveReview()}>Record review</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextInput
            label="Next review date"
            type="date"
            help="Defaults to 90 days from today (demo cycle) when left empty."
            value={nextReviewDate}
            onChange={(e) => setNextReviewDate(e.target.value)}
          />
          <TextArea
            label="Review note"
            required
            rows={3}
            value={reviewNote}
            error={reviewError}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="What was reviewed and concluded (demo)…"
          />
        </div>
      </Modal>

      {/* Per-institution status update */}
      <Modal
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={`Update compliance — ${statusTarget?.name ?? ''}`}
        description={`Sets the ${o.reference} compliance status for this demo institution and records the change in the history.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveStatus()}>Save status</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Compliance status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ComplianceState)}
            options={COMPLIANCE_STATES.map((s) => ({ value: s, label: s }))}
          />
          <TextArea
            label="Verification note"
            required
            rows={3}
            value={statusNote}
            error={statusError}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Evidence assessed and conclusion (demo)…"
          />
        </div>
      </Modal>
    </div>
  )
}
