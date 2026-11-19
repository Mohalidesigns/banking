import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowLeft,
  Calculator,
  Download,
  FlaskConical,
  Landmark,
  Layers,
  Percent,
  RefreshCw,
  ShieldCheck,
  TriangleExclamationPoint,
  Wallet,
} from 'lucide-react'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { capitalAdequacyService, stressTestingService } from '@/services/mock/MockPrudentialService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  CapitalBreachRow,
  CapitalOverview,
  CapitalSubmissionRow,
  InstitutionCapitalDetail,
} from '@/types/prudential'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Capital Adequacy (Spec §8.1) — `/app/prudential/capital`. KPI cards
 * (regulatory capital, RWA, CAR, buffer/shortfall), capital composition,
 * CET1/Tier 1/Tier 2 trend, RWA breakdown, deductions, stress summary,
 * exception list, and the submissions / component / adjustments / breaches
 * tables. Submission detail carries formula, definition, source submission
 * deep link, period, rule version, calculation breakdown and reviewer
 * status; accept/reject and breach status moves are role-gated (§19).
 * All figures are illustrative demo data (Spec §17.5).
 */

const DEMO_NOTE =
  'All capital figures, thresholds and breaches are illustrative demo values — not approved regulatory rules.'

const REVIEW_TONES: Record<CapitalSubmissionRow['reviewStatus'], StatusTone> = {
  'Awaiting Review': 'planning',
  'In Review': 'fieldwork',
  Accepted: 'completed',
  Rejected: 'overdue',
}

const BREACH_STATUS_TONES: Record<CapitalBreachRow['status'], StatusTone> = {
  Open: 'overdue',
  'Under remediation': 'fieldwork',
  Escalated: 'reporting',
  Cleared: 'completed',
}

const COMPOSITION_COLORS: Record<string, string> = {
  CET1: CHART_COLORS.primary,
  AT1: CHART_COLORS.primarySurface,
  T2: CHART_COLORS.accent,
}

export function CapitalAdequacyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const institutionParam = searchParams.get('institution')

  return institutionParam ? (
    <InstitutionCapitalView
      institutionId={institutionParam}
      onBack={() => setSearchParams({}, { replace: true })}
    />
  ) : (
    <PortfolioCapitalView />
  )
}

// ---------------------------------------------------------------------------
// Portfolio view
// ---------------------------------------------------------------------------

