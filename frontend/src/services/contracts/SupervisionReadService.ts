import type {
  CorrectiveAction,
  EarlyWarningAlert,
  EnforcementCase,
  Examination,
  RiskAssessment,
  ReturnSubmission,
  SupervisoryFinding,
  SupervisoryPlan,
  WatchlistEntry,
} from '@/types/supervision'

/**
 * Read-only supervision contract for Phase 2A (profile tabs, dashboards,
 * queue counts). Phase 2B extends the same contract family with examination,
 * finding and remediation workflow mutations over the identical dataset.
 */
export interface SupervisionReadService {
  listExaminations(institutionId?: string): Promise<Examination[]>
  listFindings(institutionId?: string): Promise<SupervisoryFinding[]>
  listReturns(institutionId?: string): Promise<ReturnSubmission[]>
  listAlerts(institutionId?: string): Promise<EarlyWarningAlert[]>
  listRiskAssessments(institutionId?: string): Promise<RiskAssessment[]>
  listPlans(): Promise<SupervisoryPlan[]>
  listCorrectiveActions(institutionId?: string): Promise<CorrectiveAction[]>
  listEnforcementCases(institutionId?: string): Promise<EnforcementCase[]>
  listWatchlist(): Promise<WatchlistEntry[]>
}

/** Sidebar actionable queue counts (Spec §3.2), wired to the mock data.
 *  Phase 2B adds the findings-review and evidence-review queues. */
export interface NavCounts {
  myWork: number
  earlyWarnings: number
  findings: number
  overdueReturns: number
  enforcement: number
  /** Findings awaiting review (Draft + Under Review). */
  findingsReview: number
  /** Evidence items awaiting review. */
  evidenceReview: number
}

export interface QueueCountsService {
  navCounts(): Promise<NavCounts>
}
