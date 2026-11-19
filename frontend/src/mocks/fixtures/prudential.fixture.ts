/**
 * Prudential supervision fixtures (Spec §8.1–§8.5, §17.5, Phase 3B).
 * ONE coherent story-world with the Phase-3A returns/surveillance data:
 * - SUB-2026-0143 Vanguard MPR-09 October (Rejected — CAR 6.4%, capital
 *   reconciliation error) ↔ EWA-2026-008 ↔ ENF-2026-002, licence suspended.
 * - SUB-2026-0144 Northstar MPR-04 October (LCR 104.2) → EXC-2026-011 →
 *   EWA-2026-011 → targeted examination EXM-2026-024.
 * - SUB-2026-0145 Meridian QAR-02 Q3 (NPL 6.9, PC 118.4) → EWA-2026-013;
 *   two large exposures under watch drive the amber NPL reading.
 * - Delta QAR-02 (SUB-2026-0148) PC 92.0 → EXC-2026-018; Delta DC exception
 *   EXC-2026-005 cleared after the large deposit partially unwound.
 * - Meridian MPR-09 October (SUB-2026-0141) overdue — latest accepted
 *   capital row is September 2026.
 * ALL figures are fictional demo values in MRD millions; stress scenarios
 * and results are illustrative prototype calculations, never official
 * regulatory stress-test outcomes (Spec §8.4).
 */
import { demoUuid, iso, isoDateTime } from '@/mocks/fixtures/demoIds'
import { FINANCIAL_SNAPSHOTS, INST_IDS, INSTITUTIONS } from '@/mocks/fixtures/institutions.fixture'
import type {
  CapitalBreachRow,
  CapitalSubmissionRow,
  CollateralRow,
  CurrencyExposureRow,
  FundingMaturityRow,
  IndicatorThresholdHistoryRow,
  LargeExposureRow,
  LiquidAssetSlice,
  LoanSample,
  PrudentialIndicatorDefinition,
  RegulatoryAdjustmentRow,
  RelatedPartyLoanRow,
  RestructuredLoanRow,
  ScenarioAssumption,
  SensitivityRow,
  StressRun,
  StressRunResult,
  StressScenario,
  TopBorrowerRow,
  TreasuryTransaction,
} from '@/types/prudential'

const NAME: Record<string, string> = Object.fromEntries(
  INSTITUTIONS.map((i) => [i.id, i.tradingName]),
)
const CODE: Record<string, string> = Object.fromEntries(INSTITUTIONS.map((i) => [i.id, i.code]))

/** Demo CAR minimum (percentage points) used for buffer/shortfall maths. */
export const DEMO_CAR_MINIMUM_PCT = 10.0
/** Demo amber watch level for CAR. */
export const DEMO_CAR_AMBER_PCT = 12.5
/** Demo single-obligor large-exposure limit, percent of Tier 1 capital. */
export const DEMO_SINGLE_OBLIGOR_LIMIT_PCT = 20.0
/** Demo FX net open position limit, percent of total capital. */
export const DEMO_FX_OPEN_LIMIT_PCT = 10.0

export const PRUDENTIAL_RULE_VERSIONS = {
  car: 'TH-CAR-2026.1 (demo)',
  lcr: 'TH-LCR-2026.1 (demo)',
  nsfr: 'TH-NSFR-2026.1 (demo)',
  npl: 'TH-NPL-2026.1 (demo)',
  pc: 'TH-PC-2026.1 (demo)',
  dc: 'TH-DC-2026.1 (demo)',
  fx: 'TH-FXOP-2026.1 (demo)',
  lev: 'TH-LEV-2026.1 (demo)',
} as const

export const ILLUSTRATIVE_NOTE =
  'Illustrative prototype calculation from demo assumptions — not an official regulatory stress-test result (Spec §8.4).'

// ---------------------------------------------------------------------------
// Capital adequacy (Spec §8.1)
// ---------------------------------------------------------------------------

interface CapSeed {
  institutionId: string
  periodLabel: string
  returnCode: string
  cet1: string
  tier1: string
  tier2: string
  total: string
  rwa: string
  car: string
  status: CapitalSubmissionRow['reviewStatus']
  submissionRef?: string
  submissionId?: string
  receivedAt?: string
  reviewer?: string
  note?: string
}

let capSeq = 0
const cap = (s: CapSeed): CapitalSubmissionRow => ({
  id: demoUuid(60, ++capSeq),
  institutionId: s.institutionId,
  institutionName: NAME[s.institutionId],
  institutionCode: CODE[s.institutionId],
  periodLabel: s.periodLabel,
  submissionRef: s.submissionRef,
  submissionId: s.submissionId,
  returnCode: s.returnCode,
  cet1MM: s.cet1,
  tier1MM: s.tier1,
  tier2MM: s.tier2,
  totalCapitalMM: s.total,
  rwaMM: s.rwa,
  carPct: s.car,
  bufferPct: (Number(s.car) - DEMO_CAR_MINIMUM_PCT).toFixed(1),
  reviewStatus: s.status,
  ruleVersion: PRUDENTIAL_RULE_VERSIONS.car,
  receivedAt: s.receivedAt,
  note: s.note,
})

/**
 * Capital submissions (MPR-09). October 2026 rows exist only where the
 * return was actually filed: Vanguard (SUB-2026-0143, Rejected) and
 * Sentinel (SUB-2026-0149, Accepted). Meridian's October MPR-09
 * (SUB-2026-0141) is overdue, so its latest capital row is September.
 */
export const CAPITAL_SUBMISSIONS: CapitalSubmissionRow[] = [
  // October 2026 — filed
  cap({
    institutionId: INST_IDS.vanguard, periodLabel: 'October 2026', returnCode: 'MPR-09',
    cet1: '88.2', tier1: '96.8', tier2: '18.4', total: '121.9', rwa: '1904.7', car: '6.4',
    status: 'Rejected', submissionRef: 'SUB-2026-0143', submissionId: demoUuid(23, 3),
    receivedAt: isoDateTime(-6, 14, 30), reviewer: 'Fatima Bello',
    note: 'Rejected — capital base unreconciled (Tier 1 + Tier 2 ≠ reported total) and CAR 6.4% is below the 10% demo minimum. Feeds EWA-2026-008 / ENF-2026-002. See the SUB-2026-0143 validation report.',
  }),
  cap({
    institutionId: INST_IDS.sentinel, periodLabel: 'October 2026', returnCode: 'MPR-09',
    cet1: '296.5', tier1: '320.4', tier2: '88.6', total: '409.0', rwa: '2588.6', car: '15.8',
    status: 'Accepted', submissionRef: 'SUB-2026-0149', submissionId: demoUuid(23, 9),
    receivedAt: isoDateTime(-7, 14, 30), reviewer: 'Amara Osei',
    note: 'Clean pass — strong custody-book capital position (demo).',
  }),
  // September 2026 — all institutions
  cap({
    institutionId: INST_IDS.meridian, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '588.4', tier1: '641.3', tier2: '58.9', total: '700.2', rwa: '4576.5', car: '15.3',
    status: 'Accepted', receivedAt: iso(2026, 10, 14), reviewer: 'Amara Osei',
    note: 'October MPR-09 (SUB-2026-0141) is overdue — chased via My Work in demo flow.',
  }),
  cap({
    institutionId: INST_IDS.northstar, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '260.4', tier1: '284.0', tier2: '32.3', total: '316.3', rwa: '1964.6', car: '16.1',
    status: 'Accepted', receivedAt: iso(2026, 10, 12), reviewer: 'Fatima Bello',
  }),
  cap({
    institutionId: INST_IDS.unity, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '132.1', tier1: '143.0', tier2: '12.3', total: '155.3', rwa: '780.4', car: '19.9',
    status: 'Accepted', receivedAt: iso(2026, 10, 9), reviewer: 'Amara Osei',
  }),
  cap({
    institutionId: INST_IDS.crestline, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '32.2', tier1: '34.9', tier2: '3.7', total: '38.6', rwa: '294.7', car: '13.1',
    status: 'Accepted', receivedAt: iso(2026, 10, 11), reviewer: 'Fatima Bello',
    note: 'Capital headroom thinning against rapid float growth (demo watch note).',
  }),
  cap({
    institutionId: INST_IDS.aurora, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '151.6', tier1: '163.3', tier2: '14.3', total: '177.6', rwa: '1057.1', car: '16.8',
    status: 'Accepted', receivedAt: iso(2026, 10, 8), reviewer: 'Peter Okonjo',
  }),
  cap({
    institutionId: INST_IDS.delta, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '25.7', tier1: '27.4', tier2: '2.6', total: '30.0', rwa: '214.3', car: '14.0',
    status: 'Accepted', receivedAt: iso(2026, 10, 10), reviewer: 'Nkechi Balogun',
  }),
  cap({
    institutionId: INST_IDS.sentinel, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '294.9', tier1: '318.2', tier2: '88.0', total: '406.2', rwa: '2571.0', car: '15.8',
    status: 'Accepted', receivedAt: iso(2026, 10, 7), reviewer: 'Amara Osei',
  }),
  cap({
    institutionId: INST_IDS.vanguard, periodLabel: 'September 2026', returnCode: 'MPR-09',
    cet1: '92.4', tier1: '104.5', tier2: '20.1', total: '124.6', rwa: '1805.8', car: '6.9',
    status: 'Accepted', receivedAt: iso(2026, 10, 13), reviewer: 'Fatima Bello',
    note: 'Filed on time but already below the demo minimum — EWA-2026-008 critical alert open since August.',
  }),
  // August 2026 — deteriorating names only (trend depth)
  cap({
    institutionId: INST_IDS.vanguard, periodLabel: 'August 2026', returnCode: 'MPR-09',
    cet1: '98.6', tier1: '110.2', tier2: '21.4', total: '131.6', rwa: '1735.2', car: '7.6',
    status: 'Accepted', receivedAt: iso(2026, 9, 12), reviewer: 'Fatima Bello',
    note: 'Third consecutive month below the 10% demo minimum; capital restoration plan demanded under ENF-2026-002.',
  }),
  cap({
    institutionId: INST_IDS.meridian, periodLabel: 'August 2026', returnCode: 'MPR-09',
    cet1: '584.2', tier1: '636.8', tier2: '58.6', total: '695.4', rwa: '4574.1', car: '15.2',
    status: 'Accepted', receivedAt: iso(2026, 9, 11), reviewer: 'Amara Osei',
  }),
]

