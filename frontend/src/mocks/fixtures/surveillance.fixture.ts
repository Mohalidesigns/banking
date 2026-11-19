/**
 * Off-site surveillance & early-warning demo dataset (Spec §6.1, §6.4,
 * §17.5 — Phase 3A). Monitored ratio definitions, versioned illustrative
 * threshold rules, prudential exceptions, analyst reviews, supervisory
 * decision history, and full alert details built on the Phase-2A
 * EARLY_WARNING_ALERTS summaries. One story-world: EWA-2026-011 (Northstar
 * LCR amber) → analyst review ARV-2026-005 → targeted examination
 * EXM-2026-024; EWA-2026-008 (Vanguard CAR) → ENF-2026-002;
 * EWA-2026-013 (Meridian NPL) → EXM-2026-014 scope.
 *
 * EVERY threshold here is an illustrative demo value and is labelled as
 * such on screen until "approved regulatory rules" are loaded (Spec §6.4).
 */
import { demoUuid, iso, isoDateTime } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { EARLY_WARNING_ALERTS } from '@/mocks/fixtures/supervision.fixture'
import type { EarlyWarningAlert } from '@/types/supervision'
import type {
  AnalystReview,
  EarlyWarningAlertDetail,
  MonitoredRatioDefinition,
  PrudentialException,
  SupervisoryDecisionEvent,
  ThresholdRule,
} from '@/types/surveillance'

export const THRESHOLD_DEMO_NOTE =
  'Illustrative demo threshold — a configurable mock value, not an approved regulatory rule (Spec §6.4).'

// ---------------------------------------------------------------------------
// Monitored ratios (Spec §6.1 "calculated ratios and definitions")
// ---------------------------------------------------------------------------

export const MONITORED_RATIOS: MonitoredRatioDefinition[] = [
  {
    code: 'CAR',
    name: 'Capital Adequacy Ratio',
    category: 'Capital',
    definition: 'Total capital ÷ risk-weighted assets × 100 (demo formula).',
    unit: '%',
    direction: 'higher-is-better',
    sourceReturns: ['MPR-09'],
  },
  {
    code: 'LCR',
    name: 'Liquidity Coverage Ratio',
    category: 'Liquidity',
    definition: 'High-quality liquid assets ÷ 30-day net cash outflows × 100 (demo formula); quarterly snapshots use the reported liquidity ratio series.',
    unit: '%',
    direction: 'higher-is-better',
    sourceReturns: ['MPR-04', 'QSL-03'],
  },
  {
    code: 'NPL',
    name: 'Non-Performing Loan Ratio',
    category: 'Asset Quality',
    definition: 'Non-performing loans ÷ gross loans × 100 (demo formula).',
    unit: '%',
    direction: 'lower-is-better',
    sourceReturns: ['QAR-02'],
  },
  {
    code: 'PC',
    name: 'Provision Coverage of NPLs',
    category: 'Asset Quality',
    definition: 'Loan loss provisions ÷ non-performing loans × 100 (demo formula).',
    unit: '%',
    direction: 'higher-is-better',
    sourceReturns: ['QAR-02'],
  },
  {
    code: 'ROA',
    name: 'Return on Assets',
    category: 'Earnings',
    definition: 'Net profit ÷ total assets × 100 (demo formula).',
    unit: '%',
    direction: 'higher-is-better',
    sourceReturns: ['MPR-09'],
  },
  {
    code: 'DC',
    name: 'Deposit Concentration (largest depositor)',
    category: 'Liquidity',
    definition: 'Largest single depositor ÷ total deposits × 100 (demo formula).',
    unit: '%',
    direction: 'lower-is-better',
    sourceReturns: ['QSL-03'],
  },
]

export const RATIO_BY_CODE: Record<string, MonitoredRatioDefinition> = Object.fromEntries(
  MONITORED_RATIOS.map((r) => [r.code, r]),
)

// ---------------------------------------------------------------------------
// Threshold rules (versioned, illustrative demo status)
// ---------------------------------------------------------------------------

