/**
 * Specialist supervisory domain contracts (Spec §9, Phase 4B/4C). One
 * generic layer covers ALL six §9 domains — corporate governance (§9.1),
 * enterprise risk management (§9.2), IT & cybersecurity (§9.3), AML/CFT
 * (§9.4), operations (§9.5) and consumer protection (§9.6) — so the shared
 * 8-part page pattern (domain dashboard · assessment register · assessment
 * detail · checklist & procedures · evidence · findings · report ·
 * historical assessments) is built once and instantiated per domain by
 * configuration. Assessments map to §10.1 regulatory requirements by
 * citation (Phase-4 acceptance: a specialist examination rendered against
 * regulatory requirement records) and reuse the 4A `FrameworkMapping`
 * relation shape so cross-module chips never drift. All content is
 * fictional demo data (Spec §17.5); report issuance is simulated.
 */
import type {
  FrameworkDocumentConfidentiality,
  FrameworkMapping,
  SupervisoryDomain,
} from './regulatory'

// ---------------------------------------------------------------------------
// Assessments (Spec §9 pattern parts 2, 3 and 8)
// ---------------------------------------------------------------------------

export type SpecialistAssessmentStatus = 'Planned' | 'In Progress' | 'In Review' | 'Completed'

export type SpecialistAssessmentType =
  | 'Full Assessment'
  | 'Thematic Review'
  | 'Targeted Review'
  | 'Maturity Assessment'

/** Overall supervisory conclusion once the assessment is completed. */
export type SpecialistConclusion = 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory'

/** Demo maturity scale used by the domain dashboards (illustrative only). */
export interface SpecialistMaturity {
  /** 1–5 demo scale. */
  score: number
  label: string
}

export interface SpecialistAssessment {
  /** UUID-shaped id */
  id: string
  /** Human reference, e.g. GOVA-2026-001 / ERMA-2026-001 / CYBA-2026-001. */
  reference: string
  domain: SupervisoryDomain
  institutionId: string
  title: string
  type: SpecialistAssessmentType
  status: SpecialistAssessmentStatus
  /** Review period covered, e.g. "Q1–Q3 2026". */
  periodCovered: string
  /** ISO 8601 */
  startDate: string
  /** ISO 8601 — fieldwork/report target date. */
  targetDate: string
  /** ISO 8601 — set when completed. */
  completedDate?: string
  leadName: string
  teamNames: string[]
  scopeSummary: string
  conclusion?: SpecialistConclusion
  maturity?: SpecialistMaturity
  /** When the assessment runs as/alongside a §7 examination, its reference. */
  examinationRef?: string
  /** §10.1 requirement citations under assessment, e.g. "MBA/GOV/2024 §2.1". */
  requirementCitations: string[]
  /** Story anchors (findings, CAPs, alerts, examinations…) — chips/links. */
  relations: FrameworkMapping[]
  report: SpecialistReport
  /** ISO 8601 */
  lastActivityAt: string
}

/** Register row pre-joined with institution labels. */
export interface SpecialistAssessmentRow extends SpecialistAssessment {
  institutionName: string
  institutionCode: string
  institutionCategory: string
  /** Checklist progress for the register, e.g. "12/16". */
  checklistProgress: { completed: number; total: number }
  openFindingCount: number
}

export interface SpecialistQuery {
  domain?: SupervisoryDomain
  institutionId?: string
  status?: string
  type?: string
  /** Match reference, title or institution name. */
  search?: string
}

// ---------------------------------------------------------------------------
// Domain dashboard (Spec §9 pattern part 1)
// ---------------------------------------------------------------------------

/** Submodule coverage row — one per §9.x submodule bullet. */
export interface SpecialistSubmoduleCoverage {
  key: string
  label: string
  /** Assessments touching this submodule in the current cycle. */
  assessments: number
  /** Checklist items concluded Deficient across those assessments. */
  deficientItems: number
  /** Demo maturity 1–5 for the submodule (illustrative). */
  maturityScore: number
}

/** Per-institution posture row on the domain dashboard. */
export interface SpecialistInstitutionPosture {
  institutionId: string
  institutionName: string
  institutionCode: string
  riskRating: string
  /** Latest completed assessment's demo maturity; absent until one completes. */
  maturity?: SpecialistMaturity
  openAssessments: number
  openFindingCount: number
  /** Demo trend vs the previous cycle: 'Improving' | 'Stable' | 'Deteriorating'. */
  trend: 'Improving' | 'Stable' | 'Deteriorating'
  latestAssessmentRef?: string
}