export const CAPITAL_BREACHES: CapitalBreachRow[] = [
  {
    id: demoUuid(61, 1),
    institutionId: INST_IDS.vanguard,
    institutionName: NAME[INST_IDS.vanguard],
    institutionCode: CODE[INST_IDS.vanguard],
    periodLabel: 'October 2026',
    measure: 'CAR',
    observedPct: '6.4',
    requiredPct: '10.0',
    shortfallMM: '68.6',
    severity: 'Red',
    status: 'Escalated',
    relatedRefs: ['EWA-2026-008', 'ENF-2026-002', 'EXC-2026-008', 'SUB-2026-0143'],
    note: 'Sustained breach from the rejected October MPR-09; enforcement case open and licence suspended. Capital restoration plan under legal review (demo).',
  },
  {
    id: demoUuid(61, 2),
    institutionId: INST_IDS.vanguard,
    institutionName: NAME[INST_IDS.vanguard],
    institutionCode: CODE[INST_IDS.vanguard],
    periodLabel: 'October 2026',
    measure: 'CET1 ratio',
    observedPct: '4.6',
    requiredPct: '7.0',
    shortfallMM: '45.7',
    severity: 'Red',
    status: 'Under remediation',
    relatedRefs: ['ENF-2026-002', 'EXC-2026-008'],
    note: 'Core capital erosion driven by insider-loan write-downs identified in EXM-2026-012 (demo).',
  },
  {
    id: demoUuid(61, 3),
    institutionId: INST_IDS.vanguard,
    institutionName: NAME[INST_IDS.vanguard],
    institutionCode: CODE[INST_IDS.vanguard],
    periodLabel: 'October 2026',
    measure: 'Capital buffer',
    observedPct: '-3.6',
    requiredPct: '0.0',
    shortfallMM: '68.6',
    severity: 'Red',
    status: 'Escalated',
    relatedRefs: ['EWA-2026-008', 'ENF-2026-002'],
    note: 'Negative buffer against the demo 10% minimum for the fourth consecutive month.',
  },
  {
    id: demoUuid(61, 4),
    institutionId: INST_IDS.crestline,
    institutionName: NAME[INST_IDS.crestline],
    institutionCode: CODE[INST_IDS.crestline],
    periodLabel: 'September 2026',
    measure: 'Capital buffer',
    observedPct: '3.1',
    requiredPct: '2.5',
    shortfallMM: '0.0',
    severity: 'Amber',
    status: 'Open',
    relatedRefs: [],
    note: 'Buffer above the demo minimum but inside the 2.5pp amber watch band while the float balance sheet grows ~6% per quarter.',
  },
  {
    id: demoUuid(61, 5),
    institutionId: INST_IDS.delta,
    institutionName: NAME[INST_IDS.delta],
    institutionCode: CODE[INST_IDS.delta],
    periodLabel: 'Q2 2026',
    measure: 'CAR',
    observedPct: '11.8',
    requiredPct: '10.0',
    shortfallMM: '0.0',
    severity: 'Amber',
    status: 'Cleared',
    relatedRefs: [],
    note: 'Amber watch reading cleared after the July capital injection (demo); CAR back above 13% from August.',
  },
]

export const REGULATORY_ADJUSTMENTS: RegulatoryAdjustmentRow[] = [
  {
    id: demoUuid(62, 1), institutionId: INST_IDS.vanguard, institutionName: NAME[INST_IDS.vanguard],
    periodLabel: 'October 2026', label: 'Goodwill on consolidated subsidiaries', kind: 'Deduction',
    amountMM: '14.2', ruleRef: 'PRU/DEM/2026 §4.1(a) (demo)',
    note: 'Full deduction of goodwill from CET1 under the demo prudential rules.',
  },
  {
    id: demoUuid(62, 2), institutionId: INST_IDS.vanguard, institutionName: NAME[INST_IDS.vanguard],
    periodLabel: 'October 2026', label: 'Deferred tax assets relying on future profits', kind: 'Deduction',
    amountMM: '9.8', ruleRef: 'PRU/DEM/2026 §4.1(c) (demo)',
    note: 'DTA deduction; three consecutive loss quarters make reliance on future profits untenable (demo).',
  },
  {
    id: demoUuid(62, 3), institutionId: INST_IDS.meridian, institutionName: NAME[INST_IDS.meridian],
    periodLabel: 'September 2026', label: 'Goodwill on consolidated subsidiaries', kind: 'Deduction',
    amountMM: '22.4', ruleRef: 'PRU/DEM/2026 §4.1(a) (demo)',
    note: 'Standard CET1 deduction.',
  },
  {
    id: demoUuid(62, 4), institutionId: INST_IDS.meridian, institutionName: NAME[INST_IDS.meridian],
    periodLabel: 'September 2026', label: 'Significant investments in unconsolidated financials', kind: 'Prudential filter',
    amountMM: '18.9', ruleRef: 'PRU/DEM/2026 §4.2(b) (demo)',
    note: 'Amount above the demo 10% CET1 threshold deducted; remainder risk-weighted at 250%.',
  },
  {
    id: demoUuid(62, 5), institutionId: INST_IDS.northstar, institutionName: NAME[INST_IDS.northstar],
    periodLabel: 'September 2026', label: 'AT1 issuance costs amortisation', kind: 'Deduction',
    amountMM: '1.8', ruleRef: 'PRU/DEM/2026 §4.3 (demo)',
    note: 'Deducted from AT1 instrument value.',
  },
  {
    id: demoUuid(62, 6), institutionId: INST_IDS.unity, institutionName: NAME[INST_IDS.unity],
    periodLabel: 'September 2026', label: 'Profit-sharing investment account (PSIA) treatment', kind: 'Prudential filter',
    amountMM: '6.4', ruleRef: 'PRU/DEM/2026 §6.1 (demo)',
    note: 'Displaced commercial risk adjustment held against unrestricted PSIA funds (demo non-interest treatment).',
  },
  {
    id: demoUuid(62, 7), institutionId: INST_IDS.delta, institutionName: NAME[INST_IDS.delta],
    periodLabel: 'September 2026', label: 'IFRS 9 transitional add-back', kind: 'Addition',
    amountMM: '2.1', ruleRef: 'PRU/DEM/2026 §9.4 (demo)',
    note: 'Transitional add-back of 25% of day-one IFRS 9 ECL impact (demo phase-in).',
  },
  {
    id: demoUuid(62, 8), institutionId: INST_IDS.sentinel, institutionName: NAME[INST_IDS.sentinel],
    periodLabel: 'October 2026', label: 'Custody float client-money carve-out', kind: 'Prudential filter',
    amountMM: '12.6', ruleRef: 'PRU/DEM/2026 §7.2 (demo)',
    note: 'Segregated client balances excluded from both capital and RWA (demo custody-bank treatment).',
  },
]

/** Portfolio RWA breakdown, latest period (demo weights reused per institution). */
export const RWA_BREAKDOWN_SEED: Array<{ riskCategory: 'Credit risk' | 'Market risk' | 'Operational risk' | 'Settlement risk' | 'Other'; pct: string }> = [
  { riskCategory: 'Credit risk', pct: '82.1' },
  { riskCategory: 'Operational risk', pct: '9.0' },
  { riskCategory: 'Market risk', pct: '6.0' },
  { riskCategory: 'Settlement risk', pct: '2.0' },
  { riskCategory: 'Other', pct: '0.9' },
]

// ---------------------------------------------------------------------------
// Credit & asset quality (Spec §8.2)
// ---------------------------------------------------------------------------

export interface LoanBookSeed {
  institutionId: string
  /** Decimal string MRD millions; 0 = no loan book (designed empty state). */
  grossLoansMM: string
  nplPct: number
  coveragePct: number
  restructuredPct: number
  par30To90MM: string
  /** Story anchors for the credit examination tab. */
  examinationRef?: string
  sourceSubmissionRef?: string
}

