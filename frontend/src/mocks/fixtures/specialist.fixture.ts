/**
 * Specialist supervisory domain fixtures (Spec §9, Phase 4B). Domain
 * configurations for corporate governance (§9.1), enterprise risk
 * management (§9.2) and IT & cybersecurity (§9.3) plus a seeded assessment
 * population telling the same story as the rest of the dataset:
 * - Governance: Unity assessment runs alongside EXM-2026-021 (FND-2026-118
 *   Shariah minutes), Meridian board-risk-reporting thematic (FND-2026-109),
 *   Vanguard 2025 history (FND-2026-037 → CAP-2026-007 → ENF-2026-002).
 * - ERM: Northstar targeted review aligned to EWA-2026-011/EXM-2026-024,
 *   Vanguard 2025 full assessment (FND-2026-035, FND-2026-030), Crestline
 *   maturity assessment (operational resilience ↔ FND-2026-062).
 * - Cyber: Crestline maturity assessment alongside EXM-2026-005
 *   (FND-2026-066 → CAP-2026-008), Meridian 2025 thematic history.
 * Phase 4C completes the six domains: AML/CFT/CPF (§9.4 — Meridian targeted
 * assessment alongside EXM-2026-014 → FND-2026-101/107 → CAP-2026-003,
 * templates mirroring LIB-AML-002 AML-01…06), operations (§9.5 — templates
 * mirroring LIB-OPS-001, anchored to FND-2026-062/091/051/039) and
 * consumer protection (§9.6 — no library programme; templates cite the
 * MBA/CPC/2025 requirements directly, anchored to OBL-2026-007).
 * Checklist templates mirror the examination library programmes
 * (LIB-GOV-001 GOV-01…04, LIB-CYB-001 CYB-01…04, LIB-AML-002 AML-01…06)
 * and cite §10.1 requirements so the Phase-4 acceptance mapping renders
 * both directions. All data is fictional demo content (Spec §17.5); AML
 * sample cases are fictional and anonymised (Spec §9.4).
 */
import { demoUuid, isoDay } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { relationFromRef } from '@/mocks/fixtures/regulatory.fixture'
import type { SupervisoryDomain } from '@/types/regulatory'
import type {
  ChecklistItemStatus,
  SpecialistAssessment,
  SpecialistAssessmentStatus,
  SpecialistAssessmentType,
  SpecialistDomainSpec,
  SpecialistChecklistItem,
  SpecialistConclusion,
  SpecialistEvidenceItem,
  SpecialistEvidenceKind,
  SpecialistEvidenceStatus,
  SpecialistMaturity,
  SpecialistReport,
  SpecialistReportSection,
  SpecialistReportStatus,
} from '@/types/specialist'

export const STORAGE_NOTE =
  'Simulated record — the prototype stores no real file and sends nothing (Spec §17.4).'

/** Demo maturity scale (illustrative only — never an official rating). */
export const MATURITY_LABELS = ['Initial', 'Developing', 'Defined', 'Managed', 'Optimised']

export const maturityFor = (score: number): SpecialistMaturity => ({
  score: Math.min(5, Math.max(1, Math.round(score))),
  label: MATURITY_LABELS[Math.min(5, Math.max(1, Math.round(score))) - 1],
})

// ---------------------------------------------------------------------------
// Domain configuration (Spec §9.1–§9.6 submodules).
// The config interfaces live in types/specialist.ts so components consume
// them via the service contract, never from fixtures (Spec §18.3).
// ---------------------------------------------------------------------------

export type {
  SpecialistChecklistTemplate,
  SpecialistDomainSpec,
  SpecialistSubmodule,
} from '@/types/specialist'

