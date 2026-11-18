/**
 * Finding detail fixtures (Spec §7.7): five-Cs structure, breach
 * classification, evidence links, management responses and approval trails
 * merged onto the Phase-2A `FINDINGS` summaries by the finding repository.
 * Key story findings are hand-written; remaining records are synthesised
 * from their summary so every finding detail screen is complete (no dead
 * ends). All content is fictional demo data (Spec §17.5).
 */
import { demoUuid, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import type {
  BreachClassification,
  FindingApprovalEvent,
  FindingDetail,
  FiveCs,
  ManagementResponse,
} from '@/types/finding'
import type { SupervisoryFinding } from '@/types/supervision'

interface DetailSeed {
  fiveCs: FiveCs
  severityRationale: string
  breachClassification: BreachClassification
  regulatoryReference: string
  institutionOwnerRole: string
  crossDomainLinks: string[]
  evidenceLinks: FindingDetail['evidenceLinks']
  procedure?: { code: string }
  reviewerName?: string
  managementResponses?: Array<Omit<ManagementResponse, 'id' | 'findingId'>>
  approvalTrail?: Array<Omit<FindingApprovalEvent, 'id'>>
}

const SEEDS: Record<string, DetailSeed> = {
  'FND-2026-101': {
    fiveCs: {
      condition:
        'Transaction monitoring rules do not capture structured deposits placed just below the demo reporting threshold. In the sample period, 14 suspicious patterns (demo figure) went unreported; Q2 2026 rule-tuning records are missing.',
      criteria:
        'MBA/AML/2023 §6.3 (demo reference) requires monitoring scenarios to cover the institution\'s declared high-risk typologies with evidenced threshold tuning.',
      cause:
        'Rule-tuning governance lapsed after the 2025 core-banking upgrade (demo); the AML tuning committee did not meet in Q2 2026 and threshold changes were not re-approved.',
      consequence:
        'Suspicious activity may go undetected and unreported, exposing the institution and the financial system to money-laundering risk; supervisory confidence in the AML framework is reduced.',
      recommendation:
        'Re-tune monitoring rules to cover the structured-deposit typology with documented governance; reinstate the tuning committee with minuted quarterly meetings; back-test the sample period for missed STRs.',
    },
    severityRationale:
      'High: repeat condition (first raised in EXM-2025-031), remediation CAP-2026-003 already overdue, and the typology maps to a declared high-risk scenario. Demo rationale.',
    breachClassification: 'Breach',
    regulatoryReference: 'MBA/AML/2023 §6.3 (demo reference)',
    institutionOwnerRole: 'Chief Compliance Officer (Meridian — demo role)',
    crossDomainLinks: ['Operations', 'Governance'],
    evidenceLinks: [
      { reference: 'EV-2026-101', description: 'Transaction monitoring rule inventory — Q3 2026 extract' },
      { reference: 'EV-2026-105', description: 'Examiner working paper — rule coverage mapping' },
      { reference: 'EV-2026-110', description: 'CAP-2026-003 remediation progress report (overdue)' },
    ],
    procedure: { code: 'AML-01' },
    reviewerName: 'Daniel Adeyemi',
    managementResponses: [
      {
        respondedByName: 'Grace Mbeki',
        respondedByOrg: 'Meridian Commercial Bank (institution portal — demo)',
        at: isoDateTime(-55, 11, 0),
        position: 'Accepted',
        responseText:
          'The bank accepts the finding. A remediation programme (CAP-2026-003) was agreed covering rule re-tuning, committee reinstatement and a back-test of the sample period. Demo response.',
        plannedAction: 'Complete CAP-2026-003 remediation: re-tuned rules in production, minuted tuning committee, back-test report.',
        plannedDate: isoDay(-14),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-60, 9, 30), actorName: 'Hauwa Sadiq', actorRoleLabel: 'AML Specialist', decision: 'Raised', comment: 'Raised from procedure AML-01 in EXM-2025-031.' },
      { at: isoDateTime(-59, 14, 0), actorName: 'Hauwa Sadiq', actorRoleLabel: 'AML Specialist', decision: 'Submitted', comment: 'Five-Cs completed; evidence EV-2026-101/105 attached.' },
      { at: isoDateTime(-58, 10, 15), actorName: 'Daniel Adeyemi', actorRoleLabel: 'Supervisory Team Lead', decision: 'Approved', comment: 'Severity High endorsed; CAP-2026-003 to be agreed with management.' },
      { at: isoDateTime(-20, 16, 45), actorName: 'Zainab Lawal', actorRoleLabel: 'Legal/Enforcement Officer', decision: 'Escalated', comment: 'CAP-2026-003 past due without validated remediation; enforcement case ENF-2026-001 opened and directive DIR-2026-004 issued (demo).' },
    ],
  },
  'FND-2026-104': {
    fiveCs: {
      condition:
        'Sampled credit files lack updated collateral valuations in 18% of cases (demo sample of 25 files across three branches).',
      criteria: 'Institution credit policy requires collateral revaluation every 3 years (demo standard); MBA/PRU/2024 §5.2 (demo reference).',
      cause: 'Valuation vendor backlog after the 2025 branch consolidation (demo); no exception tracking for overdue valuations.',
      consequence: 'Provisioning and LTV-based decisions may rely on stale collateral values, understating credit risk.',
      recommendation: 'Complete revaluation of the affected files within one demo quarter and implement an overdue-valuation exception report.',
    },
    severityRationale: 'Medium: limited to 18% of the sample; no direct regulatory limit breach; remediable within a quarter. Demo rationale.',
    breachClassification: 'Deficiency',
    regulatoryReference: 'MBA/PRU/2024 §5.2 (demo reference)',
    institutionOwnerRole: 'Head of Credit Risk (Meridian — demo role)',
    crossDomainLinks: ['AML/CFT'],
    evidenceLinks: [{ reference: 'EXM-2026-014 work programme', description: 'Raised from ad-hoc credit file review during AML thematic fieldwork' }],
    reviewerName: 'Chuka Eze',
    approvalTrail: [
      { at: isoDateTime(-30, 10, 0), actorName: 'Peter Okonjo', actorRoleLabel: 'Examiner', decision: 'Raised', comment: 'Ad-hoc file review alongside AML-01 testing.' },
      { at: isoDateTime(-29, 9, 0), actorName: 'Peter Okonjo', actorRoleLabel: 'Examiner', decision: 'Submitted' },
      { at: isoDateTime(-27, 15, 30), actorName: 'Chuka Eze', actorRoleLabel: 'Principal Examiner', decision: 'Approved', comment: 'Confirmed at Medium severity.' },
    ],
  },
  'FND-2026-107': {
    fiveCs: {
      condition:
        'Periodic CDD refresh is overdue for 2,300 high-risk customers (demo figure); the backlog is not tracked in board risk reporting.',
      criteria: 'MBA/AML/2023 §4.1 (demo reference): annual refresh cycle for high-risk customers.',
      cause: 'Onboarding surge in 2025 outpaced compliance staffing; refresh workflow alerts were disabled during a core-banking migration (demo).',
      consequence: 'Stale customer risk profiles degrade monitoring quality and may breach CDD obligations for high-risk relationships.',
      recommendation:
        'Restore refresh workflow alerts; deliver a dated backlog-clearance plan (two demo quarters); report progress monthly to the board risk committee.',
    },
    severityRationale: 'High: population is large, concentrated in the high-risk tier, and interacts with the monitoring gaps in FND-2026-101. Demo rationale.',
    breachClassification: 'Breach',
    regulatoryReference: 'MBA/AML/2023 §4.1 (demo reference)',
    institutionOwnerRole: 'Chief Compliance Officer (Meridian — demo role)',
    crossDomainLinks: ['Operations'],
    evidenceLinks: [{ reference: 'EV-2026-104', description: 'CDD periodic refresh tracker by risk tier' }],
    procedure: { code: 'AML-03' },
    approvalTrail: [
      { at: isoDateTime(-12, 11, 0), actorName: 'Nkechi Balogun', actorRoleLabel: 'Examiner', decision: 'Raised', comment: 'Raised from procedure AML-03 (Fail) in EXM-2026-014.' },
      { at: isoDateTime(-12, 16, 0), actorName: 'Nkechi Balogun', actorRoleLabel: 'Examiner', decision: 'Submitted', comment: 'Awaiting team lead review.' },
    ],
  },
  'FND-2026-109': {
    fiveCs: {
      condition:
        'Board risk committee received quarterly risk reports after the demo 30-day timeliness standard on two occasions in the review period.',
      criteria: 'Institution board charter: risk reports within 30 days of quarter-end (demo standard).',
      cause: 'Manual consolidation of branch risk data delays the pack; no automated cut-off tracking (demo).',
      consequence: 'Delayed board challenge of emerging risks, including the AML backlog in FND-2026-107.',
      recommendation: 'Automate consolidation cut-offs and add timeliness to the company secretary\'s quarterly checklist.',
    },
    severityRationale: 'Low: governance timeliness issue with no direct loss or breach of a regulatory limit. Demo rationale.',
    breachClassification: 'Observation',
    regulatoryReference: 'MBA/GOV/2024 §2.1 (demo reference)',
    institutionOwnerRole: 'Company Secretary (Meridian — demo role)',
    crossDomainLinks: ['AML/CFT'],
    evidenceLinks: [{ reference: 'EXM-2026-014 work programme', description: 'Committee minutes inspection during fieldwork' }],
    approvalTrail: [
      { at: isoDateTime(-4, 14, 30), actorName: 'Chuka Eze', actorRoleLabel: 'Principal Examiner', decision: 'Raised', comment: 'Draft — pending five-Cs review before submission (My Work item for Amara Osei).' },
    ],
  },
  'FND-2026-087': {
    fiveCs: {
      condition: 'Daily liquidity returns were submitted after the cut-off on six occasions in Q3 2026 (demo record).',
      criteria: 'MBA/PRU/2024 §9.1 (demo reference): daily liquidity reporting by the cut-off.',
      cause: 'Treasury back-office vacancy and manual submission process (demo).',
      consequence: 'Supervisor visibility of liquidity stress is delayed during amber periods, weakening early-warning response.',
      recommendation: 'Automate submission feeds; interim dual-control checklist; CAP-2026-002 tracks remediation.',
    },
    severityRationale: 'Medium: repeated but self-corrected within days; no misstatement identified. Demo rationale.',
    breachClassification: 'Deficiency',
    regulatoryReference: 'MBA/PRU/2024 §9.1 (demo reference)',
    institutionOwnerRole: 'Treasurer (Northstar — demo role)',
    crossDomainLinks: ['Operations'],
    evidenceLinks: [{ reference: 'EXM-2026-009 work programme', description: 'Submission timestamp log' }],
    procedure: { code: 'LIQ-03' },
    reviewerName: 'Fatima Bello',
    managementResponses: [
      {
        respondedByName: 'Ibrahim Sani',
        respondedByOrg: 'Northstar Merchant Bank (institution portal — demo)',
        at: isoDateTime(-40, 10, 0),
        position: 'Accepted',
        responseText: 'Accepted. Automation project funded; interim checklist in operation since October 2026 (demo).',
        plannedAction: 'CAP-2026-002 straight-through submission live',
        plannedDate: isoDay(7),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-45, 9, 0), actorName: 'Fatima Bello', actorRoleLabel: 'Prudential Analyst', decision: 'Raised' },
      { at: isoDateTime(-44, 9, 0), actorName: 'Fatima Bello', actorRoleLabel: 'Prudential Analyst', decision: 'Submitted' },
      { at: isoDateTime(-42, 11, 0), actorName: 'Daniel Adeyemi', actorRoleLabel: 'Supervisory Team Lead', decision: 'Approved' },
    ],
  },
  'FND-2026-091': {
    fiveCs: {
      condition: 'Two intraday dealing-limit breaches were not escalated to ALCO within the demo 24-hour standard.',
      criteria: 'Institution treasury policy §6 (demo): escalation of limit breaches within 24 hours.',
      cause: 'Alerts routed to a shared mailbox with no ownership during leave periods (demo).',
      consequence: 'Delayed governance response to market-risk limit exceptions.',
      recommendation: 'Named-owner alert routing; ALCO standing agenda item for breach log review.',
    },
    severityRationale: 'Medium: control breakdown with limited exposure; both breaches reversed same-day (demo).',
    breachClassification: 'Deficiency',
    regulatoryReference: 'Institution treasury policy (demo)',
    institutionOwnerRole: 'Head of Treasury (Northstar — demo role)',
    crossDomainLinks: ['Operational Resilience'],
    evidenceLinks: [],
    reviewerName: 'Fatima Bello',
    approvalTrail: [
      { at: isoDateTime(-20, 9, 0), actorName: 'Aisha Yusuf', actorRoleLabel: 'Risk Analyst', decision: 'Raised' },
      { at: isoDateTime(-19, 9, 0), actorName: 'Aisha Yusuf', actorRoleLabel: 'Risk Analyst', decision: 'Submitted' },
      { at: isoDateTime(-18, 10, 0), actorName: 'Fatima Bello', actorRoleLabel: 'Prudential Analyst', decision: 'Approved' },
    ],
  },
  'FND-2026-033': {
    fiveCs: {
      condition: 'NPL classification understated: re-aged facilities worth 4.1% of the demo loan book sit in buckets below the required classification.',
      criteria: 'MBA/PRU/2024 §5.2 (demo reference): classification by days-past-due and restructuring status.',
      cause: 'Re-ageing performed without documented borrower repayment performance as required (demo).',
      consequence: 'Provisioning shortfall and misstated asset quality reporting; contributed to the capital misstatement in FND-2026-030.',
      recommendation: 'Reclassify the affected population, restate provisioning, and require board-approved re-ageing criteria.',
    },
    severityRationale: 'High: quantified misstatement above the demo materiality threshold in an institution already below minimum capital.',
    breachClassification: 'Breach',
    regulatoryReference: 'MBA/PRU/2024 §5.2 (demo reference)',
    institutionOwnerRole: 'Chief Risk Officer (Vanguard — demo role)',
    crossDomainLinks: ['Capital Adequacy', 'Governance'],
    evidenceLinks: [{ reference: 'EXM-2026-012 work programme', description: 'Re-computation working papers (archived)' }],
    procedure: { code: 'CRD-02' },
    reviewerName: 'Chuka Eze',
    managementResponses: [
      {
        respondedByName: 'Kunle Oyelowo',
        respondedByOrg: 'Vanguard Regional Bank (institution portal — demo)',
        at: isoDateTime(-6, 15, 0),
        position: 'Partially Accepted',
        responseText:
          'The bank accepts classification errors on retail re-ageing but disputes the corporate bucket quantification (demo). Response awaits supervisory assessment — My Work item for Amara Osei.',
        plannedAction: 'Retail reclassification in the November close; corporate population under review.',
        plannedDate: isoDay(20),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-95, 9, 0), actorName: 'Peter Okonjo', actorRoleLabel: 'Examiner', decision: 'Raised' },
      { at: isoDateTime(-94, 9, 0), actorName: 'Peter Okonjo', actorRoleLabel: 'Examiner', decision: 'Submitted' },
      { at: isoDateTime(-92, 10, 0), actorName: 'Chuka Eze', actorRoleLabel: 'Principal Examiner', decision: 'Approved' },
    ],
  },
  'FND-2026-030': {
    fiveCs: {
      condition: 'Capital adequacy ratio fell to 6.4% against the demo 10% regulatory minimum and remained below for two consecutive quarters.',
      criteria: 'MBA/PRU/2024 §3.1 (demo reference): minimum capital adequacy.',
      cause: 'Loss absorption from misclassified NPLs (FND-2026-033) and connected-party lending concentrations (FND-2026-031).',
      consequence: 'Solvency concern; triggered licence suspension and enforcement case ENF-2026-002 (demo).',
      recommendation: 'Capital restoration and governance restructuring plan (CAP-2026-007) under supervisory monitoring; consider resolution options if unmet.',
    },
    severityRationale: 'Critical: sustained breach of the minimum capital requirement with depositor-protection implications. Demo rationale.',
    breachClassification: 'Breach',
    regulatoryReference: 'MBA/PRU/2024 §3.1 (demo reference)',
    institutionOwnerRole: 'Managing Director (Vanguard — demo role)',
    crossDomainLinks: ['Credit Risk', 'Governance', 'Liquidity Risk'],
    evidenceLinks: [{ reference: 'EV-2026-109', description: 'Capital restoration evidence — batch 2 (pending review)' }],
    procedure: { code: 'CAP-01' },
    reviewerName: 'Tunde Bakare',
    managementResponses: [
      {
        respondedByName: 'Kunle Oyelowo',
        respondedByOrg: 'Vanguard Regional Bank (institution portal — demo)',
        at: isoDateTime(-80, 12, 0),
        position: 'Accepted',
        responseText: 'Accepted. Capital restoration plan submitted with shareholder support commitments (demo).',
        plannedAction: 'CAP-2026-007 milestones: recapitalisation tranche 1, board restructuring, monthly reporting.',
        plannedDate: isoDay(25),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-100, 9, 0), actorName: 'Chuka Eze', actorRoleLabel: 'Principal Examiner', decision: 'Raised' },
      { at: isoDateTime(-99, 9, 0), actorName: 'Chuka Eze', actorRoleLabel: 'Principal Examiner', decision: 'Submitted' },
      { at: isoDateTime(-98, 10, 0), actorName: 'Tunde Bakare', actorRoleLabel: 'Deputy Director', decision: 'Approved', comment: 'Critical severity endorsed.' },
      { at: isoDateTime(-75, 16, 0), actorName: 'Zainab Lawal', actorRoleLabel: 'Legal/Enforcement Officer', decision: 'Escalated', comment: 'Enforcement case ENF-2026-002; licence suspended (demo).' },
    ],
  },
  'FND-2026-066': {
    fiveCs: {
      condition: 'Third-party risk register is missing two payment aggregators integrated in Q2 2026 (demo record).',
      criteria: 'MBA/CYB/2025 §5.2 (demo reference): register of material technology third parties with current assurance.',
      cause: 'Integration approvals ran through the product team without triggering the risk-register workflow (demo).',
      consequence: 'Unassured third-party exposure in the payment chain of a payment-focused institution.',
      recommendation: 'Register uplift with change-management gate; CAP-2026-008 tracks remediation.',
    },
    severityRationale: 'Medium: two unregistered material parties; no incident reported to date (demo).',
    breachClassification: 'Deficiency',
    regulatoryReference: 'MBA/CYB/2025 §5.2 (demo reference)',
    institutionOwnerRole: 'Chief Technology Officer (Crestline — demo role)',
    crossDomainLinks: ['Operational Resilience'],
    evidenceLinks: [
      { reference: 'EV-2026-107', description: 'Third-party risk register — Q1 2026 snapshot' },
      { reference: 'EV-2026-108', description: 'Updated register extract (pending review)' },
    ],
    procedure: { code: 'CYB-01' },
    reviewerName: 'Kwame Mensah',
    managementResponses: [
      {
        respondedByName: 'Zara Nwosu',
        respondedByOrg: 'Crestline Payment Bank (institution portal — demo)',
        at: isoDateTime(-25, 10, 0),
        position: 'Accepted',
        responseText: 'Accepted; register updated and change gate implemented in the release pipeline (demo).',
        plannedAction: 'CAP-2026-008 assurance reviews for both aggregators',
        plannedDate: isoDay(12),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-28, 9, 0), actorName: 'Kwame Mensah', actorRoleLabel: 'Cybersecurity Specialist', decision: 'Raised' },
      { at: isoDateTime(-27, 9, 0), actorName: 'Kwame Mensah', actorRoleLabel: 'Cybersecurity Specialist', decision: 'Submitted' },
      { at: isoDateTime(-26, 11, 0), actorName: 'Daniel Adeyemi', actorRoleLabel: 'Supervisory Team Lead', decision: 'Approved' },
    ],
  },
  'FND-2026-044': {
    fiveCs: {
      condition: 'Final validation of loan appraisal remediation evidence is pending closure; earlier re-testing found two files with incomplete appraisals (demo).',
      criteria: 'Supervisory agreement under CAP-2026-005: full re-appraisal of the sampled population.',
      cause: 'Remediation completed late; validation sampling overlapped the branch relocation (demo).',
      consequence: 'Closure decision delayed; residual credit documentation risk remains until validated.',
      recommendation: 'Complete validation sampling in EXM-2026-017 and take the closure decision in the remediation workspace.',
    },
    severityRationale: 'Medium: remediation substantially complete; residual exceptions limited (demo).',
    breachClassification: 'Deficiency',
    regulatoryReference: 'MBA/PRU/2024 §5.2 (demo reference)',
    institutionOwnerRole: 'Head of Credit (Delta — demo role)',
    crossDomainLinks: [],
    evidenceLinks: [{ reference: 'EV-2026-106', description: 'Delta credit file sampling pack — batch 1 of 3' }],
    procedure: { code: 'CRD-01' },
    reviewerName: 'Nkechi Balogun',
    managementResponses: [
      {
        respondedByName: 'Ngozi Emenike',
        respondedByOrg: 'Delta Microfinance Bank (institution portal — demo)',
        at: isoDateTime(-30, 10, 0),
        position: 'Accepted',
        responseText: 'Accepted; re-appraisals complete for 23 of 25 files (demo).',
        plannedAction: 'CAP-2026-005 final evidence pack',
        plannedDate: isoDay(-5),
      },
    ],
    approvalTrail: [
      { at: isoDateTime(-70, 9, 0), actorName: 'Nkechi Balogun', actorRoleLabel: 'Examiner', decision: 'Raised' },
      { at: isoDateTime(-69, 9, 0), actorName: 'Nkechi Balogun', actorRoleLabel: 'Examiner', decision: 'Submitted' },
      { at: isoDateTime(-68, 10, 0), actorName: 'Lerato Mokoena', actorRoleLabel: 'Assistant Director', decision: 'Approved' },
    ],
  },
}

