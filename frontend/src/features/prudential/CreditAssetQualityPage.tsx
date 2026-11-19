import { useCallback, useEffect, useState } from 'react'
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
  Building,
  CreditCard,
  Download,
  FileSearch,
  Landmark,
  RefreshCw,
  Scale,
  ShieldCheck,
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
import { examinationService } from '@/services/mock/MockExaminationService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { creditQualityService } from '@/services/mock/MockPrudentialService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  AgeingBucketRow,
  CollateralRow,
  CreditOverview,
  LargeExposureRow,
  LoanClassificationRow,
  LoanGrade,
  LoanSample,
  RelatedPartyLoanRow,
  RestructuredLoanRow,
  SectorExposureRow,
  TopBorrowerRow,
} from '@/types/prudential'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Credit & Asset Quality (Spec §8.2) — `/app/prudential/credit`. KPI cards
 * (gross loans, NPL balance, NPL ratio, provision coverage, concentrated
 * exposures) and the seven §8.2 tabs: Portfolio Overview, Loan
 * Classification, Impairment & Provisioning, Large Exposures, Related-Party
 * Lending, Collateral and Credit Examination with the loan sample review
 * workspace (examiner conclusions gated by `record-fieldwork`, §19).
 * Story: Meridian QAR-02 (SUB-2026-0145, NPL 6.9% → EWA-2026-013), the two
 * large exposures under watch, Vanguard related-party concentrations from
 * EXM-2026-012 → FND-2026-033, Delta provisioning (EXC-2026-018).
 * All figures are illustrative demo data (Spec §17.5).
 */

const DEMO_NOTE =
  'All credit figures, classifications and thresholds are illustrative demo values — not approved regulatory rules.'

const GRADE_TONES: Record<LoanGrade, StatusTone> = {
  Pass: 'active',
  'Special Mention': 'planning',
  Substandard: 'fieldwork',
  Doubtful: 'reporting',
  Loss: 'overdue',
}

const EXPOSURE_TONES: Record<LargeExposureRow['status'], StatusTone> = {
  'Within limit': 'active',
  'Near limit': 'fieldwork',
  Breach: 'overdue',
}

const RP_TONES: Record<RelatedPartyLoanRow['status'], StatusTone> = {
  Current: 'active',
  'Under review': 'fieldwork',
  Exception: 'overdue',
}

const CONCLUSION_TONES: Record<NonNullable<LoanSample['examinerConclusion']>, StatusTone> = {
  Satisfactory: 'active',
  'Exception noted': 'fieldwork',
  'Escalate to finding': 'overdue',
}

const GRADE_COLORS: Record<LoanGrade, string> = {
  Pass: CHART_COLORS.success,
  'Special Mention': CHART_COLORS.primarySurface,
  Substandard: CHART_COLORS.accent,
  Doubtful: CHART_COLORS.warning,
  Loss: CHART_COLORS.error,
}

