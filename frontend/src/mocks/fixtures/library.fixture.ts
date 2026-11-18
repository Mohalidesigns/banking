/**
 * Examination library demo content (Spec §7.5). Hierarchy: jurisdiction →
 * institution category → supervisory domain → examination type → programme →
 * procedure. Only `Approved` versions may be selected for a new examination.
 * All regulatory references are fictional demo mappings (Spec §17.5).
 */
import { demoUuid, iso } from '@/mocks/fixtures/demoIds'
import { JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import type { InstitutionCategory } from '@/types/institution'
import type { ExaminationType } from '@/types/supervision'
import type {
  DocumentRequestTemplate,
  LibraryProcedureTemplate,
  LibraryProgramme,
  TemplateStatus,
  TemplateVersionEntry,
} from '@/types/examination'

const MBA_ID = JURISDICTIONS[0].id

const ALL_BANKS: InstitutionCategory[] = [
  'Commercial Bank',
  'Merchant Bank',
  'Non-Interest Bank',
  'Payment Service Bank',
  'Savings & Loans Bank',
  'Microfinance Bank',
  'Custody & Trust Bank',
  'Regional Bank',
]

interface ProcSeed {
  code: string
  title: string
  objective: string
  question: string
  steps: string[]
  criteria: string
  evidence: string[]
  method: string
  sample: string
  priority: LibraryProcedureTemplate['priority']
}

const proc = (ns: number, n: number, seed: ProcSeed): LibraryProcedureTemplate => ({
  id: demoUuid(ns, n),
  code: seed.code,
  title: seed.title,
  objective: seed.objective,
  question: seed.question,
  steps: seed.steps,
  regulatoryCriteria: seed.criteria,
  requiredEvidence: seed.evidence,
  testingMethod: seed.method,
  suggestedSample: seed.sample,
  priority: seed.priority,
})

const ver = (version: string, at: string, authorName: string, changeNote: string, status: TemplateStatus): TemplateVersionEntry => ({
  version,
  at,
  authorName,
  changeNote,
  status,
})

interface ProgrammeSeed {
  ns: number
  code: string
  title: string
  domainName: string
  examinationTypes: ExaminationType[]
  categories?: InstitutionCategory[]
  version: string
  status: TemplateStatus
  objectives: string
  scopeGuidance: string
  evidenceRequirements: string[]
  testingMethodology: string
  scoringGuidance: string
  regulatoryMapping: { reference: string; title: string }[]
  effectiveFrom: string
  effectiveTo?: string
  ownerName: string
  versionHistory: TemplateVersionEntry[]
  procedures: LibraryProcedureTemplate[]
}

const programme = (seed: ProgrammeSeed): LibraryProgramme => ({
  id: demoUuid(seed.ns, 1),
  code: seed.code,
  title: seed.title,
  jurisdictionId: MBA_ID,
  institutionCategories: seed.categories ?? ALL_BANKS,
  domainName: seed.domainName,
  examinationTypes: seed.examinationTypes,
  version: seed.version,
  status: seed.status,
  objectives: seed.objectives,
  scopeGuidance: seed.scopeGuidance,
  evidenceRequirements: seed.evidenceRequirements,
  testingMethodology: seed.testingMethodology,
  scoringGuidance: seed.scoringGuidance,
  regulatoryMapping: seed.regulatoryMapping,
  effectiveFrom: seed.effectiveFrom,
  effectiveTo: seed.effectiveTo,
  ownerName: seed.ownerName,
  procedures: seed.procedures,
  versionHistory: seed.versionHistory,
})

// ---------------------------------------------------------------------------
// AML/CFT thematic programme — used by EXM-2026-014 (Meridian fieldwork)
// ---------------------------------------------------------------------------

const AML_PROGRAMME = programme({
  ns: 41,
  code: 'LIB-AML-002',
  title: 'AML/CFT Thematic Examination Programme',
  domainName: 'AML/CFT',
  examinationTypes: ['AML/CFT', 'Thematic', 'Targeted'],
  version: 'v2.2',
  status: 'Approved',
  objectives:
    'Assess the effectiveness of the institution\'s AML/CFT control framework: customer due diligence, transaction monitoring, sanctions screening and suspicious-transaction reporting.',
  scopeGuidance:
    'Cover retail and corporate onboarding channels, the monitoring rules inventory and the STR pipeline for the review period. Include at least one high-risk customer segment.',
  evidenceRequirements: [
    'Transaction monitoring rule inventory with tuning records',
    'CDD/KYC policy and periodic refresh procedures',
    'Sample of customer files across risk tiers',
    'Sanctions screening logs and hit-resolution records',
    'STR register with filing timelines',
  ],
  testingMethodology:
    'Walkthroughs with AML compliance staff, attribute sampling of customer files and monitoring alerts, re-performance of screening against demo watchlists.',
  scoringGuidance:
    'Demo scoring: each procedure results in Pass / Partial / Fail; two or more Fails in the domain escalates the domain conclusion to High risk. Illustrative only — not a universal regulatory formula.',
  regulatoryMapping: [
    { reference: 'MBA/AML/2023 §4.1', title: 'Customer due diligence (demo reference)' },
    { reference: 'MBA/AML/2023 §6.3', title: 'Transaction monitoring obligations (demo reference)' },
    { reference: 'MBA/AML/2024 §2.2', title: 'Suspicious transaction reporting (demo reference)' },
  ],
  effectiveFrom: iso(2026, 1, 15),
  ownerName: 'Hauwa Sadiq',
  versionHistory: [
    ver('v2.2', iso(2026, 1, 15), 'Hauwa Sadiq', 'Added STR quality procedure; refreshed monitoring tuning evidence list.', 'Approved'),
    ver('v2.1', iso(2025, 6, 1), 'Hauwa Sadiq', 'Aligned sanctions screening steps with the 2025 demo circular.', 'Retired'),
    ver('v2.0', iso(2024, 9, 10), 'Chuka Eze', 'Major rewrite for risk-based approach.', 'Retired'),
  ],
  procedures: [
    proc(41, 11, {
      code: 'AML-01',
      title: 'Transaction monitoring rule coverage',
      objective: 'Confirm the monitoring rule inventory covers the institution\'s declared risk scenarios.',
      question: 'Do transaction monitoring rules cover all high-risk scenarios in the institution\'s risk assessment, and are thresholds evidenced and tuned?',
      steps: [
        'Obtain the rule inventory and the business-wide AML risk assessment.',
        'Map each declared high-risk scenario to at least one monitoring rule.',
        'Review tuning records for the last four demo quarters.',
        'Re-perform monitoring on a seeded test population (demo data).',
      ],
      criteria: 'MBA/AML/2023 §6.3 (demo reference)',
      evidence: ['Rule inventory export', 'Risk assessment extract', 'Tuning committee minutes', 'Test-run output'],
      method: 'Re-performance and document review',
      sample: 'All monitoring rules; 4 quarters of tuning records',
      priority: 'Critical',
    }),
    proc(41, 12, {
      code: 'AML-02',
      title: 'Monitoring alert handling timeliness',
      objective: 'Test whether alerts are reviewed and dispositioned within the demo 5-business-day standard.',
      question: 'Are monitoring alerts assigned, investigated and dispositioned within policy timelines, with rationale documented?',
      steps: [
        'Extract the alert queue for the review period (demo system report).',
        'Sample alerts across severity bands.',
        'Recompute handling time from alert creation to disposition.',
        'Inspect disposition rationale for completeness.',
      ],
      criteria: 'Institution AML policy §3 (demo) / MBA/AML/2023 §6.3',
      evidence: ['Alert queue extract', 'Disposition records', 'Analyst workload report'],
      method: 'Attribute sampling',
      sample: '40 alerts (demo sample size)',
      priority: 'High',
    }),
    proc(41, 13, {
      code: 'AML-03',
      title: 'CDD periodic refresh backlog',
      objective: 'Verify periodic CDD refresh is performed on schedule for each risk tier.',
      question: 'Is the periodic refresh completed within the demo cycles (1/3/5 years by risk tier), and is any backlog tracked and remediated?',
      steps: [
        'Obtain the refresh tracker by risk tier.',
        'Sample high-risk customers overdue for refresh.',
        'Check remediation plans and board reporting of the backlog.',
      ],
      criteria: 'MBA/AML/2023 §4.1 (demo reference)',
      evidence: ['Refresh tracker', 'Customer file sample', 'Backlog remediation plan'],
      method: 'Attribute sampling',
      sample: '60 customer files (demo sample size)',
      priority: 'High',
    }),
    proc(41, 14, {
      code: 'AML-04',
      title: 'Sanctions screening effectiveness',
      objective: 'Confirm screening runs at onboarding, on list updates and periodically over the customer base.',
      question: 'Are customers and counterparties screened against current demo sanctions lists at the required triggers, and are true matches escalated correctly?',
      steps: [
        'Inspect screening system trigger configuration.',
        'Re-perform screening for a sample of customers against the demo list.',
        'Review hit-resolution records for false-positive rationale.',
      ],
      criteria: 'MBA/AML/2024 §2.2 (demo reference)',
      evidence: ['Screening configuration', 'Hit-resolution log', 'List-update audit trail'],
      method: 'Re-performance',
      sample: '25 customers plus 10 list-update events',
      priority: 'Critical',
    }),
    proc(41, 15, {
      code: 'AML-05',
      title: 'STR quality and timeliness',
      objective: 'Assess whether suspicious transaction reports are filed within the demo 72-hour standard with complete narratives.',
      question: 'Are STRs filed on time with sufficient narrative quality, and is the decision not to file documented?',
      steps: [
        'Obtain the STR register for the review period.',
        'Sample filed STRs and assess narrative completeness against the demo quality rubric.',
        'Sample escalated cases not filed and inspect the documented rationale.',
      ],
      criteria: 'MBA/AML/2024 §2.2 (demo reference)',
      evidence: ['STR register', 'Filed STR samples', 'No-file rationale records'],
      method: 'Attribute sampling',
      sample: '15 STRs (demo sample size)',
      priority: 'High',
    }),
    proc(41, 16, {
      code: 'AML-06',
      title: 'High-risk customer enhanced due diligence',
      objective: 'Verify EDD is applied and documented for PEPs and other high-risk relationships.',
      question: 'Do high-risk and PEP relationships carry documented EDD, senior-management approval and source-of-wealth evidence?',
      steps: [
        'Extract the high-risk/PEP population from the demo CRM.',
        'Sample relationships and inspect EDD documentation.',
        'Confirm senior-management sign-off records.',
      ],
      criteria: 'MBA/AML/2023 §4.1 (demo reference)',
      evidence: ['PEP register', 'EDD file samples', 'Approval records'],
      method: 'Attribute sampling',
      sample: '20 high-risk relationships',
      priority: 'Medium',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Credit risk programme (Journey A step 6 needs credit procedures)
// ---------------------------------------------------------------------------

const CREDIT_PROGRAMME = programme({
  ns: 42,
  code: 'LIB-CRD-001',
  title: 'Credit Risk & Asset Quality Examination Programme',
  domainName: 'Credit Risk',
  examinationTypes: ['Comprehensive', 'Targeted', 'Follow-up'],
  version: 'v3.1',
  status: 'Approved',
  objectives:
    'Evaluate credit governance, underwriting quality, asset classification accuracy, provisioning adequacy and concentration management.',
  scopeGuidance:
    'Sample across retail, SME and corporate portfolios; always include the largest 10 exposures and all restructured facilities.',
  evidenceRequirements: [
    'Credit policy and delegation-of-authority matrix',
    'Loan files for the sampled population',
    'Collateral valuation reports',
    'Impairment computation working papers',
    'Large-exposure and concentration reports',
  ],
  testingMethodology: 'Loan-file review against an attribute checklist, re-computation of provisioning, walkthroughs with credit risk staff.',
  scoringGuidance:
    'Demo scoring: Fail on classification accuracy or provisioning drives a High domain conclusion. Illustrative only.',
  regulatoryMapping: [
    { reference: 'MBA/PRU/2024 §5.2', title: 'Asset classification and provisioning (demo reference)' },
    { reference: 'MBA/PRU/2024 §7.1', title: 'Single obligor and concentration limits (demo reference)' },
  ],
  effectiveFrom: iso(2026, 2, 1),
  ownerName: 'Peter Okonjo',
  versionHistory: [
    ver('v3.1', iso(2026, 2, 1), 'Peter Okonjo', 'Added restructuring file review; updated provisioning re-computation steps.', 'Approved'),
    ver('v3.0', iso(2025, 3, 15), 'Peter Okonjo', 'Rewrite for the 2025 prudential demo rules.', 'Retired'),
  ],
  procedures: [
    proc(42, 11, {
      code: 'CRD-01',
      title: 'Credit file completeness and appraisal quality',
      objective: 'Test that sampled loan files evidence a complete appraisal, approved authority and current collateral valuation.',
      question: 'Do credit files contain financial analysis, risk grading, approval at the right authority level and collateral valuations refreshed within the demo 3-year standard?',
      steps: [
        'Select the sample per the programme scope guidance.',
        'Score each file against the attribute checklist.',
        'Escalate repeat exceptions to the domain conclusion.',
      ],
      criteria: 'Institution credit policy (demo) / MBA/PRU/2024 §5.2',
      evidence: ['Loan file samples', 'Delegation-of-authority matrix', 'Valuation reports'],
      method: 'Attribute sampling',
      sample: '25 credit files across three branches',
      priority: 'High',
    }),
    proc(42, 12, {
      code: 'CRD-02',
      title: 'Asset classification accuracy',
      objective: 'Re-perform classification for the sampled portfolio against the demo prudential rules.',
      question: 'Are facilities classified (current/sub-standard/doubtful/lost) consistently with days-past-due, restructuring status and collateral coverage?',
      steps: ['Obtain the ageing report.', 'Re-classify sampled facilities.', 'Compare with the institution\'s classification and quantify misstatement.'],
      criteria: 'MBA/PRU/2024 §5.2 (demo reference)',
      evidence: ['Ageing report', 'Restructuring register', 'Classification working paper'],
      method: 'Re-performance',
      sample: 'All facilities > demo 5% of capital plus 20 sampled smaller files',
      priority: 'Critical',
    }),
    proc(42, 13, {
      code: 'CRD-03',
      title: 'Provisioning adequacy',
      objective: 'Verify impairment provisions meet the demo minimum coverage per bucket.',
      question: 'Does provisioning cover each classification bucket at or above the demo rates, and are shortfalls disclosed to the board?',
      steps: ['Re-compute required provisions.', 'Compare with booked impairment.', 'Inspect board reporting of any shortfall.'],
      criteria: 'MBA/PRU/2024 §5.2 (demo reference)',
      evidence: ['Impairment computation', 'General ledger extract', 'Board risk report'],
      method: 'Re-computation',
      sample: 'Full portfolio (demo data)',
      priority: 'Critical',
    }),
    proc(42, 14, {
      code: 'CRD-04',
      title: 'Insider and connected-party lending',
      objective: 'Confirm connected-party exposures are identified, within demo limits and board-approved.',
      question: 'Is the connected-party register complete, and are all insider credits within limits with documented board approval and arm\'s-length terms?',
      steps: ['Obtain the register and HR/board listings.', 'Cross-check against the loan book.', 'Inspect approval minutes and terms.'],
      criteria: 'MBA/PRU/2024 §7.1 (demo reference)',
      evidence: ['Connected-party register', 'Board minutes', 'Loan terms samples'],
      method: 'Cross-referencing and inspection',
      sample: 'All connected-party exposures',
      priority: 'High',
    }),
    proc(42, 15, {
      code: 'CRD-05',
      title: 'Large exposure and concentration monitoring',
      objective: 'Test that single-obligor and sector concentrations are monitored and breaches escalated.',
      question: 'Are large exposures reported monthly to ALCO/board, with any breach of the demo limits escalated and remediated?',
      steps: ['Review concentration reports for the period.', 'Trace breaches to escalation records.', 'Assess remediation outcomes.'],
      criteria: 'MBA/PRU/2024 §7.1 (demo reference)',
      evidence: ['Concentration reports', 'ALCO minutes', 'Escalation log'],
      method: 'Inspection and tracing',
      sample: '12 monthly reports',
      priority: 'Medium',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Liquidity programme — used by EXM-2026-024 (targeted from alert)
// ---------------------------------------------------------------------------

const LIQUIDITY_PROGRAMME = programme({
  ns: 43,
  code: 'LIB-LIQ-001',
  title: 'Liquidity Risk Management Examination Programme',
  domainName: 'Liquidity Risk',
  examinationTypes: ['Comprehensive', 'Targeted', 'Thematic'],
  version: 'v2.4',
  status: 'Approved',
  objectives:
    'Assess liquidity governance, measurement (LCR/NSFR demo ratios), contingency funding planning and intraday liquidity controls.',
  scopeGuidance:
    'Targeted examinations triggered by early-warning alerts should re-perform ratio computation for the alert window and test the contingency plan activation path.',
  evidenceRequirements: [
    'Liquidity policy and limits framework',
    'Daily LCR computation for the alert window',
    'Contingency funding plan and test records',
    'ALCO pack and minutes',
    'Intraday position reports',
  ],
  testingMethodology: 'Re-computation of demo ratios, inspection of ALCO governance, walkthrough of contingency activation.',
  scoringGuidance: 'Demo scoring: a Fail on contingency testing or ratio integrity drives an Enhanced supervisory intensity recommendation. Illustrative only.',
  regulatoryMapping: [
    { reference: 'MBA/PRU/2024 §9.1', title: 'Liquidity coverage and limits (demo reference)' },
    { reference: 'MBA/PRU/2024 §9.4', title: 'Contingency funding plan (demo reference)' },
  ],
  effectiveFrom: iso(2026, 3, 1),
  ownerName: 'Fatima Bello',
  versionHistory: [
    ver('v2.4', iso(2026, 3, 1), 'Fatima Bello', 'Added intraday liquidity procedure.', 'Approved'),
    ver('v2.3', iso(2025, 9, 20), 'Fatima Bello', 'Contingency plan test evidence expanded.', 'Retired'),
  ],
  procedures: [
    proc(43, 11, {
      code: 'LIQ-01',
      title: 'LCR computation integrity',
      objective: 'Re-perform the daily LCR computation for the alert window and verify data lineage.',
      question: 'Does the recomputed LCR agree with submitted demo returns, and are outflow assumptions evidenced?',
      steps: ['Obtain daily computations for the window.', 'Re-perform three days end-to-end.', 'Trace inputs to source systems.'],
      criteria: 'MBA/PRU/2024 §9.1 (demo reference)',
      evidence: ['Daily LCR report', 'Source system extracts', 'Submitted returns'],
      method: 'Re-computation',
      sample: '3 business days re-performed; full window inspected',
      priority: 'Critical',
    }),
    proc(43, 12, {
      code: 'LIQ-02',
      title: 'Contingency funding plan activation',
      objective: 'Test whether the CFP defines triggers, actions and responsibilities and has been exercised within the demo 2-quarter standard.',
      question: 'Are early-warning triggers in the CFP linked to observable metrics, and did the last exercise cover the current amber scenario?',
      steps: ['Inspect the CFP and trigger list.', 'Review the last exercise record.', 'Assess linkage to the current alert indicator.'],
      criteria: 'MBA/PRU/2024 §9.4 (demo reference)',
      evidence: ['Contingency funding plan', 'Exercise report', 'Trigger monitoring dashboard'],
      method: 'Inspection and walkthrough',
      sample: 'Current CFP version plus last two exercises',
      priority: 'High',
    }),
    proc(43, 13, {
      code: 'LIQ-03',
      title: 'ALCO governance and limit breaches',
      objective: 'Verify liquidity limit breaches are reported to and challenged by ALCO within the demo 24-hour standard.',
      question: 'Do ALCO minutes evidence timely escalation and decisions on breaches and amber indicators?',
      steps: ['Sample breach events.', 'Trace to ALCO reporting.', 'Assess decision quality and follow-through.'],
      criteria: 'Institution liquidity policy §6 (demo)',
      evidence: ['ALCO minutes', 'Breach log', 'Escalation emails (demo)'],
      method: 'Tracing',
      sample: 'All breaches in the review period',
      priority: 'High',
    }),
    proc(43, 14, {
      code: 'LIQ-04',
      title: 'Deposit concentration and funding stability',
      objective: 'Assess reliance on large or concentrated funding against the demo 25% single-depositor standard.',
      question: 'Is concentrated funding identified, stress-tested and within appetite, with mitigation plans documented?',
      steps: ['Obtain depositor concentration report.', 'Compare with policy limits.', 'Inspect stress-test overlays for top depositors.'],
      criteria: 'MBA/PRU/2024 §9.1 (demo reference)',
      evidence: ['Concentration report', 'Stress-test results', 'Funding strategy'],
      method: 'Inspection and re-computation',
      sample: 'Top 10 depositors',
      priority: 'Medium',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Cybersecurity programme — used by EXM-2026-005 (Journey A step 6)
// ---------------------------------------------------------------------------

const CYBER_PROGRAMME = programme({
  ns: 44,
  code: 'LIB-CYB-001',
  title: 'Cyber Resilience Examination Programme',
  domainName: 'Cybersecurity',
  examinationTypes: ['Cybersecurity', 'Thematic', 'Comprehensive'],
  version: 'v1.8',
  status: 'Approved',
  objectives:
    'Evaluate cyber governance, third-party risk management, API and access security, incident response readiness and cyber exercise outcomes.',
  scopeGuidance:
    'For payment-focused institutions include agent-network technology controls and payment aggregator integrations.',
  evidenceRequirements: [
    'Third-party risk register and assurance reports',
    'API inventory and security review records',
    'Incident response plan and exercise logs',
    'Privileged access review records',
    'Board cyber reporting pack',
  ],
  testingMethodology: 'Document inspection, configuration walkthroughs with IT staff, tabletop exercise observation (demo).',
  scoringGuidance: 'Demo scoring: unremediated critical vulnerabilities or a stale third-party register drive a Fail. Illustrative only.',
  regulatoryMapping: [
    { reference: 'MBA/CYB/2025 §3.1', title: 'Technology risk management (demo reference)' },
    { reference: 'MBA/CYB/2025 §5.2', title: 'Third-party and outsourcing risk (demo reference)' },
  ],
  effectiveFrom: iso(2026, 1, 10),
  ownerName: 'Kwame Mensah',
  versionHistory: [
    ver('v1.8', iso(2026, 1, 10), 'Kwame Mensah', 'API security procedure added for payment banks.', 'Approved'),
    ver('v1.7', iso(2025, 7, 1), 'Kwame Mensah', 'Exercise evidence expectations clarified.', 'Retired'),
  ],
  procedures: [
    proc(44, 11, {
      code: 'CYB-01',
      title: 'Third-party risk register completeness',
      objective: 'Verify all material technology third parties are registered with current assurance.',
      question: 'Does the register include every integrated third party (incl. recent additions), with risk tiering and assurance reviews within the demo annual standard?',
      steps: ['Obtain the register and the integration/change log.', 'Reconcile new integrations to register entries.', 'Inspect assurance currency for material parties.'],
      criteria: 'MBA/CYB/2025 §5.2 (demo reference)',
      evidence: ['Third-party risk register', 'Integration change log', 'Assurance reports'],
      method: 'Reconciliation',
      sample: 'All material third parties',
      priority: 'High',
    }),
    proc(44, 12, {
      code: 'CYB-02',
      title: 'API security review',
      objective: 'Confirm external APIs have documented security reviews and authenticated access controls.',
      question: 'Is there an API inventory with a security review per API within the demo 12-month standard, and are keys/secrets managed per policy?',
      steps: ['Obtain the API inventory.', 'Sample external APIs and inspect review records.', 'Walk through key management configuration.'],
      criteria: 'MBA/CYB/2025 §3.1 (demo reference)',
      evidence: ['API inventory', 'Security review records', 'Key management screenshots (demo)'],
      method: 'Inspection and walkthrough',
      sample: 'All external-facing APIs',
      priority: 'High',
    }),
    proc(44, 13, {
      code: 'CYB-03',
      title: 'Incident response readiness',
      objective: 'Test the incident response plan against the demo severity matrix and the last exercise record.',
      question: 'Are roles, escalation timelines and regulator notification duties defined and exercised within the demo annual standard?',
      steps: ['Inspect the IR plan and severity matrix.', 'Review the last tabletop exercise outcomes.', 'Check remediation of exercise findings.'],
      criteria: 'MBA/CYB/2025 §3.1 (demo reference)',
      evidence: ['Incident response plan', 'Exercise report', 'Remediation tracker'],
      method: 'Inspection',
      sample: 'Current plan plus last two exercises',
      priority: 'Medium',
    }),
    proc(44, 14, {
      code: 'CYB-04',
      title: 'Privileged access management',
      objective: 'Verify privileged access is inventoried, reviewed quarterly and time-bound where required.',
      question: 'Do quarterly access reviews evidence removal of leavers and rotation of shared admin credentials within the demo 90-day standard?',
      steps: ['Obtain the privileged access inventory.', 'Inspect the last two quarterly reviews.', 'Sample leaver records for timely revocation.'],
      criteria: 'MBA/CYB/2025 §3.1 (demo reference)',
      evidence: ['PAM inventory', 'Review records', 'Leaver list (demo)'],
      method: 'Inspection and sampling',
      sample: '2 quarterly reviews; 15 leaver records',
      priority: 'High',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Governance programme — used by EXM-2026-021 (Unity, planned)
// ---------------------------------------------------------------------------

const GOVERNANCE_PROGRAMME = programme({
  ns: 45,
  code: 'LIB-GOV-001',
  title: 'Corporate Governance & Board Effectiveness Programme',
  domainName: 'Corporate Governance',
  examinationTypes: ['Comprehensive', 'Thematic'],
  categories: ['Non-Interest Bank', 'Commercial Bank', 'Regional Bank', 'Merchant Bank'],
  version: 'v3.0',
  status: 'Approved',
  objectives:
    'Assess board composition and independence, committee effectiveness, quality of challenge in minutes, and (for non-interest banks) Shariah governance arrangements.',
  scopeGuidance:
    'Include board and committee minutes for the review period; interview the company secretary (demo).',
  evidenceRequirements: [
    'Board composition and independence declarations',
    'Committee terms of reference',
    'Board and committee minutes',
    'Shariah board charters and minutes (where applicable)',
    'Fit-and-proper assessment records',
  ],
  testingMethodology: 'Minutes inspection against a challenge-quality rubric, terms-of-reference review, document reconciliation.',
  scoringGuidance: 'Demo scoring: absence of documented challenge across three consecutive quarters drives a Fail. Illustrative only.',
  regulatoryMapping: [
    { reference: 'MBA/GOV/2024 §2.1', title: 'Board composition and tenure (demo reference)' },
    { reference: 'MBA/NIB/2023 §4.4', title: 'Shariah governance (demo reference)' },
  ],
  effectiveFrom: iso(2026, 1, 5),
  ownerName: 'Lerato Mokoena',
  versionHistory: [
    ver('v3.0', iso(2026, 1, 5), 'Lerato Mokoena', 'Shariah governance procedures consolidated.', 'Approved'),
    ver('v2.4', iso(2025, 2, 12), 'Daniel Adeyemi', 'Challenge-quality rubric introduced.', 'Retired'),
  ],
  procedures: [
    proc(45, 11, {
      code: 'GOV-01',
      title: 'Board composition and independence',
      objective: 'Confirm board composition meets the demo independence and tenure rules.',
      question: 'Are independent directors within the demo ratio, tenures within limits, and fit-and-proper assessments current?',
      steps: ['Obtain the board register.', 'Verify independence declarations.', 'Inspect fit-and-proper files.'],
      criteria: 'MBA/GOV/2024 §2.1 (demo reference)',
      evidence: ['Board register', 'Independence declarations', 'Fit-and-proper files'],
      method: 'Inspection',
      sample: 'All directors',
      priority: 'High',
    }),
    proc(45, 12, {
      code: 'GOV-02',
      title: 'Risk committee effectiveness',
      objective: 'Test that the board risk committee receives timely, complete risk reporting and documents challenge.',
      question: 'Do minutes evidence review of key risk reports within the demo 30-day timeliness standard and recorded challenge of management assumptions?',
      steps: ['Sample committee minutes for the period.', 'Trace risk reports to submission dates.', 'Score challenge quality with the rubric.'],
      criteria: 'MBA/GOV/2024 §2.1 (demo reference)',
      evidence: ['Committee minutes', 'Risk report transmittals', 'Management responses'],
      method: 'Minutes inspection',
      sample: 'All meetings in the review period',
      priority: 'High',
    }),
    proc(45, 13, {
      code: 'GOV-03',
      title: 'Shariah governance arrangements',
      objective: 'For non-interest banks, verify Shariah board approvals are documented for products and investments.',
      question: 'Does every investment-account product carry documented Shariah board rationale and periodic review?',
      steps: ['Obtain the product register.', 'Sample approvals and inspect rationale.', 'Check periodic review calendar.'],
      criteria: 'MBA/NIB/2023 §4.4 (demo reference)',
      evidence: ['Shariah board minutes', 'Product approval files', 'Review calendar'],
      method: 'Attribute sampling',
      sample: 'All products launched in the period',
      priority: 'Medium',
    }),
    proc(45, 14, {
      code: 'GOV-04',
      title: 'Conflicts of interest management',
      objective: 'Confirm the conflicts register is maintained and related-party decisions record abstentions.',
      question: 'Are conflicts declared annually, and do minutes show abstention on related-party matters?',
      steps: ['Inspect the conflicts register and declarations.', 'Sample related-party decisions in minutes.', 'Verify abstention recording.'],
      criteria: 'MBA/GOV/2024 §2.1 (demo reference)',
      evidence: ['Conflicts register', 'Annual declarations', 'Board minutes'],
      method: 'Inspection',
      sample: 'All related-party decisions in the period',
      priority: 'Medium',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Capital adequacy programme — used by EXM-2026-012 (Vanguard, completed)
// ---------------------------------------------------------------------------

const CAPITAL_PROGRAMME = programme({
  ns: 46,
  code: 'LIB-CAP-001',
  title: 'Capital Adequacy Review Programme',
  domainName: 'Capital Adequacy',
  examinationTypes: ['Comprehensive', 'Targeted'],
  version: 'v2.0',
  status: 'Approved',
  objectives:
    'Re-perform capital adequacy computation, assess capital planning buffers and verify recovery planning triggers.',
  scopeGuidance: 'Targeted capital reviews should re-compute CAR from source ledgers and inspect the capital restoration plan where CAR is near the demo minimum.',
  evidenceRequirements: ['CAR computation working papers', 'Capital plan and board approval', 'Recovery plan triggers', 'RWA reconciliation'],
  testingMethodology: 'Re-computation from demo ledger extracts, inspection of capital governance.',
  scoringGuidance: 'Demo scoring: CAR below the demo 10% minimum is an automatic Critical Fail. Illustrative only.',
  regulatoryMapping: [{ reference: 'MBA/PRU/2024 §3.1', title: 'Minimum capital adequacy (demo reference)' }],
  effectiveFrom: iso(2025, 11, 1),
  ownerName: 'Zainab Lawal',
  versionHistory: [ver('v2.0', iso(2025, 11, 1), 'Zainab Lawal', 'Recovery-plan trigger verification added.', 'Approved')],
  procedures: [
    proc(46, 11, {
      code: 'CAP-01',
      title: 'CAR re-computation',
      objective: 'Re-perform the capital adequacy ratio from source data.',
      question: 'Does the recomputed CAR agree with the submitted demo return within tolerance?',
      steps: ['Obtain ledger and RWA extracts.', 'Re-compute capital tiers and RWA.', 'Compare with the submitted return and investigate differences.'],
      criteria: 'MBA/PRU/2024 §3.1 (demo reference)',
      evidence: ['Ledger extracts', 'RWA working papers', 'Submitted MPR-09 return'],
      method: 'Re-computation',
      sample: 'Two quarter-ends',
      priority: 'Critical',
    }),
    proc(46, 12, {
      code: 'CAP-02',
      title: 'Capital planning and board approval',
      objective: 'Assess the capital plan, buffers and board challenge of management projections.',
      question: 'Is there a board-approved capital plan with forward buffers, and do minutes evidence challenge of projections?',
      steps: ['Inspect the capital plan.', 'Review board minutes for challenge.', 'Assess buffer adequacy against demo stress outcomes.'],
      criteria: 'MBA/PRU/2024 §3.1 (demo reference)',
      evidence: ['Capital plan', 'Board minutes', 'Stress-test outputs'],
      method: 'Inspection',
      sample: 'Current plan plus four quarters of minutes',
      priority: 'High',
    }),
    proc(46, 13, {
      code: 'CAP-03',
      title: 'Recovery plan trigger monitoring',
      objective: 'Verify recovery plan triggers are monitored and breaches escalated.',
      question: 'Are trigger metrics produced monthly and escalations evidenced when a trigger is breached?',
      steps: ['Obtain the trigger monitoring report.', 'Identify breaches in the period.', 'Trace escalation and remediation records.'],
      criteria: 'MBA/PRU/2024 §3.1 (demo reference)',
      evidence: ['Trigger reports', 'Escalation log', 'Recovery plan'],
      method: 'Tracing',
      sample: 'All breaches in the period',
      priority: 'High',
    }),
  ],
})

// ---------------------------------------------------------------------------
// Non-selectable programmes (demo lifecycle states)
// ---------------------------------------------------------------------------

const AML_DRAFT_PROGRAMME = programme({
  ns: 47,
  code: 'LIB-AML-003',
  title: 'AML/CFT Thematic Examination Programme (2027 refresh)',
  domainName: 'AML/CFT',
  examinationTypes: ['AML/CFT', 'Thematic'],
  version: 'v0.9',
  status: 'Draft',
  objectives: 'Draft refresh of the AML thematic programme incorporating the demo 2027 circular on beneficial ownership.',
  scopeGuidance: 'Draft — subject to methodology committee review.',
  evidenceRequirements: ['Beneficial ownership register (draft)'],
  testingMethodology: 'To be confirmed.',
  scoringGuidance: 'Draft — scoring guidance pending.',
  regulatoryMapping: [{ reference: 'MBA/AML/2027 (draft)', title: 'Beneficial ownership (demo draft reference)' }],
  effectiveFrom: iso(2027, 1, 1),
  ownerName: 'Hauwa Sadiq',
  versionHistory: [ver('v0.9', iso(2026, 10, 30), 'Hauwa Sadiq', 'Initial draft for the 2027 cycle.', 'Draft')],
  procedures: [
    proc(47, 11, {
      code: 'AML-07',
      title: 'Beneficial ownership transparency (draft)',
      objective: 'Draft procedure: verify beneficial ownership information is collected and validated at onboarding.',
      question: 'Is beneficial ownership identified, documented and re-validated on ownership change events?',
      steps: ['Draft step — obtain the BO register.', 'Draft step — sample onboarding files.', 'Draft step — test change-event revalidation.'],
      criteria: 'MBA/AML/2027 (draft) §4.4',
      evidence: ['BO register (draft)', 'Onboarding samples'],
      method: 'Attribute sampling',
      sample: '30 files (draft)',
      priority: 'High',
    }),
  ],
})

const OPS_REVIEW_PROGRAMME = programme({
  ns: 48,
  code: 'LIB-OPS-001',
  title: 'Operational Resilience & Internal Controls Programme',
  domainName: 'Operational Resilience',
  examinationTypes: ['Comprehensive', 'Thematic'],
  version: 'v1.2',
  status: 'Under Review',
  objectives: 'Assess important business services, impact tolerances and the control environment over cash operations and reconciliations.',
  scopeGuidance: 'Under methodology committee review — not selectable for new examinations until approved.',
  evidenceRequirements: ['Important business services map', 'Impact tolerance definitions', 'Reconciliation exception reports'],
  testingMethodology: 'Service walkthroughs and exception-report re-performance.',
  scoringGuidance: 'Pending committee approval.',
  regulatoryMapping: [{ reference: 'MBA/OPS/2026 §2.1', title: 'Operational resilience (demo reference)' }],
  effectiveFrom: iso(2026, 12, 1),
  ownerName: 'Samuel Ike',
  versionHistory: [
    ver('v1.2', iso(2026, 11, 2), 'Samuel Ike', 'Submitted for methodology committee review.', 'Under Review'),
    ver('v1.1', iso(2026, 5, 18), 'Samuel Ike', 'Cash operations procedures expanded.', 'Draft'),
  ],
  procedures: [
    proc(48, 11, {
      code: 'OPS-01',
      title: 'Branch cash limit compliance',
      objective: 'Test branch cash holdings against approved limits and escalation of breaches.',
      question: 'Are cash-holding limit breaches detected same-day and escalated per the demo standard?',
      steps: ['Obtain daily cash position reports.', 'Identify limit breaches.', 'Trace escalation records.'],
      criteria: 'Institution cash policy §2 (demo)',
      evidence: ['Cash position reports', 'Escalation log'],
      method: 'Re-performance',
      sample: 'All branches for one quarter',
      priority: 'Medium',
    }),
  ],
})

const CREDIT_RETIRED_PROGRAMME = programme({
  ns: 49,
  code: 'LIB-CRD-000',
  title: 'Credit Risk & Asset Quality Examination Programme (legacy)',
  domainName: 'Credit Risk',
  examinationTypes: ['Comprehensive'],
  version: 'v2.9',
  status: 'Retired',
  objectives: 'Legacy credit programme superseded by LIB-CRD-001 v3.0 in March 2025. Retained for historical examinations.',
  scopeGuidance: 'Retired — not selectable for new examinations; existing examinations retain their selected version.',
  evidenceRequirements: ['Legacy checklist (retired)'],
  testingMethodology: 'Loan-file review (legacy checklist).',
  scoringGuidance: 'Retired.',
  regulatoryMapping: [{ reference: 'MBA/PRU/2021 §4.2', title: 'Legacy prudential rules (demo reference)' }],
  effectiveFrom: iso(2023, 1, 10),
  effectiveTo: iso(2025, 3, 14),
  ownerName: 'Peter Okonjo',
  versionHistory: [
    ver('v2.9', iso(2024, 4, 8), 'Peter Okonjo', 'Final legacy revision.', 'Retired'),
    ver('v2.8', iso(2023, 1, 10), 'Nkechi Balogun', 'Legacy baseline.', 'Retired'),
  ],
  procedures: [
    proc(49, 11, {
      code: 'CRD-L1',
      title: 'Legacy credit file checklist',
      objective: 'Superseded file-completeness checklist retained for examinations that selected v2.9.',
      question: 'Legacy question retained for historical reference.',
      steps: ['Legacy step 1.', 'Legacy step 2.'],
      criteria: 'MBA/PRU/2021 §4.2 (demo reference)',
      evidence: ['Loan files'],
      method: 'Attribute sampling',
      sample: '20 files',
      priority: 'Medium',
    }),
  ],
})

export const LIBRARY_PROGRAMMES: LibraryProgramme[] = [
  AML_PROGRAMME,
  CREDIT_PROGRAMME,
  LIQUIDITY_PROGRAMME,
  CYBER_PROGRAMME,
  GOVERNANCE_PROGRAMME,
  CAPITAL_PROGRAMME,
  AML_DRAFT_PROGRAMME,
  OPS_REVIEW_PROGRAMME,
  CREDIT_RETIRED_PROGRAMME,
]

/** Library domains derived from the programme set (hierarchy facet). */
export const LIBRARY_DOMAINS: string[] = Array.from(
  new Set(LIBRARY_PROGRAMMES.map((p) => p.domainName)),
).sort()

// ---------------------------------------------------------------------------
// Document request templates (create-examination wizard step 5)
// ---------------------------------------------------------------------------

export const DOCUMENT_REQUEST_TEMPLATES: DocumentRequestTemplate[] = [
  {
    id: demoUuid(51, 1),
    name: 'AML/CFT thematic request pack',
    documents: [
      'Transaction monitoring rule inventory (Excel)',
      'AML business-wide risk assessment (PDF)',
      'STR register extract for the review period',
      'Sanctions screening hit-resolution log',
      'CDD periodic refresh tracker by risk tier',
    ],
  },
  {
    id: demoUuid(51, 2),
    name: 'Credit file sample pack',
    documents: [
      'Credit policy and delegation-of-authority matrix',
      'Ageing and classification report (month-end)',
      'Collateral valuation register',
      'Restructured facilities list',
      'Large-exposure concentration report',
    ],
  },
  {
    id: demoUuid(51, 3),
    name: 'Liquidity risk pack',
    documents: [
      'Daily LCR computation for the alert window',
      'Contingency funding plan and last exercise report',
      'ALCO minutes for the review period',
      'Deposit concentration report (top 10 obligors)',
      'Intraday liquidity position reports',
    ],
  },
  {
    id: demoUuid(51, 4),
    name: 'Cyber resilience pack',
    documents: [
      'Third-party risk register with assurance status',
      'External API inventory and security review records',
      'Incident response plan and exercise logs',
      'Privileged access inventory and quarterly reviews',
      'Board cyber reporting pack',
    ],
  },
  {
    id: demoUuid(51, 5),
    name: 'Governance pack',
    documents: [
      'Board and committee minutes for the review period',
      'Director independence declarations',
      'Committee terms of reference',
      'Fit-and-proper assessment records',
      'Shariah board minutes (where applicable)',
    ],
  },
]