export const LOAN_BOOK_SEEDS: LoanBookSeed[] = [
  { institutionId: INST_IDS.meridian, grossLoansMM: '18450.0', nplPct: 6.9, coveragePct: 118.4, restructuredPct: 4.2, par30To90MM: '640.2', examinationRef: 'EXM-2026-014', sourceSubmissionRef: 'SUB-2026-0145' },
  { institutionId: INST_IDS.vanguard, grossLoansMM: '1180.5', nplPct: 20.5, coveragePct: 61.2, restructuredPct: 12.8, par30To90MM: '96.4', examinationRef: 'EXM-2026-012' },
  { institutionId: INST_IDS.northstar, grossLoansMM: '1042.8', nplPct: 3.4, coveragePct: 132.5, restructuredPct: 1.8, par30To90MM: '21.6', examinationRef: 'EXM-2026-009' },
  { institutionId: INST_IDS.aurora, grossLoansMM: '688.9', nplPct: 2.8, coveragePct: 121.4, restructuredPct: 2.2, par30To90MM: '12.4' },
  { institutionId: INST_IDS.unity, grossLoansMM: '502.3', nplPct: 2.1, coveragePct: 148.2, restructuredPct: 1.1, par30To90MM: '8.2' },
  { institutionId: INST_IDS.sentinel, grossLoansMM: '196.4', nplPct: 0.9, coveragePct: 165.0, restructuredPct: 0.4, par30To90MM: '1.2' },
  { institutionId: INST_IDS.delta, grossLoansMM: '128.4', nplPct: 7.4, coveragePct: 92.0, restructuredPct: 5.6, par30To90MM: '3.1', examinationRef: 'EXM-2026-017', sourceSubmissionRef: 'SUB-2026-0148' },
  { institutionId: INST_IDS.crestline, grossLoansMM: '0.0', nplPct: 0, coveragePct: 0, restructuredPct: 0, par30To90MM: '0.0' },
]

/** Portfolio sector mix (demo weights; applied to each loan book). */
export const SECTOR_MIX: Array<{ sector: string; weightPct: number; sectorNplUpliftPct: number }> = [
  { sector: 'Real estate', weightPct: 21.8, sectorNplUpliftPct: -0.7 },
  { sector: 'Consumer', weightPct: 15.6, sectorNplUpliftPct: -1.1 },
  { sector: 'Manufacturing', weightPct: 14.2, sectorNplUpliftPct: -1.5 },
  { sector: 'Trade finance', weightPct: 12.9, sectorNplUpliftPct: -2.8 },
  { sector: 'Agriculture', weightPct: 9.1, sectorNplUpliftPct: 1.0 },
  { sector: 'Oil & gas', weightPct: 8.4, sectorNplUpliftPct: 7.9 },
  { sector: 'Construction', weightPct: 7.3, sectorNplUpliftPct: 2.7 },
  { sector: 'Telecoms & technology', weightPct: 5.9, sectorNplUpliftPct: -4.7 },
  { sector: 'Other', weightPct: 4.8, sectorNplUpliftPct: -3.3 },
]

const tb = (
  n: number, institutionId: string, borrower: string, sector: string, facilityType: string,
  outstandingMM: string, pctOfTier1: string, classification: TopBorrowerRow['classification'],
  daysPastDue: number, relatedParty: boolean,
): TopBorrowerRow => ({
  id: demoUuid(63, n), institutionId, institutionName: NAME[institutionId],
  borrower, sector, facilityType, outstandingMM, pctOfTier1, classification, daysPastDue, relatedParty,
})

export const TOP_BORROWERS: TopBorrowerRow[] = [
  tb(1, INST_IDS.meridian, 'Harmattan Energy Ltd', 'Oil & gas', 'Term loan', '128.6', '19.9', 'Substandard', 96, false),
  tb(2, INST_IDS.meridian, 'Sahel Agro-Allied Plc', 'Agriculture', 'Syndicated facility', '118.2', '18.3', 'Special Mention', 34, false),
  tb(3, INST_IDS.meridian, 'Nok Steel Works Plc', 'Manufacturing', 'Working capital', '96.4', '14.9', 'Pass', 0, false),
  tb(4, INST_IDS.meridian, 'Bight Marine Logistics Ltd', 'Trade finance', 'Trade facility', '88.1', '13.6', 'Special Mention', 12, false),
  tb(5, INST_IDS.vanguard, 'Vanguard Continental Holdings Ltd', 'Real estate', 'Term loan (related party)', '43.2', '44.6', 'Substandard', 210, true),
  tb(6, INST_IDS.vanguard, 'Owanbe Hotels Ltd', 'Consumer', 'Overdraft + term (related party)', '21.4', '22.1', 'Doubtful', 148, true),
  tb(7, INST_IDS.vanguard, 'Lagoon Edge Resorts Ltd', 'Real estate', 'Term loan (related party)', '12.8', '13.2', 'Doubtful', 87, true),
  tb(8, INST_IDS.northstar, 'Kano Trade Gateway Ltd', 'Trade finance', 'Revolving trade facility', '48.6', '17.1', 'Pass', 0, false),
  tb(9, INST_IDS.northstar, 'Zamfara Commodities House Ltd', 'Agriculture', 'Commodity pre-finance', '39.2', '13.8', 'Pass', 0, false),
  tb(10, INST_IDS.aurora, 'Ife Renewable Power Ltd', 'Telecoms & technology', 'Project finance', '26.4', '16.2', 'Pass', 0, false),
  tb(11, INST_IDS.delta, 'Okrika Farm Cooperative', 'Agriculture', 'Group micro-agriculture', '4.2', '15.3', 'Special Mention', 41, false),
]

const le = (
  n: number, institutionId: string, counterparty: string, exposureMM: string, pctOfTier1: string,
  utilisationPct: string, collateralMM: string, status: LargeExposureRow['status'], note?: string,
): LargeExposureRow => ({
  id: demoUuid(63, 20 + n), institutionId, institutionName: NAME[institutionId],
  counterparty, exposureMM, pctOfTier1, limitPct: DEMO_SINGLE_OBLIGOR_LIMIT_PCT.toFixed(1),
  utilisationPct, collateralMM, status, note,
})

export const LARGE_EXPOSURES: LargeExposureRow[] = [
  le(1, INST_IDS.vanguard, 'Vanguard Continental Holdings Ltd', '43.2', '44.6', '223.0', '8.9', 'Breach', 'Related-party concentration; insider lending at 28.4% of Tier 1 (MPR-09 October, SUB-2026-0143). Escalated via EXM-2026-012 → FND-2026-033.'),
  le(2, INST_IDS.vanguard, 'Owanbe Hotels Ltd', '21.4', '22.1', '110.5', '6.2', 'Breach', 'Re-aged restructuring concealed past-due status (demo finding FND-2026-033).'),
  le(3, INST_IDS.meridian, 'Harmattan Energy Ltd', '128.6', '19.9', '99.5', '141.2', 'Near limit', 'One of the two large exposures under watch driving the amber NPL reading (EWA-2026-013).'),
  le(4, INST_IDS.meridian, 'Sahel Agro-Allied Plc', '118.2', '18.3', '91.5', '96.4', 'Near limit', 'Second exposure under watch; collateral revaluation scheduled (demo).'),
  le(5, INST_IDS.northstar, 'Kano Trade Gateway Ltd', '48.6', '17.1', '85.5', '52.8', 'Within limit'),
  le(6, INST_IDS.aurora, 'Ife Renewable Power Ltd', '26.4', '16.2', '81.0', '31.6', 'Within limit'),
  le(7, INST_IDS.delta, 'Okrika Farm Cooperative', '4.2', '15.3', '76.5', '2.8', 'Within limit', 'Group exposure aggregation applies (demo).'),
  le(8, INST_IDS.meridian, 'Nok Steel Works Plc', '96.4', '14.9', '74.5', '88.2', 'Within limit'),
]

const rp = (
  n: number, institutionId: string, party: string, relationship: string, facilityType: string,
  amountMM: string, terms: RelatedPartyLoanRow['terms'], approvedBy: string,
  status: RelatedPartyLoanRow['status'], note?: string,
): RelatedPartyLoanRow => ({
  id: demoUuid(63, 40 + n), institutionId, institutionName: NAME[institutionId],
  party, relationship, facilityType, amountMM, terms, approvedBy, status, note,
})

export const RELATED_PARTY_LOANS: RelatedPartyLoanRow[] = [
  rp(1, INST_IDS.vanguard, 'Vanguard Continental Holdings Ltd', 'Parent company of the bank', 'Term loan', '43.2', 'Concessional', 'Board Credit Committee (pre-restructuring)', 'Exception', 'Below-market pricing and no independent valuation; approval regime replaced under restructuring (demo).'),
  rp(2, INST_IDS.vanguard, 'Lagoon Edge Resorts Ltd', 'Director-connected entity', 'Term loan', '12.8', 'Non-arms-length (exception)', 'Former CFO (approval withdrawn)', 'Exception', 'Fit-and-proper approval withdrawn for the CFO role in November 2026; facility re-under review.'),
  rp(3, INST_IDS.vanguard, 'Owanbe Hotels Ltd', 'Major-shareholder affiliate', 'Overdraft + term', '21.4', 'Concessional', 'Board Credit Committee (pre-restructuring)', 'Exception', 'Restructured twice in 12 months; concessions not arm\u2019s length (demo).'),
  rp(4, INST_IDS.meridian, 'Kalabo Properties Ltd', 'Director family interest (declared)', 'Mortgage portfolio', '18.4', "Arm's length", 'Board Risk Committee', 'Current', 'Declared interest; priced at portfolio standard (demo).'),
  rp(5, INST_IDS.northstar, 'Sani Freight Terminal Ltd', 'Subsidiary of major shareholder', 'Trade facility', '9.6', "Arm's length", 'Executive Credit Committee', 'Under review', 'Annual related-party review in progress (demo).'),
  rp(6, INST_IDS.unity, 'Amana Cooperative Society', 'Member cooperative (mutual ownership)', 'Working capital', '4.8', "Arm's length", 'Shariah Committee + Board', 'Current', 'Non-interest structure with profit-sharing terms (demo).'),
]