export const SPECIALIST_DOMAINS: Partial<Record<SupervisoryDomain, SpecialistDomainSpec>> = {
  governance: {
    domain: 'governance',
    label: 'Corporate Governance',
    specRef: '§9.1',
    route: '/app/specialist/governance',
    refPrefix: 'GOVA',
    intro:
      'Supervision of board composition, director fit-and-proper status, committee effectiveness, executive management, conflicts of interest, related-party governance, succession planning and governance policies (Spec §9.1).',
    libraryProgrammeCode: 'LIB-GOV-001',
    findingCategories: ['Governance'],
    submodules: [
      { key: 'board-composition', label: 'Board composition', description: 'Size, independence, tenure and skills mix of the board.' },
      { key: 'fit-proper', label: 'Director fit-and-proper assessments', description: 'Assessment at appointment and biennial refresh (demo cycle).' },
      { key: 'board-committees', label: 'Board committees', description: 'Terms of reference, membership and quality of challenge.' },
      { key: 'board-effectiveness', label: 'Board effectiveness', description: 'Annual evaluation and follow-up on recommendations.' },
      { key: 'executive-management', label: 'Executive management', description: 'Management structure, delegations and oversight.' },
      { key: 'conflict-of-interest', label: 'Conflict of interest', description: 'Declarations register and abstention discipline.' },
      { key: 'related-party', label: 'Related-party governance', description: 'Board approval and recusal on related-party matters.' },
      { key: 'succession-planning', label: 'Succession planning', description: 'Board and key-officer succession pipelines.' },
      { key: 'governance-policies', label: 'Governance policies', description: 'Policy framework incl. Shariah governance for non-interest banks.' },
    ],
    checklistTemplates: [
      {
        code: 'GOV-01',
        submoduleKey: 'board-composition',
        title: 'Board composition and independence',
        objective: 'Confirm board composition meets the demo independence and tenure rules.',
        procedureQuestion:
          'Are independent directors within the demo ratio, tenures within limits, and fit-and-proper assessments current?',
        testSteps: ['Obtain the board register.', 'Verify independence declarations.', 'Inspect fit-and-proper files.'],
        method: 'Inspection',
        sample: 'All directors',
        priority: 'High',
        criteriaRef: 'MBA/GOV/2024 §2.1',
        requirementCitations: ['MBA/GOV/2024 §2.1'],
        expectedEvidence: ['Board register', 'Independence declarations', 'Fit-and-proper files'],
      },
      {
        code: 'GOV-02',
        submoduleKey: 'board-committees',
        title: 'Risk committee effectiveness',
        objective: 'Test that the board risk committee receives timely, complete risk reporting and documents challenge.',
        procedureQuestion:
          'Do minutes evidence review of key risk reports within the demo 30-day timeliness standard and recorded challenge of management assumptions?',
        testSteps: ['Sample committee minutes for the period.', 'Trace risk reports to submission dates.', 'Score challenge quality with the rubric.'],
        method: 'Minutes inspection',
        sample: 'All meetings in the review period',
        priority: 'High',
        criteriaRef: 'MBA/GOV/2024 §2.1',
        requirementCitations: ['MBA/GOV/2024 §3.2'],
        expectedEvidence: ['Committee minutes', 'Risk report transmittals', 'Management responses'],
      },
      {
        code: 'GOV-03',
        submoduleKey: 'governance-policies',
        title: 'Shariah governance arrangements',
        objective: 'For non-interest banks, verify Shariah board approvals are documented for products and investments.',
        procedureQuestion:
          'Does every investment-account product carry documented Shariah board rationale and periodic review?',
        testSteps: ['Obtain the product register.', 'Sample approvals and inspect rationale.', 'Check periodic review calendar.'],
        method: 'Attribute sampling',
        sample: 'All products launched in the period',
        priority: 'Medium',
        criteriaRef: 'MBA/NIB/2023 §4.4',
        requirementCitations: ['MBA/NIB/2023 §4.4'],
        expectedEvidence: ['Shariah board minutes', 'Product approval files', 'Review calendar'],
      },
      {
        code: 'GOV-04',
        submoduleKey: 'conflict-of-interest',
        title: 'Conflicts of interest management',
        objective: 'Confirm the conflicts register is maintained and related-party decisions record abstentions.',
        procedureQuestion: 'Are conflicts declared annually, and do minutes show abstention on related-party matters?',
        testSteps: ['Inspect the conflicts register and declarations.', 'Sample related-party decisions in minutes.', 'Verify abstention recording.'],
        method: 'Inspection',
        sample: 'All related-party decisions in the period',
        priority: 'Medium',
        criteriaRef: 'MBA/GOV/2024 §2.1',
        requirementCitations: ['MBA/GOV/2024 §2.1'],
        expectedEvidence: ['Conflicts register', 'Annual declarations', 'Board minutes'],
      },
      {
        code: 'GOV-05',
        submoduleKey: 'fit-proper',
        title: 'Fit-and-proper assessment currency',
        objective: 'Verify the fit-and-proper register is complete and refreshes are within the demo biennial cycle.',
        procedureQuestion: 'Does every director and key officer hold a current fit-and-proper assessment on the register?',
        testSteps: ['Obtain the fit-and-proper register.', 'Sample expiring assessments.', 'Inspect appointment approval records.'],
        method: 'Inspection and sampling',
        sample: '15 register entries',
        priority: 'High',
        criteriaRef: 'MBA/GOV/2024 §2.1',
        requirementCitations: ['MBA/GOV/2024 §4.1'],
        expectedEvidence: ['Fit-and-proper register', 'Assessment questionnaires', 'Appointment approvals'],
      },
      {
        code: 'GOV-06',
        submoduleKey: 'succession-planning',
        title: 'Board evaluation and succession planning',
        objective: 'Confirm the annual board evaluation was performed and succession pipelines exist for key roles.',
        procedureQuestion: 'Is the latest board evaluation reported to the Authority, with recommendations tracked and succession plans documented?',
        testSteps: ['Inspect the board evaluation report.', 'Trace recommendation follow-up.', 'Review succession plans for chair/CEO/CRO.'],
        method: 'Inspection',
        sample: 'Latest evaluation cycle',
        priority: 'Medium',
        criteriaRef: 'MBA/GOV/2024 §2.1',
        requirementCitations: ['MBA/GOV/2024 §2.1'],
        expectedEvidence: ['Board evaluation report', 'Recommendation tracker', 'Succession plans'],
      },
    ],
    evidenceKinds: ['Policy', 'Minutes', 'Register extract', 'Report', 'Other'],
  },

  erm: {
    domain: 'erm',
    label: 'Enterprise Risk Management',
    specRef: '§9.2',
    route: '/app/specialist/erm',
    refPrefix: 'ERMA',
    intro:
      'Supervision of the ERM framework, risk appetite, risk register, risk governance, KRIs and limits, stress testing, risk aggregation and operational resilience (Spec §9.2).',
    findingCategories: ['Liquidity', 'Capital', 'Operations'],
    submodules: [
      { key: 'erm-framework', label: 'ERM framework', description: 'Board-approved framework covering all material risk types.' },
      { key: 'risk-appetite', label: 'Risk appetite', description: 'Appetite statement, calibration and board approval.' },
      { key: 'risk-register', label: 'Risk register assessment', description: 'Completeness and quality of the enterprise risk register.' },
      { key: 'risk-governance', label: 'Risk governance', description: 'Three-lines model, risk committee and CRO standing.' },
      { key: 'kris-limits', label: 'KRIs and limits', description: 'Indicator suite, limit framework and breach escalation.' },
      { key: 'stress-testing', label: 'Stress testing', description: 'Scenario governance, reverse stress tests and use of results.' },
      { key: 'risk-aggregation', label: 'Risk aggregation', description: 'Risk data aggregation and reporting quality.' },
      { key: 'operational-resilience', label: 'Operational resilience', description: 'Critical services, contingency funding and recovery planning.' },
    ],
    checklistTemplates: [
      {
        code: 'ERM-01',
        submoduleKey: 'erm-framework',
        title: 'ERM framework and risk governance',
        objective: 'Assess whether the ERM framework is board-approved, covers all material risk types and is independently reviewed.',
        procedureQuestion: 'Is the framework current, does the three-lines model operate as documented, and was the annual independent review completed?',
        testSteps: ['Inspect the ERM framework document.', 'Verify board approval and review dates.', 'Sample independent review findings and follow-up.'],
        method: 'Inspection',
        sample: 'Current framework plus last review',
        priority: 'High',
        criteriaRef: 'MBA/PRU/2024 §2.1',
        requirementCitations: ['MBA/PRU/2024 §2.1'],
        expectedEvidence: ['ERM framework document', 'Risk governance structure chart', 'Independent review report'],
      },
      {
        code: 'ERM-02',
        submoduleKey: 'risk-appetite',
        title: 'Risk appetite statement calibration',
        objective: 'Verify the risk appetite statement is quantified, board-approved and linked to limits.',
        procedureQuestion: 'Are appetite metrics quantified with early-warning thresholds, approved within the demo annual cycle and cascaded to business limits?',
        testSteps: ['Inspect the appetite statement.', 'Trace metrics to the limit framework.', 'Review board approval and challenge minutes.'],
        method: 'Inspection and tracing',
        sample: 'All appetite metrics',
        priority: 'High',
        criteriaRef: 'MBA/PRU/2024 §2.4',
        requirementCitations: ['MBA/PRU/2024 §2.4'],
        expectedEvidence: ['Risk appetite statement', 'Limit framework extract', 'Board approval minutes'],
      },
      {
        code: 'ERM-03',
        submoduleKey: 'kris-limits',
        title: 'KRI monitoring and limit-breach escalation',
        objective: 'Test that key risk indicators are monitored and breaches escalate within the demo 24-hour standard.',
        procedureQuestion: 'Do KRI packs evidence monitoring cadence, and were sampled breaches escalated to ALCO/board risk committee on time?',
        testSteps: ['Obtain the KRI inventory and packs.', 'Sample limit breaches for the period.', 'Trace escalation records and minutes.'],
        method: 'Sampling and tracing',
        sample: 'All breaches in the review period',
        priority: 'High',
        criteriaRef: 'MBA/PRU/2024 §2.4',
        requirementCitations: ['MBA/PRU/2024 §2.4'],
        expectedEvidence: ['KRI packs', 'Breach log', 'Escalation minutes'],
      },
      {
        code: 'ERM-04',
        submoduleKey: 'stress-testing',
        title: 'Stress-testing and scenario governance',
        objective: 'Assess the stress-testing programme, reverse stress tests and how results inform capital and funding plans.',
        procedureQuestion: 'Is there a board-approved scenario suite with reverse stress tests, and do results feed the capital plan and contingency funding plan?',
        testSteps: ['Inspect the scenario suite and governance.', 'Review reverse stress test outputs.', 'Trace results into capital/CFP documents.'],
        method: 'Inspection',
        sample: 'Latest annual cycle',
        priority: 'Medium',
        criteriaRef: 'MBA/PRU/2024 §10.2',
        requirementCitations: ['MBA/PRU/2024 §10.2', 'MBA/PRU/2024 §9.4'],
        expectedEvidence: ['Scenario documentation', 'Stress results pack', 'Board risk committee minutes'],
      },
      {
        code: 'ERM-05',
        submoduleKey: 'risk-aggregation',
        title: 'Risk data aggregation and reporting',
        objective: 'Verify risk data aggregation supports timely, complete board and supervisory reporting.',
        procedureQuestion: 'Are risk data sources reconciled, and do board risk packs reconcile to submitted returns without unexplained breaks?',
        testSteps: ['Inspect data lineage documentation.', 'Reconcile a sample of board pack figures to returns.', 'Review break-resolution log.'],
        method: 'Re-computation',
        sample: 'Two reporting cycles',
        priority: 'Medium',
        criteriaRef: 'MBA/PRU/2024 §2.1',
        requirementCitations: ['MBA/PRU/2024 §2.1'],
        expectedEvidence: ['Data lineage documentation', 'Board risk packs', 'Reconciliation logs'],
      },
      {
        code: 'ERM-06',
        submoduleKey: 'operational-resilience',
        title: 'Operational resilience and contingency planning',
        objective: 'Test critical-service identification, contingency funding plan maintenance and testing cadence.',
        procedureQuestion: 'Are critical services mapped with impact tolerances, and was the CFP stress-tested within the demo quarterly standard?',
        testSteps: ['Inspect critical-services register.', 'Review latest CFP test report.', 'Check ALCO and board reporting of results.'],
        method: 'Inspection',
        sample: 'Latest four quarters',
        priority: 'High',
        criteriaRef: 'MBA/PRU/2024 §9.4',
        requirementCitations: ['MBA/PRU/2024 §9.4'],
        expectedEvidence: ['Critical-services register', 'CFP test reports', 'ALCO minutes'],
      },
    ],
    evidenceKinds: ['Policy', 'Report', 'Register extract', 'Minutes', 'Other'],
  },

  cybersecurity: {
    domain: 'cybersecurity',
    label: 'IT & Cybersecurity',
    specRef: '§9.3',
    route: '/app/specialist/cybersecurity',
    refPrefix: 'CYBA',
    intro:
      'Supervision of IT governance, technology risk, infrastructure, identity and privileged access, network/database/application security, vulnerability management, SOC/SIEM, incident response, BC/DR, cloud and third-party technology, data protection and AI governance (Spec §9.3).',
    libraryProgrammeCode: 'LIB-CYB-001',
    findingCategories: ['Cybersecurity'],
    submodules: [
      { key: 'it-governance', label: 'IT governance', description: 'Technology strategy, board reporting and IT risk ownership.' },
      { key: 'it-risk', label: 'IT risk management', description: 'Technology risk framework, register and independent assessment.' },
      { key: 'infrastructure', label: 'Infrastructure and architecture', description: 'Core architecture resilience and segmentation.' },
      { key: 'iam', label: 'Identity and access management', description: 'Joiner/mover/leaver controls and access reviews.' },
      { key: 'privileged-access', label: 'Privileged access', description: 'PAM inventory, quarterly reviews and time-bound access.' },
      { key: 'network-security', label: 'Network security', description: 'Perimeter, segmentation and monitoring controls.' },
      { key: 'database-security', label: 'Database security', description: 'Hardening, encryption and activity monitoring.' },
      { key: 'application-security', label: 'Application security', description: 'SDLC security gates and API security reviews.' },
      { key: 'vulnerability-management', label: 'Vulnerability management', description: 'Scanning cadence, patch SLAs and penetration testing.' },
      { key: 'soc-siem', label: 'SOC/SIEM and threat monitoring', description: 'Detection coverage, alert triage and threat intelligence.' },
      { key: 'incident-response', label: 'Incident response', description: 'IR plan, severity matrix, exercises and regulator notification.' },
      { key: 'bcp-dr', label: 'Business continuity and disaster recovery', description: 'DR tests, RTO/RPO evidence and remediation tracking.' },
      { key: 'cloud-third-party', label: 'Cloud and third-party technology', description: 'Third-party register, assurance and exit plans.' },
      { key: 'data-protection', label: 'Data protection', description: 'Data classification, privacy obligations and breach handling.' },
      { key: 'ai-emerging', label: 'AI and emerging technology governance', description: 'Model inventory, risk assessment and approval gates.' },
    ],
    checklistTemplates: [
      {
        code: 'CYB-01',
        submoduleKey: 'cloud-third-party',
        title: 'Third-party risk register completeness',
        objective: 'Verify all material technology third parties are registered with current assurance.',
        procedureQuestion:
          'Does the register include every integrated third party (incl. recent additions), with risk tiering and assurance reviews within the demo annual standard?',
        testSteps: ['Obtain the register and the integration/change log.', 'Reconcile new integrations to register entries.', 'Inspect assurance currency for material parties.'],
        method: 'Reconciliation',
        sample: 'All material third parties',
        priority: 'High',
        criteriaRef: 'MBA/CYB/2025 §5.2',
        requirementCitations: ['MBA/CYB/2025 §5.2'],
        expectedEvidence: ['Third-party risk register', 'Integration change log', 'Assurance reports'],
      },
      {
        code: 'CYB-02',
        submoduleKey: 'application-security',
        title: 'API security review',
        objective: 'Confirm external APIs have documented security reviews and authenticated access controls.',
        procedureQuestion: 'Is there an API inventory with a security review per API within the demo 12-month standard, and are keys/secrets managed per policy?',
        testSteps: ['Obtain the API inventory.', 'Sample external APIs and inspect review records.', 'Walk through key management configuration.'],
        method: 'Inspection and walkthrough',
        sample: 'All external-facing APIs',
        priority: 'High',
        criteriaRef: 'MBA/CYB/2025 §3.1',
        requirementCitations: ['MBA/CYB/2025 §3.1'],
        expectedEvidence: ['API inventory', 'Security review records', 'Key management screenshots (demo)'],
      },
      {
        code: 'CYB-03',
        submoduleKey: 'incident-response',
        title: 'Incident response readiness',
        objective: 'Test the incident response plan against the demo severity matrix and the last exercise record.',
        procedureQuestion: 'Are roles, escalation timelines and regulator notification duties defined and exercised within the demo annual standard?',
        testSteps: ['Inspect the IR plan and severity matrix.', 'Review the last tabletop exercise outcomes.', 'Check remediation of exercise findings.'],
        method: 'Inspection',
        sample: 'Current plan plus last two exercises',
        priority: 'Medium',
        criteriaRef: 'MBA/CYB/2025 §3.1',
        requirementCitations: ['MBA/CYB/2025 §6.1'],
        expectedEvidence: ['Incident response plan', 'Exercise report', 'Remediation tracker'],
      },
      {
        code: 'CYB-04',
        submoduleKey: 'privileged-access',
        title: 'Privileged access management',
        objective: 'Verify privileged access is inventoried, reviewed quarterly and time-bound where required.',
        procedureQuestion: 'Do quarterly access reviews evidence removal of leavers and rotation of shared admin credentials within the demo 90-day standard?',
        testSteps: ['Obtain the privileged access inventory.', 'Inspect the last two quarterly reviews.', 'Sample leaver records for timely revocation.'],
        method: 'Inspection and sampling',
        sample: '2 quarterly reviews; 15 leaver records',
        priority: 'High',
        criteriaRef: 'MBA/CYB/2025 §3.1',
        requirementCitations: ['MBA/CYB/2025 §3.1'],
        expectedEvidence: ['PAM inventory', 'Review records', 'Leaver list (demo)'],
      },
      {
        code: 'CYB-05',
        submoduleKey: 'vulnerability-management',
        title: 'Vulnerability and penetration testing register',
        objective: 'Assess scanning cadence, patch SLAs and remediation of penetration test findings.',
        procedureQuestion: 'Are scans run within the demo monthly cadence, critical patches within the demo 14-day SLA, and pentest findings tracked to closure?',
        testSteps: ['Inspect the vulnerability register and scan schedule.', 'Sample critical vulnerabilities for SLA compliance.', 'Trace latest pentest findings to remediation.'],
        method: 'Sampling',
        sample: 'All critical items in the period',
        priority: 'High',
        criteriaRef: 'MBA/CYB/2025 §3.1',
        requirementCitations: ['MBA/CYB/2025 §3.1'],
        expectedEvidence: ['Vulnerability report', 'Patch SLA statistics', 'Penetration test report'],
      },
      {
        code: 'CYB-06',
        submoduleKey: 'bcp-dr',
        title: 'DR/BCP testing',
        objective: 'Verify DR tests evidence RTO/RPO achievement and remediation of test gaps.',
        procedureQuestion: 'Was a DR test performed within the demo annual standard with measured RTO/RPO against targets, and were gaps remediated?',
        testSteps: ['Inspect the DR test plan and latest report.', 'Compare measured RTO/RPO to targets.', 'Check the gap remediation tracker.'],
        method: 'Inspection',
        sample: 'Latest DR test cycle',
        priority: 'Medium',
        criteriaRef: 'MBA/CYB/2025 §3.1',
        requirementCitations: ['MBA/CYB/2025 §3.1'],
        expectedEvidence: ['DR test', 'RTO/RPO measurements', 'Remediation tracker'],
      },
    ],
    evidenceKinds: [
      'Policy',
      'Architecture diagram',
      'Access review',
      'Vulnerability report',
      'Incident log',
      'SOC alert',
      'DR test',
      'Third-party assurance',
      'Register extract',
      'Report',
      'Other',
    ],
  },

  aml: {
    domain: 'aml',
    label: 'AML/CFT/CPF',
    specRef: '§9.4',
    route: '/app/specialist/aml',
    refPrefix: 'AMLA',
    intro:
      'Supervision of ML/TF/PF risk assessment, CDD/KYC/EDD, beneficial ownership, PEP and sanctions screening, transaction monitoring, suspicious transaction reporting, correspondent banking, AML governance and training, and independent AML review (Spec §9.4). All sample case data is fictional and anonymised.',
    libraryProgrammeCode: 'LIB-AML-002',
    findingCategories: ['AML/CFT'],
    submodules: [
      { key: 'ml-tf-pf-risk', label: 'ML/TF/PF risk assessment', description: 'Business-wide money-laundering, terrorist-financing and proliferation-financing risk assessment.' },
      { key: 'cdd-kyc-edd', label: 'CDD/KYC/EDD', description: 'Customer due diligence at onboarding, periodic refresh and enhanced due diligence for high-risk relationships.' },
      { key: 'beneficial-ownership', label: 'Beneficial ownership', description: 'Identification and validation of beneficial owners at onboarding and on change events.' },
      { key: 'pep-sanctions', label: 'PEP and sanctions screening', description: 'Screening triggers, demo watchlist coverage and hit-resolution discipline.' },
      { key: 'transaction-monitoring', label: 'Transaction monitoring', description: 'Rule inventory, calibration governance and alert handling timeliness.' },
      { key: 'str-reporting', label: 'Suspicious transaction reporting', description: 'STR pipeline quality, filing timelines and no-file rationale.' },
      { key: 'correspondent-banking', label: 'Correspondent banking', description: 'Due diligence on correspondent relationships and payable-through arrangements.' },
      { key: 'aml-governance-training', label: 'AML governance and training', description: 'Compliance function standing, board reporting and staff training currency.' },
      { key: 'independent-aml-review', label: 'Independent AML review', description: 'Annual independent audit of the AML/CFT control framework.' },
    ],
    checklistTemplates: [
      {
        code: 'AML-01',
        submoduleKey: 'transaction-monitoring',
        title: 'Transaction monitoring rule coverage',
        objective: 'Confirm the monitoring rule inventory covers the institution\u2019s declared high-risk scenarios with evidenced thresholds.',
        procedureQuestion:
          'Do transaction monitoring rules cover all high-risk scenarios in the institution\u2019s risk assessment, and are thresholds evidenced and tuned?',
        testSteps: ['Obtain the rule inventory and the business-wide AML risk assessment.', 'Map each declared high-risk scenario to at least one monitoring rule.', 'Review tuning records for the last four demo quarters.', 'Re-perform monitoring on a seeded test population (demo data).'],
        method: 'Re-performance and document review',
        sample: 'All monitoring rules; 4 quarters of tuning records',
        priority: 'High',
        criteriaRef: 'MBA/AML/2023 §6.3',
        requirementCitations: ['MBA/AML/2023 §6.3'],
        expectedEvidence: ['Rule inventory export', 'Risk assessment extract', 'Tuning committee minutes', 'Test-run output'],
      },
      {
        code: 'AML-02',
        submoduleKey: 'transaction-monitoring',
        title: 'Monitoring alert handling timeliness',
        objective: 'Test whether alerts are reviewed and dispositioned within the demo 5-business-day standard.',
        procedureQuestion: 'Are monitoring alerts assigned, investigated and dispositioned within policy timelines, with rationale documented?',
        testSteps: ['Extract the alert queue for the review period (demo system report).', 'Sample alerts across severity bands.', 'Recompute handling time from alert creation to disposition.', 'Inspect disposition rationale for completeness.'],
        method: 'Attribute sampling',
        sample: '40 alerts (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/AML/2023 §6.3',
        requirementCitations: ['MBA/AML/2023 §6.3'],
        expectedEvidence: ['Alert queue extract', 'Disposition records', 'Analyst workload report'],
      },
      {
        code: 'AML-03',
        submoduleKey: 'cdd-kyc-edd',
        title: 'CDD periodic refresh backlog',
        objective: 'Verify periodic CDD refresh is performed on schedule for each risk tier and any backlog is remediated.',
        procedureQuestion: 'Is the periodic refresh completed within the demo cycles (1/3/5 years by risk tier), and is any backlog tracked and remediated?',
        testSteps: ['Obtain the refresh tracker by risk tier.', 'Sample high-risk customers overdue for refresh.', 'Check remediation plans and board reporting of the backlog.'],
        method: 'Attribute sampling',
        sample: '60 customer files (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/AML/2023 §4.1',
        requirementCitations: ['MBA/AML/2023 §4.1'],
        expectedEvidence: ['Refresh tracker', 'Customer file sample', 'Backlog remediation plan'],
      },
      {
        code: 'AML-04',
        submoduleKey: 'pep-sanctions',
        title: 'Sanctions screening effectiveness',
        objective: 'Confirm screening runs at onboarding, on list updates and periodically over the customer base.',
        procedureQuestion: 'Are customers and counterparties screened against current demo sanctions lists at the required triggers, and are true matches escalated correctly?',
        testSteps: ['Inspect screening system trigger configuration.', 'Re-perform screening for a sample of customers against the demo list.', 'Review hit-resolution records for false-positive rationale.'],
        method: 'Re-performance',
        sample: '25 customers plus 10 list-update events',
        priority: 'High',
        criteriaRef: 'MBA/AML/2024 §2.2',
        requirementCitations: ['MBA/AML/2023 §2.2 (2024 amendment)'],
        expectedEvidence: ['Screening configuration', 'Hit-resolution log', 'List-update audit trail'],
      },
      {
        code: 'AML-05',
        submoduleKey: 'str-reporting',
        title: 'STR quality and timeliness',
        objective: 'Assess whether suspicious transaction reports are filed within the demo standard with complete narratives.',
        procedureQuestion: 'Are STRs filed on time with sufficient narrative quality, and is the decision not to file documented?',
        testSteps: ['Obtain the STR register for the review period.', 'Sample filed STRs and assess narrative completeness against the demo quality rubric.', 'Sample escalated cases not filed and inspect the documented rationale.'],
        method: 'Attribute sampling',
        sample: '15 STRs (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/AML/2024 §2.2',
        requirementCitations: ['MBA/AML/2023 §2.2 (2024 amendment)'],
        expectedEvidence: ['STR register', 'Filed STR samples', 'No-file rationale records'],
      },
      {
        code: 'AML-06',
        submoduleKey: 'cdd-kyc-edd',
        title: 'High-risk customer enhanced due diligence',
        objective: 'Verify EDD is applied and documented for PEPs and other high-risk relationships.',
        procedureQuestion: 'Do high-risk and PEP relationships carry documented EDD, senior-management approval and source-of-wealth evidence?',
        testSteps: ['Extract the high-risk/PEP population from the demo CRM.', 'Sample relationships and inspect EDD documentation.', 'Confirm senior-management sign-off records.'],
        method: 'Attribute sampling',
        sample: '20 high-risk relationships',
        priority: 'Medium',
        criteriaRef: 'MBA/AML/2023 §4.1',
        requirementCitations: ['MBA/AML/2023 §4.1', 'MBA/AML/2023 §5.1'],
        expectedEvidence: ['PEP register', 'EDD file samples', 'Approval records'],
      },
    ],
    evidenceKinds: ['Policy', 'Register extract', 'Report', 'Minutes', 'Other'],
  },

  operations: {
    domain: 'operations',
    label: 'Operations & Internal Controls',
    specRef: '§9.5',
    route: '/app/specialist/operations',
    refPrefix: 'OPSA',
    intro:
      'Supervision of branch operations, cash/vault, transaction processing, maker-checker, reconciliations, general ledger and suspense, fraud management, operational losses, internal audit effectiveness and outsourced operations (Spec §9.5).',
    libraryProgrammeCode: 'LIB-OPS-001',
    findingCategories: ['Operations'],
    submodules: [
      { key: 'branch-operations', label: 'Branch operations', description: 'Branch control environment, supervision and operational discipline.' },
      { key: 'cash-vault', label: 'Cash/vault', description: 'Cash holding limits, vault access and custody controls.' },
      { key: 'transaction-processing', label: 'Transaction processing', description: 'Processing accuracy, exception handling and dealing mandates.' },
      { key: 'maker-checker', label: 'Maker-checker', description: 'Dual-control discipline over high-risk transaction types.' },
      { key: 'reconciliations', label: 'Reconciliations', description: 'Internal and external reconciliation timeliness and break resolution.' },
      { key: 'gl-suspense', label: 'General ledger and suspense', description: 'Suspense account ageing, ownership and clearance discipline.' },
      { key: 'fraud-management', label: 'Fraud management', description: 'Fraud detection, case management and loss reporting.' },
      { key: 'operational-losses', label: 'Operational losses', description: 'Loss data capture, materiality escalation and root-cause analysis.' },
      { key: 'internal-audit', label: 'Internal audit effectiveness', description: 'Internal audit coverage, independence and finding remediation.' },
      { key: 'outsourced-operations', label: 'Outsourced operations', description: 'Outsourcing and agent-network operational controls and oversight.' },
    ],
    checklistTemplates: [
      {
        code: 'OPS-01',
        submoduleKey: 'cash-vault',
        title: 'Branch cash limit compliance',
        objective: 'Test branch cash holdings against approved limits and escalation of breaches.',
        procedureQuestion: 'Are cash-holding limit breaches detected same-day and escalated per the demo standard?',
        testSteps: ['Obtain daily cash position reports.', 'Identify limit breaches.', 'Trace escalation records.'],
        method: 'Re-performance',
        sample: 'All branches for one quarter',
        priority: 'Medium',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/OPS/2026 §2.1'],
        expectedEvidence: ['Cash position reports', 'Escalation log'],
      },
      {
        code: 'OPS-02',
        submoduleKey: 'outsourced-operations',
        title: 'Agent network onboarding controls',
        objective: 'Verify agents complete documented background checks and training certification before onboarding.',
        procedureQuestion: 'Does the central agent register evidence completed background checks and training certification for every onboarded agent (demo standard)?',
        testSteps: ['Obtain the agent register and onboarding log.', 'Sample agents onboarded in the period.', 'Inspect background-check and certification records.'],
        method: 'Attribute sampling',
        sample: '50 agent files (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/PSB/2026 §2.3 (draft)'],
        expectedEvidence: ['Agent register extract', 'Background check completion log', 'Training certification records'],
      },
      {
        code: 'OPS-03',
        submoduleKey: 'reconciliations',
        title: 'Float and trust account reconciliation',
        objective: 'Test daily reconciliation of agent float and customer trust accounts with same-day escalation of material breaks.',
        procedureQuestion: 'Are float and trust accounts reconciled daily with independent custody confirmation, and are unreconciled differences above the demo materiality threshold escalated same-day?',
        testSteps: ['Obtain daily reconciliation packs for the period.', 'Sample breaks above materiality.', 'Trace escalation and resolution records.'],
        method: 'Re-computation and tracing',
        sample: 'Two months of daily packs',
        priority: 'High',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/PSB/2026 §3.1 (draft)'],
        expectedEvidence: ['Daily reconciliation packs', 'Custodian confirmation statements', 'Escalation log for unreconciled differences'],
      },
      {
        code: 'OPS-04',
        submoduleKey: 'maker-checker',
        title: 'Maker-checker over high-risk transactions',
        objective: 'Confirm dual control operates over high-risk transaction types with no self-approval.',
        procedureQuestion: 'Do sampled high-risk transactions evidence independent checker approval, and are self-approvals technically prevented (demo standard)?',
        testSteps: ['Extract high-risk transaction population.', 'Sample for maker/checker identity.', 'Walk through system entitlement configuration.'],
        method: 'Attribute sampling and walkthrough',
        sample: '40 transactions (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/OPS/2026 §2.1'],
        expectedEvidence: ['Transaction extract', 'Entitlement configuration', 'Exception reports'],
      },
      {
        code: 'OPS-05',
        submoduleKey: 'transaction-processing',
        title: 'Dealing mandate and limit-breach escalation',
        objective: 'Test that dealing-limit breaches are detected and escalated to ALCO within the demo 24-hour standard.',
        procedureQuestion: 'Were intraday dealing-limit breaches escalated within the demo 24-hour standard, with ALCO minutes evidencing review?',
        testSteps: ['Obtain the dealing mandate and breach log.', 'Sample breaches for the period.', 'Trace escalation records and ALCO minutes.'],
        method: 'Sampling and tracing',
        sample: 'All breaches in the review period',
        priority: 'High',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/OPS/2026 §2.1'],
        expectedEvidence: ['Breach log', 'Escalation records', 'ALCO minutes'],
      },
      {
        code: 'OPS-06',
        submoduleKey: 'internal-audit',
        title: 'Internal audit effectiveness and loss reporting',
        objective: 'Assess internal audit coverage of operational risk and the completeness of operational-loss capture.',
        procedureQuestion: 'Does the internal audit plan cover high-risk operational areas with timely remediation of findings, and are operational losses captured against the demo materiality threshold?',
        testSteps: ['Inspect the internal audit plan and completion record.', 'Sample audit findings for remediation timeliness.', 'Reconcile the loss register to financial records.'],
        method: 'Inspection and reconciliation',
        sample: 'Latest audit cycle plus four quarters of losses',
        priority: 'Medium',
        criteriaRef: 'MBA/OPS/2026 §2.1',
        requirementCitations: ['MBA/OPS/2026 §2.1'],
        expectedEvidence: ['Internal audit plan', 'Audit finding tracker', 'Operational loss register'],
      },
    ],
    evidenceKinds: ['Policy', 'Register extract', 'Report', 'Minutes', 'Other'],
  },

  'consumer-protection': {
    domain: 'consumer-protection',
    label: 'Consumer Protection',
    specRef: '§9.6',
    route: '/app/specialist/consumer-protection',
    refPrefix: 'CPA',
    intro:
      'Supervision of customer complaints, complaint resolution, fees and charges, customer disclosures, digital channel disputes, customer consent and privacy, fair treatment and consumer lending (Spec §9.6). Supports referral and ownership across departments — complaint themes owned by another supervisory department (e.g. agent-network operations under §9.5) are referred with a documented cross-domain note. No examination-library programme exists for this domain yet; checklist templates cite the MBA/CPC/2025 framework requirements directly.',
    findingCategories: ['Consumer Protection'],
    submodules: [
      { key: 'customer-complaints', label: 'Customer complaints', description: 'Complaint intake, registration and acknowledgement discipline.' },
      { key: 'complaint-resolution', label: 'Complaint resolution', description: 'Resolution against the demo 5-business-day standard and root-cause analysis.' },
      { key: 'fees-charges', label: 'Fees and charges', description: 'Tariff publication, disclosure at account opening and change notification.' },
      { key: 'customer-disclosures', label: 'Customer disclosures', description: 'Key-facts statements and product-term transparency.' },
      { key: 'digital-channel-disputes', label: 'Digital channel disputes', description: 'Dispute handling for app, USSD and agent-channel transactions.' },
      { key: 'consent-privacy', label: 'Customer consent and privacy', description: 'Consent capture, data-sharing disclosures and privacy complaint handling.' },
      { key: 'fair-treatment', label: 'Fair treatment', description: 'Plain-language terms, suitability and fair outcomes for retail customers.' },
      { key: 'consumer-lending', label: 'Consumer lending', description: 'Suitability assessment and responsible-lending practices for retail credit.' },
    ],
    checklistTemplates: [
      {
        code: 'CPC-01',
        submoduleKey: 'customer-complaints',
        title: 'Complaint handling timeliness',
        objective: 'Test that retail complaints are acknowledged within one business day and resolved within the demo 5-business-day standard.',
        procedureQuestion: 'Does the complaint register evidence acknowledgement within one business day and resolution within five (demo standards), with quarterly root-cause reporting?',
        testSteps: ['Obtain the complaint register for the period.', 'Sample complaints across channels.', 'Recompute acknowledgement and resolution timelines.', 'Inspect the quarterly root-cause report.'],
        method: 'Attribute sampling and re-computation',
        sample: '40 complaints (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/CPC/2025 §2.1',
        requirementCitations: ['MBA/CPC/2025 §2.1'],
        expectedEvidence: ['Complaint register with timestamps', 'Root-cause analysis reports', 'Quarterly complaint report'],
      },
      {
        code: 'CPC-02',
        submoduleKey: 'complaint-resolution',
        title: 'Complaint resolution quality and SLA breaches',
        objective: 'Assess resolution quality, repeat-complaint handling and the SLA breach register.',
        procedureQuestion: 'Are SLA breaches logged with reasons, and do repeat complaints trigger root-cause escalation (demo standard)?',
        testSteps: ['Inspect the SLA breach register.', 'Sample repeat complaints.', 'Trace root-cause escalation records.'],
        method: 'Inspection and sampling',
        sample: 'All breaches plus 15 repeat complaints',
        priority: 'Medium',
        criteriaRef: 'MBA/CPC/2025 §2.1',
        requirementCitations: ['MBA/CPC/2025 §2.1'],
        expectedEvidence: ['SLA breach register', 'Repeat-complaint log', 'Escalation records'],
      },
      {
        code: 'CPC-03',
        submoduleKey: 'fees-charges',
        title: 'Fee and charge disclosure',
        objective: 'Verify fees are disclosed in the standard demo tariff format at account opening and on the public website, with 30-day change notice.',
        procedureQuestion: 'Do account-opening packs and the website carry the current tariff schedule, and were fee changes notified 30 days in advance (demo standard)?',
        testSteps: ['Obtain the published tariff schedules.', 'Sample account-opening disclosure packs.', 'Trace change-notification evidence for fee changes in the period.'],
        method: 'Inspection and sampling',
        sample: '20 account-opening packs; all fee changes',
        priority: 'High',
        criteriaRef: 'MBA/CPC/2025 §3.1',
        requirementCitations: ['MBA/CPC/2025 §3.1'],
        expectedEvidence: ['Published tariff schedules', 'Account-opening disclosure samples', 'Customer change-notification evidence'],
      },
      {
        code: 'CPC-04',
        submoduleKey: 'digital-channel-disputes',
        title: 'Digital channel dispute handling',
        objective: 'Test dispute resolution for app, USSD and agent-channel transactions against the demo timelines.',
        procedureQuestion: 'Are digital-channel disputes resolved within the demo standard, with provisional credits applied where required and root causes fed back to channel owners?',
        testSteps: ['Extract the digital-dispute queue for the period.', 'Sample disputes across channels.', 'Inspect resolution timelines and provisional-credit records.', 'Trace root-cause feedback to channel owners.'],
        method: 'Attribute sampling',
        sample: '30 disputes (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/CPC/2025 §2.1',
        requirementCitations: ['MBA/CPC/2025 §2.1'],
        expectedEvidence: ['Dispute queue extract', 'Provisional-credit records', 'Root-cause feedback log'],
      },
      {
        code: 'CPC-05',
        submoduleKey: 'fair-treatment',
        title: 'Fair treatment and product transparency',
        objective: 'Verify product terms carry the standard demo key-facts statement and marketing material is approved.',
        procedureQuestion: 'Do retail products present plain-language key-facts statements, and does the marketing approval log evidence pre-publication review (demo standard)?',
        testSteps: ['Obtain the product register and key-facts templates.', 'Sample marketing material approvals.', 'Inspect suitability records for credit and investment-linked products.'],
        method: 'Inspection and sampling',
        sample: 'All retail products; 15 marketing items',
        priority: 'Medium',
        criteriaRef: 'MBA/CPC/2025 §4.2',
        requirementCitations: ['MBA/CPC/2025 §4.2'],
        expectedEvidence: ['Key-facts statement samples', 'Suitability assessment records', 'Marketing material approval log'],
      },
      {
        code: 'CPC-06',
        submoduleKey: 'consumer-lending',
        title: 'Consumer lending suitability',
        objective: 'Test that retail credit products carry documented suitability assessments and responsible-lending checks.',
        procedureQuestion: 'Do sampled consumer-lending files evidence suitability assessment, affordability checks and plain-language terms before disbursement (demo standard)?',
        testSteps: ['Extract the consumer-lending population.', 'Sample disbursed facilities.', 'Inspect suitability and affordability records.'],
        method: 'Attribute sampling',
        sample: '25 consumer-lending files (demo sample size)',
        priority: 'High',
        criteriaRef: 'MBA/CPC/2025 §4.2',
        requirementCitations: ['MBA/CPC/2025 §4.2'],
        expectedEvidence: ['Lending file samples', 'Suitability assessment records', 'Affordability computation sheets'],
      },
      {
        code: 'CPC-07',
        submoduleKey: 'customer-disclosures',
        title: 'Investment account risk disclosure (non-interest banks)',
        objective: 'For non-interest banks, verify profit-displacement and risk-sharing disclosures at onboarding and on methodology changes.',
        procedureQuestion: 'Do investment account holders receive the documented profit-displacement and risk-sharing disclosure at onboarding and on any methodology change (demo standard)?',
        testSteps: ['Obtain disclosure templates and the acknowledgement log.', 'Sample investment account openings.', 'Check the methodology change log for re-disclosure.'],
        method: 'Inspection and sampling',
        sample: '20 investment accounts',
        priority: 'Medium',
        criteriaRef: 'MBA/NIB/2023 §3.2',
        requirementCitations: ['MBA/NIB/2023 §3.2'],
        expectedEvidence: ['Disclosure templates and signed acknowledgements', 'Profit-sharing methodology change log'],
      },
    ],
    evidenceKinds: ['Policy', 'Register extract', 'Report', 'Minutes', 'Other'],
  },
}