export function CreditAssetQualityPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canConclude = can(actor.actorRole, 'record-fieldwork')

  const [overview, setOverview] = useState<CreditOverview | null>(null)
  const [samples, setSamples] = useState<LoanSample[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fInstitution, setFInstitution] = useState(searchParams.get('institution') ?? '')
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'portfolio')
  const [busy, setBusy] = useState(false)

  // Loan sample review drawer (§8.2 "Loan sample review screen")
  const [activeSample, setActiveSample] = useState<LoanSample | null>(null)
  const [conclusion, setConclusion] = useState<NonNullable<LoanSample['examinerConclusion']>>('Satisfactory')
  const [conclusionNote, setConclusionNote] = useState('')
  const [conclusionError, setConclusionError] = useState('')

  const load = useCallback(async () => {
    const [ov, sampleList, instPage] = await Promise.all([
      creditQualityService.overview({ institutionId: fInstitution || undefined }),
      creditQualityService.listLoanSamples({ institutionId: fInstitution || undefined }),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setOverview(ov)
    setSamples(sampleList)
    setInstitutions(instPage.items)
  }, [fInstitution])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const openSample = (sample: LoanSample) => {
    setActiveSample(sample)
    setConclusion(sample.examinerConclusion ?? 'Satisfactory')
    setConclusionNote(sample.conclusionNote ?? '')
    setConclusionError('')
  }

  const submitConclusion = async () => {
    if (!activeSample) return
    if (!conclusionNote.trim()) {
      setConclusionError('A conclusion note is required (demo form).')
      return
    }
    setBusy(true)
    try {
      const updated = await creditQualityService.concludeLoanSample(activeSample.id, conclusion, conclusionNote.trim(), actor)
      setActiveSample(null)
      await load()
      toast.success('Saved in prototype session', `Loan sample ${updated?.reference ?? ''} concluded — ${conclusion}.`)
    } catch (err) {
      guard(err, 'The conclusion could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const openExamination = async (reference: string) => {
    const exam = await examinationService.getByReference(reference)
    if (exam) navigate(`/app/examinations/${exam.id}`)
    else navigate('/app/examinations')
  }

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    if (!overview) return
    exportCsv(
      'atheris-reg-credit-large-exposures-demo.csv',
      ['Institution', 'Counterparty', 'Exposure (MRD m)', '% of Tier 1', 'Limit %', 'Utilisation %', 'Collateral (MRD m)', 'Status'],
      overview.largeExposures.map((l) => [
        l.institutionName, l.counterparty, l.exposureMM, l.pctOfTier1, l.limitPct, l.utilisationPct, l.collateralMM, l.status,
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

  if (!overview || !samples) {
    return (
      <div>
        <PageHeader title="Credit & Asset Quality" subtitle="Portfolio credit risk and asset-quality supervision" />
        <LoadingSkeleton variant="cards" rows={6} />
      </div>
    )
  }

  const k = overview.kpis

  return (
    <div>
      <PageHeader
        title="Credit & Asset Quality"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Portfolio asset quality as of {formatDate(overview.reportingDate)}</span>
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
              Export large exposures
            </Button>
            <Button variant="outline" iconLeft={<Building className="h-3.5 w-3.5" />} onClick={() => navigate('/app/prudential/capital')}>
              Capital adequacy
            </Button>
          </>
        }
      />

      {/* KPI cards (Spec §8.2) */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Gross loans" value={`${k.grossLoansMM} m`} icon={Landmark} tone="blue" footer="MRD millions (demo)" />
        <StatCard label="NPL balance" value={`${k.nplBalanceMM} m`} icon={TriangleExclamationPoint} tone="orange" footer="90+ days or restructured NPL (demo)" />
        <StatCard
          label="NPL ratio"
          value={`${k.nplRatioPct}%`}
          icon={CreditCard}
          tone={Number(k.nplRatioPct) > 8 ? 'red' : Number(k.nplRatioPct) > 6 ? 'orange' : 'green'}
          footer="Demo amber 6.0 / red 8.0"
          onClick={() => navigate('/app/prudential/indicators?indicator=NPL')}
        />
        <StatCard
          label="Provision coverage"
          value={`${k.provisionCoveragePct}%`}
          icon={ShieldCheck}
          tone={Number(k.provisionCoveragePct) < 80 ? 'red' : Number(k.provisionCoveragePct) < 100 ? 'orange' : 'green'}
          footer="Provisions ÷ NPLs (demo)"
          onClick={() => navigate('/app/prudential/indicators?indicator=PC')}
        />
        <StatCard
          label="Concentrated exposures"
          value={k.concentratedExposures}
          icon={Scale}
          tone={k.concentratedExposures > 0 ? 'red' : 'green'}
          footer="Near or above the demo single-obligor limit"
          onClick={() => setTab('large-exposures')}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={setTab}
        items={[
          {
            id: 'portfolio',
            label: 'Portfolio Overview',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader title="Loan portfolio by sector" subtitle="Outstanding exposure and sector NPL rate (demo)" />
                    <CardBody>
                      <SectorExposureChart rows={overview.sectorExposures} />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader title="Performing / non-performing distribution" subtitle="Five-grade demo classification scale" />
                    <CardBody>
                      <ClassificationChart rows={overview.classifications} />
                    </CardBody>
                  </Card>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader title="Ageing & delinquency" subtitle="Outstanding by past-due bucket (demo)" />
                    <CardBody>
                      <AgeingBars rows={overview.ageing} />
                    </CardBody>
                  </Card>
                  <DataTable<TopBorrowerRow>
                    columns={topBorrowerColumns}
                    data={overview.topBorrowers}
                    title="Top borrowers"
                    getRowId={(r) => r.id}
                    initialPageSize={6}
                    emptyTitle="No top borrowers"
                    emptyDescription="This demo institution has no loan book — Crestline operates a payment-bank model."
                  />
                </div>
                <DataTable<RestructuredLoanRow>
                  columns={restructuredColumns}
                  data={overview.restructured}
                  title="Restructured loans"
                  getRowId={(r) => r.id}
                  initialPageSize={5}
                  emptyTitle="No restructured loans"
                  emptyDescription="No demo restructurings for the current filter."
                />
              </div>
            ),
          },
          {
            id: 'classification',
            label: 'Loan Classification',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <DataTable<LoanClassificationRow>
                  columns={classificationColumns}
                  data={overview.classifications}
                  title="Loan classification schedule"
                  getRowId={(r) => r.classification}
                  initialPageSize={5}
                  emptyTitle="No classification data"
                  emptyDescription="No demo loan book for the current filter."
                />
                <DataTable<AgeingBucketRow>
                  columns={ageingColumns}
                  data={overview.ageing}
                  title="Ageing & delinquency schedule"
                  getRowId={(r) => r.bucket}
                  initialPageSize={5}
                  emptyTitle="No ageing data"
                  emptyDescription="No demo loan book for the current filter."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'provisioning',
            label: 'Impairment & Provisioning',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <Card>
                  <CardHeader title="Provision movement" subtitle="Four demo quarters converging on the current coverage ratio" />
                  <CardBody>
                    <ProvisionMovementChart rows={overview.provisionMovement} />
                  </CardBody>
                </Card>
                <DataTable<ProvisionRow>
                  columns={provisionColumns}
                  data={overview.provisionMovement}
                  title="Provision movement schedule"
                  getRowId={(r) => r.periodLabel}
                  initialPageSize={4}
                  emptyTitle="No provision history"
                  emptyDescription="No demo loan book for the current filter."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'large-exposures',
            label: 'Large Exposures',
            count: overview.largeExposures.length,
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <DataTable<LargeExposureRow>
                  columns={largeExposureColumns}
                  data={overview.largeExposures}
                  title="Large exposures vs the demo single-obligor limit (20% of Tier 1)"
                  getRowId={(r) => r.id}
                  initialPageSize={8}
                  emptyTitle="No large exposures"
                  emptyDescription="No demo large-exposure records for the current filter."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'related-party',
            label: 'Related-Party Lending',
            count: overview.relatedParty.filter((r) => r.status === 'Exception').length,
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <DataTable<RelatedPartyLoanRow>
                  columns={relatedPartyColumns}
                  data={overview.relatedParty}
                  title="Related-party lending register"
                  getRowId={(r) => r.id}
                  initialPageSize={6}
                  emptyTitle="No related-party lending"
                  emptyDescription="No demo related-party records for the current filter."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'collateral',
            label: 'Collateral',
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <DataTable<CollateralRow>
                  columns={collateralColumns(new Map(institutions.map((i) => [i.id, i.tradingName])))}
                  data={overview.collateral}
                  title="Collateral register"
                  getRowId={(r) => r.id}
                  initialPageSize={8}
                  emptyTitle="No collateral records"
                  emptyDescription="No demo collateral for the current filter."
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
          {
            id: 'credit-examination',
            label: 'Credit Examination',
            count: samples.filter((s) => !s.examinerConclusion).length,
            content: (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">{institutionFilter}</div>
                <Card>
                  <CardHeader title="Examination sample coverage" subtitle="Loan-file sampling under live and completed examinations (demo)" />
                  <CardBody>
                    {overview.examinationSummaries.length === 0 ? (
                      <EmptyState title="No credit examinations" description="No demo examination is drawing loan samples for the current filter." icon={<FileSearch className="h-7 w-7" />} />
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {overview.examinationSummaries.map((s) => (
                          <li key={s.examinationRef} className="rounded-lg border border-line px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
                                onClick={() => void openExamination(s.examinationRef)}
                              >
                                {s.examinationRef} →
                              </button>
                              <span className="text-xs font-medium text-ink">{s.institutionName}</span>
                              <StatusBadge status={s.status} />
                              <span className="ml-auto text-[11px] text-ink-secondary">
                                {s.samplesConcluded}/{s.samplesDrawn} samples concluded · {s.exceptions} exception(s)
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
                <DataTable<LoanSample>
                  columns={loanSampleColumns(openSample)}
                  data={samples}
                  title="Loan sample review"
                  getRowId={(s) => s.id}
                  initialPageSize={8}
                  emptyTitle="No loan samples"
                  emptyDescription="No demo loan samples drawn for the current filter."
                  rowActions={(row) => (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => openSample(row)}>
                      {row.examinerConclusion ? 'View conclusion' : 'Review sample'}
                    </Button>
                  )}
                />
                <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
              </div>
            ),
          },
        ]}
      />

      {/* Loan sample review drawer (Spec §8.2) */}
      <Drawer
        open={activeSample !== null}
        onClose={() => setActiveSample(null)}
        title={activeSample ? `Loan sample ${activeSample.reference}` : ''}
        width="520px"
        footer={
          activeSample ? (
            <>
              <Button variant="ghost" onClick={() => setActiveSample(null)}>Close</Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!canConclude}
                title={canConclude ? 'Record conclusion (record-fieldwork demo action)' : 'Requires the record-fieldwork demo action (Spec §19)'}
                onClick={() => void submitConclusion()}
              >
                {activeSample.examinerConclusion ? 'Update conclusion' : 'Record conclusion'}
              </Button>
            </>
          ) : undefined
        }
      >
        {activeSample && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-page p-3">
              <p className="overline text-ink-tertiary">Facility & borrower</p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div><dt className="text-ink-tertiary">Facility reference</dt><dd className="font-mono font-medium text-ink">{activeSample.facilityRef}</dd></div>
                <div><dt className="text-ink-tertiary">Borrower</dt><dd className="font-medium text-ink">{activeSample.borrower}</dd></div>
                <div><dt className="text-ink-tertiary">Facility type</dt><dd className="text-ink">{activeSample.facilityType}</dd></div>
                <div><dt className="text-ink-tertiary">Amount</dt><dd className="font-mono text-ink">{activeSample.amountMM} MRD m</dd></div>
                <div><dt className="text-ink-tertiary">Approval date</dt><dd className="text-ink">{formatDate(activeSample.approvalDate)}</dd></div>
                <div><dt className="text-ink-tertiary">Approval authority</dt><dd className="text-ink">{activeSample.approvalAuthority}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border border-line bg-page p-3">
              <p className="overline text-ink-tertiary">Current position</p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div><dt className="text-ink-tertiary">Outstanding</dt><dd className="font-mono text-ink">{activeSample.outstandingMM} MRD m</dd></div>
                <div><dt className="text-ink-tertiary">Days past due</dt><dd className={cx('font-mono font-semibold', activeSample.daysPastDue > 90 ? 'text-error' : activeSample.daysPastDue > 30 ? 'text-warning' : 'text-ink')}>{activeSample.daysPastDue}</dd></div>
                <div><dt className="text-ink-tertiary">Classification</dt><dd><StatusBadge status={activeSample.classification} tone={GRADE_TONES[activeSample.classification]} /></dd></div>
                <div><dt className="text-ink-tertiary">Collateral status</dt><dd className="text-ink">{activeSample.collateralStatus}</dd></div>
                <div><dt className="text-ink-tertiary">Provision</dt><dd className="font-mono text-ink">{activeSample.provisionMM} MRD m</dd></div>
                <div><dt className="text-ink-tertiary">Institution</dt><dd className="text-ink">{activeSample.institutionName}</dd></div>
              </dl>
            </div>
            <div>
              <p className="overline mb-1 text-ink-tertiary">Supporting evidence (demo references)</p>
              <div className="flex flex-wrap gap-1.5">
                {activeSample.evidenceRefs.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                    onClick={() => navigate(`/app/evidence?search=${encodeURIComponent(ref)}`)}
                    title={`Open ${ref} in the evidence repository`}
                  >
                    {ref} →
                  </button>
                ))}
                {activeSample.examinationRef && (
                  <button
                    type="button"
                    className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                    onClick={() => void openExamination(activeSample.examinationRef!)}
                  >
                    {activeSample.examinationRef} →
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
              <p className="overline text-ink-tertiary">Examiner conclusion</p>
              <Select
                label="Conclusion"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value as NonNullable<LoanSample['examinerConclusion']>)}
                options={['Satisfactory', 'Exception noted', 'Escalate to finding'].map((c) => ({ value: c, label: c }))}
              />
              <TextArea
                label="Conclusion note"
                required
                rows={3}
                error={conclusionError}
                value={conclusionNote}
                onChange={(e) => { setConclusionNote(e.target.value); setConclusionError('') }}
                placeholder="Summarise the file review, classification accuracy and collateral position (demo)…"
              />
              {activeSample.examinerConclusion && (
                <p className="text-[11px] text-ink-secondary">
                  Previously concluded <StatusBadge status={activeSample.examinerConclusion} tone={CONCLUSION_TONES[activeSample.examinerConclusion]} />
                  {activeSample.conclusionByName ? ` by ${activeSample.conclusionByName}` : ''}
                  {activeSample.concludedAt ? ` on ${formatDate(activeSample.concludedAt)}` : ''} — saved in prototype session.
                </p>
              )}
              {!canConclude && (
                <p className="rounded-md bg-tint-orange px-2 py-1.5 text-[11px] text-warning">
                  The “{actor.actorRole}” demo role cannot record examiner conclusions (Spec §19). Switch to an examiner-tier demo role to try the workflow.
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

type ProvisionRow = CreditOverview['provisionMovement'][number]

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const topBorrowerColumns: Array<ColumnDef<TopBorrowerRow, unknown>> = [
  {
    accessorKey: 'borrower',
    header: 'Borrower',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.borrower}</p>
        <p className="text-[10px] text-ink-secondary">
          {row.original.sector} · {row.original.facilityType}
          {row.original.relatedParty && <span className="ml-1 font-semibold text-warning">· related party</span>}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'institutionName',
    header: 'Institution',
    cell: ({ row }) => <span className="text-xs text-ink-secondary">{row.original.institutionName}</span>,
  },
  { accessorKey: 'outstandingMM', header: 'Outstanding (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.outstandingMM}</span> },
  {
    accessorKey: 'pctOfTier1',
    header: '% Tier 1',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.pctOfTier1) > 20 ? 'text-error' : Number(row.original.pctOfTier1) > 17 ? 'text-warning' : 'text-ink')}>
        {row.original.pctOfTier1}
      </span>
    ),
  },
  {
    accessorKey: 'daysPastDue',
    header: 'DPD',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs', row.original.daysPastDue > 90 ? 'font-semibold text-error' : row.original.daysPastDue > 0 ? 'text-warning' : 'text-ink-secondary')}>
        {row.original.daysPastDue}
      </span>
    ),
  },
  {
    accessorKey: 'classification',
    header: 'Classification',
    cell: ({ row }) => <StatusBadge status={row.original.classification} tone={GRADE_TONES[row.original.classification]} />,
  },
]

const restructuredColumns: Array<ColumnDef<RestructuredLoanRow, unknown>> = [
  {
    accessorKey: 'borrower',
    header: 'Borrower',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.borrower}</p>
        <p className="text-[10px] text-ink-secondary">{row.original.institutionName} · {row.original.facilityType}</p>
      </div>
    ),
  },
  { accessorKey: 'originalAmountMM', header: 'Original (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.originalAmountMM}</span> },
  { accessorKey: 'restructuredAt', header: 'Restructured', cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatDate(row.original.restructuredAt)}</span> },
  {
    accessorKey: 'concession',
    header: 'Concession',
    cell: ({ row }) => <span className="block max-w-[320px] text-[11px] leading-relaxed text-ink-secondary">{row.original.concession}</span>,
  },
  {
    accessorKey: 'currentClassification',
    header: 'Classification',
    cell: ({ row }) => <StatusBadge status={row.original.currentClassification} tone={GRADE_TONES[row.original.currentClassification]} />,
  },
  {
    accessorKey: 'performingSinceRestructure',
    header: 'Performing since',
    cell: ({ row }) => (
      <StatusBadge status={row.original.performingSinceRestructure ? 'Performing' : 'Non-performing'} tone={row.original.performingSinceRestructure ? 'active' : 'overdue'} />
    ),
  },
]

const classificationColumns: Array<ColumnDef<LoanClassificationRow, unknown>> = [
  { accessorKey: 'classification', header: 'Grade', cell: ({ row }) => <StatusBadge status={row.original.classification} tone={GRADE_TONES[row.original.classification]} /> },
  { accessorKey: 'facilities', header: 'Facilities', cell: ({ row }) => <span className="font-mono text-xs">{row.original.facilities.toLocaleString()}</span> },
  { accessorKey: 'outstandingMM', header: 'Outstanding (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.outstandingMM}</span> },
  { accessorKey: 'provisionMM', header: 'Provision (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.provisionMM}</span> },
  { accessorKey: 'pctOfPortfolio', header: '% of portfolio', cell: ({ row }) => <span className="font-mono text-xs">{row.original.pctOfPortfolio}</span> },
]

const ageingColumns: Array<ColumnDef<AgeingBucketRow, unknown>> = [
  { accessorKey: 'bucket', header: 'Past-due bucket' },
  { accessorKey: 'outstandingMM', header: 'Outstanding (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.outstandingMM}</span> },
  {
    accessorKey: 'pctOfPortfolio',
    header: '% of portfolio',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs', row.original.bucket === 'Over 90 days' ? 'font-semibold text-error' : 'text-ink')}>{row.original.pctOfPortfolio}</span>
    ),
  },
]

const provisionColumns: Array<ColumnDef<ProvisionRow, unknown>> = [
  { accessorKey: 'periodLabel', header: 'Period' },
  { accessorKey: 'openingMM', header: 'Opening', cell: ({ row }) => <span className="font-mono text-xs">{row.original.openingMM}</span> },
  { accessorKey: 'chargeMM', header: 'Charge', cell: ({ row }) => <span className="font-mono text-xs">{row.original.chargeMM}</span> },
  { accessorKey: 'writeOffMM', header: 'Write-offs', cell: ({ row }) => <span className="font-mono text-xs">{row.original.writeOffMM}</span> },
  { accessorKey: 'recoveriesMM', header: 'Recoveries', cell: ({ row }) => <span className="font-mono text-xs">{row.original.recoveriesMM}</span> },
  { accessorKey: 'closingMM', header: 'Closing', cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.closingMM}</span> },
  {
    accessorKey: 'coveragePct',
    header: 'Coverage %',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.coveragePct) < 100 ? 'text-warning' : 'text-success')}>{row.original.coveragePct}</span>
    ),
  },
]

const largeExposureColumns: Array<ColumnDef<LargeExposureRow, unknown>> = [
  {
    accessorKey: 'counterparty',
    header: 'Counterparty',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.counterparty}</p>
        <p className="text-[10px] text-ink-secondary">{row.original.institutionName}</p>
      </div>
    ),
  },
  { accessorKey: 'exposureMM', header: 'Exposure (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.exposureMM}</span> },
  {
    accessorKey: 'pctOfTier1',
    header: '% of Tier 1 / limit',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        <span className={cx('font-semibold', row.original.status === 'Breach' ? 'text-error' : row.original.status === 'Near limit' ? 'text-warning' : 'text-ink')}>
          {row.original.pctOfTier1}%
        </span>
        <span className="text-ink-tertiary"> / {row.original.limitPct}%</span>
      </span>
    ),
  },
  { accessorKey: 'utilisationPct', header: 'Utilisation', cell: ({ row }) => <span className="font-mono text-xs">{row.original.utilisationPct}%</span> },
  { accessorKey: 'collateralMM', header: 'Collateral (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.collateralMM}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={EXPOSURE_TONES[row.original.status]} /> },
  {
    accessorKey: 'note',
    header: 'Supervisory note',
    cell: ({ row }) => <span className="block max-w-[300px] text-[10px] leading-relaxed text-ink-secondary">{row.original.note ?? '—'}</span>,
  },
]

const relatedPartyColumns: Array<ColumnDef<RelatedPartyLoanRow, unknown>> = [
  {
    accessorKey: 'party',
    header: 'Related party',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.party}</p>
        <p className="text-[10px] text-ink-secondary">{row.original.relationship}</p>
      </div>
    ),
  },
  { accessorKey: 'institutionName', header: 'Institution', cell: ({ row }) => <span className="text-xs text-ink-secondary">{row.original.institutionName}</span> },
  { accessorKey: 'facilityType', header: 'Facility' },
  { accessorKey: 'amountMM', header: 'Amount (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.amountMM}</span> },
  {
    accessorKey: 'terms',
    header: 'Terms',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.terms}
        tone={row.original.terms === "Arm's length" ? 'active' : row.original.terms === 'Concessional' ? 'fieldwork' : 'overdue'}
      />
    ),
  },
  { accessorKey: 'approvedBy', header: 'Approved by', cell: ({ row }) => <span className="text-[11px] text-ink-secondary">{row.original.approvedBy}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={RP_TONES[row.original.status]} /> },
]

