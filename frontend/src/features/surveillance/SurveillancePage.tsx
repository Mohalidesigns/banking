import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Activity,
  ArrowLeft,
  BellRing,
  Building,
  Eye,
  FileSearch,
  Gauge,
  Layers,
  MessageSquarePlus,
  Radar,
  ScrollText,
  Shield,
  TrendingDown,
  TriangleExclamationPoint,
} from 'lucide-react'
import { PrudentialTrendChart } from '@/components/charts/PrudentialTrendChart'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { surveillanceService } from '@/services/mock/MockSurveillanceService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  AnalystReview,
  CalculatedRatio,
  ExceptionRow,
  InstitutionSurveillanceDetail,
  PeerComparisonRow,
  SurveillanceOverview,
} from '@/types/surveillance'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Off-Site Surveillance (Spec §6.1): dashboard (KPIs, trend charts,
 * prudential exception table, watchlist, peer comparisons, alerts & analyst
 * notes) plus the institution surveillance detail (source data, calculated
 * ratios + definitions, trend, peer benchmark, threshold reference,
 * exceptions, analyst assessment, supervisory decision history). Detail is
 * reached via ?institution=<id> so the single registered route serves both.
 * Actions: open institution surveillance, create analyst review, escalate
 * alert, request clarification, initiate targeted examination. Demo data
 * only; thresholds are illustrative and labelled as such.
 */

const SEVERITY_TONES: Record<string, StatusTone> = {
  Red: 'overdue',
  Amber: 'fieldwork',
  critical: 'overdue',
  warning: 'fieldwork',
  info: 'planning',
}

const EXCEPTION_STATUS_TONES: Record<string, StatusTone> = {
  Open: 'overdue',
  Monitoring: 'fieldwork',
  Escalated: 'reporting',
  Cleared: 'completed',
}

const BREACH_TONES: Record<CalculatedRatio['breach'], StatusTone> = {
  none: 'completed',
  Amber: 'fieldwork',
  Red: 'overdue',
}

const DEMO_NOTE =
  'All ratios, thresholds and breaches are illustrative demo values — not approved regulatory rules.'

export function SurveillancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const institutionParam = searchParams.get('institution')

  return institutionParam ? (
    <InstitutionSurveillanceView
      institutionId={institutionParam}
      onBack={() => setSearchParams({}, { replace: true })}
    />
  ) : (
    <SurveillanceOverviewView />
  )
}

// ---------------------------------------------------------------------------
// Overview (dashboard)
// ---------------------------------------------------------------------------