// ---------------------------------------------------------------------------
// Assessment seeds
// ---------------------------------------------------------------------------

interface ChecklistSeed {
  status: ChecklistItemStatus
  assessorName?: string
  assessedOffset?: number
  note?: string
  findingRefs?: string[]
}

interface EvidenceSeed {
  name: string
  kind: SpecialistEvidenceKind
  status: SpecialistEvidenceStatus
  code?: string
  requestedOffset: number
  receivedOffset?: number
  dueOffset?: number
  providedBy?: string
  sizeKb?: number
  reviewNote?: string
}

interface ReportSeed {
  status: SpecialistReportStatus
  executiveSummary: string
  sections: Array<{ heading: string; body: string; citations?: string[] }>
  issuedOffset?: number
  issuedByName?: string
  reviewerName?: string
}

interface AssessmentSeed {
  n: number
  reference: string
  domain: 'governance' | 'erm' | 'cybersecurity' | 'aml' | 'operations' | 'consumer-protection'
  inst: keyof typeof INST_IDS
  title: string
  type: SpecialistAssessmentType
  status: SpecialistAssessmentStatus
  periodCovered: string
  startOffset: number
  targetOffset: number
  completedOffset?: number
  leadName: string
  teamNames: string[]
  scopeSummary: string
  conclusion?: SpecialistConclusion
  maturityScore?: number
  examinationRef?: string
  citations: string[]
  anchors: Array<[string, string]>
  lastActivityOffset: number
  checklist: Record<string, ChecklistSeed>
  evidence: EvidenceSeed[]
  report: ReportSeed
}