export interface SpecialistDashboard {
  domain: SupervisoryDomain
  totals: {
    institutionsCovered: number
    activeAssessments: number
    completedThisYear: number
    openFindings: number
    overdueEvidenceRequests: number
  }
  /** Demo maturity distribution across covered institutions (1–5 buckets). */
  maturityDistribution: Array<{ score: number; label: string; count: number }>
  submoduleCoverage: SpecialistSubmoduleCoverage[]
  posture: SpecialistInstitutionPosture[]
  /** Latest story-anchored relations across the domain's assessments. */
  recentRelations: FrameworkMapping[]
}

// ---------------------------------------------------------------------------
// Checklist & procedures (Spec §9 pattern part 4)
// ---------------------------------------------------------------------------

export type ChecklistItemStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Satisfactory'
  | 'Deficient'
  | 'Not Applicable'

export interface SpecialistChecklistItem {
  /** UUID-shaped id */
  id: string
  assessmentId: string
  /** Submodule key this item tests (matches domain config submodules). */
  submoduleKey: string
  /** Procedure code, e.g. GOV-01 / CYB-02. */
  code: string
  title: string
  objective: string
  /** Testing question carried over from the examination library procedure. */
  procedureQuestion: string
  testSteps: string[]
  method: string
  sample: string
  priority: 'High' | 'Medium' | 'Low'
  status: ChecklistItemStatus
  assessorName?: string
  /** ISO 8601 */
  assessedAt?: string
  conclusionNote?: string
  /** §10.1 requirement citations this item discharges (Phase-4 acceptance). */
  requirementCitations: string[]
  /** Examination-library procedure citation, e.g. "MBA/CYB/2025 §3.1". */
  criteriaRef: string
  expectedEvidence: string[]
  /** Findings raised from this item (FND-… references). */
  findingRefs: string[]
}

// ---------------------------------------------------------------------------
// Evidence (Spec §9 pattern part 5; §9.3 domain-specific evidence fields)
// ---------------------------------------------------------------------------

export type SpecialistEvidenceKind =
  | 'Policy'
  | 'Register extract'
  | 'Minutes'
  | 'Report'
  | 'Architecture diagram'
  | 'Access review'
  | 'Vulnerability report'
  | 'Incident log'
  | 'SOC alert'
  | 'DR test'
  | 'Third-party assurance'
  | 'Other'

export type SpecialistEvidenceStatus = 'Requested' | 'Received' | 'Reviewed' | 'Insufficient'

export interface SpecialistEvidenceItem {
  /** UUID-shaped id */
  id: string
  assessmentId: string
  name: string
  kind: SpecialistEvidenceKind
  /** Checklist item this evidence supports, when targeted. */
  checklistItemId?: string
  status: SpecialistEvidenceStatus
  /** ISO 8601 — requested date. */
  requestedAt: string
  /** ISO 8601 — when received (simulated). */
  receivedAt?: string
  /** ISO 8601 — review due date for outstanding requests. */
  dueAt?: string
  requestedByName: string
  providedByName?: string
  sizeKb?: number
  confidentiality: FrameworkDocumentConfidentiality
  reviewNote?: string
  /** Prototype honesty — nothing real is stored (Spec §17.4). */
  storageNote: string
}

// ---------------------------------------------------------------------------
// Findings view (Spec §9 pattern part 6)
// ---------------------------------------------------------------------------

/** Domain findings are the §7.7 finding records filtered to the domain's
 *  category/assessments, pre-joined for the pattern's findings panel. */
export interface SpecialistFindingRow {
  id: string
  reference: string
  title: string
  riskRating: string
  status: string
  institutionId: string
  institutionName: string
  /** ISO 8601 */
  raisedDate: string
  /** ISO 8601 */
  dueDate: string
  ownerName: string
  /** In-app link to the findings register/detail. */
  link: string
  /** Assessment reference when the finding came from a specialist assessment. */
  assessmentRef?: string
}

// ---------------------------------------------------------------------------
// Report (Spec §9 pattern part 7)
// ---------------------------------------------------------------------------

export type SpecialistReportStatus = 'Not Started' | 'Draft' | 'In Review' | 'Issued (demo)'

export interface SpecialistReportSection {
  id: string
  heading: string
  body: string
  /** Requirement citations evidenced by this section. */
  requirementCitations: string[]
}

