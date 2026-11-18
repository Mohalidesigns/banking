/**
 * Findings & remediation data contracts (Spec §7.7–§7.8, §18.4). Extends the
 * Phase-2A `SupervisoryFinding` / `CorrectiveAction` summaries with the
 * five-Cs documentation structure, management responses, approval trail and
 * the full corrective-action lifecycle (milestones, institution updates,
 * validation, extensions, escalation, closure). Fictional demo data only.
 */
import type { CorrectiveAction, SupervisoryFinding } from '@/types/supervision'
import type { RiskRating } from '@/types/common'

// ---------------------------------------------------------------------------
// Findings (Spec §7.7)
// ---------------------------------------------------------------------------

/** The familiar five-Cs finding structure, used as a documentation aid. */
export interface FiveCs {
  condition: string
  criteria: string
  cause: string
  consequence: string
  recommendation: string
}

export type BreachClassification = 'Breach' | 'Deficiency' | 'Observation' | 'Good Practice'

export type ManagementResponsePosition = 'Accepted' | 'Partially Accepted' | 'Disputed'

export interface ManagementResponse {
  id: string
  findingId: string
  respondedByName: string
  /** Institution or supervisor organisation the responder belongs to. */
  respondedByOrg: string
  /** ISO 8601 */
  at: string
  position: ManagementResponsePosition
  responseText: string
  plannedAction?: string
  /** ISO 8601 */
  plannedDate?: string
}

export type FindingApprovalDecision = 'Submitted' | 'Returned' | 'Approved' | 'Escalated' | 'Raised'

export interface FindingApprovalEvent {
  id: string
  /** ISO 8601 */
  at: string
  actorName: string
  actorRoleLabel: string
  decision: FindingApprovalDecision
  comment?: string
}

export interface FindingEvidenceLink {
  evidenceId?: string
  reference: string
  description: string
}

export interface FindingDetail extends SupervisoryFinding {
  fiveCs: FiveCs
  severityRationale: string
  breachClassification: BreachClassification
  /** Demo regulatory reference, e.g. "MBA/AML/2023 §4.1". */
  regulatoryReference: string
  /** Responsible owner at the institution (Spec §7.7 column). */
  institutionOwnerName?: string
  /** Role of the responsible owner at the institution. */
  institutionOwnerRole: string
  /** Other supervisory domains touched by this finding. */
  crossDomainLinks: string[]
  evidenceLinks: FindingEvidenceLink[]
  /** Procedure the finding was raised from, if any. */
  procedureId?: string
  procedureCode?: string
  managementResponses: ManagementResponse[]
  approvalTrail: FindingApprovalEvent[]
  reviewerName?: string
}

/** Input for raising a finding (workspace "raise finding from exception"). */
export interface RaiseFindingInput {
  institutionId: string
  examinationId?: string
  examinationRef?: string
  procedureId?: string
  procedureCode?: string
  title: string
  category: SupervisoryFinding['category']
  riskRating: RiskRating
  fiveCs: FiveCs
  severityRationale: string
  breachClassification: BreachClassification
  regulatoryReference: string
  institutionOwnerName: string
  institutionOwnerRole: string
  crossDomainLinks: string[]
  evidenceLinks: FindingEvidenceLink[]
  /** ISO 8601 */
  dueDate: string
}

// ---------------------------------------------------------------------------
// Remediation (Spec §7.8)
// ---------------------------------------------------------------------------

export type ValidationStatus = 'Pending Validation' | 'Under Validation' | 'Validated' | 'Validation Failed'

export interface RemediationMilestone {
  id: string
  label: string
  /** ISO 8601 */
  targetDate: string
  done: boolean
  /** ISO 8601 */
  doneAt?: string
}

export interface InstitutionUpdate {
  id: string
  /** ISO 8601 */
  at: string
  authorName: string
  text: string
  progressPct?: number
}

export type ExtensionRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export interface ExtensionRequest {
  id: string
  /** ISO 8601 */
  requestedAt: string
  requestedByName: string
  /** ISO 8601 */
  newDueDate: string
  reason: string
  status: ExtensionRequestStatus
  decidedByName?: string
  /** ISO 8601 */
  decidedAt?: string
  decisionNote?: string
}

export interface EscalationEvent {
  id: string
  /** ISO 8601 */
  at: string
  byName: string
  level: string
  note: string
}

export interface ClosureDecision {
  /** ISO 8601 */
  at: string
  decidedByName: string
  decidedByRoleLabel: string
  decision: 'Closed' | 'Closure Rejected'
  rationale: string
}

export interface CorrectiveActionDetail extends CorrectiveAction {
  findingRef?: string
  agreedPlan: string
  milestones: RemediationMilestone[]
  institutionUpdates: InstitutionUpdate[]
  evidenceIds: string[]
  validationStatus: ValidationStatus
  extensionRequests: ExtensionRequest[]
  escalations: EscalationEvent[]
  closure?: ClosureDecision
}
