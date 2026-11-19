/**
 * Prudential supervision domain contracts (Spec §8.1–§8.5, §18.4, Phase 3B).
 * Capital adequacy, credit & asset quality, liquidity & treasury, stress
 * testing and the configurable prudential-indicator catalogue. One
 * story-world: figures reconcile with the demo financial snapshots, the
 * return submissions (SUB-2026-0143 Vanguard capital, SUB-2026-0144
 * Northstar liquidity, SUB-2026-0145 Meridian asset quality), the
 * prudential exceptions and the early-warning alerts from Phase 3A.
 *
 * Money is a decimal string in millions of the fictional currency (MRD);
 * percentages are decimal strings unless a `Pct` number is required for
 * charts. EVERY threshold, scenario and calculation is illustrative demo
 * data — stress results must never be presented as official regulatory
 * stress-test outcomes (Spec §8.4).
 */
import type { ExceptionRow } from '@/types/surveillance'

// ---------------------------------------------------------------------------
// Shared prudential shapes
// ---------------------------------------------------------------------------

/** Reviewer status shared by prudential submission-derived tables (§8.1). */
export type PrudentialReviewStatus =
  | 'Awaiting Review'
  | 'In Review'
  | 'Accepted'
  | 'Rejected'

export interface PrudentialPeriodQuery {
  institutionId?: string
  periodLabel?: string
}

// ---------------------------------------------------------------------------
// Capital adequacy (Spec §8.1)
// ---------------------------------------------------------------------------

export interface CapitalSubmissionRow {
  id: string
  institutionId: string
  institutionName: string
  institutionCode: string
  /** Reporting period label, e.g. "October 2026" or "Q3 2026". */
  periodLabel: string
  /** Source return submission reference (SUB-…) and id for the deep link. */
  submissionRef?: string
  submissionId?: string
  returnCode: string
  /** Decimal strings, MRD millions. */
  cet1MM: string
  tier1MM: string
  tier2MM: string
  totalCapitalMM: string
  rwaMM: string
  /** Decimal string percent, e.g. "13.8". */
  carPct: string
  /** Positive buffer or negative shortfall vs the demo minimum (pct points). */
  bufferPct: string
  reviewStatus: PrudentialReviewStatus
  /** Applicable rule version, e.g. "TH-CAR-2026.1 (demo)". */
  ruleVersion: string
  /** ISO 8601 submission/receipt date. */
  receivedAt?: string
  note?: string
}

export interface CapitalComponentSlice {
  code: 'CET1' | 'AT1' | 'T2'
  label: string
  /** Decimal string, MRD millions. */
  amountMM: string
  /** Decimal string percent of total capital. */
  pctOfTotal: string
}

export interface CapitalTrendPoint {
  periodLabel: string
  /** Percents as numbers for Recharts. */
  cet1Pct: number
  tier1Pct: number
  tier2Pct: number
  carPct: number
}

export interface RwaBreakdownSlice {
  riskCategory: 'Credit risk' | 'Market risk' | 'Operational risk' | 'Settlement risk' | 'Other'
  /** Decimal string, MRD millions. */
  amountMM: string
  /** Decimal string percent of total RWA. */
  pctOfTotal: string
}

export interface RegulatoryAdjustmentRow {
  id: string
  institutionId: string
  institutionName: string
  periodLabel: string
  label: string
  kind: 'Deduction' | 'Addition' | 'Prudential filter'
  /** Decimal string, MRD millions (positive magnitude). */
  amountMM: string
  /** Applicable rule/definition reference (demo). */
  ruleRef: string
  note: string
}

export interface CapitalBreachRow {
  id: string
  institutionId: string
  institutionName: string
  institutionCode: string
  periodLabel: string
  measure: 'CAR' | 'CET1 ratio' | 'Tier 1 ratio' | 'Capital buffer'
  /** Decimal strings, percent. */
  observedPct: string
  requiredPct: string
  /** Decimal string, MRD millions of capital needed to restore the measure. */
  shortfallMM: string
  severity: 'Amber' | 'Red'
  status: 'Open' | 'Under remediation' | 'Escalated' | 'Cleared'
  /** Cross-module anchors: exception/alert/enforcement references. */
  relatedRefs: string[]
  note: string
}

