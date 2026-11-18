import { findingRepository } from '@/mocks/repositories/findingRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type { ActorContext } from '@/types/common'
import type {
  FindingDetail,
  ManagementResponse,
  RaiseFindingInput,
} from '@/types/finding'
import type {
  FindingQuery,
  FindingService,
} from '@/services/contracts/FindingService'
import { assertCan, assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock findings workflow service (Spec §7.7). Role gating per Spec §19:
 * examiners raise and submit; team lead and above review/approve
 * (`approve-finding`); institution roles may record management responses
 * but can never approve or close. Prototype-session state only.
 */
class MockFindingService implements FindingService {
  async list(query: FindingQuery = {}): Promise<FindingDetail[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return findingRepository
      .list()
      .filter((f) => !query.institutionId || f.institutionId === query.institutionId)
      .filter((f) => !query.examinationId || f.examinationId === query.examinationId)
      .filter((f) => !query.domain || f.category === query.domain)
      .filter((f) => !query.severity || f.riskRating === query.severity)
      .filter((f) => !query.status || f.status === query.status)
      .filter((f) => !query.breachClassification || f.breachClassification === query.breachClassification)
      .filter((f) => query.view !== 'open' || f.status !== 'Closed')
      .filter((f) => !search || `${f.reference} ${f.title} ${f.ownerName}`.toLowerCase().includes(search))
      .sort((a, b) => b.raisedDate.localeCompare(a.raisedDate))
  }

  async getById(id: string): Promise<FindingDetail | undefined> {
    await latency()
    return findingRepository.getById(id)
  }

  async getByReference(reference: string): Promise<FindingDetail | undefined> {
    await latency()
    return findingRepository.getByReference(reference)
  }

  async awaitingReviewCount(): Promise<number> {
    await latency()
    return findingRepository.awaitingReview().length
  }

  async raise(input: RaiseFindingInput, actor: ActorContext): Promise<FindingDetail> {
    assertCan(actor, 'raise-finding')
    await latency()
    const created = findingRepository.create(input, actor)
    notificationRepository.push({
      category: 'review-required',
      severity: created.riskRating === 'Critical' ? 'critical' : 'warning',
      title: `Finding ${created.reference} raised (draft)`,
      body: `${created.title} — submit for review to route to the approval trail (demo notification).`,
      link: `/app/findings/${created.id}`,
    })
    return created
  }

  async submitForReview(id: string, actor: ActorContext, comment?: string): Promise<FindingDetail | undefined> {
    assertCan(actor, 'raise-finding')
    await latency()
    const updated = findingRepository.submitForReview(id, actor, comment)
    if (updated) {
      workQueueRepository.push({
        type: 'finding-review',
        title: `Review finding ${updated.reference} — ${updated.title}`,
        institutionId: updated.institutionId,
        relatedRef: updated.reference,
        link: `/app/findings/${updated.id}`,
        priority: updated.riskRating === 'Critical' || updated.riskRating === 'High' ? 'High' : 'Medium',
        dueDate: updated.dueDate,
        status: 'Open',
        assignedToId: actor.actorId,
        assignedToName: actor.actorName,
      })
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Finding ${updated.reference} awaiting review`,
        body: `${updated.title} — reviewer approval required (demo notification).`,
        link: `/app/findings/${updated.id}`,
      })
    }
    return updated
  }

  async returnForRework(id: string, actor: ActorContext, comment: string): Promise<FindingDetail | undefined> {
    assertCan(actor, 'review-finding')
    await latency()
    const updated = findingRepository.returnForRework(id, actor, comment)
    if (updated) {
      workQueueRepository.completeByRef(updated.reference, 'finding-review')
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'warning',
        title: `Finding ${updated.reference} returned for rework`,
        body: `${actor.actorName}: ${comment} (demo notification).`,
        link: `/app/findings/${updated.id}`,
      })
    }
    return updated
  }

  async approve(id: string, actor: ActorContext, comment?: string): Promise<FindingDetail | undefined> {
    // Spec §19: examiners/principal examiners cannot approve findings.
    assertRegulator(actor, 'approve-finding')
    await latency()
    const updated = findingRepository.approve(id, actor, comment)
    if (updated) {
      workQueueRepository.list()
        .filter((w) => w.type === 'finding-review' && w.relatedRef === updated.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Finding ${updated.reference} confirmed`,
        body: `Approved by ${actor.actorName}. Management response can now be recorded (demo notification).`,
        link: `/app/findings/${updated.id}`,
      })
    }
    return updated
  }

  async escalate(id: string, actor: ActorContext, comment: string): Promise<FindingDetail | undefined> {
    assertRegulator(actor, 'review-finding')
    await latency()
    const updated = findingRepository.escalate(id, actor, comment)
    if (updated) {
      notificationRepository.push({
        category: 'early-warning',
        severity: 'critical',
        title: `Finding ${updated.reference} escalated`,
        body: `${comment} (demo notification).`,
        link: `/app/findings/${updated.id}`,
      })
    }
    return updated
  }

  async close(id: string, actor: ActorContext, rationale: string): Promise<FindingDetail | undefined> {
    // Hard rule (Spec §7.8): institution users can never close.
    assertRegulator(actor, 'approve-finding')
    await latency()
    return findingRepository.close(id, actor, rationale)
  }

  async addManagementResponse(
    id: string,
    input: Omit<ManagementResponse, 'id' | 'findingId'>,
    actor: ActorContext,
  ): Promise<FindingDetail | undefined> {
    assertCan(actor, 'respond-finding')
    await latency()
    const updated = findingRepository.addManagementResponse(id, input)
    if (updated) {
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `Management response recorded for ${updated.reference}`,
        body: `${input.respondedByName} (${input.position}) — awaiting supervisory assessment (demo notification).`,
        link: `/app/findings/${updated.id}`,
      })
    }
    return updated
  }
}

export const findingService: FindingService = new MockFindingService()