function SurveillanceOverviewView() {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')

  const [overview, setOverview] = useState<SurveillanceOverview | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fInstitution, setFInstitution] = useState('')
  const [fIndicator, setFIndicator] = useState('')
  const [fSeverity, setFSeverity] = useState('')
  const [fAlertStatus, setFAlertStatus] = useState('')

  const load = useCallback(async () => {
    const [ov, instPage] = await Promise.all([
      surveillanceService.overview({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setOverview(ov)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const exceptions = useMemo(() => {
    if (!overview) return []
    return overview.exceptions
      .filter((e) => !fInstitution || e.institutionId === fInstitution)
      .filter((e) => !fIndicator || e.ratioCode === fIndicator)
      .filter((e) => !fSeverity || e.severity === fSeverity)
  }, [overview, fInstitution, fIndicator, fSeverity])

  const alertNotes = useMemo(() => {
    if (!overview) return []
    return overview.alertsAndNotes
      .filter((a) => !fInstitution || a.institutionId === fInstitution)
      .filter((a) => !fAlertStatus || a.status === fAlertStatus)
      .filter((a) => !fSeverity || (a.severity === 'critical' ? fSeverity === 'Red' : a.severity === 'warning' ? fSeverity === 'Amber' : true))
  }, [overview, fInstitution, fAlertStatus, fSeverity])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-surveillance-exceptions-demo.csv',
      ['Exception', 'Institution', 'Period', 'Ratio', 'Observed', 'Threshold', 'Severity', 'Status', 'Rule version'],
      exceptions.map((e) => [
        e.reference,
        e.institutionName,
        e.periodLabel,
        e.ratioName,
        e.observedValue,
        e.thresholdValue,
        e.severity,
        e.status,
        e.ruleVersion,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const exceptionColumns = useMemo<Array<ColumnDef<ExceptionRow, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Exception',
        cell: ({ row }) => <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>,
      },
      {
        id: 'institution',
        accessorFn: (e) => e.institutionName,
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
      { accessorKey: 'periodLabel', header: 'Period' },
      {
        accessorKey: 'ratioName',
        header: 'Ratio',
        cell: ({ row }) => (
          <div>
            <p className="text-xs text-ink">{row.original.ratioName}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.ratioCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'observedValue',
        header: 'Observed vs threshold',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            <span className={cx('font-semibold', row.original.severity === 'Red' ? 'text-error' : 'text-warning')}>
              {row.original.observedValue}
            </span>
            <span className="text-ink-tertiary"> / {row.original.thresholdValue}</span>
          </span>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <StatusBadge status={row.original.severity} tone={SEVERITY_TONES[row.original.severity]} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={EXCEPTION_STATUS_TONES[row.original.status]} />,
      },
      {
        accessorKey: 'detectedAt',
        header: 'Detected',
        cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatRelativeTime(row.original.detectedAt)}</span>,
      },
    ],
    [navigate],
  )

  if (!overview) {
    return (
      <div>
        <PageHeader title="Off-Site Surveillance" subtitle="Continuous review of institutional financial and prudential condition" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  const k = overview.kpis

  return (
    <div>
      <PageHeader
        title="Off-Site Surveillance"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Continuous review as of {formatDate(overview.reportingDate)}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <Button variant="outline" iconLeft={<Building className="h-3.5 w-3.5" />} onClick={() => navigate('/app/institutions')}>
            Institution registry
          </Button>
        }
      />

      {/* KPI cards (Spec §6.1 dashboard) */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Institutions monitored" value={k.institutionsMonitored} icon={Radar} tone="blue" onClick={() => navigate('/app/institutions')} footer="Full demo portfolio" />
        <StatCard label="Breaches detected" value={k.breachesDetected} icon={TriangleExclamationPoint} tone="red" onClick={() => setFSeverity('Red')} footer="Open prudential exceptions" />
        <StatCard label="New alerts" value={k.newAlerts} icon={BellRing} tone="orange" onClick={() => navigate('/app/early-warnings')} footer="Open early warnings" />
        <StatCard label="Returns awaiting validation" value={k.returnsAwaitingValidation} icon={FileSearch} tone="yellow" onClick={() => navigate('/app/returns?validation=Not Run')} footer="Demo rule engine queue" />
        <StatCard label="Deteriorating institutions" value={k.deterioratingInstitutions} icon={TrendingDown} tone="purple" footer="Trend vs prior period (demo)" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Surveillance overview — portfolio financial trends" subtitle="Averages across the demo portfolio, last 8 quarters" />
          <CardBody>
            <PrudentialTrendChart data={overview.trend} />
            <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Institution watchlist" subtitle="Escalated supervisory attention (demo)" />
          <CardBody>
            {overview.watchlist.length === 0 ? (
              <EmptyState title="Watchlist clear" description="No institutions are on the demo watchlist." />
            ) : (
              <ul className="flex flex-col gap-3">
                {overview.watchlist.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-page"
                      onClick={() => navigate(`/app/institutions/${w.institutionId}`)}
                      aria-label={`Open ${w.institutionName} — ${w.reason}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">{w.institutionName}</span>
                        <RiskBadge rating={w.severity} />
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{w.reason}</p>
                      <p className="mt-0.5 text-[10px] text-ink-tertiary">Added {formatDate(w.addedDate)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4">
        <DataTable<ExceptionRow>
          columns={exceptionColumns}
          data={exceptions}
          title="Prudential exception table"
          headerAction={
            <Button variant="outline" size="sm" iconLeft={<Shield className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export exceptions
            </Button>
          }
          getRowId={(e) => e.id}
          onRowClick={(e) => setSearchParams({ institution: e.institutionId })}
          emptyTitle="No prudential exceptions"
          emptyDescription="No demo threshold breaches match the current filters."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                options={['CAR', 'LCR', 'NPL', 'PC', 'ROA', 'DC'].map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by severity"
                value={fSeverity}
                onChange={(e) => setFSeverity(e.target.value)}
                placeholder="All severities"
                options={[{ value: 'Red', label: 'Red' }, { value: 'Amber', label: 'Amber' }]}
              />
              <Select
                aria-label="Filter alerts by status"
                value={fAlertStatus}
                onChange={(e) => setFAlertStatus(e.target.value)}
                placeholder="All alert statuses"
                options={['Open', 'Acknowledged', 'Escalated', 'Resolved', 'Dismissed'].map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Peer comparisons" subtitle="Latest capital adequacy across the demo portfolio (illustrative)" />
          <CardBody>
            <PeerComparisonTable rows={overview.peerComparisons} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alerts & analyst notes"
            subtitle="Latest early-warning activity"
            action={
              <button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:underline" onClick={() => navigate('/app/early-warnings')}>
                Open early warnings →
              </button>
            }
          />
          <CardBody>
            {alertNotes.length === 0 ? (
              <EmptyState title="No alerts match" description="Adjust the filters or open the early-warning register." icon={<BellRing className="h-7 w-7" />} />
            ) : (
              <ul className="flex flex-col gap-3">
                {alertNotes.map((a) => (
                  <li key={a.id} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.severity} tone={SEVERITY_TONES[a.severity]} />
                      <span className="text-xs font-semibold text-ink">{a.indicator}</span>
                      <StatusBadge status={a.status} tone={a.status === 'Escalated' ? 'overdue' : a.status === 'Open' ? 'fieldwork' : 'planning'} />
                      <span className="ml-auto text-[10px] text-ink-tertiary">{formatRelativeTime(a.triggeredAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink">{a.institutionName}</p>
                    {a.note && (
                      <p className="mt-1 border-l-2 border-accent pl-2 text-[11px] italic leading-relaxed text-ink-secondary">
                        “{a.note}” {a.noteBy ? <span className="not-italic text-ink-tertiary">— {a.noteBy}</span> : null}
                      </p>
                    )}
                    <button
                      type="button"
                      className="mt-1.5 cursor-pointer text-[11px] font-medium text-primary-surface hover:underline"
                      onClick={() => setSearchParams({ institution: a.institutionId })}
                    >
                      Open institution surveillance →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
    </div>
  )
}

function PeerComparisonTable({ rows }: { rows: PeerComparisonRow[] }) {
  if (rows.length === 0) return <EmptyState title="No peer data" description="Peer statistics appear once demo snapshots load." />
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
          <th scope="col" className="px-3 py-2">Institution</th>
          <th scope="col" className="px-3 py-2 text-right">Value</th>
          <th scope="col" className="px-3 py-2 text-right">Peer median</th>
          <th scope="col" className="px-3 py-2 text-right">Range</th>
          <th scope="col" className="px-3 py-2">Position</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.institutionId}-${r.category}`} className="border-t border-line-light">
            <td className="px-3 py-2">
              <p className="text-xs font-medium text-ink">{r.institutionName}</p>
              <p className="text-[10px] text-ink-secondary">{r.category}</p>
            </td>
            <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-ink">{r.value}</td>
            <td className="px-3 py-2 text-right font-mono text-xs text-ink-secondary">{r.peerMedian}</td>
            <td className="px-3 py-2 text-right font-mono text-[10px] text-ink-tertiary">{r.peerMin}–{r.peerMax}</td>
            <td className="px-3 py-2">
              <StatusBadge
                status={r.position}
                tone={r.position === 'Above median' ? 'active' : r.position === 'At median' ? 'planning' : 'fieldwork'}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Institution surveillance detail
// ---------------------------------------------------------------------------

function InstitutionSurveillanceView({ institutionId, onBack }: { institutionId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canReview = can(actor.actorRole, 'create-analyst-review')
  const canManageAlerts = can(actor.actorRole, 'manage-alerts')

  const [detail, setDetail] = useState<InstitutionSurveillanceDetail | null | undefined>(undefined)
  const [detailTab, setDetailTab] = useState('detail')
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({ periodLabel: '', trigger: '', assessment: '', recommendation: '' })
  const [reviewError, setReviewError] = useState('')
  const [clarifyText, setClarifyText] = useState('')

  const load = useCallback(async () => {
    const d = await surveillanceService.institutionDetail(institutionId)
    setDetail(d ?? null)
  }, [institutionId])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const createReview = async () => {
    const d = reviewDraft
    if (!d.periodLabel.trim() || !d.trigger.trim() || !d.assessment.trim()) {
      setReviewError('Reporting period, trigger and assessment are required (demo form).')
      return
    }
    setBusy(true)
    try {
      const created = await surveillanceService.createAnalystReview(
        {
          institutionId,
          periodLabel: d.periodLabel.trim(),
          trigger: d.trigger.trim(),
          assessment: d.assessment.trim(),
          recommendation: d.recommendation.trim() || 'Continue off-site monitoring (demo placeholder).',
        },
        actor,
      )
      setReviewsOpen(false)
      setReviewDraft({ periodLabel: '', trigger: '', assessment: '', recommendation: '' })
      setReviewError('')
      await load()
      toast.success('Saved in prototype session', `Analyst review ${created.reference} submitted for supervisory decision.`)
    } catch (err) {
      guard(err, 'The analyst review could not be created in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const requestClarification = async () => {
    if (!clarifyText.trim()) {
      toast.warning('Empty request', 'Describe what the institution must clarify (demo).')
      return
    }
    setBusy(true)
    try {
      await surveillanceService.recordDecision(institutionId, 'Clarification requested', clarifyText.trim(), actor)
      setClarifyOpen(false)
      setClarifyText('')
      await load()
      toast.success('Demo action completed', 'Clarification request recorded in the decision history — saved in prototype session.')
    } catch (err) {
      guard(err, 'The clarification request could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const recordDecisionOnReview = async (review: AnalystReview) => {
    setBusy(true)
    try {
      await surveillanceService.recordReviewDecision(
        review.id,
        'Recommendation accepted — supervisory follow-up scheduled',
        'Recorded from the institution surveillance screen (demo decision).',
        actor,
      )
      await load()
      toast.success('Demo action completed', `${review.reference} marked as actioned — saved in prototype session.`)
    } catch (err) {
      guard(err, 'The decision could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  if (detail === undefined) return <LoadingSkeleton variant="text" rows={12} />
  if (detail === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Institution not found"
            description="No demo institution matches this id — it may be from a previous prototype session."
            action={{ label: 'Back to surveillance overview', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const det = detail

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{det.institutionName}</span>
            <RiskBadge rating={det.riskRating} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{det.institutionCode}</span>
            <span>·</span>
            <span>{det.category}</span>
            <span>·</span>
            <span>Latest reviewed period: {det.periodLabel}</span>
            <span>·</span>
            <span>Lead supervisor: {det.leadSupervisorName}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Off-Site Surveillance', path: '/app/surveillance' }, { label: det.institutionName }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>
              Overview
            </Button>
            <Button variant="outline" iconLeft={<MessageSquarePlus className="h-3.5 w-3.5" />} disabled={!canManageAlerts} title={canManageAlerts ? undefined : 'Requires the manage-alerts demo action (Spec §19)'} onClick={() => setClarifyOpen(true)}>
              Request clarification
            </Button>
            <Button
              variant="outline"
              iconLeft={<FileSearch className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/app/examinations/new?institutionId=${encodeURIComponent(institutionId)}&type=Targeted`)}
              title="Opens the create-examination wizard prefilled (Journey B step 7)"
            >
              Initiate targeted examination
            </Button>
            <Button variant="primary" iconLeft={<ScrollText className="h-4 w-4" />} disabled={!canReview} title={canReview ? undefined : 'Requires the create-analyst-review demo action (Spec §19)'} onClick={() => setReviewsOpen(true)}>
              Create analyst review
            </Button>
          </>
        }
      />

      <Tabs
        activeId={detailTab}
        onChange={setDetailTab}
        items={[
          {
            id: 'detail',
            label: 'Surveillance detail',
            content: (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="flex flex-col gap-4 xl:col-span-2">
                  {/* Calculated ratios */}
                  <Card>
                    <CardHeader title="Calculated ratios & definitions" subtitle={`Demo values computed from the ${det.periodLabel} prudential submissions`} />
                    <CardBody>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {det.calculatedRatios.map((r) => (
                          <div key={r.code} className={cx('rounded-lg border px-3 py-2.5', r.breach === 'Red' ? 'border-error/40 bg-tint-red' : r.breach === 'Amber' ? 'border-warning/40 bg-tint-orange' : 'border-line bg-card')}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-ink">{r.name} <span className="font-mono text-[10px] text-ink-secondary">({r.code})</span></p>
                              <StatusBadge status={r.breach === 'none' ? 'Within thresholds' : `${r.breach} breach`} tone={BREACH_TONES[r.breach]} />
                            </div>
                            <p className="mt-1.5 font-mono text-xl font-bold text-primary">
                              {r.value}
                              <span className="text-xs text-ink-secondary">{r.unit}</span>
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-secondary">
                              {r.trendDirection === 'improving' && <Activity className="h-3 w-3 text-success" aria-hidden="true" />}
                              {r.trendDirection === 'deteriorating' && <TrendingDown className="h-3 w-3 text-error" aria-hidden="true" />}
                              {r.trendDirection === 'stable' && <Gauge className="h-3 w-3 text-ink-tertiary" aria-hidden="true" />}
                              {r.trendDirection} vs prior period {r.priorValue ? `(${r.priorValue}${r.unit})` : ''}
                            </p>
                            <p className="mt-1.5 text-[10px] leading-relaxed text-ink-secondary">{r.definition}</p>
                            {r.thresholdRule && (
                              <p className="mt-1 text-[10px] text-ink-tertiary">
                                {r.thresholdRule.version}: {r.thresholdRule.levels.map((l) => `${l.severity} ${l.operator} ${l.value}`).join(' · ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
                    </CardBody>
                  </Card>

                  {/* Trend */}
                  <Card>
                    <CardHeader title="Trend comparison" subtitle="Capital adequacy, NPL and liquidity ratios — last 8 quarters (demo series)" />
                    <CardBody>
                      <PrudentialTrendChart data={det.trend} />
                    </CardBody>
                  </Card>

                  {/* Source data */}
                  <Card>
                    <CardHeader title="Submitted source data" subtitle={`Figures as reported for ${det.periodLabel} via regulatory returns (demo)`} />
                    <CardBody>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                            <th scope="col" className="px-3 py-2">Measure</th>
                            <th scope="col" className="px-3 py-2 text-right">Value</th>
                            <th scope="col" className="px-3 py-2">Source return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {det.sourceData.map((row) => (
                            <tr key={row.label} className="border-t border-line-light">
                              <td className="px-3 py-2 text-xs text-ink">{row.label}</td>
                              <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-ink">{row.value}{row.unit ? <span className="ml-1 text-[10px] font-normal text-ink-secondary">{row.unit}</span> : null}</td>
                              <td className="px-3 py-2 font-mono text-[10px] text-ink-secondary">{row.sourceReturn ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardBody>
                  </Card>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Threshold configuration reference */}
                  <Card>
                    <CardHeader title="Threshold configuration reference" subtitle="Versioned rules applied to this institution (demo)" />
                    <CardBody>
                      <ul className="flex flex-col gap-2.5">
                        {det.thresholdRules.map((r) => (
                          <li key={r.id} className="rounded-lg border border-line px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] font-semibold text-primary">{r.version}</span>
                              <StatusBadge status={r.status} tone="draft" />
                            </div>
                            <p className="mt-1 text-[11px] text-ink">
                              {r.ratioCode}: {r.levels.map((l) => `${l.severity} ${l.operator} ${l.value}`).join(' · ')}
                            </p>
                            <p className="mt-0.5 text-[10px] text-ink-tertiary">Effective {formatDate(r.effectiveFrom)}</p>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
                        {det.thresholdRules[0]?.note ?? DEMO_NOTE}
                      </p>
                    </CardBody>
                  </Card>

                  {/* Peer benchmark */}
                  <Card>
                    <CardHeader title="Peer benchmark" subtitle="Latest values vs the demo peer group" />
                    <CardBody>
                      <PeerComparisonTable rows={det.peerBenchmark} />
                    </CardBody>
                  </Card>

                  {/* Alerts */}
                  <Card>
                    <CardHeader title="Early-warning alerts" subtitle="Alerts raised for this institution" />
                    <CardBody>
                      {det.alerts.length === 0 ? (
                        <EmptyState title="No alerts" description="No early-warning alerts in the demo dataset for this institution." icon={<BellRing className="h-7 w-7" />} />
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {det.alerts.map((a) => (
                            <li key={a.id}>
                              <button
                                type="button"
                                className="w-full cursor-pointer rounded-lg border border-line px-3 py-2 text-left transition-colors hover:bg-page"
                                onClick={() => navigate(`/app/early-warnings?alert=${a.id}`)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-semibold text-primary">{a.reference}</span>
                                  <StatusBadge status={a.severity} tone={SEVERITY_TONES[a.severity]} />
                                  <StatusBadge status={a.status} tone={a.status === 'Escalated' ? 'overdue' : 'planning'} />
                                </div>
                                <p className="mt-1 text-xs text-ink">{a.indicator}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: 'exceptions',
            label: 'Exceptions',
            count: det.exceptions.length,
            content: (
              <Card>
                <CardHeader title="Prudential exceptions" subtitle="Threshold breaches recorded for this institution (demo)" />
                <CardBody>
                  {det.exceptions.length === 0 ? (
                    <EmptyState title="No exceptions" description="No demo threshold breaches are recorded for this institution." icon={<Shield className="h-7 w-7" />} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {det.exceptions.map((e) => (
                        <li key={e.id} className={cx('rounded-lg border px-3 py-2.5', e.severity === 'Red' ? 'border-error/40 bg-tint-red' : 'border-warning/40 bg-tint-orange')}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-primary">{e.reference}</span>
                            <span className="text-xs font-medium text-ink">{e.ratioName} · {e.periodLabel}</span>
                            <StatusBadge status={e.severity} tone={SEVERITY_TONES[e.severity]} />
                            <StatusBadge status={e.status} tone={EXCEPTION_STATUS_TONES[e.status]} />
                            <span className="ml-auto font-mono text-xs font-semibold text-ink">{e.observedValue} <span className="text-[10px] font-normal text-ink-secondary">vs {e.thresholdValue}</span></span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{e.note}</p>
                          <p className="mt-1 text-[10px] text-ink-tertiary">
                            Rule {e.ruleVersion} · detected {formatRelativeTime(e.detectedAt)}
                            {e.relatedAlertRef ? ` · alert ${e.relatedAlertRef}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            ),
          },
          {
            id: 'assessment',
            label: 'Analyst assessment',
            count: det.analystReviews.length,
            content: (
              <Card>
                <CardHeader
                  title="Analyst reviews & assessments"
                  subtitle="Off-site reviews, recommendations and supervisory decisions (demo)"
                  action={
                    canReview ? (
                      <Button variant="primary" size="sm" iconLeft={<ScrollText className="h-3.5 w-3.5" />} onClick={() => setReviewsOpen(true)}>
                        New review
                      </Button>
                    ) : undefined
                  }
                />
                <CardBody>
                  {det.analystReviews.length === 0 ? (
                    <EmptyState
                      title="No analyst reviews"
                      description="Create the first off-site analyst review for this institution (demo workflow)."
                      icon={<Eye className="h-7 w-7" />}
                      action={canReview ? { label: 'Create analyst review', onClick: () => setReviewsOpen(true) } : undefined}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {det.analystReviews.map((r) => (
                        <article key={r.id} className="rounded-lg border border-line px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-primary">{r.reference}</span>
                            <span className="text-xs font-medium text-ink">{r.periodLabel}</span>
                            <StatusBadge status={r.status} tone={r.status === 'Actioned' ? 'completed' : r.status === 'Submitted' ? 'fieldwork' : 'draft'} />
                            <span className="ml-auto text-[10px] text-ink-tertiary">{r.analystName} · {formatDate(r.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-[11px] font-semibold text-ink-secondary">Trigger</p>
                          <p className="text-xs text-ink">{r.trigger}</p>
                          <p className="mt-2 text-[11px] font-semibold text-ink-secondary">Assessment</p>
                          <p className="text-xs leading-relaxed text-ink">{r.assessment}</p>
                          <p className="mt-2 text-[11px] font-semibold text-ink-secondary">Recommendation</p>
                          <p className="text-xs leading-relaxed text-ink">{r.recommendation}</p>
                          {r.decision ? (
                            <div className="mt-3 rounded-lg bg-tint-green px-3 py-2">
                              <p className="text-[11px] font-semibold text-success">Supervisory decision — {r.decision.decision}</p>
                              <p className="mt-0.5 text-[11px] text-ink-secondary">{r.decision.note}</p>
                              <p className="mt-0.5 text-[10px] text-ink-tertiary">{r.decision.byName} · {formatDate(r.decision.at)}</p>
                            </div>
                          ) : (
                            canManageAlerts && (
                              <div className="mt-3">
                                <Button variant="outline" size="sm" disabled={busy} onClick={() => void recordDecisionOnReview(r)}>
                                  Record supervisory decision (demo)
                                </Button>
                              </div>
                            )
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            ),
          },
          {
            id: 'decisions',
            label: 'Decision history',
            count: det.decisions.length,
            content: (
              <Card>
                <CardHeader title="Supervisory decision & action history" subtitle="Every recorded off-site supervisory action for this institution (demo)" />
                <CardBody>
                  {det.decisions.length === 0 ? (
                    <EmptyState title="No decisions recorded" description="Supervisory decisions will appear here as the demo workflow runs." icon={<Layers className="h-7 w-7" />} />
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {det.decisions.map((d) => (
                        <li key={d.id} className="relative border-l-2 border-line pl-4">
                          <span aria-hidden="true" className="absolute top-1 -left-[5px] h-2 w-2 rounded-full bg-accent" />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-ink">{d.action}</p>
                            <p className="text-[10px] text-ink-tertiary">{formatDate(d.at)} · {d.actorName}</p>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{d.detail}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardBody>
              </Card>
            ),
          },
        ]}
      />

      {/* Create analyst review modal */}
      <Modal open={reviewsOpen} onClose={() => setReviewsOpen(false)} title="Create analyst review (demo)" size="lg">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Reporting period"
              required
              value={reviewDraft.periodLabel}
              onChange={(e) => setReviewDraft({ ...reviewDraft, periodLabel: e.target.value })}
              placeholder={det.periodLabel}
            />
            <TextInput
              label="Trigger"
              required
              value={reviewDraft.trigger}
              onChange={(e) => setReviewDraft({ ...reviewDraft, trigger: e.target.value })}
              placeholder="e.g. EWA-2026-011 liquidity amber"
            />
          </div>
          <TextArea label="Assessment" required rows={4} value={reviewDraft.assessment} onChange={(e) => setReviewDraft({ ...reviewDraft, assessment: e.target.value })} placeholder="What the off-site analysis shows…" />
          <TextArea label="Recommendation" rows={3} value={reviewDraft.recommendation} onChange={(e) => setReviewDraft({ ...reviewDraft, recommendation: e.target.value })} placeholder="Recommended supervisory response…" />
          {reviewError && <p role="alert" className="rounded-lg bg-tint-red px-3 py-2 text-xs text-error">{reviewError}</p>}
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Saved in prototype session only — the review is submitted as {actor.actorName} and appears in the
            assessment trail immediately.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReviewsOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void createReview()}>Submit review</Button>
          </div>
        </div>
      </Modal>

      {/* Request clarification modal */}
      <Modal open={clarifyOpen} onClose={() => setClarifyOpen(false)} title="Request clarification (demo)" size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="What must the institution clarify?"
            required
            rows={4}
            value={clarifyText}
            onChange={(e) => setClarifyText(e.target.value)}
            placeholder="e.g. Explain the month-on-month HQLA decline in MPR-04 and provide the ALCO minute covering the funding plan…"
          />
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Demo action — recorded in the supervisory decision history for this institution; no real
            correspondence is sent.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setClarifyOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void requestClarification()}>Record request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
