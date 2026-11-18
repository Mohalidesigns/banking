/**
 * Supervision-domain demo records (Spec §17.5 — one coherent story-world).
 * Phase 2A screens consume these read-only (Command Centre, profile tabs,
 * My Work); Phase 2B extends the same records into full examination,
 * findings and remediation workflows. All figures are illustrative demo data.
 *
 * The story: Meridian Commercial Bank is under an AML thematic examination
 * with an overdue corrective action; Northstar Merchant Bank has an amber
 * liquidity early warning; Unity Non-Interest Bank has a governance
 * examination planned; Crestline Payment Bank's annual risk assessment is
 * in progress; Vanguard Regional Bank is in restructuring with a critical
 * rating, suspended licence and open enforcement case.
 */
import { demoUuid, iso, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import type {
  CorrectiveAction,
  EarlyWarningAlert,
  EnforcementCase,
  Examination,
  RiskAssessment,
  ReturnSubmission,
  SupervisoryFinding,
  SupervisoryPlan,
  WatchlistEntry,
  WorkItem,
} from '@/types/supervision'

const MBA_ID = JURISDICTIONS[0].id

// ---------------------------------------------------------------------------
// Examinations (references match the global search fixture)
// ---------------------------------------------------------------------------

export const EXAMINATIONS: Examination[] = [
  {
    id: demoUuid(21, 14),
    reference: 'EXM-2026-014',
    institutionId: INST_IDS.meridian,
    type: 'AML/CFT',
    scopeAreas: ['Transaction monitoring', 'Customer due diligence', 'Sanctions screening', 'STR quality'],
    status: 'Fieldwork',
    riskRating: 'High',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a4',
    leadExaminerName: 'Chuka Eze',
    teamMemberNames: ['Chuka Eze', 'Hauwa Sadiq', 'Nkechi Balogun'],
    startDate: isoDay(-15),
    plannedEndDate: isoDay(12),
    progressPct: 58,
    findingsCount: 3,
    openFindingsCount: 3,
    summary: 'Thematic AML/CFT examination triggered by confirmed finding FND-2026-101 and overdue CAP-2026-003. Demo record.',
  },
  {
    id: demoUuid(21, 17),
    reference: 'EXM-2026-017',
    institutionId: INST_IDS.delta,
    type: 'Follow-up',
    scopeAreas: ['Loan appraisal remediation validation', 'Credit file sampling'],
    status: 'In Progress',
    riskRating: 'Medium',
    leadExaminerId: demoUuid(12, 7),
    leadExaminerName: 'Nkechi Balogun',
    teamMemberNames: ['Nkechi Balogun', 'Samuel Ike'],
    startDate: isoDay(-6),
    plannedEndDate: isoDay(8),
    progressPct: 41,
    findingsCount: 1,
    openFindingsCount: 1,
    summary: 'Follow-up on FND-2026-044 remediation; sampling of 25 credit files across three branches. Demo record.',
  },
  {
    id: demoUuid(21, 21),
    reference: 'EXM-2026-021',
    institutionId: INST_IDS.unity,
    type: 'Comprehensive',
    scopeAreas: ['Corporate governance', 'Shariah governance', 'Board effectiveness'],
    status: 'Planned',
    riskRating: 'Low',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a4',
    leadExaminerName: 'Chuka Eze',
    teamMemberNames: ['Chuka Eze', 'Lerato Mokoena'],
    startDate: isoDay(21),
    plannedEndDate: isoDay(56),
    progressPct: 0,
    findingsCount: 0,
    openFindingsCount: 0,
    summary: 'Planned corporate governance examination for next quarter per the 2026 supervisory plan. Demo record.',
  },
  {
    id: demoUuid(21, 24),
    reference: 'EXM-2026-024',
    institutionId: INST_IDS.northstar,
    type: 'Targeted',
    scopeAreas: ['Liquidity risk management', 'Contingency funding plan'],
    status: 'Planned',
    riskRating: 'Medium',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a3',
    leadExaminerName: 'Fatima Bello',
    teamMemberNames: ['Fatima Bello', 'Aisha Yusuf'],
    startDate: isoDay(9),
    plannedEndDate: isoDay(30),
    progressPct: 0,
    findingsCount: 0,
    openFindingsCount: 0,
    summary: 'Targeted liquidity examination initiated from early warning EWA-2026-011 (Journey B pattern). Demo record.',
  },
  {
    id: demoUuid(21, 12),
    reference: 'EXM-2026-012',
    institutionId: INST_IDS.vanguard,
    type: 'Targeted',
    scopeAreas: ['Capital adequacy', 'Insider lending', 'Asset classification'],
    status: 'Completed',
    riskRating: 'Critical',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a4',
    leadExaminerName: 'Chuka Eze',
    teamMemberNames: ['Chuka Eze', 'Peter Okonjo', 'Zainab Lawal'],
    startDate: iso(2026, 6, 1),
    plannedEndDate: iso(2026, 7, 8),
    endDate: iso(2026, 7, 8),
    progressPct: 100,
    findingsCount: 6,
    openFindingsCount: 6,
    summary: 'Targeted capital examination that led to licence suspension and enforcement case ENF-2026-002. Demo record.',
  },
  {
    id: demoUuid(21, 9),
    reference: 'EXM-2026-009',
    institutionId: INST_IDS.northstar,
    type: 'Comprehensive',
    scopeAreas: ['Capital adequacy review', 'Treasury operations'],
    status: 'Completed',
    riskRating: 'Medium',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a3',
    leadExaminerName: 'Fatima Bello',
    teamMemberNames: ['Fatima Bello', 'Kwame Mensah'],
    startDate: iso(2026, 5, 4),
    plannedEndDate: iso(2026, 6, 19),
    endDate: iso(2026, 6, 19),
    progressPct: 100,
    findingsCount: 2,
    openFindingsCount: 1,
    summary: 'Capital adequacy review completed with two findings; one closed after remediation. Demo record.',
  },
  {
    id: demoUuid(21, 8),
    reference: 'EXM-2026-008',
    institutionId: INST_IDS.aurora,
    type: 'Comprehensive',
    scopeAreas: ['Routine comprehensive examination'],
    status: 'Completed',
    riskRating: 'Low',
    leadExaminerId: demoUuid(12, 8),
    leadExaminerName: 'Peter Okonjo',
    teamMemberNames: ['Peter Okonjo'],
    startDate: iso(2026, 8, 17),
    plannedEndDate: iso(2026, 9, 22),
    endDate: iso(2026, 9, 22),
    progressPct: 100,
    findingsCount: 0,
    openFindingsCount: 0,
    summary: 'Routine examination closed with no findings; report archived. Demo record.',
  },
  {
    id: demoUuid(21, 5),
    reference: 'EXM-2026-005',
    institutionId: INST_IDS.crestline,
    type: 'Cybersecurity',
    scopeAreas: ['Cyber resilience', 'Third-party risk', 'API security'],
    status: 'Reporting',
    riskRating: 'Medium',
    leadExaminerId: demoUuid(12, 10),
    leadExaminerName: 'Kwame Mensah',
    teamMemberNames: ['Kwame Mensah', 'Nkechi Balogun'],
    startDate: iso(2026, 2, 9),
    plannedEndDate: iso(2026, 3, 20),
    progressPct: 92,
    findingsCount: 2,
    openFindingsCount: 2,
    summary: 'Cyber resilience review in reporting stage; draft report with lead supervisor. Demo record.',
  },
  {
    id: demoUuid(21, 3),
    reference: 'EXM-2025-031',
    institutionId: INST_IDS.meridian,
    type: 'Comprehensive',
    scopeAreas: ['Full-scope comprehensive examination'],
    status: 'Completed',
    riskRating: 'High',
    leadExaminerId: '5a4b3c2d-1e0f-4a98-8776-6554433221a2',
    leadExaminerName: 'Daniel Adeyemi',
    teamMemberNames: ['Daniel Adeyemi', 'Chuka Eze', 'Peter Okonjo', 'Aisha Yusuf'],
    startDate: iso(2025, 9, 15),
    plannedEndDate: iso(2025, 11, 28),
    endDate: iso(2025, 12, 12),
    progressPct: 100,
    findingsCount: 7,
    openFindingsCount: 1,
    summary: 'Comprehensive examination that first surfaced the AML monitoring gaps now confirmed in FND-2026-101. Demo record.',
  },
]

// ---------------------------------------------------------------------------
// Findings (open counts match Institution.openFindingsCount:
// Meridian 4, Northstar 2, Unity 1, Crestline 2, Aurora 0, Delta 3,
// Sentinel 0, Vanguard 6)
// ---------------------------------------------------------------------------

const fnd = (
  n: number,
  reference: string,
  institutionId: string,
  title: string,
  description: string,
  riskRating: SupervisoryFinding['riskRating'],
  category: SupervisoryFinding['category'],
  status: SupervisoryFinding['status'],
  raisedOffsetDays: number,
  dueOffsetDays: number,
  ownerName: string,
  examinationRef?: string,
  correctiveActionRef?: string,
): SupervisoryFinding => ({
  id: demoUuid(22, n),
  reference,
  institutionId,
  examinationId: examinationRef ? EXAMINATIONS.find((e) => e.reference === examinationRef)?.id : undefined,
  examinationRef,
  title,
  description,
  riskRating,
  category,
  status,
  raisedDate: isoDay(raisedOffsetDays),
  dueDate: isoDay(dueOffsetDays),
  ownerName,
  correctiveActionRef,
})

export const FINDINGS: SupervisoryFinding[] = [
  // Meridian — 4 open
  fnd(101, 'FND-2026-101', INST_IDS.meridian, 'AML transaction monitoring gaps', 'Transaction monitoring rules miss structured deposits below the demo threshold; 14 suspicious patterns unreported in the sample period.', 'High', 'AML/CFT', 'Remediation In Progress', -60, -14, 'Hauwa Sadiq', 'EXM-2025-031', 'CAP-2026-003'),
  fnd(102, 'FND-2026-104', INST_IDS.meridian, 'Credit file documentation deficiencies', 'Sampled credit files lack updated collateral valuations in 18% of cases (demo sample).', 'Medium', 'Credit', 'Confirmed', -30, 15, 'Peter Okonjo', 'EXM-2026-014'),
  fnd(103, 'FND-2026-107', INST_IDS.meridian, 'Customer due diligence refresh backlog', 'Periodic CDD refresh overdue for 2,300 high-risk customers (demo figure).', 'High', 'AML/CFT', 'Under Review', -12, 30, 'Hauwa Sadiq', 'EXM-2026-014'),
  fnd(104, 'FND-2026-109', INST_IDS.meridian, 'Board risk reporting timeliness', 'Board risk committee received quarterly risk reports after the demo 30-day standard on two occasions.', 'Low', 'Governance', 'Draft', -4, 45, 'Daniel Adeyemi', 'EXM-2026-014'),
  // Northstar — 2 open
  fnd(87, 'FND-2026-087', INST_IDS.northstar, 'Liquidity reporting delays', 'Daily liquidity returns submitted after cut-off on six occasions in Q3 2026 (demo record).', 'Medium', 'Liquidity', 'Remediation In Progress', -45, 7, 'Fatima Bello', 'EXM-2026-009', 'CAP-2026-002'),
  fnd(88, 'FND-2026-091', INST_IDS.northstar, 'Treasury mandate limit breaches not escalated', 'Two intraday dealing-limit breaches were not escalated to ALCO within the demo 24-hour standard.', 'Medium', 'Operations', 'Confirmed', -20, 20, 'Aisha Yusuf', 'EXM-2026-009'),
  // Unity — 1 open
  fnd(118, 'FND-2026-118', INST_IDS.unity, 'Shariah board minutes incomplete', 'Two investment-account product approvals lack documented Shariah board rationale (demo record).', 'Low', 'Governance', 'Draft', -3, 40, 'Lerato Mokoena', 'EXM-2026-021'),
  // Crestline — 2 open
  fnd(62, 'FND-2026-062', INST_IDS.crestline, 'Agent network onboarding controls', '12% of sampled agents onboarded without completed background checks (demo sample).', 'Medium', 'Operations', 'Confirmed', -35, 10, 'Kwame Mensah', 'EXM-2026-005'),
  fnd(63, 'FND-2026-066', INST_IDS.crestline, 'API third-party risk register outdated', 'Third-party risk register missing two payment aggregators integrated in Q2 2026 (demo record).', 'Medium', 'Cybersecurity', 'Remediation In Progress', -28, 12, 'Kwame Mensah', 'EXM-2026-005', 'CAP-2026-008'),
  // Delta — 3 open
  fnd(44, 'FND-2026-044', INST_IDS.delta, 'Loan appraisal remediation validation outstanding', 'Final validation of loan appraisal remediation evidence pending closure (demo record).', 'Medium', 'Credit', 'Remediation In Progress', -70, 2, 'Nkechi Balogun', 'EXM-2026-017', 'CAP-2026-005'),
  fnd(45, 'FND-2026-048', INST_IDS.delta, 'Micro-loan provisioning shortfall', 'Provision coverage on portfolio-at-risk buckets 30 days below the demo 100% standard.', 'High', 'Credit', 'Confirmed', -25, 18, 'Nkechi Balogun'),
  fnd(46, 'FND-2026-051', INST_IDS.delta, 'Branch cash limits exceeded', 'Three riverine branches exceeded approved cash holding limits in Q3 2026 (demo record).', 'Low', 'Operations', 'Under Review', -9, 33, 'Samuel Ike'),
  // Vanguard — 6 open
  fnd(30, 'FND-2026-030', INST_IDS.vanguard, 'Capital adequacy below regulatory minimum', 'CAR fell to 6.4% against the 10% demo minimum; capital restoration plan required.', 'Critical', 'Capital', 'Escalated', -100, -30, 'Chuka Eze', 'EXM-2026-012', 'CAP-2026-007'),
  fnd(31, 'FND-2026-031', INST_IDS.vanguard, 'Insider loan concentrations', 'Loans to connected parties exceed the demo single-obligor limits without board approval records.', 'Critical', 'Credit', 'Escalated', -100, -25, 'Zainab Lawal', 'EXM-2026-012'),
  fnd(32, 'FND-2026-033', INST_IDS.vanguard, 'Asset classification misstatement', 'NPL classification understated by re-aged facilities worth 4.1% of the demo loan book.', 'High', 'Credit', 'Confirmed', -95, -10, 'Peter Okonjo', 'EXM-2026-012'),
  fnd(33, 'FND-2026-035', INST_IDS.vanguard, 'Liquidity contingency plan untested', 'Contingency funding plan not stress-tested in the last four demo quarters.', 'High', 'Liquidity', 'Confirmed', -95, 5, 'Fatima Bello', 'EXM-2026-012'),
  fnd(34, 'FND-2026-037', INST_IDS.vanguard, 'Board oversight failures', 'Board minutes show no challenge of management capital projections for three consecutive quarters (demo record).', 'High', 'Governance', 'Remediation In Progress', -90, -5, 'Daniel Adeyemi', 'EXM-2026-012', 'CAP-2026-007'),
  fnd(35, 'FND-2026-039', INST_IDS.vanguard, 'Deposit outflow reporting gaps', 'Large deposit outflows not reported to the supervisor within the demo 48-hour standard.', 'Medium', 'Operations', 'Under Review', -60, 8, 'Aisha Yusuf', 'EXM-2026-012'),
  // Closed historical findings (coherent story depth)
  fnd(20, 'FND-2025-077', INST_IDS.meridian, 'KYC remediation backlog (2025)', 'Historic KYC backlog cleared and validated; superseded by FND-2026-107 monitoring requirement.', 'Medium', 'AML/CFT', 'Closed', -300, -240, 'Hauwa Sadiq', 'EXM-2025-031'),
  fnd(21, 'FND-2026-071', INST_IDS.northstar, 'Stale customer addresses (sample)', 'Address refresh completed for the sampled population; closed after evidence review.', 'Low', 'Operations', 'Closed', -120, -80, 'Aisha Yusuf', 'EXM-2026-009'),
  fnd(22, 'FND-2026-029', INST_IDS.sentinel, 'Custody reconciliation timing', 'Reconciliation cut-off timing aligned to the demo standard; closed.', 'Low', 'Operations', 'Closed', -200, -150, 'Chuka Eze'),
]

export const isOpenFinding = (f: SupervisoryFinding): boolean => f.status !== 'Closed'

// ---------------------------------------------------------------------------
// Return submissions (ids for the two search-fixture records kept)
// ---------------------------------------------------------------------------

const ret = (
  _n: number,
  id: string,
  returnCode: string,
  returnName: string,
  institutionId: string,
  period: string,
  dueOffsetDays: number,
  status: ReturnSubmission['status'],
  validation: ReturnSubmission['validation'],
  submittedOffsetDays?: number,
): ReturnSubmission => ({
  id,
  returnCode,
  returnName,
  institutionId,
  period,
  dueDate: isoDay(dueOffsetDays),
  submittedAt: submittedOffsetDays === undefined ? undefined : isoDateTime(submittedOffsetDays, 14, 30),
  status,
  validation,
})

export const RETURN_SUBMISSIONS: ReturnSubmission[] = [
  ret(1, 'sub-mpr09-meridian-2026-10', 'MPR-09', 'Monthly prudential return — capital adequacy', INST_IDS.meridian, 'October 2026', -3, 'Overdue', 'Not Run'),
  ret(2, 'sub-qsl03-crestline-2026-q3', 'QSL-03', 'Quarterly liquidity return', INST_IDS.crestline, 'Q3 2026', -20, 'Submitted', 'Passed', -24),
  ret(3, demoUuid(23, 3), 'MPR-09', 'Monthly prudential return — capital adequacy', INST_IDS.vanguard, 'October 2026', -3, 'Rejected', 'Errors', -6),
  ret(4, demoUuid(23, 4), 'MPR-04', 'Monthly prudential return — liquidity', INST_IDS.northstar, 'October 2026', -1, 'In Review', 'Warnings', -4),
  ret(5, demoUuid(23, 5), 'QAR-02', 'Quarterly asset quality return', INST_IDS.meridian, 'Q3 2026', -12, 'Accepted', 'Passed', -18),
  ret(6, demoUuid(23, 6), 'MPR-09', 'Monthly prudential return — capital adequacy', INST_IDS.unity, 'October 2026', 5, 'Due Soon', 'Not Run'),
  ret(7, demoUuid(23, 7), 'MPR-04', 'Monthly prudential return — liquidity', INST_IDS.aurora, 'October 2026', -2, 'Submitted', 'Passed', -5),
  ret(8, demoUuid(23, 8), 'QAR-02', 'Quarterly asset quality return', INST_IDS.delta, 'Q3 2026', -8, 'Submitted', 'Warnings', -10),
  ret(9, demoUuid(23, 9), 'MPR-09', 'Monthly prudential return — capital adequacy', INST_IDS.sentinel, 'October 2026', -2, 'Accepted', 'Passed', -7),
  ret(10, demoUuid(23, 10), 'MPR-04', 'Monthly prudential return — liquidity', INST_IDS.vanguard, 'October 2026', -1, 'Overdue', 'Not Run'),
  ret(11, demoUuid(23, 11), 'QSL-03', 'Quarterly liquidity return', INST_IDS.northstar, 'Q3 2026', -15, 'Accepted', 'Passed', -21),
  ret(12, demoUuid(23, 12), 'MPR-09', 'Monthly prudential return — capital adequacy', INST_IDS.crestline, 'October 2026', 3, 'Due Soon', 'Not Run'),
]

// ---------------------------------------------------------------------------
// Early warning alerts
// ---------------------------------------------------------------------------

export const EARLY_WARNING_ALERTS: EarlyWarningAlert[] = [
  {
    id: demoUuid(24, 11),
    reference: 'EWA-2026-011',
    institutionId: INST_IDS.northstar,
    indicator: 'Liquidity Coverage Ratio',
    severity: 'warning',
    triggeredAt: isoDateTime(-1, 16, 20),
    threshold: '110.0% (demo amber threshold)',
    currentValue: '104.2%',
    message: 'LCR crossed the amber threshold for the second consecutive week; targeted examination EXM-2026-024 planned. Demo alert.',
    status: 'Open',
    assignedToName: 'Fatima Bello',
  },
  {
    id: demoUuid(24, 12),
    reference: 'EWA-2026-008',
    institutionId: INST_IDS.vanguard,
    indicator: 'Capital Adequacy Ratio',
    severity: 'critical',
    triggeredAt: isoDateTime(-8, 8, 5),
    threshold: '10.0% (demo regulatory minimum)',
    currentValue: '6.4%',
    message: 'CAR sustained below the regulatory minimum; enforcement case ENF-2026-002 open and licence suspended. Demo alert.',
    status: 'Escalated',
    assignedToName: 'Zainab Lawal',
  },
  {
    id: demoUuid(24, 13),
    reference: 'EWA-2026-013',
    institutionId: INST_IDS.meridian,
    indicator: 'NPL Ratio',
    severity: 'warning',
    triggeredAt: isoDateTime(-3, 11, 40),
    threshold: '6.0% (demo amber threshold)',
    currentValue: '6.9%',
    message: 'NPL ratio above the amber threshold driven by two large exposures under watch; covered by EXM-2026-014 scope. Demo alert.',
    status: 'Acknowledged',
    assignedToName: 'Daniel Adeyemi',
  },
  {
    id: demoUuid(24, 14),
    reference: 'EWA-2026-005',
    institutionId: INST_IDS.delta,
    indicator: 'Deposit Concentration',
    severity: 'info',
    triggeredAt: isoDateTime(-12, 9, 15),
    threshold: '25.0% single-depositor (demo)',
    currentValue: '22.8%',
    message: 'Deposit concentration approaching the demo threshold after a large institutional deposit. Monitoring only. Demo alert.',
    status: 'Resolved',
  },
]

// ---------------------------------------------------------------------------
// Risk assessments (one 2026 cycle per institution)
// ---------------------------------------------------------------------------

const raDims = (base: number): RiskAssessment['dimensions'] => [
  { name: 'Credit Risk', intrinsic: base, control: Math.max(1, base - 1), rating: base >= 4 ? 'High' : base === 3 ? 'Medium' : 'Low' },
  { name: 'Liquidity Risk', intrinsic: Math.max(1, base - 1), control: base - 1 > 0 ? Math.max(1, base - 2) : 1, rating: base >= 5 ? 'Critical' : base >= 4 ? 'High' : base === 3 ? 'Medium' : 'Low' },
  { name: 'Market Risk', intrinsic: Math.max(1, base - 1), control: Math.max(1, base - 1), rating: base >= 4 ? 'High' : 'Medium' },
  { name: 'Operational Risk', intrinsic: base, control: Math.max(1, base - 2), rating: base >= 4 ? 'High' : 'Medium' },
  { name: 'AML/CFT Risk', intrinsic: base + 1 > 5 ? 5 : base + 1, control: Math.max(1, base - 1), rating: base >= 4 ? 'Critical' : base >= 3 ? 'High' : 'Medium' },
  { name: 'Cyber Risk', intrinsic: base, control: Math.max(1, base - 1), rating: base >= 4 ? 'High' : 'Medium' },
]

const ra = (
  n: number,
  institutionId: string,
  status: RiskAssessment['status'],
  overallRisk: RiskAssessment['overallRisk'],
  score: number,
  assessedByName: string,
  dueOffsetDays: number,
  completedOffsetDays?: number,
  base = score,
): RiskAssessment => ({
  id: demoUuid(25, n),
  institutionId,
  year: 2026,
  status,
  overallRisk,
  compositeScore: score,
  assessedByName,
  dueDate: isoDay(dueOffsetDays),
  completedDate: completedOffsetDays === undefined ? undefined : isoDay(completedOffsetDays),
  dimensions: raDims(Math.min(5, Math.max(1, Math.round(base)))),
})

export const RISK_ASSESSMENTS: RiskAssessment[] = [
  ra(1, INST_IDS.meridian, 'Completed', 'High', 4, 'Aisha Yusuf', -200, -215, 4),
  ra(2, INST_IDS.northstar, 'Completed', 'Medium', 3, 'Aisha Yusuf', -180, -190, 3),
  ra(3, INST_IDS.unity, 'Completed', 'Low', 2, 'Lerato Mokoena', -150, -160, 2),
  ra(4, INST_IDS.crestline, 'In Progress', 'Medium', 3, 'Fatima Bello', 12, undefined, 3),
  ra(5, INST_IDS.aurora, 'Completed', 'Low', 2, 'Peter Okonjo', -120, -130, 2),
  ra(6, INST_IDS.delta, 'In Review', 'Medium', 3, 'Nkechi Balogun', 4, undefined, 3),
  ra(7, INST_IDS.sentinel, 'Completed', 'Low', 1, 'Chuka Eze', -90, -100, 1),
  ra(8, INST_IDS.vanguard, 'Completed', 'Critical', 5, 'Aisha Yusuf', -60, -70, 5),
]

// ---------------------------------------------------------------------------
// Supervisory plans
// ---------------------------------------------------------------------------

export const SUPERVISORY_PLANS: SupervisoryPlan[] = [
  {
    id: demoUuid(26, 1),
    year: 2026,
    name: '2026 Annual Supervisory Plan — Meridia Banking Authority',
    jurisdictionId: MBA_ID,
    status: 'In Execution',
    plannedActivities: 48,
    completedActivities: 30,
    executionPct: 62,
    leadName: 'Amara Osei',
    institutionIds: Object.values(INST_IDS),
  },
  {
    id: demoUuid(26, 2),
    year: 2026,
    name: 'Q4 2026 Thematic Cycle — AML & Cyber Resilience',
    jurisdictionId: MBA_ID,
    status: 'In Execution',
    plannedActivities: 12,
    completedActivities: 5,
    executionPct: 42,
    leadName: 'Chuka Eze',
    institutionIds: [INST_IDS.meridian, INST_IDS.crestline, INST_IDS.northstar],
  },
  {
    id: demoUuid(26, 3),
    year: 2027,
    name: '2027 Draft Supervisory Plan',
    jurisdictionId: MBA_ID,
    status: 'Draft',
    plannedActivities: 52,
    completedActivities: 0,
    executionPct: 0,
    leadName: 'Amara Osei',
    institutionIds: Object.values(INST_IDS),
  },
]

// ---------------------------------------------------------------------------
// Corrective actions & enforcement (coherent with findings above)
// ---------------------------------------------------------------------------

export const CORRECTIVE_ACTIONS: CorrectiveAction[] = [
  {
    id: demoUuid(27, 3),
    reference: 'CAP-2026-003',
    institutionId: INST_IDS.meridian,
    findingId: demoUuid(22, 101),
    title: 'AML transaction monitoring remediation',
    status: 'Overdue',
    dueDate: isoDay(-14),
    progressPct: 65,
    ownerName: 'Grace Mbeki (institution) / Hauwa Sadiq (supervisor)',
  },
  {
    id: demoUuid(27, 2),
    reference: 'CAP-2026-002',
    institutionId: INST_IDS.northstar,
    findingId: demoUuid(22, 87),
    title: 'Liquidity reporting timeliness programme',
    status: 'In Progress',
    dueDate: isoDay(7),
    progressPct: 80,
    ownerName: 'Ibrahim Sani (institution) / Fatima Bello (supervisor)',
  },
  {
    id: demoUuid(27, 5),
    reference: 'CAP-2026-005',
    institutionId: INST_IDS.delta,
    findingId: demoUuid(22, 44),
    title: 'Loan appraisal remediation',
    status: 'Validated',
    dueDate: isoDay(-5),
    progressPct: 100,
    ownerName: 'Ngozi Emenike (institution) / Nkechi Balogun (supervisor)',
  },
  {
    id: demoUuid(27, 7),
    reference: 'CAP-2026-007',
    institutionId: INST_IDS.vanguard,
    findingId: demoUuid(22, 30),
    title: 'Capital restoration & governance restructuring plan',
    status: 'In Progress',
    dueDate: isoDay(25),
    progressPct: 35,
    ownerName: 'Kunle Oyelowo (institution) / Zainab Lawal (supervisor)',
  },
  {
    id: demoUuid(27, 8),
    reference: 'CAP-2026-008',
    institutionId: INST_IDS.crestline,
    findingId: demoUuid(22, 63),
    title: 'Third-party risk register uplift',
    status: 'In Progress',
    dueDate: isoDay(12),
    progressPct: 55,
    ownerName: 'Zara Nwosu (institution) / Kwame Mensah (supervisor)',
  },
]

export const ENFORCEMENT_CASES: EnforcementCase[] = [
  {
    id: demoUuid(28, 2),
    reference: 'ENF-2026-002',
    institutionId: INST_IDS.vanguard,
    title: 'Capital breach and insider lending — Vanguard Regional Bank',
    status: 'Under Investigation',
    openedDate: iso(2026, 9, 5),
    officerName: 'Zainab Lawal',
    summary: 'Opened after EXM-2026-012 confirmed sustained capital breach and connected-party lending. Licence suspended; restructuring under way. Demo case.',
  },
  {
    id: demoUuid(28, 1),
    reference: 'ENF-2026-001',
    institutionId: INST_IDS.meridian,
    title: 'AML control failures — Meridian Commercial Bank',
    status: 'Open',
    openedDate: iso(2026, 10, 12),
    officerName: 'Zainab Lawal',
    summary: 'Formal case opened after CAP-2026-003 passed its deadline; supervisory directive DIR-2026-004 issued. Demo case.',
  },
]

export const WATCHLIST: WatchlistEntry[] = [
  { id: demoUuid(29, 1), institutionId: INST_IDS.vanguard, reason: 'Licence suspended; capital below minimum; enforcement case open.', severity: 'Critical', addedDate: iso(2026, 9, 5) },
  { id: demoUuid(29, 2), institutionId: INST_IDS.meridian, reason: 'AML findings confirmed; corrective action CAP-2026-003 overdue.', severity: 'High', addedDate: iso(2026, 10, 1) },
  { id: demoUuid(29, 3), institutionId: INST_IDS.northstar, reason: 'Liquidity coverage in amber for two consecutive weeks.', severity: 'Medium', addedDate: isoDay(-9) },
]

// ---------------------------------------------------------------------------
// My Work queue (Spec §5.3 — all eight item types; due dates relative)
// ---------------------------------------------------------------------------

const AMARA = '5a4b3c2d-1e0f-4a98-8776-6554433221a1'

const wi = (
  n: number,
  type: WorkItem['type'],
  title: string,
  institutionId: string,
  relatedRef: string | undefined,
  link: string,
  priority: WorkItem['priority'],
  dueOffsetDays: number,
  status: WorkItem['status'],
  assignedToName: string,
  assignedToId: string,
  notes: WorkItem['notes'] = [],
): WorkItem => ({
  id: demoUuid(30, n),
  type,
  title,
  institutionId,
  relatedRef,
  link,
  priority,
  dueDate: isoDay(dueOffsetDays),
  status,
  assignedToId,
  assignedToName,
  notes,
})

export const WORK_ITEMS: WorkItem[] = [
  // Overdue
  wi(1, 'corrective-action', 'Validate CAP-2026-003 AML remediation evidence (overdue)', INST_IDS.meridian, 'CAP-2026-003', '/app/remediation', 'Critical', -2, 'Open', 'Amara Osei', AMARA),
  wi(2, 'management-response', 'Assess management response to FND-2026-033 asset classification', INST_IDS.vanguard, 'FND-2026-033', '/app/findings', 'High', -5, 'Open', 'Amara Osei', AMARA),
  wi(3, 'evidence-review', 'Review evidence pack for Delta follow-up sampling', INST_IDS.delta, 'EXM-2026-017', '/app/evidence', 'Medium', -1, 'In Progress', 'Amara Osei', AMARA, [
    { id: demoUuid(31, 1), author: 'Amara Osei', at: isoDateTime(-1, 10, 5), text: 'First 10 of 25 credit files reviewed; two exceptions noted. Demo note.' },
  ]),
  // Due today
  wi(4, 'finding-review', 'Review draft finding FND-2026-109 (board risk reporting)', INST_IDS.meridian, 'FND-2026-109', '/app/findings', 'High', 0, 'Open', 'Amara Osei', AMARA),
  wi(5, 'examination', 'Daily stand-up input for EXM-2026-014 fieldwork', INST_IDS.meridian, 'EXM-2026-014', '/app/examinations', 'High', 0, 'In Progress', 'Amara Osei', AMARA),
  wi(6, 'information-request', 'Chase MPR-09 October return from Meridian', INST_IDS.meridian, 'MPR-09', '/app/returns', 'Critical', 0, 'Open', 'Amara Osei', AMARA),
  // Upcoming
  wi(7, 'report-approval', 'Approve EXM-2026-005 cyber resilience draft report', INST_IDS.crestline, 'EXM-2026-005', '/app/examinations', 'Medium', 2, 'Open', 'Amara Osei', AMARA),
  wi(8, 'procedure', 'Execute liquidity testing procedure — EXM-2026-024 scoping', INST_IDS.northstar, 'EXM-2026-024', '/app/examinations', 'Medium', 3, 'Open', 'Fatima Bello', '5a4b3c2d-1e0f-4a98-8776-6554433221a3'),
  wi(9, 'finding-review', 'Confirm FND-2026-051 branch cash limit finding', INST_IDS.delta, 'FND-2026-051', '/app/findings', 'Low', 5, 'Open', 'Amara Osei', AMARA),
  wi(10, 'examination', 'Team assignment review for EXM-2026-021 governance examination', INST_IDS.unity, 'EXM-2026-021', '/app/examinations', 'Medium', 7, 'Open', 'Chuka Eze', '5a4b3c2d-1e0f-4a98-8776-6554433221a4'),
  wi(11, 'management-response', 'Assess Crestline response to FND-2026-066 API risk register', INST_IDS.crestline, 'FND-2026-066', '/app/findings', 'Medium', 9, 'Open', 'Amara Osei', AMARA),
  wi(12, 'evidence-review', 'Review Vanguard capital restoration evidence batch 2', INST_IDS.vanguard, 'CAP-2026-007', '/app/evidence', 'Critical', 10, 'Open', 'Amara Osei', AMARA),
  wi(13, 'report-approval', 'Sign off Q3 portfolio review pack for Director briefing', INST_IDS.aurora, undefined, '/app/reports', 'Low', 12, 'Open', 'Amara Osei', AMARA),
  // Completed (history)
  wi(14, 'procedure', 'Complete CDD sampling procedure — EXM-2026-014', INST_IDS.meridian, 'EXM-2026-014', '/app/examinations', 'High', -4, 'Completed', 'Amara Osei', AMARA, [
    { id: demoUuid(31, 2), author: 'Amara Osei', at: isoDateTime(-4, 15, 30), text: 'Sampling completed; exceptions escalated to draft findings. Demo note.' },
  ]),
  wi(15, 'corrective-action', 'Validate CAP-2026-005 loan appraisal remediation', INST_IDS.delta, 'CAP-2026-005', '/app/remediation', 'Medium', -5, 'Completed', 'Nkechi Balogun', demoUuid(12, 7)),
]
