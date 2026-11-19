/**
 * Regulatory returns domain contracts (Spec §11.1–§11.3, §18.4, Phase 3A).
 * Extends the Phase-2 `ReturnSubmission` summary from `types/supervision.ts`
 * with the full submission detail (data, validation, reconciliation, review,
 * versions, activity) and the return definition/template model behind the
 * designer. One story-world: every record references the same demo
 * institutions and submissions as the rest of the dataset. All figures and
 * validation rules are illustrative demo data (Spec §17.5).
 */
import type { ReturnSubmission } from '@/types/supervision'

// ---------------------------------------------------------------------------
// Return definitions / templates (Spec §11.2)
// ---------------------------------------------------------------------------

export type ReturnFrequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Event-Driven'

export type ReturnApprovalStatus = 'Draft' | 'Under Review' | 'Approved' | 'Retired'

export type ReturnSubmissionFormat = 'XBRL' | 'XML' | 'Excel workbook' | 'CSV' | 'Portal form'

export type ReturnFieldType =
  | 'decimal'
  | 'integer'
  | 'percentage'
  | 'text'
  | 'date'
  | 'boolean'
  | 'enum'

export type ReturnRuleKind =
  | 'required'
  | 'minimum'
  | 'maximum'
  | 'range'
  | 'format'
  | 'cross-field'
  | 'reconciliation'
  | 'materiality'

/** A single validation rule attached to a return field (demo rule engine). */
export interface ReturnFieldValidation {
  id: string
  rule: ReturnRuleKind
  /** Human-readable expression, e.g. "value >= 10.0" or "tier1 + tier2 == total". */
  expression: string
  /** Rule parameters for the demo engine (decimal strings where numeric). */
  params?: Record<string, string>
  severity: 'Error' | 'Warning'
  message: string
}

export interface ReturnField {
  id: string
  /** Machine code used in submissions, e.g. "tier1Capital". */
  code: string
  label: string
  /** Layout section within the template, e.g. "Capital base". */
  section: string
  type: ReturnFieldType
  unit?: string
  required: boolean
  /** 0-based display order; the designer reorders by mutating this. */
  order: number
  helpText?: string
  validationRules: ReturnFieldValidation[]
}

export interface ReturnCertificationRequirement {
  id: string
  /** Officer role that must certify, e.g. "Chief Financial Officer". */
  officerRole: string
  statement: string
  mandatory: boolean
}

export interface ReturnDefinitionVersion {
  version: string
  /** ISO 8601 */
  effectiveFrom: string
  effectiveTo?: string
  changeSummary: string
  approvedByName?: string
  /** ISO 8601 */
  approvedAt?: string
}

export interface ReturnDefinition {
  /** UUID-shaped id */
  id: string
  /** Return code, e.g. MPR-09 */
  code: string
  name: string
  description: string
  jurisdictionId: string
  jurisdictionCode: string
  /** Licence categories this return applies to (empty = all). */
  institutionCategories: string[]
  frequency: ReturnFrequency
  /** e.g. "Consolidated", "Solo entity" */
  reportingBasis: string
  /** ISO 8601 */
  effectiveFrom: string
  effectiveTo?: string
  submissionFormat: ReturnSubmissionFormat
  currentVersion: string
  approvalStatus: ReturnApprovalStatus
  ownerTeamName: string
  fields: ReturnField[]
  certification: ReturnCertificationRequirement[]
  versions: ReturnDefinitionVersion[]
  /** Every threshold in a template is illustrative until approved rules load. */
  thresholdNote: string
}

// ---------------------------------------------------------------------------
// Return submissions (Spec §11.1 register + §11.3 detail)
// ---------------------------------------------------------------------------

export interface ReturnFileMetadata {
  fileName: string
  format: ReturnSubmissionFormat
  sizeKb: number
  /** ISO 8601 */
  uploadedAt: string
  uploadedByName: string
  /** Demo checksum (fictional). */
  checksum: string
}

/** One reported data point inside a submission. */
export interface SubmittedDataPoint {
  fieldCode: string
  label: string
  section: string
  /** Decimal string for numerics (Spec §18.4). */
  value: string
  unit?: string
  /** Prior-period value for the historical comparison (decimal string). */
  priorValue?: string
}

