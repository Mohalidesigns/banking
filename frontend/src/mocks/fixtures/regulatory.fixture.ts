/**
 * Regulatory administration fixtures (Spec §10.1–§10.3, Phase 4A, §17.5).
 * ONE coherent story-world: framework citations match the examination
 * library's `regulatoryMapping` references (MBA/PRU/2024, MBA/AML/2023,
 * MBA/CYB/2025, MBA/GOV/2024, MBA/NIB/2023, MBA/OPS/2026), requirements
 * carry the live supervisory anchors (Vanguard CAR breach → EWA-2026-008 →
 * ENF-2026-002; Meridian AML EXM-2026-014 → FND-2026-101 → CAP-2026-003;
 * Northstar LCR SUB-2026-0144 → EWA-2026-011 → EXM-2026-024), obligations
 * discharge through the existing MPR/QAR/QSL returns, and correspondence
 * threads reference the same items. Directive (DIR-…) and enforcement
 * (ENF-…) targets are Phase-5 placeholders — chips/labels only, never link
 * targets. Everything is fictional demo data for the Meridia Banking
 * Authority (MBA); AI-extracted requirements are labelled "Demo AI
 * response" and kept visibly separate from approved content (Spec §10.1).
 */
import { demoUuid, iso, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import {
  CORRECTIVE_ACTIONS,
  EARLY_WARNING_ALERTS,
  EXAMINATIONS,
  FINDINGS,
  RETURN_SUBMISSIONS,
} from '@/mocks/fixtures/supervision.fixture'
import type {
  CorrespondenceRelation,
  FrameworkMapping,
  FrameworkMappingKind,
  ObligationChangeEntry,
  RegulatoryCorrespondence,
  RegulatoryFramework,
  RegulatoryObligation,
  RegulatoryRequirement,
} from '@/types/regulatory'

// ---------------------------------------------------------------------------
// Relation / mapping builders (shared by fixtures and the repository so
// cross-links resolve refs to real routes and never drift)
// ---------------------------------------------------------------------------

let mapSeq = 0
const mid = (): string => demoUuid(95, ++mapSeq)

const PHASE5_NOTE = 'Phase 5 module — demo reference label only (not a link target).'

/** Explicit-kind mapping builder; `link` is resolved to a real prototype
 *  route where the target page exists. Directive/enforcement targets are
 *  Phase-5 placeholders — always chips, never link targets. */
export function relationFor(kind: FrameworkMappingKind, ref: string, label: string, note?: string): FrameworkMapping {
  let link: string | undefined
  switch (kind) {
    case 'examination': {
      const e = EXAMINATIONS.find((x) => x.reference === ref)
      link = e ? `/app/examinations/${e.id}` : undefined
      break
    }
    case 'finding': {
      const f = FINDINGS.find((x) => x.reference === ref)
      link = f ? `/app/findings/${f.id}` : undefined
      break
    }
    case 'return-submission': {
      const s = RETURN_SUBMISSIONS.find((x) => x.reference === ref)
      link = s ? `/app/returns/${s.id}` : undefined
      break
    }
    case 'alert': {
      const a = EARLY_WARNING_ALERTS.find((x) => x.reference === ref)
      link = a ? `/app/early-warnings?reference=${encodeURIComponent(ref)}` : undefined
      break
    }
    case 'corrective-action':
      link = CORRECTIVE_ACTIONS.some((c) => c.reference === ref) ? '/app/remediation' : undefined
      break
    case 'return-definition':
      link = `/app/returns?returnCode=${encodeURIComponent(ref)}`
      break
    case 'indicator':
      link = `/app/prudential/indicators?indicator=${encodeURIComponent(ref)}`
      break
    case 'obligation':
      link = `/app/regulatory/obligations?obligation=${encodeURIComponent(ref)}`
      break
    default:
      break
  }
  const isPhase5 = kind === 'directive' || kind === 'enforcement'
  return {
    id: mid(),
    kind,
    targetRef: ref,
    targetLabel: label,
    link: isPhase5 ? undefined : link,
    note: isPhase5 ? (note ?? PHASE5_NOTE) : note,
  }
}

/** Shorthand: relation kind inferred from the reference prefix. */
export function relationFromRef(ref: string, label: string, note?: string): CorrespondenceRelation {
  const kind: FrameworkMappingKind = ref.startsWith('EXM-')
    ? 'examination'
    : ref.startsWith('FND-')
      ? 'finding'
      : ref.startsWith('SUB-')
        ? 'return-submission'
        : ref.startsWith('EWA-') || ref.startsWith('EXC-')
          ? 'alert'
          : ref.startsWith('CAP-')
            ? 'corrective-action'
            : ref.startsWith('OBL-')
              ? 'obligation'
              : ref.startsWith('DIR-')
                ? 'directive'
                : ref.startsWith('ENF-')
                  ? 'enforcement'
                  : ref.startsWith('MPR-') || ref.startsWith('QAR-') || ref.startsWith('QSL-')
                    ? 'return-definition'
                    : 'examination-procedure'
  return relationFor(kind, ref, label, note)
}

const ALL_BANK_CATEGORIES = [
  'Commercial Bank',
  'Merchant Bank',
  'Non-Interest Bank',
  'Payment Service Bank',
  'Savings & Loans Bank',
  'Microfinance Bank',
  'Custody & Trust Bank',
  'Regional Bank',
]
const DEPOSIT_BANKS = ['Commercial Bank', 'Merchant Bank', 'Regional Bank', 'Non-Interest Bank']

const ATTACHMENT_NOTE = 'Simulated attachment — the prototype stores no real file (Spec §17.4).'

// ---------------------------------------------------------------------------
// Frameworks (Spec §10.1)
// ---------------------------------------------------------------------------

const MBA = { code: 'MBA', name: 'Meridia Banking Authority' }

export const REGULATORY_FRAMEWORKS: RegulatoryFramework[] = [
  {
    id: demoUuid(91, 1),
    code: 'MBA/PRU/2024',
    name: 'Prudential Standards for Licensed Banks (2024 Revision)',
    category: 'Prudential',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Banking Supervision Department',
    version: '2.3',
    publishedDate: iso(2024, 1, 15),
    effectiveDate: iso(2024, 4, 1),
    status: 'Active',
    description:
      'Core prudential rulebook: minimum capital adequacy, asset classification and provisioning, single-obligor and concentration limits, liquidity coverage and contingency funding. All thresholds are illustrative demo values, not actual regulatory minima.',
    applicableCategories: DEPOSIT_BANKS,
    domains: ['prudential', 'erm'],
    sourceDocuments: [
      {
        id: demoUuid(95, 101),
        name: 'MBA-Prudential-Standards-2024-rev2.3.pdf',
        version: '2.3',
        uploadedAt: isoDateTime(-580, 10),
        uploadedByName: 'Fatima Bello',
        sizeKb: 2480,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '2.0', effectiveFrom: iso(2021, 4, 1), changeSummary: 'Initial 2021 rulebook (supersedes MBA/PRU/2021 legacy circulars).' },
      { version: '2.2', effectiveFrom: iso(2023, 4, 1), changeSummary: 'Liquidity coverage standard tightened from 90% to 100% (demo value); contingency funding testing added.', approvedByName: 'Amara Osei', approvedAt: isoDateTime(-960, 11) },
      { version: '2.3', effectiveFrom: iso(2024, 4, 1), changeSummary: 'Single-obligor limits clarified for connected parties; provisioning matrix updated.', approvedByName: 'Amara Osei', approvedAt: isoDateTime(-580, 11) },
    ],
    mappings: [
      relationFor('return-definition', 'MPR-09', 'Monthly prudential return — capital adequacy'),
      relationFor('return-definition', 'MPR-04', 'Monthly prudential return — liquidity'),
      relationFor('return-definition', 'QAR-02', 'Quarterly asset quality return'),
      relationFor('indicator', 'CAR', 'Capital Adequacy Ratio indicator'),
      relationFor('indicator', 'LCR', 'Liquidity Coverage Ratio indicator'),
      relationFor('indicator', 'NPL', 'Non-Performing Loan Ratio indicator'),
      relationFor('obligation', 'OBL-2026-001', 'Monthly capital adequacy return obligation'),
      relationFor('obligation', 'OBL-2026-002', 'Monthly liquidity return obligation'),
      relationFor('obligation', 'OBL-2026-003', 'Quarterly asset quality return obligation'),
      relationFor('obligation', 'OBL-2026-010', 'Contingency funding plan testing obligation'),
      relationFor('examination', 'EXM-2026-024', 'Targeted liquidity examination — Northstar Merchant Bank'),
      relationFor('finding', 'FND-2026-030', 'Vanguard CAR below regulatory minimum'),
      relationFor('enforcement', 'ENF-2026-002', 'Vanguard Regional Bank — licence suspension'),
    ],
    ownerName: 'Fatima Bello',
    lastReviewedAt: isoDay(-45),
  },
  {
    id: demoUuid(91, 2),
    code: 'MBA/PRU/2021',
    name: 'Prudential Standards for Licensed Banks (2021 — legacy)',
    category: 'Prudential',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Banking Supervision Department',
    version: '1.4',
    publishedDate: iso(2021, 1, 20),
    effectiveDate: iso(2021, 4, 1),
    status: 'Superseded',
    description:
      'Legacy prudential rulebook, superseded by MBA/PRU/2024 on 1 Apr 2024. Retained for historical examination mappings (demo record).',
    applicableCategories: DEPOSIT_BANKS,
    domains: ['prudential'],
    sourceDocuments: [
      {
        id: demoUuid(95, 102),
        name: 'MBA-Prudential-Standards-2021.pdf',
        version: '1.4',
        uploadedAt: isoDateTime(-1600, 9),
        uploadedByName: 'Fatima Bello',
        sizeKb: 1980,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '1.0', effectiveFrom: iso(2021, 4, 1), changeSummary: 'Initial publication.' },
      { version: '1.4', effectiveFrom: iso(2023, 1, 1), changeSummary: 'Final legacy revision before the 2024 rewrite.' },
    ],
    mappings: [relationFor('return-definition', 'MPR-09', 'Monthly prudential return (legacy mapping)')],
    ownerName: 'Fatima Bello',
    lastReviewedAt: iso(2024, 4, 2),
  },
  {
    id: demoUuid(91, 3),
    code: 'MBA/AML/2023',
    name: 'Anti-Money Laundering, CFT & CPF Regulation for Supervised Institutions',
    category: 'AML/CFT',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Financial Crime Compliance Unit',
    version: '1.4',
    publishedDate: iso(2023, 3, 1),
    effectiveDate: iso(2023, 7, 1),
    status: 'Active',
    description:
      'Financial-crime rulebook: customer due diligence, risk-based classification, transaction monitoring, suspicious transaction reporting and sanctions screening. Amended by the MBA/AML/2024 circular (suspicious transaction reporting). All case figures are fictional demo data.',
    applicableCategories: ALL_BANK_CATEGORIES,
    domains: ['aml'],
    sourceDocuments: [
      {
        id: demoUuid(95, 103),
        name: 'MBA-AML-CFT-Regulation-2023-consolidated.pdf',
        version: '1.4',
        uploadedAt: isoDateTime(-500, 14),
        uploadedByName: 'Hauwa Sadiq',
        sizeKb: 3120,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
      {
        id: demoUuid(95, 104),
        name: 'MBA-AML-2024-Amendment-Circular.pdf',
        version: '1.0',
        uploadedAt: isoDateTime(-300, 16),
        uploadedByName: 'Hauwa Sadiq',
        sizeKb: 640,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '1.0', effectiveFrom: iso(2023, 7, 1), changeSummary: 'Initial publication.' },
      { version: '1.4', effectiveFrom: iso(2024, 9, 1), changeSummary: 'STR deadline tightened to 24 hours (demo standard); risk-classification refresh cycle added.', approvedByName: 'Tunde Bakare', approvedAt: isoDateTime(-450, 10) },
    ],
    mappings: [
      relationFor('examination-procedure', 'MBA/AML/2023 §4.1', 'Customer due diligence (examination library mapping)'),
      relationFor('examination-procedure', 'MBA/AML/2023 §6.3', 'Transaction monitoring obligations (examination library mapping)'),
      relationFor('examination-procedure', 'MBA/AML/2024 §2.2', 'Suspicious transaction reporting (examination library mapping)'),
      relationFor('obligation', 'OBL-2026-004', 'Suspicious transaction reporting within 24 hours'),
      relationFor('obligation', 'OBL-2026-005', 'Periodic CDD refresh for high-risk customers'),
      relationFor('obligation', 'OBL-2026-006', 'Annual AML compliance report and independent audit'),
      relationFor('examination', 'EXM-2026-014', 'AML/CFT targeted examination — Meridian Commercial Bank'),
      relationFor('finding', 'FND-2026-101', 'Meridian AML transaction monitoring gaps'),
      relationFor('finding', 'FND-2026-107', 'Meridian CDD refresh backlog'),
      relationFor('directive', 'DIR-2026-004', 'Corrective directive: AML remediation — Meridian'),
    ],
    ownerName: 'Hauwa Sadiq',
    lastReviewedAt: isoDay(-20),
  },
  {
    id: demoUuid(91, 4),
    code: 'MBA/GOV/2024',
    name: 'Corporate Governance Code for Licensed Banks',
    category: 'Governance',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Governance & Specialised Institutions',
    version: '1.2',
    publishedDate: iso(2024, 2, 1),
    effectiveDate: iso(2024, 6, 1),
    status: 'Active',
    description:
      'Board composition and tenure, board risk committee reporting standards, fit-and-proper assessment of directors and key officers. Feeds the §9.1 Corporate Governance specialist domain (Phase 4B).',
    applicableCategories: DEPOSIT_BANKS,
    domains: ['governance'],
    sourceDocuments: [
      {
        id: demoUuid(95, 105),
        name: 'MBA-Corporate-Governance-Code-2024.pdf',
        version: '1.2',
        uploadedAt: isoDateTime(-560, 11),
        uploadedByName: 'Lerato Mokoena',
        sizeKb: 1450,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '1.0', effectiveFrom: iso(2024, 6, 1), changeSummary: 'Initial publication.' },
      { version: '1.2', effectiveFrom: iso(2025, 6, 1), changeSummary: 'Board risk reporting timeliness standard (30 demo days) added.', approvedByName: 'Amara Osei', approvedAt: isoDateTime(-170, 10) },
    ],
    mappings: [
      relationFor('examination-procedure', 'MBA/GOV/2024 §2.1', 'Board composition and tenure (examination library mapping)'),
      relationFor('obligation', 'OBL-2026-008', 'Board risk committee reporting within 30 days'),
      relationFor('examination', 'EXM-2026-021', 'Planned governance examination — Unity Non-Interest Bank'),
      relationFor('finding', 'FND-2026-109', 'Meridian board risk reporting timeliness'),
      relationFor('finding', 'FND-2026-037', 'Vanguard board oversight failures'),
    ],
    ownerName: 'Lerato Mokoena',
    lastReviewedAt: isoDay(-60),
  },
  {
    id: demoUuid(91, 5),
    code: 'MBA/CYB/2025',
    name: 'Cyber Resilience & Technology Risk Guidelines',
    category: 'Cybersecurity',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Technology Risk Supervision',
    version: '1.1',
    publishedDate: iso(2025, 1, 10),
    effectiveDate: iso(2025, 4, 1),
    status: 'Active',
    description:
      'Technology risk management, third-party and outsourcing risk, and 48-hour cyber incident notification (demo standard). Feeds the §9.3 IT & Cybersecurity specialist domain (Phase 4C).',
    applicableCategories: ALL_BANK_CATEGORIES,
    domains: ['cybersecurity', 'operations'],
    sourceDocuments: [
      {
        id: demoUuid(95, 106),
        name: 'MBA-Cyber-Resilience-Guidelines-2025.pdf',
        version: '1.1',
        uploadedAt: isoDateTime(-220, 15),
        uploadedByName: 'Kwame Mensah',
        sizeKb: 1780,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '1.0', effectiveFrom: iso(2025, 4, 1), changeSummary: 'Initial publication.' },
      { version: '1.1', effectiveFrom: iso(2026, 1, 15), changeSummary: 'Third-party risk register maintenance standard clarified after the 2025 payment-sector review (demo).', approvedByName: 'Tunde Bakare', approvedAt: isoDateTime(-310, 13) },
    ],
    mappings: [
      relationFor('examination-procedure', 'MBA/CYB/2025 §3.1', 'Technology risk management (examination library mapping)'),
      relationFor('examination-procedure', 'MBA/CYB/2025 §5.2', 'Third-party and outsourcing risk (examination library mapping)'),
      relationFor('obligation', 'OBL-2026-009', 'Cyber incident notification within 48 hours'),
      relationFor('examination', 'EXM-2026-005', 'Cybersecurity examination — Crestline Payment Bank'),
      relationFor('finding', 'FND-2026-066', 'Crestline API third-party risk register outdated'),
      relationFor('finding', 'FND-2026-062', 'Crestline agent network onboarding controls'),
    ],
    ownerName: 'Kwame Mensah',
    lastReviewedAt: isoDay(-15),
  },
  {
    id: demoUuid(91, 6),
    code: 'MBA/CPC/2025',
    name: 'Consumer Protection Code for Retail Financial Services',
    category: 'Consumer Protection',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Consumer & Market Conduct',
    version: '1.0',
    publishedDate: iso(2025, 3, 15),
    effectiveDate: iso(2025, 7, 1),
    status: 'Active',
    description:
      'Complaint handling timelines, fee and charge disclosure, and fair treatment of retail customers. Feeds the §9.6 Consumer Protection specialist domain (Phase 4C). Complaint volumes in the demo dataset are fictional.',
    applicableCategories: ['Commercial Bank', 'Merchant Bank', 'Payment Service Bank', 'Savings & Loans Bank', 'Microfinance Bank', 'Regional Bank', 'Non-Interest Bank'],
    domains: ['consumer-protection'],
    sourceDocuments: [
      {
        id: demoUuid(95, 107),
        name: 'MBA-Consumer-Protection-Code-2025.pdf',
        version: '1.0',
        uploadedAt: isoDateTime(-250, 10),
        uploadedByName: 'Lerato Mokoena',
        sizeKb: 990,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [{ version: '1.0', effectiveFrom: iso(2025, 7, 1), changeSummary: 'Initial publication.', approvedByName: 'Amara Osei', approvedAt: isoDateTime(-250, 12) }],
    mappings: [relationFor('obligation', 'OBL-2026-007', 'Quarterly consumer complaint report')],
    ownerName: 'Lerato Mokoena',
    lastReviewedAt: isoDay(-90),
  },
  {
    id: demoUuid(91, 7),
    code: 'MBA/NIB/2023',
    name: 'Prudential & Sharia Governance Standards for Non-Interest Banks',
    category: 'Non-Interest Banking',
    jurisdictionCode: 'MBA/UFC',
    jurisdictionName: 'Meridia Banking Authority / Unity Financial Commission (joint)',
    issuingAuthority: 'MBA — Non-Interest Banking Supervision (jointly with the Unity Financial Commission)',
    version: '1.1',
    publishedDate: iso(2023, 6, 1),
    effectiveDate: iso(2023, 10, 1),
    status: 'Active',
    description:
      'Shariah governance, investment account holder risk disclosure and non-interest prudential treatment. Primary framework for Unity Non-Interest Bank in the demo dataset.',
    applicableCategories: ['Non-Interest Bank'],
    domains: ['governance', 'prudential'],
    sourceDocuments: [
      {
        id: demoUuid(95, 108),
        name: 'MBA-NIB-Standards-2023.pdf',
        version: '1.1',
        uploadedAt: isoDateTime(-880, 9),
        uploadedByName: 'Lerato Mokoena',
        sizeKb: 1120,
        confidentiality: 'Public',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [
      { version: '1.0', effectiveFrom: iso(2023, 10, 1), changeSummary: 'Initial joint publication.' },
      { version: '1.1', effectiveFrom: iso(2025, 10, 1), changeSummary: 'Shariah board minutes documentation standard strengthened (demo).', approvedByName: 'Lerato Mokoena', approvedAt: isoDateTime(-410, 11) },
    ],
    mappings: [
      relationFor('examination-procedure', 'MBA/NIB/2023 §4.4', 'Shariah governance (examination library mapping)'),
      relationFor('obligation', 'OBL-2026-012', 'Semi-annual Sharia compliance certification'),
      relationFor('finding', 'FND-2026-118', 'Unity Shariah board minutes incomplete'),
    ],
    ownerName: 'Lerato Mokoena',
    lastReviewedAt: isoDay(-30),
  },
  {
    id: demoUuid(91, 8),
    code: 'MBA/PSB/2026',
    name: 'Payment Service Bank Prudential & Operations Regulation (Consultation Draft)',
    category: 'Payments',
    jurisdictionCode: MBA.code,
    jurisdictionName: MBA.name,
    issuingAuthority: 'Meridia Banking Authority — Banking Supervision Department',
    version: '0.9 (consultation draft)',
    publishedDate: isoDay(-21),
    effectiveDate: iso(2027, 1, 1),
    status: 'Under Consultation',
    description:
      'Proposed dedicated rulebook for payment service banks: agent network controls, float and trust account reconciliation, API security. Uploaded as a simulated document with a Demo AI extraction pass — extracted requirements are drafts awaiting analyst review, NOT approved regulatory content (Spec §10.1).',
    applicableCategories: ['Payment Service Bank'],
    domains: ['prudential', 'operations', 'consumer-protection'],
    sourceDocuments: [
      {
        id: demoUuid(95, 109),
        name: 'MBA-PSB-Consultation-Draft-0.9.pdf',
        version: '0.9',
        uploadedAt: isoDateTime(-21, 14, 30),
        uploadedByName: 'Samuel Ike',
        sizeKb: 860,
        confidentiality: 'Internal',
        storageNote: ATTACHMENT_NOTE,
      },
    ],
    versions: [{ version: '0.9', effectiveFrom: isoDay(-21), changeSummary: 'Consultation draft published; AI extraction run in the prototype session (demo).' }],
    mappings: [relationFor('examination-procedure', 'MBA/OPS/2026 §2.1', 'Operational resilience (examination library mapping)')],
    ownerName: 'Samuel Ike',
    lastReviewedAt: isoDay(-21),
  },
]

export const FRAMEWORK_ID_BY_CODE: Record<string, string> = Object.fromEntries(
  REGULATORY_FRAMEWORKS.map((f) => [f.code, f.id]),
)

// ---------------------------------------------------------------------------
// Requirements (Spec §10.1 requirement detail)
// ---------------------------------------------------------------------------

let reqSeq = 0

interface ReqSeed {
  fwCode: string
  reference: string
  title: string
  text: string
  effectiveFrom: string
  effectiveTo?: string
  status?: RegulatoryRequirement['status']
  categories?: string[]
  domain: RegulatoryRequirement['domain']
  evidence: string[]
  procedures: string[]
  obligations?: string[]
  anchors?: Array<[string, string]>
  extractionNote?: string
  approvedBy?: string
  approvedDaysAgo?: number
}

function req(seed: ReqSeed): RegulatoryRequirement {
  reqSeq += 1
  const frameworkId = FRAMEWORK_ID_BY_CODE[seed.fwCode]
  return {
    id: demoUuid(92, reqSeq),
    frameworkId,
    reference: seed.reference,
    title: seed.title,
    text: seed.text,
    legalSource: `${seed.fwCode} ${seed.reference} (fictional demo citation)`,
    effectiveFrom: seed.effectiveFrom,
    effectiveTo: seed.effectiveTo,
    status: seed.status ?? 'Approved',
    institutionCategories: seed.categories ?? DEPOSIT_BANKS,
    domain: seed.domain,
    evidenceExpected: seed.evidence,
    mappedProcedureRefs: seed.procedures,
    relatedObligationRefs: seed.obligations ?? [],
    storyAnchors: (seed.anchors ?? []).map(([ref, label]) => relationFromRef(ref, label)),
    extractionNote: seed.extractionNote,
    approvedAt: seed.approvedBy ? isoDay(-(seed.approvedDaysAgo ?? 400)) : undefined,
    approvedByName: seed.approvedBy,
  }
}

const AI_NOTE =
  'Demo AI response — machine-extracted draft from the simulated document upload. Not approved regulatory content until reviewed (Spec §10.1).'

export const REGULATORY_REQUIREMENTS: RegulatoryRequirement[] = [
  // MBA/PRU/2024 — prudential rulebook
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§3.1',
    title: 'Minimum capital adequacy',
    text: 'A licensed bank must maintain a minimum Capital Adequacy Ratio of 10% (demo threshold) of risk-weighted assets at all times, computed on a consolidated basis. Breaches must be reported to the Authority within two business days (demo standard) with a capital restoration plan.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'prudential',
    evidence: ['Latest MPR-09 capital adequacy return', 'Board-approved capital plan', 'RWA computation workpapers', 'Audit confirmation of capital base'],
    procedures: ['MBA/PRU/2024 §3.1'],
    obligations: ['OBL-2026-001', 'OBL-2026-011'],
    anchors: [
      ['FND-2026-030', 'Vanguard CAR 6.4% vs 10% demo minimum (Critical)'],
      ['EWA-2026-008', 'Vanguard sustained capital breach alert'],
      ['SUB-2026-0143', 'Vanguard October 2026 MPR-09 — rejected'],
      ['ENF-2026-002', 'Enforcement case — licence suspension (Phase 5 label)'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§5.2',
    title: 'Asset classification and provisioning',
    text: 'Credit facilities must be classified per the demo prudential matrix (current / watch / substandard / doubtful / lost) and provisioned to the prescribed minimum coverage. Classification must reflect observed repayment behaviour; re-ageing without cash payment is prohibited.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'prudential',
    evidence: ['QAR-02 asset quality return', 'Loan classification listing', 'Provision computation and GL reconciliation', 'Credit committee minutes'],
    procedures: ['MBA/PRU/2024 §5.2'],
    obligations: ['OBL-2026-003'],
    anchors: [
      ['EWA-2026-013', 'Meridian NPL 6.9% amber alert'],
      ['FND-2026-033', 'Vanguard asset classification misstatement'],
      ['FND-2026-048', 'Delta micro-loan provisioning shortfall'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§7.1',
    title: 'Single obligor and concentration limits',
    text: 'Exposure to a single obligor or connected group must not exceed the demo limit of 20% of the capital base. Related-party facilities require documented board approval with the interested director recused.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'prudential',
    evidence: ['Large exposure schedule (QAR annex)', 'Connected-party register', 'Board approval minutes for related-party facilities'],
    procedures: ['MBA/PRU/2024 §7.1'],
    obligations: ['OBL-2026-003'],
    anchors: [['FND-2026-031', 'Vanguard insider loan concentrations (Critical)']],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§9.1',
    title: 'Liquidity coverage and limits',
    text: 'A licensed bank must hold high-quality liquid assets covering at least 100% of 30-day net cash outflows under the demo stress calibration (LCR ≥ 100%), reported monthly via MPR-04. Sustained readings below 110% (demo watch level) trigger supervisory engagement.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'prudential',
    evidence: ['MPR-04 liquidity return', 'HQLA custody statements', 'Cash-flow ladder workpapers', 'ALCO minutes'],
    procedures: ['MBA/PRU/2024 §9.1'],
    obligations: ['OBL-2026-002'],
    anchors: [
      ['EWA-2026-011', 'Northstar LCR 104.2% amber alert'],
      ['SUB-2026-0144', 'Northstar October 2026 MPR-04 — in review'],
      ['EXM-2026-024', 'Targeted liquidity examination — Northstar'],
      ['FND-2026-087', 'Northstar liquidity reporting delays'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§9.4',
    title: 'Contingency funding plan testing',
    text: 'The contingency funding plan must be stress-tested at least quarterly (demo standard) with results reported to ALCO and the board risk committee, including trigger calibration and remediation options.',
    effectiveFrom: iso(2023, 4, 1),
    domain: 'prudential',
    evidence: ['Quarterly CFP test report', 'ALCO and board risk committee minutes', 'Stress scenario documentation'],
    procedures: ['MBA/PRU/2024 §9.4'],
    obligations: ['OBL-2026-010'],
    anchors: [['FND-2026-035', 'Vanguard liquidity contingency plan untested']],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 940,
  }),
  // MBA/PRU/2021 — superseded legacy rule
  req({
    fwCode: 'MBA/PRU/2021',
    reference: '§4.2',
    title: 'Legacy capital adequacy rule (superseded)',
    text: 'Superseded minimum capital rule retained for historical mappings; replaced by MBA/PRU/2024 §3.1 with effect from 1 Apr 2024 (demo).',
    effectiveFrom: iso(2021, 4, 1),
    effectiveTo: iso(2024, 3, 31),
    status: 'Superseded',
    domain: 'prudential',
    evidence: ['Historical capital returns (pre-2024)'],
    procedures: ['MBA/PRU/2021 §4.2'],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 1600,
  }),
  // MBA/AML/2023 — financial crime rulebook
  req({
    fwCode: 'MBA/AML/2023',
    reference: '§4.1',
    title: 'Customer due diligence',
    text: 'Institutions must perform risk-based customer due diligence at onboarding and refresh high-risk customer profiles at least annually (demo cycle). Backlogs must be tracked and reported to the compliance committee.',
    effectiveFrom: iso(2023, 7, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'aml',
    evidence: ['CDD refresh population and completion report', 'High-risk customer register', 'Compliance committee minutes'],
    procedures: ['MBA/AML/2023 §4.1'],
    obligations: ['OBL-2026-005'],
    anchors: [
      ['FND-2026-107', 'Meridian CDD refresh backlog — 2,300 high-risk customers (demo figure)'],
      ['FND-2025-077', 'Meridian historic KYC backlog (closed 2025)'],
    ],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 500,
  }),
  req({
    fwCode: 'MBA/AML/2023',
    reference: '§6.3',
    title: 'Transaction monitoring obligations',
    text: 'Automated transaction monitoring rules must cover the institution\'s full product set, including structured deposits below reporting thresholds. Rule calibration must be reviewed at least semi-annually (demo standard) with unreported suspicious patterns escalated.',
    effectiveFrom: iso(2023, 7, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'aml',
    evidence: ['Monitoring rule inventory and calibration logs', 'Alert-to-STR conversion statistics', 'Below-threshold structuring analysis', 'Rule change governance records'],
    procedures: ['MBA/AML/2023 §6.3'],
    obligations: ['OBL-2026-004', 'OBL-2026-006'],
    anchors: [
      ['EXM-2026-014', 'Meridian AML/CFT targeted examination (in fieldwork)'],
      ['FND-2026-101', 'Meridian AML transaction monitoring gaps — 14 unreported patterns (demo sample)'],
      ['CAP-2026-003', 'Meridian AML corrective action plan (overdue)'],
      ['DIR-2026-004', 'Corrective directive: AML remediation (Phase 5 label)'],
    ],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 500,
  }),
  req({
    fwCode: 'MBA/AML/2023',
    reference: '§2.2 (2024 amendment)',
    title: 'Suspicious transaction reporting',
    text: 'Suspicious transactions must be reported to the Financial Intelligence Unit within 24 hours of identification (demo deadline), with a documented escalation trail from alert to filing decision.',
    effectiveFrom: iso(2024, 9, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'aml',
    evidence: ['STR filing log with timestamps', 'Escalation decision records', 'FIU acknowledgements'],
    procedures: ['MBA/AML/2024 §2.2'],
    obligations: ['OBL-2026-004'],
    anchors: [['FND-2026-101', 'Meridian AML transaction monitoring gaps']],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 440,
  }),
  req({
    fwCode: 'MBA/AML/2023',
    reference: '§5.1',
    title: 'Risk-based customer classification',
    text: 'Customers must be assigned a documented money-laundering risk classification at onboarding, reviewed on trigger events, and used to differentiate due-diligence depth (demo standard).',
    effectiveFrom: iso(2023, 7, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'aml',
    evidence: ['Risk classification methodology', 'Sampled customer risk profiles', 'Trigger-event review log'],
    procedures: ['MBA/AML/2023 §4.1'],
    obligations: ['OBL-2026-005'],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 500,
  }),
  // MBA/GOV/2024 — governance code
  req({
    fwCode: 'MBA/GOV/2024',
    reference: '§2.1',
    title: 'Board composition and tenure',
    text: 'The board must include at least three independent non-executive directors (demo minimum), with tenure limits and an annual board evaluation reported to the Authority.',
    effectiveFrom: iso(2024, 6, 1),
    domain: 'governance',
    evidence: ['Board register and independence declarations', 'Annual board evaluation report', 'AGM resolutions'],
    procedures: ['MBA/GOV/2024 §2.1'],
    anchors: [['EXM-2026-021', 'Planned governance examination — Unity Non-Interest Bank']],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 520,
  }),
  req({
    fwCode: 'MBA/GOV/2024',
    reference: '§3.2',
    title: 'Board risk committee reporting timeliness',
    text: 'Management must deliver the quarterly risk report to the board risk committee within 30 days of quarter end (demo standard), with evidence of board challenge recorded in the minutes.',
    effectiveFrom: iso(2025, 6, 1),
    domain: 'governance',
    evidence: ['Quarterly risk reports with distribution dates', 'Board risk committee minutes evidencing challenge'],
    procedures: ['MBA/GOV/2024 §2.1'],
    obligations: ['OBL-2026-008'],
    anchors: [
      ['FND-2026-109', 'Meridian board risk reporting delivered late (two occasions, demo)'],
      ['FND-2026-037', 'Vanguard board oversight failures — no challenge of capital projections'],
    ],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 165,
  }),
  req({
    fwCode: 'MBA/GOV/2024',
    reference: '§4.1',
    title: 'Fit-and-proper assessment',
    text: 'Directors and key officers must pass a fit-and-proper assessment before appointment and on a biennial refresh (demo cycle); the register of assessments must be maintained and available for inspection.',
    effectiveFrom: iso(2024, 6, 1),
    domain: 'governance',
    evidence: ['Fit-and-proper register', 'Assessment questionnaires and declarations', 'Appointment approval records'],
    procedures: ['MBA/GOV/2024 §2.1'],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 520,
  }),
  // MBA/CYB/2025 — cyber resilience
  req({
    fwCode: 'MBA/CYB/2025',
    reference: '§3.1',
    title: 'Technology risk management',
    text: 'Institutions must maintain a technology risk management framework with annual independent assessment, a documented risk register and board-level reporting (demo standard).',
    effectiveFrom: iso(2025, 4, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'cybersecurity',
    evidence: ['Technology risk framework document', 'Latest independent assessment report', 'Technology risk register', 'Board technology risk report'],
    procedures: ['MBA/CYB/2025 §3.1'],
    anchors: [['EXM-2026-005', 'Crestline cybersecurity examination']],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 220,
  }),
  req({
    fwCode: 'MBA/CYB/2025',
    reference: '§5.2',
    title: 'Third-party and outsourcing risk',
    text: 'A current register of all material technology third parties (including payment aggregators and API providers) must be maintained with due-diligence records, concentration analysis and exit plans; onboarding must complete before production integration (demo standard).',
    effectiveFrom: iso(2025, 4, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'cybersecurity',
    evidence: ['Third-party risk register with integration dates', 'Due-diligence and security assessment files', 'Concentration and exit-plan analysis'],
    procedures: ['MBA/CYB/2025 §5.2'],
    obligations: ['OBL-2026-009'],
    anchors: [
      ['FND-2026-066', 'Crestline third-party risk register missing two payment aggregators'],
      ['CAP-2026-008', 'Crestline technology remediation action'],
      ['FND-2026-062', 'Crestline agent network onboarding controls'],
    ],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 220,
  }),
  req({
    fwCode: 'MBA/CYB/2025',
    reference: '§6.1',
    title: 'Cyber incident notification',
    text: 'Material cyber incidents must be notified to the Authority within 48 hours of detection (demo deadline) using the prescribed incident form, with a full incident report within 10 business days.',
    effectiveFrom: iso(2025, 4, 1),
    categories: ALL_BANK_CATEGORIES,
    domain: 'cybersecurity',
    evidence: ['Incident notification log with timestamps', 'Incident response playbooks', 'Post-incident review reports'],
    procedures: ['MBA/CYB/2025 §3.1'],
    obligations: ['OBL-2026-009'],
    approvedBy: 'Tunde Bakare',
    approvedDaysAgo: 220,
  }),
  // MBA/CPC/2025 — consumer protection
  req({
    fwCode: 'MBA/CPC/2025',
    reference: '§2.1',
    title: 'Complaint handling timelines',
    text: 'Retail customer complaints must be acknowledged within one business day and resolved within five business days (demo standards), with root-cause analysis reported quarterly.',
    effectiveFrom: iso(2025, 7, 1),
    domain: 'consumer-protection',
    evidence: ['Complaint register with acknowledgement/resolution timestamps', 'Root-cause analysis reports', 'Quarterly complaint report (OBL-2026-007)'],
    procedures: [],
    obligations: ['OBL-2026-007'],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 140,
  }),
  req({
    fwCode: 'MBA/CPC/2025',
    reference: '§3.1',
    title: 'Fee and charge disclosure',
    text: 'All fees and charges must be disclosed in the standard demo tariff format at account opening and on the public website; changes require 30 days\' advance notice to affected customers.',
    effectiveFrom: iso(2025, 7, 1),
    domain: 'consumer-protection',
    evidence: ['Published tariff schedules', 'Account-opening disclosure samples', 'Customer change-notification evidence'],
    procedures: [],
    obligations: ['OBL-2026-007'],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 140,
  }),
  req({
    fwCode: 'MBA/CPC/2025',
    reference: '§4.2',
    title: 'Fair treatment and product transparency',
    text: 'Product terms must be presented in plain language with a standard demo key-facts statement; suitability assessment is required for credit and investment-linked retail products.',
    effectiveFrom: iso(2025, 7, 1),
    domain: 'consumer-protection',
    evidence: ['Key-facts statement samples', 'Suitability assessment records', 'Marketing material approval log'],
    procedures: [],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 140,
  }),
  // MBA/NIB/2023 — non-interest banking
  req({
    fwCode: 'MBA/NIB/2023',
    reference: '§4.4',
    title: 'Shariah governance',
    text: 'The Shariah board must document the rationale for every product and investment-account approval in signed minutes; the register of resolutions must be complete and available for supervisory inspection (demo standard).',
    effectiveFrom: iso(2023, 10, 1),
    categories: ['Non-Interest Bank'],
    domain: 'governance',
    evidence: ['Shariah board minutes register', 'Product approval resolutions', 'Independent Shariah audit report'],
    procedures: ['MBA/NIB/2023 §4.4'],
    obligations: ['OBL-2026-012'],
    anchors: [
      ['FND-2026-118', 'Unity Shariah board minutes incomplete for two product approvals'],
      ['EXM-2026-021', 'Planned governance examination — Unity Non-Interest Bank'],
    ],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 400,
  }),
  req({
    fwCode: 'MBA/NIB/2023',
    reference: '§3.2',
    title: 'Investment account risk disclosure',
    text: 'Investment account holders must receive a documented profit-displacement and risk-sharing disclosure at onboarding and on any change to the profit-sharing methodology (demo standard).',
    effectiveFrom: iso(2023, 10, 1),
    categories: ['Non-Interest Bank'],
    domain: 'consumer-protection',
    evidence: ['Disclosure templates and signed acknowledgements', 'Profit-sharing methodology change log'],
    procedures: ['MBA/NIB/2023 §4.4'],
    obligations: ['OBL-2026-012'],
    approvedBy: 'Lerato Mokoena',
    approvedDaysAgo: 400,
  }),
  // MBA/PSB/2026 — AI-extracted consultation drafts (Spec §10.1 distinction)
  req({
    fwCode: 'MBA/PSB/2026',
    reference: '§2.3 (draft)',
    title: 'Agent network onboarding controls [AI-extracted draft]',
    text: 'Draft: payment service banks must complete documented background checks and training certification for all agents before onboarding, with a central agent register maintained for supervisory inspection. (Demo threshold language subject to consultation.)',
    effectiveFrom: iso(2027, 1, 1),
    status: 'AI-Extracted Draft',
    categories: ['Payment Service Bank'],
    domain: 'operations',
    evidence: ['Agent register extract', 'Background check completion log', 'Training certification records'],
    procedures: ['MBA/OPS/2026 §2.1'],
    anchors: [['FND-2026-062', 'Crestline agent onboarding control gaps (12% demo sample)']],
    extractionNote: AI_NOTE,
  }),
  req({
    fwCode: 'MBA/PSB/2026',
    reference: '§3.1 (draft)',
    title: 'Float and trust account reconciliation [AI-extracted draft]',
    text: 'Draft: daily reconciliation of agent float and customer trust accounts with independent custody confirmation; unreconciled differences above the demo materiality threshold must be escalated same-day.',
    effectiveFrom: iso(2027, 1, 1),
    status: 'AI-Extracted Draft',
    categories: ['Payment Service Bank'],
    domain: 'prudential',
    evidence: ['Daily reconciliation packs', 'Custodian confirmation statements', 'Escalation log for unreconciled differences'],
    procedures: [],
    extractionNote: AI_NOTE,
  }),
  req({
    fwCode: 'MBA/PSB/2026',
    reference: '§4.2 (draft)',
    title: 'API security and third-party aggregators [AI-extracted draft]',
    text: 'Draft: open-API endpoints must be covered by the third-party risk register with annual penetration testing and 48-hour incident notification, aligned to MBA/CYB/2025 §5.2 and §6.1.',
    effectiveFrom: iso(2027, 1, 1),
    status: 'AI-Extracted Draft',
    categories: ['Payment Service Bank'],
    domain: 'cybersecurity',
    evidence: ['API inventory mapped to the third-party register', 'Penetration test reports', 'Incident notification drill records'],
    procedures: ['MBA/CYB/2025 §5.2'],
    anchors: [['FND-2026-066', 'Crestline API third-party risk register outdated']],
    extractionNote: AI_NOTE,
  }),
  // Phase 4B — ERM rulebook requirements (Spec §9.2 reuse of the §10 layer).
  // Appended at the end so existing requirement ids (demoUuid sequence) never
  // shift; the ERM specialist domain filters REGULATORY_REQUIREMENTS by
  // domain 'erm' and cites these references from its checklist templates.
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§2.1',
    title: 'Enterprise risk management framework',
    text: 'A licensed bank must maintain a board-approved enterprise risk management framework covering all material risk types, operating a documented three-lines model, with an independent review of the framework at least annually (demo standard) reported to the Authority.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'erm',
    evidence: ['ERM framework document with board approval', 'Risk governance structure chart', 'Annual independent review report', 'Enterprise risk register'],
    procedures: [],
    anchors: [
      ['EXM-2026-024', 'Targeted liquidity examination — Northstar (ERM review context)'],
      ['FND-2026-091', 'Northstar treasury mandate limit breaches not escalated'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§2.4',
    title: 'Risk appetite and limit framework',
    text: 'The board must approve a quantified risk appetite statement with early-warning thresholds cascaded to business limits. Appetite or limit breaches must be escalated to ALCO and the board risk committee within 24 hours (demo standard) with recorded remediation.',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'erm',
    evidence: ['Risk appetite statement', 'Limit framework and cascade evidence', 'Breach log with escalation timestamps', 'ALCO and board risk committee minutes'],
    procedures: [],
    anchors: [
      ['FND-2026-091', 'Northstar treasury limit breaches not escalated within the demo 24-hour standard'],
      ['EWA-2026-011', 'Northstar LCR 104.2% amber alert — appetite early-warning threshold'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
  req({
    fwCode: 'MBA/PRU/2024',
    reference: '§10.2',
    title: 'Stress-testing governance',
    text: 'Institutions must run a board-approved annual stress-testing programme including reverse stress tests, with results feeding capital planning and the contingency funding plan; scenario documentation and outcomes must be retained for supervisory inspection (demo standard).',
    effectiveFrom: iso(2024, 4, 1),
    domain: 'erm',
    evidence: ['Board-approved scenario suite', 'Reverse stress test outputs', 'Stress results pack with ALCO/board minutes'],
    procedures: ['MBA/PRU/2024 §9.4'],
    anchors: [
      ['FND-2026-035', 'Vanguard liquidity contingency plan untested for four quarters'],
      ['EXM-2026-012', 'Comprehensive examination — Vanguard Regional Bank'],
    ],
    approvedBy: 'Amara Osei',
    approvedDaysAgo: 580,
  }),
]

// ---------------------------------------------------------------------------
// Obligations (Spec §10.2)
// ---------------------------------------------------------------------------

let oblSeq = 0

interface OblSeed {
  reference: string
  title: string
  description: string
  fwCode: string
  requirementRefs: string[]
  institutions: Array<keyof typeof INST_IDS>
  department: string
  effectiveFrom: string
  frequency: RegulatoryObligation['frequency']
  evidenceRequirement: string
  returnCode?: string
  lastReviewDaysAgo: number
  nextReviewInDays: number
  reviewOwnerName: string
  statuses: Array<{
    inst: keyof typeof INST_IDS
    status: RegulatoryObligation['institutionStatus'][number]['status']
    verifiedDaysAgo?: number
    note?: string
    anchors?: Array<[string, string]>
  }>
  history?: Array<{ daysAgo: number; byName: string; change: string; reason: string }>
}

function obl(seed: OblSeed): RegulatoryObligation {
  oblSeq += 1
  const institutionStatus = seed.institutions.map((key) => {
    const s = seed.statuses.find((x) => x.inst === key)
    return {
      institutionId: INST_IDS[key],
      status: s?.status ?? 'Not Assessed',
      lastVerifiedAt: s?.verifiedDaysAgo !== undefined ? isoDay(-s.verifiedDaysAgo) : undefined,
      note: s?.note,
      anchors: (s?.anchors ?? []).map(([ref, label]) => relationFromRef(ref, label)),
    }
  })
  const history: ObligationChangeEntry[] = (seed.history ?? []).map((h, i) => ({
    id: demoUuid(96, oblSeq * 10 + i),
    at: isoDateTime(-h.daysAgo, 10 + i),
    byName: h.byName,
    change: h.change,
    reason: h.reason,
  }))
  return {
    id: demoUuid(93, oblSeq),
    reference: seed.reference,
    title: seed.title,
    description: seed.description,
    frameworkId: FRAMEWORK_ID_BY_CODE[seed.fwCode],
    requirementRefs: seed.requirementRefs,
    applicableInstitutionIds: seed.institutions.map((k) => INST_IDS[k]),
    responsibleDepartment: seed.department,
    effectiveFrom: seed.effectiveFrom,
    frequency: seed.frequency,
    evidenceRequirement: seed.evidenceRequirement,
    returnCode: seed.returnCode,
    lastReviewDate: isoDay(-seed.lastReviewDaysAgo),
    nextReviewDate: isoDay(seed.nextReviewInDays),
    reviewOwnerName: seed.reviewOwnerName,
    institutionStatus,
    changeHistory: [
      {
        id: demoUuid(96, oblSeq * 10 + 9),
        at: isoDateTime(-seed.lastReviewDaysAgo, 9),
        byName: seed.reviewOwnerName,
        change: 'Obligation register entry created from framework requirements (demo).',
        reason: 'Phase 4A register seeding',
      },
      ...history,
    ],
  }
}

export const REGULATORY_OBLIGATIONS: RegulatoryObligation[] = [
  obl({
    reference: 'OBL-2026-001',
    title: 'Monthly capital adequacy return (MPR-09)',
    description: 'Submit the MPR-09 monthly prudential return evidencing compliance with the 10% demo CAR minimum (MBA/PRU/2024 §3.1), with board-approved capital plan attachments on breach.',
    fwCode: 'MBA/PRU/2024',
    requirementRefs: ['§3.1'],
    institutions: ['meridian', 'northstar', 'unity', 'vanguard'],
    department: 'Prudential Supervision',
    effectiveFrom: iso(2024, 4, 1),
    frequency: 'Monthly',
    evidenceRequirement: 'MPR-09 return accepted by the Authority',
    returnCode: 'MPR-09',
    lastReviewDaysAgo: 25,
    nextReviewInDays: 5,
    reviewOwnerName: 'Fatima Bello',
    statuses: [
      { inst: 'meridian', status: 'Partial', verifiedDaysAgo: 3, note: 'October 2026 MPR-09 overdue (SUB-2026-0141); chase outstanding via My Work.', anchors: [['SUB-2026-0141', 'Meridian October MPR-09 — overdue']] },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 4 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 5 },
      {
        inst: 'vanguard', status: 'Non-Compliant', verifiedDaysAgo: 6,
        note: 'October 2026 MPR-09 rejected — CAR 6.4% vs 10% demo minimum; capital restoration plan required under OBL-2026-011; enforcement ENF-2026-002 open.',
        anchors: [
          ['SUB-2026-0143', 'Vanguard October MPR-09 — rejected'],
          ['EWA-2026-008', 'Sustained capital breach alert'],
          ['FND-2026-030', 'CAR below regulatory minimum (Critical)'],
          ['ENF-2026-002', 'Enforcement case — licence suspension'],
        ],
      },
    ],
    history: [
      { daysAgo: 12, byName: 'Fatima Bello', change: 'Vanguard status moved Compliant → Non-Compliant.', reason: 'MPR-09 October 2026 rejected on CAR breach and reconciliation error (demo).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-002',
    title: 'Monthly liquidity return (MPR-04)',
    description: 'Submit the MPR-04 monthly liquidity return evidencing LCR ≥ 100% under the demo stress calibration (MBA/PRU/2024 §9.1); readings below the 110% demo watch level trigger supervisory engagement.',
    fwCode: 'MBA/PRU/2024',
    requirementRefs: ['§9.1'],
    institutions: ['meridian', 'northstar', 'vanguard'],
    department: 'Prudential Supervision',
    effectiveFrom: iso(2024, 4, 1),
    frequency: 'Monthly',
    evidenceRequirement: 'MPR-04 return accepted by the Authority',
    returnCode: 'MPR-04',
    lastReviewDaysAgo: 18,
    nextReviewInDays: 12,
    reviewOwnerName: 'Fatima Bello',
    statuses: [
      { inst: 'meridian', status: 'Compliant', verifiedDaysAgo: 8 },
      {
        inst: 'northstar', status: 'Partial', verifiedDaysAgo: 4,
        note: 'October MPR-04 in review — LCR 104.2% below the 110% demo watch level; surveillance exception EXC-2026-011 raised; targeted examination EXM-2026-024 scheduled.',
        anchors: [
          ['SUB-2026-0144', 'Northstar October MPR-04 — in review'],
          ['EWA-2026-011', 'Northstar LCR amber alert'],
          ['EXM-2026-024', 'Targeted liquidity examination'],
          ['FND-2026-087', 'Liquidity reporting delays'],
        ],
      },
      { inst: 'vanguard', status: 'Compliant', verifiedDaysAgo: 9 },
    ],
    history: [
      { daysAgo: 4, byName: 'Fatima Bello', change: 'Northstar status moved Compliant → Partial; EXC-2026-011 recorded.', reason: 'LCR 104.2% amber reading on SUB-2026-0144 (demo).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-003',
    title: 'Quarterly asset quality return (QAR-02)',
    description: 'Submit the QAR-02 quarterly asset quality return evidencing classification and provisioning compliance (MBA/PRU/2024 §5.2, §7.1), including large-exposure and connected-party annexes.',
    fwCode: 'MBA/PRU/2024',
    requirementRefs: ['§5.2', '§7.1'],
    institutions: ['meridian', 'northstar', 'unity', 'vanguard', 'delta'],
    department: 'Prudential Supervision',
    effectiveFrom: iso(2024, 4, 1),
    frequency: 'Quarterly',
    evidenceRequirement: 'QAR-02 return accepted by the Authority',
    returnCode: 'QAR-02',
    lastReviewDaysAgo: 30,
    nextReviewInDays: -6,
    reviewOwnerName: 'Fatima Bello',
    statuses: [
      {
        inst: 'meridian', status: 'Partial', verifiedDaysAgo: 12,
        note: 'Q3 2026 QAR-02 accepted with warnings — NPL 6.9% above the 5% demo watch level (EWA-2026-013).',
        anchors: [['SUB-2026-0145', 'Meridian Q3 QAR-02 — accepted'], ['EWA-2026-013', 'Meridian NPL amber alert']],
      },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 15 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 15 },
      {
        inst: 'vanguard', status: 'Non-Compliant', verifiedDaysAgo: 20,
        note: 'Asset classification misstatement (re-aged facilities, 4.1% of demo loan book) and insider concentrations under enforcement.',
        anchors: [['FND-2026-033', 'Asset classification misstatement'], ['FND-2026-031', 'Insider loan concentrations'], ['ENF-2026-002', 'Enforcement case']],
      },
      {
        inst: 'delta', status: 'Partial', verifiedDaysAgo: 22,
        note: 'Provision coverage on PAR-30 buckets below the demo 100% standard (FND-2026-048).',
        anchors: [['FND-2026-048', 'Micro-loan provisioning shortfall'], ['EXM-2026-017', 'Delta targeted credit examination']],
      },
    ],
  }),
  obl({
    reference: 'OBL-2026-004',
    title: 'Suspicious transaction reporting within 24 hours',
    description: 'Report suspicious transactions to the FIU within 24 hours of identification (MBA/AML/2023 §2.2, 2024 amendment) with a complete alert-to-filing escalation trail.',
    fwCode: 'MBA/AML/2023',
    requirementRefs: ['§2.2 (2024 amendment)', '§6.3'],
    institutions: ['meridian', 'northstar', 'unity', 'crestline', 'aurora', 'delta', 'sentinel', 'vanguard'],
    department: 'Financial Crime Compliance',
    effectiveFrom: iso(2024, 9, 1),
    frequency: 'Event-Driven',
    evidenceRequirement: 'STR filing log with FIU acknowledgements; monitoring rule inventory',
    lastReviewDaysAgo: 14,
    nextReviewInDays: 16,
    reviewOwnerName: 'Hauwa Sadiq',
    statuses: [
      {
        inst: 'meridian', status: 'Non-Compliant', verifiedDaysAgo: 20,
        note: 'Transaction monitoring rules missed structured deposits below the demo threshold — 14 suspicious patterns unreported in the sample period; remediation CAP-2026-003 overdue; corrective directive DIR-2026-004 open.',
        anchors: [
          ['FND-2026-101', 'AML transaction monitoring gaps (High)'],
          ['CAP-2026-003', 'AML corrective action plan — overdue'],
          ['EXM-2026-014', 'AML/CFT targeted examination'],
          ['DIR-2026-004', 'Corrective directive: AML remediation'],
        ],
      },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 25 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 25 },
      { inst: 'crestline', status: 'Compliant', verifiedDaysAgo: 30 },
      { inst: 'aurora', status: 'Not Assessed' },
      { inst: 'delta', status: 'Compliant', verifiedDaysAgo: 35 },
      { inst: 'sentinel', status: 'Not Assessed' },
      { inst: 'vanguard', status: 'Not Assessed', note: 'Assessment suspended pending enforcement outcome ENF-2026-002 (demo).', anchors: [['ENF-2026-002', 'Enforcement case']] },
    ],
    history: [
      { daysAgo: 20, byName: 'Hauwa Sadiq', change: 'Meridian status moved Partial → Non-Compliant.', reason: 'EXM-2026-014 fieldwork confirmed 14 unreported suspicious patterns (demo sample).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-005',
    title: 'Periodic CDD refresh for high-risk customers',
    description: 'Refresh customer due diligence for all high-risk customers at least annually (MBA/AML/2023 §4.1, §5.1) and report backlog position to the compliance committee.',
    fwCode: 'MBA/AML/2023',
    requirementRefs: ['§4.1', '§5.1'],
    institutions: ['meridian', 'northstar', 'unity', 'crestline', 'delta', 'vanguard'],
    department: 'Financial Crime Compliance',
    effectiveFrom: iso(2023, 7, 1),
    frequency: 'Annual',
    evidenceRequirement: 'CDD refresh completion report with population reconciliation',
    lastReviewDaysAgo: 40,
    nextReviewInDays: 50,
    reviewOwnerName: 'Hauwa Sadiq',
    statuses: [
      {
        inst: 'meridian', status: 'Partial', verifiedDaysAgo: 21,
        note: 'Periodic refresh overdue for 2,300 high-risk customers (demo figure); backlog tracked under FND-2026-107.',
        anchors: [['FND-2026-107', 'CDD refresh backlog (High)'], ['FND-2025-077', 'Historic KYC backlog — closed 2025']],
      },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 30 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 45 },
      { inst: 'crestline', status: 'Compliant', verifiedDaysAgo: 45 },
      { inst: 'delta', status: 'Partial', verifiedDaysAgo: 50, note: 'Rural customer segment refresh at 82% (demo figure).', anchors: [] },
      { inst: 'vanguard', status: 'Not Assessed', note: 'Suspended pending enforcement outcome (demo).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-006',
    title: 'Annual AML compliance report and independent audit',
    description: 'File the annual AML/CFT compliance report with an independent audit opinion on monitoring controls (MBA/AML/2023 §6.3) by 31 March each year (demo deadline).',
    fwCode: 'MBA/AML/2023',
    requirementRefs: ['§6.3'],
    institutions: ['meridian', 'northstar', 'unity', 'crestline', 'aurora', 'delta', 'sentinel', 'vanguard'],
    department: 'Financial Crime Compliance',
    effectiveFrom: iso(2023, 7, 1),
    frequency: 'Annual',
    evidenceRequirement: 'Signed compliance report + independent audit opinion',
    lastReviewDaysAgo: 220,
    nextReviewInDays: 130,
    reviewOwnerName: 'Hauwa Sadiq',
    statuses: [
      { inst: 'meridian', status: 'Partial', verifiedDaysAgo: 21, note: '2026 filing accepted with qualifications pending CAP-2026-003 completion.', anchors: [['CAP-2026-003', 'AML corrective action plan']] },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 200 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 200 },
      { inst: 'crestline', status: 'Compliant', verifiedDaysAgo: 195 },
      { inst: 'aurora', status: 'Compliant', verifiedDaysAgo: 190 },
      { inst: 'delta', status: 'Compliant', verifiedDaysAgo: 190 },
      { inst: 'sentinel', status: 'Compliant', verifiedDaysAgo: 185 },
      { inst: 'vanguard', status: 'Not Assessed', note: '2026 filing outstanding — institution in restructuring (demo).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-007',
    title: 'Quarterly consumer complaint report',
    description: 'Report retail complaint volumes, resolution timelines against the 5-business-day demo standard and root-cause themes quarterly (MBA/CPC/2025 §2.1, §3.1).',
    fwCode: 'MBA/CPC/2025',
    requirementRefs: ['§2.1', '§3.1'],
    institutions: ['meridian', 'northstar', 'unity', 'crestline', 'aurora', 'delta'],
    department: 'Consumer & Market Conduct',
    effectiveFrom: iso(2025, 7, 1),
    frequency: 'Quarterly',
    evidenceRequirement: 'Complaint register extract + root-cause analysis report',
    lastReviewDaysAgo: 55,
    nextReviewInDays: 35,
    reviewOwnerName: 'Lerato Mokoena',
    statuses: [
      { inst: 'meridian', status: 'Compliant', verifiedDaysAgo: 40 },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 40 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 42 },
      {
        inst: 'crestline', status: 'Partial', verifiedDaysAgo: 35,
        note: 'Q3 2026 report filed late by 6 business days (demo); agent-dispute theme flagged for the §9.6 consumer-protection domain review (Phase 4C).',
        anchors: [['FND-2026-062', 'Agent network onboarding controls']],
      },
      { inst: 'aurora', status: 'Compliant', verifiedDaysAgo: 44 },
      { inst: 'delta', status: 'Not Assessed' },
    ],
  }),
  obl({
    reference: 'OBL-2026-008',
    title: 'Board risk committee reporting within 30 days',
    description: 'Deliver quarterly risk reports to the board risk committee within 30 days of quarter end with documented board challenge (MBA/GOV/2024 §3.2).',
    fwCode: 'MBA/GOV/2024',
    requirementRefs: ['§3.2'],
    institutions: ['meridian', 'northstar', 'unity', 'vanguard'],
    department: 'Governance & Specialised Institutions',
    effectiveFrom: iso(2025, 6, 1),
    frequency: 'Quarterly',
    evidenceRequirement: 'Risk report distribution records + committee minutes',
    lastReviewDaysAgo: 35,
    nextReviewInDays: -3,
    reviewOwnerName: 'Lerato Mokoena',
    statuses: [
      {
        inst: 'meridian', status: 'Partial', verifiedDaysAgo: 4,
        note: 'Q2 and Q3 2026 reports delivered after the 30-day demo standard (FND-2026-109, Low).',
        anchors: [['FND-2026-109', 'Board risk reporting timeliness']],
      },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 10 },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 10 },
      {
        inst: 'vanguard', status: 'Non-Compliant', verifiedDaysAgo: 25,
        note: 'Minutes show no board challenge of management capital projections for three consecutive quarters; escalated under the enforcement file.',
        anchors: [['FND-2026-037', 'Board oversight failures (High)'], ['ENF-2026-002', 'Enforcement case']],
      },
    ],
  }),
  obl({
    reference: 'OBL-2026-009',
    title: 'Cyber incident notification within 48 hours',
    description: 'Notify material cyber incidents within 48 hours and maintain the third-party technology risk register current at all times (MBA/CYB/2025 §6.1, §5.2).',
    fwCode: 'MBA/CYB/2025',
    requirementRefs: ['§6.1', '§5.2'],
    institutions: ['meridian', 'northstar', 'crestline', 'unity'],
    department: 'Technology Risk Supervision',
    effectiveFrom: iso(2025, 4, 1),
    frequency: 'Event-Driven',
    evidenceRequirement: 'Incident notification log + current third-party risk register',
    lastReviewDaysAgo: 16,
    nextReviewInDays: 14,
    reviewOwnerName: 'Kwame Mensah',
    statuses: [
      { inst: 'meridian', status: 'Compliant', verifiedDaysAgo: 18 },
      { inst: 'northstar', status: 'Not Assessed' },
      {
        inst: 'crestline', status: 'Partial', verifiedDaysAgo: 14,
        note: 'Third-party register missing two payment aggregators integrated in Q2 2026 (FND-2026-066); remediation CAP-2026-008 in progress; cybersecurity examination EXM-2026-005 active.',
        anchors: [
          ['FND-2026-066', 'API third-party risk register outdated'],
          ['CAP-2026-008', 'Technology remediation action'],
          ['EXM-2026-005', 'Crestline cybersecurity examination'],
        ],
      },
      { inst: 'unity', status: 'Compliant', verifiedDaysAgo: 20 },
    ],
  }),
  obl({
    reference: 'OBL-2026-010',
    title: 'Quarterly contingency funding plan stress testing',
    description: 'Stress-test the contingency funding plan every quarter and report results to ALCO and the board risk committee (MBA/PRU/2024 §9.4).',
    fwCode: 'MBA/PRU/2024',
    requirementRefs: ['§9.4'],
    institutions: ['meridian', 'northstar', 'vanguard'],
    department: 'Prudential Supervision',
    effectiveFrom: iso(2023, 4, 1),
    frequency: 'Quarterly',
    evidenceRequirement: 'CFP stress-test report + ALCO/board minutes',
    lastReviewDaysAgo: 48,
    nextReviewInDays: 42,
    reviewOwnerName: 'Fatima Bello',
    statuses: [
      { inst: 'meridian', status: 'Compliant', verifiedDaysAgo: 30 },
      { inst: 'northstar', status: 'Compliant', verifiedDaysAgo: 30 },
      {
        inst: 'vanguard', status: 'Non-Compliant', verifiedDaysAgo: 28,
        note: 'CFP not stress-tested in the last four demo quarters (FND-2026-035, High); folded into the capital restoration plan under enforcement.',
        anchors: [['FND-2026-035', 'Liquidity contingency plan untested'], ['ENF-2026-002', 'Enforcement case']],
      },
    ],
  }),
  obl({
    reference: 'OBL-2026-011',
    title: 'Capital restoration plan on CAR breach',
    description: 'On breach of the 10% demo CAR minimum, submit a board-approved capital restoration plan within 10 business days and execute agreed milestones (MBA/PRU/2024 §3.1).',
    fwCode: 'MBA/PRU/2024',
    requirementRefs: ['§3.1'],
    institutions: ['vanguard'],
    department: 'Legal & Enforcement',
    effectiveFrom: iso(2024, 4, 1),
    frequency: 'Event-Driven',
    evidenceRequirement: 'Board-approved restoration plan + milestone execution evidence',
    lastReviewDaysAgo: 8,
    nextReviewInDays: 6,
    reviewOwnerName: 'Zainab Lawal',
    statuses: [
      {
        inst: 'vanguard', status: 'Partial', verifiedDaysAgo: 2,
        note: 'November 2026 resubmission of the restoration plan awaiting review after the SUB-2026-0143 rejection; licence suspended under ENF-2026-002; CAP-2026-007 milestones in progress.',
        anchors: [
          ['SUB-2026-0143', 'October MPR-09 — rejected'],
          ['CAP-2026-007', 'Capital restoration corrective action'],
          ['ENF-2026-002', 'Enforcement case — licence suspension'],
          ['EWA-2026-008', 'Sustained capital breach alert'],
        ],
      },
    ],
    history: [
      { daysAgo: 8, byName: 'Zainab Lawal', change: 'Status moved Non-Compliant → Partial.', reason: 'Restoration plan resubmitted November 2026 (demo).' },
    ],
  }),
  obl({
    reference: 'OBL-2026-012',
    title: 'Semi-annual Sharia compliance certification',
    description: 'File the semi-annual Shariah compliance certification with complete board minutes for every product and investment-account approval (MBA/NIB/2023 §4.4, §3.2).',
    fwCode: 'MBA/NIB/2023',
    requirementRefs: ['§4.4', '§3.2'],
    institutions: ['unity'],
    department: 'Governance & Specialised Institutions',
    effectiveFrom: iso(2023, 10, 1),
    frequency: 'Semi-Annual',
    evidenceRequirement: 'Signed Shariah board certification + minutes register',
    lastReviewDaysAgo: 62,
    nextReviewInDays: 9,
    reviewOwnerName: 'Lerato Mokoena',
    statuses: [
      {
        inst: 'unity', status: 'Partial', verifiedDaysAgo: 3,
        note: 'Two investment-account product approvals lack documented Shariah board rationale (FND-2026-118, Low); governance examination EXM-2026-021 planned.',
        anchors: [['FND-2026-118', 'Shariah board minutes incomplete'], ['EXM-2026-021', 'Planned governance examination']],
      },
    ],
  }),
]

export const OBLIGATION_ID_BY_REF: Record<string, string> = Object.fromEntries(
  REGULATORY_OBLIGATIONS.map((o) => [o.reference, o.id]),
)

// ---------------------------------------------------------------------------
// Correspondence (Spec §10.3)
// ---------------------------------------------------------------------------

let corSeq = 0

interface CorSeed {
  reference: string
  institution: keyof typeof INST_IDS
  type: RegulatoryCorrespondence['type']
  direction: RegulatoryCorrespondence['direction']
  subject: string
  body: string
  date: string
  senderName: string
  senderRole: string
  recipientName: string
  recipientRole: string
  authorisedByName?: string
  authorisedDaysAgo?: number
  status: RegulatoryCorrespondence['status']
  responseDueDate?: string
  attachments?: Array<[string, number, 'Public' | 'Internal' | 'Restricted']>
  relations?: Array<[string, string]>
  thread: Array<{ daysAgo: number; hour?: number; byName: string; action: string; note?: string }>
}

function cor(seed: CorSeed): RegulatoryCorrespondence {
  corSeq += 1
  return {
    id: demoUuid(94, corSeq),
    reference: seed.reference,
    institutionId: INST_IDS[seed.institution],
    type: seed.type,
    direction: seed.direction,
    subject: seed.subject,
    body: seed.body,
    date: seed.date,
    senderName: seed.senderName,
    senderRole: seed.senderRole,
    recipientName: seed.recipientName,
    recipientRole: seed.recipientRole,
    authorisedByName: seed.authorisedByName,
    authorisedAt: seed.authorisedByName ? isoDay(-(seed.authorisedDaysAgo ?? 10)) : undefined,
    status: seed.status,
    responseDueDate: seed.responseDueDate,
    attachments: (seed.attachments ?? []).map(([fileName, sizeKb, confidentiality], i) => ({
      id: demoUuid(96, 100 + corSeq * 10 + i),
      fileName,
      sizeKb,
      confidentiality,
      storageNote: ATTACHMENT_NOTE,
    })),
    relations: (seed.relations ?? []).map(([ref, label]) => relationFromRef(ref, label)),
    thread: seed.thread.map((t, i) => ({
      id: demoUuid(96, 200 + corSeq * 10 + i),
      at: isoDateTime(-t.daysAgo, t.hour ?? 9, 15 + i),
      byName: t.byName,
      action: t.action,
      note: t.note,
    })),
  }
}

export const REGULATORY_CORRESPONDENCE: RegulatoryCorrespondence[] = [
  cor({
    reference: 'COR-2026-001',
    institution: 'meridian',
    type: 'Information Request',
    direction: 'Outgoing',
    subject: 'Request for transaction monitoring rule inventory and STR population data — EXM-2026-014',
    body:
      'Dear Madam/Sir,\n\nIn connection with the AML/CFT targeted examination EXM-2026-014 and corrective directive DIR-2026-004, the Authority requests the following within ten (10) business days:\n\n1. The complete transaction monitoring rule inventory, including calibration parameters and the below-threshold structured-deposit coverage analysis referenced in finding FND-2026-101.\n2. The population of alerts generated in the sample period with alert-to-STR disposition records.\n3. The remediation milestone plan under CAP-2026-003 with evidence of completion to date.\n\nAll data exchanged is fictional demo content for prototype purposes.\n\nYours faithfully,\nHauwa Sadiq\nAML Specialist, Financial Crime Compliance Unit',
    date: isoDay(-55),
    senderName: 'Hauwa Sadiq',
    senderRole: 'AML Specialist',
    recipientName: 'Grace Mbeki',
    recipientRole: 'Head of Regulatory Reporting, Meridian Commercial Bank',
    authorisedByName: 'Tunde Bakare',
    authorisedDaysAgo: 56,
    status: 'Closed',
    responseDueDate: isoDay(-41),
    attachments: [
      ['MBA-Information-Request-Schedule-EXM-2026-014.pdf', 240, 'Internal'],
      ['FND-2026-101-provisional-observation.pdf', 180, 'Restricted'],
    ],
    relations: [
      ['EXM-2026-014', 'AML/CFT targeted examination — Meridian'],
      ['FND-2026-101', 'Transaction monitoring gaps (High)'],
      ['CAP-2026-003', 'AML corrective action plan'],
      ['DIR-2026-004', 'Corrective directive: AML remediation'],
    ],
    thread: [
      { daysAgo: 57, byName: 'Hauwa Sadiq', action: 'Draft composed', note: 'Prepared from EXM-2026-014 fieldwork requests.' },
      { daysAgo: 56, byName: 'Samuel Ike', action: 'Submitted for review' },
      { daysAgo: 56, hour: 14, byName: 'Tunde Bakare', action: 'Approved', note: 'Approved for issue under DIR-2026-004 file.' },
      { daysAgo: 55, byName: 'Tunde Bakare', action: 'Sent (demo)', note: 'Simulated dispatch — no real communication sent.' },
      { daysAgo: 44, byName: 'Grace Mbeki', action: 'Response received', note: 'Rule inventory and alert population provided; filed as institution submission.' },
      { daysAgo: 40, byName: 'Hauwa Sadiq', action: 'Closed', note: 'Response accepted into EXM-2026-014 evidence set.' },
    ],
  }),
  cor({
    reference: 'COR-2026-002',
    institution: 'northstar',
    type: 'Supervisory Letter',
    direction: 'Outgoing',
    subject: 'Liquidity coverage watch level — supervisory expectations and targeted examination EXM-2026-024',
    body:
      'Dear Sir,\n\nFollowing surveillance exception EXC-2026-011 and early warning alert EWA-2026-011 (October 2026 MPR-04: LCR 104.2% against the 110% demo watch level), the Authority is commencing targeted examination EXM-2026-024.\n\nThe bank is expected to: (i) submit a liquidity buffer restoration plan within fifteen (15) business days; (ii) provide daily LCR projections for the examination period; and (iii) make the treasury function and ALCO minutes available to the examination team.\n\nThis letter and all figures quoted are fictional demo content.\n\nYours faithfully,\nFatima Bello\nPrudential Analyst, Off-Site Surveillance',
    date: isoDay(-18),
    senderName: 'Fatima Bello',
    senderRole: 'Prudential Analyst',
    recipientName: 'Ibrahim Sani',
    recipientRole: 'Compliance Officer, Northstar Merchant Bank',
    authorisedByName: 'Daniel Adeyemi',
    authorisedDaysAgo: 19,
    status: 'Sent',
    responseDueDate: isoDay(-4),
    attachments: [['LCR-trend-analysis-Q1-Q3-2026-demo.pdf', 310, 'Internal']],
    relations: [
      ['EWA-2026-011', 'Northstar LCR amber alert'],
      ['SUB-2026-0144', 'October 2026 MPR-04 — in review'],
      ['EXM-2026-024', 'Targeted liquidity examination'],
      ['FND-2026-087', 'Liquidity reporting delays'],
    ],
    thread: [
      { daysAgo: 20, byName: 'Fatima Bello', action: 'Draft composed', note: 'Generated from the EWA-2026-011 escalation pack.' },
      { daysAgo: 19, byName: 'Fatima Bello', action: 'Submitted for review' },
      { daysAgo: 19, hour: 15, byName: 'Daniel Adeyemi', action: 'Approved', note: 'Issued under the early-warning escalation workflow.' },
      { daysAgo: 18, byName: 'Daniel Adeyemi', action: 'Sent (demo)', note: 'Simulated dispatch — no real communication sent.' },
    ],
  }),
  cor({
    reference: 'COR-2026-003',
    institution: 'northstar',
    type: 'Acknowledgement',
    direction: 'Incoming',
    subject: 'Acknowledgement of Liquidity Buffer Directive DIR-2026-002',
    body:
      'Dear Deputy Director,\n\nNorthstar Merchant Bank acknowledges receipt of Liquidity Buffer Directive DIR-2026-002 and confirms the buffer restoration milestones set out in the directive annex. The bank will report progress monthly via MPR-04 and stands ready to host the examination team.\n\nThis acknowledgement mirrors the document filed in the institution profile (12 Oct 2026). All content is fictional demo data.\n\nYours faithfully,\nIbrahim Sani\nCompliance Officer',
    date: iso(2026, 10, 12),
    senderName: 'Ibrahim Sani',
    senderRole: 'Compliance Officer, Northstar Merchant Bank',
    recipientName: 'Tunde Bakare',
    recipientRole: 'Deputy Director, Banking Supervision',
    status: 'Received',
    attachments: [['DIR-2026-002-Acknowledgement-Signed-demo.pdf', 95, 'Internal']],
    relations: [['DIR-2026-002', 'Liquidity buffer directive — Northstar']],
    thread: [
      { daysAgo: 38, byName: 'Mailroom (demo)', action: 'Received and registered', note: 'Logged against the institution profile document file.' },
      { daysAgo: 37, byName: 'Tunde Bakare', action: 'Reviewed', note: 'Noted; milestones tracked via MPR-04 submissions.' },
    ],
  }),
  cor({
    reference: 'COR-2026-004',
    institution: 'vanguard',
    type: 'Enforcement Notice',
    direction: 'Outgoing',
    subject: 'Notice of enforcement action ENF-2026-002 — licence suspension and capital restoration requirements',
    body:
      'Dear Sir/Madam,\n\nPursuant to the enforcement decision recorded under ENF-2026-002 (Phase 5 module — reference shown for demo continuity), notice is given of the suspension of Vanguard Regional Bank\'s licence with immediate effect, following sustained breach of the 10% demo CAR minimum (6.4% per the rejected October 2026 MPR-09, SUB-2026-0143) and the critical findings FND-2026-030, FND-2026-031 and FND-2026-037.\n\nThe bank must execute the capital restoration plan milestones under CAP-2026-007 and OBL-2026-011 and cooperate with the restructuring supervision team.\n\nAll content is fictional demo data.\n\nYours faithfully,\nZainab Lawal\nLegal/Enforcement Officer',
    date: isoDay(-25),
    senderName: 'Zainab Lawal',
    senderRole: 'Legal/Enforcement Officer',
    recipientName: 'The Managing Director',
    recipientRole: 'Vanguard Regional Bank',
    authorisedByName: 'Amara Osei',
    authorisedDaysAgo: 26,
    status: 'Sent',
    attachments: [
      ['ENF-2026-002-Notice-of-Suspension-demo.pdf', 420, 'Restricted'],
      ['Capital-restoration-requirements-annex-demo.pdf', 260, 'Restricted'],
    ],
    relations: [
      ['ENF-2026-002', 'Enforcement case — licence suspension'],
      ['SUB-2026-0143', 'October 2026 MPR-09 — rejected'],
      ['FND-2026-030', 'CAR below regulatory minimum (Critical)'],
      ['EWA-2026-008', 'Sustained capital breach alert'],
      ['CAP-2026-007', 'Capital restoration corrective action'],
    ],
    thread: [
      { daysAgo: 27, byName: 'Zainab Lawal', action: 'Draft composed', note: 'Prepared from the ENF-2026-002 decision file.' },
      { daysAgo: 26, byName: 'Amara Osei', action: 'Approved', note: 'Director sign-off recorded (demo).' },
      { daysAgo: 25, byName: 'Amara Osei', action: 'Sent (demo)', note: 'Simulated dispatch — no real communication sent.' },
    ],
  }),
  cor({
    reference: 'COR-2026-005',
    institution: 'crestline',
    type: 'Supervisory Letter',
    direction: 'Outgoing',
    subject: 'Cyber incident notification standards and third-party risk register remediation — EXM-2026-005',
    body:
      'Dear Madam,\n\nDuring cybersecurity examination EXM-2026-005, the examination team observed that the third-party technology risk register omitted two payment aggregators integrated in Q2 2026 (finding FND-2026-066, remediation CAP-2026-008), and that agent onboarding controls show gaps in 12% of the demo sample (FND-2026-062).\n\nThe Authority reminds the bank of the 48-hour incident notification standard under MBA/CYB/2025 §6.1 and requests a remediation status report and the updated register within ten (10) business days.\n\nThis draft has not yet been submitted for review. All content is fictional demo data.\n\nYours faithfully,\nKwame Mensah\nCybersecurity Specialist',
    date: isoDay(-2),
    senderName: 'Kwame Mensah',
    senderRole: 'Cybersecurity Specialist',
    recipientName: 'Zara Nwosu',
    recipientRole: 'Finance Manager, Crestline Payment Bank',
    status: 'Draft',
    responseDueDate: isoDay(12),
    attachments: [['Third-party-register-gap-analysis-demo.xlsx', 88, 'Internal']],
    relations: [
      ['EXM-2026-005', 'Crestline cybersecurity examination'],
      ['FND-2026-066', 'API third-party risk register outdated'],
      ['FND-2026-062', 'Agent network onboarding controls'],
      ['CAP-2026-008', 'Technology remediation action'],
    ],
    thread: [{ daysAgo: 2, byName: 'Kwame Mensah', action: 'Draft composed', note: 'Prepared from EXM-2026-005 fieldwork observations; awaiting submission for review.' }],
  }),
  cor({
    reference: 'COR-2026-006',
    institution: 'meridian',
    type: 'Institution Submission',
    direction: 'Incoming',
    subject: 'CAP-2026-003 remediation progress update — transaction monitoring rule uplift',
    body:
      'Dear Sir/Madam,\n\nMeridian Commercial Bank submits the following progress update on corrective action plan CAP-2026-003 arising from finding FND-2026-101:\n\n1. Below-threshold structuring detection rules deployed to production (demo environment) — 9 of 11 rule packs live.\n2. Historical alert population re-run completed; 6 additional STRs filed with the FIU.\n3. Remaining rule packs scheduled within 15 business days; the plan remains overdue against the original milestone date.\n\nThe bank requests supervisory validation of the completed milestones. All content is fictional demo data.\n\nYours faithfully,\nGrace Mbeki\nHead of Regulatory Reporting',
    date: isoDay(-6),
    senderName: 'Grace Mbeki',
    senderRole: 'Head of Regulatory Reporting, Meridian Commercial Bank',
    recipientName: 'Hauwa Sadiq',
    recipientRole: 'AML Specialist, Financial Crime Compliance Unit',
    status: 'Response Required',
    responseDueDate: isoDay(4),
    attachments: [['CAP-2026-003-Milestone-Evidence-Pack-demo.pdf', 540, 'Restricted']],
    relations: [
      ['CAP-2026-003', 'AML corrective action plan — overdue'],
      ['FND-2026-101', 'Transaction monitoring gaps (High)'],
      ['EXM-2026-014', 'AML/CFT targeted examination'],
    ],
    thread: [
      { daysAgo: 6, byName: 'Mailroom (demo)', action: 'Received and registered' },
      { daysAgo: 5, byName: 'Hauwa Sadiq', action: 'Marked response required', note: 'Milestone validation needed before the remediation register can advance.' },
    ],
  }),
  cor({
    reference: 'COR-2026-007',
    institution: 'unity',
    type: 'Examination Notice',
    direction: 'Outgoing',
    subject: 'Notice of planned corporate governance examination EXM-2026-021',
    body:
      'Dear Sir/Madam,\n\nThe Authority gives notice of a planned corporate governance examination (EXM-2026-021) of Unity Non-Interest Bank, covering board composition, Shariah governance documentation (MBA/NIB/2023 §4.4, including the outstanding minutes rationale referenced in FND-2026-118) and board risk reporting timeliness.\n\nFieldwork commences on the date shown in the examination register. Please ensure the company secretary and Shariah board secretariat are available.\n\nAll content is fictional demo data.\n\nYours faithfully,\nLerato Mokoena\nAssistant Director, Specialised Institutions',
    date: isoDay(-10),
    senderName: 'Lerato Mokoena',
    senderRole: 'Assistant Director, Specialised Institutions',
    recipientName: 'The Company Secretary',
    recipientRole: 'Unity Non-Interest Bank',
    authorisedByName: 'Lerato Mokoena',
    authorisedDaysAgo: 11,
    status: 'Sent',
    attachments: [['EXM-2026-021-Document-Request-List-demo.pdf', 150, 'Internal']],
    relations: [
      ['EXM-2026-021', 'Planned governance examination — Unity'],
      ['FND-2026-118', 'Shariah board minutes incomplete (Low)'],
      ['OBL-2026-012', 'Semi-annual Sharia compliance certification'],
    ],
    thread: [
      { daysAgo: 12, byName: 'Lerato Mokoena', action: 'Draft composed' },
      { daysAgo: 11, byName: 'Lerato Mokoena', action: 'Approved', note: 'Assistant Director sign-off (demo).' },
      { daysAgo: 10, byName: 'Lerato Mokoena', action: 'Sent (demo)', note: 'Simulated dispatch — no real communication sent.' },
    ],
  }),
  cor({
    reference: 'COR-2026-008',
    institution: 'delta',
    type: 'Information Request',
    direction: 'Outgoing',
    subject: 'Micro-loan provisioning methodology and PAR-30 population — EXM-2026-017',
    body:
      'Dear Madam,\n\nIn connection with targeted credit examination EXM-2026-017 and finding FND-2026-048 (provision coverage on PAR-30 buckets below the demo 100% standard), the Authority requests:\n\n1. The micro-loan provisioning methodology paper and computation workpapers for Q3 2026.\n2. The PAR-30 population listing with ageing buckets and collateral coverage.\n3. Board credit committee minutes approving the current coverage position.\n\nThis letter is awaiting approval. All content is fictional demo data.\n\nYours faithfully,\nNkechi Balogun\nExaminer, Banking Supervision Team A',
    date: isoDay(-3),
    senderName: 'Nkechi Balogun',
    senderRole: 'Examiner, Banking Supervision Team A',
    recipientName: 'The Head of Finance',
    recipientRole: 'Delta Microfinance Bank',
    status: 'In Review',
    responseDueDate: isoDay(11),
    attachments: [],
    relations: [
      ['EXM-2026-017', 'Delta targeted credit examination'],
      ['FND-2026-048', 'Micro-loan provisioning shortfall (High)'],
      ['OBL-2026-003', 'Quarterly asset quality return obligation'],
    ],
    thread: [
      { daysAgo: 4, byName: 'Nkechi Balogun', action: 'Draft composed' },
      { daysAgo: 3, byName: 'Nkechi Balogun', action: 'Submitted for review', note: 'Pending approval by the supervisory team lead.' },
    ],
  }),
  cor({
    reference: 'COR-2026-009',
    institution: 'vanguard',
    type: 'Meeting Invitation',
    direction: 'Incoming',
    subject: 'Request for meeting — capital restoration plan presentation (OBL-2026-011)',
    body:
      'Dear Deputy Director,\n\nThe board of Vanguard Regional Bank requests a meeting with the supervision and legal teams to present the November 2026 resubmission of the capital restoration plan (OBL-2026-011, CAP-2026-007) and to discuss the restructuring milestones under ENF-2026-002 (Phase 5 reference — demo label).\n\nWe propose any date within the next ten business days and will bring the CFO and the independent capital adviser.\n\nAll content is fictional demo data.\n\nYours faithfully,\nAdaeze Obi\nCompany Secretary, Vanguard Regional Bank',
    date: isoDay(-2),
    senderName: 'Adaeze Obi',
    senderRole: 'Company Secretary, Vanguard Regional Bank',
    recipientName: 'Tunde Bakare',
    recipientRole: 'Deputy Director, Banking Supervision',
    status: 'Response Required',
    responseDueDate: isoDay(8),
    attachments: [['Proposed-meeting-agenda-demo.pdf', 62, 'Internal']],
    relations: [
      ['OBL-2026-011', 'Capital restoration plan obligation'],
      ['CAP-2026-007', 'Capital restoration corrective action'],
      ['ENF-2026-002', 'Enforcement case — licence suspension'],
    ],
    thread: [
      { daysAgo: 2, byName: 'Mailroom (demo)', action: 'Received and registered' },
      { daysAgo: 1, byName: 'Zainab Lawal', action: 'Marked response required', note: 'Coordinate with the restructuring supervision team before confirming a date.' },
    ],
  }),
  cor({
    reference: 'COR-2026-010',
    institution: 'aurora',
    type: 'Supervisory Letter',
    direction: 'Outgoing',
    subject: 'Annual documentation refresh — branch network and agent risk records',
    body:
      'Dear Sir/Madam,\n\nAs part of the annual documentation refresh cycle, Aurora Savings & Loans is requested to confirm the currency of its branch network records and agent risk documentation held by the Authority, and to notify any changes since the last confirmation.\n\nNo examination is currently scheduled. All content is fictional demo data.\n\nYours faithfully,\nSamuel Ike\nReport Reviewer, Quality & Standards',
    date: isoDay(-8),
    senderName: 'Samuel Ike',
    senderRole: 'Report Reviewer, Quality & Standards',
    recipientName: 'The Managing Director',
    recipientRole: 'Aurora Savings & Loans',
    authorisedByName: 'Daniel Adeyemi',
    authorisedDaysAgo: 9,
    status: 'Sent',
    responseDueDate: isoDay(13),
    attachments: [],
    relations: [],
    thread: [
      { daysAgo: 9, byName: 'Samuel Ike', action: 'Draft composed' },
      { daysAgo: 9, hour: 12, byName: 'Daniel Adeyemi', action: 'Approved' },
      { daysAgo: 8, byName: 'Daniel Adeyemi', action: 'Sent (demo)', note: 'Simulated dispatch — no real communication sent.' },
    ],
  }),
]

export const CORRESPONDENCE_ID_BY_REF: Record<string, string> = Object.fromEntries(
  REGULATORY_CORRESPONDENCE.map((c) => [c.reference, c.id]),
)

/** Named Phase-4A story anchors (Spec §10, Phase-4 acceptance wiring). */
export const REGULATORY_STORY = {
  /** AML framework behind the Meridian examination (Phase-4 acceptance anchor). */
  amlFrameworkId: FRAMEWORK_ID_BY_CODE['MBA/AML/2023'],
  prudentialFrameworkId: FRAMEWORK_ID_BY_CODE['MBA/PRU/2024'],
  psbConsultationFrameworkId: FRAMEWORK_ID_BY_CODE['MBA/PSB/2026'],
  /** §6.3 transaction monitoring requirement — EXM-2026-014 / FND-2026-101. */
  transactionMonitoringRequirementId: REGULATORY_REQUIREMENTS.find(
    (r) => r.reference === '§6.3' && r.frameworkId === FRAMEWORK_ID_BY_CODE['MBA/AML/2023'],
  )!.id,
  /** STR obligation — Meridian Non-Compliant (CAP-2026-003 overdue). */
  strObligationId: OBLIGATION_ID_BY_REF['OBL-2026-004'],
  /** MPR-09 obligation — Vanguard Non-Compliant (ENF-2026-002). */
  capitalReturnObligationId: OBLIGATION_ID_BY_REF['OBL-2026-001'],
  /** Draft Crestline cyber letter — the compose/review/approve/send-demo vehicle. */
  crestlineCyberDraftId: CORRESPONDENCE_ID_BY_REF['COR-2026-005'],
  /** Meridian AML information request tied to EXM-2026-014. */
  meridianAmlRequestId: CORRESPONDENCE_ID_BY_REF['COR-2026-001'],
} as const
