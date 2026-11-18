/**
 * Examination lifecycle detail fixtures (Spec §7.2–§7.4). Extends the
 * Phase-2A `EXAMINATIONS` summaries into full detail records: scope, team
 * roles, work-programme procedure instances, information requests, reports,
 * milestones and workflow history — all anchored to the same story-world
 * (EXM-2026-014 in fieldwork, EXM-2026-024 targeted from an alert,
 * EXM-2026-021 planned, EXM-2026-005 in reporting). Demo data only.
 */
import { demoUuid, iso, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import {
  FINDING_ID_BY_REF,
} from '@/mocks/fixtures/storyRefs'
import { LIBRARY_PROGRAMMES } from '@/mocks/fixtures/library.fixture'
import { EXAMINATIONS } from '@/mocks/fixtures/supervision.fixture'
import { staffByName } from '@/mocks/fixtures/people.fixture'
import type { Priority, RiskRating } from '@/types/common'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  ExaminationReport,
  ExaminationTeamMember,
  InformationRequest,
  LibraryProcedureTemplate,
  ProcedureResult,
  ProcedureStatus,
  WorkflowEvent,
} from '@/types/examination'
import type { Examination } from '@/types/supervision'

const MBA_ID = JURISDICTIONS[0].id
const BSD = 'Banking Supervision Department'

const programmeByCode = (code: string) => {
  const p = LIBRARY_PROGRAMMES.find((x) => x.code === code)
  if (!p) throw new Error(`demo library programme missing: ${code}`)
  return p
}

const templateByCode = (programmeCode: string, procCode: string): LibraryProcedureTemplate => {
  const t = programmeByCode(programmeCode).procedures.find((p) => p.code === procCode)
  if (!t) throw new Error(`demo library procedure missing: ${programmeCode}/${procCode}`)
  return t
}

// ---------------------------------------------------------------------------
// Procedure instance builder
// ---------------------------------------------------------------------------

export interface ProcedureSeed {
  programmeCode: string
  procCode: string
  ownerName: string
  dueOffsetDays: number
  /** Absolute ISO due date — wins over dueOffsetDays (custom procedures). */
  dueDate?: string
  status: ProcedureStatus
  result: ProcedureResult
  priority?: Priority
  exceptionDetails?: string
  conclusion?: string
  severity?: RiskRating
  linkedFindingRef?: string
  sampleSize?: number
  population?: string
  startedOffsetDays?: number
  completedOffsetDays?: number
  custom?: boolean
  customTemplate?: Omit<LibraryProcedureTemplate, 'id'>
}

let procSeq = 0

export const mkProcedure = (
  examinationId: string,
  seed: ProcedureSeed,
): ExaminationProcedure => {
  procSeq += 1
  const template = seed.custom && seed.customTemplate
    ? { ...seed.customTemplate, id: demoUuid(52, 900 + procSeq) }
    : templateByCode(seed.programmeCode, seed.procCode)
  const programme = seed.custom ? null : programmeByCode(seed.programmeCode)
  return {
    id: demoUuid(52, procSeq),
    examinationId,
    libraryProcedureId: seed.custom ? undefined : template.id,
    code: template.code,
    title: template.title,
    domainName: seed.custom ? 'Custom scope' : (programme?.domainName ?? 'Custom scope'),
    programmeTitle: seed.custom
      ? 'Added in create wizard (custom)'
      : `${programme?.title ?? ''} ${programme?.version ?? ''}`.trim(),
    objective: template.objective,
    question: template.question,
    steps: [...template.steps],
    regulatoryCriteria: template.regulatoryCriteria,
    requiredEvidence: [...template.requiredEvidence],
    testingMethod: template.testingMethod,
    sampleSize: seed.sampleSize ?? (Number.parseInt(template.suggestedSample, 10) || 25),
    population: seed.population ?? template.suggestedSample,
    ownerName: seed.ownerName,
    dueDate: seed.dueDate ?? isoDay(seed.dueOffsetDays),
    priority: seed.priority ?? template.priority,
    status: seed.status,
    result: seed.result,
    exceptionDetails: seed.exceptionDetails,
    conclusion: seed.conclusion,
    severity: seed.severity,
    linkedFindingRef: seed.linkedFindingRef,
    linkedFindingId: seed.linkedFindingRef ? FINDING_ID_BY_REF[seed.linkedFindingRef] : undefined,
    evidenceIds: [],
    samples: [],
    comments: [],
    startedAt: seed.startedOffsetDays === undefined ? undefined : isoDateTime(seed.startedOffsetDays, 9, 15),
    completedAt: seed.completedOffsetDays === undefined ? undefined : isoDateTime(seed.completedOffsetDays, 16, 40),
    custom: seed.custom,
  }
}

// ---------------------------------------------------------------------------
// Team builder
// ---------------------------------------------------------------------------

const SPECIALISTS = new Set(['Hauwa Sadiq', 'Kwame Mensah', 'Zainab Lawal', 'Fatima Bello'])

