import { supervisionRepository } from '@/mocks/repositories/supervisionRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import { findingRepository } from '@/mocks/repositories/findingRepository'
import { evidenceRepository } from '@/mocks/repositories/evidenceRepository'
import type {
  NavCounts,
  QueueCountsService,
  SupervisionReadService,
} from '@/services/contracts/SupervisionReadService'

const LATENCY_MS = 140
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

/**
 * Read-only supervision data for Phase 2A screens (profile tabs, Command
 * Centre cross-links, sidebar counts). Phase 2B adds the workflow services
 * over the same repository.
 */
export class MockSupervisionReadService implements SupervisionReadService {
  async listExaminations(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.examinationsByInstitution(institutionId)
      : supervisionRepository.examinations()
  }

  async listFindings(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.findingsByInstitution(institutionId)
      : supervisionRepository.findings()
  }

  async listReturns(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.returnsByInstitution(institutionId)
      : supervisionRepository.returns()
  }

  async listAlerts(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.alertsByInstitution(institutionId)
      : supervisionRepository.alerts()
  }

  async listRiskAssessments(institutionId?: string) {
    await latency()
    const all = supervisionRepository.riskAssessments()
    return institutionId ? all.filter((r) => r.institutionId === institutionId) : all
  }

  async listPlans() {
    await latency()
    return supervisionRepository.plans()
  }

  async listCorrectiveActions(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.correctiveActionsByInstitution(institutionId)
      : supervisionRepository.correctiveActions()
  }

  async listEnforcementCases(institutionId?: string) {
    await latency()
    return institutionId
      ? supervisionRepository.enforcementByInstitution(institutionId)
      : supervisionRepository.enforcementCases()
  }

  async listWatchlist() {
    await latency()
    return supervisionRepository.watchlist()
  }
}

export const supervisionReadService: SupervisionReadService = new MockSupervisionReadService()

/**
 * Sidebar actionable queue counts (Spec §3.2). Derived from the same mock
 * repositories as the screens they link to — never hard-coded.
 */
export class MockQueueCountsService implements QueueCountsService {
  async navCounts(): Promise<NavCounts> {
    await latency()
    const alerts = supervisionRepository.alerts().filter((a) => a.status !== 'Resolved')
    return {
      myWork: workQueueRepository.list().filter((w) => w.status !== 'Completed').length,
      earlyWarnings: alerts.length,
      findings: supervisionRepository.openFindingsByStatus().length,
      overdueReturns: supervisionRepository.overdueReturns().length,
      enforcement: supervisionRepository.openEnforcementCases().length,
      findingsReview: findingRepository.awaitingReview().length,
      evidenceReview: evidenceRepository.pendingReview().length,
    }
  }
}

export const queueCountsService: QueueCountsService = new MockQueueCountsService()
