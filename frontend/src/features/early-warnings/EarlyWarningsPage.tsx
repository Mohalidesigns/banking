import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Check,
  FileSearch,
  MessageSquarePlus,
  ScrollText,
  Send,
  Shield,
  UserPlus,
} from 'lucide-react'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { examinationService } from '@/services/mock/MockExaminationService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { earlyWarningService } from '@/services/mock/MockSurveillanceService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Examination } from '@/types/supervision'
import type { Institution } from '@/types/institution'
import type { AlertRow, EarlyWarningAlertDetail } from '@/types/surveillance'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Early Warning Alerts (Spec §6.4): register with all §6.4 columns plus the
 * full alert detail (trigger explanation, source return, historical trend,
 * rule version, related alerts, assessments, escalation history, linked
 * examination/action). Actions: acknowledge, assign, add assessment,
 * escalate, dismiss with reason, convert to supervisory action — all gated
 * by the `manage-alerts` demo action (Spec §19). Detail deep-link:
 * ?alert=<id> (used by the Command Centre drawer, notifications and the
 * surveillance screens). Every threshold is labelled illustrative demo.
 */

const SEVERITY_TONES: Record<string, StatusTone> = {
  critical: 'overdue',
  warning: 'fieldwork',
  info: 'planning',
}

const STATUS_TONES: Record<string, StatusTone> = {
  Open: 'fieldwork',
  Acknowledged: 'planning',
  Escalated: 'overdue',
  Resolved: 'completed',
  Dismissed: 'closed',
}

const ANALYSTS = ['Fatima Bello', 'Daniel Adeyemi', 'Zainab Lawal', 'Nkechi Balogun', 'Aisha Yusuf', 'Kwame Mensah', 'Chuka Eze', 'Hauwa Sadiq']

const DEMO_NOTE = 'All alert thresholds are configurable mock values, labelled illustrative until approved regulatory rules are loaded (Spec §6.4).'

export function EarlyWarningsPage() {
  const [searchParams] = useSearchParams()
  const alertParam = searchParams.get('alert')
  const referenceParam = searchParams.get('reference')

  if (alertParam) return <AlertDetailView alertId={alertParam} />
  if (referenceParam) return <AlertReferenceRedirect reference={referenceParam} />
  return <AlertRegisterView />
}

/**
 * Resolves ?reference=EWA-… deep links (e.g. from capital breach chips) to
 * the alert id and redirects into the detail view; unknown references land
 * on a designed empty state, never a dead end (Phase 3B cross-wiring).
 */
function AlertReferenceRedirect({ reference }: { reference: string }) {
  const [, setSearchParams] = useSearchParams()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const alert = await earlyWarningService.getByReference(reference)
      if (cancelled) return
      if (alert) setSearchParams({ alert: alert.id }, { replace: true })
      else setNotFound(true)
    })()
    return () => {
      cancelled = true
    }
  }, [reference, setSearchParams])

  if (notFound) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Alert not found"
            description={`No demo early-warning alert matches ${reference} — it may be from a previous prototype session.`}
            action={{ label: 'Back to alert register', onClick: () => setSearchParams({}, { replace: true }) }}
          />
        </CardBody>
      </Card>
    )
  }
  return <LoadingSkeleton variant="text" rows={8} />
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