const rl = (
  n: number, institutionId: string, borrower: string, facilityType: string, originalAmountMM: string,
  restructuredAt: string, concession: string, currentClassification: RestructuredLoanRow['currentClassification'],
  performingSinceRestructure: boolean,
): RestructuredLoanRow => ({
  id: demoUuid(63, 60 + n), institutionId, institutionName: NAME[institutionId],
  borrower, facilityType, originalAmountMM, restructuredAt, concession, currentClassification, performingSinceRestructure,
})

export const RESTRUCTURED_LOANS: RestructuredLoanRow[] = [
  rl(1, INST_IDS.vanguard, 'Owanbe Hotels Ltd', 'Term loan', '24.6', iso(2026, 8, 14), 'Interest capitalised and tenor extended 24 months — re-aged; misstatement confirmed in FND-2026-033 (demo).', 'Doubtful', false),
  rl(2, INST_IDS.vanguard, 'Lagoon Edge Resorts Ltd', 'Term loan', '13.9', iso(2026, 5, 22), 'Tenor extension plus rate reduction; classification not downgraded at restructure (demo exception).', 'Doubtful', false),
  rl(3, INST_IDS.meridian, 'Sahel Agro-Allied Plc', 'Syndicated facility', '120.0', iso(2026, 3, 30), 'Six-month principal grace period after harvest-price shock (demo).', 'Special Mention', true),
  rl(4, INST_IDS.meridian, 'Adire Textiles Ltd', 'Working capital', '42.8', iso(2025, 11, 18), 'Rate reduction and repayment reschedule (demo).', 'Special Mention', true),
  rl(5, INST_IDS.delta, 'Okrika Farm Cooperative', 'Group micro-agriculture', '4.6', iso(2026, 2, 9), 'Rescheduled around planting season; covered by FND-2026-044 remediation (demo).', 'Special Mention', true),
  rl(6, INST_IDS.northstar, 'Kano Trade Gateway Ltd', 'Revolving trade facility', '48.6', iso(2025, 12, 4), 'Tenor extension on renewal; performing throughout (demo).', 'Pass', true),
]

const col = (
  n: number, institutionId: string, collateralType: CollateralRow['collateralType'],
  appraisedValueMM: string, coveragePct: string, registeredPct: string, lastValuationPeriod: string, note?: string,
): CollateralRow => ({
  id: demoUuid(63, 80 + n), institutionId, collateralType,
  appraisedValueMM, coveragePct, registeredPct, lastValuationPeriod, note,
})

export const COLLATERAL_ROWS: CollateralRow[] = [
  col(1, INST_IDS.meridian, 'Real estate', '8420.6', '132.4', '96.2', 'Q3 2026'),
  col(2, INST_IDS.meridian, 'Cash margin', '1240.2', '100.0', '100.0', 'October 2026'),
  col(3, INST_IDS.meridian, 'Corporate guarantees', '2140.8', '108.6', '88.4', 'Q3 2026', 'Guarantor financials refreshed annually (demo).'),
  col(4, INST_IDS.vanguard, 'Real estate', '186.4', '74.2', '68.4', 'Q2 2026', 'Valuations stale for 38% of the book; registered charges missing on related-party properties (EXM-2026-012, demo).'),
  col(5, INST_IDS.vanguard, 'Shares', '24.8', '41.6', '52.0', 'Q2 2026', 'Unlisted shares in related entities — heavily haircut under the demo rules.'),
  col(6, INST_IDS.northstar, 'Cash margin', '312.6', '100.0', '100.0', 'October 2026'),
  col(7, INST_IDS.northstar, 'Government securities', '284.2', '118.4', '100.0', 'October 2026'),
  col(8, INST_IDS.unity, 'Real estate', '286.4', '142.8', '94.6', 'Q3 2026'),
  col(9, INST_IDS.aurora, 'Vehicles & equipment', '148.2', '121.4', '91.2', 'Q3 2026'),
  col(10, INST_IDS.delta, 'Real estate', '52.6', '98.4', '86.2', 'Q3 2026', 'Coverage below 100% for the micro-agriculture book; FND-2026-048 provisioning shortfall open (demo).'),
  col(11, INST_IDS.sentinel, 'Government securities', '1820.4', '186.2', '100.0', 'October 2026'),
]

const ls = (
  n: number, reference: string, institutionId: string, facilityRef: string, borrower: string, facilityType: string,
  amountMM: string, approvalDate: string, approvalAuthority: string, outstandingMM: string, daysPastDue: number,
  classification: LoanSample['classification'], collateralStatus: LoanSample['collateralStatus'], provisionMM: string,
  evidenceRefs: string[], examinationRef: string | undefined,
  conclusion?: LoanSample['examinerConclusion'], conclusionNote?: string, conclusionByName?: string, concludedAt?: string,
): LoanSample => ({
  id: demoUuid(63, 100 + n), reference, institutionId, institutionName: NAME[institutionId],
  facilityRef, borrower, facilityType, amountMM, approvalDate, approvalAuthority,
  outstandingMM, daysPastDue, classification, collateralStatus, provisionMM, evidenceRefs,
  examinationRef, examinerConclusion: conclusion, conclusionNote, conclusionByName, concludedAt,
})

/** Loan sample review records (§8.2) drawn under live/completed examinations. */
export const LOAN_SAMPLES: LoanSample[] = [
  ls(1, 'LNG-2026-011', INST_IDS.vanguard, 'VG/FAC/2024/0311', 'Vanguard Continental Holdings Ltd', 'Term loan (related party)', '43.2', iso(2024, 3, 11), 'Board Credit Committee (executive approval later withdrawn)', '41.8', 210, 'Substandard', 'Insufficient', '20.9', ['EVD-2026-031', 'EVD-2026-033'], 'EXM-2026-012', 'Escalate to finding', 'Re-aged classification concealed 210 days past due; escalated to FND-2026-033 (demo).', 'Chuka Eze', iso(2026, 7, 2)),
  ls(2, 'LNG-2026-012', INST_IDS.vanguard, 'VG/FAC/2025/0814', 'Owanbe Hotels Ltd', 'Overdraft + term', '24.6', iso(2025, 8, 14), 'Board Credit Committee (pre-restructuring)', '21.4', 148, 'Doubtful', 'Partially documented', '13.9', ['EVD-2026-034'], 'EXM-2026-012', 'Exception noted', 'Restructure concession not documented in the credit file; classification lagged the re-age (demo).', 'Chuka Eze', iso(2026, 7, 3)),
  ls(3, 'LNG-2026-013', INST_IDS.vanguard, 'VG/FAC/2025/0522', 'Lagoon Edge Resorts Ltd', 'Term loan (related party)', '13.9', iso(2025, 5, 22), 'Former CFO (approval withdrawn)', '12.8', 87, 'Doubtful', 'Insufficient', '8.3', ['EVD-2026-035'], 'EXM-2026-012'),
  ls(4, 'LNG-2026-014', INST_IDS.delta, 'DM/FAC/2026/0209', 'Okrika Farm Cooperative', 'Group micro-agriculture', '4.6', iso(2026, 2, 9), 'Branch Credit Committee', '4.2', 41, 'Special Mention', 'Partially documented', '1.0', ['EVD-2026-041'], 'EXM-2026-017'),
  ls(5, 'LNG-2026-015', INST_IDS.delta, 'DM/FAC/2025/1104', 'Niger Delta Inputs Ltd', 'Working capital', '2.8', iso(2025, 11, 4), 'Head of Credit', '2.4', 0, 'Pass', 'Adequate', '0.1', ['EVD-2026-042'], 'EXM-2026-017', 'Satisfactory', 'Appraisal documentation complete after FND-2026-044 remediation (demo).', 'Nkechi Balogun', iso(2026, 11, 14)),
  ls(6, 'LNG-2026-016', INST_IDS.meridian, 'MC/FAC/2023/0620', 'Harmattan Energy Ltd', 'Term loan', '128.6', iso(2023, 6, 20), 'Executive Credit Committee', '128.6', 96, 'Substandard', 'Adequate', '64.3', ['EVD-2026-051'], 'EXM-2026-014'),
  ls(7, 'LNG-2026-017', INST_IDS.meridian, 'MC/FAC/2024/1002', 'Nok Steel Works Plc', 'Working capital', '96.4', iso(2024, 10, 2), 'Executive Credit Committee', '96.4', 0, 'Pass', 'Adequate', '1.9', ['EVD-2026-052'], 'EXM-2026-014', 'Satisfactory', 'File complete; collateral current; no exception (demo).', 'Chuka Eze', iso(2026, 11, 6)),
  ls(8, 'LNG-2026-018', INST_IDS.meridian, 'MC/FAC/2025/0330', 'Sahel Agro-Allied Plc', 'Syndicated facility', '120.0', iso(2025, 3, 30), 'Board Risk Committee', '118.2', 34, 'Special Mention', 'Adequate', '11.8', ['EVD-2026-053'], 'EXM-2026-014'),
]

export const CREDIT_EXAMINATION_SUMMARIES: Array<{ examinationRef: string; institutionId: string; samplesDrawn: number; samplesConcluded: number; exceptions: number; status: string }> = [
  { examinationRef: 'EXM-2026-012', institutionId: INST_IDS.vanguard, samplesDrawn: 6, samplesConcluded: 6, exceptions: 3, status: 'Completed' },
  { examinationRef: 'EXM-2026-017', institutionId: INST_IDS.delta, samplesDrawn: 4, samplesConcluded: 2, exceptions: 0, status: 'In Progress' },
  { examinationRef: 'EXM-2026-014', institutionId: INST_IDS.meridian, samplesDrawn: 3, samplesConcluded: 1, exceptions: 0, status: 'Fieldwork' },
]