const SEEDS: AssessmentSeed[] = [
  // ---- Governance (§9.1) -------------------------------------------------
  {
    n: 1,
    reference: 'GOVA-2026-001',
    domain: 'governance',
    inst: 'unity',
    title: 'Corporate governance assessment — Unity Non-Interest Bank',
    type: 'Full Assessment',
    status: 'Planned',
    periodCovered: 'Q4 2026',
    startOffset: 10,
    targetOffset: 45,
    leadName: 'Lerato Mokoena',
    teamNames: ['Daniel Adeyemi'],
    scopeSummary:
      'Full governance assessment running alongside planned examination EXM-2026-021: board composition, Shariah governance, fit-and-proper currency and conflicts management. Draft finding FND-2026-118 (incomplete Shariah board minutes) is in scope for validation.',
    examinationRef: 'EXM-2026-021',
    citations: ['MBA/GOV/2024 §2.1', 'MBA/GOV/2024 §4.1', 'MBA/NIB/2023 §4.4'],
    anchors: [
      ['EXM-2026-021', 'Planned governance examination — Unity Non-Interest Bank'],
      ['FND-2026-118', 'Unity Shariah board minutes incomplete for two product approvals'],
    ],
    lastActivityOffset: -3,
    checklist: {},
    evidence: [
      { name: 'Board register and independence declarations', kind: 'Register extract', status: 'Requested', requestedOffset: -5, dueOffset: 8 },
      { name: 'Shariah board minutes register (2026)', kind: 'Minutes', status: 'Requested', requestedOffset: -5, dueOffset: 8 },
    ],
    report: {
      status: 'Not Started',
      executiveSummary: '',
      sections: [],
    },
  },
  {
    n: 2,
    reference: 'GOVA-2026-002',
    domain: 'governance',
    inst: 'meridian',
    title: 'Board risk reporting thematic review — Meridian Commercial Bank',
    type: 'Thematic Review',
    status: 'In Progress',
    periodCovered: 'Q1–Q3 2026',
    startOffset: -30,
    targetOffset: 14,
    leadName: 'Daniel Adeyemi',
    teamNames: ['Lerato Mokoena', 'Aisha Yusuf'],
    scopeSummary:
      'Thematic review of board risk committee reporting timeliness and quality of challenge, prompted by draft finding FND-2026-109 raised during EXM-2026-014 fieldwork. Covers obligation OBL-2026-008 discharge.',
    examinationRef: 'EXM-2026-014',
    citations: ['MBA/GOV/2024 §3.2'],
    anchors: [
      ['FND-2026-109', 'Meridian board risk reporting delivered late (two occasions, demo)'],
      ['EXM-2026-014', 'Meridian AML/CFT targeted examination (fieldwork source of the referral)'],
      ['OBL-2026-008', 'Quarterly risk-reporting obligation under review'],
    ],
    lastActivityOffset: -1,
    checklist: {
      'GOV-02': {
        status: 'Deficient',
        assessorName: 'Daniel Adeyemi',
        assessedOffset: -6,
        note: 'Two quarterly risk reports reached the board risk committee after the demo 30-day standard; minutes record receipt without challenge. Referral already captured as draft finding FND-2026-109.',
        findingRefs: ['FND-2026-109'],
      },
      'GOV-04': { status: 'In Progress', assessorName: 'Lerato Mokoena' },
    },
    evidence: [
      { name: 'Board risk committee minutes Q1–Q3 2026', kind: 'Minutes', status: 'Reviewed', requestedOffset: -28, receivedOffset: -20, providedBy: 'Company Secretary (demo)', sizeKb: 2400, reviewNote: 'Q2 and Q3 transmittal dates confirmed late against the demo 30-day standard.' },
      { name: 'Quarterly risk report transmittal log', kind: 'Register extract', status: 'Received', requestedOffset: -28, receivedOffset: -12, providedBy: 'CRO Office (demo)', sizeKb: 340 },
      { name: 'Conflicts of interest register (2026)', kind: 'Register extract', status: 'Requested', requestedOffset: -14, dueOffset: -3 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): board risk reporting reached the committee within the demo 30-day standard in one of three sampled quarters; minutes evidence limited challenge. Remediation is tracked under draft finding FND-2026-109.',
      sections: [
        { heading: 'Scope and methodology', body: 'Thematic review of all board risk committee meetings in Q1–Q3 2026, inspecting transmittal dates against the demo 30-day standard and scoring challenge quality with the LIB-GOV-001 rubric.', citations: ['MBA/GOV/2024 §3.2'] },
        { heading: 'Key conclusions (draft)', body: 'Two of three quarterly reports were delivered late. Minutes record receipt but no documented challenge of management assumptions on AML remediation resourcing.', citations: ['MBA/GOV/2024 §3.2'] },
      ],
      reviewerName: 'Lerato Mokoena',
    },
  },
  {
    n: 3,
    reference: 'GOVA-2025-003',
    domain: 'governance',
    inst: 'vanguard',
    title: 'Corporate governance assessment 2025 — Vanguard Regional Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -210,
    targetOffset: -130,
    completedOffset: -120,
    leadName: 'Daniel Adeyemi',
    teamNames: ['Lerato Mokoena'],
    scopeSummary:
      'Full governance assessment completed alongside EXM-2026-012. Concluded Unsatisfactory: board minutes showed no challenge of management capital projections for three consecutive quarters (FND-2026-037), remediated under CAP-2026-007 within enforcement case ENF-2026-002.',
    conclusion: 'Unsatisfactory',
    maturityScore: 2,
    examinationRef: 'EXM-2026-012',
    citations: ['MBA/GOV/2024 §2.1', 'MBA/GOV/2024 §3.2'],
    anchors: [
      ['FND-2026-037', 'Vanguard board oversight failures — no challenge of capital projections'],
      ['CAP-2026-007', 'Vanguard corrective action plan (governance and capital)'],
      ['EXM-2026-012', 'Comprehensive examination — Vanguard Regional Bank'],
      ['ENF-2026-002', 'Enforcement case — licence suspension (Phase 5 label)'],
    ],
    lastActivityOffset: -120,
    checklist: {
      'GOV-01': { status: 'Satisfactory', assessorName: 'Daniel Adeyemi', assessedOffset: -160, note: 'Composition within demo limits; two vacancies in the succession pipeline.' },
      'GOV-02': { status: 'Deficient', assessorName: 'Daniel Adeyemi', assessedOffset: -155, note: 'No documented challenge of capital projections across three consecutive quarters (demo record).', findingRefs: ['FND-2026-037'] },
      'GOV-04': { status: 'Deficient', assessorName: 'Lerato Mokoena', assessedOffset: -150, note: 'Related-party approvals did not consistently record recusal of the interested director.', findingRefs: ['FND-2026-037'] },
      'GOV-05': { status: 'Satisfactory', assessorName: 'Lerato Mokoena', assessedOffset: -150 },
      'GOV-06': { status: 'Satisfactory', assessorName: 'Daniel Adeyemi', assessedOffset: -140, note: 'Evaluation performed; recommendations partially tracked.' },
    },
    evidence: [
      { name: 'Board and committee minutes FY2025', kind: 'Minutes', status: 'Reviewed', requestedOffset: -205, receivedOffset: -195, providedBy: 'Company Secretary (demo)', sizeKb: 5100, reviewNote: 'Challenge-quality rubric applied; three quarters without documented challenge.' },
      { name: 'Related-party approvals register', kind: 'Register extract', status: 'Insufficient', requestedOffset: -205, receivedOffset: -190, providedBy: 'Corporate Legal (demo)', sizeKb: 220, reviewNote: 'Recusal evidence missing for two sampled approvals.' },
      { name: 'Board evaluation report 2025', kind: 'Report', status: 'Reviewed', requestedOffset: -200, receivedOffset: -185, providedBy: 'External evaluator (demo)', sizeKb: 1800 },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'Governance at Vanguard Regional Bank was assessed as Unsatisfactory (demo maturity 2 — Developing). Board oversight of capital planning failed for three consecutive quarters; related-party governance lacks consistent recusal evidence. Remediation is mandated under CAP-2026-007 within enforcement case ENF-2026-002.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full governance assessment against MBA/GOV/2024 using the LIB-GOV-001 programme, covering board composition, committee effectiveness, conflicts and fit-and-proper currency for FY 2025.', citations: ['MBA/GOV/2024 §2.1', 'MBA/GOV/2024 §3.2'] },
        { heading: 'Board oversight of capital planning', body: 'Minutes for Q2–Q4 2025 record receipt of management capital projections without challenge, while CAR deteriorated toward the demo minimum. Assessed Deficient; raised as FND-2026-037 (High).', citations: ['MBA/GOV/2024 §3.2'] },
        { heading: 'Related-party governance', body: 'Two sampled related-party approvals lack recorded recusal of the interested director, contrary to the demo standard. Included in FND-2026-037 remediation.', citations: ['MBA/GOV/2024 §2.1'] },
        { heading: 'Recommendations', body: '1) Board chair to certify challenge quality quarterly. 2) Company secretary to record recusals in a dedicated register field. 3) Progress tracked under CAP-2026-007 with ENF-2026-002 oversight.' },
      ],
      issuedOffset: -118,
      issuedByName: 'Amara Osei',
      reviewerName: 'Lerato Mokoena',
    },
  },
  {
    n: 4,
    reference: 'GOVA-2025-002',
    domain: 'governance',
    inst: 'northstar',
    title: 'Corporate governance assessment 2025 — Northstar Merchant Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -320,
    targetOffset: -230,
    completedOffset: -220,
    leadName: 'Lerato Mokoena',
    teamNames: ['Daniel Adeyemi'],
    scopeSummary:
      'Routine full governance assessment. Concluded Satisfactory with recommendations on succession depth for board committees.',
    conclusion: 'Satisfactory',
    maturityScore: 4,
    citations: ['MBA/GOV/2024 §2.1', 'MBA/GOV/2024 §4.1'],
    anchors: [],
    lastActivityOffset: -220,
    checklist: {
      'GOV-01': { status: 'Satisfactory', assessorName: 'Lerato Mokoena', assessedOffset: -260 },
      'GOV-02': { status: 'Satisfactory', assessorName: 'Lerato Mokoena', assessedOffset: -255, note: 'Timely reporting; challenge documented in all sampled quarters.' },
      'GOV-05': { status: 'Satisfactory', assessorName: 'Daniel Adeyemi', assessedOffset: -250 },
      'GOV-06': { status: 'Satisfactory', assessorName: 'Daniel Adeyemi', assessedOffset: -240, note: 'Succession pipeline thin for the audit committee chair — recommendation recorded.' },
    },
    evidence: [
      { name: 'Board and committee minutes FY2025', kind: 'Minutes', status: 'Reviewed', requestedOffset: -310, receivedOffset: -300, providedBy: 'Company Secretary (demo)', sizeKb: 4200 },
      { name: 'Fit-and-proper register extract', kind: 'Register extract', status: 'Reviewed', requestedOffset: -310, receivedOffset: -298, providedBy: 'HR (demo)', sizeKb: 180 },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'Governance at Northstar Merchant Bank was assessed as Satisfactory (demo maturity 4 — Managed). Committee reporting is timely with documented challenge; succession depth for committee chairs needs attention.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full governance assessment against MBA/GOV/2024 using the LIB-GOV-001 programme for FY 2025.', citations: ['MBA/GOV/2024 §2.1'] },
        { heading: 'Recommendations', body: 'Deepen the audit committee chair succession pipeline and record the plan in the next annual evaluation.' },
      ],
      issuedOffset: -218,
      issuedByName: 'Amara Osei',
      reviewerName: 'Daniel Adeyemi',
    },
  },

  // ---- Enterprise risk management (§9.2) ---------------------------------
  {
    n: 5,
    reference: 'ERMA-2026-001',
    domain: 'erm',
    inst: 'northstar',
    title: 'ERM and liquidity risk targeted review — Northstar Merchant Bank',
    type: 'Targeted Review',
    status: 'Planned',
    periodCovered: 'Q4 2026',
    startOffset: 5,
    targetOffset: 40,
    leadName: 'Fatima Bello',
    teamNames: ['Aisha Yusuf'],
    scopeSummary:
      'Targeted ERM review aligned to planned examination EXM-2026-024, triggered by early-warning alert EWA-2026-011 (LCR 104.2% amber) and late daily liquidity returns (FND-2026-087). Covers risk appetite calibration, KRI escalation and contingency funding governance.',
    examinationRef: 'EXM-2026-024',
    citations: ['MBA/PRU/2024 §2.1', 'MBA/PRU/2024 §2.4', 'MBA/PRU/2024 §9.1'],
    anchors: [
      ['EWA-2026-011', 'Northstar LCR 104.2% amber alert (trigger for the review)'],
      ['SUB-2026-0144', 'Northstar October 2026 MPR-04 liquidity return — in review'],
      ['EXM-2026-024', 'Targeted liquidity examination — Northstar'],
      ['FND-2026-087', 'Northstar liquidity reporting delays (remediation in progress)'],
    ],
    lastActivityOffset: -2,
    checklist: {},
    evidence: [
      { name: 'Risk appetite statement (2026 board-approved)', kind: 'Policy', status: 'Requested', requestedOffset: -4, dueOffset: 10 },
      { name: 'KRI pack and breach log Q3 2026', kind: 'Report', status: 'Requested', requestedOffset: -4, dueOffset: 10 },
    ],
    report: { status: 'Not Started', executiveSummary: '', sections: [] },
  },
  {
    n: 6,
    reference: 'ERMA-2026-002',
    domain: 'erm',
    inst: 'crestline',
    title: 'ERM maturity assessment — Crestline Payment Bank',
    type: 'Maturity Assessment',
    status: 'In Progress',
    periodCovered: 'FY 2026',
    startOffset: -20,
    targetOffset: 20,
    leadName: 'Fatima Bello',
    teamNames: ['Peter Okonjo'],
    scopeSummary:
      'First ERM maturity assessment for Crestline, run in parallel with the institution risk assessment currently in progress. Focus on operational resilience of the agent network and third-party dependency (FND-2026-062 background).',
    citations: ['MBA/PRU/2024 §2.1', 'MBA/PRU/2024 §10.2'],
    anchors: [
      ['FND-2026-062', 'Crestline agent network onboarding controls (operational resilience context)'],
    ],
    lastActivityOffset: -1,
    checklist: {
      'ERM-01': { status: 'In Progress', assessorName: 'Fatima Bello' },
      'ERM-02': {
        status: 'Satisfactory',
        assessorName: 'Fatima Bello',
        assessedOffset: -8,
        note: 'Appetite statement quantified and board-approved in Q2 2026; cascade to payment-channel limits evidenced.',
      },
      'ERM-06': { status: 'In Progress', assessorName: 'Peter Okonjo' },
    },
    evidence: [
      { name: 'ERM framework document v2.1', kind: 'Policy', status: 'Received', requestedOffset: -18, receivedOffset: -10, providedBy: 'CRO Office (demo)', sizeKb: 980 },
      { name: 'Critical-services register (agent network, payment rails)', kind: 'Register extract', status: 'Requested', requestedOffset: -18, dueOffset: 3 },
      { name: 'Latest stress-test results pack', kind: 'Report', status: 'Reviewed', requestedOffset: -18, receivedOffset: -9, providedBy: 'Treasury (demo)', sizeKb: 1500, reviewNote: 'Results discussed at ALCO; board pack pending for one scenario.' },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): ERM arrangements are developing — the framework and appetite statement are current, while operational-resilience mapping of the agent network is incomplete.',
      sections: [
        { heading: 'Scope and methodology', body: 'Maturity assessment against MBA/PRU/2024 §2.1/§10.2 using the demo 5-level maturity scale; illustrative only.', citations: ['MBA/PRU/2024 §2.1'] },
      ],
    },
  },
  {
    n: 7,
    reference: 'ERMA-2025-003',
    domain: 'erm',
    inst: 'vanguard',
    title: 'Full ERM assessment 2025 — Vanguard Regional Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -180,
    targetOffset: -100,
    completedOffset: -90,
    leadName: 'Aisha Yusuf',
    teamNames: ['Fatima Bello'],
    scopeSummary:
      'Full ERM assessment completed after EXM-2026-012 revealed capital and liquidity governance failures. Concluded Unsatisfactory: contingency funding plan untested for four quarters (FND-2026-035) and appetite breaches not escalated while CAR fell below the demo minimum (FND-2026-030).',
    conclusion: 'Unsatisfactory',
    maturityScore: 1,
    examinationRef: 'EXM-2026-012',
    citations: ['MBA/PRU/2024 §2.1', 'MBA/PRU/2024 §2.4', 'MBA/PRU/2024 §9.4', 'MBA/PRU/2024 §10.2'],
    anchors: [
      ['FND-2026-035', 'Vanguard liquidity contingency plan untested (High)'],
      ['FND-2026-030', 'Vanguard CAR 6.4% vs 10% demo minimum (Critical)'],
      ['CAP-2026-007', 'Vanguard corrective action plan'],
      ['ENF-2026-002', 'Enforcement case — licence suspension (Phase 5 label)'],
    ],
    lastActivityOffset: -90,
    checklist: {
      'ERM-01': { status: 'Deficient', assessorName: 'Aisha Yusuf', assessedOffset: -130, note: 'Framework not independently reviewed since 2023 (demo record); risk committee vacancies unfilled for two quarters.' },
      'ERM-02': { status: 'Deficient', assessorName: 'Aisha Yusuf', assessedOffset: -125, note: 'Appetite statement qualitative only; no early-warning thresholds linked to limits.' },
      'ERM-03': { status: 'Deficient', assessorName: 'Fatima Bello', assessedOffset: -120, note: 'Capital and liquidity breaches not escalated within the demo 24-hour standard during the CAR deterioration.', findingRefs: ['FND-2026-030'] },
      'ERM-04': { status: 'Deficient', assessorName: 'Fatima Bello', assessedOffset: -115, note: 'No reverse stress testing; scenario suite not board-approved.' },
      'ERM-06': { status: 'Deficient', assessorName: 'Aisha Yusuf', assessedOffset: -110, note: 'CFP not stress-tested in the last four demo quarters.', findingRefs: ['FND-2026-035'] },
    },
    evidence: [
      { name: 'ERM framework document (2023 version)', kind: 'Policy', status: 'Insufficient', requestedOffset: -175, receivedOffset: -165, providedBy: 'CRO Office (demo)', sizeKb: 720, reviewNote: 'Outdated — no evidence of review since 2023.' },
      { name: 'Risk appetite statement', kind: 'Policy', status: 'Reviewed', requestedOffset: -175, receivedOffset: -165, providedBy: 'CRO Office (demo)', sizeKb: 260, reviewNote: 'Qualitative; lacks quantified thresholds.' },
      { name: 'CFP test reports (requested for four quarters)', kind: 'Report', status: 'Insufficient', requestedOffset: -170, receivedOffset: -150, providedBy: 'Treasury (demo)', sizeKb: 90, reviewNote: 'Only one report produced, dated outside the review period.' },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'ERM at Vanguard Regional Bank was assessed as Unsatisfactory (demo maturity 1 — Initial). The framework is outdated, appetite is unquantified, breaches were not escalated during the capital deterioration, and the contingency funding plan was untested for four quarters. Remediation is mandated under CAP-2026-007 within enforcement case ENF-2026-002.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full ERM assessment against MBA/PRU/2024 §2.1, §2.4, §9.4 and §10.2 for FY 2025, coordinated with EXM-2026-012.', citations: ['MBA/PRU/2024 §2.1', 'MBA/PRU/2024 §2.4'] },
        { heading: 'Limit breaches and escalation', body: 'Sampled capital and liquidity breaches were not escalated to ALCO or the board risk committee within the demo 24-hour standard while CAR fell to 6.4%.', citations: ['MBA/PRU/2024 §2.4'] },
        { heading: 'Contingency funding resilience', body: 'The CFP was not stress-tested in the last four demo quarters, contrary to the quarterly standard.', citations: ['MBA/PRU/2024 §9.4', 'MBA/PRU/2024 §10.2'] },
        { heading: 'Recommendations', body: '1) Rebuild the appetite statement with quantified limits and early-warning thresholds. 2) Quarterly CFP testing with ALCO reporting. 3) Independent framework review within two quarters. Progress tracked under CAP-2026-007.' },
      ],
      issuedOffset: -88,
      issuedByName: 'Amara Osei',
      reviewerName: 'Fatima Bello',
    },
  },
  {
    n: 8,
    reference: 'ERMA-2025-004',
    domain: 'erm',
    inst: 'meridian',
    title: 'ERM framework review 2025 — Meridian Commercial Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -290,
    targetOffset: -210,
    completedOffset: -200,
    leadName: 'Fatima Bello',
    teamNames: ['Aisha Yusuf'],
    scopeSummary:
      'Routine full ERM review. Concluded Needs Improvement: aggregation of AML-related operational risk into the enterprise register lagged the compliance function’s own assessments.',
    conclusion: 'Needs Improvement',
    maturityScore: 3,
    citations: ['MBA/PRU/2024 §2.1'],
    anchors: [],
    lastActivityOffset: -200,
    checklist: {
      'ERM-01': { status: 'Satisfactory', assessorName: 'Fatima Bello', assessedOffset: -240 },
      'ERM-02': { status: 'Satisfactory', assessorName: 'Fatima Bello', assessedOffset: -235 },
      'ERM-03': { status: 'Satisfactory', assessorName: 'Aisha Yusuf', assessedOffset: -230 },
      'ERM-05': { status: 'Deficient', assessorName: 'Aisha Yusuf', assessedOffset: -225, note: 'Operational-risk losses from compliance failures not consistently aggregated into the enterprise register (demo observation).' },
      'ERM-06': { status: 'Satisfactory', assessorName: 'Fatima Bello', assessedOffset: -215 },
    },
    evidence: [
      { name: 'Enterprise risk register extract', kind: 'Register extract', status: 'Reviewed', requestedOffset: -280, receivedOffset: -270, providedBy: 'CRO Office (demo)', sizeKb: 640 },
      { name: 'CFP test reports FY2025', kind: 'Report', status: 'Reviewed', requestedOffset: -280, receivedOffset: -265, providedBy: 'Treasury (demo)', sizeKb: 1200 },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'ERM at Meridian Commercial Bank was assessed as Needs Improvement (demo maturity 3 — Defined). The framework and appetite operate well; risk-data aggregation of compliance-driven operational losses needs strengthening.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full ERM review against MBA/PRU/2024 §2.1 for FY 2025.', citations: ['MBA/PRU/2024 §2.1'] },
        { heading: 'Recommendations', body: 'Integrate compliance loss data into the enterprise risk register with quarterly reconciliation to the AML function’s case management system.' },
      ],
      issuedOffset: -198,
      issuedByName: 'Amara Osei',
      reviewerName: 'Aisha Yusuf',
    },
  },

  // ---- IT & cybersecurity (§9.3) ------------------------------------------
  {
    n: 9,
    reference: 'CYBA-2026-001',
    domain: 'cybersecurity',
    inst: 'crestline',
    title: 'Cyber maturity assessment — Crestline Payment Bank',
    type: 'Maturity Assessment',
    status: 'In Progress',
    periodCovered: 'FY 2026',
    startOffset: -45,
    targetOffset: 10,
    leadName: 'Kwame Mensah',
    teamNames: ['Samuel Ike'],
    scopeSummary:
      'Cyber maturity assessment running alongside examination EXM-2026-005 (currently in reporting). Focus on third-party and API risk for the payment-aggregator model, privileged access and incident response readiness. FND-2026-066 (stale third-party register) is remediated under CAP-2026-008.',
    examinationRef: 'EXM-2026-005',
    citations: ['MBA/CYB/2025 §3.1', 'MBA/CYB/2025 §5.2', 'MBA/CYB/2025 §6.1'],
    anchors: [
      ['EXM-2026-005', 'Crestline cybersecurity examination (reporting stage)'],
      ['FND-2026-066', 'Crestline API third-party risk register outdated'],
      ['FND-2026-062', 'Crestline agent network onboarding controls'],
      ['CAP-2026-008', 'Crestline technology remediation action'],
    ],
    lastActivityOffset: 0,
    checklist: {
      'CYB-01': {
        status: 'Deficient',
        assessorName: 'Kwame Mensah',
        assessedOffset: -20,
        note: 'Register missing two payment aggregators integrated in Q2 2026 (demo record); assurance reviews overdue for three material parties. Raised as FND-2026-066; remediation tracked under CAP-2026-008.',
        findingRefs: ['FND-2026-066'],
      },
      'CYB-02': { status: 'In Progress', assessorName: 'Kwame Mensah' },
      'CYB-03': {
        status: 'Satisfactory',
        assessorName: 'Samuel Ike',
        assessedOffset: -12,
        note: 'IR plan current; tabletop exercise run in Q3 2026 with regulator notification steps rehearsed (demo).',
      },
      'CYB-04': { status: 'In Progress', assessorName: 'Samuel Ike' },
      'CYB-05': {
        status: 'Deficient',
        assessorName: 'Kwame Mensah',
        assessedOffset: -6,
        note: 'Two critical vulnerabilities exceeded the demo 14-day patch SLA by more than 30 days; latest penetration test predates the core payments upgrade.',
        findingRefs: ['FND-2026-066'],
      },
    },
    evidence: [
      { name: 'Third-party risk register (September extract)', kind: 'Register extract', status: 'Insufficient', requestedOffset: -40, receivedOffset: -30, providedBy: 'IT Risk (demo)', sizeKb: 420, reviewNote: 'Missing the two Q2 2026 payment-aggregator integrations — reconciled against the change log.' },
      { name: 'Latest penetration test report', kind: 'Vulnerability report', status: 'Received', requestedOffset: -40, receivedOffset: -8, providedBy: 'External tester (demo)', sizeKb: 3100 },
      { name: 'PAM inventory and Q2/Q3 access reviews', kind: 'Access review', status: 'Reviewed', requestedOffset: -35, receivedOffset: -22, providedBy: 'IT Security (demo)', sizeKb: 880, reviewNote: 'Quarterly reviews evidenced; two shared-admin rotations pending.' },
      { name: 'SOC alert sample (30 days)', kind: 'SOC alert', status: 'Reviewed', requestedOffset: -35, receivedOffset: -18, providedBy: 'SOC (demo)', sizeKb: 260, reviewNote: 'Triage within demo SLAs; escalation matrix current.' },
      { name: 'Incident log 2026', kind: 'Incident log', status: 'Received', requestedOffset: -30, receivedOffset: -10, providedBy: 'IT Security (demo)', sizeKb: 310 },
      { name: 'DR test report (core payments)', kind: 'DR test', status: 'Requested', requestedOffset: -20, dueOffset: -3 },
      { name: 'Aggregator assurance reports (2 missing parties)', kind: 'Third-party assurance', status: 'Requested', requestedOffset: -20, dueOffset: 6 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): cyber maturity is Developing — incident response and SOC monitoring are effective, but third-party register completeness and vulnerability remediation SLAs are deficient. Conclusions are coordinated with EXM-2026-005 reporting.',
      sections: [
        { heading: 'Scope and methodology', body: 'Maturity assessment against MBA/CYB/2025 using the LIB-CYB-001 programme and the demo 5-level maturity scale; illustrative only.', citations: ['MBA/CYB/2025 §3.1', 'MBA/CYB/2025 §5.2'] },
        { heading: 'Third-party and API risk (draft)', body: 'The register omitted two payment aggregators integrated in Q2 2026; assurance currency is below the demo annual standard for three material parties.', citations: ['MBA/CYB/2025 §5.2'] },
        { heading: 'Vulnerability management (draft)', body: 'Critical patch SLA breaches exceeded 30 days on two sampled items; the latest penetration test predates the core payments platform upgrade.', citations: ['MBA/CYB/2025 §3.1'] },
      ],
      reviewerName: 'Tunde Bakare',
    },
  },
  {
    n: 10,
    reference: 'CYBA-2025-002',
    domain: 'cybersecurity',
    inst: 'meridian',
    title: 'Cyber resilience thematic review 2025 — Meridian Commercial Bank',
    type: 'Thematic Review',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -240,
    targetOffset: -160,
    completedOffset: -150,
    leadName: 'Kwame Mensah',
    teamNames: ['Samuel Ike'],
    scopeSummary:
      'Thematic review of incident response and SOC monitoring following sector-wide fraud trends. Concluded Needs Improvement with recommendations on exercise cadence.',
    conclusion: 'Needs Improvement',
    maturityScore: 3,
    citations: ['MBA/CYB/2025 §3.1', 'MBA/CYB/2025 §6.1'],
    anchors: [],
    lastActivityOffset: -150,
    checklist: {
      'CYB-03': { status: 'Deficient', assessorName: 'Kwame Mensah', assessedOffset: -190, note: 'Only one tabletop exercise in 24 months against the demo annual standard; notification steps untested.' },
      'CYB-04': { status: 'Satisfactory', assessorName: 'Samuel Ike', assessedOffset: -185 },
      'CYB-05': { status: 'Satisfactory', assessorName: 'Kwame Mensah', assessedOffset: -180 },
    },
    evidence: [
      { name: 'Incident response plan v4', kind: 'Policy', status: 'Reviewed', requestedOffset: -235, receivedOffset: -225, providedBy: 'CISO (demo)', sizeKb: 640 },
      { name: 'Exercise report 2024', kind: 'Report', status: 'Reviewed', requestedOffset: -235, receivedOffset: -225, providedBy: 'IT Security (demo)', sizeKb: 900, reviewNote: 'Single exercise in the 24-month window.' },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'Meridian’s incident response posture was assessed as Needs Improvement (demo maturity 3 — Defined). Detection and access controls are sound; exercise cadence and regulator-notification rehearsal need improvement.',
      sections: [
        { heading: 'Scope and methodology', body: 'Thematic review against MBA/CYB/2025 §3.1/§6.1 for FY 2025.', citations: ['MBA/CYB/2025 §6.1'] },
        { heading: 'Recommendations', body: 'Run at least one tabletop exercise annually including the 48-hour regulator notification step; report completion to the board technology risk committee.' },
      ],
      issuedOffset: -148,
      issuedByName: 'Tunde Bakare',
      reviewerName: 'Kwame Mensah',
    },
  },
  {
    n: 11,
    reference: 'CYBA-2026-003',
    domain: 'cybersecurity',
    inst: 'northstar',
    title: 'IT governance review — Northstar Merchant Bank',
    type: 'Targeted Review',
    status: 'Planned',
    periodCovered: 'Q4 2026',
    startOffset: 20,
    targetOffset: 60,
    leadName: 'Samuel Ike',
    teamNames: ['Kwame Mensah'],
    scopeSummary:
      'Planned targeted review of IT governance and technology risk reporting to the board, following the sector thematic cycle (Q4 2026 Thematic Cycle — AML & Cyber Resilience).',
    citations: ['MBA/CYB/2025 §3.1'],
    anchors: [],
    lastActivityOffset: -6,
    checklist: {},
    evidence: [],
    report: { status: 'Not Started', executiveSummary: '', sections: [] },
  },

  // ---- AML/CFT/CPF (§9.4) — appended by Phase 4C so the deterministic
  // demoUuid sequence above never shifts. All sample case data is fictional
  // and anonymised (Spec §9.4/§17.5). ---------------------------------------
  {
    n: 12,
    reference: 'AMLA-2026-001',
    domain: 'aml',
    inst: 'meridian',
    title: 'AML/CFT programme assessment — Meridian Commercial Bank',
    type: 'Targeted Review',
    status: 'In Progress',
    periodCovered: 'Jan–Sep 2026',
    startOffset: -40,
    targetOffset: 12,
    leadName: 'Hauwa Sadiq',
    teamNames: ['Chuka Eze', 'Nkechi Balogun'],
    scopeSummary:
      'Specialist AML/CFT assessment running alongside targeted examination EXM-2026-014 (fieldwork in progress). Validates remediation of the transaction-monitoring gaps confirmed as FND-2026-101 under the overdue corrective action plan CAP-2026-003 (escalated by corrective directive DIR-2026-004, shown as a labelled Phase-5 chip), and covers the CDD refresh backlog raised as FND-2026-107. All sampled case data is fictional and anonymised.',
    examinationRef: 'EXM-2026-014',
    citations: ['MBA/AML/2023 §6.3', 'MBA/AML/2023 §4.1', 'MBA/AML/2023 §2.2 (2024 amendment)'],
    anchors: [
      ['EXM-2026-014', 'Meridian AML/CFT targeted examination (in fieldwork)'],
      ['FND-2026-101', 'Meridian AML transaction monitoring gaps — 14 unreported patterns (demo sample)'],
      ['FND-2026-107', 'Meridian CDD refresh backlog — 2,300 high-risk customers (demo figure)'],
      ['CAP-2026-003', 'Meridian AML corrective action plan (overdue)'],
      ['DIR-2026-004', 'Corrective directive: AML remediation (Phase 5 label)'],
    ],
    lastActivityOffset: 0,
    checklist: {
      'AML-01': {
        status: 'Deficient',
        assessorName: 'Hauwa Sadiq',
        assessedOffset: -18,
        note: 'Rule inventory covers 18 of 22 declared high-risk scenarios; structured deposits below the demo reporting threshold are still not captured, and Q2 2026 tuning records are missing. Same condition as FND-2026-101; remediation under CAP-2026-003 remains overdue.',
        findingRefs: ['FND-2026-101'],
      },
      'AML-02': { status: 'In Progress', assessorName: 'Chuka Eze' },
      'AML-03': {
        status: 'Deficient',
        assessorName: 'Nkechi Balogun',
        assessedOffset: -9,
        note: 'Periodic refresh overdue for 2,300 high-risk customers (demo figure); backlog remediation plan lacks board-level milestones. Raised as FND-2026-107 during EXM-2026-014 fieldwork.',
        findingRefs: ['FND-2026-107'],
      },
      'AML-04': { status: 'In Progress', assessorName: 'Hauwa Sadiq' },
    },
    evidence: [
      { name: 'Transaction monitoring rule inventory with calibration parameters', kind: 'Register extract', status: 'Insufficient', requestedOffset: -35, receivedOffset: -25, providedBy: 'AML Compliance (demo)', sizeKb: 640, reviewNote: 'Below-threshold structured-deposit coverage absent — reconciled against the declared high-risk scenarios (demo).' },
      { name: 'CDD periodic refresh tracker by risk tier', kind: 'Register extract', status: 'Reviewed', requestedOffset: -35, receivedOffset: -22, providedBy: 'AML Compliance (demo)', sizeKb: 380, reviewNote: 'Backlog of 2,300 high-risk customers confirmed (demo figure).' },
      { name: 'Sanctions screening logs and hit-resolution records', kind: 'Register extract', status: 'Received', requestedOffset: -30, receivedOffset: -8, providedBy: 'Financial Crime Unit (demo)', sizeKb: 520 },
      { name: 'STR register with filing timelines (Jan–Sep 2026)', kind: 'Register extract', status: 'Received', requestedOffset: -30, receivedOffset: -6, providedBy: 'MLRO (demo)', sizeKb: 210 },
      { name: 'CAP-2026-003 remediation milestone plan', kind: 'Report', status: 'Requested', requestedOffset: -12, dueOffset: -2 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): monitoring rule coverage and the CDD refresh backlog remain deficient, consistent with FND-2026-101 and FND-2026-107 raised during EXM-2026-014 fieldwork. Remediation under CAP-2026-003 is overdue. Conclusions are coordinated with the examination report; all sampled case data is fictional and anonymised.',
      sections: [
        { heading: 'Scope and methodology', body: 'Targeted AML/CFT assessment against MBA/AML/2023 using the LIB-AML-002 v2.2 programme, coordinated with EXM-2026-014 fieldwork (58% complete, demo figure). Attribute sampling and re-performance over fictional, anonymised case data only.', citations: ['MBA/AML/2023 §6.3', 'MBA/AML/2023 §4.1'] },
        { heading: 'Transaction monitoring (draft)', body: 'Rules cover 18 of 22 declared high-risk scenarios; structured deposits below the demo reporting threshold are not captured. The condition was first raised as FND-2026-101 in EXM-2025-031 and persists in this cycle.', citations: ['MBA/AML/2023 §6.3'] },
        { heading: 'Customer due diligence (draft)', body: 'Periodic refresh is overdue for 2,300 high-risk customers (demo figure); the backlog is tracked under FND-2026-107 and the overdue CAP-2026-003 milestone plan.', citations: ['MBA/AML/2023 §4.1'] },
      ],
      reviewerName: 'Tunde Bakare',
    },
  },
  {
    n: 13,
    reference: 'AMLA-2026-002',
    domain: 'aml',
    inst: 'crestline',
    title: 'ML/TF risk assessment and AML governance review — Crestline Payment Bank',
    type: 'Thematic Review',
    status: 'Planned',
    periodCovered: 'Q4 2026',
    startOffset: 15,
    targetOffset: 55,
    leadName: 'Hauwa Sadiq',
    teamNames: ['Nkechi Balogun'],
    scopeSummary:
      'Planned thematic review in the Q4 2026 cycle (AML & cyber resilience), focused on the agent-network ML/TF risk profile and risk-based customer classification for e-money customers. Agent onboarding control gaps (FND-2026-062, operations domain) are in scope for their AML training and due-diligence implications — a cross-department referral handled with the Operations & Internal Controls assessment.',
    citations: ['MBA/AML/2023 §5.1', 'MBA/AML/2023 §4.1'],
    anchors: [
      ['OBL-2026-006', 'Annual AML/CFT compliance report obligation'],
      ['FND-2026-062', 'Crestline agent network onboarding controls (AML training context — operations referral)'],
    ],
    lastActivityOffset: -5,
    checklist: {},
    evidence: [
      { name: 'Business-wide ML/TF/PF risk assessment (2026)', kind: 'Policy', status: 'Requested', requestedOffset: -6, dueOffset: 12 },
      { name: 'Agent AML training certification records', kind: 'Report', status: 'Requested', requestedOffset: -6, dueOffset: 12 },
    ],
    report: { status: 'Not Started', executiveSummary: '', sections: [] },
  },
  {
    n: 14,
    reference: 'AMLA-2025-003',
    domain: 'aml',
    inst: 'meridian',
    title: 'AML/CFT full assessment 2025 — Meridian Commercial Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -330,
    targetOffset: -250,
    completedOffset: -240,
    leadName: 'Hauwa Sadiq',
    teamNames: ['Chuka Eze'],
    scopeSummary:
      'Full AML/CFT assessment completed alongside comprehensive examination EXM-2025-031. Concluded Needs Improvement: below-threshold structuring detection gaps were raised as FND-2026-101 with remediation agreed under CAP-2026-003; the historic KYC backlog (FND-2025-077) was closed after validation.',
    conclusion: 'Needs Improvement',
    maturityScore: 2,
    examinationRef: 'EXM-2025-031',
    citations: ['MBA/AML/2023 §6.3', 'MBA/AML/2023 §4.1'],
    anchors: [
      ['EXM-2025-031', 'Meridian comprehensive examination (first surfaced the monitoring gaps)'],
      ['FND-2026-101', 'AML transaction monitoring gaps — first raised in this cycle (High)'],
      ['FND-2025-077', 'KYC remediation backlog (closed 2025)'],
      ['CAP-2026-003', 'Meridian AML corrective action plan'],
    ],
    lastActivityOffset: -240,
    checklist: {
      'AML-01': { status: 'Deficient', assessorName: 'Hauwa Sadiq', assessedOffset: -280, note: 'Structured deposits below the demo reporting threshold not captured by any rule; first identification of the condition later confirmed as FND-2026-101.', findingRefs: ['FND-2026-101'] },
      'AML-02': { status: 'Satisfactory', assessorName: 'Chuka Eze', assessedOffset: -275 },
      'AML-03': { status: 'Deficient', assessorName: 'Hauwa Sadiq', assessedOffset: -272, note: 'Historic KYC refresh backlog identified; cleared and validated before closure of FND-2025-077.', findingRefs: ['FND-2025-077'] },
      'AML-04': { status: 'Satisfactory', assessorName: 'Chuka Eze', assessedOffset: -268, note: 'Screening triggers and hit resolution within the demo standard.' },
      'AML-05': { status: 'Satisfactory', assessorName: 'Hauwa Sadiq', assessedOffset: -262, note: 'STRs filed within the demo standard; narratives meet the quality rubric.' },
      'AML-06': { status: 'Satisfactory', assessorName: 'Chuka Eze', assessedOffset: -258 },
    },
    evidence: [
      { name: 'Transaction monitoring rule inventory (2025)', kind: 'Register extract', status: 'Insufficient', requestedOffset: -325, receivedOffset: -310, providedBy: 'AML Compliance (demo)', sizeKb: 590, reviewNote: 'Coverage gap against declared high-risk scenarios — basis of FND-2026-101.' },
      { name: 'STR register FY2025 with filing timelines', kind: 'Register extract', status: 'Reviewed', requestedOffset: -325, receivedOffset: -305, providedBy: 'MLRO (demo)', sizeKb: 240 },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'The AML/CFT control framework at Meridian Commercial Bank was assessed as Needs Improvement (demo maturity 2 — Developing). Screening and STR disciplines operate within demo standards, but monitoring rule coverage missed below-threshold structuring; the condition was raised as FND-2026-101 with remediation mandated under CAP-2026-003. The historic KYC backlog (FND-2025-077) was closed after validation.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full AML/CFT assessment against MBA/AML/2023 using the LIB-AML-002 v2.0 programme for FY 2025, coordinated with EXM-2025-031. All sampled case data is fictional and anonymised.', citations: ['MBA/AML/2023 §6.3', 'MBA/AML/2023 §4.1'] },
        { heading: 'Transaction monitoring', body: 'The rule inventory did not capture structured deposits below the demo reporting threshold; 14 suspicious patterns in the sample period went unreported. Assessed Deficient; raised as FND-2026-101 (High).', citations: ['MBA/AML/2023 §6.3'] },
        { heading: 'Customer due diligence', body: 'The historic KYC refresh backlog was cleared and validated during the assessment; FND-2025-077 closed. Refresh timeliness for high-risk customers remains a monitoring priority.', citations: ['MBA/AML/2023 §4.1'] },
        { heading: 'Recommendations', body: '1) Extend monitoring rules to below-threshold structuring typologies. 2) Evidence semi-annual rule calibration reviews. 3) Track remediation under CAP-2026-003 with quarterly compliance-committee reporting.' },
      ],
      issuedOffset: -238,
      issuedByName: 'Tunde Bakare',
      reviewerName: 'Hauwa Sadiq',
    },
  },

  // ---- Operations & internal controls (§9.5) — appended by Phase 4C. -------
  {
    n: 15,
    reference: 'OPSA-2026-001',
    domain: 'operations',
    inst: 'crestline',
    title: 'Operational resilience and controls assessment — Crestline Payment Bank',
    type: 'Targeted Review',
    status: 'In Progress',
    periodCovered: 'FY 2026',
    startOffset: -30,
    targetOffset: 15,
    leadName: 'Samuel Ike',
    teamNames: ['Chuka Eze'],
    scopeSummary:
      'Targeted operational-controls assessment of the agent-network operating model, following the onboarding control gaps confirmed as FND-2026-062 during examination EXM-2026-005. Covers float and trust account reconciliation, agent onboarding and outsourced-operations oversight. The AML implications of agent training gaps were referred to the §9.4 domain review (AMLA-2026-002).',
    examinationRef: 'EXM-2026-005',
    citations: ['MBA/OPS/2026 §2.1', 'MBA/PSB/2026 §2.3 (draft)'],
    anchors: [
      ['FND-2026-062', 'Crestline agent network onboarding controls — 12% demo sample gap'],
      ['EXM-2026-005', 'Crestline cybersecurity examination (source of the agent-network referral)'],
      ['CAP-2026-008', 'Crestline technology remediation action (related milestones)'],
    ],
    lastActivityOffset: 0,
    checklist: {
      'OPS-02': {
        status: 'Deficient',
        assessorName: 'Samuel Ike',
        assessedOffset: -14,
        note: '12% of sampled agents were onboarded without completed background checks (demo sample); the central agent register lacks a certification-currency field. Condition confirmed as FND-2026-062.',
        findingRefs: ['FND-2026-062'],
      },
      'OPS-03': { status: 'In Progress', assessorName: 'Samuel Ike' },
    },
    evidence: [
      { name: 'Agent register extract with onboarding dates', kind: 'Register extract', status: 'Insufficient', requestedOffset: -28, receivedOffset: -20, providedBy: 'Operations (demo)', sizeKb: 460, reviewNote: '12% of sampled agents lacked completed background checks (demo sample).' },
      { name: 'Daily float and trust reconciliation packs', kind: 'Report', status: 'Requested', requestedOffset: -20, dueOffset: -3 },
      { name: 'Important business services map (agent network, payment rails)', kind: 'Register extract', status: 'Received', requestedOffset: -25, receivedOffset: -12, providedBy: 'COO Office (demo)', sizeKb: 320 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): agent-network onboarding controls are deficient (FND-2026-062); reconciliation testing is in progress. Conclusions are coordinated with EXM-2026-005 reporting and the Crestline remediation milestones under CAP-2026-008.',
      sections: [
        { heading: 'Scope and methodology', body: 'Targeted assessment against MBA/OPS/2026 §2.1 using the LIB-OPS-001 programme (under methodology-committee review — demo), covering agent onboarding, float/trust reconciliation and outsourced-operations oversight for FY 2026.', citations: ['MBA/OPS/2026 §2.1'] },
        { heading: 'Agent network onboarding (draft)', body: 'Background checks and training certification were incomplete for 12% of the sampled agent population (demo); the register does not evidence certification currency.', citations: ['MBA/PSB/2026 §2.3 (draft)'] },
      ],
      reviewerName: 'Tunde Bakare',
    },
  },
  {
    n: 16,
    reference: 'OPSA-2026-002',
    domain: 'operations',
    inst: 'northstar',
    title: 'Transaction processing and controls review — Northstar Merchant Bank',
    type: 'Targeted Review',
    status: 'In Progress',
    periodCovered: 'Q3–Q4 2026',
    startOffset: -25,
    targetOffset: 20,
    leadName: 'Aisha Yusuf',
    teamNames: ['Samuel Ike'],
    scopeSummary:
      'Targeted review of transaction processing controls and dealing-mandate escalation following FND-2026-091 (treasury mandate limit breaches not escalated within the demo 24-hour standard, confirmed during EXM-2026-009). Covers maker-checker discipline and exception reporting.',
    examinationRef: 'EXM-2026-009',
    citations: ['MBA/OPS/2026 §2.1'],
    anchors: [
      ['FND-2026-091', 'Northstar treasury mandate limit breaches not escalated (Medium)'],
      ['FND-2026-071', 'Stale customer addresses — closed after evidence review'],
      ['EXM-2026-009', 'Northstar targeted examination (source of the escalation finding)'],
    ],
    lastActivityOffset: -1,
    checklist: {
      'OPS-04': { status: 'In Progress', assessorName: 'Samuel Ike' },
      'OPS-05': {
        status: 'Deficient',
        assessorName: 'Aisha Yusuf',
        assessedOffset: -10,
        note: 'Two intraday dealing-limit breaches were not escalated to ALCO within the demo 24-hour standard; ALCO minutes record late notification. Condition confirmed as FND-2026-091.',
        findingRefs: ['FND-2026-091'],
      },
    },
    evidence: [
      { name: 'Dealing mandate and breach log Q3 2026', kind: 'Register extract', status: 'Reviewed', requestedOffset: -24, receivedOffset: -16, providedBy: 'Treasury (demo)', sizeKb: 280, reviewNote: 'Two breaches exceeded the demo 24-hour escalation standard.' },
      { name: 'Maker-checker exception report (high-risk types)', kind: 'Report', status: 'Received', requestedOffset: -24, receivedOffset: -9, providedBy: 'Operations (demo)', sizeKb: 340 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): dealing-mandate breach escalation is deficient (FND-2026-091); maker-checker testing is in progress with no self-approvals identified to date in the sample.',
      sections: [
        { heading: 'Scope and methodology', body: 'Targeted review against MBA/OPS/2026 §2.1 covering transaction processing, maker-checker discipline and dealing-mandate escalation for Q3–Q4 2026, following EXM-2026-009.', citations: ['MBA/OPS/2026 §2.1'] },
      ],
      reviewerName: 'Fatima Bello',
    },
  },
  {
    n: 17,
    reference: 'OPSA-2026-003',
    domain: 'operations',
    inst: 'delta',
    title: 'Branch operations review — Delta Microfinance Bank',
    type: 'Targeted Review',
    status: 'In Progress',
    periodCovered: 'Q3–Q4 2026',
    startOffset: -15,
    targetOffset: 25,
    leadName: 'Samuel Ike',
    teamNames: [],
    scopeSummary:
      'Branch operations review prompted by FND-2026-051 (three riverine branches exceeded approved cash holding limits in Q3 2026, demo record, under review). Covers cash/vault controls and branch supervision discipline.',
    citations: ['MBA/OPS/2026 §2.1'],
    anchors: [
      ['FND-2026-051', 'Delta riverine branches exceeded approved cash holding limits (Low)'],
    ],
    lastActivityOffset: -2,
    checklist: {
      'OPS-01': { status: 'In Progress', assessorName: 'Samuel Ike' },
    },
    evidence: [
      { name: 'Daily cash position reports Q3 2026', kind: 'Register extract', status: 'Received', requestedOffset: -14, receivedOffset: -7, providedBy: 'Branch Operations (demo)', sizeKb: 410 },
      { name: 'Cash-limit escalation log', kind: 'Register extract', status: 'Requested', requestedOffset: -10, dueOffset: 5 },
    ],
    report: { status: 'Not Started', executiveSummary: '', sections: [] },
  },
  {
    n: 18,
    reference: 'OPSA-2025-004',
    domain: 'operations',
    inst: 'vanguard',
    title: 'Operational controls assessment 2025 — Vanguard Regional Bank',
    type: 'Full Assessment',
    status: 'Completed',
    periodCovered: 'FY 2025',
    startOffset: -200,
    targetOffset: -120,
    completedOffset: -110,
    leadName: 'Chuka Eze',
    teamNames: ['Samuel Ike'],
    scopeSummary:
      'Full operational-controls assessment completed alongside EXM-2026-012. Concluded Needs Improvement: large deposit outflows were not reported within the demo 48-hour standard (FND-2026-039) and internal audit coverage of high-risk operational areas was incomplete. Remediation is mandated under CAP-2026-007 within enforcement case ENF-2026-002.',
    conclusion: 'Needs Improvement',
    maturityScore: 2,
    examinationRef: 'EXM-2026-012',
    citations: ['MBA/OPS/2026 §2.1'],
    anchors: [
      ['FND-2026-039', 'Vanguard deposit outflow reporting gaps (Medium)'],
      ['CAP-2026-007', 'Vanguard corrective action plan'],
      ['EXM-2026-012', 'Comprehensive examination — Vanguard Regional Bank'],
      ['ENF-2026-002', 'Enforcement case — licence suspension (Phase 5 label)'],
    ],
    lastActivityOffset: -110,
    checklist: {
      'OPS-04': { status: 'Satisfactory', assessorName: 'Chuka Eze', assessedOffset: -160, note: 'Dual control operated over sampled high-risk types; no self-approvals identified.' },
      'OPS-05': { status: 'Deficient', assessorName: 'Chuka Eze', assessedOffset: -150, note: 'Large deposit outflows not reported to the supervisor within the demo 48-hour standard.', findingRefs: ['FND-2026-039'] },
      'OPS-06': { status: 'Deficient', assessorName: 'Samuel Ike', assessedOffset: -140, note: 'Internal audit plan omitted two high-risk operational areas in FY2025; loss register not reconciled to the general ledger.' },
    },
    evidence: [
      { name: 'Deposit outflow reporting log FY2025', kind: 'Register extract', status: 'Insufficient', requestedOffset: -195, receivedOffset: -180, providedBy: 'Treasury (demo)', sizeKb: 190, reviewNote: 'Two outflow events lacked evidence of 48-hour supervisory reporting (demo).' },
      { name: 'Internal audit plan and finding tracker FY2025', kind: 'Report', status: 'Reviewed', requestedOffset: -195, receivedOffset: -175, providedBy: 'Internal Audit (demo)', sizeKb: 720, reviewNote: 'Coverage gaps in high-risk operational areas.' },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'Operational controls at Vanguard Regional Bank were assessed as Needs Improvement (demo maturity 2 — Developing). Deposit-outflow supervisory reporting and internal audit coverage were deficient; remediation is mandated under CAP-2026-007 within enforcement case ENF-2026-002.',
      sections: [
        { heading: 'Scope and methodology', body: 'Full operational-controls assessment against MBA/OPS/2026 §2.1 for FY 2025, coordinated with EXM-2026-012.', citations: ['MBA/OPS/2026 §2.1'] },
        { heading: 'Supervisory reporting of outflows', body: 'Large deposit outflows were not reported within the demo 48-hour standard on two occasions; raised as FND-2026-039 (Medium).', citations: ['MBA/OPS/2026 §2.1'] },
        { heading: 'Recommendations', body: '1) Automate outflow-reporting triggers against the demo threshold. 2) Extend the internal audit plan to all high-risk operational areas. 3) Reconcile the operational loss register quarterly. Progress tracked under CAP-2026-007.' },
      ],
      issuedOffset: -108,
      issuedByName: 'Amara Osei',
      reviewerName: 'Chuka Eze',
    },
  },

  // ---- Consumer protection (§9.6) — appended by Phase 4C. No examination
  // library programme exists for this domain; templates cite the MBA/CPC/2025
  // framework requirements directly. -----------------------------------------
  {
    n: 19,
    reference: 'CPA-2026-001',
    domain: 'consumer-protection',
    inst: 'crestline',
    title: 'Consumer protection review — Crestline Payment Bank',
    type: 'Thematic Review',
    status: 'In Progress',
    periodCovered: 'Q3–Q4 2026',
    startOffset: -20,
    targetOffset: 18,
    leadName: 'Lerato Mokoena',
    teamNames: ['Daniel Adeyemi'],
    scopeSummary:
      'Thematic review prompted by the Partial compliance status on obligation OBL-2026-007: the Q3 2026 complaint report was filed six business days late (demo) and flagged an agent-dispute theme. Covers digital-channel dispute handling and complaint resolution for the agent-network model. Cross-department referrals: agent-network operational controls are owned by the §9.5 assessment OPSA-2026-001, and the AML training implications were referred to §9.4 (AMLA-2026-002).',
    citations: ['MBA/CPC/2025 §2.1', 'MBA/CPC/2025 §3.1'],
    anchors: [
      ['OBL-2026-007', 'Quarterly consumer complaint report — Q3 2026 filed late (Partial, demo)'],
      ['FND-2026-062', 'Crestline agent network onboarding controls (agent-dispute theme referral)'],
    ],
    lastActivityOffset: 0,
    checklist: {
      'CPC-01': {
        status: 'Deficient',
        assessorName: 'Lerato Mokoena',
        assessedOffset: -8,
        note: 'Q3 2026 complaint report filed six business days after the demo deadline; the agent-dispute theme lacks root-cause analysis. Obligation OBL-2026-007 marked Partial.',
      },
      'CPC-04': { status: 'In Progress', assessorName: 'Daniel Adeyemi' },
    },
    evidence: [
      { name: 'Complaint register extract Q3 2026 with timestamps', kind: 'Register extract', status: 'Reviewed', requestedOffset: -18, receivedOffset: -12, providedBy: 'Customer Care (demo)', sizeKb: 380, reviewNote: 'Acknowledgement within one business day evidenced; resolution timelines exceeded for the agent-dispute cohort (demo).' },
      { name: 'Root-cause analysis report Q3 2026', kind: 'Report', status: 'Insufficient', requestedOffset: -18, receivedOffset: -10, providedBy: 'Customer Care (demo)', sizeKb: 220, reviewNote: 'Agent-dispute theme flagged but not analysed; filed six business days late (demo).' },
      { name: 'Published tariff schedule (agent transactions)', kind: 'Policy', status: 'Received', requestedOffset: -14, receivedOffset: -5, providedBy: 'Products (demo)', sizeKb: 160 },
    ],
    report: {
      status: 'Draft',
      executiveSummary:
        'Draft (demo): complaint reporting timeliness is deficient (OBL-2026-007 Partial) and the agent-dispute theme lacks root-cause analysis; digital-channel dispute testing is in progress. Operational ownership of agent-network controls sits with the §9.5 assessment (referral documented).',
      sections: [
        { heading: 'Scope and methodology', body: 'Thematic review against MBA/CPC/2025 §2.1/§3.1 covering complaint handling, resolution quality and digital-channel disputes for Q3–Q4 2026. No examination-library programme exists for this domain; requirement citations are applied directly.', citations: ['MBA/CPC/2025 §2.1'] },
        { heading: 'Complaint handling (draft)', body: 'The Q3 2026 quarterly report was filed six business days late and the agent-dispute theme was not root-cause analysed; obligation OBL-2026-007 is marked Partial for Crestline.', citations: ['MBA/CPC/2025 §2.1'] },
      ],
      reviewerName: 'Amara Osei',
    },
  },
  {
    n: 20,
    reference: 'CPA-2026-002',
    domain: 'consumer-protection',
    inst: 'unity',
    title: 'Market conduct assessment — Unity Non-Interest Bank',
    type: 'Full Assessment',
    status: 'Planned',
    periodCovered: 'Q4 2026',
    startOffset: 12,
    targetOffset: 50,
    leadName: 'Lerato Mokoena',
    teamNames: ['Aisha Yusuf'],
    scopeSummary:
      'Planned market conduct assessment coordinated with governance examination EXM-2026-021: investment-account risk disclosures (MBA/NIB/2023 §3.2), fair treatment and product transparency for non-interest retail products. Disclosure testing is sequenced with the Shariah governance procedures in the examination to avoid duplicate information requests.',
    examinationRef: 'EXM-2026-021',
    citations: ['MBA/CPC/2025 §4.2', 'MBA/NIB/2023 §3.2'],
    anchors: [
      ['EXM-2026-021', 'Planned governance examination — Unity Non-Interest Bank (coordination)'],
      ['OBL-2026-012', 'Non-interest banking disclosure obligation'],
    ],
    lastActivityOffset: -4,
    checklist: {},
    evidence: [
      { name: 'Investment account disclosure templates and acknowledgement log', kind: 'Register extract', status: 'Requested', requestedOffset: -5, dueOffset: 10 },
      { name: 'Key-facts statements for retail products', kind: 'Policy', status: 'Requested', requestedOffset: -5, dueOffset: 10 },
    ],
    report: { status: 'Not Started', executiveSummary: '', sections: [] },
  },
  {
    n: 21,
    reference: 'CPA-2025-003',
    domain: 'consumer-protection',
    inst: 'meridian',
    title: 'Complaint handling thematic 2025 — Meridian Commercial Bank',
    type: 'Thematic Review',
    status: 'Completed',
    periodCovered: 'H2 2025',
    startOffset: -300,
    targetOffset: -230,
    completedOffset: -220,
    leadName: 'Lerato Mokoena',
    teamNames: ['Daniel Adeyemi'],
    scopeSummary:
      'Thematic review of complaint handling and fee disclosure for H2 2025. Concluded Satisfactory: acknowledgement and resolution timelines met the demo standards, with a recommendation to automate tariff change-notification evidence.',
    conclusion: 'Satisfactory',
    maturityScore: 4,
    citations: ['MBA/CPC/2025 §2.1', 'MBA/CPC/2025 §3.1'],
    anchors: [],
    lastActivityOffset: -220,
    checklist: {
      'CPC-01': { status: 'Satisfactory', assessorName: 'Lerato Mokoena', assessedOffset: -260, note: 'Acknowledgement within one business day and resolution within five evidenced across the sample (demo).' },
      'CPC-02': { status: 'Satisfactory', assessorName: 'Daniel Adeyemi', assessedOffset: -255 },
      'CPC-03': { status: 'Satisfactory', assessorName: 'Lerato Mokoena', assessedOffset: -250, note: 'Tariff published and disclosed at account opening; recommendation recorded to automate 30-day change-notification evidence.' },
    },
    evidence: [
      { name: 'Complaint register extract H2 2025', kind: 'Register extract', status: 'Reviewed', requestedOffset: -295, receivedOffset: -285, providedBy: 'Customer Care (demo)', sizeKb: 340 },
      { name: 'Tariff schedules and change notifications', kind: 'Policy', status: 'Reviewed', requestedOffset: -295, receivedOffset: -280, providedBy: 'Products (demo)', sizeKb: 180 },
    ],
    report: {
      status: 'Issued (demo)',
      executiveSummary:
        'Complaint handling and fee disclosure at Meridian Commercial Bank were assessed as Satisfactory (demo maturity 4 — Managed). Timelines met the demo standards across the sample; one recommendation recorded on automating tariff change-notification evidence.',
      sections: [
        { heading: 'Scope and methodology', body: 'Thematic review against MBA/CPC/2025 §2.1/§3.1 for H2 2025 using requirement-based templates (no library programme for this domain).', citations: ['MBA/CPC/2025 §2.1', 'MBA/CPC/2025 §3.1'] },
        { heading: 'Recommendations', body: 'Automate retention of the 30-day fee-change notification evidence within the customer-communication platform.' },
      ],
      issuedOffset: -218,
      issuedByName: 'Amara Osei',
      reviewerName: 'Lerato Mokoena',
    },
  },
]

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const reportSections = (seed: ReportSeed, idBase: number): SpecialistReportSection[] =>
  seed.sections.map((s, i) => ({
    id: demoUuid(99, idBase * 100 + i + 1),
    heading: s.heading,
    body: s.body,
    requirementCitations: s.citations ?? [],
  }))