function AlertRegisterView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')

  const [alerts, setAlerts] = useState<AlertRow[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [search, setSearch] = useState('')
  const [fInstitution, setFInstitution] = useState(searchParams.get('institutionId') ?? '')
  const [fSeverity, setFSeverity] = useState(searchParams.get('severity') ?? '')
  const [fStatus, setFStatus] = useState(searchParams.get('status') ?? '')
  const [fIndicator, setFIndicator] = useState('')

  const load = useCallback(async () => {
    const [list, instPage] = await Promise.all([
      earlyWarningService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setAlerts(list)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const indicators = useMemo(() => [...new Set((alerts ?? []).map((a) => a.indicator))], [alerts])

  const rows = useMemo(() => {
    if (!alerts) return []
    const s = search.trim().toLowerCase()
    return alerts
      .filter((a) => !fInstitution || a.institutionId === fInstitution)
      .filter((a) => !fSeverity || a.severity === fSeverity)
      .filter((a) => !fStatus || a.status === fStatus)
      .filter((a) => !fIndicator || a.indicator === fIndicator)
      .filter(
        (a) =>
          !s ||
          `${a.reference} ${a.indicator} ${a.institutionName} ${a.message}`.toLowerCase().includes(s),
      )
  }, [alerts, search, fInstitution, fSeverity, fStatus, fIndicator])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-early-warnings-demo.csv',
      ['Reference', 'Institution', 'Indicator', 'Observed', 'Threshold', 'Severity', 'Triggered', 'Assigned analyst', 'Status'],
      rows.map((a) => [a.reference, a.institutionName, a.indicator, a.currentValue, a.threshold, a.severity, a.triggeredAt, a.assignedToName ?? '—', a.status]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<AlertRow, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Alert ref',
        cell: ({ row }) => <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>,
      },
      {
        id: 'institution',
        accessorFn: (a) => a.institutionName,
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
            {row.original.institutionName}
          </button>
        ),
      },
      { accessorKey: 'indicator', header: 'Triggering indicator' },
      {
        accessorKey: 'currentValue',
        header: 'Observed value',
        cell: ({ row }) => (
          <span className={cx('font-mono text-xs font-semibold', row.original.severity === 'critical' ? 'text-error' : row.original.severity === 'warning' ? 'text-warning' : 'text-ink')}>
            {row.original.currentValue}
          </span>
        ),
      },
      {
        accessorKey: 'threshold',
        header: 'Configured threshold',
        cell: ({ row }) => <span className="font-mono text-[11px] text-ink-secondary">{row.original.threshold}</span>,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <StatusBadge status={row.original.severity} tone={SEVERITY_TONES[row.original.severity]} />,
      },
      {
        accessorKey: 'triggeredAt',
        header: 'Trigger date',
        cell: ({ row }) => (
          <span className="text-xs text-ink-secondary" title={formatDate(row.original.triggeredAt)}>
            {formatRelativeTime(row.original.triggeredAt)}
          </span>
        ),
      },
      {
        accessorKey: 'assignedToName',
        header: 'Assigned analyst',
        cell: ({ row }) =>
          row.original.assignedToName ? (
            <span className="text-xs text-ink">{row.original.assignedToName}</span>
          ) : (
            <span className="text-xs text-ink-tertiary">Unassigned</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
    ],
    [navigate],
  )

  return (
    <div>
      <PageHeader
        title="Early Warning Alerts"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Threshold and trend alerts across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" iconLeft={<Shield className="h-3.5 w-3.5" />} onClick={() => navigate('/app/surveillance')}>
              Off-Site Surveillance
            </Button>
            <Button variant="outline" iconLeft={<Send className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export alerts
            </Button>
          </>
        }
      />

      <DataTable<AlertRow>
        columns={columns}
        data={rows}
        state={alerts === null ? 'loading' : 'ready'}
        title="Alert register"
        headerAction={<span className="text-xs text-ink-secondary">{rows.length} alerts · demo data</span>}
        getRowId={(a) => a.id}
        onRowClick={(a) => setSearchParams({ alert: a.id })}
        emptyTitle="No alerts match"
        emptyDescription="Adjust the filters — the demo queue clears when every alert is resolved or dismissed."
        onRetry={() => void load()}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <TextInput
              aria-label="Search alerts"
              placeholder="Search reference, indicator or message…"
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
              aria-label="Filter by indicator"
              value={fIndicator}
              onChange={(e) => setFIndicator(e.target.value)}
              placeholder="All indicators"
              options={indicators.map((i) => ({ value: i, label: i }))}
            />
            <Select
              aria-label="Filter by severity"
              value={fSeverity}
              onChange={(e) => setFSeverity(e.target.value)}
              placeholder="All severities"
              options={['critical', 'warning', 'info'].map((s) => ({ value: s, label: s }))}
            />
            <Select
              aria-label="Filter by status"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              placeholder="All statuses"
              options={['Open', 'Acknowledged', 'Escalated', 'Resolved', 'Dismissed'].map((s) => ({ value: s, label: s }))}
            />
          </div>
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alert detail (Spec §6.4)
// ---------------------------------------------------------------------------

type ModalKind = 'assign' | 'escalate' | 'dismiss' | 'convert' | null

function AlertDetailView({ alertId }: { alertId: string }) {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-alerts')

  const [alert, setAlert] = useState<EarlyWarningAlertDetail | null | undefined>(undefined)
  const [related, setRelated] = useState<AlertRow[]>([])
  const [exams, setExams] = useState<Examination[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [modal, setModal] = useState<ModalKind>(null)
  const [busy, setBusy] = useState(false)
  const [assessment, setAssessment] = useState('')
  const [analyst, setAnalyst] = useState('')
  const [noteText, setNoteText] = useState('')
  const [linkExamId, setLinkExamId] = useState('')

  const load = useCallback(async () => {
    const [a, all, examList, instPage] = await Promise.all([
      earlyWarningService.getById(alertId),
      earlyWarningService.list({}),
      examinationService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setAlert(a ?? null)
    setInstitutions(instPage.items)
    setExams(examList)
    if (a) setRelated(all.filter((r) => (a.relatedAlertRefs ?? []).includes(r.reference)))
  }, [alertId])

  useEffect(() => {
    void load()
  }, [load])

  const institution = useMemo(
    () => institutions.find((i) => i.id === alert?.institutionId),
    [institutions, alert],
  )

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const run = async (fn: () => Promise<EarlyWarningAlertDetail | undefined>, successMsg: string, close?: ModalKind) => {
    setBusy(true)
    try {
      const updated = await fn()
      if (updated) {
        setAlert(updated)
        if (close !== undefined) setModal(close)
        setNoteText('')
        toast.success('Demo action completed', `${successMsg} — saved in prototype session.`)
      } else {
        toast.warning('No change', 'The alert is not in a state that allows this demo action.')
      }
    } catch (err) {
      guard(err, 'The alert action could not be completed in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  if (alert === undefined) return <LoadingSkeleton variant="text" rows={12} />
  if (alert === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Alert not found"
            description="This demo alert id does not exist in the prototype dataset."
            action={{ label: 'Back to Early Warning Alerts', onClick: () => setSearchParams({}) }}
          />
        </CardBody>
      </Card>
    )
  }

  const a = alert
  const closed = a.status === 'Resolved' || a.status === 'Dismissed'
  const trendData = a.historicalTrend.map((t) => ({ periodLabel: t.periodLabel, value: Number(t.value) }))
  const latestTrend = trendData[trendData.length - 1]
  const gateTitle = canManage ? undefined : 'Requires the manage-alerts demo action (Spec §19)'

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl text-primary">{a.reference}</span>
            <StatusBadge status={a.severity} tone={SEVERITY_TONES[a.severity]} />
            <StatusBadge status={a.status} tone={STATUS_TONES[a.status]} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{a.indicator}</span>
            <span>·</span>
            <button
              type="button"
              className="cursor-pointer font-medium text-primary-surface hover:underline"
              onClick={() => navigate(`/app/institutions/${a.institutionId}`)}
            >
              {institution?.tradingName ?? 'Institution'}
            </button>
            <span>·</span>
            <span>triggered {formatDate(a.triggeredAt)} ({formatRelativeTime(a.triggeredAt)})</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Early Warning Alerts', path: '/app/early-warnings' }, { label: a.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setSearchParams({})}>
              Alert register
            </Button>
            <Button variant="outline" iconLeft={<Shield className="h-3.5 w-3.5" />} onClick={() => navigate(`/app/surveillance?institution=${a.institutionId}`)}>
              Institution surveillance
            </Button>
            {a.status === 'Open' && (
              <Button variant="outline" iconLeft={<Check className="h-3.5 w-3.5" />} disabled={!canManage || busy} title={gateTitle} onClick={() => void run(() => earlyWarningService.acknowledge(a.id, actor), `${a.reference} acknowledged`)}>
                Acknowledge
              </Button>
            )}
            {!closed && (
              <>
                <Button variant="outline" iconLeft={<UserPlus className="h-3.5 w-3.5" />} disabled={!canManage || busy} title={gateTitle} onClick={() => { setAnalyst(a.assignedToName ?? ''); setModal('assign') }}>
                  Assign
                </Button>
                <Button variant="warning" iconLeft={<ArrowUpRight className="h-3.5 w-3.5" />} disabled={!canManage || busy} title={gateTitle} onClick={() => { setNoteText(''); setModal('escalate') }}>
                  Escalate
                </Button>
                <Button variant="outline" iconLeft={<Ban className="h-3.5 w-3.5" />} disabled={!canManage || busy} title={gateTitle} onClick={() => { setNoteText(''); setModal('dismiss') }}>
                  Dismiss
                </Button>
                <Button variant="primary" iconLeft={<Send className="h-4 w-4" />} disabled={!canManage || busy} title={gateTitle} onClick={() => { setLinkExamId(''); setModal('convert') }}>
                  Convert to action
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Trigger + values */}
          <Card>
            <CardHeader title="Trigger explanation" subtitle={`Rule ${a.ruleCode} · version ${a.ruleVersion}`} />
            <CardBody>
              <p className="text-xs leading-relaxed text-ink">{a.triggerExplanation}</p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-page px-3 py-2.5">
                  <p className="overline">Observed value</p>
                  <p className={cx('mt-1 font-mono text-xl font-bold', a.severity === 'critical' ? 'text-error' : 'text-warning')}>{a.currentValue}</p>
                </div>
                <div className="rounded-lg bg-page px-3 py-2.5">
                  <p className="overline">Configured threshold</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-ink">{a.threshold}</p>
                </div>
                <div className="rounded-lg bg-page px-3 py-2.5">
                  <p className="overline">Assigned analyst</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{a.assignedToName ?? 'Unassigned'}</p>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">{a.thresholdNote}</p>
              <p className="mt-3 text-xs leading-relaxed text-ink-secondary">{a.message}</p>
            </CardBody>
          </Card>

          {/* Historical trend */}
          <Card>
            <CardHeader title="Historical trend" subtitle="Indicator history behind the trigger (demo series)" />
            <CardBody>
              {trendData.length === 0 ? (
                <EmptyState title="No trend history" description="This demo alert carries no historical series." />
              ) : (
                <div
                  role="img"
                  aria-label={`${a.indicator} trend. Latest ${latestTrend?.periodLabel}: ${latestTrend?.value}. Illustrative demo figures.`}
                  className="h-52 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
                      <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} width={52} domain={['auto', 'auto']} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="value" name={a.indicator} stroke={a.severity === 'critical' ? CHART_COLORS.error : CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Analyst assessments */}
          <Card>
            <CardHeader title="Analyst assessments" subtitle="Supervisory analysis recorded against this alert (demo)" />
            <CardBody className="flex flex-col gap-3">
              {a.assessments.length === 0 ? (
                <EmptyState title="No assessments yet" description="Add the first analyst assessment of this alert." icon={<MessageSquarePlus className="h-7 w-7" />} />
              ) : (
                <ol className="flex flex-col gap-3">
                  {a.assessments.map((asm) => (
                    <li key={asm.id} className="rounded-lg border border-line px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-ink">{asm.authorName}</p>
                        <p className="text-[10px] text-ink-tertiary">{formatDate(asm.at)} · {formatRelativeTime(asm.at)}</p>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{asm.text}</p>
                    </li>
                  ))}
                </ol>
              )}
              <div className="border-t border-line pt-3">
                <TextArea
                  label="Add assessment"
                  rows={3}
                  value={assessment}
                  disabled={!canManage || closed}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder={canManage ? 'Record the off-site analysis, e.g. drivers of the breach and recommended response…' : gateTitle ?? ''}
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  iconLeft={<MessageSquarePlus className="h-3.5 w-3.5" />}
                  disabled={!canManage || closed || busy || !assessment.trim()}
                  onClick={() =>
                    void run(async () => {
                      const updated = await earlyWarningService.addAssessment(a.id, assessment.trim(), actor)
                      setAssessment('')
                      return updated
                    }, 'Assessment added')
                  }
                >
                  Save assessment
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* Source return */}
          <Card>
            <CardHeader title="Underlying source return" subtitle="Return and period that triggered the rule" />
            <CardBody>
              {a.sourceReturn ? (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-page"
                  onClick={() => navigate(`/app/returns/${a.sourceReturn!.submissionId}`)}
                >
                  <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                    <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.sourceReturn.returnCode} · {a.sourceReturn.period}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-secondary">Open the submission detail — data, validation results and review trail →</p>
                </button>
              ) : (
                <p className="text-xs text-ink-secondary">No source return recorded — this alert was raised from the demo surveillance series.</p>
              )}
            </CardBody>
          </Card>

          {/* Linked examination / action */}
          <Card>
            <CardHeader title="Linked supervisory action" subtitle="Examination or action converted from this alert" />
            <CardBody className="flex flex-col gap-2">
              {a.linkedExamination && (
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-page"
                  onClick={() => navigate(`/app/examinations/${a.linkedExamination!.id}`)}
                >
                  <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                    <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.linkedExamination.reference}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-secondary">Targeted examination · {a.linkedExamination.status}</p>
                </button>
              )}
              {a.linkedAction && (
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-page"
                  onClick={() => navigate(a.linkedAction!.link)}
                >
                  <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.linkedAction.reference}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-secondary">{a.linkedAction.type}</p>
                </button>
              )}
              {!a.linkedExamination && !a.linkedAction && (
                <p className="text-xs text-ink-secondary">
                  No linked action yet — use <span className="font-medium text-ink">Convert to action</span> to initiate a
                  targeted examination or link an existing supervisory action (Journey B step 7).
                </p>
              )}
            </CardBody>
          </Card>

          {/* Related alerts */}
          <Card>
            <CardHeader title="Related alerts" subtitle="Other alerts referenced by this trigger" />
            <CardBody>
              {related.length === 0 ? (
                <p className="text-xs text-ink-secondary">No related alerts in the demo dataset.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {related.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full cursor-pointer rounded-lg border border-line px-3 py-2 text-left hover:bg-page"
                        onClick={() => setSearchParams({ alert: r.id })}
                      >
                        <span className="font-mono text-[10px] font-semibold text-primary">{r.reference}</span>
                        <p className="text-xs text-ink">{r.indicator} · {r.institutionName}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Escalation history */}
          <Card>
            <CardHeader title="Escalation history" subtitle="Full workflow trail for this alert (demo)" />
            <CardBody>
              <ol className="flex flex-col gap-3">
                {[...a.escalationHistory].reverse().map((e) => (
                  <li key={e.id} className="relative border-l-2 border-line pl-4">
                    <span aria-hidden="true" className={cx('absolute top-1 -left-[5px] h-2 w-2 rounded-full', e.action === 'Escalated' || e.action === 'Converted to supervisory action' ? 'bg-error' : e.action === 'Raised' ? 'bg-accent' : 'bg-line')} />
                    <p className="text-xs font-semibold text-ink">{e.action}</p>
                    <p className="text-[10px] text-ink-tertiary">{formatDate(e.at)} · {e.byName}</p>
                    {e.note && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{e.note}</p>}
                  </li>
                ))}
              </ol>
              {a.dismissedReason && (
                <p className="mt-3 rounded-lg bg-tint-red px-3 py-2 text-[11px] text-error">Dismissal reason: {a.dismissedReason}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Assign modal */}
      <Modal open={modal === 'assign'} onClose={() => setModal(null)} title="Assign analyst (demo)" size="md">
        <div className="flex flex-col gap-3">
          <Select
            label="Analyst"
            required
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            placeholder="Select a demo analyst…"
            options={ANALYSTS.map((name) => ({ value: name, label: name }))}
            help="Fictional supervisors from the demo dataset — the alert is assigned in this prototype session."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!analyst}
              onClick={() => void run(() => earlyWarningService.assign(a.id, analyst, actor), `${a.reference} assigned to ${analyst}`, null)}
            >
              Assign analyst
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escalate modal */}
      <Modal open={modal === 'escalate'} onClose={() => setModal(null)} title="Escalate alert (demo)" size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Escalation note"
            required
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Why is this alert being escalated, and to whom?"
          />
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Escalation is recorded in the alert history and the institution's supervisory decision trail —
            saved in prototype session only.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="warning" loading={busy} disabled={!noteText.trim()} onClick={() => void run(() => earlyWarningService.escalate(a.id, noteText.trim(), actor), `${a.reference} escalated`, null)}>
              Escalate alert
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dismiss modal */}
      <Modal open={modal === 'dismiss'} onClose={() => setModal(null)} title="Dismiss alert (demo)" size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Dismissal reason"
            required
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Reason is mandatory and recorded on the alert (Spec §6.4)…"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} disabled={!noteText.trim()} onClick={() => void run(() => earlyWarningService.dismiss(a.id, noteText.trim(), actor), `${a.reference} dismissed`, null)}>
              Dismiss alert
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert to supervisory action modal */}
      <Modal open={modal === 'convert'} onClose={() => setModal(null)} title="Convert to supervisory action (demo)" size="lg">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-line px-3 py-2.5">
            <p className="text-xs font-semibold text-ink">1 · Initiate a targeted examination</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
              Opens the create-examination wizard prefilled with this institution, type Targeted and alert
              reference {a.reference} (Spec §6.4 → §7.2, Journey B step 7).
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              iconLeft={<Send className="h-3.5 w-3.5" />}
              onClick={() =>
                navigate(
                  `/app/examinations/new?institutionId=${encodeURIComponent(a.institutionId)}&type=Targeted&alertRef=${encodeURIComponent(a.reference)}`,
                )
              }
            >
              Open create-examination wizard
            </Button>
          </div>
          <div className="rounded-lg border border-line px-3 py-2.5">
            <p className="text-xs font-semibold text-ink">2 · Link an existing examination</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
              Attach an examination already covering this institution; the alert history records the conversion.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1">
                <Select
                  label="Examination"
                  value={linkExamId}
                  onChange={(e) => setLinkExamId(e.target.value)}
                  placeholder="Select an examination…"
                  options={exams
                    .filter((x) => x.institutionId === a.institutionId)
                    .map((x) => ({ value: x.id, label: `${x.reference} — ${x.type} (${x.status})` }))}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!linkExamId || busy}
                loading={busy}
                onClick={() => {
                  const exam = exams.find((x) => x.id === linkExamId)
                  if (!exam) return
                  void run(
                    () => earlyWarningService.linkExamination(a.id, { reference: exam.reference, id: exam.id, status: exam.status }, actor),
                    `${exam.reference} linked to ${a.reference}`,
                    null,
                  )
                }}
              >
                Link examination
              </Button>
            </div>
            {exams.filter((x) => x.institutionId === a.institutionId).length === 0 && (
              <p className="mt-1 text-[10px] text-ink-tertiary">No examinations exist for this institution in the demo dataset.</p>
            )}
          </div>
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Demo workflow — no real examination, enforcement or supervisory action is initiated. Conversions are
            saved in this prototype session and appear in the escalation history and decision trail.
          </p>
        </div>
      </Modal>
    </div>
  )
}