const mkTeam = (exam: Examination): ExaminationTeamMember[] =>
  exam.teamMemberNames.map((name, i) => ({
    staffId: staffByName(name)?.id ?? demoUuid(53, i + 1),
    name,
    roleInExamination:
      i === 0 ? 'Team Lead' : SPECIALISTS.has(name) ? 'Specialist Reviewer' : 'Examiner',
    conflictDeclaration: 'None declared',
  }))

// ---------------------------------------------------------------------------
// Per-examination details
// ---------------------------------------------------------------------------

const wf = (n: number, offsetDays: number, actorName: string, action: string, note?: string): WorkflowEvent => ({
  id: demoUuid(54, n),
  at: isoDateTime(offsetDays, 10, 30),
  actorName,
  action,
  note,
})

interface DetailSeed {
  title: string
  department?: string
  objectives: string
  domains: string[]
  locations: string[]
  productLines: string[]
  limitations?: string
  methodologyName: string
  methodologyVersion: string
  reviewPeriodStart: string
  reviewPeriodEnd: string
  programmeRefs: string[]
  sourceAlertRef?: string
  relatedFindingRefs?: string[]
  milestones: ExaminationDetail['milestones']
  reports: ExaminationReport[]
  workflowHistory: WorkflowEvent[]
}

const EXAM_DETAIL_SEEDS: Record<string, DetailSeed> = {
  'EXM-2026-014': {
    title: 'Meridian Commercial Bank — AML/CFT Thematic Examination 2026',
    department: BSD,
    objectives:
      'Assess the effectiveness of AML/CFT controls following confirmed finding FND-2026-101 and the overdue corrective action CAP-2026-003. Focus on transaction monitoring rule coverage, CDD refresh backlog, sanctions screening and STR quality.',
    domains: ['AML/CFT'],
    locations: ['Head Office — Port Meridian', 'Ikoyi Corporate Centre (demo)', 'Kano Regional Hub (demo)'],
    productLines: ['Retail deposits', 'Corporate banking', 'Trade finance'],
    limitations: 'Agency banking channel deferred to the Q1 2027 cycle (demo scope decision).',
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.1',
    reviewPeriodStart: iso(2026, 1, 1),
    reviewPeriodEnd: iso(2026, 9, 30),
    programmeRefs: ['LIB-AML-002 v2.2'],
    relatedFindingRefs: ['FND-2026-101', 'CAP-2026-003'],
    milestones: [
      { id: demoUuid(55, 1), label: 'Entry meeting with management', date: isoDay(-15), done: true },
      { id: demoUuid(55, 2), label: 'Information request pack due', date: isoDay(-8), done: true },
      { id: demoUuid(55, 3), label: 'Mid-fieldwork checkpoint', date: isoDay(2), done: false },
      { id: demoUuid(55, 4), label: 'Exit meeting', date: isoDay(12), done: false },
      { id: demoUuid(55, 5), label: 'Draft report to Director', date: isoDay(26), done: false },
    ],
    reports: [
      {
        id: demoUuid(56, 1),
        title: 'Draft examination report — EXM-2026-014',
        version: 'v0.4 (auto-assembled draft)',
        status: 'Draft',
        updatedAt: isoDateTime(-1, 17, 10),
        authorName: 'Chuka Eze',
        sections: [
          {
            heading: '1. Executive summary (demo draft)',
            body: 'Thematic AML/CFT examination of Meridian Commercial Bank covering January–September 2026. The examination was triggered by confirmed finding FND-2026-101 and the overdue corrective action CAP-2026-003. Fieldwork is 58% complete (demo figure); persistent gaps in monitoring rule coverage and a large CDD refresh backlog are the principal concerns to date.',
          },
          {
            heading: '2. Scope and methodology',
            body: 'Programme LIB-AML-002 v2.2 under the MBA Risk-Based Examination Methodology v2.1 (demo). Six procedures across transaction monitoring, CDD, sanctions screening and STR quality; retail, corporate and trade finance product lines; head office plus two locations.',
          },
          {
            heading: '3. Findings to date (demo)',
            body: 'FND-2026-104 credit file documentation deficiencies (Medium); FND-2026-107 CDD refresh backlog for 2,300 high-risk customers (High, under review); FND-2026-109 board risk reporting timeliness (Low, draft). Procedure AML-01 confirmed that monitoring rules still miss structured deposits below the demo threshold — the condition first raised as FND-2026-101 in EXM-2025-031.',
          },
          {
            heading: '4. Recommended actions (demo draft)',
            body: 'Accelerate CAP-2026-003 remediation with weekly milestones; complete the CDD refresh backlog within two demo quarters; re-tune monitoring thresholds with documented governance. To be finalised at exit meeting.',
          },
        ],
      },
    ],
    workflowHistory: [
      wf(1, -40, 'Amara Osei', 'Examination approved', 'Approved from the Q4 2026 thematic cycle after ENF-2026-001 opened.'),
      wf(2, -30, 'Chuka Eze', 'Team assigned', 'AML specialist Hauwa Sadiq added as specialist reviewer.'),
      wf(3, -18, 'Chuka Eze', 'Information request IR-2026-014 issued', 'AML thematic request pack sent to institution portal recipients.'),
      wf(4, -15, 'Chuka Eze', 'Fieldwork started', 'Entry meeting held; 6 procedures from LIB-AML-002 v2.2.'),
      wf(5, -6, 'Hauwa Sadiq', 'Procedure AML-01 approved (Fail)', 'Monitoring rule coverage gap persists; cross-referenced to FND-2026-101.'),
      wf(6, -4, 'Chuka Eze', 'Finding FND-2026-107 raised from AML-03', 'CDD refresh backlog of 2,300 high-risk customers (demo figure).'),
    ],
  },
  'EXM-2026-017': {
    title: 'Delta Microfinance Bank — Credit Remediation Follow-Up',
    department: 'Specialised & Inclusive Finance Supervision',
    objectives: 'Validate remediation of FND-2026-044 (loan appraisal deficiencies) and sample credit files across three branches.',
    domains: ['Credit Risk'],
    locations: ['Head Office — Creek Marina (demo)', 'Branch: Warri (demo)', 'Branch: Sapele (demo)'],
    productLines: ['Micro-loans', 'SME lending'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.1',
    reviewPeriodStart: iso(2026, 4, 1),
    reviewPeriodEnd: iso(2026, 9, 30),
    programmeRefs: ['LIB-CRD-001 v3.1'],
    relatedFindingRefs: ['FND-2026-044'],
    milestones: [
      { id: demoUuid(55, 11), label: 'Entry meeting', date: isoDay(-6), done: true },
      { id: demoUuid(55, 12), label: 'Sampling complete (25 files)', date: isoDay(3), done: false },
      { id: demoUuid(55, 13), label: 'Exit meeting', date: isoDay(8), done: false },
    ],
    reports: [],
    workflowHistory: [
      wf(11, -20, 'Lerato Mokoena', 'Examination approved', 'Follow-up scheduled after CAP-2026-005 validation.'),
      wf(12, -6, 'Nkechi Balogun', 'Fieldwork started', 'Two procedures from LIB-CRD-001 v3.1.'),
    ],
  },
  'EXM-2026-021': {
    title: 'Unity Non-Interest Bank — Corporate Governance Examination',
    department: 'Specialised & Inclusive Finance Supervision',
    objectives: 'Assess board effectiveness, risk committee challenge quality and Shariah governance arrangements per the 2026 supervisory plan.',
    domains: ['Corporate Governance'],
    locations: ['Head Office — Unity House (demo)'],
    productLines: ['Investment accounts', 'Murabaha financing'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.1',
    reviewPeriodStart: iso(2026, 1, 1),
    reviewPeriodEnd: iso(2026, 12, 31),
    programmeRefs: ['LIB-GOV-001 v3.0'],
    milestones: [
      { id: demoUuid(55, 21), label: 'Notification letter to institution', date: isoDay(14), done: false },
      { id: demoUuid(55, 22), label: 'Entry meeting', date: isoDay(21), done: false },
      { id: demoUuid(55, 23), label: 'Exit meeting', date: isoDay(56), done: false },
    ],
    reports: [],
    workflowHistory: [
      wf(21, -12, 'Amara Osei', 'Examination approved', 'Planned activity from the 2026 Annual Supervisory Plan.'),
      wf(22, -10, 'Chuka Eze', 'Team assigned', 'Pending team assignment review (My Work item).'),
    ],
  },
  'EXM-2026-024': {
    title: 'Northstar Merchant Bank — Targeted Liquidity Examination',
    department: BSD,
    objectives:
      'Targeted examination initiated from early-warning alert EWA-2026-011 (LCR 104.2% against the demo amber threshold of 110%). Re-perform LCR computation for the alert window and test contingency funding plan activation.',
    domains: ['Liquidity Risk'],
    locations: ['Head Office — Northstar Tower (demo)', 'Treasury dealing room'],
    productLines: ['Treasury operations', 'Corporate deposits'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.1',
    reviewPeriodStart: iso(2026, 8, 1),
    reviewPeriodEnd: iso(2026, 10, 31),
    programmeRefs: ['LIB-LIQ-001 v2.4'],
    sourceAlertRef: 'EWA-2026-011',
    relatedFindingRefs: ['FND-2026-087'],
    milestones: [
      { id: demoUuid(55, 31), label: 'Notification letter to institution', date: isoDay(5), done: false },
      { id: demoUuid(55, 32), label: 'Entry meeting', date: isoDay(9), done: false },
      { id: demoUuid(55, 33), label: 'Exit meeting', date: isoDay(30), done: false },
    ],
    reports: [],
    workflowHistory: [
      wf(31, -2, 'Amara Osei', 'Examination approved', 'Converted from early-warning alert EWA-2026-011 (demo Journey B pattern).'),
      wf(32, -1, 'Fatima Bello', 'Information request IR-2026-024 drafted', 'Liquidity risk pack to be issued at notification.'),
    ],
  },
  'EXM-2026-012': {
    title: 'Vanguard Regional Bank — Targeted Capital & Insider Lending Examination',
    department: BSD,
    objectives: 'Re-compute capital adequacy after sustained CAR breach; verify connected-party lending governance and asset classification accuracy.',
    domains: ['Capital Adequacy', 'Credit Risk'],
    locations: ['Head Office — Vanguard Plaza (demo)'],
    productLines: ['Corporate lending', 'Treasury'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.0',
    reviewPeriodStart: iso(2026, 1, 1),
    reviewPeriodEnd: iso(2026, 5, 31),
    programmeRefs: ['LIB-CAP-001 v2.0', 'LIB-CRD-001 v3.1'],
    relatedFindingRefs: ['FND-2026-030', 'FND-2026-031'],
    milestones: [
      { id: demoUuid(55, 41), label: 'Entry meeting', date: iso(2026, 6, 1), done: true },
      { id: demoUuid(55, 42), label: 'Exit meeting', date: iso(2026, 7, 8), done: true },
      { id: demoUuid(55, 43), label: 'Report issued; licence suspended', date: iso(2026, 9, 5), done: true },
    ],
    reports: [
      {
        id: demoUuid(56, 2),
        title: 'Final examination report — EXM-2026-012',
        version: 'v1.0 (issued)',
        status: 'Issued',
        updatedAt: iso(2026, 8, 20),
        authorName: 'Chuka Eze',
        sections: [
          { heading: '1. Executive summary', body: 'Sustained capital breach (CAR 6.4% vs demo 10% minimum), connected-party lending above demo limits without board approval, and understated NPL classification. Six findings raised; enforcement case ENF-2026-002 opened and licence suspended. Demo record.' },
          { heading: '2. Findings', body: 'FND-2026-030 (Critical), FND-2026-031 (Critical), FND-2026-033, FND-2026-035, FND-2026-037, FND-2026-039. See finding register for the five-Cs detail.' },
          { heading: '3. Supervisory response', body: 'Capital restoration and governance restructuring plan CAP-2026-007 agreed; restructuring under way under supervision. Demo record.' },
        ],
      },
    ],
    workflowHistory: [
      wf(41, -170, 'Amara Osei', 'Examination approved', 'Triggered by off-site capital indicators.'),
      wf(42, -140, 'Chuka Eze', 'Fieldwork started', ''),
      wf(43, -110, 'Chuka Eze', 'Fieldwork completed', 'Six findings raised.'),
      wf(44, -95, 'Tunde Bakare', 'Report approved', 'Escalated to enforcement.'),
    ],
  },
  'EXM-2026-009': {
    title: 'Northstar Merchant Bank — Comprehensive Capital & Treasury Review',
    department: BSD,
    objectives: 'Comprehensive review of capital adequacy governance and treasury operations.',
    domains: ['Capital Adequacy', 'Liquidity Risk'],
    locations: ['Head Office — Northstar Tower (demo)'],
    productLines: ['Treasury operations'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.0',
    reviewPeriodStart: iso(2025, 10, 1),
    reviewPeriodEnd: iso(2026, 4, 30),
    programmeRefs: ['LIB-LIQ-001 v2.3', 'LIB-CAP-001 v2.0'],
    relatedFindingRefs: ['FND-2026-087'],
    milestones: [
      { id: demoUuid(55, 51), label: 'Entry meeting', date: iso(2026, 5, 4), done: true },
      { id: demoUuid(55, 52), label: 'Exit meeting', date: iso(2026, 6, 19), done: true },
    ],
    reports: [
      {
        id: demoUuid(56, 3),
        title: 'Final examination report — EXM-2026-009',
        version: 'v1.0 (issued)',
        status: 'Issued',
        updatedAt: iso(2026, 7, 10),
        authorName: 'Fatima Bello',
        sections: [
          { heading: '1. Executive summary', body: 'Two findings raised: liquidity reporting delays (FND-2026-087, in remediation via CAP-2026-002) and treasury mandate breaches not escalated (FND-2026-091, confirmed). Stale-address finding FND-2026-071 closed after evidence review. Demo record.' },
        ],
      },
    ],
    workflowHistory: [
      wf(51, -200, 'Amara Osei', 'Examination approved', ''),
      wf(52, -160, 'Fatima Bello', 'Report issued', ''),
    ],
  },
  'EXM-2026-008': {
    title: 'Aurora Savings & Loans — Routine Comprehensive Examination',
    department: 'Specialised & Inclusive Finance Supervision',
    objectives: 'Routine comprehensive examination; no significant issues identified.',
    domains: ['Credit Risk', 'Corporate Governance'],
    locations: ['Head Office — Aurora Court (demo)'],
    productLines: ['Savings', 'Mortgages'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.0',
    reviewPeriodStart: iso(2025, 9, 1),
    reviewPeriodEnd: iso(2026, 8, 31),
    programmeRefs: ['LIB-CRD-001 v3.0', 'LIB-GOV-001 v2.4'],
    milestones: [{ id: demoUuid(55, 61), label: 'Report archived', date: iso(2026, 10, 5), done: true }],
    reports: [
      {
        id: demoUuid(56, 4),
        title: 'Final examination report — EXM-2026-008',
        version: 'v1.0 (issued)',
        status: 'Issued',
        updatedAt: iso(2026, 10, 5),
        authorName: 'Peter Okonjo',
        sections: [{ heading: '1. Executive summary', body: 'Closed with no findings. Controls assessed effective across sampled procedures. Demo record.' }],
      },
    ],
    workflowHistory: [wf(61, -60, 'Peter Okonjo', 'Examination completed', 'No findings.')],
  },
  'EXM-2026-005': {
    title: 'Crestline Payment Bank — Cyber Resilience Review',
    department: BSD,
    objectives: 'Assess cyber resilience, third-party risk management and API security for the payment-focused business model.',
    domains: ['Cybersecurity'],
    locations: ['Head Office — Crestline Fintech Hub (demo)'],
    productLines: ['Payment processing', 'Agent network technology', 'Open API partnerships'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v2.0',
    reviewPeriodStart: iso(2025, 10, 1),
    reviewPeriodEnd: iso(2026, 2, 28),
    programmeRefs: ['LIB-CYB-001 v1.7'],
    relatedFindingRefs: ['FND-2026-062', 'FND-2026-066'],
    milestones: [
      { id: demoUuid(55, 71), label: 'Exit meeting held', date: iso(2026, 3, 20), done: true },
      { id: demoUuid(55, 72), label: 'Draft report with lead supervisor', date: isoDay(-2), done: true },
      { id: demoUuid(55, 73), label: 'Report approval (My Work item)', date: isoDay(2), done: false },
    ],
    reports: [
      {
        id: demoUuid(56, 5),
        title: 'Draft examination report — EXM-2026-005',
        version: 'v0.9 (pending approval)',
        status: 'In Review',
        updatedAt: isoDay(-2),
        authorName: 'Kwame Mensah',
        sections: [
          { heading: '1. Executive summary (demo draft)', body: 'Cyber resilience is broadly sound; two findings raised: outdated third-party risk register missing two payment aggregators (FND-2026-066, remediation CAP-2026-008 in progress) and agent-network onboarding controls (FND-2026-062, confirmed). Awaiting report approval by the lead supervisor.' },
        ],
      },
    ],
    workflowHistory: [
      wf(71, -280, 'Amara Osei', 'Examination approved', ''),
      wf(72, -250, 'Kwame Mensah', 'Fieldwork started', ''),
      wf(73, -240, 'Kwame Mensah', 'Procedure CYB-01 approved (Fail)', 'Register missing two aggregators integrated in Q2 2026.'),
      wf(74, -30, 'Kwame Mensah', 'Draft report submitted for approval', 'My Work: report-approval item for Amara Osei.'),
    ],
  },
  'EXM-2025-031': {
    title: 'Meridian Commercial Bank — Comprehensive Examination 2025',
    department: BSD,
    objectives: 'Full-scope comprehensive examination; first surfaced the AML monitoring gaps now confirmed in FND-2026-101.',
    domains: ['AML/CFT', 'Credit Risk', 'Corporate Governance', 'Liquidity Risk'],
    locations: ['All major locations (demo)'],
    productLines: ['All business lines'],
    methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
    methodologyVersion: 'v1.9',
    reviewPeriodStart: iso(2024, 10, 1),
    reviewPeriodEnd: iso(2025, 9, 30),
    programmeRefs: ['LIB-AML-002 v2.0', 'LIB-CRD-000 v2.9'],
    relatedFindingRefs: ['FND-2026-101', 'FND-2025-077'],
    milestones: [{ id: demoUuid(55, 81), label: 'Report issued', date: iso(2025, 12, 12), done: true }],
    reports: [
      {
        id: demoUuid(56, 6),
        title: 'Final examination report — EXM-2025-031',
        version: 'v1.0 (issued)',
        status: 'Issued',
        updatedAt: iso(2025, 12, 12),
        authorName: 'Daniel Adeyemi',
        sections: [
          { heading: '1. Executive summary', body: 'Seven findings raised (one still open: FND-2026-101 AML transaction monitoring gaps). KYC backlog finding FND-2025-077 closed after validation. CAP-2026-003 agreed for the monitoring gaps; now overdue and escalated to ENF-2026-001. Demo record.' },
        ],
      },
    ],
    workflowHistory: [
      wf(81, -430, 'Amara Osei', 'Examination approved', ''),
      wf(82, -400, 'Daniel Adeyemi', 'Fieldwork started', ''),
      wf(83, -380, 'Hauwa Sadiq', 'Finding FND-2026-101 raised from AML-01', 'Monitoring rules miss structured deposits below the demo threshold.'),
      wf(84, -330, 'Tunde Bakare', 'Report issued', ''),
    ],
  },
}

// ---------------------------------------------------------------------------
// Procedure instances per examination
// ---------------------------------------------------------------------------

const PROCEDURES_BY_EXAM_REF: Record<string, ProcedureSeed[]> = {
  'EXM-2026-014': [
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-01', ownerName: 'Hauwa Sadiq', dueOffsetDays: -4,
      status: 'Approved', result: 'Fail', startedOffsetDays: -14, completedOffsetDays: -6, severity: 'High',
      exceptionDetails:
        'Rule inventory covers 18 of 22 declared high-risk scenarios. Structured deposits just below the demo reporting threshold are not captured — the same condition confirmed in FND-2026-101. Tuning records for Q2 2026 are missing.',
      conclusion:
        'Monitoring rule coverage remains deficient; CAP-2026-003 remediation has not closed the gap. Recommend escalating severity rationale in the draft report.',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-02', ownerName: 'Hauwa Sadiq', dueOffsetDays: 2,
      status: 'Submitted for Review', result: 'Partial', startedOffsetDays: -9, severity: 'Medium',
      exceptionDetails:
        '28 of 40 sampled alerts (demo sample) dispositioned within the 5-day standard; 12 exceeded it, worst case 19 days. Rationale text missing on 4 dispositions.',
      conclusion: 'Timeliness partially effective; submitted for team lead review.',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-03', ownerName: 'Nkechi Balogun', dueOffsetDays: -2,
      status: 'Approved', result: 'Fail', startedOffsetDays: -12, completedOffsetDays: -4, severity: 'High',
      linkedFindingRef: 'FND-2026-107',
      exceptionDetails:
        'Periodic refresh overdue for 2,300 high-risk customers (demo figure); backlog not reported to the board risk committee.',
      conclusion: 'Fail — finding FND-2026-107 raised and submitted for review.',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-04', ownerName: 'Chuka Eze', dueOffsetDays: 4,
      status: 'Approved', result: 'Pass', startedOffsetDays: -10, completedOffsetDays: -3,
      conclusion: 'Screening triggers correctly configured; re-performance over 25 demo customers produced no unmatched hits.',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-05', ownerName: 'Nkechi Balogun', dueOffsetDays: 6,
      status: 'In Progress', result: 'Not Tested', startedOffsetDays: -2,
      population: 'STR register Jan–Sep 2026; 15 STRs sampled',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-06', ownerName: 'Hauwa Sadiq', dueOffsetDays: 10,
      status: 'Not Started', result: 'Not Tested',
    },
  ],
  'EXM-2026-017': [
    {
      programmeCode: 'LIB-CRD-001', procCode: 'CRD-01', ownerName: 'Nkechi Balogun', dueOffsetDays: 3,
      status: 'In Progress', result: 'Partial', startedOffsetDays: -5, severity: 'Medium',
      sampleSize: 25, population: '25 credit files across three branches',
      exceptionDetails: 'First 10 of 25 files reviewed; two exceptions (missing collateral revaluation). Demo in-progress state.',
    },
    {
      programmeCode: 'LIB-CRD-001', procCode: 'CRD-02', ownerName: 'Samuel Ike', dueOffsetDays: 7,
      status: 'Not Started', result: 'Not Tested',
    },
  ],
  'EXM-2026-021': [
    { programmeCode: 'LIB-GOV-001', procCode: 'GOV-01', ownerName: 'Chuka Eze', dueOffsetDays: 30, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-GOV-001', procCode: 'GOV-02', ownerName: 'Lerato Mokoena', dueOffsetDays: 38, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-GOV-001', procCode: 'GOV-03', ownerName: 'Lerato Mokoena', dueOffsetDays: 45, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-GOV-001', procCode: 'GOV-04', ownerName: 'Chuka Eze', dueOffsetDays: 50, status: 'Not Started', result: 'Not Tested' },
  ],
  'EXM-2026-024': [
    { programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-01', ownerName: 'Fatima Bello', dueOffsetDays: 14, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-02', ownerName: 'Fatima Bello', dueOffsetDays: 18, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-03', ownerName: 'Aisha Yusuf', dueOffsetDays: 22, status: 'Not Started', result: 'Not Tested' },
    { programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-04', ownerName: 'Aisha Yusuf', dueOffsetDays: 26, status: 'Not Started', result: 'Not Tested' },
  ],
  'EXM-2026-012': [
    {
      programmeCode: 'LIB-CAP-001', procCode: 'CAP-01', ownerName: 'Chuka Eze', dueOffsetDays: -140,
      status: 'Approved', result: 'Fail', severity: 'Critical', linkedFindingRef: 'FND-2026-030',
      completedOffsetDays: -150,
      exceptionDetails: 'Recomputed CAR 6.4% vs submitted 6.9% (demo); sustained breach of the 10% demo minimum.',
      conclusion: 'Critical Fail — FND-2026-030 raised and escalated to enforcement.',
    },
    {
      programmeCode: 'LIB-CAP-001', procCode: 'CAP-02', ownerName: 'Zainab Lawal', dueOffsetDays: -135,
      status: 'Approved', result: 'Fail', severity: 'High', linkedFindingRef: 'FND-2026-037',
      completedOffsetDays: -142,
      exceptionDetails: 'No board challenge of management capital projections for three consecutive quarters (demo).',
      conclusion: 'Fail — governance finding FND-2026-037 raised.',
    },
    {
      programmeCode: 'LIB-CRD-001', procCode: 'CRD-04', ownerName: 'Peter Okonjo', dueOffsetDays: -138,
      status: 'Approved', result: 'Fail', severity: 'Critical', linkedFindingRef: 'FND-2026-031',
      completedOffsetDays: -145,
      exceptionDetails: 'Connected-party exposures exceed demo single-obligor limits without board approval records.',
      conclusion: 'Critical Fail — FND-2026-031 raised.',
    },
    {
      programmeCode: 'LIB-CRD-001', procCode: 'CRD-02', ownerName: 'Peter Okonjo', dueOffsetDays: -136,
      status: 'Approved', result: 'Fail', severity: 'High', linkedFindingRef: 'FND-2026-033',
      completedOffsetDays: -141,
      exceptionDetails: 'Re-aged facilities worth 4.1% of the demo loan book classified below the required bucket.',
      conclusion: 'Fail — FND-2026-033 raised.',
    },
  ],
  'EXM-2026-009': [
    {
      programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-03', ownerName: 'Fatima Bello', dueOffsetDays: -150,
      status: 'Approved', result: 'Fail', severity: 'Medium', linkedFindingRef: 'FND-2026-087',
      completedOffsetDays: -160,
      exceptionDetails: 'Daily liquidity returns submitted after cut-off six times in the review period (demo).',
      conclusion: 'Fail — FND-2026-087 raised; CAP-2026-002 agreed.',
    },
    {
      programmeCode: 'LIB-LIQ-001', procCode: 'LIQ-01', ownerName: 'Kwame Mensah', dueOffsetDays: -152,
      status: 'Approved', result: 'Pass', completedOffsetDays: -158,
      conclusion: 'LCR recomputation agreed with submitted returns within tolerance.',
    },
  ],
  'EXM-2026-008': [
    {
      programmeCode: 'LIB-CRD-001', procCode: 'CRD-01', ownerName: 'Peter Okonjo', dueOffsetDays: -60,
      status: 'Approved', result: 'Pass', completedOffsetDays: -70,
      conclusion: 'All 25 sampled files complete; valuations current.',
    },
    {
      programmeCode: 'LIB-GOV-001', procCode: 'GOV-01', ownerName: 'Peter Okonjo', dueOffsetDays: -58,
      status: 'Approved', result: 'Pass', completedOffsetDays: -66,
      conclusion: 'Board composition compliant with the demo independence ratio.',
    },
  ],
  'EXM-2026-005': [
    {
      programmeCode: 'LIB-CYB-001', procCode: 'CYB-01', ownerName: 'Kwame Mensah', dueOffsetDays: -240,
      status: 'Approved', result: 'Fail', severity: 'Medium', linkedFindingRef: 'FND-2026-066',
      completedOffsetDays: -248,
      exceptionDetails: 'Register missing two payment aggregators integrated in Q2 2026 (demo).',
      conclusion: 'Fail — FND-2026-066 raised; CAP-2026-008 agreed.',
    },
    {
      programmeCode: 'LIB-CYB-001', procCode: 'CYB-02', ownerName: 'Kwame Mensah', dueOffsetDays: -238,
      status: 'Approved', result: 'Partial', severity: 'Low', completedOffsetDays: -245,
      exceptionDetails: 'API inventory complete; two security reviews older than the demo 12-month standard.',
      conclusion: 'Partial — monitored via management action, no separate finding.',
    },
    {
      programmeCode: 'LIB-CYB-001', procCode: 'CYB-03', ownerName: 'Nkechi Balogun', dueOffsetDays: -235,
      status: 'Approved', result: 'Pass', completedOffsetDays: -242,
      conclusion: 'IR plan exercised within the demo annual standard; findings remediated.',
    },
    {
      programmeCode: 'LIB-CYB-001', procCode: 'CYB-04', ownerName: 'Nkechi Balogun', dueOffsetDays: -232,
      status: 'Approved', result: 'Pass', completedOffsetDays: -240,
      conclusion: 'Quarterly access reviews evidenced; leaver revocations timely.',
    },
  ],
  'EXM-2025-031': [
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-01', ownerName: 'Hauwa Sadiq', dueOffsetDays: -390,
      status: 'Approved', result: 'Fail', severity: 'High', linkedFindingRef: 'FND-2026-101',
      completedOffsetDays: -395,
      exceptionDetails: '14 suspicious patterns unreported in the sample period; structured-deposit gap. Demo record.',
      conclusion: 'Fail — FND-2026-101 raised; CAP-2026-003 agreed (now overdue).',
    },
    {
      programmeCode: 'LIB-AML-002', procCode: 'AML-03', ownerName: 'Hauwa Sadiq', dueOffsetDays: -385,
      status: 'Approved', result: 'Fail', severity: 'Medium', linkedFindingRef: 'FND-2025-077',
      completedOffsetDays: -390,
      exceptionDetails: 'KYC remediation backlog (2025). Closed after validation. Demo record.',
      conclusion: 'Fail — FND-2025-077 raised; subsequently closed.',
    },
    {
      programmeCode: 'LIB-CRD-000', procCode: 'CRD-L1', ownerName: 'Peter Okonjo', dueOffsetDays: -380,
      status: 'Approved', result: 'Pass', completedOffsetDays: -388,
      conclusion: 'Legacy checklist: files substantially complete. Demo record.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Information requests
// ---------------------------------------------------------------------------

const iri = (n: number, document: string, deadlineOffsetDays: number, status: InformationRequest['items'][number]['status'], receivedOffsetDays?: number) => ({
  id: demoUuid(57, n),
  document,
  deadline: isoDay(deadlineOffsetDays),
  status,
  receivedAt: receivedOffsetDays === undefined ? undefined : isoDateTime(receivedOffsetDays, 11, 20),
})

export const INFORMATION_REQUESTS: InformationRequest[] = [
  {
    id: demoUuid(58, 1),
    examinationId: EXAMINATIONS.find((e) => e.reference === 'EXM-2026-014')!.id,
    reference: 'IR-2026-014',
    title: 'AML/CFT thematic request pack — Meridian Commercial Bank',
    templateName: 'AML/CFT thematic request pack',
    issuedAt: isoDateTime(-18, 9, 0),
    dueDate: isoDay(-8),
    status: 'Partially Fulfilled',
    recipientNames: ['Grace Mbeki (Institution Administrator)', 'Ebenezer Kalu (Regulatory Liaison)'],
    items: [
      iri(1, 'Transaction monitoring rule inventory (Excel)', -10, 'Received', -12),
      iri(2, 'AML business-wide risk assessment (PDF)', -10, 'Received', -11),
      iri(3, 'STR register extract for the review period', -8, 'Received', -9),
      iri(4, 'Sanctions screening hit-resolution log', -6, 'Overdue'),
      iri(5, 'CDD periodic refresh tracker by risk tier', -4, 'Requested'),
    ],
  },
  {
    id: demoUuid(58, 2),
    examinationId: EXAMINATIONS.find((e) => e.reference === 'EXM-2026-024')!.id,
    reference: 'IR-2026-024',
    title: 'Liquidity risk pack — Northstar Merchant Bank',
    templateName: 'Liquidity risk pack',
    issuedAt: isoDateTime(-1, 15, 0),
    dueDate: isoDay(6),
    status: 'Issued',
    recipientNames: ['Ibrahim Sani (Institution Administrator)'],
    items: [
      iri(11, 'Daily LCR computation for the alert window', 6, 'Requested'),
      iri(12, 'Contingency funding plan and last exercise report', 6, 'Requested'),
      iri(13, 'ALCO minutes for the review period', 6, 'Requested'),
    ],
  },
  {
    id: demoUuid(58, 3),
    examinationId: EXAMINATIONS.find((e) => e.reference === 'EXM-2026-017')!.id,
    reference: 'IR-2026-017',
    title: 'Credit file sample pack — Delta Microfinance Bank',
    templateName: 'Credit file sample pack',
    issuedAt: isoDateTime(-8, 10, 0),
    dueDate: isoDay(-1),
    status: 'Fulfilled',
    recipientNames: ['Ngozi Emenike (Institution Administrator)'],
    items: [
      iri(21, 'Ageing and classification report (month-end)', -3, 'Received', -4),
      iri(22, 'Collateral valuation register', -3, 'Received', -4),
      iri(23, 'Restructured facilities list', -1, 'Received', -2),
    ],
  },
]

// ---------------------------------------------------------------------------
// Assembled exports
// ---------------------------------------------------------------------------

export const EXAMINATION_PROCEDURES: ExaminationProcedure[] = Object.entries(
  PROCEDURES_BY_EXAM_REF,
).flatMap(([ref, seeds]) => {
  const exam = EXAMINATIONS.find((e) => e.reference === ref)
  if (!exam) return []
  return seeds.map((s) => mkProcedure(exam.id, s))
})

/** Procedure id lookup used by evidence/finding fixtures for stable links. */
export const procedureIdByExamRefAndCode = (examRef: string, code: string): string => {
  const exam = EXAMINATIONS.find((e) => e.reference === examRef)
  const p = EXAMINATION_PROCEDURES.find((x) => x.examinationId === exam?.id && x.code === code)
  if (!p) throw new Error(`demo procedure missing: ${examRef}/${code}`)
  return p.id
}

export const EXAMINATION_DETAILS: ExaminationDetail[] = EXAMINATIONS.map((exam) => {
  const seed = EXAM_DETAIL_SEEDS[exam.reference]
  if (!seed) throw new Error(`demo detail seed missing for ${exam.reference}`)
  return {
    ...exam,
    title: seed.title,
    jurisdictionId: MBA_ID,
    department: seed.department ?? BSD,
    scope: {
      objectives: seed.objectives,
      domains: seed.domains,
      locations: seed.locations,
      productLines: seed.productLines,
      limitations: seed.limitations,
      methodologyName: seed.methodologyName,
      methodologyVersion: seed.methodologyVersion,
      reviewPeriodStart: seed.reviewPeriodStart,
      reviewPeriodEnd: seed.reviewPeriodEnd,
    },
    team: mkTeam(exam),
    sourceAlertRef: seed.sourceAlertRef,
    relatedFindingRefs: seed.relatedFindingRefs,
    programmeRefs: seed.programmeRefs,
    milestones: seed.milestones,
    reports: seed.reports,
    workflowHistory: seed.workflowHistory,
  }
})
