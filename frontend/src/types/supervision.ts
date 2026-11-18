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

export type ExaminationStatus =
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

export interface ReturnSubmission {
  id: string
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
  validation: 'Passed' | 'Warnings' | 'Errors' | 'Not Run'
}

export type AlertStatus = 'Open' | 'Acknowledged' | 'Escalated' | 'Resolved'

export interface EarlyWarningAlert {
  id: string
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

/** My Work queue item types (Spec §5.3 — eight item types). */
export type WorkItemType =
  | 'examination'
  | 'procedure'
  | 'evidence-review'
  | 'finding-review'
  | 'management-response'
  | 'report-approval'
  | 'corrective-action'
  | 'information-request'

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  examination: 'Assigned examination',
  procedure: 'Procedure awaiting execution',
  'evidence-review': 'Evidence awaiting review',
  'finding-review': 'Finding awaiting review',
  'management-response': 'Management response to assess',
  'report-approval': 'Report awaiting approval',
  'corrective-action': 'Corrective action awaiting validation',
  'information-request': 'Information request follow-up',
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
  kind: 'examination' | 'return-deadline' | 'assessment' | 'plan-milestone'
  title: string
  institutionId?: string
  /** ISO 8601 */
  date: string
  statusLabel: string
  link: string
}