export interface CapitalCalculationStep {
  label: string
  /** Decimal string. */
  value: string
  unit: 'MRD m' | '%'
  /** Demo formula for this step, e.g. "CET1 + AT1 + T2". */
  formula?: string
}

export interface CapitalMetricDetail {
  metric: string
  definition: string
  formula: string
  /** Source submission reference + deep-link id, when derived from a return. */
  sourceSubmissionRef?: string
  sourceSubmissionId?: string
  periodLabel: string
  ruleVersion: string
  breakdown: CapitalCalculationStep[]
  reviewerStatus: PrudentialReviewStatus
  reviewerName?: string
}

export interface CapitalKpis {
  /** Decimal string, MRD millions (portfolio totals). */
  totalRegulatoryCapitalMM: string
  totalRwaMM: string
  /** Asset-weighted portfolio CAR, decimal string percent. */
  portfolioCarPct: string
  institutionsWithBuffer: number
  institutionsWithShortfall: number
  openBreaches: number
}

export interface CapitalOverview {
  /** ISO 8601 date the demo figures are reported as of. */
  reportingDate: string
  kpis: CapitalKpis
  submissions: CapitalSubmissionRow[]
  breaches: CapitalBreachRow[]
  adjustments: RegulatoryAdjustmentRow[]
  /** Portfolio CET1/Tier1/Tier2/CAR trend across the snapshot periods. */
  portfolioTrend: CapitalTrendPoint[]
  /** Portfolio RWA breakdown (latest period). */
  rwaBreakdown: RwaBreakdownSlice[]
  /** Capital-category prudential exceptions (Spec §8.1 exception list). */
  exceptions: ExceptionRow[]
}

export interface InstitutionCapitalDetail {
  institutionId: string
  institutionName: string
  institutionCode: string
  category: string
  periodLabel: string
  /** Latest-period composition (CET1/AT1/T2). */
  composition: CapitalComponentSlice[]
  trend: CapitalTrendPoint[]
  rwaBreakdown: RwaBreakdownSlice[]
  deductions: RegulatoryAdjustmentRow[]
  breaches: CapitalBreachRow[]
  submissions: CapitalSubmissionRow[]
  /** Calculation detail for the headline CAR metric (§8.1 "Detail"). */
  carDetail: CapitalMetricDetail
  /** Stress-test summary rows for this institution (§8.1 panel). */
  stressSummary: Array<{
    scenarioName: string
    carBaselinePct: string
    carStressedPct: string
    verdict: StressVerdict
    runReference: string
  }>
  exceptions: ExceptionRow[]
}

// ---------------------------------------------------------------------------
// Credit & asset quality (Spec §8.2)
// ---------------------------------------------------------------------------

export interface CreditKpis {
  /** Decimal strings, MRD millions / percent. */
  grossLoansMM: string
  nplBalanceMM: string
  nplRatioPct: string
  provisionCoveragePct: string
  concentratedExposures: number
}

export interface SectorExposureRow {
  sector: string
  /** Decimal string, MRD millions. */
  outstandingMM: string
  /** Decimal string percent of gross loans. */
  pctOfPortfolio: string
  /** Decimal string NPL percent within the sector. */
  nplPct: string
}

export type LoanGrade = 'Pass' | 'Special Mention' | 'Substandard' | 'Doubtful' | 'Loss'

export interface LoanClassificationRow {
  classification: LoanGrade
  facilities: number
  /** Decimal strings. */
  outstandingMM: string
  provisionMM: string
  pctOfPortfolio: string
}

export interface AgeingBucketRow {
  bucket: 'Current' | '1–30 days' | '31–60 days' | '61–90 days' | 'Over 90 days'
  /** Decimal string, MRD millions. */
  outstandingMM: string
  pctOfPortfolio: string
}

