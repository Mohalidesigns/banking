/**
 * Examination-operations data contracts (Spec §7, §18.4). Phase 2B extends
 * the Phase-2A `Examination` summary with the full lifecycle: scope, team
 * roles, work-programme procedures, information requests, evidence, reports
 * and workflow history. All ids are UUID-shaped; all dates ISO 8601; every
 * record is fictional demo data (Spec §17.5).
 */
import type { InstitutionCategory } from '@/types/institution'
import type { Priority, RiskRating } from '@/types/common'
import type { Examination, ExaminationType } from '@/types/supervision'

// ---------------------------------------------------------------------------
// Examination detail (Spec §7.2–§7.3)
// ---------------------------------------------------------------------------

export type ExaminationTeamRole = 'Team Lead' | 'Examiner' | 'Specialist Reviewer' | 'Observer'

export interface ExaminationTeamMember {
  staffId: string
  name: string
  roleInExamination: ExaminationTeamRole
  /** Conflict-of-interest declaration placeholder (Spec §7.2 step 3). */
  conflictDeclaration: 'None declared' | 'Declared — reviewed' | 'Pending'
}

export interface ExaminationScope {
  objectives: string
  /** Supervisory domain names, e.g. "Credit Risk". */
  domains: string[]
  locations: string[]
  productLines: string[]
  limitations?: string
  methodologyName: string
  methodologyVersion: string
  /** Review period covered by the examination (ISO dates). */
  reviewPeriodStart: string
  reviewPeriodEnd: string
}

export interface ExaminationMilestone {
  id: string
  label: string
  /** ISO 8601 */
  date: string
  done: boolean
}

export type ExaminationReportStatus = 'Draft' | 'In Review' | 'Approved' | 'Issued'

export interface ExaminationReportSection {
  heading: string
  body: string
}

export interface ExaminationReport {
  id: string
  title: string
  version: string
  status: ExaminationReportStatus
  /** ISO 8601 */
  updatedAt: string
  authorName: string
  sections: ExaminationReportSection[]
}

export interface WorkflowEvent {
  id: string
  /** ISO 8601 */
  at: string
  actorName: string
  action: string
  note?: string
}

export interface ExaminationDetail extends Examination {
  title: string
  jurisdictionId: string
  department: string
  scope: ExaminationScope
  team: ExaminationTeamMember[]
  /** Early-warning alert that triggered a targeted examination, if any. */
  sourceAlertRef?: string
  /** Findings that triggered this examination (e.g. a follow-up), if any. */
  relatedFindingRefs?: string[]
  /** Library programme versions selected for the work programme. */
  programmeRefs: string[]
  milestones: ExaminationMilestone[]
  reports: ExaminationReport[]
  workflowHistory: WorkflowEvent[]
}

// ---------------------------------------------------------------------------
// Work programme procedures (Spec §7.4)
// ---------------------------------------------------------------------------

export type ProcedureResult = 'Pass' | 'Fail' | 'Partial' | 'Not Applicable' | 'Not Tested'

export const PROCEDURE_RESULTS: ProcedureResult[] = ['Pass', 'Fail', 'Partial', 'Not Applicable', 'Not Tested']

export type ProcedureStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Draft Saved'
  | 'Submitted for Review'
  | 'Returned for Rework'
  | 'Approved'

export interface ProcedureSample {
  id: string
  label: string
  /** Population the sample was drawn from (demo description). */
  population: string
  outcome: 'Satisfactory' | 'Exception'
  note?: string
}

export interface ProcedureComment {
  id: string
  author: string
  /** ISO 8601 */
  at: string
  text: string
  kind: 'comment' | 'reviewer'
}

export interface ExaminationProcedure {
  id: string
  examinationId: string
  /** Library procedure this instance was created from, if any. */
  libraryProcedureId?: string
  /** Human reference within the examination, e.g. "AML-03". */
  code: string
  title: string
  domainName: string
  programmeTitle: string
  objective: string
  question: string
  steps: string[]
  regulatoryCriteria: string
  requiredEvidence: string[]
  testingMethod: string
  sampleSize: number
  population: string
  ownerName: string
  /** ISO 8601 */
  dueDate: string
  priority: Priority
  status: ProcedureStatus
  result: ProcedureResult
  exceptionDetails?: string
  conclusion?: string
  severity?: RiskRating
  linkedFindingId?: string
  linkedFindingRef?: string
  evidenceIds: string[]
  samples: ProcedureSample[]
  comments: ProcedureComment[]
  /** ISO 8601 */
  startedAt?: string
  completedAt?: string
  /** True when added ad-hoc in the wizard rather than from the library. */
  custom?: boolean
}