export const THRESHOLD_RULES: ThresholdRule[] = [
  {
    id: demoUuid(50, 1),
    ratioCode: 'CAR',
    version: 'TH-CAR-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'below', value: '12.5' },
      { severity: 'Red', operator: 'below', value: '10.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
  {
    id: demoUuid(50, 2),
    ratioCode: 'LCR',
    version: 'TH-LCR-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'below', value: '110.0' },
      { severity: 'Red', operator: 'below', value: '100.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
  {
    id: demoUuid(50, 3),
    ratioCode: 'NPL',
    version: 'TH-NPL-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'above', value: '6.0' },
      { severity: 'Red', operator: 'above', value: '8.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
  {
    id: demoUuid(50, 4),
    ratioCode: 'PC',
    version: 'TH-PC-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'below', value: '100.0' },
      { severity: 'Red', operator: 'below', value: '80.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
  {
    id: demoUuid(50, 5),
    ratioCode: 'ROA',
    version: 'TH-ROA-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'below', value: '0.5' },
      { severity: 'Red', operator: 'below', value: '0.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
  {
    id: demoUuid(50, 6),
    ratioCode: 'DC',
    version: 'TH-DC-2026.1 (demo)',
    effectiveFrom: iso(2026, 1, 1),
    status: 'Illustrative demo',
    levels: [
      { severity: 'Amber', operator: 'above', value: '20.0' },
      { severity: 'Red', operator: 'above', value: '25.0' },
    ],
    note: THRESHOLD_DEMO_NOTE,
  },
]

export const RULE_BY_RATIO: Record<string, ThresholdRule> = Object.fromEntries(
  THRESHOLD_RULES.map((r) => [r.ratioCode, r]),
)

// ---------------------------------------------------------------------------
// Prudential exceptions (Spec §6.1 exception table)
// ---------------------------------------------------------------------------

const exc = (
  n: number,
  reference: string,
  institutionId: string,
  periodLabel: string,
  ratioCode: string,
  observedValue: string,
  thresholdValue: string,
  severity: PrudentialException['severity'],
  status: PrudentialException['status'],
  detectedOffsetDays: number,
  note: string,
  relatedAlertRef?: string,
): PrudentialException => ({
  id: demoUuid(51, n),
  reference,
  institutionId,
  periodLabel,
  ratioCode,
  observedValue,
  thresholdValue,
  severity,
  ruleVersion: RULE_BY_RATIO[ratioCode]?.version ?? 'TH-2026.1 (demo)',
  detectedAt: isoDateTime(detectedOffsetDays, 7, 30),
  status,
  relatedAlertRef,
  note,
})

export const PRUDENTIAL_EXCEPTIONS: PrudentialException[] = [
  exc(8, 'EXC-2026-008', INST_IDS.vanguard, 'October 2026', 'CAR', '6.4', '10.0', 'Red', 'Escalated', -8, 'Sustained capital breach from the rejected MPR-09 October return; enforcement case ENF-2026-002 open and licence suspended.', 'EWA-2026-008'),
  exc(11, 'EXC-2026-011', INST_IDS.northstar, 'October 2026', 'LCR', '104.2', '110.0', 'Amber', 'Escalated', -1, 'LCR below the amber demo watch level for the second consecutive observation (MPR-04 October); targeted examination EXM-2026-024 initiated.', 'EWA-2026-011'),
  exc(13, 'EXC-2026-013', INST_IDS.meridian, 'Q3 2026', 'NPL', '6.9', '6.0', 'Amber', 'Monitoring', -12, 'NPL ratio above the amber demo threshold driven by two large exposures under watch; covered by EXM-2026-014 scope.', 'EWA-2026-013'),
  exc(16, 'EXC-2026-016', INST_IDS.vanguard, 'Q3 2026', 'NPL', '20.5', '8.0', 'Red', 'Escalated', -20, 'Asset quality deteriorating alongside the capital breach; re-aged facilities misstatement confirmed in FND-2026-033.'),
  exc(18, 'EXC-2026-018', INST_IDS.delta, 'Q3 2026', 'PC', '92.0', '100.0', 'Amber', 'Open', -10, 'Provision coverage below the demo 100% standard while FND-2026-048 (micro-loan provisioning shortfall) remains open.'),
  exc(5, 'EXC-2026-005', INST_IDS.delta, 'October 2026', 'DC', '22.8', '20.0', 'Amber', 'Cleared', -12, 'Deposit-concentration observation cleared after the large institutional deposit partially unwound; monitoring continues via EWA-2026-005 (resolved).', 'EWA-2026-005'),
]

// ---------------------------------------------------------------------------
// Analyst reviews and supervisory decisions (Spec §6.1 detail)
// ---------------------------------------------------------------------------

export const ANALYST_REVIEWS: AnalystReview[] = [
  {
    id: demoUuid(52, 5),
    reference: 'ARV-2026-005',
    institutionId: INST_IDS.northstar,
    periodLabel: 'October 2026',
    analystName: 'Fatima Bello',
    createdAt: isoDateTime(-1, 17, 30),
    trigger: 'EWA-2026-011 — LCR amber (104.2% vs demo amber 110.0%)',
    assessment:
      'Second consecutive weekly observation below the amber demo threshold. MPR-04 October shows HQLA down 3.0% month-on-month while 30-day net outflows rose 3.8%; top-10 funding concentration 42.8% amplifies rollover risk. QSL-03 Q3 average (112.4%) masks the intra-quarter deterioration.',
    recommendation:
      'Initiate a targeted liquidity examination covering liquidity risk management and the contingency funding plan; request a weekly LCR flash report until the ratio recovers above the amber level.',
    status: 'Actioned',
    decision: {
      at: isoDateTime(0, 9, 15),
      byName: 'Amara Osei',
      decision: 'Targeted examination initiated — EXM-2026-024',
      note: 'Approved per Journey B pattern; examination scheduled to start within two weeks (demo decision).',
    },
  },
  {
    id: demoUuid(52, 4),
    reference: 'ARV-2026-004',
    institutionId: INST_IDS.vanguard,
    periodLabel: 'October 2026',
    analystName: 'Zainab Lawal',
    createdAt: isoDateTime(-7, 10, 0),
    trigger: 'EWA-2026-008 — CAR sustained below the demo regulatory minimum (6.4% vs 10.0%)',
    assessment:
      'MPR-09 October rejected on validation errors (CAR below minimum; capital base unreconciled). Q3 snapshot CAR 6.7% and NPL 20.5% confirm sustained deterioration. Capital restoration plan under CAP-2026-007 is 35% complete.',
    recommendation:
      'Maintain enforcement posture (ENF-2026-002); keep licence suspension under review and require monthly capital restoration reporting.',
    status: 'Submitted',
  },
  {
    id: demoUuid(52, 6),
    reference: 'ARV-2026-006',
    institutionId: INST_IDS.meridian,
    periodLabel: 'Q3 2026',
    analystName: 'Daniel Adeyemi',
    createdAt: isoDateTime(-3, 14, 20),
    trigger: 'EWA-2026-013 — NPL ratio above the amber demo threshold (6.9% vs 6.0%)',
    assessment:
      'Increase driven by two large exposures under watch in the commercial real-estate segment. QAR-02 Q3 accepted; provision coverage 118.4% remains above the demo standard. Drivers overlap with the ongoing AML examination EXM-2026-014 scope.',
    recommendation:
      'Continue monitoring within EXM-2026-014; request the institution watchlist for the two exposures and a provisioning plan at the next quarterly submission.',
    status: 'Submitted',
  },
]

export const SUPERVISORY_DECISIONS: SupervisoryDecisionEvent[] = [
  {
    id: demoUuid(53, 1),
    institutionId: INST_IDS.northstar,
    at: isoDateTime(-1, 17, 30),
    actorName: 'Fatima Bello',
    action: 'Analyst review created',
    detail: 'ARV-2026-005 opened from EWA-2026-011 (LCR amber).',
  },
  {
    id: demoUuid(53, 2),
    institutionId: INST_IDS.northstar,
    at: isoDateTime(0, 9, 15),
    actorName: 'Amara Osei',
    action: 'Targeted examination initiated',
    detail: 'EXM-2026-024 — liquidity risk management and contingency funding plan, initiated from ARV-2026-005 (Journey B pattern).',
  },
  {
    id: demoUuid(53, 3),
    institutionId: INST_IDS.vanguard,
    at: isoDateTime(-8, 8, 30),
    actorName: 'Zainab Lawal',
    action: 'Alert escalated',
    detail: 'EWA-2026-008 escalated to the Director of Supervision; sustained CAR breach confirmed.',
  },
  {
    id: demoUuid(53, 4),
    institutionId: INST_IDS.vanguard,
    at: isoDateTime(-8, 9, 0),
    actorName: 'Amara Osei',
    action: 'Watchlist decision',
    detail: 'Vanguard Regional Bank retained on the institution watchlist at Critical severity while ENF-2026-002 remains open.',
  },
  {
    id: demoUuid(53, 5),
    institutionId: INST_IDS.meridian,
    at: isoDateTime(-2, 11, 0),
    actorName: 'Daniel Adeyemi',
    action: 'Clarification requested',
    detail: 'Clarification requested on the overdue MPR-09 October return; institution reminded of the demo 48-hour resubmission standard.',
  },
  {
    id: demoUuid(53, 6),
    institutionId: INST_IDS.delta,
    at: isoDateTime(-6, 15, 45),
    actorName: 'Nkechi Balogun',
    action: 'Exception cleared',
    detail: 'EXC-2026-005 deposit-concentration observation cleared after the large institutional deposit partially unwound.',
  },
]

// ---------------------------------------------------------------------------
// Early-warning alert details (Spec §6.4)
// ---------------------------------------------------------------------------

type AlertExtras = Pick<
  EarlyWarningAlertDetail,
  | 'triggerExplanation'
  | 'ruleCode'
  | 'ruleVersion'
  | 'historicalTrend'
  | 'relatedAlertRefs'
  | 'assessments'
  | 'escalationHistory'
> &
  Pick<EarlyWarningAlertDetail, 'thresholdNote' | 'sourceReturn' | 'linkedExamination' | 'linkedAction' | 'assignedAnalystId'>

const ALERT_EXTRAS: Record<string, AlertExtras> = {
  'EWA-2026-011': {
    triggerExplanation:
      'The Liquidity Coverage Ratio fell below the amber demo threshold of 110.0% for the second consecutive weekly observation (latest 104.2% from MPR-04 October 2026). The rule fires on two consecutive amber observations to filter single-period noise.',
    ruleCode: 'LCR',
    ruleVersion: 'TH-LCR-2026.1 (demo)',
    thresholdNote: THRESHOLD_DEMO_NOTE,
    sourceReturn: { submissionId: demoUuid(23, 4), returnCode: 'MPR-04', period: 'October 2026' },
    historicalTrend: [
      { periodLabel: 'May 2026', value: '112.5' },
      { periodLabel: 'Jun 2026', value: '110.8' },
      { periodLabel: 'Jul 2026', value: '109.4' },
      { periodLabel: 'Aug 2026', value: '107.1' },
      { periodLabel: 'Sep 2026', value: '105.6' },
      { periodLabel: 'Oct 2026', value: '104.2' },
    ],
    relatedAlertRefs: [],
    assessments: [
      {
        id: demoUuid(54, 1),
        at: isoDateTime(-1, 17, 5),
        authorName: 'Fatima Bello',
        text: 'HQLA down 3.0% month-on-month while 30-day net outflows rose 3.8%; top-10 funding concentration 42.8% amplifies rollover risk. Recommend targeted liquidity examination and weekly LCR flash reporting. See ARV-2026-005.',
      },
    ],
    escalationHistory: [
      { id: demoUuid(55, 1), at: isoDateTime(-1, 16, 20), byName: 'System (demo)', action: 'Raised', note: 'Rule TH-LCR-2026.1 (demo) fired on two consecutive amber observations.' },
      { id: demoUuid(55, 2), at: isoDateTime(-1, 16, 50), byName: 'Amara Osei', action: 'Assigned', note: 'Assigned to Fatima Bello (liquidity desk).' },
      { id: demoUuid(55, 3), at: isoDateTime(-1, 17, 5), byName: 'Fatima Bello', action: 'Assessment added' },
      { id: demoUuid(55, 4), at: isoDateTime(0, 9, 15), byName: 'Amara Osei', action: 'Converted to supervisory action', note: 'Targeted examination EXM-2026-024 initiated (Journey B).' },
    ],
    linkedExamination: { reference: 'EXM-2026-024', id: demoUuid(21, 24), status: 'Planned' },
    assignedAnalystId: '5a4b3c2d-1e0f-4a98-8776-6554433221a3',
  },
  'EWA-2026-008': {
    triggerExplanation:
      'Capital Adequacy Ratio sustained below the demo regulatory minimum of 10.0% (latest 6.4% from the rejected MPR-09 October 2026 submission). The red-level rule fires immediately on any observation below the minimum.',
    ruleCode: 'CAR',
    ruleVersion: 'TH-CAR-2026.1 (demo)',
    thresholdNote: THRESHOLD_DEMO_NOTE,
    sourceReturn: { submissionId: demoUuid(23, 3), returnCode: 'MPR-09', period: 'October 2026' },
    historicalTrend: [
      { periodLabel: 'May 2026', value: '9.8' },
      { periodLabel: 'Jun 2026', value: '9.1' },
      { periodLabel: 'Jul 2026', value: '8.4' },
      { periodLabel: 'Aug 2026', value: '7.6' },
      { periodLabel: 'Sep 2026', value: '7.0' },
      { periodLabel: 'Oct 2026', value: '6.4' },
    ],
    relatedAlertRefs: [],
    assessments: [
      {
        id: demoUuid(54, 2),
        at: isoDateTime(-7, 10, 15),
        authorName: 'Zainab Lawal',
        text: 'Sustained breach confirmed against EXM-2026-012 findings (FND-2026-030). Capital restoration plan CAP-2026-007 is 35% complete; recommend maintaining the enforcement posture under ENF-2026-002. See ARV-2026-004.',
      },
    ],
    escalationHistory: [
      { id: demoUuid(55, 5), at: isoDateTime(-8, 8, 5), byName: 'System (demo)', action: 'Raised', note: 'Rule TH-CAR-2026.1 (demo) red level breached.' },
      { id: demoUuid(55, 6), at: isoDateTime(-8, 8, 20), byName: 'Zainab Lawal', action: 'Acknowledged' },
      { id: demoUuid(55, 7), at: isoDateTime(-8, 8, 30), byName: 'Zainab Lawal', action: 'Escalated', note: 'Escalated to the Director of Supervision.' },
      { id: demoUuid(55, 8), at: isoDateTime(-7, 9, 0), byName: 'Amara Osei', action: 'Converted to supervisory action', note: 'Enforcement case ENF-2026-002 progressed; licence suspension maintained.' },
    ],
    linkedExamination: { reference: 'EXM-2026-012', id: demoUuid(21, 12), status: 'Completed' },
    linkedAction: { type: 'Enforcement case', reference: 'ENF-2026-002', link: '/app/enforcement' },
  },
  'EWA-2026-013': {
    triggerExplanation:
      'NPL ratio rose above the amber demo threshold of 6.0% (6.9% in QAR-02 Q3 2026, accepted with review). The rule fires on the quarterly observation and re-fires on each subsequent period above the threshold.',
    ruleCode: 'NPL',
    ruleVersion: 'TH-NPL-2026.1 (demo)',
    thresholdNote: THRESHOLD_DEMO_NOTE,
    sourceReturn: { submissionId: demoUuid(23, 5), returnCode: 'QAR-02', period: 'Q3 2026' },
    historicalTrend: [
      { periodLabel: 'Q2 2025', value: '5.2' },
      { periodLabel: 'Q3 2025', value: '5.6' },
      { periodLabel: 'Q4 2025', value: '5.9' },
      { periodLabel: 'Q1 2026', value: '6.2' },
      { periodLabel: 'Q2 2026', value: '6.6' },
      { periodLabel: 'Q3 2026', value: '6.9' },
    ],
    relatedAlertRefs: [],
    assessments: [
      {
        id: demoUuid(54, 3),
        at: isoDateTime(-2, 16, 10),
        authorName: 'Daniel Adeyemi',
        text: 'Increase driven by two large commercial real-estate exposures under watch. Provision coverage 118.4% remains above the demo standard. Drivers overlap EXM-2026-014 scope; continue monitoring. See ARV-2026-006.',
      },
    ],
    escalationHistory: [
      { id: demoUuid(55, 9), at: isoDateTime(-3, 11, 40), byName: 'System (demo)', action: 'Raised', note: 'Rule TH-NPL-2026.1 (demo) amber level breached.' },
      { id: demoUuid(55, 10), at: isoDateTime(-3, 12, 0), byName: 'Daniel Adeyemi', action: 'Acknowledged' },
      { id: demoUuid(55, 11), at: isoDateTime(-2, 16, 10), byName: 'Daniel Adeyemi', action: 'Assessment added' },
    ],
    linkedExamination: { reference: 'EXM-2026-014', id: demoUuid(21, 14), status: 'Fieldwork' },
    assignedAnalystId: '5a4b3c2d-1e0f-4a98-8776-6554433221a2',
  },
  'EWA-2026-005': {
    triggerExplanation:
      'Single-depositor concentration approached the demo 25.0% threshold (22.8% info-level observation) after a large institutional deposit. Info-level rule: monitoring only, no mandatory action.',
    ruleCode: 'DC',
    ruleVersion: 'TH-DC-2026.1 (demo)',
    thresholdNote: THRESHOLD_DEMO_NOTE,
    historicalTrend: [
      { periodLabel: 'May 2026', value: '21.4' },
      { periodLabel: 'Jun 2026', value: '21.8' },
      { periodLabel: 'Jul 2026', value: '22.1' },
      { periodLabel: 'Aug 2026', value: '22.4' },
      { periodLabel: 'Sep 2026', value: '22.6' },
      { periodLabel: 'Oct 2026', value: '22.8' },
    ],
    relatedAlertRefs: [],
    assessments: [
      {
        id: demoUuid(54, 4),
        at: isoDateTime(-10, 11, 0),
        authorName: 'Nkechi Balogun',
        text: 'Large institutional deposit partially unwound; concentration back within the demo watch band. Related exception EXC-2026-005 cleared. Resolved — monitoring continues through the quarterly return cycle.',
      },
    ],
    escalationHistory: [
      { id: demoUuid(55, 12), at: isoDateTime(-12, 9, 15), byName: 'System (demo)', action: 'Raised', note: 'Info-level concentration observation (demo rule).' },
      { id: demoUuid(55, 13), at: isoDateTime(-11, 10, 0), byName: 'Nkechi Balogun', action: 'Acknowledged' },
      { id: demoUuid(55, 14), at: isoDateTime(-10, 11, 0), byName: 'Nkechi Balogun', action: 'Resolved', note: 'Concentration unwound; exception EXC-2026-005 cleared.' },
    ],
  },
}

export function buildAlertDetail(alert: EarlyWarningAlert): EarlyWarningAlertDetail {
  const extras = ALERT_EXTRAS[alert.reference ?? '']
  return {
    ...alert,
    reference: alert.reference ?? `EWA-DEMO-${alert.id.slice(0, 4)}`,
    triggerExplanation:
      extras?.triggerExplanation ??
      'Demo trigger explanation — this alert record predates the Phase-3A detail dataset.',
    ruleCode: extras?.ruleCode ?? 'DEMO',
    ruleVersion: extras?.ruleVersion ?? 'TH-2026.1 (demo)',
    thresholdNote: THRESHOLD_DEMO_NOTE,
    sourceReturn: extras?.sourceReturn,
    historicalTrend: extras?.historicalTrend ?? [],
    relatedAlertRefs: extras?.relatedAlertRefs ?? [],
    assessments: (extras?.assessments ?? []).map((a) => ({ ...a })),
    escalationHistory: (extras?.escalationHistory ?? []).map((e) => ({ ...e })),
    linkedExamination: extras?.linkedExamination,
    linkedAction: extras?.linkedAction,
    assignedAnalystId: extras?.assignedAnalystId,
  }
}

export const ALERT_DETAILS: EarlyWarningAlertDetail[] = EARLY_WARNING_ALERTS.map(buildAlertDetail)
