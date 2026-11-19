/**
 * Regulatory administration domain contracts (Spec §10.1–§10.3, §18.4,
 * Phase 4A). Frameworks and requirements are designed to be referenceable
 * by the Phase-4B/4C specialist domains (§9): every requirement carries a
 * `SupervisoryDomain` so a specialist examination can be mapped to
 * regulatory requirements (Phase-4 acceptance, Spec §21). One story-world:
 * framework citations (MBA/PRU/2024, MBA/AML/2023, …) match the
 * `regulatoryMapping` references already carried by the examination
 * library, and obligations/correspondence anchor the same institutions,
 * examinations, findings, returns and alerts as the rest of the dataset.
 * All content is fictional demo data (Spec §17.5); AI-extracted draft
 * requirements are always distinguishable from approved regulatory content
 * (Spec §10.1) and labelled "Demo AI response".
 */

// ---------------------------------------------------------------------------
// Frameworks (Spec §10.1)
// ---------------------------------------------------------------------------

export type FrameworkCategory =
  | 'Prudential'
  | 'AML/CFT'
  | 'Governance'
  | 'Cybersecurity'
  | 'Consumer Protection'
  | 'Payments'
  | 'Non-Interest Banking'

export type FrameworkStatus = 'Active' | 'Under Consultation' | 'Draft' | 'Superseded'

/**
 * Specialist supervision domains (Spec §9) plus 'prudential' — the reuse
 * hook for Phase 4B/4C: a specialist examination maps to requirements by
 * this key (Phase-4 acceptance, Spec §21).
 */
export type SupervisoryDomain =
  | 'prudential'
  | 'governance'
  | 'erm'
  | 'cybersecurity'
  | 'aml'
  | 'operations'
  | 'consumer-protection'

export const SUPERVISORY_DOMAIN_LABELS: Record<SupervisoryDomain, string> = {
  prudential: 'Prudential supervision',
  governance: 'Corporate governance (§9.1)',
  erm: 'Enterprise risk management (§9.2)',
  cybersecurity: 'IT & cybersecurity (§9.3)',
  aml: 'AML/CFT/CPF (§9.4)',
  operations: 'Operations & internal controls (§9.5)',
  'consumer-protection': 'Consumer protection (§9.6)',
}

/**
 * 'AI-Extracted Draft' marks machine-extracted content from a simulated
 * framework upload — never presented as approved regulatory text (§10.1).
 */
export type RequirementStatus =
  | 'Approved'
  | 'Under Review'
  | 'AI-Extracted Draft'
  | 'Rejected'
  | 'Superseded'

export type FrameworkDocumentConfidentiality = 'Public' | 'Internal' | 'Restricted'

export interface FrameworkDocument {
  id: string
  name: string
  version: string
  /** ISO 8601 */
  uploadedAt: string
  uploadedByName: string
  sizeKb: number
  confidentiality: FrameworkDocumentConfidentiality
  /** Prototype honesty — attachments are simulated, no real file is stored. */
  storageNote: string
}

export interface FrameworkVersionEntry {
  version: string
  /** ISO 8601 */
  effectiveFrom: string
  changeSummary: string
  approvedByName?: string
  /** ISO 8601 */
  approvedAt?: string
}

export type FrameworkMappingKind =
  | 'examination-procedure'
  | 'obligation'
  | 'return-definition'
  | 'return-submission'
  | 'indicator'
  | 'alert'
  | 'corrective-action'
  | 'examination'
  | 'finding'
  | 'directive'
  | 'enforcement'

export const MAPPING_KIND_LABELS: Record<FrameworkMappingKind, string> = {
  'examination-procedure': 'Examination procedure',
  obligation: 'Obligation',
  'return-definition': 'Return definition',
  'return-submission': 'Return submission',
  indicator: 'Prudential indicator',
  alert: 'Early warning alert',
  'corrective-action': 'Corrective action',
  examination: 'Examination',
  finding: 'Finding',
  directive: 'Directive',
  enforcement: 'Enforcement',
}

export interface FrameworkMapping {
  id: string
  kind: FrameworkMappingKind
  /** Human reference, e.g. "MBA/AML/2023 §6.3", "OBL-2026-004", "EXM-2026-014". */
  targetRef: string
  targetLabel: string
  /** In-app route when the target exists in the prototype. Directive and
   *  enforcement targets are Phase-5 placeholders — chip only, never a link. */
  link?: string
  note?: string
}