// ---------------------------------------------------------------------------
// Liquidity & treasury (Spec §8.3)
// ---------------------------------------------------------------------------

export interface LiquiditySeed {
  institutionId: string
  lcrPct: number
  nsfrPct: number
  hqlaMM: string
  netOutflows30dMM: string
  totalDepositsMM: string
  top10Pct: string
  largestDepositorPct: string
  retailPct: string
  wholesalePct: string
  /** Story anchors surfaced on the exceptions/overview tabs. */
  sourceSubmissionRef?: string
  relatedAlertRef?: string
  note?: string
}

export const LIQUIDITY_SEEDS: LiquiditySeed[] = [
  { institutionId: INST_IDS.northstar, lcrPct: 104.2, nsfrPct: 108.6, hqlaMM: '214.6', netOutflows30dMM: '205.9', totalDepositsMM: '1420.8', top10Pct: '42.8', largestDepositorPct: '21.4', retailPct: '28.4', wholesalePct: '71.6', sourceSubmissionRef: 'SUB-2026-0144', relatedAlertRef: 'EWA-2026-011', note: 'LCR 104.2% from the October MPR-04 (SUB-2026-0144) — amber for the second consecutive observation; targeted examination EXM-2026-024 planned. Wholesale funding base keeps single-depositor concentration in the amber demo band.' },
  { institutionId: INST_IDS.vanguard, lcrPct: 88.0, nsfrPct: 94.2, hqlaMM: '96.4', netOutflows30dMM: '109.5', totalDepositsMM: '1310.2', top10Pct: '38.2', largestDepositorPct: '16.8', retailPct: '46.2', wholesalePct: '53.8', note: 'LCR 88% — deposit outflow contained by the emergency demo facility; October MPR-04 (SUB-2026-0150) overdue. Liquidity condition managed within the ENF-2026-002 restructuring perimeter.' },
  { institutionId: INST_IDS.meridian, lcrPct: 128.0, nsfrPct: 121.4, hqlaMM: '642.8', netOutflows30dMM: '502.2', totalDepositsMM: '3120.6', top10Pct: '24.6', largestDepositorPct: '8.4', retailPct: '78.2', wholesalePct: '21.8' },
  { institutionId: INST_IDS.unity, lcrPct: 165.0, nsfrPct: 142.8, hqlaMM: '148.2', netOutflows30dMM: '89.8', totalDepositsMM: '610.4', top10Pct: '12.8', largestDepositorPct: '4.2', retailPct: '92.4', wholesalePct: '7.6' },
  { institutionId: INST_IDS.crestline, lcrPct: 128.5, nsfrPct: 118.2, hqlaMM: '52.4', netOutflows30dMM: '40.8', totalDepositsMM: '214.6', top10Pct: '31.4', largestDepositorPct: '14.2', retailPct: '64.8', wholesalePct: '35.2', sourceSubmissionRef: 'SUB-2026-0142', note: 'Float fully invested in short-term demo securities; QSL-03 Q3 average LCR 128.5%.' },
  { institutionId: INST_IDS.aurora, lcrPct: 132.8, nsfrPct: 124.6, hqlaMM: '182.3', netOutflows30dMM: '137.3', totalDepositsMM: '862.4', top10Pct: '22.4', largestDepositorPct: '9.6', retailPct: '84.2', wholesalePct: '15.8', sourceSubmissionRef: 'SUB-2026-0147' },
  { institutionId: INST_IDS.delta, lcrPct: 118.4, nsfrPct: 106.2, hqlaMM: '26.8', netOutflows30dMM: '22.6', totalDepositsMM: '148.2', top10Pct: '28.6', largestDepositorPct: '19.8', retailPct: '71.4', wholesalePct: '28.6', note: 'Single-depositor concentration back within the demo watch band after the large institutional deposit partially unwound (EXC-2026-005 cleared).' },
  { institutionId: INST_IDS.sentinel, lcrPct: 187.0, nsfrPct: 158.4, hqlaMM: '402.6', netOutflows30dMM: '215.3', totalDepositsMM: '1840.2', top10Pct: '18.2', largestDepositorPct: '7.4', retailPct: '42.6', wholesalePct: '57.4' },
]

export const FUNDING_MATURITY: FundingMaturityRow[] = [
  { bucket: 'Overnight', assetsMM: '1840.2', liabilitiesMM: '2210.6', gapMM: '-370.4', cumulativeGapMM: '-370.4' },
  { bucket: '2–7 days', assetsMM: '1220.4', liabilitiesMM: '1380.2', gapMM: '-159.8', cumulativeGapMM: '-530.2' },
  { bucket: '8–30 days', assetsMM: '1610.8', liabilitiesMM: '1420.6', gapMM: '190.2', cumulativeGapMM: '-340.0' },
  { bucket: '31–90 days', assetsMM: '2140.6', liabilitiesMM: '1780.4', gapMM: '360.2', cumulativeGapMM: '20.2' },
  { bucket: '91 days–1 year', assetsMM: '3220.4', liabilitiesMM: '2810.6', gapMM: '409.8', cumulativeGapMM: '430.0' },
  { bucket: 'Over 1 year', assetsMM: '6180.2', liabilitiesMM: '4210.8', gapMM: '1969.4', cumulativeGapMM: '2399.4' },
]

export const LIQUID_ASSETS: LiquidAssetSlice[] = [
  { assetClass: 'Cash & balances with the central bank', hqlaLevel: 'Level 1', amountMM: '1240.6', pctOfHqla: '34.2' },
  { assetClass: 'Government securities', hqlaLevel: 'Level 1', amountMM: '1420.8', pctOfHqla: '39.2' },
  { assetClass: 'High-grade corporate bonds', hqlaLevel: 'Level 2A', amountMM: '486.2', pctOfHqla: '13.4' },
  { assetClass: 'Covered bonds', hqlaLevel: 'Level 2A', amountMM: '214.6', pctOfHqla: '5.9' },
  { assetClass: 'Blue-chip equities (haircut applied)', hqlaLevel: 'Level 2B', amountMM: '158.4', pctOfHqla: '4.4' },
  { assetClass: 'Other eligible instruments', hqlaLevel: 'Level 2B', amountMM: '104.2', pctOfHqla: '2.9' },
]

export const CURRENCY_EXPOSURE: CurrencyExposureRow[] = [
  { currency: 'USD', longMM: '420.6', shortMM: '386.2', netOpenMM: '34.4', netOpenPctOfCapital: '1.8', limitPct: DEMO_FX_OPEN_LIMIT_PCT.toFixed(1), status: 'Within limit' },
  { currency: 'EUR', longMM: '96.4', shortMM: '104.8', netOpenMM: '-8.4', netOpenPctOfCapital: '0.4', limitPct: DEMO_FX_OPEN_LIMIT_PCT.toFixed(1), status: 'Within limit' },
  { currency: 'GBP', longMM: '42.8', shortMM: '36.6', netOpenMM: '6.2', netOpenPctOfCapital: '0.3', limitPct: DEMO_FX_OPEN_LIMIT_PCT.toFixed(1), status: 'Within limit' },
  { currency: 'Other regional (demo)', longMM: '31.4', shortMM: '18.6', netOpenMM: '12.8', netOpenPctOfCapital: '0.7', limitPct: DEMO_FX_OPEN_LIMIT_PCT.toFixed(1), status: 'Within limit' },
]

const tt = (
  n: number, reference: string, institutionId: string, tradeDate: string, instrument: string, currency: string,
  counterparty: string, amountMM: string, dealingLimitMM: string, approval: string,
  settlement: TreasuryTransaction['settlement'], settlementDate: string,
  examinerResult?: TreasuryTransaction['examinerResult'], examinerNote?: string, examinerName?: string, examinedAt?: string,
): TreasuryTransaction => {
  const utilisation = ((Number(amountMM) / Number(dealingLimitMM)) * 100).toFixed(1)
  return {
    id: demoUuid(64, n), reference, institutionId, institutionName: NAME[institutionId],
    tradeDate, instrument, currency, counterparty, amountMM, dealingLimitMM,
    utilisationPct: utilisation, approval, settlement, settlementDate,
    examinerResult, examinerNote, examinerName, examinedAt,
  }
}

