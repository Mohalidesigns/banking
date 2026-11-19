/**
 * Supervision-domain data contracts (Spec §18.4). Phase 2A screens consume
 * read-only slices (dashboards, profile tabs, My Work); Phase 2B extends the
 * same entities with deep workflow state. One coherent fictional dataset
 * (Spec §17.5) — every record references the same institutions and people.
 */
import type { Priority, RiskRating } from '@/types/common'

export type ExaminationType =
  | 'Comprehensive'
  | 'Thematic'
  | 'Targeted'
  | 'Follow-up'
  | 'AML/CFT'
  | 'Cybersecurity'
  // Spec §7.2 step 1 full type list (added in Phase 2B)
  | 'Maiden'
  | 'Routine'
  | 'Special'
  | 'Spot Check'
  | 'Joint'

export type ExaminationStatus =
  | 'Draft'
  | 'Planned'
  | 'In Progress'
  | 'Fieldwork'
  | 'Reporting'
  | 'Completed'
  | 'Cancelled'

export interface Examination {
  /** UUID-shaped id */
  id: string
  /** Human reference, e.g. EXM-2026-014 */
  reference: string
  institutionId: string
  type: ExaminationType
  scopeAreas: string[]
  status: ExaminationStatus
  riskRating: RiskRating
  leadExaminerId: string
  leadExaminerName: string
  teamMemberNames: string[]
  /** ISO 8601 */
  startDate: string
  plannedEndDate: string
  endDate?: string
  /** 0–100 execution progress */
  progressPct: number
  findingsCount: number
  openFindingsCount: number
  summary: string
}

export type FindingStatus =
  | 'Draft'
  | 'Under Review'
  | 'Confirmed'
  | 'Remediation In Progress'
  | 'Closed'
  | 'Escalated'

export interface SupervisoryFinding {
  id: string
  /** e.g. FND-2026-101 */
  reference: string
  institutionId: string
  /** Examination the finding was raised in, if any */
  examinationId?: string
  examinationRef?: string
  title: string
  description: string
  riskRating: RiskRating
  category: 'Credit' | 'Liquidity' | 'Governance' | 'AML/CFT' | 'Cybersecurity' | 'Operations' | 'Consumer Protection' | 'Capital'
  status: FindingStatus
  /** ISO 8601 */
  raisedDate: string
  dueDate: string
  ownerName: string
  correctiveActionRef?: string
}

export type ReturnStatus = 'Submitted' | 'Due Soon' | 'Overdue' | 'In Review' | 'Accepted' | 'Rejected'

/** Supervisory review state of a submission (Spec §11.1 column, Phase 3A).
 *  Kept separate from `status` (the timeliness lifecycle) so the register
 *  can show both, e.g. Submitted + Awaiting Review. */
export type ReturnReviewStatus =
  | 'Awaiting Review'
  | 'Under Review'
  | 'Accepted'
  | 'Rejected'
  | 'Returned for Correction'

export interface ReturnSubmission {
  id: string
  /** Submission reference, e.g. SUB-2026-0144 (Spec §11.1, Phase 3A). */
  reference: string
  /** Return template code, e.g. MPR-09 */
  returnCode: string
  returnName: string
  institutionId: string
  /** Period label, e.g. "October 2026" */
  period: string
  /** ISO 8601 deadline */
  dueDate: string
  submittedAt?: string
  status: ReturnStatus
  /** Submission version number (Spec §11.1 column). */
  version: number
  validation: 'Passed' | 'Warnings' | 'Errors' | 'Not Run'
  /** Review workflow state (Spec §11.1 column). */
  reviewStatus: ReturnReviewStatus
}

export type AlertStatus = 'Open' | 'Acknowledged' | 'Escalated' | 'Resolved' | 'Dismissed'

export interface EarlyWarningAlert {
  id: string
  /** Human reference, e.g. EWA-2026-011 (added in Phase 2B for the
   *  alert → targeted-examination link; optional for older records). */
  reference?: string
  institutionId: string
  indicator: string
  severity: 'critical' | 'warning' | 'info'
  /** ISO 8601 */
  triggeredAt: string
  /** Decimal strings, demo thresholds */
  threshold: string
  currentValue: string
  message: string
  status: AlertStatus
  assignedToName?: string
}

