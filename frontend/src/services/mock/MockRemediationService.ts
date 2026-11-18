import { remediationRepository } from '@/mocks/repositories/remediationRepository'
import { findingRepository } from '@/mocks/repositories/findingRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type { ActorContext } from '@/types/common'
import type { CorrectiveActionDetail } from '@/types/finding'
import type {
  RemediationQuery,
  RemediationService,
} from '@/services/contracts/RemediationService'
import { assertCan, assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock remediation workflow service (Spec §7.8). Institution-side updates
 * and evidence submissions use `manage-remediation`/`upload-evidence`;
 * validation and closure decisions are regulator-only. HARD RULE: the
 * closure decision asserts a regulator role with `close-remediation` —
 * institution roles can never close, enforced via DemoPermissionError.
 */
class MockRemediationService implements RemediationService {
  async list(query: RemediationQuery = {}): Promise<CorrectiveActionDetail[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    const today = new Date().toISOString().slice(0, 10)
    return remediationRepository
      .list()
      .filter((c) => !query.institutionId || c.institutionId === query.institutionId)
      .filter((c) => !query.findingId || c.findingId === query.findingId)
      .filter((c) => !query.status || c.status === query.status)
      .filter((c) => !query.validationStatus || c.validationStatus === query.validationStatus)
      .filter((c) => !query.overdueOnly || (!c.closure && c.dueDate < today && c.progressPct < 100))
      .filter((c) => !search || `${c.reference} ${c.title} ${c.ownerName}`.toLowerCase().includes(search))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }

  async getById(id: string): Promise<CorrectiveActionDetail | undefined> {
    await latency()
    return remediationRepository.getById(id)
  }

  async getByReference(reference: string): Promise<CorrectiveActionDetail | undefined> {
    await latency()
    return remediationRepository.getByReference(reference)
  }

  async overdue(): Promise<CorrectiveActionDetail[]> {
    await latency()
    return remediationRepository.overdue()
  }

  async addUpdate(id: string, text: string, progressPct: number | undefined, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'manage-remediation')
    await latency()
    const updated = remediationRepository.addUpdate(id, `${text} (demo update, prototype session)`, actor.actorName, progressPct)
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Institution update on ${updated.reference}`,
        body: `${actor.actorName} reported ${progressPct ?? updated.progressPct}% progress (demo notification).`,
        link: '/app/remediation',
      })
    }
    return updated
  }

  async toggleMilestone(id: string, milestoneId: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'manage-remediation')
    await latency()
    return remediationRepository.toggleMilestone(id, milestoneId)
  }

  async addMilestone(id: string, label: string, targetDate: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'manage-remediation')
    await latency()
    return remediationRepository.addMilestone(id, label, targetDate)
  }

  async attachEvidence(id: string, evidenceId: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'upload-evidence')
    await latency()
    return remediationRepository.attachEvidence(id, evidenceId)
  }

  async submitForValidation(id: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'manage-remediation')
    await latency()
    const updated = remediationRepository.submitForValidation(id, actor)
    if (updated) {
      workQueueRepository.push({
        type: 'corrective-action',
        title: `Validate remediation evidence for ${updated.reference}`,
        institutionId: updated.institutionId,
        relatedRef: updated.reference,
        link: '/app/remediation',
        priority: 'High',
        dueDate: updated.dueDate,
        status: 'Open',
        assignedToId: actor.actorId,
        assignedToName: actor.actorName,
      })
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `${updated.reference} submitted for supervisory validation`,
        body: 'Institution reports remediation complete — validate the evidence pack (demo notification).',
        link: '/app/remediation',
      })
    }
    return updated
  }

  async validate(id: string, ok: boolean, note: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertRegulator(actor, 'validate-remediation')
    await latency()
    const updated = remediationRepository.validate(id, actor, ok, note)
    if (updated) {
      workQueueRepository.list()
        .filter((w) => w.type === 'corrective-action' && w.relatedRef === updated.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
      notificationRepository.push({
        category: ok ? 'task-assigned' : 'corrective-action-overdue',
        severity: ok ? 'info' : 'warning',
        title: `${updated.reference} validation ${ok ? 'passed' : 'failed'}`,
        body: `${note} (demo notification).`,
        link: '/app/remediation',
      })
    }
    return updated
  }

  async requestExtension(id: string, input: { newDueDate: string; reason: string }, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertCan(actor, 'manage-remediation')
    await latency()
    const updated = remediationRepository.requestExtension(id, { ...input, requestedByName: actor.actorName })
    if (updated) {
      notificationRepository.push({
        category: 'corrective-action-overdue',
        severity: 'warning',
        title: `Extension requested for ${updated.reference}`,
        body: `New target ${input.newDueDate}: ${input.reason} (demo notification).`,
        link: '/app/remediation',
      })
    }
    return updated
  }

  async decideExtension(id: string, requestId: string, approve: boolean, note: string | undefined, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertRegulator(actor, 'validate-remediation')
    await latency()
    return remediationRepository.decideExtension(id, requestId, approve, actor, note)
  }

  async escalate(id: string, level: string, note: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    assertRegulator(actor, 'validate-remediation')
    await latency()
    const updated = remediationRepository.escalate(id, actor, level, note)
    if (updated) {
      notificationRepository.push({
        category: 'corrective-action-overdue',
        severity: 'critical',
        title: `${updated.reference} escalated (${level})`,
        body: `${note} (demo notification).`,
        link: '/app/remediation',
      })
    }
    return updated
  }

  async decideClosure(id: string, closed: boolean, rationale: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined> {
    // Spec §7.8 hard rule — institution roles can never close.
    assertRegulator(actor, 'close-remediation')
    await latency()
    const updated = remediationRepository.decideClosure(id, actor, closed, rationale)
    if (updated && closed && updated.findingRef) {
      // Closure of the corrective action closes the linked finding too.
      const finding = findingRepository.list().find((f) => f.reference === updated.findingRef)
      if (finding) findingRepository.close(finding.id, actor, `Closure via ${updated.reference}: ${rationale}`)
      workQueueRepository.list()
        .filter((w) => w.relatedRef === updated.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
    }
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: closed ? 'info' : 'warning',
        title: `${updated.reference} closure ${closed ? 'approved' : 'rejected'}`,
        body: `${rationale} — decided by ${actor.actorName} (demo notification).`,
        link: '/app/remediation',
      })
    }
    return updated
  }
}

export const remediationService: RemediationService = new MockRemediationService()