export const TREASURY_TRANSACTIONS: TreasuryTransaction[] = [
  tt(1, 'TRX-2026-031', INST_IDS.northstar, iso(2026, 11, 10), 'FX swap (USD/NGN) 30-day', 'USD', 'Continental Clearing House (demo)', '24.6', '40.0', 'Treasury dealing mandate — Head of Treasury', 'Settled', iso(2026, 11, 12)),
  tt(2, 'TRX-2026-032', INST_IDS.northstar, iso(2026, 11, 3), 'Government bond sale (HQLA drawdown)', 'NGN', 'Central bank OMO window (demo)', '38.4', '60.0', 'CFO + Head of Treasury (dual approval)', 'Settled', iso(2026, 11, 4)),
  tt(3, 'TRX-2026-028', INST_IDS.northstar, iso(2026, 10, 21), 'Money-market placement 7-day', 'NGN', 'Interbank market (demo)', '52.0', '60.0', 'Head of Treasury', 'Settled', iso(2026, 10, 22), 'Satisfactory', 'Priced within the demo dealing policy; dual approval evidenced.', 'Fatima Bello', iso(2026, 10, 28)),
  tt(4, 'TRX-2026-029', INST_IDS.vanguard, iso(2026, 10, 28), 'FX forward purchase (unhedged book cover)', 'USD', 'Lagoon Capital Markets (demo)', '18.2', '15.0', 'Missing — dealt beyond mandate (exception)', 'Failed', iso(2026, 10, 30), 'Escalate', 'Dealt beyond the dealing limit without approval; settlement failed. Reported into the ENF-2026-002 workstream (demo).', 'Zainab Lawal', iso(2026, 11, 2)),
  tt(5, 'TRX-2026-030', INST_IDS.vanguard, iso(2026, 11, 6), 'Emergency liquidity facility drawdown', 'NGN', 'Central bank standing facility (demo)', '45.0', '45.0', 'Supervisory no-objection (demo)', 'Pending', iso(2026, 11, 20)),
  tt(6, 'TRX-2026-027', INST_IDS.sentinel, iso(2026, 10, 15), 'Custody FX settlement — client account', 'EUR', 'Global custodian network (demo)', '12.4', '20.0', 'Standing client instruction', 'Settled', iso(2026, 10, 17), 'Satisfactory', 'Client-driven settlement; no proprietary position taken (demo).', 'Peter Okonjo', iso(2026, 10, 24)),
  tt(7, 'TRX-2026-026', INST_IDS.meridian, iso(2026, 10, 9), 'Government bond purchase (HQLA top-up)', 'NGN', 'Primary dealer auction (demo)', '84.2', '120.0', 'Investment Committee', 'Settled', iso(2026, 10, 11), 'Satisfactory', 'HQLA top-up consistent with the approved ALCO strategy (demo).', 'Daniel Adeyemi', iso(2026, 10, 16)),
  tt(8, 'TRX-2026-025', INST_IDS.crestline, iso(2026, 10, 2), 'Float investment — 30-day Treasury bill', 'NGN', 'Treasury bill auction (demo)', '30.0', '35.0', 'Head of Operations', 'Settled', iso(2026, 10, 3)),
]

// ---------------------------------------------------------------------------
// Stress testing (Spec §8.4) — illustrative demo scenarios ONLY
// ---------------------------------------------------------------------------

const sa = (
  n: number, factor: string, baseline: string, stressed: string, unit: string, note: string,
): ScenarioAssumption => ({ id: demoUuid(65, 100 + n), factor, baseline, stressed, unit, note })

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: demoUuid(65, 1), reference: 'SCN-2026-001', name: 'Baseline Macro Outlook (demo)', severity: 'Mild',
    description: 'Mild calibration of the demo macro model: steady growth, gradual rate easing and contained asset-quality drift. Used as the baseline leg of every comparison run.',
    horizonQuarters: 8,
    assumptions: [
      sa(1, 'Real GDP growth', '+2.9', '+3.1', '% p.a.', 'Steady demo growth path.'),
      sa(2, 'Policy rate', '14.0', '13.5', '%', 'Gradual easing as inflation cools (demo).'),
      sa(3, 'FX rate (NGN per USD, demo)', '1480', '1455', 'rate', 'Modest appreciation.'),
      sa(4, 'Equity index', '+6.0', '+8.0', '% change', 'Mild wealth effect.'),
      sa(5, 'Residential property prices', '+2.0', '+3.0', '% change', 'Stable collateral values.'),
      sa(6, 'NPL formation', '+0.2', '-0.3', 'pp', 'Contained asset-quality drift.'),
    ],
    createdByName: 'Fatima Bello', createdAt: iso(2026, 1, 12), status: 'Published',
    illustrativeNote: ILLUSTRATIVE_NOTE,
  },
  {
    id: demoUuid(65, 2), reference: 'SCN-2026-002', name: 'Severe Macro-Financial Shock (demo)', severity: 'Severe',
    description: 'Severe but plausible demo shock: recession, sharp rate spike, heavy FX depreciation, equity and property corrections and a broad NPL surge across the loan book.',
    horizonQuarters: 8,
    assumptions: [
      sa(7, 'Real GDP growth', '+2.9', '-4.2', '% p.a.', 'Two-quarter demo recession.'),
      sa(8, 'Policy rate', '14.0', '20.5', '%', '+650bp emergency tightening.'),
      sa(9, 'FX rate (NGN per USD, demo)', '1480', '2035', 'rate', '≈37% depreciation; unhedged books take direct capital hits.'),
      sa(10, 'Equity index', '+6.0', '-28.0', '% change', 'Market correction.'),
      sa(11, 'Residential property prices', '+2.0', '-18.0', '% change', 'Collateral values fall; LTV cushions erode.'),
      sa(12, 'NPL formation', '+0.2', '+6.5', 'pp', 'Broad asset-quality deterioration.'),
      sa(13, 'Wholesale deposit run-off (30-day)', '0.0', '+9.0', '%', 'Funding stress layered onto the macro shock.'),
    ],
    createdByName: 'Fatima Bello', createdAt: iso(2026, 7, 3), status: 'Published',
    illustrativeNote: ILLUSTRATIVE_NOTE,
  },
  {
    id: demoUuid(65, 3), reference: 'SCN-2026-003', name: 'Idiosyncratic Funding Stress — Merchant Bank (demo)', severity: 'Adverse',
    description: 'Idiosyncratic demo scenario calibrated after the Northstar LCR amber readings (EWA-2026-011): concentrated wholesale funding run-off, wider haircuts and a ratings downgrade spiral over four quarters.',
    horizonQuarters: 4,
    assumptions: [
      sa(14, 'Wholesale funding run-off', '0.0', '+25.0', '%', 'Top-10 funding concentrations exit over the horizon.'),
      sa(15, 'LCR outflow rates', '+0.0', '+12.0', 'pp', 'Supervisory haircuts increased on wholesale legs.'),
      sa(16, 'Counterparty haircut', '2.0', '8.0', '%', 'Repo and securities-lending haircuts widen.'),
      sa(17, 'Rating downgrade', '0', '2', 'notches', 'Funding cost and margin-posting spiral.'),
      sa(18, 'FX rate (NGN per USD, demo)', '1480', '1620', 'rate', 'Moderate depreciation alongside the funding stress.'),
    ],
    createdByName: 'Amara Osei', createdAt: iso(2026, 11, 10), status: 'Draft',
    illustrativeNote: ILLUSTRATIVE_NOTE,
  },
]

/** Deterministic severity factors used by the demo run calculator. */
export const SEVERITY_FACTORS: Record<StressScenario['severity'], { carDeltaPct: number; lcrDeltaPct: number; nplDeltaPct: number }> = {
  Mild: { carDeltaPct: -0.5, lcrDeltaPct: -4.0, nplDeltaPct: 0.4 },
  Adverse: { carDeltaPct: -2.4, lcrDeltaPct: -14.0, nplDeltaPct: 2.2 },
  Severe: { carDeltaPct: -4.8, lcrDeltaPct: -27.0, nplDeltaPct: 6.5 },
  Systemic: { carDeltaPct: -7.2, lcrDeltaPct: -38.0, nplDeltaPct: 9.5 },
}

/** Standard demo sensitivity grid, scaled by severity in the run calculator. */
export const SENSITIVITY_SEED: Array<{ factor: string; shock: string; car: number; npl: number; lcr: number }> = [
  { factor: 'Asset quality', shock: 'NPL formation +2pp', car: -1.8, npl: 2.0, lcr: -0.5 },
  { factor: 'Interest rates', shock: 'Policy rate +200bp', car: -0.9, npl: 0.6, lcr: -2.4 },
  { factor: 'FX', shock: 'NGN depreciation 15%', car: -1.2, npl: 0.8, lcr: -3.1 },
  { factor: 'Property', shock: 'Residential prices -10%', car: -0.7, npl: 0.5, lcr: -0.2 },
  { factor: 'Funding', shock: 'Top-10 depositor run-off 15%', car: -0.2, npl: 0.0, lcr: -8.6 },
]

const runResult = (
  institutionId: string, carBaseline: number, carStressed: number,
  lcrBaseline: number, lcrStressed: number, nplBaseline: number, nplStressed: number,
  rwaMM: number,
): StressRunResult => {
  const delta = carStressed - carBaseline
  return {
    institutionId,
    institutionName: NAME[institutionId],
    carBaselinePct: carBaseline.toFixed(1),
    carStressedPct: carStressed.toFixed(1),
    carDeltaPct: delta.toFixed(1),
    lcrBaselinePct: lcrBaseline.toFixed(1),
    lcrStressedPct: lcrStressed.toFixed(1),
    nplBaselinePct: nplBaseline.toFixed(1),
    nplStressedPct: nplStressed.toFixed(1),
    capitalImpactMM: ((Math.abs(delta) / 100) * rwaMM).toFixed(1),
    verdict: carStressed < DEMO_CAR_MINIMUM_PCT ? 'Breach' : carStressed < DEMO_CAR_AMBER_PCT ? 'Pass — buffer depleted' : 'Pass',
  }
}

const sensRows = (scale: number): SensitivityRow[] =>
  SENSITIVITY_SEED.map((s) => ({
    factor: s.factor,
    shock: s.shock,
    carImpactPct: (s.car * scale).toFixed(1),
    nplImpactPct: (s.npl * scale).toFixed(1),
    lcrImpactPct: (s.lcr * scale).toFixed(1),
  }))

