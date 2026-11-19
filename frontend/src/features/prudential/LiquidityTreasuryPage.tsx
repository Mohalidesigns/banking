import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  Activity,
  ArrowUpRight,
  Building,
  Coins,
  Download,
  Droplets,
  FlaskConical,
  RefreshCw,
  Scale,
  TriangleExclamationPoint,
} from 'lucide-react'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import { DataTable } from '@/components/data-display/DataTable'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { liquidityTreasuryService } from '@/services/mock/MockPrudentialService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  CurrencyExposureRow,
  DepositConcentrationRow,
  FundingMaturityRow,
  LiquidityExceptionNote,
  LiquidityOverview,
  TreasuryTransaction,
} from '@/types/prudential'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Liquidity & Treasury (Spec §8.3) — `/app/prudential/liquidity`. KPI cards
 * (liquidity position, LCR, NSFR, deposit concentration, FX exposure) and the
 * seven §8.3 tabs: Liquidity Overview, Funding Profile, Asset-Liability
 * Management, Treasury Operations (examination workspace with gated examiner
 * results), Foreign Exchange, Stress Testing (deep links into §8.4) and
 * Exceptions. Story: Northstar MPR-04 (SUB-2026-0144, LCR 104.2%) →
 * EXC-2026-011 → EWA-2026-011 → targeted examination EXM-2026-024;
 * Vanguard LCR 88% inside the ENF-2026-002 perimeter with a failed
 * beyond-mandate FX forward (TRX-2026-029). Illustrative demo data only.
 */

const DEMO_NOTE =
  'All liquidity figures, limits and thresholds are illustrative demo values — not approved regulatory rules.'

const SETTLEMENT_TONES: Record<TreasuryTransaction['settlement'], StatusTone> = {
  Settled: 'active',
  Pending: 'planning',
  Failed: 'overdue',
}

const RESULT_TONES: Record<NonNullable<TreasuryTransaction['examinerResult']>, StatusTone> = {
  Satisfactory: 'active',
  Exception: 'fieldwork',
  Escalate: 'overdue',
}

const DC_TONES: Record<DepositConcentrationRow['status'], StatusTone> = {
  'Within threshold': 'active',
  Amber: 'fieldwork',
  Red: 'overdue',
}

const FX_TONES: Record<CurrencyExposureRow['status'], StatusTone> = {
  'Within limit': 'active',
  'Near limit': 'fieldwork',
  Breach: 'overdue',
}