export interface RegulatoryFramework {
  /** UUID-shaped id */
  id: string
  /** Canonical citation code, e.g. MBA/PRU/2024. */
  code: string
  name: string
  category: FrameworkCategory
  /** Session jurisdiction code, e.g. MBA. */
  jurisdictionCode: string
  jurisdictionName: string
  issuingAuthority: string
  version: string
  /** ISO 8601 */
  publishedDate: string
  /** ISO 8601 */
  effectiveDate: string
  status: FrameworkStatus
  description: string
  /** Licence categories this framework applies to (InstitutionCategory values). */
  applicableCategories: string[]
  /** Specialist domains served — the §9 reuse anchors for Phase 4B/4C. */
  domains: SupervisoryDomain[]
  sourceDocuments: FrameworkDocument[]
  versions: FrameworkVersionEntry[]
  mappings: FrameworkMapping[]
  /** Regulatory analyst owning the framework record. */
  ownerName: string
  /** ISO 8601 */
  lastReviewedAt: string
}

/** Requirement detail per Spec §10.1 (reference, text, legal source,
 *  effective period, categories, domain, evidence, procedures, obligations). */
export interface RegulatoryRequirement {
  /** UUID-shaped id */
  id: string
  frameworkId: string
  /** Citation within the framework, e.g. "§3.1". */
  reference: string
  title: string
  text: string
  /** Legal/standard source, e.g. "MBA Prudential Standards 2024, §3.1". */
  legalSource: string
  /** ISO 8601 */
  effectiveFrom: string
  /** ISO 8601 — present on superseded requirements. */
  effectiveTo?: string
  status: RequirementStatus
  institutionCategories: string[]
  domain: SupervisoryDomain
  evidenceExpected: string[]
  /** Examination library procedure/programme references mapped to this rule. */
  mappedProcedureRefs: string[]
  /** Obligation references (OBL-…) derived from this requirement. */
  relatedObligationRefs: string[]
  /** Demo story anchors (findings/examinations/returns/alerts) illustrating
   *  how this rule is supervised — links resolve to real prototype pages. */
  storyAnchors: FrameworkMapping[]
  /** Present on AI-extracted drafts — prototype-honesty label (§10.1). */
  extractionNote?: string
  /** ISO 8601 — set when the requirement was approved. */
  approvedAt?: string
  approvedByName?: string
}

export interface FrameworkQuery {
  category?: string
  status?: string
  domain?: string
  search?: string
}

export interface FrameworkDetail {
  framework: RegulatoryFramework
  requirements: RegulatoryRequirement[]
  /** Demo institutions matched by the framework's licence categories. */
  applicableInstitutions: Array<{
    id: string
    name: string
    code: string
    category: string
  }>
}

/** Simulated framework upload (Spec §10.1 — upload + AI extraction). */
export interface UploadFrameworkInput {
  name: string
  code: string
  category: FrameworkCategory
  issuingAuthority: string
  version: string
  /** ISO 8601 */
  effectiveDate: string
  description: string
  /** Licence categories the framework applies to. */
  applicableCategories: string[]
  documentName: string
  /** Run the simulated "Demo AI extraction" pass over the document. */
  runAiExtraction: boolean
}

// ---------------------------------------------------------------------------
// Obligations (Spec §10.2)
// ---------------------------------------------------------------------------

export type ObligationFrequency =
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-Annual'
  | 'Annual'
  | 'Event-Driven'
  | 'Continuous'

/** Mirrors ComplianceBadge states (DS §8.8) for per-institution status. */
export type ObligationCompliance = 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Assessed'

export interface ObligationInstitutionStatus {
  institutionId: string
  status: ObligationCompliance
  /** ISO 8601 */
  lastVerifiedAt?: string
  note?: string
  /** Demo anchors tying the status to returns/findings/alerts/enforcement. */
  anchors: FrameworkMapping[]
}

export interface ObligationChangeEntry {
  id: string
  /** ISO 8601 */
  at: string
  byName: string
  change: string
  reason: string
}

export interface RegulatoryObligation {
  /** UUID-shaped id */
  id: string
  /** OBL-2026-001 */
  reference: string
  title: string
  description: string
  frameworkId: string
  /** Requirement citations within the framework, e.g. "§3.1". */
  requirementRefs: string[]
  applicableInstitutionIds: string[]
  responsibleDepartment: string
  /** ISO 8601 */
  effectiveFrom: string
  frequency: ObligationFrequency
  /** Evidence/return requirement that discharges the obligation. */
  evidenceRequirement: string
  /** Return definition code (MPR-09 …) when discharged via a return. */
  returnCode?: string
  /** ISO 8601 */
  lastReviewDate: string
  /** ISO 8601 */
  nextReviewDate: string
  reviewOwnerName: string
  institutionStatus: ObligationInstitutionStatus[]
  changeHistory: ObligationChangeEntry[]
}

