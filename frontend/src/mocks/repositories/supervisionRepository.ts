/**
 * Mock supervision repository (Spec §18.3). Phase 2A consumes read-only
 * slices for dashboards, profile tabs and queue counts; Phase 2B extends it
 * with examination/finding/remediation workflow mutations on the same data.
 */
import {
  CORRECTIVE_ACTIONS,
  EARLY_WARNING_ALERTS,
  ENFORCEMENT_CASES,
  EXAMINATIONS,
  FINDINGS,
  RISK_ASSESSMENTS,
  RETURN_SUBMISSIONS,
  SUPERVISORY_PLANS,
  WATCHLIST,
  isOpenFinding,
} from '@/mocks/fixtures/supervision.fixture'
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

const ACTIVE_EXAM_STATUSES = new Set(['In Progress', 'Fieldwork', 'Reporting'])
const ACTIVE_FINDING_STATUSES = new Set(['Draft', 'Under Review', 'Confirmed', 'Remediation In Progress', 'Escalated'])

export const supervisionRepository = {
  examinations(): Examination[] {
    return EXAMINATIONS.map((e) => ({ ...e }))
  },

  examinationsByInstitution(institutionId: string): Examination[] {
    return EXAMINATIONS.filter((e) => e.institutionId === institutionId)
      .map((e) => ({ ...e }))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  },

  examinationsInProgress(): Examination[] {
    return EXAMINATIONS.filter((e) => ACTIVE_EXAM_STATUSES.has(e.status))
  },

  findings(): SupervisoryFinding[] {
    return FINDINGS.map((f) => ({ ...f }))
  },

  findingsByInstitution(institutionId: string): SupervisoryFinding[] {
    return FINDINGS.filter((f) => f.institutionId === institutionId)
      .map((f) => ({ ...f }))
      .sort((a, b) => b.raisedDate.localeCompare(a.raisedDate))
  },

  openFindings(): SupervisoryFinding[] {
    return FINDINGS.filter(isOpenFinding)
  },

  highPriorityFindings(): SupervisoryFinding[] {
    return FINDINGS.filter(
      (f) => isOpenFinding(f) && (f.riskRating === 'Critical' || f.riskRating === 'High'),
    ).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  },

  openFindingsByStatus(): SupervisoryFinding[] {
    return FINDINGS.filter((f) => ACTIVE_FINDING_STATUSES.has(f.status))
  },

  returns(): ReturnSubmission[] {
    return RETURN_SUBMISSIONS.map((r) => ({ ...r }))
  },

  returnsByInstitution(institutionId: string): ReturnSubmission[] {
    return RETURN_SUBMISSIONS.filter((r) => r.institutionId === institutionId)
      .map((r) => ({ ...r }))
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  },

  overdueReturns(): ReturnSubmission[] {
    return RETURN_SUBMISSIONS.filter((r) => r.status === 'Overdue')
  },

  alerts(): EarlyWarningAlert[] {
    return EARLY_WARNING_ALERTS.map((a) => ({ ...a }))
  },

  alertsByInstitution(institutionId: string): EarlyWarningAlert[] {
    return EARLY_WARNING_ALERTS.filter((a) => a.institutionId === institutionId)
  },

  openAlerts(): EarlyWarningAlert[] {
    return EARLY_WARNING_ALERTS.filter((a) => a.status === 'Open' || a.status === 'Escalated')
  },

  riskAssessments(): RiskAssessment[] {
    return RISK_ASSESSMENTS.map((r) => ({ ...r }))
  },

  riskAssessmentsByInstitution(institutionId: string): RiskAssessment[] {
    return RISK_ASSESSMENTS.filter((r) => r.institutionId === institutionId)
  },

  plans(): SupervisoryPlan[] {
    return SUPERVISORY_PLANS.map((p) => ({ ...p }))
  },

  correctiveActions(): CorrectiveAction[] {
    return CORRECTIVE_ACTIONS.map((c) => ({ ...c }))
  },

  correctiveActionsByInstitution(institutionId: string): CorrectiveAction[] {
    return CORRECTIVE_ACTIONS.filter((c) => c.institutionId === institutionId)
  },

  enforcementCases(): EnforcementCase[] {
    return ENFORCEMENT_CASES.map((c) => ({ ...c }))
  },

  enforcementByInstitution(institutionId: string): EnforcementCase[] {
    return ENFORCEMENT_CASES.filter((c) => c.institutionId === institutionId)
  },

  openEnforcementCases(): EnforcementCase[] {
    return ENFORCEMENT_CASES.filter((c) => c.status !== 'Closed')
  },

  watchlist(): WatchlistEntry[] {
    return WATCHLIST.map((w) => ({ ...w }))
  },
}
