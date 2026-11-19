/**
 * Regulatory returns demo dataset (Spec §11.1–§11.3, §17.5 — Phase 3A).
 * Four return definitions (MPR-09, MPR-04, QSL-03, QAR-02) with fields,
 * demo validation rules and certification requirements, plus full
 * submission details built on top of the Phase-2A RETURN_SUBMISSIONS
 * summaries. One story-world: Northstar's MPR-04 liquidity warnings feed
 * EWA-2026-011 → EXM-2026-024; Vanguard's MPR-09 capital errors feed
 * EWA-2026-008 → ENF-2026-002; Meridian's QAR-02 NPL figure feeds
 * EWA-2026-013. All figures are illustrative demo data.
 */
import { demoUuid, iso, isoDateTime } from '@/mocks/fixtures/demoIds'
import { JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { RETURN_SUBMISSIONS } from '@/mocks/fixtures/supervision.fixture'
import type { ReturnSubmission } from '@/types/supervision'
import type {
  ReturnCertificationRequirement,
  ReturnCrossException,
  ReturnDefinition,
  ReturnField,
  ReturnFieldValidation,
  ReturnReconciliationRow,
  ReturnReviewNote,
  ReturnRuleKind,
  ReturnSubmissionDetail,
  ReturnSubmissionEvent,
  ReturnSubmissionVersion,
  ReturnValidationResult,
  SubmittedDataPoint,
} from '@/types/returns'

const MBA = JURISDICTIONS[0]

export const RETURNS_THRESHOLD_NOTE =
  'All thresholds and validation rules in this template are illustrative demo values until approved regulatory rules are loaded (Spec §17.5).'

// ---------------------------------------------------------------------------
// Field / rule builders
// ---------------------------------------------------------------------------

let fieldSeq = 0
let ruleSeq = 0

const rule = (
  kind: ReturnRuleKind,
  expression: string,
  severity: 'Error' | 'Warning',
  message: string,
  params?: Record<string, string>,
): ReturnFieldValidation => {
  ruleSeq += 1
  return { id: demoUuid(41, ruleSeq), rule: kind, expression, severity, message, params }
}

interface FieldSeed {
  unit?: string
  required?: boolean
  helpText?: string
  rules?: ReturnFieldValidation[]
}

const fld = (
  code: string,
  label: string,
  section: string,
  type: ReturnField['type'],
  seed: FieldSeed = {},
): ReturnField => {
  fieldSeq += 1
  return {
    id: demoUuid(42, fieldSeq),
    code,
    label,
    section,
    type,
    unit: seed.unit,
    required: seed.required ?? false,
    order: fieldSeq,
    helpText: seed.helpText,
    validationRules: seed.rules ?? [],
  }
}

const cert = (n: number, officerRole: string, statement: string): ReturnCertificationRequirement => ({
  id: demoUuid(43, n),
  officerRole,
  statement,
  mandatory: true,
})

const CFO_STATEMENT =
  'I certify that the figures in this return are a true and fair representation of the institution records for the reporting period (demo certification statement).'

// ---------------------------------------------------------------------------
// Return definitions (Spec §11.2)
// ---------------------------------------------------------------------------

export const RETURN_DEFINITIONS: ReturnDefinition[] = [
  {
    id: demoUuid(40, 1),
    code: 'MPR-09',
    name: 'Monthly prudential return — capital adequacy',
    description:
      'Monthly capital base, risk-weighted assets and capital adequacy reporting for all deposit-taking institutions (demo definition).',
    jurisdictionId: MBA.id,
    jurisdictionCode: MBA.code,
    institutionCategories: [],
    frequency: 'Monthly',
    reportingBasis: 'Consolidated',
    effectiveFrom: iso(2026, 1, 1),
    submissionFormat: 'XBRL',
    currentVersion: '2026.2',
    approvalStatus: 'Approved',
    ownerTeamName: 'Prudential Supervision — Capital Desk',
    fields: [
      fld('tier1Capital', 'Tier 1 capital', 'Capital base', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('required', 'tier1Capital is present', 'Error', 'Tier 1 capital is required.'), rule('minimum', 'value >= 0', 'Error', 'Tier 1 capital cannot be negative.', { min: '0' })],
      }),
      fld('tier2Capital', 'Tier 2 capital', 'Capital base', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('required', 'tier2Capital is present', 'Error', 'Tier 2 capital is required.')],
      }),
      fld('totalCapital', 'Total capital base', 'Capital base', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [
          rule('reconciliation', 'tier1Capital + tier2Capital == totalCapital', 'Error', 'Total capital base does not reconcile with Tier 1 + Tier 2.', { addends: 'tier1Capital,tier2Capital', total: 'totalCapital', tolerance: '0.5' }),
        ],
      }),
      fld('rwaTotal', 'Total risk-weighted assets', 'Risk-weighted assets', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('minimum', 'value > 0', 'Error', 'Risk-weighted assets must be positive.', { min: '0', exclusive: 'true' })],
      }),
      fld('car', 'Capital adequacy ratio (CAR)', 'Ratios', 'percentage', {
        required: true,
        helpText: 'Demo regulatory minimum 10.0% — illustrative value.',
        rules: [rule('minimum', 'value >= 10.0', 'Error', 'CAR is below the demo regulatory minimum of 10.0%.', { min: '10.0' })],
      }),
      fld('leverageRatio', 'Leverage ratio', 'Ratios', 'percentage', {
        rules: [rule('minimum', 'value >= 4.0', 'Warning', 'Leverage ratio is below the demo 4.0% watch level.', { min: '4.0' })],
      }),
      fld('insiderLendingPct', 'Insider lending as % of capital', 'Concentration', 'percentage', {
        rules: [rule('maximum', 'value <= 25.0', 'Warning', 'Insider lending exceeds the demo 25.0% watch level.', { max: '25.0' })],
      }),
    ],
    certification: [cert(1, 'Chief Financial Officer', CFO_STATEMENT)],
    versions: [
      { version: '2026.1', effectiveFrom: iso(2025, 1, 1), effectiveTo: iso(2025, 12, 31), changeSummary: '2025 annual cycle — demo historical version.', approvedByName: 'Amara Osei', approvedAt: iso(2024, 12, 10) },
      { version: '2026.2', effectiveFrom: iso(2026, 1, 1), changeSummary: 'Added leverage ratio watch level and insider-lending concentration field (demo change).', approvedByName: 'Amara Osei', approvedAt: iso(2025, 12, 18) },
    ],
    thresholdNote: RETURNS_THRESHOLD_NOTE,
  },
  {
    id: demoUuid(40, 2),
    code: 'MPR-04',
    name: 'Monthly prudential return — liquidity',
    description:
      'Monthly liquidity coverage, funding concentration and encumbrance reporting (demo definition).',
    jurisdictionId: MBA.id,
    jurisdictionCode: MBA.code,
    institutionCategories: [],
    frequency: 'Monthly',
    reportingBasis: 'Consolidated',
    effectiveFrom: iso(2026, 1, 1),
    submissionFormat: 'XBRL',
    currentVersion: '2026.2',
    approvalStatus: 'Approved',
    ownerTeamName: 'Prudential Supervision — Liquidity Desk',
    fields: [
      fld('hqla', 'High-quality liquid assets (HQLA)', 'Liquidity coverage', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('required', 'hqla is present', 'Error', 'HQLA is required.')],
      }),
      fld('netOutflows30d', '30-day net cash outflows', 'Liquidity coverage', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('minimum', 'value > 0', 'Error', 'Net outflows must be positive.', { min: '0', exclusive: 'true' })],
      }),
      fld('lcr', 'Liquidity Coverage Ratio (LCR)', 'Liquidity coverage', 'percentage', {
        required: true,
        helpText: 'Demo red floor 100.0%, amber watch 110.0% — illustrative values.',
        rules: [
          rule('minimum', 'value >= 100.0', 'Error', 'LCR is below the demo regulatory floor of 100.0%.', { min: '100.0' }),
          rule('minimum', 'value >= 110.0', 'Warning', 'LCR is below the demo amber watch level of 110.0%.', { min: '110.0' }),
        ],
      }),
      fld('contingencyFundingTested', 'Contingency funding plan tested this period', 'Liquidity coverage', 'boolean', {
        required: true,
        rules: [rule('required', 'contingencyFundingTested is present', 'Error', 'Contingency funding plan attestation is required.')],
      }),
      fld('top10FundingPct', 'Top-10 counterparty funding %', 'Funding concentration', 'percentage', {
        rules: [rule('maximum', 'value <= 40.0', 'Warning', 'Top-10 funding concentration exceeds the demo 40.0% watch level.', { max: '40.0' })],
      }),
      fld('encumberedAssetsPct', 'Encumbered assets %', 'Funding concentration', 'percentage', {
        rules: [rule('maximum', 'value <= 20.0', 'Warning', 'Asset encumbrance exceeds the demo 20.0% watch level.', { max: '20.0' })],
      }),
    ],
    certification: [cert(2, 'Chief Financial Officer', CFO_STATEMENT)],
    versions: [
      { version: '2026.1', effectiveFrom: iso(2025, 1, 1), effectiveTo: iso(2025, 12, 31), changeSummary: '2025 annual cycle — demo historical version.', approvedByName: 'Amara Osei', approvedAt: iso(2024, 12, 10) },
      { version: '2026.2', effectiveFrom: iso(2026, 1, 1), changeSummary: 'Added encumbered-assets watch level (demo change).', approvedByName: 'Amara Osei', approvedAt: iso(2025, 12, 18) },
    ],
    thresholdNote: RETURNS_THRESHOLD_NOTE,
  },
  {
    id: demoUuid(40, 3),
    code: 'QSL-03',
    name: 'Quarterly liquidity return',
    description:
      'Quarterly liquidity averages, depositor concentration and intraday buffer reporting (demo definition).',
    jurisdictionId: MBA.id,
    jurisdictionCode: MBA.code,
    institutionCategories: [],
    frequency: 'Quarterly',
    reportingBasis: 'Consolidated',
    effectiveFrom: iso(2026, 1, 1),
    submissionFormat: 'Excel workbook',
    currentVersion: '2026.1',
    approvalStatus: 'Approved',
    ownerTeamName: 'Prudential Supervision — Liquidity Desk',
    fields: [
      fld('lcrQuarterAvg', 'LCR quarterly average', 'Liquidity coverage', 'percentage', {
        required: true,
        rules: [
          rule('minimum', 'value >= 100.0', 'Error', 'Quarterly average LCR is below the demo 100.0% floor.', { min: '100.0' }),
          rule('minimum', 'value >= 110.0', 'Warning', 'Quarterly average LCR is below the demo 110.0% amber watch level.', { min: '110.0' }),
        ],
      }),
      fld('contingencyPlanTested', 'Contingency funding plan stress-tested', 'Liquidity coverage', 'boolean', {
        required: true,
        rules: [rule('required', 'contingencyPlanTested is present', 'Error', 'Contingency plan attestation is required.')],
      }),
      fld('intradayBufferMM', 'Intraday liquidity buffer', 'Intraday', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('minimum', 'value >= 0', 'Error', 'Intraday buffer cannot be negative.', { min: '0' })],
      }),
      fld('top10DepositorPct', 'Top-10 depositor concentration %', 'Funding concentration', 'percentage', {
        rules: [rule('maximum', 'value <= 40.0', 'Warning', 'Top-10 depositor concentration exceeds the demo 40.0% watch level.', { max: '40.0' })],
      }),
      fld('encumberedAssetsPct', 'Encumbered assets %', 'Funding concentration', 'percentage', {
        rules: [rule('maximum', 'value <= 20.0', 'Warning', 'Asset encumbrance exceeds the demo 20.0% watch level.', { max: '20.0' })],
      }),
    ],
    certification: [cert(3, 'Chief Financial Officer', CFO_STATEMENT)],
    versions: [
      { version: '2026.1', effectiveFrom: iso(2026, 1, 1), changeSummary: 'Initial 2026 template (demo).', approvedByName: 'Amara Osei', approvedAt: iso(2025, 12, 18) },
    ],
    thresholdNote: RETURNS_THRESHOLD_NOTE,
  },
  {
    id: demoUuid(40, 4),
    code: 'QAR-02',
    name: 'Quarterly asset quality return',
    description:
      'Quarterly loan book quality: NPL ratio, provision coverage, restructured exposures and PAR buckets (demo definition).',
    jurisdictionId: MBA.id,
    jurisdictionCode: MBA.code,
    institutionCategories: [],
    frequency: 'Quarterly',
    reportingBasis: 'Consolidated',
    effectiveFrom: iso(2026, 1, 1),
    submissionFormat: 'XBRL',
    currentVersion: '2026.1',
    approvalStatus: 'Approved',
    ownerTeamName: 'Prudential Supervision — Credit Desk',
    fields: [
      fld('grossLoansMM', 'Gross loans and advances', 'Loan book', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('minimum', 'value > 0', 'Error', 'Gross loans must be positive.', { min: '0', exclusive: 'true' })],
      }),
      fld('nplsMM', 'Non-performing loans (NPLs)', 'Loan book', 'decimal', {
        unit: 'MRD m',
        required: true,
        rules: [rule('minimum', 'value >= 0', 'Error', 'NPLs cannot be negative.', { min: '0' })],
      }),
      fld('nplRatio', 'NPL ratio', 'Ratios', 'percentage', {
        required: true,
        helpText: 'Demo error ceiling 8.0%; off-site surveillance monitors a tighter amber threshold (illustrative).',
        rules: [
          rule('maximum', 'value <= 8.0', 'Error', 'NPL ratio exceeds the demo 8.0% regulatory ceiling.', { max: '8.0' }),
          rule('cross-field', 'nplsMM / grossLoansMM * 100 == nplRatio', 'Error', 'NPL ratio does not agree with reported NPLs over gross loans.', { numerator: 'nplsMM', denominator: 'grossLoansMM', scale: '100', tolerance: '0.2' }),
        ],
      }),
      fld('provisionCoveragePct', 'Provision coverage of NPLs %', 'Provisioning', 'percentage', {
        rules: [rule('minimum', 'value >= 100.0', 'Warning', 'Provision coverage is below the demo 100.0% standard.', { min: '100.0' })],
      }),
      fld('restructuredLoansPct', 'Restructured loans %', 'Loan book', 'percentage', {
        rules: [rule('maximum', 'value <= 5.0', 'Warning', 'Restructured exposures exceed the demo 5.0% watch level.', { max: '5.0' })],
      }),
      fld('par30To90MM', 'Portfolio at risk 30–90 days', 'Loan book', 'decimal', { unit: 'MRD m' }),
    ],
    certification: [cert(4, 'Chief Financial Officer', CFO_STATEMENT)],
    versions: [
      { version: '2026.1', effectiveFrom: iso(2026, 1, 1), changeSummary: 'Initial 2026 template (demo).', approvedByName: 'Amara Osei', approvedAt: iso(2025, 12, 18) },
    ],
    thresholdNote: RETURNS_THRESHOLD_NOTE,
  },
]