export interface TopBorrowerRow {
  id: string
  institutionId: string
  institutionName: string
  /** Fictional borrower name (Spec §17.5). */
  borrower: string
  sector: string
  facilityType: string
  /** Decimal strings. */
  outstandingMM: string
  pctOfTier1: string
  classification: LoanGrade
  daysPastDue: number
  relatedParty: boolean
}

export interface RestructuredLoanRow {
  id: string
  institutionId: string
  institutionName: string
  borrower: string
  facilityType: string
  /** Decimal string, MRD millions. */
  originalAmountMM: string
  /** ISO 8601. */
  restructuredAt: string
  concession: string
  currentClassification: LoanGrade
  performingSinceRestructure: boolean
}

export interface ProvisionMovementRow {
  periodLabel: string
  /** Decimal strings, MRD millions. */
  openingMM: string
  chargeMM: string
  writeOffMM: string
  recoveriesMM: string
  closingMM: string
  /** Decimal string percent. */
  coveragePct: string
}

export interface LargeExposureRow {
  id: string
  institutionId: string
  institutionName: string
  counterparty: string
  /** Decimal strings. */
  exposureMM: string
  pctOfTier1: string
  /** Demo single-obligor limit, percent of Tier 1. */
  limitPct: string
  utilisationPct: string
  collateralMM: string
  status: 'Within limit' | 'Near limit' | 'Breach'
  note?: string
}

export interface RelatedPartyLoanRow {
  id: string
  institutionId: string
  institutionName: string
  party: string
  relationship: string
  facilityType: string
  /** Decimal string, MRD millions. */
  amountMM: string
  terms: "Arm's length" | 'Concessional' | 'Non-arms-length (exception)'
  approvedBy: string
  status: 'Current' | 'Under review' | 'Exception'
  note?: string
}

export interface CollateralRow {
  id: string
  institutionId: string
  collateralType: 'Real estate' | 'Cash margin' | 'Government securities' | 'Corporate guarantees' | 'Vehicles & equipment' | 'Shares' | 'Other'
  /** Decimal strings. */
  appraisedValueMM: string
  coveragePct: string
  /** Decimal string percent of collateral with a registered charge. */
  registeredPct: string
  lastValuationPeriod: string
  note?: string
}

/** Loan sample review record (§8.2 "Loan sample review screen"). */
export interface LoanSample {
  id: string
  /** e.g. LNG-2026-014 */
  reference: string
  institutionId: string
  institutionName: string
  /** Facility/borrower reference. */
  facilityRef: string
  borrower: string
  facilityType: string
  /** Decimal string, MRD millions. */
  amountMM: string
  /** ISO 8601. */
  approvalDate: string
  approvalAuthority: string
  outstandingMM: string
  daysPastDue: number
  classification: LoanGrade
  collateralStatus: 'Adequate' | 'Partially documented' | 'Insufficient' | 'Not applicable'
  /** Decimal string, MRD millions. */
  provisionMM: string
  /** Supporting evidence references (evidence repository, demo). */
  evidenceRefs: string[]
  /** Examiner conclusion — recorded through the gated workflow. */
  examinerConclusion?: 'Satisfactory' | 'Exception noted' | 'Escalate to finding'
  conclusionNote?: string
  conclusionByName?: string
  /** ISO 8601. */
  concludedAt?: string
  /** Examination the sample was drawn under, e.g. EXM-2026-014. */
  examinationRef?: string
}

export interface CreditExaminationSummary {
  examinationRef: string
  institutionId: string
  institutionName: string
  samplesDrawn: number
  samplesConcluded: number
  exceptions: number
  status: string
}

export interface CreditOverview {
  reportingDate: string
  /** Portfolio or filtered-institution KPIs. */
  kpis: CreditKpis
  sectorExposures: SectorExposureRow[]
  classifications: LoanClassificationRow[]
  ageing: AgeingBucketRow[]
  topBorrowers: TopBorrowerRow[]
  restructured: RestructuredLoanRow[]
  provisionMovement: ProvisionMovementRow[]
  largeExposures: LargeExposureRow[]
  relatedParty: RelatedPartyLoanRow[]
  collateral: CollateralRow[]
  examinationSummaries: CreditExaminationSummary[]
}