export type RiskAssessmentStatus = 'Not Started' | 'In Progress' | 'In Review' | 'Completed'

export interface RiskAssessmentDimensionScore {
  name: string
  /** 1–5 intrinsic score */
  intrinsic: number
  /** 1–5 control effectiveness */
  control: number
  rating: RiskRating
}

export interface RiskAssessment {
  id: string
  institutionId: string
  year: number
  status: RiskAssessmentStatus
  overallRisk: RiskRating
  compositeScore: number
  assessedByName: string
  /** ISO 8601 */
  dueDate: string
  completedDate?: string
  dimensions: RiskAssessmentDimensionScore[]
}

export type SupervisoryPlanStatus = 'Draft' | 'Approved' | 'In Execution' | 'Completed'

export interface SupervisoryPlan {
  id: string
  year: number
  name: string
  jurisdictionId: string
  status: SupervisoryPlanStatus
  plannedActivities: number
  completedActivities: number
  /** 0–100 */
  executionPct: number
  leadName: string
  institutionIds: string[]
}

export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Overdue' | 'Validated' | 'Closed'

export interface CorrectiveAction {
  id: string
  /** e.g. CAP-2026-003 */
  reference: string
  institutionId: string
  findingId?: string
  title: string
  status: CorrectiveActionStatus
  /** ISO 8601 */
  dueDate: string
  progressPct: number
  ownerName: string
}

export type EnforcementCaseStatus = 'Open' | 'Under Investigation' | 'Sanction Imposed' | 'Closed'

export interface EnforcementCase {
  id: string
  /** e.g. ENF-2026-002 */
  reference: string
  institutionId: string
  title: string
  status: EnforcementCaseStatus
  /** ISO 8601 */
  openedDate: string
  officerName: string
  summary: string
}

/** My Work queue item types (Spec §5.3 — eight item types, plus the
 *  returns-validation queue surfaced in Phase 3A). */
export type WorkItemType =
  | 'examination'
  | 'procedure'
  | 'evidence-review'
  | 'finding-review'
  | 'management-response'
  | 'report-approval'
  | 'corrective-action'
  | 'information-request'
  | 'return-validation'

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  examination: 'Assigned examination',
  procedure: 'Procedure awaiting execution',
  'evidence-review': 'Evidence awaiting review',
  'finding-review': 'Finding awaiting review',
  'management-response': 'Management response to assess',
  'report-approval': 'Report awaiting approval',
  'corrective-action': 'Corrective action awaiting validation',
  'information-request': 'Information request follow-up',
  'return-validation': 'Return awaiting validation',
}

export type WorkItemStatus = 'Open' | 'In Progress' | 'Completed'

export interface WorkItemNote {
  id: string
  author: string
  /** ISO 8601 */
  at: string
  text: string
}

export interface WorkItem {
  id: string
  type: WorkItemType
  title: string
  institutionId: string
  /** Reference of the related record, e.g. EXM-2026-014 */
  relatedRef?: string
  /** In-app route for "Open work item" */
  link: string
  priority: Priority
  /** ISO 8601 due date */
  dueDate: string
  status: WorkItemStatus
  assignedToId: string
  assignedToName: string
  notes: WorkItemNote[]
}

export interface WatchlistEntry {
  id: string
  institutionId: string
  reason: string
  severity: RiskRating
  /** ISO 8601 */
  addedDate: string
}

/** Upcoming examination / deadline rows on the Command Centre. */
export interface UpcomingItem {
  id: string
  kind: 'examination' | 'return-deadline' | 'assessment' | 'plan-milestone' | 'obligation-review'
  title: string
  institutionId?: string
  /** ISO 8601 */
  date: string
  statusLabel: string
  link: string
}

// ---------------------------------------------------------------------------
// Risk assessment detail (Spec §6.2) — Phase 2B extends the 2A summary
// ---------------------------------------------------------------------------