// Q3/October baselines (story-consistent): CAR from the latest MPR-09 rows,
// LCR/NPL from the liquidity & loan-book seeds.
export const STRESS_RUNS: StressRun[] = [
  {
    id: demoUuid(65, 10), reference: 'RUN-2026-002',
    scenarioId: demoUuid(65, 1), scenarioReference: 'SCN-2026-001', scenarioName: 'Baseline Macro Outlook (demo)',
    runAt: iso(2026, 6, 18), runByName: 'Fatima Bello', status: 'Approved',
    reviewerName: 'Daniel Adeyemi', reviewedAt: iso(2026, 6, 25),
    reviewNote: 'Baseline leg approved for H1 capital planning comparisons (demo).',
    results: [
      runResult(INST_IDS.meridian, 15.3, 14.8, 128.0, 124.0, 6.9, 7.3, 4576.5),
      runResult(INST_IDS.northstar, 16.1, 15.6, 112.4, 108.4, 3.4, 3.8, 1964.6),
      runResult(INST_IDS.unity, 19.9, 19.4, 165.0, 161.0, 2.1, 2.5, 780.4),
      runResult(INST_IDS.crestline, 13.1, 12.6, 128.5, 124.5, 0.4, 0.8, 294.7),
      runResult(INST_IDS.aurora, 16.8, 16.3, 132.8, 128.8, 2.8, 3.2, 1057.1),
      runResult(INST_IDS.delta, 14.0, 13.5, 118.4, 114.4, 7.4, 7.8, 214.3),
      runResult(INST_IDS.sentinel, 15.8, 15.3, 187.0, 183.0, 0.9, 1.3, 2588.6),
      runResult(INST_IDS.vanguard, 6.9, 6.4, 92.0, 88.0, 20.5, 20.9, 1904.7),
    ],
    sensitivity: sensRows(0.4),
  },
  {
    id: demoUuid(65, 11), reference: 'RUN-2026-003',
    scenarioId: demoUuid(65, 2), scenarioReference: 'SCN-2026-002', scenarioName: 'Severe Macro-Financial Shock (demo)',
    runAt: iso(2026, 10, 30), runByName: 'Fatima Bello', status: 'Approved',
    reviewerName: 'Samuel Tunde', reviewedAt: iso(2026, 11, 6),
    reviewNote: 'Severe-scenario leg approved for the November financial-stability briefing. All outcomes illustrative demo data — not official regulatory stress-test results.',
    results: [
      runResult(INST_IDS.meridian, 15.4, 10.2, 128.0, 96.8, 6.9, 13.4, 4577.0),
      runResult(INST_IDS.northstar, 16.2, 12.4, 104.2, 78.4, 3.4, 9.9, 1965.0),
      runResult(INST_IDS.unity, 20.0, 15.4, 165.0, 121.4, 2.1, 8.6, 780.0),
      runResult(INST_IDS.crestline, 13.2, 8.3, 128.5, 92.6, 0.4, 0.4, 295.0),
      runResult(INST_IDS.aurora, 16.9, 12.5, 132.8, 99.6, 2.8, 9.3, 1057.0),
      runResult(INST_IDS.delta, 14.1, 9.0, 118.4, 84.2, 7.4, 13.9, 214.0),
      runResult(INST_IDS.sentinel, 15.8, 12.6, 187.0, 138.2, 0.9, 7.4, 2589.0),
      runResult(INST_IDS.vanguard, 6.4, 1.6, 88.0, 54.2, 20.5, 27.0, 1905.0),
    ],
    sensitivity: sensRows(1.0),
  },
  {
    id: demoUuid(65, 12), reference: 'RUN-2026-004',
    scenarioId: demoUuid(65, 3), scenarioReference: 'SCN-2026-003', scenarioName: 'Idiosyncratic Funding Stress — Merchant Bank (demo)',
    runAt: iso(2026, 11, 16), runByName: 'Amara Osei', status: 'Submitted',
    results: [
      runResult(INST_IDS.northstar, 16.2, 14.1, 104.2, 82.6, 3.4, 4.8, 1965.0),
    ],
    sensitivity: sensRows(0.7),
  },
]

// ---------------------------------------------------------------------------
// Prudential indicator catalogue (Spec §8.5)
// ---------------------------------------------------------------------------

const ind = (
  n: number, code: string, name: string, definition: string, formula: string,
  unit: PrudentialIndicatorDefinition['unit'],
  thresholds: PrudentialIndicatorDefinition['thresholds'], severityNote: string,
  frequency: PrudentialIndicatorDefinition['frequency'], effectiveFrom: string,
  sourceReturnFields: string[], validationRules: string[], ruleVersion: string,
  applicableInstitutionTypes: string[] = [],
): PrudentialIndicatorDefinition => ({
  id: demoUuid(66, n), code, name, definition, formula, unit,
  applicableInstitutionTypes, thresholds, severityNote, frequency,
  effectiveFrom, sourceReturnFields, validationRules, ruleVersion,
})

export const INDICATOR_DEFINITIONS: PrudentialIndicatorDefinition[] = [
  ind(1, 'CAR', 'Capital Adequacy Ratio', 'Total regulatory capital as a percentage of risk-weighted assets.', 'Total capital ÷ RWA × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '12.5' }, { severity: 'Red', operator: 'below', value: '10.0' }],
    'Amber = watch band above the minimum; Red = breach of the demo 10% minimum.', 'Monthly', iso(2026, 1, 1),
    ['MPR-09.totalCapital', 'MPR-09.rwaTotal', 'MPR-09.car'],
    ['totalCapital = tier1Capital + tier2Capital (reconciliation check)', 'car = totalCapital ÷ rwaTotal × 100 within ±0.1 tolerance'],
    PRUDENTIAL_RULE_VERSIONS.car),
  ind(2, 'CET1R', 'CET1 Ratio', 'Common equity Tier 1 capital as a percentage of risk-weighted assets.', 'CET1 ÷ RWA × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '8.5' }, { severity: 'Red', operator: 'below', value: '7.0' }],
    'Core-capital quality measure; feeds the capital composition panel (§8.1).', 'Monthly', iso(2026, 1, 1),
    ['MPR-09.tier1Capital', 'MPR-09.rwaTotal'],
    ['CET1 ≤ Tier 1 ≤ Total capital (monotonic check)'],
    PRUDENTIAL_RULE_VERSIONS.car),
  ind(3, 'LCR', 'Liquidity Coverage Ratio', 'High-quality liquid assets as a percentage of 30-day net cash outflows under stress.', 'HQLA ÷ 30-day net cash outflows × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '110.0' }, { severity: 'Red', operator: 'below', value: '100.0' }],
    'Amber watch level 110% (demo): two consecutive amber observations trigger analyst assignment — the EWA-2026-011 pattern.', 'Monthly', iso(2026, 1, 1),
    ['MPR-04.hqla', 'MPR-04.netOutflows30d', 'MPR-04.lcr'],
    ['lcr = hqla ÷ netOutflows30d × 100 within ±0.1 tolerance', 'hqla > 0 for all deposit-taking categories'],
    PRUDENTIAL_RULE_VERSIONS.lcr),
  ind(4, 'NSFR', 'Net Stable Funding Ratio', 'Available stable funding as a percentage of required stable funding.', 'ASF ÷ RSF × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '105.0' }, { severity: 'Red', operator: 'below', value: '100.0' }],
    'Structural funding measure over a one-year horizon (demo).', 'Quarterly', iso(2026, 1, 1),
    ['QSL-03.availableStableFunding', 'QSL-03.requiredStableFunding'],
    ['nsfr = ASF ÷ RSF × 100 within ±0.1 tolerance'],
    PRUDENTIAL_RULE_VERSIONS.nsfr),
  ind(5, 'NPL', 'Non-Performing Loan Ratio', 'Non-performing loans (90+ days past due or restructured non-performing) as a percentage of gross loans.', 'NPLs ÷ gross loans × 100', '%',
    [{ severity: 'Amber', operator: 'above', value: '6.0' }, { severity: 'Red', operator: 'above', value: '8.0' }],
    'Lower is better; the Meridian amber reading (6.9%) is driven by two large exposures under watch.', 'Quarterly', iso(2026, 1, 1),
    ['QAR-02.grossLoansMM', 'QAR-02.nplsMM', 'QAR-02.nplRatio'],
    ['nplRatio = nplsMM ÷ grossLoansMM × 100 within ±0.1 tolerance', 're-aged facilities must be classified by concession status (demo rule)'],
    PRUDENTIAL_RULE_VERSIONS.npl),
  ind(6, 'PC', 'Provision Coverage of NPLs', 'Loan-loss provisions held against non-performing loans.', 'Provisions ÷ NPLs × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '100.0' }, { severity: 'Red', operator: 'below', value: '80.0' }],
    'Delta at 92.0% is amber with FND-2026-048 (micro-loan provisioning shortfall) open.', 'Quarterly', iso(2026, 1, 1),
    ['QAR-02.provisionCoveragePct', 'QAR-02.nplsMM'],
    ['provisions ≥ 0', 'coverage recomputed from classification schedule within ±0.5 tolerance'],
    PRUDENTIAL_RULE_VERSIONS.pc),
  ind(7, 'DC', 'Deposit Concentration (largest depositor)', 'Largest single depositor as a percentage of total deposits.', 'Largest depositor ÷ total deposits × 100', '%',
    [{ severity: 'Amber', operator: 'above', value: '20.0' }, { severity: 'Red', operator: 'above', value: '25.0' }],
    'Lower is better; Delta\u2019s EXC-2026-005 amber observation (October, 22.8%) cleared after the large deposit partially unwound.', 'Monthly', iso(2026, 1, 1),
    ['QSL-03.top10DepositorPct', 'QSL-03.largestDepositorPct'],
    ['largestDepositorPct ≤ top10DepositorPct', 'both ≤ 100'],
    PRUDENTIAL_RULE_VERSIONS.dc),
  ind(8, 'FXOP', 'FX Net Open Position', 'Aggregate net open FX position as a percentage of total capital.', 'Σ |net open position| ÷ total capital × 100', '%',
    [{ severity: 'Amber', operator: 'above', value: '10.0' }, { severity: 'Red', operator: 'above', value: '20.0' }],
    'Vanguard\u2019s unhedged bond portfolio keeps this under enhanced monitoring (demo).', 'Monthly', iso(2026, 1, 1),
    ['MPR-04.fxNetOpenPosition', 'MPR-09.totalCapital'],
    ['per-currency net positions sum to the aggregate within ±0.1 tolerance'],
    PRUDENTIAL_RULE_VERSIONS.fx),
  ind(9, 'LEV', 'Leverage Ratio', 'Tier 1 capital as a percentage of total (unweighted) exposure.', 'Tier 1 ÷ total exposure × 100', '%',
    [{ severity: 'Amber', operator: 'below', value: '4.0' }, { severity: 'Red', operator: 'below', value: '3.0' }],
    'Vanguard reported 2.8% in the October MPR-09 — red under the demo calibration.', 'Monthly', iso(2026, 1, 1),
    ['MPR-09.leverageRatio', 'MPR-09.tier1Capital'],
    ['leverageRatio recomputed from the exposure measure within ±0.1 tolerance'],
    PRUDENTIAL_RULE_VERSIONS.lev),
]