/** Register row: obligation pre-joined with framework/institution labels. */
export interface ObligationRow extends RegulatoryObligation {
  frameworkCode: string
  frameworkName: string
  institutionNames: string[]
  /** Worst-case compliance across applicable institutions. */
  overallStatus: ObligationCompliance
  reviewOverdue: boolean
}

export interface ObligationDetail {
  obligation: RegulatoryObligation
  frameworkCode: string
  frameworkName: string
  frameworkStatus: FrameworkStatus
  /** Source requirements (citation + title + id) behind the obligation. */
  requirements: Array<{ id: string; reference: string; title: string; status: RequirementStatus }>
  /** Per-institution rows pre-joined with names/codes/categories. */
  institutions: Array<{
    id: string
    name: string
    code: string
    category: string
    status: ObligationInstitutionStatus
  }>
  /** Institutions NOT currently in scope — the applicability editor picks from these. */
  availableInstitutions: Array<{ id: string; name: string; code: string; category: string }>
}

export interface ObligationQuery {
  frameworkId?: string
  department?: string
  frequency?: string
  status?: string
  institutionId?: string
  search?: string
}

/** Applicability editor (Spec §10.2) — every change lands in the history. */
export interface UpdateObligationApplicabilityInput {
  addInstitutionIds: string[]
  removeInstitutionIds: string[]
  reason: string
}

export interface RecordObligationReviewInput {
  /** ISO 8601 — defaults to one review cycle from today when omitted. */
  nextReviewDate?: string
  note: string
}

// ---------------------------------------------------------------------------
// Correspondence (Spec §10.3)
// ---------------------------------------------------------------------------

export type CorrespondenceType =
  | 'Information Request'
  | 'Supervisory Letter'
  | 'Examination Notice'
  | 'Enforcement Notice'
  | 'Directive Cover Letter'
  | 'Meeting Invitation'
  | 'Acknowledgement'
  | 'Institution Submission'

export type CorrespondenceDirection = 'Outgoing' | 'Incoming'

export type CorrespondenceStatus =
  | 'Draft'
  | 'In Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Sent'
  | 'Received'
  | 'Response Required'
  | 'Closed'

export interface CorrespondenceAttachment {
  id: string
  fileName: string
  sizeKb: number
  confidentiality: FrameworkDocumentConfidentiality
  /** Prototype honesty — attachments are simulated, nothing is stored. */
  storageNote: string
}

/** Related examination/finding/directive record (Spec §10.3). Reuses the
 *  mapping shape: `link` present → navigable; absent → Phase-5 chip only. */
export type CorrespondenceRelation = FrameworkMapping

export interface CorrespondenceEvent {
  id: string
  /** ISO 8601 */
  at: string
  byName: string
  action: string
  note?: string
}

export interface RegulatoryCorrespondence {
  /** UUID-shaped id */
  id: string
  /** COR-2026-001 */
  reference: string
  institutionId: string
  type: CorrespondenceType
  direction: CorrespondenceDirection
  subject: string
  /** Letter body — plain demo text rendered in the preview. */
  body: string
  /** ISO 8601 — date issued (outgoing) or received (incoming). */
  date: string
  /** Authorised sender (outgoing) or institution signatory (incoming). */
  senderName: string
  senderRole: string
  recipientName: string
  recipientRole: string
  /** Approver recorded by the demo approve step. */
  authorisedByName?: string
  /** ISO 8601 */
  authorisedAt?: string
  status: CorrespondenceStatus
  /** ISO 8601 — reply deadline for requests / response-required items. */
  responseDueDate?: string
  attachments: CorrespondenceAttachment[]
  relations: CorrespondenceRelation[]
  thread: CorrespondenceEvent[]
}

/** Register row pre-joined with institution labels. */
export interface CorrespondenceRow extends RegulatoryCorrespondence {
  institutionName: string
  institutionCode: string
}

export interface CorrespondenceQuery {
  institutionId?: string
  type?: string
  direction?: string
  status?: string
  /** Match any relation ref, e.g. EXM-2026-014. */
  relatedRef?: string
  search?: string
}

/** Candidate related records offered by the compose form. */
export interface CorrespondenceRelationCandidate {
  kind: FrameworkMappingKind
  ref: string
  label: string
}

export interface ComposeCorrespondenceInput {
  institutionId: string
  type: CorrespondenceType
  direction: CorrespondenceDirection
  subject: string
  body: string
  /** ISO 8601 */
  responseDueDate?: string
  /** Refs picked from `relationCandidates`; the service resolves links. */
  relationRefs: string[]
  attachments: Array<{ fileName: string; sizeKb: number; confidentiality: FrameworkDocumentConfidentiality }>
}