const collateralColumns = (institutionNames: Map<string, string>): Array<ColumnDef<CollateralRow, unknown>> => [
  {
    accessorKey: 'collateralType',
    header: 'Collateral type',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.collateralType}</p>
        <p className="text-[10px] text-ink-secondary">{institutionNames.get(row.original.institutionId) ?? '—'}</p>
      </div>
    ),
  },
  { accessorKey: 'appraisedValueMM', header: 'Appraised value (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.appraisedValueMM}</span> },
  {
    accessorKey: 'coveragePct',
    header: 'Coverage %',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs font-semibold', Number(row.original.coveragePct) < 100 ? 'text-error' : 'text-success')}>{row.original.coveragePct}</span>
    ),
  },
  {
    accessorKey: 'registeredPct',
    header: 'Registered charge %',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs', Number(row.original.registeredPct) < 80 ? 'font-semibold text-warning' : 'text-ink')}>{row.original.registeredPct}</span>
    ),
  },
  { accessorKey: 'lastValuationPeriod', header: 'Last valuation' },
  {
    accessorKey: 'note',
    header: 'Note',
    cell: ({ row }) => <span className="block max-w-[280px] text-[10px] leading-relaxed text-ink-secondary">{row.original.note ?? '—'}</span>,
  },
]

const loanSampleColumns = (openSample: (s: LoanSample) => void): Array<ColumnDef<LoanSample, unknown>> => [
  {
    accessorKey: 'reference',
    header: 'Sample',
    cell: ({ row }) => (
      <div>
        <button type="button" className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline" onClick={() => openSample(row.original)}>
          {row.original.reference}
        </button>
        <p className="font-mono text-[10px] text-ink-secondary">{row.original.facilityRef}</p>
      </div>
    ),
  },
  {
    accessorKey: 'borrower',
    header: 'Borrower',
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{row.original.borrower}</p>
        <p className="text-[10px] text-ink-secondary">{row.original.institutionName}{row.original.examinationRef ? ` · ${row.original.examinationRef}` : ''}</p>
      </div>
    ),
  },
  { accessorKey: 'outstandingMM', header: 'Outstanding (MRD m)', cell: ({ row }) => <span className="font-mono text-xs">{row.original.outstandingMM}</span> },
  {
    accessorKey: 'daysPastDue',
    header: 'DPD',
    cell: ({ row }) => (
      <span className={cx('font-mono text-xs', row.original.daysPastDue > 90 ? 'font-semibold text-error' : row.original.daysPastDue > 0 ? 'text-warning' : 'text-ink-secondary')}>
        {row.original.daysPastDue}
      </span>
    ),
  },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} tone={GRADE_TONES[row.original.classification]} /> },
  {
    accessorKey: 'collateralStatus',
    header: 'Collateral',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.collateralStatus}
        tone={row.original.collateralStatus === 'Adequate' ? 'active' : row.original.collateralStatus === 'Partially documented' ? 'fieldwork' : row.original.collateralStatus === 'Insufficient' ? 'overdue' : 'draft'}
      />
    ),
  },
  {
    accessorKey: 'examinerConclusion',
    header: 'Conclusion',
    cell: ({ row }) =>
      row.original.examinerConclusion ? (
        <StatusBadge status={row.original.examinerConclusion} tone={CONCLUSION_TONES[row.original.examinerConclusion]} />
      ) : (
        <StatusBadge status="Pending review" tone="planning" />
      ),
  },
]

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function SectorExposureChart({ rows }: { rows: SectorExposureRow[] }) {
  const data = rows.map((r) => ({ sector: r.sector, outstanding: Number(r.outstandingMM), npl: Number(r.nplPct) }))
  return (
    <div role="img" aria-label={`Loan portfolio by sector: ${rows.map((r) => `${r.sector} ${r.pctOfPortfolio}% of portfolio, NPL ${r.nplPct}%`).join('; ')}. Illustrative demo data.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="sector" tick={{ fontSize: 9, fill: CHART_COLORS.axis }} angle={-28} textAnchor="end" interval={0} height={54} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v, name) => [name === 'NPL %' ? `${v}%` : `${v} MRD m`, String(name)]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="outstanding" name="Outstanding (MRD m)" fill={CHART_COLORS.primarySurface} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="npl" name="NPL %" fill={CHART_COLORS.error} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ClassificationChart({ rows }: { rows: LoanClassificationRow[] }) {
  const data = rows.map((r) => ({ name: r.classification, value: Number(r.outstandingMM) }))
  return (
    <div role="img" aria-label={`Classification distribution: ${rows.map((r) => `${r.classification} ${r.pctOfPortfolio}%`).join(', ')}. Illustrative demo data.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.classification} fill={GRADE_COLORS[r.classification]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function AgeingBars({ rows }: { rows: AgeingBucketRow[] }) {
  const data = rows.map((r) => ({ bucket: r.bucket, outstanding: Number(r.outstandingMM) }))
  return (
    <div role="img" aria-label={`Ageing: ${rows.map((r) => `${r.bucket} ${r.pctOfPortfolio}%`).join(', ')}. Illustrative demo data.`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 30 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="bucket" width={92} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} MRD m`]} cursor={{ fill: 'rgba(26,54,93,0.05)' }} />
          <Bar dataKey="outstanding" name="Outstanding" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.bucket} fill={r.bucket === 'Over 90 days' ? CHART_COLORS.error : r.bucket === 'Current' ? CHART_COLORS.success : CHART_COLORS.accent} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProvisionMovementChart({ rows }: { rows: ProvisionRow[] }) {
  return (
    <div role="img" aria-label={`Provision movement: closing provisions ${rows.map((r) => `${r.periodLabel} ${r.closingMM} million`).join(', ')}. Illustrative demo data.`} className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows.map((r) => ({ periodLabel: r.periodLabel, closing: Number(r.closingMM), charge: Number(r.chargeMM), coverage: Number(r.coveragePct) }))} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="mm" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} unit="%" width={52} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="mm" type="monotone" dataKey="closing" name="Closing provisions (MRD m)" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
          <Line yAxisId="mm" type="monotone" dataKey="charge" name="P&L charge (MRD m)" stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line yAxisId="pct" type="monotone" dataKey="coverage" name="Coverage %" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