function buildReport(seed: ReportSeed, n: number): SpecialistReport {
  return {
    status: seed.status,
    executiveSummary: seed.executiveSummary,
    sections: reportSections(seed, n),
    issuedAt: seed.issuedOffset === undefined ? undefined : isoDay(seed.issuedOffset),
    issuedByName: seed.issuedByName,
    reviewerName: seed.reviewerName,
    storageNote: STORAGE_NOTE,
  }
}

function buildAssessment(seed: AssessmentSeed): SpecialistAssessment {
  const spec = SPECIALIST_DOMAINS[seed.domain]
  if (!spec) throw new Error(`No specialist domain config for ${seed.domain}`)
  return {
    id: demoUuid(96, seed.n),
    reference: seed.reference,
    domain: seed.domain,
    institutionId: INST_IDS[seed.inst],
    title: seed.title,
    type: seed.type,
    status: seed.status,
    periodCovered: seed.periodCovered,
    startDate: isoDay(seed.startOffset),
    targetDate: isoDay(seed.targetOffset),
    completedDate: seed.completedOffset === undefined ? undefined : isoDay(seed.completedOffset),
    leadName: seed.leadName,
    teamNames: seed.teamNames,
    scopeSummary: seed.scopeSummary,
    conclusion: seed.conclusion,
    maturity: seed.maturityScore === undefined ? undefined : maturityFor(seed.maturityScore),
    examinationRef: seed.examinationRef,
    requirementCitations: seed.citations,
    relations: seed.anchors.map(([ref, label]) => relationFromRef(ref, label)),
    report: buildReport(seed.report, seed.n),
    lastActivityAt: isoDay(seed.lastActivityOffset),
  }
}