export const DEFINITION_BY_CODE: Record<string, ReturnDefinition> = Object.fromEntries(
  RETURN_DEFINITIONS.map((d) => [d.code, d]),
)

// ---------------------------------------------------------------------------
// Demo validation engine (illustrative — never presented as real validation)
// ---------------------------------------------------------------------------

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

let evalSeq = 0
const errId = (): string => {
  evalSeq += 1
  return demoUuid(44, evalSeq * 7 + (Date.now() % 1000))
}

/**
 * The demo rule engine: evaluates a definition's field rules against the
 * submitted data points. Deterministic for the same inputs; used both to
 * pre-compute fixture results and by the live "Run validation" action.
 */
export function evaluateValidation(
  def: ReturnDefinition,
  data: SubmittedDataPoint[],
  runAt: string,
  crossReturnExceptions: ReturnCrossException[] = [],
): ReturnValidationResult {
  const fieldErrors: ReturnValidationResult['fieldErrors'] = []
  const byCode = new Map(data.map((d) => [d.fieldCode, d.value]))

  if (data.length === 0) {
    return {
      runAt,
      engine: 'Atheris demo rule engine (illustrative)',
      status: 'Not Run',
      errorCount: 0,
      warningCount: 0,
      fieldErrors: [],
      crossReturnExceptions: [],
      summary: 'No submitted data — validation has not been run for this period.',
    }
  }

  for (const field of def.fields) {
    const value = byCode.get(field.code)
    for (const r of field.validationRules) {
      const push = (submittedValue?: string, expected?: string) =>
        fieldErrors.push({
          id: errId(),
          fieldCode: field.code,
          fieldLabel: field.label,
          rule: r.rule,
          severity: r.severity,
          message: r.message,
          submittedValue,
          expected,
        })

      if (r.rule === 'required') {
        if (value === undefined || value.trim() === '') push(value, 'A value is required')
        continue
      }
      const n = num(value)
      if (n === null) continue
      if (r.rule === 'minimum') {
        const min = num(r.params?.min)
        if (min !== null && (r.params?.exclusive === 'true' ? n <= min : n < min)) {
          push(value, `>= ${r.params?.min}`)
        }
      } else if (r.rule === 'maximum') {
        const max = num(r.params?.max)
        if (max !== null && n > max) push(value, `<= ${r.params?.max}`)
      } else if (r.rule === 'reconciliation') {
        const addends = (r.params?.addends ?? '').split(',').filter(Boolean)
        const total = num(byCode.get(r.params?.total ?? ''))
        const sum = addends.reduce((acc, code) => acc + (num(byCode.get(code)) ?? 0), 0)
        const tolerance = num(r.params?.tolerance) ?? 0
        if (total !== null && Math.abs(sum - total) > tolerance) {
          push(value, `${addends.join(' + ')} = ${sum.toFixed(2)} (±${tolerance})`)
        }
      } else if (r.rule === 'cross-field') {
        const numerator = num(byCode.get(r.params?.numerator ?? ''))
        const denominator = num(byCode.get(r.params?.denominator ?? ''))
        const scale = num(r.params?.scale) ?? 1
        const tolerance = num(r.params?.tolerance) ?? 0
        if (numerator !== null && denominator !== null && denominator !== 0) {
          const computed = (numerator / denominator) * scale
          if (Math.abs(computed - n) > tolerance) push(value, computed.toFixed(2))
        }
      }
    }
  }

  const errorCount = fieldErrors.filter((e) => e.severity === 'Error').length
  const warningCount = fieldErrors.filter((e) => e.severity === 'Warning').length
  const status: ReturnValidationResult['status'] =
    errorCount > 0 ? 'Errors' : warningCount > 0 ? 'Warnings' : 'Passed'

  return {
    runAt,
    engine: 'Atheris demo rule engine (illustrative)',
    status,
    errorCount,
    warningCount,
    fieldErrors,
    crossReturnExceptions,
    summary:
      status === 'Passed'
        ? 'All demo field rules and reconciliation checks passed.'
        : `${errorCount} error${errorCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'} raised by the demo rule engine.`,
  }
}