export interface SpecialistReport {
  status: SpecialistReportStatus
  executiveSummary: string
  sections: SpecialistReportSection[]
  /** ISO 8601 — when issued (demo). */
  issuedAt?: string
  issuedByName?: string
  reviewerName?: string
  /** Simulated dispatch note — never a real communication (§10.3 honesty). */
  storageNote: string
}

// ---------------------------------------------------------------------------
// Mutation inputs (role-gated, Spec §19)
// ---------------------------------------------------------------------------

export interface CreateSpecialistAssessmentInput {
  domain: SupervisoryDomain
  institutionId: string
  title: string
  type: SpecialistAssessmentType
  periodCovered: string
  /** ISO 8601 */
  startDate: string
  /** ISO 8601 */
  targetDate: string
  scopeSummary: string
  /** Submodule keys to include — the checklist is generated from them. */
  submoduleKeys: string[]
  /** Optional §7 examination to run alongside (EXM-… reference). */
  examinationRef?: string
}

/** Record a checklist conclusion (Spec §9 part 4 workflow). */
export interface RecordChecklistResultInput {
  status: ChecklistItemStatus
  conclusionNote: string
}

/** Simulated evidence request/receipt. */
export interface RequestEvidenceInput {
  assessmentId: string
  name: string
  kind: SpecialistEvidenceKind
  checklistItemId?: string
  /** ISO 8601 */
  dueAt: string
  note: string
}

export interface SpecialistReportDecisionInput {
  note: string
}

// ---------------------------------------------------------------------------
// Domain configuration (Spec §9.1–§9.6 — static per-domain metadata that
// parameterizes the shared page pattern; delivered by the service so
// components never import fixtures)
// ---------------------------------------------------------------------------

export interface SpecialistSubmodule {
  key: string
  label: string
  description: string
}

/** Checklist/procedure template mirroring an examination library procedure. */
export interface SpecialistChecklistTemplate {
  code: string
  submoduleKey: string
  title: string
  objective: string
  procedureQuestion: string
  testSteps: string[]
  method: string
  sample: string
  priority: 'High' | 'Medium' | 'Low'
  /** Examination-library / rulebook citation the item is tested against. */
  criteriaRef: string
  /** §10.1 requirement citations discharged by this item. */
  requirementCitations: string[]
  expectedEvidence: string[]
}

export interface SpecialistDomainSpec {
  domain: SupervisoryDomain
  label: string
  /** Spec section, e.g. "§9.1". */
  specRef: string
  route: string
  /** Assessment reference prefix, e.g. GOVA-2026-001. */
  refPrefix: string
  intro: string
  /** Examination library programme whose procedures the checklist mirrors. */
  libraryProgrammeCode?: string
  /** Finding categories surfaced on the pattern's findings panel. */
  findingCategories: string[]
  submodules: SpecialistSubmodule[]
  checklistTemplates: SpecialistChecklistTemplate[]
  /** Demo evidence kinds offered by the request-evidence form (§9.3). */
  evidenceKinds: SpecialistEvidenceKind[]
}

// ---------------------------------------------------------------------------
// Detail view (Spec §9 pattern parts 3–8 joined for one assessment)
// ---------------------------------------------------------------------------

/** A §10.1 requirement citation resolved for display (Phase-4 acceptance:
 *  the specialist assessment renders against regulatory requirement records). */
export interface SpecialistRequirementRef {
  /** Full citation, e.g. "MBA/GOV/2024 §2.1". */
  citation: string
  /** Resolved requirement record — absent when the citation is not in the §10 library. */
  requirementId?: string
  title?: string
  status?: string
  /** Deep link into the Regulatory Frameworks drawer when resolved. */
  link?: string
}

export interface SpecialistAssessmentDetail {
  assessment: SpecialistAssessment
  institution: {
    id: string
    name: string
    code: string
    category: string
    riskRating: string
  }
  checklist: SpecialistChecklistItem[]
  evidence: SpecialistEvidenceItem[]
  /** Findings for this institution in the domain + raised from this checklist. */
  findings: SpecialistFindingRow[]
  /** §10.1 requirement records behind the assessment's citations. */
  requirements: SpecialistRequirementRef[]
  /** Pattern part 8 — completed assessments for the same institution+domain. */
  history: SpecialistAssessmentRow[]
  progress: { completed: number; total: number }
}