let chkSeq = 0
function buildChecklist(seed: AssessmentSeed, assessmentId: string): SpecialistChecklistItem[] {
  const spec = SPECIALIST_DOMAINS[seed.domain]
  if (!spec) return []
  return spec.checklistTemplates.map((t) => {
    chkSeq += 1
    const override = seed.checklist[t.code]
    return {
      id: demoUuid(97, chkSeq),
      assessmentId,
      submoduleKey: t.submoduleKey,
      code: t.code,
      title: t.title,
      objective: t.objective,
      procedureQuestion: t.procedureQuestion,
      testSteps: t.testSteps,
      method: t.method,
      sample: t.sample,
      priority: t.priority,
      status: override?.status ?? 'Not Started',
      assessorName: override?.assessorName,
      assessedAt: override?.assessedOffset === undefined ? undefined : isoDay(override.assessedOffset),
      conclusionNote: override?.note,
      requirementCitations: t.requirementCitations,
      criteriaRef: t.criteriaRef,
      expectedEvidence: t.expectedEvidence,
      findingRefs: override?.findingRefs ?? [],
    }
  })
}

let evSeq = 0
function buildEvidence(seed: AssessmentSeed, assessmentId: string): SpecialistEvidenceItem[] {
  return seed.evidence.map((e) => {
    evSeq += 1
    return {
      id: demoUuid(98, evSeq),
      assessmentId,
      name: e.name,
      kind: e.kind,
      checklistItemId: undefined,
      status: e.status,
      requestedAt: isoDay(e.requestedOffset),
      receivedAt: e.receivedOffset === undefined ? undefined : isoDay(e.receivedOffset),
      dueAt: e.dueOffset === undefined ? undefined : isoDay(e.dueOffset),
      requestedByName: seed.leadName,
      providedByName: e.providedBy,
      sizeKb: e.sizeKb,
      confidentiality: 'Restricted' as const,
      reviewNote: e.reviewNote,
      storageNote: STORAGE_NOTE,
    }
  })
}