/** Fields the workspace test form can save (Spec §7.4). */
export interface ProcedureResultInput {
  result: ProcedureResult
  exceptionDetails?: string
  conclusion?: string
  severity?: RiskRating
  sampleSize?: number
  population?: string
  ownerName?: string
}

// ---------------------------------------------------------------------------
// Information requests (Spec §7.2 step 5, §7.3 tab 5)
// ---------------------------------------------------------------------------

export type InformationRequestStatus = 'Draft' | 'Issued' | 'Partially Fulfilled' | 'Fulfilled' | 'Overdue'

export interface InformationRequestItem {
  id: string
  document: string
  /** ISO 8601 */
  deadline: string
  status: 'Requested' | 'Received' | 'Overdue' | 'Waived'
  /** ISO 8601 */
  receivedAt?: string
}

export interface InformationRequest {
  id: string
  examinationId: string
  /** e.g. IR-2026-014 */
  reference: string
  title: string
  /** Document-request template name, if created from one. */
  templateName?: string
  /** ISO 8601 */
  issuedAt: string
  dueDate: string
  status: InformationRequestStatus
  /** Institution portal recipients (demo names). */
  recipientNames: string[]
  items: InformationRequestItem[]
}

// ---------------------------------------------------------------------------
// Examination library (Spec §7.5)
// ---------------------------------------------------------------------------

export type TemplateStatus = 'Draft' | 'Under Review' | 'Approved' | 'Retired'

export interface LibraryProcedureTemplate {
  id: string
  code: string
  title: string
  objective: string
  question: string
  steps: string[]
  regulatoryCriteria: string
  requiredEvidence: string[]
  testingMethod: string
  suggestedSample: string
  priority: Priority
}

export interface TemplateVersionEntry {
  version: string
  /** ISO 8601 */
  at: string
  authorName: string
  changeNote: string
  status: TemplateStatus
}

export interface RegulatoryMappingEntry {
  /** Demo regulatory reference, e.g. "MBA/PRU/2024 §5.2". */
  reference: string
  title: string
}

export interface LibraryProgramme {
  id: string
  /** Template id shown in the library, e.g. LIB-AML-002 */
  code: string
  title: string
  jurisdictionId: string
  institutionCategories: InstitutionCategory[]
  domainName: string
  examinationTypes: ExaminationType[]
  version: string
  status: TemplateStatus
  objectives: string
  scopeGuidance: string
  evidenceRequirements: string[]
  testingMethodology: string
  scoringGuidance: string
  regulatoryMapping: RegulatoryMappingEntry[]
  /** ISO 8601 */
  effectiveFrom: string
  effectiveTo?: string
  ownerName: string
  procedures: LibraryProcedureTemplate[]
  versionHistory: TemplateVersionEntry[]
}

/** Document-request templates offered in the create wizard step 5. */
export interface DocumentRequestTemplate {
  id: string
  name: string
  documents: string[]
}

// ---------------------------------------------------------------------------
// Evidence repository (Spec §7.6)
// ---------------------------------------------------------------------------

export type ConfidentialityClassification = 'Public' | 'Internal' | 'Confidential' | 'Restricted'

export const CONFIDENTIALITY_LEVELS: ConfidentialityClassification[] = [
  'Public',
  'Internal',
  'Confidential',
  'Restricted',
]

export type EvidenceReviewStatus = 'Pending Review' | 'Reviewed' | 'Rejected'

export interface EvidenceVersionEntry {
  version: number
  /** ISO 8601 */
  at: string
  uploadedByName: string
  note?: string
}

export interface EvidenceAccessEntry {
  /** ISO 8601 */
  at: string
  byName: string
  action: 'Viewed' | 'Downloaded' | 'Reviewed'
}

export interface EvidenceItem {
  id: string
  /** e.g. EV-2026-114 */
  reference: string
  title: string
  fileName: string
  mimeType: string
  sizeKb: number
  institutionId: string
  examinationId?: string
  examinationRef?: string
  procedureId?: string
  findingId?: string
  domainName: string
  /** Evidence category, e.g. "System report", "Policy document". */
  category: string
  confidentiality: ConfidentialityClassification
  uploadedByName: string
  /** ISO 8601 */
  uploadedAt: string
  version: number
  reviewStatus: EvidenceReviewStatus
  reviewerName?: string
  reviewerNote?: string
  /** Where the evidence came from and when it was collected. */
  sourceDescription: string
  /** ISO 8601 */
  collectedAt: string
  /** Prototype integrity-hash placeholder (Spec §7.6) — demo value only. */
  integrityHash: string
  linkedProcedureIds: string[]
  linkedFindingRefs: string[]
  versionHistory: EvidenceVersionEntry[]
  accessHistory: EvidenceAccessEntry[]
}
