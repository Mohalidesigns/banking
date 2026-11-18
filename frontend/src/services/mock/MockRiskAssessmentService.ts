import { riskAssessmentRepository } from '@/mocks/repositories/riskAssessmentRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type { ActorContext } from '@/types/common'
import type {
  AssessmentCategoryScore,
  AssessmentMethodology,
  RiskAssessmentDetail,
  SupervisoryIntensity,
} from '@/types/supervision'
import type {
  CreateAssessmentInput,
  RiskAssessmentQuery,
  RiskAssessmentService,
} from '@/services/contracts/RiskAssessmentService'
import { assertCan, assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock risk assessment service (Spec §6.2). Submission requires
 * `submit-assessment`; review comments, approval and return require
 * `approve-assessment` (assistant director and above in the demo matrix).
 * Scoring helpers delegate to the configured demo methodology — the UI
 * never hardcodes a universal formula.
 */
class MockRiskAssessmentService implements RiskAssessmentService {
  async list(query: RiskAssessmentQuery = {}): Promise<RiskAssessmentDetail[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return riskAssessmentRepository
      .list()
      .filter((a) => !query.institutionId || a.institutionId === query.institutionId)
      .filter((a) => !query.year || a.year === query.year)
      .filter((a) => !query.status || a.status === query.status)
      .filter((a) => !query.methodologyId || a.methodologyId === query.methodologyId)
      .filter((a) => !search || `${a.reference} ${a.assessedByName} ${a.reviewerName ?? ''}`.toLowerCase().includes(search))
      .sort((a, b) => b.year - a.year || a.reference.localeCompare(b.reference))
  }

  async getById(id: string): Promise<RiskAssessmentDetail | undefined> {
    await latency()
    return riskAssessmentRepository.getById(id)
  }

  async methodologies(): Promise<AssessmentMethodology[]> {
    await latency()
    return riskAssessmentRepository.methodologies()
  }

  async approvedMethodologies(): Promise<AssessmentMethodology[]> {
    await latency()
    return riskAssessmentRepository.approvedMethodologies()
  }

  computeResidual(inherent: number, control: number): number {
    return riskAssessmentRepository.computeResidual(inherent, control)
  }

  intensityFor(composite: number): SupervisoryIntensity {
    return riskAssessmentRepository.intensityFor(composite)
  }

  async create(input: CreateAssessmentInput, actor: ActorContext): Promise<RiskAssessmentDetail> {
    assertCan(actor, 'submit-assessment')
    await latency()
    const created = riskAssessmentRepository.create(input, actor)
    if (input.submit) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Risk assessment ${created.reference} submitted for approval`,
        body: `${created.overallRisk} overall risk — recommended intensity ${created.recommendedIntensity} (demo scoring).`,
        link: `/app/risk-assessments/${created.id}`,
      })
      workQueueRepository.push({
        type: 'management-response',
        title: `Review risk assessment ${created.reference} (submitted for approval)`,
        institutionId: created.institutionId,
        relatedRef: created.reference,
        link: `/app/risk-assessments/${created.id}`,
        priority: created.overallRisk === 'Critical' || created.overallRisk === 'High' ? 'High' : 'Medium',
        dueDate: created.dueDate,
        status: 'Open',
        assignedToId: actor.actorId,
        assignedToName: actor.actorName,
      })
    }
    return created
  }

  async updateScores(id: string, categoryScores: AssessmentCategoryScore[], actor: ActorContext): Promise<RiskAssessmentDetail | undefined> {
    assertCan(actor, 'submit-assessment')
    await latency()
    return riskAssessmentRepository.updateScores(id, categoryScores)
  }

  async setJudgement(id: string, judgement: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined> {
    assertCan(actor, 'submit-assessment')
    await latency()
    return riskAssessmentRepository.setJudgement(id, judgement)
  }

  async applyOverride(id: string, category: string, residual: number, reason: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined> {
    assertCan(actor, 'submit-assessment')
    await latency()
    return riskAssessmentRepository.applyOverride(id, category, residual, reason, actor)
  }

  async submitForApproval(id: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined> {
    assertCan(actor, 'submit-assessment')
    await latency()
    const updated = riskAssessmentRepository.submitForApproval(id, actor)
    if (updated) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Risk assessment ${updated.reference} awaiting approval`,
        body: `Submitted by ${actor.actorName} (demo notification).`,
        link: `/app/risk-assessments/${updated.id}`,
      })
    }
    return updated
  }

  async addReviewComment(id: string, text: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-assessment')
    await latency()
    return riskAssessmentRepository.addReviewComment(id, text, actor)
  }

  async approve(id: string, actor: ActorContext, comment?: string): Promise<RiskAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-assessment')
    await latency()
    const updated = riskAssessmentRepository.approve(id, actor, comment)
    if (updated) {
      workQueueRepository.list()
        .filter((w) => w.relatedRef === updated.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Risk assessment ${updated.reference} approved`,
        body: `${updated.overallRisk} overall risk; recommended supervisory intensity: ${updated.recommendedIntensity} (demo scoring).`,
        link: `/app/risk-assessments/${updated.id}`,
      })
    }
    return updated
  }

  async returnAssessment(id: string, actor: ActorContext, comment: string): Promise<RiskAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-assessment')
    await latency()
    const updated = riskAssessmentRepository.returnAssessment(id, actor, comment)
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'warning',
        title: `Risk assessment ${updated.reference} returned`,
        body: `${comment} (demo notification).`,
        link: `/app/risk-assessments/${updated.id}`,
      })
    }
    return updated
  }
}

export const riskAssessmentService: RiskAssessmentService = new MockRiskAssessmentService()