function PortfolioCapitalView() {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canReview = can(actor.actorRole, 'review-prudential')
  const canApprove = can(actor.actorRole, 'approve-prudential')

  const [overview, setOverview] = useState<CapitalOverview | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fInstitution, setFInstitution] = useState('')
  const [fPeriod, setFPeriod] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [busy, setBusy] = useState(false)

  // Detail modal (Spec §8.1 "Detail")
  const [detailRow, setDetailRow] = useState<CapitalSubmissionRow | null>(null)
  // Decision modal
  const [decisionRow, setDecisionRow] = useState<{ row: CapitalSubmissionRow; decision: 'Accepted' | 'Rejected' } | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionError, setDecisionError] = useState('')
  // Breach status modal
  const [breachRow, setBreachRow] = useState<CapitalBreachRow | null>(null)
  const [breachStatus, setBreachStatus] = useState<CapitalBreachRow['status']>('Under remediation')
  const [breachNote, setBreachNote] = useState('')

  const load = useCallback(async () => {
    const [ov, instPage] = await Promise.all([
      capitalAdequacyService.overview({ institutionId: fInstitution || undefined }),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setOverview(ov)
    setInstitutions(instPage.items)
  }, [fInstitution])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const submissions = useMemo(() => {
    if (!overview) return []
    return overview.submissions
      .filter((s) => !fPeriod || s.periodLabel === fPeriod)
      .filter((s) => !fStatus || s.reviewStatus === fStatus)
  }, [overview, fPeriod, fStatus])

  const periodOptions = useMemo(
    () => [...new Set((overview?.submissions ?? []).map((s) => s.periodLabel))],
    [overview],
  )

  const composition = useMemo(() => {
    if (!overview) return []
    const latestByInst = new Map<string, CapitalSubmissionRow>()
    for (const s of overview.submissions) {
      const cur = latestByInst.get(s.institutionId)
      if (!cur || (s.receivedAt ?? '') > (cur.receivedAt ?? '')) latestByInst.set(s.institutionId, s)
    }
    const rows = [...latestByInst.values()]
    const cet1 = rows.reduce((a, s) => a + Number(s.cet1MM), 0)
    const at1 = rows.reduce((a, s) => a + (Number(s.tier1MM) - Number(s.cet1MM)), 0)
    const t2 = rows.reduce((a, s) => a + Number(s.tier2MM), 0)
    const total = cet1 + at1 + t2 || 1
    return [
      { code: 'CET1', name: 'Common Equity Tier 1', value: Number(cet1.toFixed(1)), pct: ((cet1 / total) * 100).toFixed(1) },
      { code: 'AT1', name: 'Additional Tier 1', value: Number(at1.toFixed(1)), pct: ((at1 / total) * 100).toFixed(1) },
      { code: 'T2', name: 'Tier 2', value: Number(t2.toFixed(1)), pct: ((t2 / total) * 100).toFixed(1) },
    ]
  }, [overview])

  const startReview = async (row: CapitalSubmissionRow) => {
    setBusy(true)
    try {
      await capitalAdequacyService.startSubmissionReview(row.id, actor)
      await load()
      toast.success('Saved in prototype session', `${row.institutionName} ${row.periodLabel} moved to In Review.`)
    } catch (err) {
      guard(err, 'The review could not be started in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const submitDecision = async () => {
    if (!decisionRow) return
    if (decisionRow.decision === 'Rejected' && !decisionNote.trim()) {
      setDecisionError('A rejection reason is required (demo form).')
      return
    }
    setBusy(true)
    try {
      await capitalAdequacyService.decideSubmission(
        decisionRow.row.id,
        decisionRow.decision,
        decisionNote.trim() || `${decisionRow.decision} from the capital adequacy screen (demo decision).`,
        actor,
      )
      setDecisionRow(null)
      setDecisionNote('')
      setDecisionError('')
      await load()
      toast.success('Saved in prototype session', `Capital submission ${decisionRow.decision.toLowerCase()} — demo decision recorded.`)
    } catch (err) {
      guard(err, 'The decision could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const submitBreachStatus = async () => {
    if (!breachRow) return
    setBusy(true)
    try {
      await capitalAdequacyService.setBreachStatus(
        breachRow.id,
        breachStatus,
        breachNote.trim() || `Status moved to ${breachStatus} from the capital adequacy screen (demo).`,
        actor,
      )
      setBreachRow(null)
      setBreachNote('')
      await load()
      toast.success('Saved in prototype session', `Breach status updated to ${breachStatus}.`)
    } catch (err) {
      guard(err, 'The breach status could not be updated in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-capital-submissions-demo.csv',
      ['Institution', 'Code', 'Period', 'Return', 'CET1 (MRD m)', 'Tier 1 (MRD m)', 'Tier 2 (MRD m)', 'Total capital (MRD m)', 'RWA (MRD m)', 'CAR %', 'Buffer pp', 'Review status', 'Rule version'],
      submissions.map((s) => [
        s.institutionName, s.institutionCode, s.periodLabel, s.returnCode,
        s.cet1MM, s.tier1MM, s.tier2MM, s.totalCapitalMM, s.rwaMM, s.carPct, s.bufferPct,
        s.reviewStatus, s.ruleVersion,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const submissionColumns = useMemo<Array<ColumnDef<CapitalSubmissionRow, unknown>>>(
    () => [
      {
        accessorKey: 'institutionName',
        header: 'Institution',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={(ev) => {
              ev.stopPropagation()
              navigate(`/app/prudential/capital?institution=${encodeURIComponent(row.original.institutionId)}`)
            }}
          >
            {row.original.institutionName}
          </button>
        ),
      },
      { accessorKey: 'periodLabel', header: 'Period' },
      {
        accessorKey: 'returnCode',
        header: 'Source return',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[11px] text-ink">{row.original.returnCode}</p>
            {row.original.submissionRef && (
              <button
                type="button"
                className="cursor-pointer font-mono text-[10px] text-primary-surface hover:underline"
                onClick={(ev) => {
                  ev.stopPropagation()
                  navigate(`/app/returns/${row.original.submissionId}`)
                }}
              >
                {row.original.submissionRef} →
              </button>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'totalCapitalMM',
        header: 'Total capital (MRD m)',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.totalCapitalMM}</span>,
      },
      {
        accessorKey: 'rwaMM',
        header: 'RWA (MRD m)',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.rwaMM}</span>,
      },
      {
        accessorKey: 'carPct',
        header: 'CAR %',
        cell: ({ row }) => (
          <span className={cx('font-mono text-xs font-semibold', Number(row.original.carPct) < 10 ? 'text-error' : Number(row.original.carPct) < 12.5 ? 'text-warning' : 'text-success')}>
            {row.original.carPct}
          </span>
        ),
      },
      {
        accessorKey: 'bufferPct',
        header: 'Buffer (pp)',
        cell: ({ row }) => (
          <span className={cx('font-mono text-xs', Number(row.original.bufferPct) < 0 ? 'font-semibold text-error' : 'text-ink-secondary')}>
            {row.original.bufferPct}
          </span>
        ),
      },
      {
        accessorKey: 'reviewStatus',
        header: 'Reviewer status',
        cell: ({ row }) => <StatusBadge status={row.original.reviewStatus} tone={REVIEW_TONES[row.original.reviewStatus]} />,
      },
      {
        accessorKey: 'receivedAt',
        header: 'Received',
        cell: ({ row }) => (
          <span className="text-xs text-ink-secondary">
            {row.original.receivedAt ? formatRelativeTime(row.original.receivedAt) : '—'}
          </span>
        ),
      },
    ],
    [navigate],
  )

  const breachColumns = useMemo<Array<ColumnDef<CapitalBreachRow, unknown>>>(
    () => [
      {
        accessorKey: 'institutionName',
        header: 'Institution',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.institutionName}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.institutionCode}</p>
          </div>
        ),
      },
      { accessorKey: 'periodLabel', header: 'Period' },
      { accessorKey: 'measure', header: 'Measure' },
      {
        id: 'observed',
        accessorFn: (b) => Number(b.observedPct),
        header: 'Observed vs required',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            <span className={cx('font-semibold', row.original.severity === 'Red' ? 'text-error' : 'text-warning')}>
              {row.original.observedPct}%
            </span>
            <span className="text-ink-tertiary"> / {row.original.requiredPct}%</span>
          </span>
        ),
      },
      {
        accessorKey: 'shortfallMM',
        header: 'Shortfall (MRD m)',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.shortfallMM}</span>,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <StatusBadge status={row.original.severity} tone={row.original.severity === 'Red' ? 'overdue' : 'fieldwork'} />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={BREACH_STATUS_TONES[row.original.status]} />,
      },
      {
        id: 'related',
        header: 'Related records',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.relatedRefs.map((ref) => (
              <RelatedRefChip key={ref} reference={ref} navigate={navigate} />
            ))}
            {row.original.relatedRefs.length === 0 && <span className="text-[10px] text-ink-tertiary">—</span>}
          </div>
        ),
      },
    ],
    [navigate],
  )

  if (!overview) {
    return (
      <div>
        <PageHeader title="Capital Adequacy" subtitle="Portfolio capital position against the demo prudential minimum" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  const k = overview.kpis

  return (
    <div>
      <PageHeader
        title="Capital Adequacy"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Portfolio capital position as of {formatDate(overview.reportingDate)}</span>
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
              Export submissions
            </Button>
            <Button variant="outline" iconLeft={<FlaskConical className="h-3.5 w-3.5" />} onClick={() => navigate('/app/prudential/stress-testing')}>
              Stress testing
            </Button>
          </>
        }
      />

      {/* KPI cards (Spec §8.1) */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Regulatory capital" value={`${k.totalRegulatoryCapitalMM} m`} icon={Wallet} tone="blue" footer="MRD millions, latest submissions (demo)" />
        <StatCard label="Risk-weighted assets" value={`${k.totalRwaMM} m`} icon={Layers} tone="purple" footer="MRD millions, latest submissions (demo)" />
        <StatCard
          label="Portfolio capital adequacy ratio"
          value={`${k.portfolioCarPct}%`}
          icon={Percent}
          tone={Number(k.portfolioCarPct) < 10 ? 'red' : Number(k.portfolioCarPct) < 12.5 ? 'orange' : 'green'}
          footer="Asset-weighted; demo minimum 10.0%"
          onClick={() => navigate('/app/prudential/indicators?indicator=CAR')}
        />
        <StatCard
          label="Buffer / shortfall"
          value={`${k.institutionsWithBuffer} / ${k.institutionsWithShortfall}`}
          icon={TriangleExclamationPoint}
          tone={k.institutionsWithShortfall > 0 ? 'red' : 'green'}
          footer={`${k.openBreaches} open breach record(s) — demo`}
          onClick={() => navigate('/app/surveillance')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="CET1, Tier 1 and Tier 2 trend"
            subtitle="Capital ratios across the last 8 demo quarters (asset-weighted)"
          />
          <CardBody>
            <CapitalTrendChart data={overview.portfolioTrend} />
            <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Capital composition" subtitle="Latest submissions — CET1 / AT1 / Tier 2 share" />
          <CardBody>
            <div className="h-48" role="img" aria-label={`Capital composition donut: ${composition.map((c) => `${c.name} ${c.pct}%`).join(', ')}. Illustrative demo data.`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={composition} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2} isAnimationActive={false}>
                    {composition.map((c) => (
                      <Cell key={c.code} fill={COMPOSITION_COLORS[c.code]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {composition.map((c) => (
                <li key={c.code} className="flex items-center gap-2 text-xs">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COMPOSITION_COLORS[c.code] }} />
                  <span className="text-ink-secondary">{c.name}</span>
                  <span className="ml-auto font-mono font-semibold text-ink">{c.value} m</span>
                  <span className="font-mono text-[10px] text-ink-tertiary">{c.pct}%</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Risk-weighted asset breakdown" subtitle="Latest period, portfolio (demo weights)" />
          <CardBody>
            <div className="h-52" role="img" aria-label={`RWA breakdown: ${overview.rwaBreakdown.map((r) => `${r.riskCategory} ${r.pctOfTotal}%`).join(', ')}. Illustrative demo data.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.rwaBreakdown} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 40 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="riskCategory" width={92} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} cursor={{ fill: 'rgba(26,54,93,0.05)' }} />
                  <Bar dataKey="amountMM" name="RWA" fill={CHART_COLORS.primarySurface} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Capital stress test results"
            subtitle="Latest approved demo run — illustrative only"
            action={
              <button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:underline" onClick={() => navigate('/app/prudential/stress-testing')}>
                Open stress testing →
              </button>
            }
          />
          <CardBody>
            <CapitalStressPanel onOpenInstitution={(id) => navigate(`/app/prudential/capital?institution=${encodeURIComponent(id)}`)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Institution exception list" subtitle="Capital-ratio prudential exceptions (live demo state)" />
          <CardBody>
            {overview.exceptions.length === 0 ? (
              <EmptyState title="No capital exceptions" description="No demo CAR exceptions match the current filter." icon={<ShieldCheck className="h-7 w-7" />} />
            ) : (
              <ul className="flex flex-col gap-3">
                {overview.exceptions
                  .filter((e) => !fInstitution || e.institutionId === fInstitution)
                  .map((e) => (
                    <li key={e.id} className="rounded-lg border border-line px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-primary">{e.reference}</span>
                        <StatusBadge status={e.severity} tone={e.severity === 'Red' ? 'overdue' : 'fieldwork'} />
                        <StatusBadge status={e.status} tone={BREACH_STATUS_TONES[e.status as CapitalBreachRow['status']] ?? 'planning'} />
                        <span className="ml-auto font-mono text-[11px] font-semibold text-error">{e.observedValue}% / {e.thresholdValue}%</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-ink">{e.institutionName} · {e.periodLabel}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{e.note}</p>
                      <button
                        type="button"
                        className="mt-1.5 cursor-pointer text-[11px] font-medium text-primary-surface hover:underline"
                        onClick={() => navigate(`/app/surveillance?institution=${encodeURIComponent(e.institutionId)}`)}
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

      <div className="mt-4">
        <DataTable<CapitalSubmissionRow>
          columns={submissionColumns}
          data={submissions}
          title="Capital submissions"
          getRowId={(s) => s.id}
          onRowClick={(s) => setDetailRow(s)}
          initialPageSize={10}
          emptyTitle="No capital submissions"
          emptyDescription="No demo submissions match the current filters."
          onRetry={() => void load()}
          rowActions={(row) => (
            <div className="flex gap-1.5">
              {row.reviewStatus === 'Awaiting Review' && (
                <Button size="sm" variant="outline" disabled={!canReview || busy} title={canReview ? 'Start review (review-prudential demo action)' : 'Requires the review-prudential demo action (Spec §19)'} onClick={() => void startReview(row)}>
                  Start review
                </Button>
              )}
              {(row.reviewStatus === 'Awaiting Review' || row.reviewStatus === 'In Review') && (
                <>
                  <Button size="sm" variant="success" disabled={!canApprove || busy} title={canApprove ? undefined : 'Requires the approve-prudential demo action (Spec §19)'} onClick={() => { setDecisionNote(''); setDecisionError(''); setDecisionRow({ row, decision: 'Accepted' }) }}>
                    Accept
                  </Button>
                  <Button size="sm" variant="danger" disabled={!canApprove || busy} title={canApprove ? undefined : 'Requires the approve-prudential demo action (Spec §19)'} onClick={() => { setDecisionNote(''); setDecisionError(''); setDecisionRow({ row, decision: 'Rejected' }) }}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                aria-label="Filter by institution"
                value={fInstitution}
                onChange={(e) => setFInstitution(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by period"
                value={fPeriod}
                onChange={(e) => setFPeriod(e.target.value)}
                placeholder="All periods"
                options={periodOptions.map((p) => ({ value: p, label: p }))}
              />
              <Select
                aria-label="Filter by reviewer status"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                placeholder="All statuses"
                options={['Awaiting Review', 'In Review', 'Accepted', 'Rejected'].map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataTable<CapitalBreachRow>
          columns={breachColumns}
          data={overview.breaches}
          title="Capital breaches"
          getRowId={(b) => b.id}
          initialPageSize={5}
          emptyTitle="No capital breaches"
          emptyDescription="No demo breach records for the current filter."
          rowActions={(row) =>
            row.status !== 'Cleared' ? (
              <Button size="sm" variant="outline" disabled={!canApprove || busy} title={canApprove ? 'Update breach status (approve-prudential demo action)' : 'Requires the approve-prudential demo action (Spec §19)'} onClick={() => { setBreachRow(row); setBreachStatus(row.status === 'Open' ? 'Under remediation' : 'Cleared'); setBreachNote('') }}>
                Update status
              </Button>
            ) : undefined
          }
        />

        <DataTable<CapitalOverview['adjustments'][number]>
          columns={adjustmentColumns}
          data={overview.adjustments}
          title="Regulatory adjustments & capital deductions"
          getRowId={(a) => a.id}
          initialPageSize={5}
          emptyTitle="No adjustments"
          emptyDescription="No demo regulatory adjustments for the current filter."
        />
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Submission detail modal (Spec §8.1 "Detail") */}
      <SubmissionDetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onOpenSubmission={(id) => {
          setDetailRow(null)
          navigate(`/app/returns/${id}`)
        }}
        onOpenInstitution={(id) => {
          setDetailRow(null)
          navigate(`/app/prudential/capital?institution=${encodeURIComponent(id)}`)
        }}
      />

      {/* Accept/reject decision modal */}
      <Modal
        open={decisionRow !== null}
        onClose={() => setDecisionRow(null)}
        title={decisionRow ? `${decisionRow.decision === 'Accepted' ? 'Accept' : 'Reject'} capital submission` : ''}
        description={decisionRow ? `${decisionRow.row.institutionName} — ${decisionRow.row.periodLabel} ${decisionRow.row.returnCode} (CAR ${decisionRow.row.carPct}%). Demo decision, saved in the prototype session only.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionRow(null)}>Cancel</Button>
            <Button
              variant={decisionRow?.decision === 'Rejected' ? 'danger' : 'success'}
              loading={busy}
              onClick={() => void submitDecision()}
            >
              {decisionRow?.decision === 'Rejected' ? 'Reject submission' : 'Accept submission'}
            </Button>
          </>
        }
      >
        <TextArea
          label={decisionRow?.decision === 'Rejected' ? 'Rejection reason' : 'Decision note (optional)'}
          required={decisionRow?.decision === 'Rejected'}
          error={decisionError}
          rows={3}
          value={decisionNote}
          onChange={(e) => { setDecisionNote(e.target.value); setDecisionError('') }}
          placeholder={decisionRow?.decision === 'Rejected' ? 'Explain why the submission is rejected (demo)…' : 'Add context for the decision history (demo)…'}
        />
      </Modal>

      {/* Breach status modal */}
      <Modal
        open={breachRow !== null}
        onClose={() => setBreachRow(null)}
        title="Update capital breach status"
        description={breachRow ? `${breachRow.institutionName} — ${breachRow.measure} ${breachRow.observedPct}% vs required ${breachRow.requiredPct}% (${breachRow.periodLabel}). Demo action.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBreachRow(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void submitBreachStatus()}>Save status</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="New status"
            value={breachStatus}
            onChange={(e) => setBreachStatus(e.target.value as CapitalBreachRow['status'])}
            options={['Open', 'Under remediation', 'Escalated', 'Cleared'].map((s) => ({ value: s, label: s }))}
          />
          <TextArea
            label="Status note"
            rows={3}
            value={breachNote}
            onChange={(e) => setBreachNote(e.target.value)}
            placeholder="Supervisory rationale for the status move (demo)…"
          />
        </div>
      </Modal>
    </div>
  )
}

const adjustmentColumns: Array<ColumnDef<CapitalOverview['adjustments'][number], unknown>> = [
  {
    accessorKey: 'institutionName',
    header: 'Institution',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.institutionName}</p>
        <p className="text-[10px] text-ink-secondary">{row.original.periodLabel}</p>
      </div>
    ),
  },
  { accessorKey: 'label', header: 'Adjustment' },
  {
    accessorKey: 'kind',
    header: 'Kind',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.kind}
        tone={row.original.kind === 'Deduction' ? 'overdue' : row.original.kind === 'Addition' ? 'active' : 'planning'}
      />
    ),
  },
  {
    accessorKey: 'amountMM',
    header: 'Amount (MRD m)',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.amountMM}</span>,
  },
  {
    accessorKey: 'ruleRef',
    header: 'Rule reference',
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-[10px] text-ink-secondary">{row.original.ruleRef}</p>
        <p className="mt-0.5 max-w-[280px] text-[10px] leading-relaxed text-ink-tertiary">{row.original.note}</p>
      </div>
    ),
  },
]

/** Chip that resolves a cross-module reference to its route (no dead ends). */
function RelatedRefChip({ reference, navigate }: { reference: string; navigate: (to: string) => void }) {
  const target =
    reference.startsWith('EWA-') ? `/app/early-warnings?reference=${reference}`
    : reference.startsWith('SUB-') ? `/app/returns?search=${reference}`
    : reference.startsWith('EXC-') ? `/app/surveillance`
    : reference.startsWith('ENF-') ? `/app/enforcement`
    : null
  return (
    <button
      type="button"
      className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
      onClick={(e) => {
        e.stopPropagation()
        if (target) navigate(target)
      }}
      title={target ? `Open ${reference}` : `${reference} (demo reference)`}
    >
      {reference}
    </button>
  )
}

/** Capital trend chart (CET1 / Tier 1 / Tier 2 / CAR). */
function CapitalTrendChart({ data }: { data: CapitalOverview['portfolioTrend'] }) {
  const latest = data[data.length - 1]
  return (
    <div
      role="img"
      aria-label={`Capital ratio trend. Latest period ${latest?.periodLabel ?? 'n/a'}: CAR ${latest?.carPct ?? 'n/a'}%, Tier 1 ${latest?.tier1Pct ?? 'n/a'}%, CET1 ${latest?.cet1Pct ?? 'n/a'}%. Illustrative demo figures.`}
      className="h-64 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} unit="%" width={52} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.axis }} iconType="plainline" iconSize={14} />
          <Line type="monotone" dataKey="carPct" name="CAR" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="tier1Pct" name="Tier 1 ratio" stroke={CHART_COLORS.primarySurface} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="cet1Pct" name="CET1 ratio" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="tier2Pct" name="Tier 2 ratio" stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Latest approved stress run summary (§8.1 "Capital stress test results"). */
function CapitalStressPanel({ onOpenInstitution }: { onOpenInstitution: (institutionId: string) => void }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Array<{ institutionId: string; institutionName: string; carBaselinePct: string; carStressedPct: string; verdict: string; reference: string; scenarioName: string }> | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const runs = await stressTestingService.listRuns()
      const approved = runs.find((r) => r.status === 'Approved')
      if (!cancelled) {
        setRows(
          (approved?.results ?? []).map((r) => ({
            institutionId: r.institutionId,
            institutionName: r.institutionName,
            carBaselinePct: r.carBaselinePct,
            carStressedPct: r.carStressedPct,
            verdict: r.verdict,
            reference: approved!.reference,
            scenarioName: approved!.scenarioName,
          })),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (rows === null) return <LoadingSkeleton variant="text" rows={4} />
  if (rows.length === 0) {
    return <EmptyState title="No approved stress runs" description="Approve a demo run on the stress-testing screen to summarise it here." icon={<FlaskConical className="h-7 w-7" />} action={{ label: 'Open stress testing', onClick: () => navigate('/app/prudential/stress-testing') }} />
  }

  return (
    <div>
      <p className="mb-2 text-[10px] text-ink-tertiary">
        {rows[0].reference} · {rows[0].scenarioName} — illustrative demo calculation, never an official regulatory result.
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.institutionId} className="flex items-center gap-2">
            <button type="button" className="cursor-pointer truncate text-xs font-medium text-primary hover:underline" onClick={() => onOpenInstitution(r.institutionId)}>
              {r.institutionName}
            </button>
            <span className="ml-auto font-mono text-[11px] text-ink-secondary">{r.carBaselinePct}% →</span>
            <span className={cx('font-mono text-[11px] font-semibold', r.verdict === 'Breach' ? 'text-error' : r.verdict === 'Pass' ? 'text-success' : 'text-warning')}>
              {r.carStressedPct}%
            </span>
            <StatusBadge status={r.verdict} tone={r.verdict === 'Breach' ? 'overdue' : r.verdict === 'Pass' ? 'active' : 'fieldwork'} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** §8.1 submission detail: formula, definition, source submission, period, rule version, breakdown, reviewer status. */
function SubmissionDetailModal({
  row,
  onClose,
  onOpenSubmission,
  onOpenInstitution,
}: {
  row: CapitalSubmissionRow | null
  onClose: () => void
  onOpenSubmission: (submissionId: string) => void
  onOpenInstitution: (institutionId: string) => void
}) {
  const breakdown = row
    ? [
        { label: 'CET1 capital', value: row.cet1MM, unit: 'MRD m', formula: 'Paid-up capital + retained earnings − deductions (demo)' },
        { label: 'Additional Tier 1', value: (Number(row.tier1MM) - Number(row.cet1MM)).toFixed(1), unit: 'MRD m', formula: 'Tier 1 − CET1' },
        { label: 'Tier 1 capital', value: row.tier1MM, unit: 'MRD m', formula: 'CET1 + AT1' },
        { label: 'Tier 2 capital', value: row.tier2MM, unit: 'MRD m', formula: 'Subordinated debt + eligible general provisions (demo)' },
        { label: 'Total regulatory capital', value: row.totalCapitalMM, unit: 'MRD m', formula: 'Tier 1 + Tier 2' },
        { label: 'Risk-weighted assets', value: row.rwaMM, unit: 'MRD m', formula: 'Σ exposure × risk weight + market/operational RWA (demo)' },
        { label: 'Capital adequacy ratio', value: row.carPct, unit: '%', formula: 'Total capital ÷ RWA × 100' },
      ]
    : []

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      size="lg"
      title={row ? `Capital submission — ${row.institutionName}` : ''}
      description={row ? `${row.periodLabel} · ${row.returnCode}${row.submissionRef ? ` · ${row.submissionRef}` : ''}` : undefined}
      footer={
        row ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" iconLeft={<Landmark className="h-3.5 w-3.5" />} onClick={() => onOpenInstitution(row.institutionId)}>
              Institution capital detail
            </Button>
            {row.submissionId && (
              <Button variant="primary" iconLeft={<Calculator className="h-3.5 w-3.5" />} onClick={() => onOpenSubmission(row.submissionId!)}>
                Open source submission
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-line bg-page p-3">
            <p className="overline text-ink-tertiary">Definition & formula</p>
            <p className="mt-1 text-xs text-ink">
              Capital Adequacy Ratio — total regulatory capital as a percentage of risk-weighted assets (demo definition).
            </p>
            <p className="mt-1 font-mono text-xs font-semibold text-primary">CAR = (CET1 + AT1 + Tier 2) ÷ RWA × 100</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
              <div><dt className="text-ink-tertiary">Reporting period</dt><dd className="font-medium text-ink">{row.periodLabel}</dd></div>
              <div><dt className="text-ink-tertiary">Rule version</dt><dd className="font-mono font-medium text-ink">{row.ruleVersion}</dd></div>
              <div><dt className="text-ink-tertiary">Reviewer status</dt><dd><StatusBadge status={row.reviewStatus} tone={REVIEW_TONES[row.reviewStatus]} /></dd></div>
              <div><dt className="text-ink-tertiary">Source return</dt><dd className="font-mono font-medium text-ink">{row.returnCode}</dd></div>
              <div><dt className="text-ink-tertiary">Received</dt><dd className="font-medium text-ink">{row.receivedAt ? formatDate(row.receivedAt) : '—'}</dd></div>
              <div><dt className="text-ink-tertiary">Buffer vs 10% min</dt><dd className={cx('font-mono font-semibold', Number(row.bufferPct) < 0 ? 'text-error' : 'text-success')}>{row.bufferPct} pp</dd></div>
            </dl>
          </div>

          <div>
            <p className="overline mb-1.5 text-ink-tertiary">Calculation breakdown</p>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                  <th scope="col" className="px-3 py-1.5">Step</th>
                  <th scope="col" className="px-3 py-1.5 text-right">Value</th>
                  <th scope="col" className="px-3 py-1.5">Formula</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.label} className="border-t border-line-light">
                    <td className="px-3 py-1.5 text-xs font-medium text-ink">{b.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-ink">{b.value} <span className="text-[10px] text-ink-tertiary">{b.unit}</span></td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-ink-secondary">{b.formula}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {row.note && (
            <p className="border-l-2 border-accent pl-2 text-[11px] italic leading-relaxed text-ink-secondary">
              “{row.note}”
            </p>
          )}
          <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Institution capital detail (?institution=<id>)
// ---------------------------------------------------------------------------

function InstitutionCapitalView({ institutionId, onBack }: { institutionId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const [detail, setDetail] = useState<InstitutionCapitalDetail | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const d = await capitalAdequacyService.institutionDetail(institutionId)
      if (!cancelled) setDetail(d ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [institutionId])

  if (detail === undefined) return <LoadingSkeleton variant="text" rows={12} />
  if (detail === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Institution not found"
            description="No demo institution matches this id — it may be from a previous prototype session."
            action={{ label: 'Back to capital adequacy', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const det = detail

  return (
    <div>
      <PageHeader
        title={det.institutionName}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{det.institutionCode}</span>
            <span>·</span>
            <span>{det.category}</span>
            <span>·</span>
            <span>Latest capital period: {det.periodLabel}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Capital Adequacy', path: '/app/prudential/capital' }, { label: det.institutionName }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>Portfolio view</Button>
            <Button variant="outline" iconLeft={<Landmark className="h-3.5 w-3.5" />} onClick={() => navigate(`/app/institutions/${encodeURIComponent(det.institutionId)}`)}>
              Institution profile
            </Button>
            <Button variant="outline" iconLeft={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => navigate(`/app/surveillance?institution=${encodeURIComponent(det.institutionId)}`)}>
              Surveillance detail
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="CET1, Tier 1 and Tier 2 trend" subtitle={`Demo quarters for ${det.institutionName}`} />
          <CardBody>
            <CapitalTrendChart data={det.trend} />
            <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Capital composition" subtitle={`Latest period — ${det.periodLabel}`} />
          <CardBody>
            {det.composition.length === 0 ? (
              <EmptyState title="No capital submissions" description="This demo institution has no capital submission rows yet." />
            ) : (
              <ul className="flex flex-col gap-2">
                {det.composition.map((c) => (
                  <li key={c.code} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COMPOSITION_COLORS[c.code] }} />
                        {c.label}
                      </span>
                      <span className="font-mono text-xs text-ink">{c.amountMM} m · {c.pctOfTotal}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="CAR calculation detail" subtitle={`Source: ${det.carDetail.sourceSubmissionRef ?? det.periodLabel} · ${det.carDetail.ruleVersion}`} />
          <CardBody>
            <p className="text-xs text-ink-secondary">{det.carDetail.definition}</p>
            <p className="mt-1 font-mono text-xs font-semibold text-primary">{det.carDetail.formula}</p>
            <table className="mt-3 w-full text-left">
              <thead>
                <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                  <th scope="col" className="px-3 py-1.5">Step</th>
                  <th scope="col" className="px-3 py-1.5 text-right">Value</th>
                  <th scope="col" className="px-3 py-1.5">Formula</th>
                </tr>
              </thead>
              <tbody>
                {det.carDetail.breakdown.map((b) => (
                  <tr key={b.label} className="border-t border-line-light">
                    <td className="px-3 py-1.5 text-xs font-medium text-ink">{b.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-ink">{b.value} <span className="text-[10px] text-ink-tertiary">{b.unit}</span></td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-ink-secondary">{b.formula ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={det.carDetail.reviewerStatus} tone={REVIEW_TONES[det.carDetail.reviewerStatus]} />
              {det.carDetail.sourceSubmissionId && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/app/returns/${det.carDetail.sourceSubmissionId}`)}>
                  Open source submission →
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Capital stress test results" subtitle="Latest approved demo run — illustrative only" />
          <CardBody>
            {det.stressSummary.length === 0 ? (
              <EmptyState title="No stress results" description="No approved demo stress run covers this institution yet." icon={<FlaskConical className="h-7 w-7" />} action={{ label: 'Open stress testing', onClick: () => navigate('/app/prudential/stress-testing') }} />
            ) : (
              <ul className="flex flex-col gap-2">
                {det.stressSummary.map((s) => (
                  <li key={s.runReference} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary">{s.runReference}</span>
                      <span className="text-xs text-ink">{s.scenarioName}</span>
                      <span className="ml-auto font-mono text-[11px] text-ink-secondary">{s.carBaselinePct}% →</span>
                      <span className={cx('font-mono text-[11px] font-semibold', s.verdict === 'Breach' ? 'text-error' : s.verdict === 'Pass' ? 'text-success' : 'text-warning')}>{s.carStressedPct}%</span>
                      <StatusBadge status={s.verdict} tone={s.verdict === 'Breach' ? 'overdue' : s.verdict === 'Pass' ? 'active' : 'fieldwork'} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-ink-tertiary">Illustrative demo calculations — never official regulatory stress-test results (Spec §8.4).</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataTable<CapitalBreachRow>
          columns={breachColumnsFor(navigate)}
          data={det.breaches}
          title="Capital breaches"
          getRowId={(b) => b.id}
          initialPageSize={5}
          emptyTitle="No capital breaches"
          emptyDescription="This demo institution has no breach records — a healthy prototype state."
        />
        <DataTable<CapitalOverview['adjustments'][number]>
          columns={adjustmentColumns}
          data={det.deductions}
          title="Capital deductions & adjustments"
          getRowId={(a) => a.id}
          initialPageSize={5}
          emptyTitle="No adjustments"
          emptyDescription="No demo regulatory adjustments recorded for this institution."
        />
      </div>

      <div className="mt-4">
        <DataTable<CapitalSubmissionRow>
          columns={submissionColumnsFor(navigate)}
          data={det.submissions}
          title="Capital submissions"
          getRowId={(s) => s.id}
          initialPageSize={5}
          emptyTitle="No capital submissions"
          emptyDescription="No demo MPR-09 submissions recorded for this institution."
        />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Capital exceptions" subtitle="Live prudential exceptions for this institution (demo)" />
          <CardBody>
            {det.exceptions.length === 0 ? (
              <EmptyState title="No capital exceptions" description="No open demo CAR exceptions for this institution." icon={<ShieldCheck className="h-7 w-7" />} />
            ) : (
              <ul className="flex flex-col gap-2">
                {det.exceptions.map((e) => (
                  <li key={e.id} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary">{e.reference}</span>
                      <StatusBadge status={e.severity} tone={e.severity === 'Red' ? 'overdue' : 'fieldwork'} />
                      <span className="font-mono text-[11px] text-ink-secondary">{e.observedValue}% vs {e.thresholdValue}% · {e.periodLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{e.note}</p>
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

/** Read-only column sets reused by the institution detail view. */
function submissionColumnsFor(navigate: (to: string) => void): Array<ColumnDef<CapitalSubmissionRow, unknown>> {
  return [
    { accessorKey: 'periodLabel', header: 'Period' },
    {
      accessorKey: 'returnCode',
      header: 'Source return',
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-[11px] text-ink">{row.original.returnCode}</p>
          {row.original.submissionRef && (
            <button
              type="button"
              className="cursor-pointer font-mono text-[10px] text-primary-surface hover:underline"
              onClick={(ev) => {
                ev.stopPropagation()
                navigate(`/app/returns/${row.original.submissionId}`)
              }}
            >
              {row.original.submissionRef} →
            </button>
          )}
        </div>
      ),
    },
    { accessorKey: 'totalCapitalMM', header: 'Total capital (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.totalCapitalMM}</span> },
    { accessorKey: 'rwaMM', header: 'RWA (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.rwaMM}</span> },
    {
      accessorKey: 'carPct',
      header: 'CAR %',
      cell: ({ row }) => (
        <span className={cx('font-mono text-xs font-semibold', Number(row.original.carPct) < 10 ? 'text-error' : Number(row.original.carPct) < 12.5 ? 'text-warning' : 'text-success')}>
          {row.original.carPct}
        </span>
      ),
    },
    { accessorKey: 'reviewStatus', header: 'Reviewer status', cell: ({ row }) => <StatusBadge status={row.original.reviewStatus} tone={REVIEW_TONES[row.original.reviewStatus]} /> },
  ]
}

function breachColumnsFor(navigate: (to: string) => void): Array<ColumnDef<CapitalBreachRow, unknown>> {
  return [
    { accessorKey: 'periodLabel', header: 'Period' },
    { accessorKey: 'measure', header: 'Measure' },
    {
      id: 'observed',
      accessorFn: (b) => Number(b.observedPct),
      header: 'Observed vs required',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          <span className={cx('font-semibold', row.original.severity === 'Red' ? 'text-error' : 'text-warning')}>{row.original.observedPct}%</span>
          <span className="text-ink-tertiary"> / {row.original.requiredPct}%</span>
        </span>
      ),
    },
    { accessorKey: 'shortfallMM', header: 'Shortfall (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.shortfallMM}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={BREACH_STATUS_TONES[row.original.status]} /> },
    {
      id: 'related',
      header: 'Related records',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.relatedRefs.map((ref) => (
            <RelatedRefChip key={ref} reference={ref} navigate={navigate} />
          ))}
          {row.original.relatedRefs.length === 0 && <span className="text-[10px] text-ink-tertiary">—</span>}
        </div>
      ),
    },
  ]
}
