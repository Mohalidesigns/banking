import { evidenceRepository } from '@/mocks/repositories/evidenceRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type { ActorContext } from '@/types/common'
import type { EvidenceItem } from '@/types/examination'
import type {
  EvidenceQuery,
  EvidenceService,
  EvidenceUploadInput,
} from '@/services/contracts/EvidenceService'
import { assertCan } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock evidence service (Spec §7.6). Uploads are simulated — metadata only,
 * no real file is stored anywhere (prototype honesty, Spec §1.1); integrity
 * hashes are labelled placeholders. Reviews are gated by `review-evidence`
 * and enqueue/complete My Work items.
 */
class MockEvidenceService implements EvidenceService {
  async list(query: EvidenceQuery = {}): Promise<EvidenceItem[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return evidenceRepository
      .list()
      .filter((e) => !query.institutionId || e.institutionId === query.institutionId)
      .filter((e) => !query.examinationId || e.examinationId === query.examinationId)
      .filter((e) => !query.procedureId || e.procedureId === query.procedureId || e.linkedProcedureIds.includes(query.procedureId!))
      .filter((e) => !query.findingId || e.findingId === query.findingId)
      .filter((e) => !query.domain || e.domainName === query.domain)
      .filter((e) => !query.category || e.category === query.category)
      .filter((e) => !query.confidentiality || e.confidentiality === query.confidentiality)
      .filter((e) => !query.reviewStatus || e.reviewStatus === query.reviewStatus)
      .filter((e) => !search || `${e.reference} ${e.title} ${e.fileName} ${e.uploadedByName}`.toLowerCase().includes(search))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async getById(id: string): Promise<EvidenceItem | undefined> {
    await latency()
    return evidenceRepository.getById(id)
  }

  async byExamination(examinationId: string): Promise<EvidenceItem[]> {
    await latency()
    return evidenceRepository.byExamination(examinationId)
  }

  async byProcedure(procedureId: string): Promise<EvidenceItem[]> {
    await latency()
    return evidenceRepository.byProcedure(procedureId)
  }

  async byFinding(findingId: string): Promise<EvidenceItem[]> {
    await latency()
    return evidenceRepository.byFinding(findingId)
  }

  async pendingReviewCount(): Promise<number> {
    await latency()
    return evidenceRepository.pendingReview().length
  }

  async upload(input: EvidenceUploadInput, actor: ActorContext): Promise<EvidenceItem> {
    assertCan(actor, 'upload-evidence')
    await latency()
    const created = evidenceRepository.upload({ ...input, uploadedByName: actor.actorName })
    workQueueRepository.push({
      type: 'evidence-review',
      title: `Review evidence ${created.reference} — ${created.title}`,
      institutionId: created.institutionId,
      relatedRef: created.reference,
      link: '/app/evidence',
      priority: created.confidentiality === 'Restricted' ? 'High' : 'Medium',
      dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
      status: 'Open',
      assignedToId: actor.actorId,
      assignedToName: actor.actorName,
    })
    notificationRepository.push({
      category: 'review-required',
      severity: 'info',
      title: `Evidence ${created.reference} uploaded`,
      body: `${created.title} — awaiting review (simulated upload, demo notification).`,
      link: '/app/evidence',
    })
    return created
  }

  async linkToProcedure(evidenceId: string, procedureId: string, actor: ActorContext): Promise<EvidenceItem | undefined> {
    assertCan(actor, 'upload-evidence')
    await latency()
    return evidenceRepository.linkProcedure(evidenceId, procedureId)
  }

  async linkToFinding(evidenceId: string, findingRef: string, findingId: string | undefined, actor: ActorContext): Promise<EvidenceItem | undefined> {
    assertCan(actor, 'upload-evidence')
    await latency()
    return evidenceRepository.linkFinding(evidenceId, findingRef, findingId)
  }

  async markReviewed(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined> {
    assertCan(actor, 'review-evidence')
    await latency()
    const updated = evidenceRepository.setReviewStatus(evidenceId, 'Reviewed', actor.actorName, note)
    if (updated) {
      workQueueRepository.list()
        .filter((w) => w.type === 'evidence-review' && w.relatedRef === updated.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
    }
    return updated
  }

  async markRejected(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined> {
    assertCan(actor, 'review-evidence')
    await latency()
    const updated = evidenceRepository.setReviewStatus(evidenceId, 'Rejected', actor.actorName, note)
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'warning',
        title: `Evidence ${updated.reference} rejected`,
        body: `${note} — re-upload required (demo notification).`,
        link: '/app/evidence',
      })
    }
    return updated
  }

  async addVersion(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined> {
    assertCan(actor, 'upload-evidence')
    await latency()
    return evidenceRepository.addVersion(evidenceId, actor.actorName, note)
  }

  async recordAccess(evidenceId: string, action: EvidenceItem['accessHistory'][number]['action'], actor: ActorContext): Promise<void> {
    evidenceRepository.recordAccess(evidenceId, actor.actorName, action)
  }
}

export const evidenceService: EvidenceService = new MockEvidenceService()