// ---------------------------------------------------------------------------
// Submitted data (story-consistent values per submission)
// ---------------------------------------------------------------------------

const OFFICERS: Record<string, string> = {
  [INST_IDS.meridian]: 'Ebenezer Kalu',
  [INST_IDS.northstar]: 'Ibrahim Sani',
  [INST_IDS.unity]: 'Halima Abdullahi',
  [INST_IDS.crestline]: 'Zara Nwosu',
  [INST_IDS.aurora]: 'Segun Adeyinka',
  [INST_IDS.delta]: 'Ngozi Emenike',
  [INST_IDS.sentinel]: 'Chinwe Okoro',
  [INST_IDS.vanguard]: 'Kunle Oyelowo',
}

type DataSeed = Record<string, [value: string, prior?: string]>

/** Submitted values keyed by submission id; prior-period values drive the
 *  historical comparison on the detail screen (Spec §11.3). */
const SUBMISSION_DATA: Record<string, DataSeed> = {
  // Northstar MPR-04 October 2026 — the EWA-2026-011 source return (LCR 104.2)
  [demoUuid(23, 4)]: {
    hqla: ['214.6', '221.3'],
    netOutflows30d: ['205.9', '198.4'],
    lcr: ['104.2', '105.6'],
    contingencyFundingTested: ['true', 'true'],
    top10FundingPct: ['42.8', '41.1'],
    encumberedAssetsPct: ['14.2', '13.8'],
  },
  // Vanguard MPR-09 October 2026 — rejected: CAR 6.4 + capital reconciliation error
  [demoUuid(23, 3)]: {
    tier1Capital: ['96.8', '104.5'],
    tier2Capital: ['18.4', '20.1'],
    totalCapital: ['121.9', '124.6'],
    rwaTotal: ['1904.7', '1866.2'],
    car: ['6.4', '7.0'],
    leverageRatio: ['2.8', '3.1'],
    insiderLendingPct: ['28.4', '26.9'],
  },
  // Meridian QAR-02 Q3 2026 — accepted with review (NPL 6.9 feeds EWA-2026-013)
  [demoUuid(23, 5)]: {
    grossLoansMM: ['18450.0', '18120.5'],
    nplsMM: ['1273.1', '1198.4'],
    nplRatio: ['6.9', '6.6'],
    provisionCoveragePct: ['118.4', '121.7'],
    restructuredLoansPct: ['4.2', '4.0'],
    par30To90MM: ['640.2', '612.8'],
  },
  // Crestline QSL-03 Q3 2026 — clean pass
  ['sub-qsl03-crestline-2026-q3']: {
    lcrQuarterAvg: ['128.5', '131.2'],
    contingencyPlanTested: ['true', 'true'],
    intradayBufferMM: ['45.0', '47.5'],
    top10DepositorPct: ['31.4', '30.2'],
    encumberedAssetsPct: ['8.9', '9.4'],
  },
  // Aurora MPR-04 October 2026 — clean pass
  [demoUuid(23, 7)]: {
    hqla: ['182.3', '178.9'],
    netOutflows30d: ['137.3', '140.2'],
    lcr: ['132.8', '127.6'],
    contingencyFundingTested: ['true', 'true'],
    top10FundingPct: ['28.9', '29.4'],
    encumberedAssetsPct: ['9.8', '10.2'],
  },
  // Delta QAR-02 Q3 2026 — warnings (provision coverage + restructured loans)
  [demoUuid(23, 8)]: {
    grossLoansMM: ['128.4', '124.9'],
    nplsMM: ['9.5', '8.8'],
    nplRatio: ['7.4', '7.0'],
    provisionCoveragePct: ['92.0', '96.5'],
    restructuredLoansPct: ['5.6', '5.1'],
    par30To90MM: ['3.1', '2.8'],
  },
  // Sentinel MPR-09 October 2026 — clean pass, accepted
  [demoUuid(23, 9)]: {
    tier1Capital: ['320.4', '315.8'],
    tier2Capital: ['88.6', '87.9'],
    totalCapital: ['409.0', '403.7'],
    rwaTotal: ['2588.6', '2547.3'],
    car: ['15.8', '15.8'],
    leverageRatio: ['5.6', '5.5'],
    insiderLendingPct: ['8.2', '8.6'],
  },
  // Northstar QSL-03 Q3 2026 — accepted; Q3 average still above the amber watch level
  [demoUuid(23, 11)]: {
    lcrQuarterAvg: ['112.4', '116.8'],
    contingencyPlanTested: ['true', 'true'],
    intradayBufferMM: ['22.5', '24.1'],
    top10DepositorPct: ['35.2', '34.6'],
    encumberedAssetsPct: ['12.8', '12.1'],
  },
}