export const SPECIALIST_ASSESSMENTS: SpecialistAssessment[] = SEEDS.map(buildAssessment)

export const SPECIALIST_CHECKLIST: SpecialistChecklistItem[] = SEEDS.flatMap((s) =>
  buildChecklist(s, demoUuid(96, s.n)),
)

export const SPECIALIST_EVIDENCE: SpecialistEvidenceItem[] = SEEDS.flatMap((s) =>
  buildEvidence(s, demoUuid(96, s.n)),
)

/** Assessment reference (GOVA-…) -> id. */
export const SPECIALIST_ASSESSMENT_ID_BY_REF: Record<string, string> = Object.fromEntries(
  SPECIALIST_ASSESSMENTS.map((a) => [a.reference, a.id]),
)

/** Named Phase-4B story anchors (Spec §9). */
export const SPECIALIST_STORY = {
  /** Unity governance assessment aligned to EXM-2026-021 / FND-2026-118 (§9.1). */
  unityGovernanceAssessmentId: SPECIALIST_ASSESSMENT_ID_BY_REF['GOVA-2026-001'],
  /** Meridian board-risk-reporting thematic (FND-2026-109) (§9.1). */
  meridianGovernanceReviewId: SPECIALIST_ASSESSMENT_ID_BY_REF['GOVA-2026-002'],
  /** Vanguard 2025 governance history (FND-2026-037 → CAP-2026-007) (§9.1). */
  vanguardGovernanceHistoryId: SPECIALIST_ASSESSMENT_ID_BY_REF['GOVA-2025-003'],
  /** Northstar ERM review aligned to EWA-2026-011 / EXM-2026-024 (§9.2). */
  northstarErmReviewId: SPECIALIST_ASSESSMENT_ID_BY_REF['ERMA-2026-001'],
  /** Vanguard 2025 full ERM history (FND-2026-035/030) (§9.2). */
  vanguardErmHistoryId: SPECIALIST_ASSESSMENT_ID_BY_REF['ERMA-2025-003'],
  /** Crestline cyber maturity assessment alongside EXM-2026-005 (§9.3). */
  crestlineCyberAssessmentId: SPECIALIST_ASSESSMENT_ID_BY_REF['CYBA-2026-001'],
  /** Meridian AML assessment alongside EXM-2026-014 ↔ MBA/AML/2023 §6.3/§4.1 (§9.4, Phase-4 acceptance). */
  meridianAmlAssessmentId: SPECIALIST_ASSESSMENT_ID_BY_REF['AMLA-2026-001'],
  /** Crestline operational-controls assessment (FND-2026-062 agent network) (§9.5). */
  crestlineOperationsAssessmentId: SPECIALIST_ASSESSMENT_ID_BY_REF['OPSA-2026-001'],
  /** Crestline consumer-protection review (OBL-2026-007 Partial, agent-dispute theme) (§9.6). */
  crestlineConsumerReviewId: SPECIALIST_ASSESSMENT_ID_BY_REF['CPA-2026-001'],
} as const