export const INDICATOR_THRESHOLD_HISTORY: Record<string, IndicatorThresholdHistoryRow[]> = {
  CAR: [
    { version: 'TH-CAR-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Amber watch level raised 12.0 → 12.5; minimum unchanged at 10.0 (demo recalibration).', approvedByName: 'Samuel Tunde' },
    { version: 'TH-CAR-2025.2 (demo)', effectiveFrom: iso(2025, 7, 1), change: 'Initial demo calibration for the prototype story-world.', approvedByName: 'Samuel Tunde' },
  ],
  CET1R: [
    { version: 'TH-CAR-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'CET1 sub-limits introduced alongside the CAR recalibration (demo).', approvedByName: 'Samuel Tunde' },
  ],
  LCR: [
    { version: 'TH-LCR-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Two-consecutive-observation escalation rule added — applied in EWA-2026-011 (demo).', approvedByName: 'Daniel Adeyemi' },
    { version: 'TH-LCR-2025.1 (demo)', effectiveFrom: iso(2025, 1, 1), change: 'Initial demo calibration: amber 110 / red 100.', approvedByName: 'Daniel Adeyemi' },
  ],
  NSFR: [
    { version: 'TH-NSFR-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Initial demo calibration for the prototype story-world.', approvedByName: 'Daniel Adeyemi' },
  ],
  NPL: [
    { version: 'TH-NPL-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Amber lowered 6.5 → 6.0 after the 2025 portfolio review (demo).', approvedByName: 'Samuel Tunde' },
    { version: 'TH-NPL-2025.1 (demo)', effectiveFrom: iso(2025, 1, 1), change: 'Initial demo calibration: amber 6.5 / red 8.0.', approvedByName: 'Samuel Tunde' },
  ],
  PC: [
    { version: 'TH-PC-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Initial demo calibration: amber below 100 / red below 80.', approvedByName: 'Samuel Tunde' },
  ],
  DC: [
    { version: 'TH-DC-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Largest-depositor basis clarified; top-10 measure kept informational (demo).', approvedByName: 'Daniel Adeyemi' },
    { version: 'TH-DC-2025.1 (demo)', effectiveFrom: iso(2025, 1, 1), change: 'Initial demo calibration: amber above 20 / red above 25.', approvedByName: 'Daniel Adeyemi' },
  ],
  FXOP: [
    { version: 'TH-FXOP-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Initial demo calibration for the prototype story-world.', approvedByName: 'Daniel Adeyemi' },
  ],
  LEV: [
    { version: 'TH-LEV-2026.1 (demo)', effectiveFrom: iso(2026, 1, 1), change: 'Initial demo calibration: amber below 4.0 / red below 3.0.', approvedByName: 'Samuel Tunde' },
  ],
}

/**
 * Latest-period seeds for indicators not derivable from the quarterly
 * financial snapshots (NSFR, PC, DC, FXOP, LEV). CAR/LCR/NPL readings come
 * straight from FINANCIAL_SNAPSHOTS in the repository — Northstar's Q3
 * liquidityRatioPct is exactly the 104.2 LCR of the EWA-2026-011 story.
 */
export const INDICATOR_LATEST_SEEDS: Record<string, Record<string, number>> = {
  // code -> institutionId -> latest value
  NSFR: {
    [INST_IDS.meridian]: 121.4, [INST_IDS.northstar]: 108.6, [INST_IDS.unity]: 142.8,
    [INST_IDS.crestline]: 118.2, [INST_IDS.aurora]: 124.6, [INST_IDS.delta]: 106.2,
    [INST_IDS.sentinel]: 158.4, [INST_IDS.vanguard]: 94.2,
  },
  PC: {
    [INST_IDS.meridian]: 118.4, [INST_IDS.northstar]: 132.5, [INST_IDS.unity]: 148.2,
    [INST_IDS.crestline]: 0, [INST_IDS.aurora]: 121.4, [INST_IDS.delta]: 92.0,
    [INST_IDS.sentinel]: 165.0, [INST_IDS.vanguard]: 61.2,
  },
  DC: {
    [INST_IDS.meridian]: 8.4, [INST_IDS.northstar]: 21.4, [INST_IDS.unity]: 4.2,
    [INST_IDS.crestline]: 14.2, [INST_IDS.aurora]: 9.6, [INST_IDS.delta]: 19.8,
    [INST_IDS.sentinel]: 7.4, [INST_IDS.vanguard]: 16.8,
  },
  FXOP: {
    [INST_IDS.meridian]: 2.4, [INST_IDS.northstar]: 4.8, [INST_IDS.unity]: 0.6,
    [INST_IDS.crestline]: 1.8, [INST_IDS.aurora]: 2.2, [INST_IDS.delta]: 3.4,
    [INST_IDS.sentinel]: 6.2, [INST_IDS.vanguard]: 12.6,
  },
  LEV: {
    [INST_IDS.meridian]: 5.4, [INST_IDS.northstar]: 6.1, [INST_IDS.unity]: 7.2,
    [INST_IDS.crestline]: 4.8, [INST_IDS.aurora]: 5.9, [INST_IDS.delta]: 4.2,
    [INST_IDS.sentinel]: 8.4, [INST_IDS.vanguard]: 2.8,
  },
}

/** Latest-period label for the seed-derived indicators. */
export const INDICATOR_LATEST_PERIOD = 'October 2026'

/**
 * Explicit 4-period histories (oldest → latest) for seed-derived readings
 * where the story needs exact values; everything else drifts gently from
 * the latest seed in the repository.
 */
export const SEED_HISTORY_OVERRIDES: Record<string, Record<string, number[]>> = {
  // Delta DC: 22.8% October reading = EXC-2026-005 observed value (cleared).
  DC: { [INST_IDS.delta]: [25.2, 24.4, 23.6, 22.8] },
  // Northstar NSFR mirrors the LCR slide (quarterly labels Q1–Q3 2026).
  NSFR: { [INST_IDS.northstar]: [114.6, 111.2, 108.6] },
}

/** Monthly / quarterly reading labels for seed-derived indicators. */
export const SEED_MONTHLY_LABELS = ['July 2026', 'August 2026', 'September 2026', 'October 2026']
export const SEED_QUARTERLY_LABELS = ['Q1 2026', 'Q2 2026', 'Q3 2026']

/** Cross-module anchors keyed `CODE|institutionId|periodLabel` → refs. */
export const INDICATOR_STORY_ANCHORS: Record<string, { alertRef?: string; exceptionRef?: string }> = {
  'LCR|northstar|Q3 2026': { alertRef: 'EWA-2026-011', exceptionRef: 'EXC-2026-011' },
  'CAR|vanguard|Q3 2026': { alertRef: 'EWA-2026-008', exceptionRef: 'EXC-2026-008' },
  'NPL|meridian|Q3 2026': { alertRef: 'EWA-2026-013', exceptionRef: 'EXC-2026-013' },
  'NPL|vanguard|Q3 2026': { exceptionRef: 'EXC-2026-016' },
  'PC|delta|Q3 2026': { exceptionRef: 'EXC-2026-018' },
  'DC|delta|Q3 2026': { alertRef: 'EWA-2026-005', exceptionRef: 'EXC-2026-005' },
}

/** Short institution key for the anchor map above. */
export const INST_KEY_BY_ID: Record<string, string> = {
  [INST_IDS.meridian]: 'meridian',
  [INST_IDS.northstar]: 'northstar',
  [INST_IDS.unity]: 'unity',
  [INST_IDS.crestline]: 'crestline',
  [INST_IDS.aurora]: 'aurora',
  [INST_IDS.delta]: 'delta',
  [INST_IDS.sentinel]: 'sentinel',
  [INST_IDS.vanguard]: 'vanguard',
}

/** Re-export for repository/service consumers that build trends. */
export { FINANCIAL_SNAPSHOTS }