const CROSS_EXCEPTIONS: Record<string, ReturnCrossException[]> = {
  [demoUuid(23, 4)]: [
    {
      id: demoUuid(45, 1),
      description:
        'QSL-03 (Q3 2026) reported a quarterly average LCR of 112.4% while the October monthly observation is 104.2% — sharp intra-quarter deterioration flagged for analyst attention.',
      relatedReturnCode: 'QSL-03',
      severity: 'Warning',
    },
  ],
  [demoUuid(23, 8)]: [
    {
      id: demoUuid(45, 2),
      description:
        'Provision coverage 92.0% is below the demo 100% standard while FND-2026-048 (micro-loan provisioning shortfall) remains open for Delta Microfinance.',
      relatedReturnCode: 'QAR-02',
      severity: 'Warning',
    },
  ],
}

// ---------------------------------------------------------------------------
// Submission detail builder
// ---------------------------------------------------------------------------

const REVIEW_NOTES: Record<string, ReturnReviewNote[]> = {
  [demoUuid(23, 3)]: [
    {
      id: demoUuid(46, 1),
      at: isoDateTime(-5, 11, 20),
      authorName: 'Zainab Lawal',
      text: 'Rejected: CAR of 6.4% is below the demo regulatory minimum and the total capital base does not reconcile with Tier 1 + Tier 2. Correct and resubmit; figures feed enforcement case ENF-2026-002.',
      decision: 'Rejected',
    },
  ],
  [demoUuid(23, 4)]: [
    {
      id: demoUuid(46, 2),
      at: isoDateTime(-2, 9, 45),
      authorName: 'Fatima Bello',
      text: 'Review opened. LCR 104.2% is below the demo amber watch level for the second consecutive observation; consistent with EWA-2026-011. Awaiting desk review before acceptance.',
    },
  ],
  [demoUuid(23, 5)]: [
    {
      id: demoUuid(46, 3),
      at: isoDateTime(-16, 15, 10),
      authorName: 'Daniel Adeyemi',
      text: 'Accepted. NPL ratio 6.9% is within the demo return ceiling but above the off-site surveillance amber threshold — monitored via EWA-2026-013 and covered by EXM-2026-014 scope.',
      decision: 'Accepted',
    },
  ],
  [demoUuid(23, 11)]: [
    {
      id: demoUuid(46, 4),
      at: isoDateTime(-19, 10, 30),
      authorName: 'Fatima Bello',
      text: 'Accepted. Quarterly averages within demo thresholds; note the declining monthly LCR trend for Northstar.',
      decision: 'Accepted',
    },
  ],
  ['sub-qsl03-crestline-2026-q3']: [
    {
      id: demoUuid(46, 5),
      at: isoDateTime(-21, 14, 5),
      authorName: 'Kwame Mensah',
      text: 'Accepted without exception — all demo validation rules passed.',
      decision: 'Accepted',
    },
  ],
  [demoUuid(23, 9)]: [
    {
      id: demoUuid(46, 6),
      at: isoDateTime(-5, 16, 40),
      authorName: 'Chuka Eze',
      text: 'Accepted without exception — strong capital position maintained.',
      decision: 'Accepted',
    },
  ],
}