// ---------------------------------------------------------------------------
// Liquidity & treasury (Spec §8.3)
// ---------------------------------------------------------------------------

export interface LiquidityKpis {
  /** Decimal string, MRD millions — high-quality liquid assets. */
  hqlaMM: string
  /** Decimal string percents. */
  lcrPct: string
  nsfrPct: string
  depositConcentrationPct: string
  fxOpenPositionPct: string
  lcrTrendDirection: 'improving' | 'deteriorating' | 'stable'
}

export interface FundingMaturityRow {
  bucket: 'Overnight' | '2–7 days' | '8–30 days' | '31–90 days' | '91 days–1 year' | 'Over 1 year'
  /** Decimal strings, MRD millions. */
  assetsMM: string
  liabilitiesMM: string
  gapMM: string
  cumulativeGapMM: string
}

export interface LiquidAssetSlice {
  assetClass: string
  hqlaLevel: 'Level 1' | 'Level 2A' | 'Level 2B' | 'Non-HQLA'
  /** Decimal strings. */
  amountMM: string
  pctOfHqla: string
}

export interface DepositConcentrationRow {
  institutionId: string
  institutionName: string
  institutionCode: string
  /** Decimal strings. */
  totalDepositsMM: string
  top10Pct: string
  largestDepositorPct: string
  retailPct: string
  wholesalePct: string
  /** Against the demo DC threshold rule (amber above 20%). */
  status: 'Within threshold' | 'Amber' | 'Red'
}

export interface CurrencyExposureRow {
  currency: string
  /** Decimal strings, MRD millions. */
  longMM: string
  shortMM: string
  netOpenMM: string
  /** Decimal string percent of total capital. */
  netOpenPctOfCapital: string
  /** Demo dealing limit, percent of capital. */
  limitPct: string
  status: 'Within limit' | 'Near limit' | 'Breach'
}

export interface LiquidityTrendPoint {
  periodLabel: string
  lcrPct: number
  nsfrPct: number
}

export type TreasurySettlementStatus = 'Settled' | 'Pending' | 'Failed'
export type TreasuryExaminerResult = 'Satisfactory' | 'Exception' | 'Escalate'

/** Treasury examination workspace record (§8.3). */
export interface TreasuryTransaction {
  id: string
  /** Transaction reference, e.g. TRX-2026-031 */
  reference: string
  institutionId: string
  institutionName: string
  /** ISO 8601 trade date. */
  tradeDate: string
  instrument: string
  currency: string
  counterparty: string
  /** Decimal strings, MRD millions. */
  amountMM: string
  dealingLimitMM: string
  utilisationPct: string
  approval: string
  settlement: TreasurySettlementStatus
  /** ISO 8601 settlement date. */
  settlementDate: string
  examinerResult?: TreasuryExaminerResult
  examinerNote?: string
  examinerName?: string
  /** ISO 8601. */
  examinedAt?: string
}

export interface LiquidityExceptionNote {
  /** Story anchor for the exception, e.g. the Northstar LCR narrative. */
  exceptionRef: string
  institutionName: string
  ratioCode: string
  observed: string
  threshold: string
  severity: 'Amber' | 'Red'
  status: string
  relatedAlertRef?: string
  relatedSubmissionRef?: string
  note: string
}

export interface LiquidityOverview {
  reportingDate: string
  kpis: LiquidityKpis
  trend: LiquidityTrendPoint[]
  fundingMaturity: FundingMaturityRow[]
  liquidAssets: LiquidAssetSlice[]
  depositConcentration: DepositConcentrationRow[]
  currencyExposure: CurrencyExposureRow[]
  exceptions: LiquidityExceptionNote[]
}

// ---------------------------------------------------------------------------
// Stress testing (Spec §8.4)
// ---------------------------------------------------------------------------

export type ScenarioSeverity = 'Mild' | 'Adverse' | 'Severe' | 'Systemic'