export function LiquidityTreasuryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canExamine = can(actor.actorRole, 'record-fieldwork')

  const [overview, setOverview] = useState<LiquidityOverview | null>(null)
  const [transactions, setTransactions] = useState<TreasuryTransaction[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fInstitution, setFInstitution] = useState(searchParams.get('institution') ?? '')
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'overview')
  const [busy, setBusy] = useState(false)

  // Treasury examination workspace drawer (§8.3)
  const [activeTrx, setActiveTrx] = useState<TreasuryTransaction | null>(null)
  const [result, setResult] = useState<NonNullable<TreasuryTransaction['examinerResult']>>('Satisfactory')
  const [resultNote, setResultNote] = useState('')
  const [resultError, setResultError] = useState('')

  const load = useCallback(async () => {
    const [ov, trx, instPage] = await Promise.all([
      liquidityTreasuryService.overview({ institutionId: fInstitution || undefined }),
      liquidityTreasuryService.listTreasuryTransactions({ institutionId: fInstitution || undefined }),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setOverview(ov)
    setTransactions(trx)
    setInstitutions(instPage.items)
  }, [fInstitution])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const openTransaction = (trx: TreasuryTransaction) => {
    setActiveTrx(trx)
    setResult(trx.examinerResult ?? 'Satisfactory')
    setResultNote(trx.examinerNote ?? '')
    setResultError('')
  }

  const submitResult = async () => {
    if (!activeTrx) return
    if (!resultNote.trim()) {
      setResultError('An examiner note is required (demo form).')
      return
    }
    setBusy(true)
    try {
      const updated = await liquidityTreasuryService.recordExaminerResult(activeTrx.id, result, resultNote.trim(), actor)
      setActiveTrx(null)
      await load()
      toast.success('Saved in prototype session', `${updated?.reference ?? 'Transaction'} examined — ${result}.`)
    } catch (err) {
      guard(err, 'The examiner result could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    if (!overview) return
    exportCsv(
      'atheris-reg-liquidity-deposit-concentration-demo.csv',
      ['Institution', 'Code', 'Total deposits (MRD m)', 'Top 10 %', 'Largest depositor %', 'Retail %', 'Wholesale %', 'Status'],
      overview.depositConcentration.map((d) => [
        d.institutionName, d.institutionCode, d.totalDepositsMM, d.top10Pct, d.largestDepositorPct, d.retailPct, d.wholesalePct, d.status,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const institutionFilter = (
    <Select
      aria-label="Filter by institution"
      value={fInstitution}
      onChange={(e) => setFInstitution(e.target.value)}
      placeholder="All institutions (portfolio)"
      options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
    />
  )

  if (!overview || !transactions) {
    return (
      <div>
        <PageHeader title="Liquidity & Treasury" subtitle="Portfolio liquidity position and treasury supervision" />
        <LoadingSkeleton variant="cards" rows={6} />
      </div>
    )
  }

  const k = overview.kpis

  return (
    <div>
      <PageHeader
        title="Liquidity & Treasury"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Portfolio liquidity position as of {formatDate(overview.reportingDate)}</span>
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
              Export deposit concentration
            </Button>
            <Button variant="outline" iconLeft={<FlaskConical className="h-3.5 w-3.5" />} onClick={() => navigate('/app/prudential/stress-testing')}>
              Stress testing
            </Button>
          </>
        }
      />

      {/* KPI cards (Spec §8.3) */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Liquidity position (HQLA)" value={`${k.hqlaMM} m`} icon={Coins} tone="blue" footer="High-quality liquid assets, MRD m (demo)" />
        <StatCard
          label="Liquidity coverage ratio"
          value={`${k.lcrPct}%`}
          icon={Droplets}
          tone={Number(k.lcrPct) < 100 ? 'red' : Number(k.lcrPct) < 110 ? 'orange' : 'green'}
          trend={{
            direction: k.lcrTrendDirection === 'improving' ? 'up' : 'down',
            value: k.lcrTrendDirection,
            positive: k.lcrTrendDirection === 'improving',
            suffix: 'vs prior demo quarter',
          }}
          footer="Demo amber 110 / red 100"
          onClick={() => navigate('/app/prudential/indicators?indicator=LCR')}
        />
        <StatCard
          label="Net stable funding ratio"
          value={`${k.nsfrPct}%`}
          icon={Scale}
          tone={Number(k.nsfrPct) < 100 ? 'red' : Number(k.nsfrPct) < 105 ? 'orange' : 'green'}
          footer="Demo amber 105 / red 100"
          onClick={() => navigate('/app/prudential/indicators?indicator=NSFR')}
        />
        <StatCard
          label="Deposit concentration"
          value={`${k.depositConcentrationPct}%`}
          icon={Building}
          tone={Number(k.depositConcentrationPct) > 25 ? 'red' : Number(k.depositConcentrationPct) > 20 ? 'orange' : 'green'}
          footer="Deposit-weighted largest depositor (demo)"
          onClick={() => setTab('overview')}
        />
        <StatCard
          label="FX open position"
          value={`${k.fxOpenPositionPct}%`}
          icon={Activity}
          tone={Number(k.fxOpenPositionPct) > 20 ? 'red' : Number(k.fxOpenPositionPct) > 10 ? 'orange' : 'green'}
          footer="Of total capital; demo limit 10%"
          onClick={() => setTab('fx')}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={setTab}
        items={[
          {
            id: 'overview',
            label: 'Liquidity Overview',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <Card className="xl:col-span-2">
                    <CardHeader title="Liquidity trend — LCR & NSFR" subtitle="Asset-weighted demo averages across 8 quarters" />
                    <CardBody>
                      <LiquidityTrendChart data={overview.trend} />
                      <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader title="Liquid asset composition" subtitle="HQLA by Basel-style level (demo)" />
                    <CardBody>
                      <LiquidAssetsPie rows={overview.liquidAssets} />
                    </CardBody>
                  </Card>
                </div>
                <Card>
                  <CardHeader
                    title="Deposit concentration"
                    subtitle="Largest-depositor share vs the demo threshold rule (amber above 20%, red above 25%)"
                  />
                  <CardBody>
                    <DepositConcentrationChart rows={overview.depositConcentration} />
                  </CardBody>
                </Card>
                <DataTable<DepositConcentrationRow>
                  columns={depositColumns}
                  data={overview.depositConcentration}
                  title="Deposit concentration schedule"
                  getRowId={(d) => d.institutionId}
                  initialPageSize={8}
                  emptyTitle="No deposit data"
                  emptyDescription="No demo deposit records for the current filter."
                />
              </div>
            ),
          },
          {
            id: 'funding',
            label: 'Funding Profile',
            content: (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader title="Funding maturity profile" subtitle="Assets vs liabilities by repricing bucket, with cumulative gap (demo)" />
                  <CardBody>
                    <FundingMaturityChart rows={overview.fundingMaturity} />
                    <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
                  </CardBody>
                </Card>
                <DataTable<FundingMaturityRow>
                  columns={fundingColumns}
                  data={overview.fundingMaturity}
                  title="Maturity ladder"
                  getRowId={(r) => r.bucket}
                  initialPageSize={6}
                  emptyTitle="No maturity data"
                  emptyDescription="No demo maturity ladder available."
                />
              </div>
            ),
          },
          {
            id: 'alm',
            label: 'Asset-Liability Management',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader title="Liquid asset composition" subtitle="HQLA levels and share (demo)" />
                    <CardBody>
                      <LiquidAssetsPie rows={overview.liquidAssets} />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader title="Structural funding position" subtitle="Maturity gap summary (demo)" />
                    <CardBody>
                      <AlmSummary rows={overview.fundingMaturity} />
                    </CardBody>
                  </Card>
                </div>
                <DataTable<LiquidityOverview['liquidAssets'][number]>
                  columns={liquidAssetColumns}
                  data={overview.liquidAssets}
                  title="Liquid asset schedule"
                  getRowId={(r) => r.assetClass}
                  initialPageSize={6}
                  emptyTitle="No liquid assets"
                  emptyDescription="No demo liquid-asset records available."
                />
              </div>
            ),
          },
          {
            id: 'treasury',
            label: 'Treasury Operations',
            count: transactions.filter((t) => !t.examinerResult).length,
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <DataTable<TreasuryTransaction>
                  columns={treasuryColumns(openTransaction)}
                  data={transactions}
                  title="Treasury examination workspace"
                  getRowId={(t) => t.id}
                  initialPageSize={8}
                  emptyTitle="No treasury transactions"
                  emptyDescription="No demo transactions for the current filter."
                  rowActions={(row) => (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => openTransaction(row)}>
                      {row.examinerResult ? 'View result' : 'Examine'}
                    </Button>
                  )}
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'fx',
            label: 'Foreign Exchange',
            content: (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader title="Currency exposure" subtitle={`Net open positions vs the demo ${overview.currencyExposure[0]?.limitPct ?? '10'}% of-capital limit`} />
                  <CardBody>
                    <CurrencyExposureChart rows={overview.currencyExposure} />
                  </CardBody>
                </Card>
                <DataTable<CurrencyExposureRow>
                  columns={fxColumns}
                  data={overview.currencyExposure}
                  title="FX position schedule"
                  getRowId={(r) => r.currency}
                  initialPageSize={6}
                  emptyTitle="No FX positions"
                  emptyDescription="No demo currency positions available."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'stress',
            label: 'Stress Testing',
            content: (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader
                    title="Liquidity stress testing"
                    subtitle="Funding and liquidity legs of the demo scenario runs"
                    action={
                      <button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:underline" onClick={() => navigate('/app/prudential/stress-testing')}>
                        Open stress testing →
                      </button>
                    }
                  />
                  <CardBody>
                    <div className="flex flex-col gap-3">
                      <div className="rounded-lg border border-line bg-page p-3">
                        <p className="text-xs font-semibold text-ink">Northstar Merchant Bank — idiosyncratic funding stress</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                          The amber LCR story (SUB-2026-0144 → EXC-2026-011 → EWA-2026-011) is stress-tested under scenario
                          SCN-2026-003 (run RUN-2026-004, awaiting reviewer approval): LCR falls from 104.2% to 82.6% under a
                          25% wholesale funding run-off — below the demo 100% minimum.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate('/app/prudential/stress-testing?run=RUN-2026-004')}>
                            Open RUN-2026-004 →
                          </Button>
                          <Button size="sm" variant="ghost" iconLeft={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => navigate('/app/early-warnings?reference=EWA-2026-011')}>
                            EWA-2026-011
                          </Button>
                          <Button size="sm" variant="ghost" iconLeft={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => navigate('/app/returns?search=SUB-2026-0144')}>
                            SUB-2026-0144
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-lg border border-line bg-page p-3">
                        <p className="text-xs font-semibold text-ink">Portfolio — severe macro-financial shock</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                          Approved run RUN-2026-003 stresses LCR across the portfolio: three demo institutions fall below the
                          100% minimum, led by Vanguard Regional Bank (88.0% → 54.2%) inside the ENF-2026-002 restructuring
                          perimeter. Illustrative demo calculation — never an official regulatory stress-test result.
                        </p>
                        <div className="mt-2">
                          <Button size="sm" variant="outline" onClick={() => navigate('/app/prudential/stress-testing?run=RUN-2026-003')}>
                            Open RUN-2026-003 →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            id: 'exceptions',
            label: 'Exceptions',
            count: overview.exceptions.filter((e) => e.status !== 'Cleared').length,
            content: (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader title="Liquidity exceptions" subtitle="Live prudential exceptions for liquidity ratios (demo)" />
                  <CardBody>
                    {overview.exceptions.length === 0 ? (
                      <EmptyState title="No liquidity exceptions" description="No demo liquidity-ratio exceptions for the current filter." icon={<TriangleExclamationPoint className="h-7 w-7" />} />
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {overview.exceptions.map((e) => (
                          <ExceptionNoteCard key={e.exceptionRef} note={e} navigate={navigate} />
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
        ]}
      />

      {/* Treasury examination workspace drawer (§8.3) */}
      <Drawer
        open={activeTrx !== null}
        onClose={() => setActiveTrx(null)}
        title={activeTrx ? `Treasury transaction ${activeTrx.reference}` : ''}
        width="520px"
        footer={
          activeTrx ? (
            <>
              <Button variant="ghost" onClick={() => setActiveTrx(null)}>Close</Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!canExamine}
                title={canExamine ? 'Record examiner result (record-fieldwork demo action)' : 'Requires the record-fieldwork demo action (Spec §19)'}
                onClick={() => void submitResult()}
              >
                {activeTrx.examinerResult ? 'Update result' : 'Record result'}
              </Button>
            </>
          ) : undefined
        }
      >
        {activeTrx && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-page p-3">
              <p className="overline text-ink-tertiary">Transaction</p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div><dt className="text-ink-tertiary">Reference</dt><dd className="font-mono font-medium text-ink">{activeTrx.reference}</dd></div>
                <div><dt className="text-ink-tertiary">Trade date</dt><dd className="text-ink">{formatDate(activeTrx.tradeDate)}</dd></div>
                <div><dt className="text-ink-tertiary">Instrument</dt><dd className="text-ink">{activeTrx.instrument}</dd></div>
                <div><dt className="text-ink-tertiary">Currency</dt><dd className="font-mono text-ink">{activeTrx.currency}</dd></div>
                <div><dt className="text-ink-tertiary">Counterparty</dt><dd className="text-ink">{activeTrx.counterparty}</dd></div>
                <div><dt className="text-ink-tertiary">Institution</dt><dd className="text-ink">{activeTrx.institutionName}</dd></div>
                <div><dt className="text-ink-tertiary">Amount</dt><dd className="font-mono text-ink">{activeTrx.amountMM} MRD m</dd></div>
                <div><dt className="text-ink-tertiary">Dealing limit</dt><dd className="font-mono text-ink">{activeTrx.dealingLimitMM} MRD m ({activeTrx.utilisationPct}%)</dd></div>
                <div><dt className="text-ink-tertiary">Approval</dt><dd className="text-ink">{activeTrx.approval}</dd></div>
                <div>
                  <dt className="text-ink-tertiary">Settlement</dt>
                  <dd className="flex items-center gap-1.5">
                    <StatusBadge status={activeTrx.settlement} tone={SETTLEMENT_TONES[activeTrx.settlement]} />
                    <span className="text-ink-secondary">{formatDate(activeTrx.settlementDate)}</span>
                  </dd>
                </div>
              </dl>
            </div>
            {Number(activeTrx.utilisationPct) > 100 && (
              <p className="rounded-md bg-tint-red px-2.5 py-2 text-[11px] font-medium text-error">
                Dealt beyond the demo dealing limit ({activeTrx.utilisationPct}% utilisation) — approval evidence required.
              </p>
            )}
            <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
              <p className="overline text-ink-tertiary">Examiner result</p>
              <Select
                label="Result"
                value={result}
                onChange={(e) => setResult(e.target.value as NonNullable<TreasuryTransaction['examinerResult']>)}
                options={['Satisfactory', 'Exception', 'Escalate'].map((r) => ({ value: r, label: r }))}
              />
              <TextArea
                label="Examiner note"
                required
                rows={3}
                error={resultError}
                value={resultNote}
                onChange={(e) => { setResultNote(e.target.value); setResultError('') }}
                placeholder="Summarise limit compliance, approvals and settlement evidence (demo)…"
              />
              {activeTrx.examinerResult && (
                <p className="text-[11px] text-ink-secondary">
                  Previously recorded <StatusBadge status={activeTrx.examinerResult} tone={RESULT_TONES[activeTrx.examinerResult]} />
                  {activeTrx.examinerName ? ` by ${activeTrx.examinerName}` : ''}
                  {activeTrx.examinedAt ? ` on ${formatDate(activeTrx.examinedAt)}` : ''} — saved in prototype session.
                </p>
              )}
              {!canExamine && (
                <p className="rounded-md bg-tint-orange px-2 py-1.5 text-[11px] text-warning">
                  The “{actor.actorRole}” demo role cannot record examiner results (Spec §19). Switch to an examiner-tier demo role to try the workflow.
                </p>
              )}
            </div>
            <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function ExceptionNoteCard({ note, navigate }: { note: LiquidityExceptionNote; navigate: (to: string) => void }) {
  return (
    <li className="rounded-lg border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-semibold text-primary">{note.exceptionRef}</span>
        <StatusBadge status={note.severity} tone={note.severity === 'Red' ? 'overdue' : 'fieldwork'} />
        <StatusBadge status={note.status} tone={note.status === 'Cleared' ? 'completed' : note.status === 'Escalated' ? 'reporting' : 'planning'} />
        <span className="font-mono text-[11px] text-ink-secondary">{note.ratioCode} {note.observed} vs {note.threshold}</span>
        <span className="ml-auto text-xs font-medium text-ink">{note.institutionName}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{note.note}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {note.relatedAlertRef && (
          <button type="button" className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue" onClick={() => navigate(`/app/early-warnings?reference=${note.relatedAlertRef}`)}>
            {note.relatedAlertRef} →
          </button>
        )}
        {note.relatedSubmissionRef && (
          <button type="button" className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue" onClick={() => navigate(`/app/returns?search=${note.relatedSubmissionRef}`)}>
            {note.relatedSubmissionRef} →
          </button>
        )}
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const depositColumns: Array<ColumnDef<DepositConcentrationRow, unknown>> = [
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
  { accessorKey: 'totalDepositsMM', header: 'Deposits (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.totalDepositsMM}</span> },
  { accessorKey: 'top10Pct', header: 'Top 10 %', cell: ({ row }) => <span className="font-mono text-xs">{row.original.top10Pct}</span> },
  {
    accessorKey: 'largestDepositorPct',
    header: 'Largest depositor %',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.largestDepositorPct) > 25 ? 'text-error' : Number(row.original.largestDepositorPct) > 20 ? 'text-warning' : 'text-ink')}>
        {row.original.largestDepositorPct}
      </span>
    ),
  },
  { accessorKey: 'retailPct', header: 'Retail %', cell: ({ row }) => <span className="font-mono text-xs">{row.original.retailPct}</span> },
  { accessorKey: 'wholesalePct', header: 'Wholesale %', cell: ({ row }) => <span className="font-mono text-xs">{row.original.wholesalePct}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={DC_TONES[row.original.status]} /> },
]

const fundingColumns: Array<ColumnDef<FundingMaturityRow, unknown>> = [
  { accessorKey: 'bucket', header: 'Bucket' },
  { accessorKey: 'assetsMM', header: 'Assets (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.assetsMM}</span> },
  { accessorKey: 'liabilitiesMM', header: 'Liabilities (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.liabilitiesMM}</span> },
  {
    accessorKey: 'gapMM',
    header: 'Gap',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.gapMM) < 0 ? 'text-error' : 'text-success')}>{row.original.gapMM}</span>
    ),
  },
  {
    accessorKey: 'cumulativeGapMM',
    header: 'Cumulative gap',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs', Number(row.original.cumulativeGapMM) < 0 ? 'font-semibold text-error' : 'text-ink-secondary')}>{row.original.cumulativeGapMM}</span>
    ),
  },
]

const liquidAssetColumns: Array<ColumnDef<LiquidityOverview['liquidAssets'][number], unknown>> = [
  { accessorKey: 'assetClass', header: 'Asset class' },
  {
    accessorKey: 'hqlaLevel',
    header: 'HQLA level',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.hqlaLevel}
        tone={row.original.hqlaLevel === 'Level 1' ? 'active' : row.original.hqlaLevel === 'Level 2A' ? 'planning' : row.original.hqlaLevel === 'Level 2B' ? 'fieldwork' : 'draft'}
      />
    ),
  },
  { accessorKey: 'amountMM', header: 'Amount (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.amountMM}</span> },
  { accessorKey: 'pctOfHqla', header: '% of HQLA', cell: ({ row }) => <span className="font-mono text-xs">{row.original.pctOfHqla}</span> },
]

const fxColumns: Array<ColumnDef<CurrencyExposureRow, unknown>> = [
  { accessorKey: 'currency', header: 'Currency', cell: ({ row }) => <span className="font-mono text-xs font-semibold text-ink">{row.original.currency}</span> },
  { accessorKey: 'longMM', header: 'Long (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.longMM}</span> },
  { accessorKey: 'shortMM', header: 'Short (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.shortMM}</span> },
  {
    accessorKey: 'netOpenMM',
    header: 'Net open',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.netOpenMM) < 0 ? 'text-warning' : 'text-ink')}>{row.original.netOpenMM}</span>
    ),
  },
  {
    accessorKey: 'netOpenPctOfCapital',
    header: '% of capital / limit',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        <span className="font-semibold text-ink">{row.original.netOpenPctOfCapital}%</span>
        <span className="text-ink-tertiary"> / {row.original.limitPct}%</span>
      </span>
    ),
  },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={FX_TONES[row.original.status]} /> },
]

const treasuryColumns = (openTransaction: (t: TreasuryTransaction) => void): Array<ColumnDef<TreasuryTransaction, unknown>> => [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <button type="button" className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline" onClick={() => openTransaction(row.original)}>
        {row.original.reference}
      </button>
    ),
  },
  {
    accessorKey: 'institutionName',
    header: 'Institution',
    cell: ({ row }) => <span className="text-xs text-ink-secondary">{row.original.institutionName}</span>,
  },
  { accessorKey: 'tradeDate', header: 'Trade date', cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatDate(row.original.tradeDate)}</span> },
  {
    accessorKey: 'instrument',
    header: 'Instrument / currency',
    cell: ({ row }) => (
      <div>
        <p className="text-xs text-ink">{row.original.instrument}</p>
        <p className="font-mono text-[10px] text-ink-secondary">{row.original.currency} · {row.original.counterparty}</p>
      </div>
    ),
  },
  { accessorKey: 'amountMM', header: 'Amount (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.amountMM}</span> },
  {
    accessorKey: 'utilisationPct',
    header: 'Limit utilisation',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.utilisationPct) > 100 ? 'text-error' : Number(row.original.utilisationPct) > 85 ? 'text-warning' : 'text-ink')}>
        {row.original.utilisationPct}%
      </span>
    ),
  },
  { accessorKey: 'settlement', header: 'Settlement', cell: ({ row }) => <StatusBadge status={row.original.settlement} tone={SETTLEMENT_TONES[row.original.settlement]} /> },
  {
    accessorKey: 'examinerResult',
    header: 'Examiner result',
    cell: ({ row }) =>
      row.original.examinerResult ? (
        <StatusBadge status={row.original.examinerResult} tone={RESULT_TONES[row.original.examinerResult]} />
      ) : (
        <StatusBadge status="Not examined" tone="planning" />
      ),
  },
]

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function LiquidityTrendChart({ data }: { data: LiquidityOverview['trend'] }) {
  const latest = data[data.length - 1]
  return (
    <div role="img" aria-label={`Liquidity trend. Latest period ${latest?.periodLabel ?? 'n/a'}: LCR ${latest?.lcrPct ?? 'n/a'}%, NSFR ${latest?.nsfrPct ?? 'n/a'}%. Illustrative demo figures.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} unit="%" width={52} domain={[80, 200]} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={14} />
          <Line type="monotone" dataKey="lcrPct" name="LCR" stroke={CHART_COLORS.primarySurface} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="nsfrPct" name="NSFR" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const HQLA_COLORS: Record<string, string> = {
  'Level 1': CHART_COLORS.primary,
  'Level 2A': CHART_COLORS.primarySurface,
  'Level 2B': CHART_COLORS.accent,
  'Non-HQLA': CHART_COLORS.axis,
}

function LiquidAssetsPie({ rows }: { rows: LiquidityOverview['liquidAssets'] }) {
  const data = rows.map((r) => ({ name: r.assetClass, value: Number(r.amountMM), level: r.hqlaLevel }))
  return (
    <div role="img" aria-label={`Liquid assets: ${rows.map((r) => `${r.assetClass} (${r.hqlaLevel}) ${r.pctOfHqla}%`).join(', ')}. Illustrative demo data.`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.assetClass} fill={HQLA_COLORS[r.hqlaLevel]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function DepositConcentrationChart({ rows }: { rows: DepositConcentrationRow[] }) {
  const data = rows.map((r) => ({ name: r.institutionCode, largest: Number(r.largestDepositorPct), top10: Number(r.top10Pct) }))
  return (
    <div role="img" aria-label={`Deposit concentration: ${rows.map((r) => `${r.institutionName} largest depositor ${r.largestDepositorPct}%`).join(', ')}. Illustrative demo data.`} className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="largest" name="Largest depositor %" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.institutionId} fill={r.status === 'Red' ? CHART_COLORS.error : r.status === 'Amber' ? CHART_COLORS.warning : CHART_COLORS.primarySurface} />
            ))}
          </Bar>
          <Bar dataKey="top10" name="Top 10 %" fill={CHART_COLORS.grid} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function FundingMaturityChart({ rows }: { rows: FundingMaturityRow[] }) {
  const data = rows.map((r) => ({ bucket: r.bucket, assets: Number(r.assetsMM), liabilities: Number(r.liabilitiesMM), cumulative: Number(r.cumulativeGapMM) }))
  return (
    <div role="img" aria-label={`Funding maturity profile: ${rows.map((r) => `${r.bucket} gap ${r.gapMM} million, cumulative ${r.cumulativeGapMM} million`).join('; ')}. Illustrative demo data.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: CHART_COLORS.axis }} angle={-18} textAnchor="end" interval={0} height={46} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="assets" name="Assets" fill={CHART_COLORS.primarySurface} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="liabilities" name="Liabilities" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line type="monotone" dataKey="cumulative" name="Cumulative gap" stroke={CHART_COLORS.error} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function CurrencyExposureChart({ rows }: { rows: CurrencyExposureRow[] }) {
  const data = rows.map((r) => ({ currency: r.currency, long: Number(r.longMM), short: -Number(r.shortMM), net: Number(r.netOpenMM) }))
  return (
    <div role="img" aria-label={`Currency exposure: ${rows.map((r) => `${r.currency} net open ${r.netOpenMM} million, ${r.netOpenPctOfCapital}% of capital`).join('; ')}. Illustrative demo data.`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="currency" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="long" name="Long" stackId="pos" fill={CHART_COLORS.primarySurface} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="short" name="Short" stackId="neg" fill={CHART_COLORS.warning} radius={[0, 0, 3, 3]} isAnimationActive={false} />
          <Bar dataKey="net" name="Net open" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AlmSummary({ rows }: { rows: FundingMaturityRow[] }) {
  const shortTerm = rows.slice(0, 3)
  const negative = shortTerm.filter((r) => Number(r.gapMM) < 0)
  const cumulativeFinal = rows[rows.length - 1]
  return (
    <div className="flex flex-col gap-3">
      <div className={cx('rounded-lg border px-3 py-2.5', negative.length > 0 ? 'border-warning/40 bg-tint-orange' : 'border-line bg-page')}>
        <p className="text-xs font-semibold text-ink">Short-term mismatch (≤ 30 days)</p>
        <p className="mt-1 font-mono text-lg font-bold text-ink">
          {shortTerm.reduce((a, r) => a + Number(r.gapMM), 0).toFixed(1)} <span className="text-xs text-ink-secondary">MRD m</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
          {negative.length > 0
            ? `${negative.length} of 3 near-term buckets are liability-heavy in the demo ladder — the standard maturity-transform profile; HQLA covers the 30-day horizon (LCR).`
            : 'Near-term buckets are asset-heavy in the demo ladder.'}
        </p>
      </div>
      <div className="rounded-lg border border-line bg-page px-3 py-2.5">
        <p className="text-xs font-semibold text-ink">Cumulative gap (1 year+)</p>
        <p className="mt-1 font-mono text-lg font-bold text-success">
          {cumulativeFinal ? cumulativeFinal.cumulativeGapMM : '0.0'} <span className="text-xs text-ink-secondary">MRD m</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
          Long-dated assets exceed liabilities across the demo portfolio; NSFR above the 100% demo minimum at every institution except Vanguard (94.2%, inside the ENF-2026-002 perimeter).
        </p>
      </div>
      <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
    </div>
  )
}