const REVIEWER_BY_SUB: Record<string, string> = {
  [demoUuid(23, 3)]: 'Zainab Lawal',
  [demoUuid(23, 4)]: 'Fatima Bello',
  [demoUuid(23, 5)]: 'Daniel Adeyemi',
  [demoUuid(23, 11)]: 'Fatima Bello',
  ['sub-qsl03-crestline-2026-q3']: 'Kwame Mensah',
  [demoUuid(23, 9)]: 'Chuka Eze',
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

let actSeq = 0
const act = (at: string, actorName: string, action: string, detail: string): ReturnSubmissionEvent => {
  actSeq += 1
  return { id: demoUuid(47, actSeq), at, actorName, action, detail }
}

export function buildSubmissionDetail(sub: ReturnSubmission): ReturnSubmissionDetail {
  const def = DEFINITION_BY_CODE[sub.returnCode]
  const seed = SUBMISSION_DATA[sub.id]
  const officer = OFFICERS[sub.institutionId] ?? 'Institution officer (demo)'
  const instCode = slug(Object.keys(INST_IDS).find((k) => INST_IDS[k as keyof typeof INST_IDS] === sub.institutionId) ?? 'inst')

  const data: SubmittedDataPoint[] = seed
    ? def.fields.map((f) => ({
        fieldCode: f.code,
        label: f.label,
        section: f.section,
        value: seed[f.code]?.[0] ?? '',
        unit: f.unit,
        priorValue: seed[f.code]?.[1],
      }))
    : []

  const validationResult = seed
    ? evaluateValidation(def, data, isoDateTime(-1, 6, 15), CROSS_EXCEPTIONS[sub.id] ?? [])
    : {
        runAt: isoDateTime(-1, 6, 0),
        engine: 'Atheris demo rule engine (illustrative)',
        status: 'Not Run' as const,
        errorCount: 0,
        warningCount: 0,
        fieldErrors: [],
        crossReturnExceptions: [],
        summary: 'No submission received for this period — validation has not been run.',
      }

  // Reconciliation rows (demo source-ledger comparison, Spec §11.3 tab 4)
  const reconciliation: ReturnReconciliationRow[] = []
  if (seed) {
    const anchors: Record<string, [fieldCode: string, label: string]> = {
      'MPR-09': ['totalCapital', 'Total capital base'],
      'MPR-04': ['hqla', 'High-quality liquid assets'],
      'QSL-03': ['intradayBufferMM', 'Intraday liquidity buffer'],
      'QAR-02': ['nplsMM', 'Non-performing loans'],
    }
    const anchor = anchors[sub.returnCode]
    if (anchor) {
      const reported = num(seed[anchor[0]]?.[0]) ?? 0
      // Vanguard's rejected MPR-09 carries the demo unreconciled capital base
      const source = sub.id === demoUuid(23, 3) ? 115.2 : reported - (sub.validation === 'Warnings' ? 0.3 : 0)
      const variance = Math.abs(reported - source)
      reconciliation.push({
        id: demoUuid(48, reconciliation.length + 1 + sub.returnCode.length),
        label: `${anchor[1]} vs source ledger (demo)`,
        returnValue: reported.toFixed(2),
        sourceValue: source.toFixed(2),
        variance: variance.toFixed(2),
        tolerance: '0.50',
        status: variance > 0.5 ? 'Unreconciled' : variance > 0 ? 'Within Tolerance' : 'Reconciled',
        note: variance > 0.5 ? 'Difference exceeds the demo tolerance — correction requested.' : undefined,
      })
    }
    reconciliation.push({
      id: demoUuid(48, 50 + sub.reference.length + sub.returnCode.length),
      label: 'Prior-period carry-forward check (demo)',
      returnValue: (seed[Object.keys(seed)[0]]?.[0] ?? '0').toString(),
      sourceValue: (seed[Object.keys(seed)[0]]?.[1] ?? seed[Object.keys(seed)[0]]?.[0] ?? '0').toString(),
      variance: '—',
      tolerance: 'n/a',
      status: 'Reconciled',
      note: 'Opening balances agree with the accepted prior-period return (demo check).',
    })
  }

  const versions: ReturnSubmissionVersion[] = []
  if (sub.version >= 2) {
    versions.push({
      version: 1,
      submittedAt: sub.submittedAt ? isoDateTime(-9, 10, 15) : undefined,
      byName: officer,
      note: 'Initial upload — demo validation engine raised errors; superseded by version 2.',
      validation: 'Errors',
      isCurrent: false,
    })
  }
  if (sub.submittedAt) {
    versions.push({
      version: sub.version,
      submittedAt: sub.submittedAt,
      byName: officer,
      note: sub.version >= 2 ? 'Corrected resubmission after rejection (demo).' : 'Submitted via the institution portal (demo).',
      validation: validationResult.status,
      isCurrent: true,
    })
  }

  const activity: ReturnSubmissionEvent[] = []
  if (sub.submittedAt) {
    activity.push(act(sub.submittedAt, officer, 'Submission received', `${sub.returnCode} for ${sub.period} uploaded via the institution portal (demo).`))
    activity.push(act(sub.submittedAt, 'System (demo)', 'Validation run', `Demo rule engine result: ${validationResult.status} (${validationResult.errorCount} errors, ${validationResult.warningCount} warnings).`))
  } else if (sub.status === 'Overdue') {
    activity.push(act(isoDateTime(-1, 18, 0), 'System (demo)', 'Deadline passed', `Return not received by ${sub.dueDate}; automatic demo reminder sent to the institution.`))
  } else {
    activity.push(act(isoDateTime(-6, 9, 0), 'System (demo)', 'Cycle opened', `${sub.returnCode} for ${sub.period} made available to the institution (demo).`))
  }
  const reviewer = REVIEWER_BY_SUB[sub.id]
  if (sub.reviewStatus === 'Under Review' && reviewer) {
    activity.push(act(isoDateTime(-2, 9, 45), reviewer, 'Review started', 'Submission picked up for supervisory review (demo).'))
  }
  if (sub.reviewStatus === 'Accepted' && reviewer) {
    activity.push(act(isoDateTime(-4, 12, 0), reviewer, 'Review decision — Accepted', 'Submission accepted into the supervisory record (demo).'))
  }
  if (sub.reviewStatus === 'Rejected' && reviewer) {
    activity.push(act(isoDateTime(-5, 11, 20), reviewer, 'Review decision — Rejected', 'Submission rejected; correction and resubmission requested (demo).'))
  }

  return {
    ...sub,
    definitionId: def.id,
    submittedByName: sub.submittedAt ? officer : undefined,
    submittedVia: sub.submittedAt ? 'Institution portal (demo)' : undefined,
    fileMetadata: sub.submittedAt
      ? {
          fileName: `${instCode}-${slug(sub.returnCode)}-${slug(sub.period)}.xbrl`,
          format: def.submissionFormat,
          sizeKb: 180 + (sub.reference.length * 37) % 240,
          uploadedAt: sub.submittedAt,
          uploadedByName: officer,
          checksum: `sha256-demo:${demoUuid(49, sub.reference.length * 13).replace(/-/g, '')}`,
        }
      : undefined,
    data,
    validationResult,
    reconciliation,
    reviewNotes: (REVIEW_NOTES[sub.id] ?? []).map((n) => ({ ...n })),
    versions,
    activity,
    certification: sub.submittedAt
      ? {
          certifiedByName: officer,
          certifiedRole: def.certification[0]?.officerRole ?? 'Chief Financial Officer',
          certifiedAt: sub.submittedAt,
          statement: def.certification[0]?.statement ?? CFO_STATEMENT,
        }
      : undefined,
  }
}

export const SUBMISSION_DETAILS: ReturnSubmissionDetail[] = RETURN_SUBMISSIONS.map(buildSubmissionDetail)