export interface ReturnFieldError {
  id: string
  fieldCode: string
  fieldLabel: string
  rule: ReturnRuleKind
  severity: 'Error' | 'Warning'
  message: string
  submittedValue?: string
  expected?: string
}

export interface ReturnCrossException {
  id: string
  description: string
  relatedReturnCode?: string
  severity: 'Error' | 'Warning'
}

export interface ReturnValidationResult {
  /** ISO 8601 */
  runAt: string
  /** Demo engine label — never presented as a real validation service. */
  engine: string
  status: 'Passed' | 'Warnings' | 'Errors' | 'Not Run'
  errorCount: number
  warningCount: number
  fieldErrors: ReturnFieldError[]
  crossReturnExceptions: ReturnCrossException[]
  summary: string
}

export interface ReturnReconciliationRow {
  id: string
  label: string
  /** Value in the return (decimal string). */
  returnValue: string
  /** Value per the source ledger/system (decimal string, demo). */
  sourceValue: string
  variance: string
  tolerance: string
  status: 'Reconciled' | 'Within Tolerance' | 'Unreconciled'
  note?: string
}

export interface ReturnReviewNote {
  id: string
  /** ISO 8601 */
  at: string
  authorName: string
  text: string
  /** Present when the note recorded a review decision. */
  decision?: 'Accepted' | 'Rejected' | 'Returned for Correction'
}

export interface ReturnSubmissionVersion {
  version: number
  /** ISO 8601 */
  submittedAt?: string
  byName: string
  note: string
  validation: 'Passed' | 'Warnings' | 'Errors' | 'Not Run'
  isCurrent: boolean
}

export interface ReturnSubmissionEvent {
  id: string
  /** ISO 8601 */
  at: string
  actorName: string
  action: string
  detail: string
}

/** Full §11.3 detail record; the register table uses the base summary.
 *  NOTE: the base `validation` field stays the summary string; the full
 *  engine result lives on `validationResult`. */
export interface ReturnSubmissionDetail extends ReturnSubmission {
  definitionId: string
  submittedByName?: string
  submittedVia?: string
  fileMetadata?: ReturnFileMetadata
  data: SubmittedDataPoint[]
  validationResult?: ReturnValidationResult
  reconciliation: ReturnReconciliationRow[]
  reviewNotes: ReturnReviewNote[]
  versions: ReturnSubmissionVersion[]
  activity: ReturnSubmissionEvent[]
  certification?: {
    certifiedByName: string
    certifiedRole: string
    /** ISO 8601 */
    certifiedAt: string
    statement: string
  }
}

/** Register row: submission summary pre-joined with institution labels so
 *  list components never do a second lookup (still service data, §18.3). */
export interface SubmissionRow extends ReturnSubmission {
  institutionName: string
  institutionCode: string
}

export interface ReturnsKpis {
  expected: number
  received: number
  pending: number
  late: number
  rejectedOrReturned: number
  awaitingReview: number
}

export interface ReturnsCalendarDay {
  /** ISO 8601 date */
  date: string
  items: Array<{
    id: string
    reference: string
    returnCode: string
    institutionName: string
    kind: 'due' | 'submitted'
    status: string
  }>
}

export interface InstitutionComplianceRow {
  institutionId: string
  institutionName: string
  institutionCode: string
  expected: number
  received: number
  onTime: number
  late: number
  rejected: number
  compliancePct: number
}

export interface ReturnTypeRow {
  returnCode: string
  returnName: string
  frequency: ReturnFrequency
  expected: number
  received: number
  passed: number
  warnings: number
  errors: number
  awaitingReview: number
}

export interface ValidationExceptionRow {
  submissionId: string
  submissionReference: string
  institutionName: string
  returnCode: string
  period: string
  fieldCode: string
  fieldLabel: string
  severity: 'Error' | 'Warning'
  message: string
}

export interface ReturnSubmissionQuery {
  institutionId?: string
  returnCode?: string
  status?: string
  reviewStatus?: string
  validation?: string
  period?: string
  search?: string
}

// Template designer mutations (Spec §11.2) ---------------------------------

export interface ReturnFieldInput {
  code: string
  label: string
  section: string
  type: ReturnFieldType
  unit?: string
  required: boolean
  helpText?: string
}

export interface ReturnRuleInput {
  rule: ReturnRuleKind
  expression: string
  severity: 'Error' | 'Warning'
  message: string
}