/** Recommended supervisory intensity derived from the demo methodology. */
export type SupervisoryIntensity = 'Routine' | 'Enhanced' | 'Intensive' | 'Intervention'

export interface AssessmentMethodology {
  id: string
  name: string
  version: string
  status: 'Draft' | 'Approved' | 'Retired'
  description: string
  /** How the demo scoring works — never presented as a universal formula. */
  scoringNote: string
  /** Risk categories assessed under this methodology. */
  categories: string[]
}

export interface AssessmentCategoryScore {
  category: string
  /** Inherent risk 1–5 */
  inherent: number
  /** Control effectiveness 1–5 (1 = strong controls) */
  control: number
  /** Residual risk 1–5 per the configured demo methodology matrix */
  residual: number
  /** Evidence supporting the inherent/control scores (demo references). */
  evidenceRefs: string[]
  narrative?: string
  /** Supervisor override of the computed residual. */
  overridden?: boolean
  overrideReason?: string
}

export interface AssessmentReviewComment {
  id: string
  /** ISO 8601 */
  at: string
  reviewerName: string
  text: string
}

export interface AssessmentApprovalEvent {
  id: string
  /** ISO 8601 */
  at: string
  actorName: string
  action: 'Created' | 'Submitted' | 'Commented' | 'Returned' | 'Approved'
  comment?: string
}

export interface RiskAssessmentDetail extends RiskAssessment {
  /** e.g. RA-2026-004 */
  reference: string
  methodologyId: string
  methodologyName: string
  methodologyVersion: string
  /** Assessment period (ISO dates). */
  periodStart: string
  periodEnd: string
  categoryScores: AssessmentCategoryScore[]
  supervisoryJudgement: string
  recommendedIntensity: SupervisoryIntensity
  reviewerName?: string
  reviewComments: AssessmentReviewComment[]
  approvalTrail: AssessmentApprovalEvent[]
  /** Prior-period comparison shown on the detail screen. */
  priorComparison?: {
    year: number
    overallRisk: RiskRating
    compositeScore: number
    note: string
  }
}

// ---------------------------------------------------------------------------
// Supervisory plan detail (Spec §6.3)
// ---------------------------------------------------------------------------

export type PlanCycle = 'Annual' | 'Quarterly' | 'Event-Driven'

export type PlanActivityType =
  | 'Comprehensive examination'
  | 'Targeted examination'
  | 'Thematic review'
  | 'Off-site review'
  | 'Follow-up visit'
  | 'Risk assessment'
  | 'Management meeting'

export type PlanActivityStatus = 'Planned' | 'In Progress' | 'Completed' | 'Deferred' | 'Cancelled'

export interface PlanActivity {
  id: string
  type: PlanActivityType
  title: string
  institutionIds: string[]
  teamId: string
  teamName: string
  /** Estimated supervisory effort in person-days (demo estimate). */
  effortDays: number
  /** ISO 8601 */
  startDate: string
  endDate: string
  priority: Priority
  status: PlanActivityStatus
  progressPct: number
  /** Linked examination reference once executed, e.g. EXM-2026-014. */
  examinationRef?: string
  deferralReason?: string
}

export interface PlanResourceAllocation {
  teamId: string
  teamName: string
  allocatedDays: number
  utilisationPct: number
}

export interface PlanChangeEvent {
  id: string
  /** ISO 8601 */
  at: string
  type: 'Change' | 'Deferral' | 'Addition'
  description: string
  byName: string
}

export interface PlanApprovalEvent {
  id: string
  /** ISO 8601 */
  at: string
  actorName: string
  action: 'Submitted' | 'Approved' | 'Returned' | 'Amended'
  comment?: string
}

export interface SupervisoryPlanDetail extends SupervisoryPlan {
  cycle: PlanCycle
  /** e.g. "Q4 2026" for quarterly plans. */
  quarter?: string
  activities: PlanActivity[]
  resourceAllocation: PlanResourceAllocation[]
  changes: PlanChangeEvent[]
  approvalHistory: PlanApprovalEvent[]
  coverageNote: string
}
