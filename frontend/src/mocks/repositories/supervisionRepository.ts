/**
 * Mock supervision repository (Spec §18.3). Phase 2A consumed read-only
 * slices; Phase 2B delegates examinations, findings, corrective actions,
 * risk assessments and plans to the mutable workflow repositories so every
 * 2A screen (Command Centre, profile tabs, queue counts) stays live with
 * 2B workflow mutations. Phase 3A does the same for returns (returns
 * repository) and alerts (surveillance repository). Enforcement and
 * watchlist remain fixture-backed (their workflows land in Phase 5).
 */
import {
  ENFORCEMENT_CASES,
  WATCHLIST,
} from '@/mocks/fixtures/supervision.fixture'
import { examinationRepository } from '@/mocks/repositories/examinationRepository'
import { findingRepository } from '@/mocks/repositories/findingRepository'
import { planRepository } from '@/mocks/repositories/planRepository'
import { remediationRepository } from '@/mocks/repositories/remediationRepository'
import { riskAssessmentRepository } from '@/mocks/repositories/riskAssessmentRepository'
import { returnsRepository } from '@/mocks/repositories/returnsRepository'
import { surveillanceRepository } from '@/mocks/repositories/surveillanceRepository'
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

export const isOpenFindingRecord = (f: SupervisoryFinding): boolean => f.status !== 'Closed'

export const supervisionRepository = {
  examinations(): Examination[] {
    return examinationRepository.list()
  },

  examinationsByInstitution(institutionId: string): Examination[] {
    return examinationRepository
      .list()
      .filter((e) => e.institutionId === institutionId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  },

  examinationsInProgress(): Examination[] {
    return examinationRepository.list().filter((e) => ACTIVE_EXAM_STATUSES.has(e.status))
  },

  findings(): SupervisoryFinding[] {
    return findingRepository.base()
  },

  findingsByInstitution(institutionId: string): SupervisoryFinding[] {
    return findingRepository
      .base()
      .filter((f) => f.institutionId === institutionId)
      .sort((a, b) => b.raisedDate.localeCompare(a.raisedDate))
  },

  openFindings(): SupervisoryFinding[] {
    return findingRepository.base().filter(isOpenFindingRecord)
  },

  highPriorityFindings(): SupervisoryFinding[] {
    return findingRepository
      .base()
      .filter((f) => isOpenFindingRecord(f) && (f.riskRating === 'Critical' || f.riskRating === 'High'))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  },

  openFindingsByStatus(): SupervisoryFinding[] {
    return findingRepository.base().filter((f) => ACTIVE_FINDING_STATUSES.has(f.status))
  },

  returns(): ReturnSubmission[] {
    return returnsRepository.base()
  },

  returnsByInstitution(institutionId: string): ReturnSubmission[] {
    return returnsRepository
      .base()
      .filter((r) => r.institutionId === institutionId)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  },

  overdueReturns(): ReturnSubmission[] {
    return returnsRepository.overdue()
  },

  alerts(): EarlyWarningAlert[] {
    return surveillanceRepository.alertBase()
  },

  alertsByInstitution(institutionId: string): EarlyWarningAlert[] {
    return surveillanceRepository.alertBase().filter((a) => a.institutionId === institutionId)
  },

  openAlerts(): EarlyWarningAlert[] {
    return surveillanceRepository
      .alertBase()
      .filter((a) => a.status === 'Open' || a.status === 'Escalated')
  },

  riskAssessments(): RiskAssessment[] {
    return riskAssessmentRepository.base()
  },

  riskAssessmentsByInstitution(institutionId: string): RiskAssessment[] {
    return riskAssessmentRepository.base().filter((r) => r.institutionId === institutionId)
  },

  plans(): SupervisoryPlan[] {
    return planRepository.base()
  },

  correctiveActions(): CorrectiveAction[] {
    return remediationRepository.base()
  },

  correctiveActionsByInstitution(institutionId: string): CorrectiveAction[] {
    return remediationRepository.base().filter((c) => c.institutionId === institutionId)
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