// ---------------------------------------------------------------------------
// Synthesiser for findings without hand-written detail
// ---------------------------------------------------------------------------

const synth = (f: SupervisoryFinding): DetailSeed => ({
  fiveCs: {
    condition: f.description,
    criteria: `Demo criteria for the ${f.category} domain — regulatory mapping maintained in the examination library (illustrative).`,
    cause: 'Root-cause analysis recorded in the examination working papers (demo placeholder).',
    consequence: `Potential adverse impact on the institution's ${f.category.toLowerCase()} risk posture (demo assessment).`,
    recommendation: 'Remediate the condition, evidence the fix, and report progress to the supervisory team (demo recommendation).',
  },
  severityRationale: `Severity ${f.riskRating} per the demo severity matrix applied at review time.`,
  breachClassification: f.riskRating === 'Critical' || f.riskRating === 'High' ? 'Breach' : 'Deficiency',
  regulatoryReference: 'Demo regulatory reference — see examination library mapping',
  institutionOwnerRole: 'Accountable executive (demo role)',
  crossDomainLinks: [],
  evidenceLinks: [],
})

/** Merge base finding + detail seed into the full FindingDetail contract. */
export const buildFindingDetail = (f: SupervisoryFinding): FindingDetail => {
  const seed = SEEDS[f.reference] ?? synth(f)
  return {
    ...f,
    fiveCs: seed.fiveCs,
    severityRationale: seed.severityRationale,
    breachClassification: seed.breachClassification,
    regulatoryReference: seed.regulatoryReference,
    institutionOwnerRole: seed.institutionOwnerRole,
    crossDomainLinks: seed.crossDomainLinks,
    evidenceLinks: seed.evidenceLinks,
    procedureId: undefined, // resolved lazily by the repository (exam context varies)
    procedureCode: seed.procedure?.code,
    managementResponses: (seed.managementResponses ?? []).map((r, i) => ({
      ...r,
      id: demoUuid(63, hashRef(f.reference) + i),
      findingId: f.id,
    })),
    approvalTrail: (
      seed.approvalTrail ?? [
        { at: `${f.raisedDate}T09:00:00.000Z`, actorName: f.ownerName, actorRoleLabel: 'Examiner', decision: 'Raised' as const },
      ]
    ).map((e, i) => ({ ...e, id: demoUuid(64, hashRef(f.reference) * 10 + i) })),
    reviewerName: seed.reviewerName,
  }
}

/** Small deterministic numeric hash so approval-event ids stay stable. */
const hashRef = (ref: string): number =>
  Array.from(ref).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

export const FINDING_DETAIL_SEED_REFS = Object.keys(SEEDS)