export interface ScenarioAssumption {
  id: string
  factor: string
  /** Decimal strings, e.g. "+2.8" baseline vs "-1.9" stressed. */
  baseline: string
  stressed: string
  unit: string
  note: string
}

export interface StressScenario {
  id: string
  /** e.g. SCN-2026-002 */
  reference: string
  name: string
  severity: ScenarioSeverity
  description: string
  horizonQuarters: number
  assumptions: ScenarioAssumption[]
  createdByName: string
  /** ISO 8601. */
  createdAt: string
  status: 'Draft' | 'Published'
  /** Prototype-honesty label required by Spec §8.4. */
  illustrativeNote: string
}

export type StressVerdict = 'Pass' | 'Pass — buffer depleted' | 'Breach'

export interface StressRunResult {
  institutionId: string
  institutionName: string
  /** Decimal string percents (baseline vs stressed). */
  carBaselinePct: string
  carStressedPct: string
  carDeltaPct: string
  lcrBaselinePct: string
  lcrStressedPct: string
  nplBaselinePct: string
  nplStressedPct: string
  /** Decimal string, MRD millions — illustrative capital impact. */
  capitalImpactMM: string
  verdict: StressVerdict
}

export type StressRunStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected'

export interface StressRun {
  id: string
  /** e.g. RUN-2026-004 */
  reference: string
  scenarioId: string
  scenarioReference: string
  scenarioName: string
  /** ISO 8601. */
  runAt: string
  runByName: string
  status: StressRunStatus
  reviewerName?: string
  /** ISO 8601. */
  reviewedAt?: string
  reviewNote?: string
  results: StressRunResult[]
  sensitivity: SensitivityRow[]
}

export interface SensitivityRow {
  factor: string
  shock: string
  /** Decimal string percent-point impacts (portfolio average, illustrative). */
  carImpactPct: string
  nplImpactPct: string
  lcrImpactPct: string
}

export interface CreateStressRunInput {
  scenarioId: string
  institutionIds: string[]
}

// ---------------------------------------------------------------------------
// Prudential indicator catalogue (Spec §8.5)
// ---------------------------------------------------------------------------

export type IndicatorFrequency = 'Monthly' | 'Quarterly'

export interface IndicatorThresholdLevel {
  severity: 'Amber' | 'Red'
  operator: 'below' | 'above'
  /** Decimal string. */
  value: string
}

export interface PrudentialIndicatorDefinition {
  id: string
  /** Indicator code, e.g. "LCR". */
  code: string
  name: string
  definition: string
  /** Display formula, e.g. "HQLA ÷ 30-day net cash outflows × 100". */
  formula: string
  unit: '%' | 'x' | 'MRD m'
  /** Licence categories the indicator applies to (empty = all). */
  applicableInstitutionTypes: string[]
  thresholds: IndicatorThresholdLevel[]
  severityNote: string
  frequency: IndicatorFrequency
  /** ISO 8601. */
  effectiveFrom: string
  /** Source return fields feeding the indicator, e.g. ["MPR-04.hqla"]. */
  sourceReturnFields: string[]
  validationRules: string[]
  /** Threshold rule version mirrored from the surveillance rule set. */
  ruleVersion: string
}

export interface IndicatorThresholdHistoryRow {
  version: string
  /** ISO 8601. */
  effectiveFrom: string
  change: string
  approvedByName: string
}

export interface IndicatorReadingRow {
  institutionId: string
  institutionName: string
  institutionCode: string
  periodLabel: string
  /** Decimal string. */
  value: string
  breach: 'none' | 'Amber' | 'Red'
  /** Cross-module anchors when the reading triggered supervision. */
  relatedAlertRef?: string
  relatedExceptionRef?: string
}

export interface IndicatorDetail {
  definition: PrudentialIndicatorDefinition
  /** Portfolio-average history across the snapshot periods. */
  history: Array<{ periodLabel: string; value: string }>
  thresholdHistory: IndicatorThresholdHistoryRow[]
  readings: IndicatorReadingRow[]
}

export interface UpdateIndicatorThresholdsInput {
  thresholds: IndicatorThresholdLevel[]
  changeNote: string
}
