import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { regulatoryRepository } from '@/mocks/repositories/regulatoryRepository'
import type {
  CorrespondenceService,
  FrameworkService,
  ObligationService,
} from '@/services/contracts/RegulatoryService'
import { assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'
import type { ActorContext } from '@/types/common'
import type { Institution } from '@/types/institution'
import type {
  ComposeCorrespondenceInput,
  CorrespondenceQuery,
  CorrespondenceRelationCandidate,
  CorrespondenceRow,
  FrameworkDetail,
  FrameworkQuery,
  ObligationCompliance,
  ObligationDetail,
  ObligationQuery,
  ObligationRow,
  RecordObligationReviewInput,
  RegulatoryCorrespondence,
  RegulatoryFramework,
  RegulatoryObligation,
  RegulatoryRequirement,
  UpdateObligationApplicabilityInput,
  UploadFrameworkInput,
} from '@/types/regulatory'

/**
 * Mock regulatory administration services (Spec §10.1–§10.3). All mutations
 * are refused for institution roles (`assertRegulator`, §7.8 hard rule) and
 * gated by the §19 demo actions documented on the contracts. The
 * correspondence "send" step is a simulation: it records a thread event and
 * a demo notification but never dispatches anything real (Spec §10.3).
 */

const instLabel = (id: string): { institutionName: string; institutionCode: string; category: string } => {
  const i: Institution | undefined = institutionRepository.byId(id)
  return {
    institutionName: i?.tradingName ?? 'Unknown institution',
    institutionCode: i?.code ?? '—',
    category: i?.category ?? '—',
  }
}

const isoToday = (): string => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Frameworks (Spec §10.1)
// ---------------------------------------------------------------------------

class MockFrameworkService implements FrameworkService {
  async list(query: FrameworkQuery = {}): Promise<RegulatoryFramework[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return regulatoryRepository
      .listFrameworks()
      .filter((f) => !query.category || f.category === query.category)
      .filter((f) => !query.status || f.status === query.status)
      .filter((f) => !query.domain || f.domains.includes(query.domain as FrameworkDetail['framework']['domains'][number]))
      .filter(
        (f) =>
          !search ||
          `${f.code} ${f.name} ${f.issuingAuthority} ${f.description}`.toLowerCase().includes(search),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
  }

  async detail(codeOrId: string): Promise<FrameworkDetail | undefined> {
    await latency()
    const framework = regulatoryRepository.getFramework(codeOrId)
    if (!framework) return undefined
    const requirements = regulatoryRepository.listRequirements(framework.id)
    const applicableInstitutions = institutionRepository
      .list()
      .filter((i) => framework.applicableCategories.length === 0 || framework.applicableCategories.includes(i.category))
      .map((i) => ({ id: i.id, name: i.tradingName, code: i.code, category: i.category }))
    return { framework, requirements, applicableInstitutions }
  }

  async listRequirements(frameworkId: string): Promise<RegulatoryRequirement[]> {
    await latency()
    return regulatoryRepository.listRequirements(frameworkId)
  }

  async getRequirement(id: string): Promise<RegulatoryRequirement | undefined> {
    await latency()
    return regulatoryRepository.getRequirement(id)
  }

  async upload(input: UploadFrameworkInput, actor: ActorContext): Promise<RegulatoryFramework | undefined> {
    assertRegulator(actor, 'manage-frameworks')
    await latency()
    const created = regulatoryRepository.createFramework(input, actor.actorName)
    if (created) {
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `Framework ${created.code} uploaded (demo)`,
        body: input.runAiExtraction
          ? 'Demo AI extraction produced draft requirements awaiting review — not approved regulatory content.'
          : 'Simulated upload registered in the prototype session.',
        link: `/app/regulatory/frameworks?framework=${encodeURIComponent(created.code)}`,
      })
    }
    return created
  }

  async approveRequirement(id: string, note: string, actor: ActorContext): Promise<RegulatoryRequirement | undefined> {
    assertRegulator(actor, 'manage-frameworks')
    await latency()
    return regulatoryRepository.approveRequirement(id, note, actor.actorName)
  }

  async rejectRequirement(id: string, note: string, actor: ActorContext): Promise<RegulatoryRequirement | undefined> {
    assertRegulator(actor, 'manage-frameworks')
    await latency()
    return regulatoryRepository.rejectRequirement(id, note, actor.actorName)
  }

  async publishVersion(
    frameworkId: string,
    version: string,
    changeSummary: string,
    actor: ActorContext,
  ): Promise<RegulatoryFramework | undefined> {
    assertRegulator(actor, 'manage-frameworks')
    await latency()
    return regulatoryRepository.publishVersion(frameworkId, version, changeSummary, actor.actorName)
  }
}

// ---------------------------------------------------------------------------
// Obligations (Spec §10.2)
// ---------------------------------------------------------------------------

const COMPLIANCE_RANK: Record<ObligationCompliance, number> = {
  'Non-Compliant': 0,
  Partial: 1,
  'Not Assessed': 2,
  Compliant: 3,
}

function obligationRow(o: RegulatoryObligation): ObligationRow {
  const framework = regulatoryRepository.getFramework(o.frameworkId)
  const overall = o.institutionStatus.reduce<ObligationCompliance>(
    (worst, s) => (COMPLIANCE_RANK[s.status] < COMPLIANCE_RANK[worst] ? s.status : worst),
    'Compliant',
  )
  return {
    ...o,
    frameworkCode: framework?.code ?? '—',
    frameworkName: framework?.name ?? 'Unknown framework',
    institutionNames: o.applicableInstitutionIds.map((id) => instLabel(id).institutionName),
    overallStatus: o.institutionStatus.length === 0 ? 'Not Assessed' : overall,
    reviewOverdue: o.nextReviewDate < isoToday(),
  }
}

function obligationDetail(o: RegulatoryObligation): ObligationDetail {
  const framework = regulatoryRepository.getFramework(o.frameworkId)
  const requirements = o.requirementRefs
    .map((ref) => regulatoryRepository.getRequirementByRef(o.frameworkId, ref))
    .filter((r): r is RegulatoryRequirement => Boolean(r))
    .map((r) => ({ id: r.id, reference: r.reference, title: r.title, status: r.status }))
  const institutions = o.institutionStatus.map((status) => {
    const label = instLabel(status.institutionId)
    return {
      id: status.institutionId,
      name: label.institutionName,
      code: label.institutionCode,
      category: label.category,
      status,
    }
  })
  const availableInstitutions = institutionRepository
    .list()
    .filter((i) => !o.applicableInstitutionIds.includes(i.id))
    .map((i) => ({ id: i.id, name: i.tradingName, code: i.code, category: i.category }))
  return {
    obligation: o,
    frameworkCode: framework?.code ?? '—',
    frameworkName: framework?.name ?? 'Unknown framework',
    frameworkStatus: framework?.status ?? 'Draft',
    requirements,
    institutions,
    availableInstitutions,
  }
}

class MockObligationService implements ObligationService {
  async list(query: ObligationQuery = {}): Promise<ObligationRow[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return regulatoryRepository
      .listObligations()
      .map(obligationRow)
      .filter((o) => !query.frameworkId || o.frameworkId === query.frameworkId)
      .filter((o) => !query.department || o.responsibleDepartment === query.department)
      .filter((o) => !query.frequency || o.frequency === query.frequency)
      .filter((o) => !query.status || o.overallStatus === query.status)
      .filter((o) => !query.institutionId || o.applicableInstitutionIds.includes(query.institutionId))
      .filter(
        (o) =>
          !search ||
          `${o.reference} ${o.title} ${o.description} ${o.evidenceRequirement} ${o.returnCode ?? ''}`
            .toLowerCase()
            .includes(search),
      )
      .sort((a, b) => a.reference.localeCompare(b.reference))
  }

  async detail(referenceOrId: string): Promise<ObligationDetail | undefined> {
    await latency()
    const o = regulatoryRepository.getObligation(referenceOrId)
    return o ? obligationDetail(o) : undefined
  }

  async updateApplicability(
    id: string,
    input: UpdateObligationApplicabilityInput,
    actor: ActorContext,
  ): Promise<ObligationRow | undefined> {
    assertRegulator(actor, 'manage-obligations')
    await latency()
    const updated = regulatoryRepository.updateObligationApplicability(
      id,
      input.addInstitutionIds,
      input.removeInstitutionIds,
      input.reason,
      actor.actorName,
    )
    return updated ? obligationRow(updated) : undefined
  }

  async setInstitutionStatus(
    id: string,
    institutionId: string,
    status: ObligationCompliance,
    note: string,
    actor: ActorContext,
  ): Promise<ObligationDetail | undefined> {
    assertRegulator(actor, 'manage-obligations')
    await latency()
    const updated = regulatoryRepository.setInstitutionCompliance(id, institutionId, status, note, actor.actorName)
    return updated ? obligationDetail(updated) : undefined
  }

  async recordReview(
    id: string,
    input: RecordObligationReviewInput,
    actor: ActorContext,
  ): Promise<ObligationDetail | undefined> {
    assertRegulator(actor, 'manage-obligations')
    await latency()
    const updated = regulatoryRepository.recordObligationReview(id, input.nextReviewDate, input.note, actor.actorName)
    if (updated && updated.nextReviewDate <= isoToday()) {
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `Obligation ${updated.reference} review recorded (demo)`,
        body: `Next review scheduled ${updated.nextReviewDate}. Saved in the prototype session.`,
        link: `/app/regulatory/obligations?obligation=${encodeURIComponent(updated.reference)}`,
      })
    }
    return updated ? obligationDetail(updated) : undefined
  }
}

// ---------------------------------------------------------------------------
// Correspondence (Spec §10.3)
// ---------------------------------------------------------------------------

function correspondenceRow(c: RegulatoryCorrespondence): CorrespondenceRow {
  const label = instLabel(c.institutionId)
  return { ...c, institutionName: label.institutionName, institutionCode: label.institutionCode }
}

const corLink = (ref: string): string => `/app/regulatory/correspondence?correspondence=${encodeURIComponent(ref)}`

class MockCorrespondenceService implements CorrespondenceService {
  async list(query: CorrespondenceQuery = {}): Promise<CorrespondenceRow[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return regulatoryRepository
      .listCorrespondence()
      .map(correspondenceRow)
      .filter((c) => !query.institutionId || c.institutionId === query.institutionId)
      .filter((c) => !query.type || c.type === query.type)
      .filter((c) => !query.direction || c.direction === query.direction)
      .filter((c) => !query.status || c.status === query.status)
      .filter((c) => !query.relatedRef || c.relations.some((r) => r.targetRef === query.relatedRef))
      .filter(
        (c) =>
          !search ||
          `${c.reference} ${c.subject} ${c.body} ${c.senderName} ${c.recipientName} ${c.institutionName}`
            .toLowerCase()
            .includes(search),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async detail(referenceOrId: string): Promise<RegulatoryCorrespondence | undefined> {
    await latency()
    return regulatoryRepository.getCorrespondence(referenceOrId)
  }

  async relationCandidates(institutionId?: string): Promise<CorrespondenceRelationCandidate[]> {
    await latency()
    return regulatoryRepository.relationCandidates(institutionId)
  }

  async compose(
    input: ComposeCorrespondenceInput,
    actor: ActorContext,
  ): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'manage-correspondence')
    await latency()
    const labels = Object.fromEntries(
      regulatoryRepository.relationCandidates().map((c) => [c.ref, c.label]),
    )
    const created = regulatoryRepository.createCorrespondence(input, labels, actor.actorName, actor.actorRole)
    institutionRepository.addActivity({
      institutionId: created.institutionId,
      type: 'note',
      title: `Correspondence draft ${created.reference} composed`,
      detail: `${created.type} — ${created.subject} (prototype session draft, not sent).`,
      actor: actor.actorName,
      at: new Date().toISOString(),
    })
    return created
  }

  async updateDraft(
    id: string,
    patch: { subject?: string; body?: string; responseDueDate?: string },
    actor: ActorContext,
  ): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'manage-correspondence')
    await latency()
    return regulatoryRepository.updateCorrespondenceDraft(id, patch, actor.actorName)
  }

  async submitForReview(id: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'manage-correspondence')
    await latency()
    const current = regulatoryRepository.getCorrespondence(id)
    if (!current || (current.status !== 'Draft' && current.status !== 'Changes Requested')) return undefined
    const updated = regulatoryRepository.transitionCorrespondence(
      id,
      'In Review',
      'Submitted for review',
      actor.actorName,
      'Routed to the approval tier (demo workflow).',
    )
    if (updated) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Correspondence ${updated.reference} awaiting approval`,
        body: `${updated.subject} — demo workflow; no real communication is sent.`,
        link: corLink(updated.reference),
      })
    }
    return updated
  }

  async requestChanges(
    id: string,
    note: string,
    actor: ActorContext,
  ): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'manage-correspondence')
    await latency()
    const current = regulatoryRepository.getCorrespondence(id)
    if (!current || current.status !== 'In Review') return undefined
    return regulatoryRepository.transitionCorrespondence(id, 'Changes Requested', 'Changes requested', actor.actorName, note)
  }

  async approve(id: string, note: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'approve-correspondence')
    await latency()
    const current = regulatoryRepository.getCorrespondence(id)
    if (!current || current.status !== 'In Review') return undefined
    return regulatoryRepository.transitionCorrespondence(
      id,
      'Approved',
      'Approved',
      actor.actorName,
      note || 'Approved for simulated dispatch.',
      { name: actor.actorName },
    )
  }

  async sendDemo(id: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'approve-correspondence')
    await latency()
    const current = regulatoryRepository.getCorrespondence(id)
    if (!current || current.status !== 'Approved') return undefined
    const updated = regulatoryRepository.transitionCorrespondence(
      id,
      'Sent',
      'Sent (demo)',
      actor.actorName,
      'Simulated dispatch — no real communication sent (Spec §10.3).',
    )
    if (updated) {
      institutionRepository.addActivity({
        institutionId: updated.institutionId,
        type: 'note',
        title: `Correspondence ${updated.reference} sent (demo)`,
        detail: `${updated.type} — ${updated.subject}. Simulated dispatch in the prototype session.`,
        actor: actor.actorName,
        at: new Date().toISOString(),
      })
      notificationRepository.push({
        category: 'system',
        severity: 'info',
        title: `${updated.reference} marked as sent (demo)`,
        body: 'Simulated dispatch only — the prototype never sends real communications.',
        link: corLink(updated.reference),
      })
    }
    return updated
  }

  async logResponse(
    id: string,
    summary: string,
    actor: ActorContext,
  ): Promise<RegulatoryCorrespondence | undefined> {
    assertRegulator(actor, 'manage-correspondence')
    await latency()
    const current = regulatoryRepository.getCorrespondence(id)
    if (!current || (current.status !== 'Received' && current.status !== 'Response Required')) return undefined
    return regulatoryRepository.transitionCorrespondence(
      id,
      'Closed',
      'Response logged',
      actor.actorName,
      summary || 'Response assessed and filed (demo).',
    )
  }
}

export const frameworkService: FrameworkService = new MockFrameworkService()
export const obligationService: ObligationService = new MockObligationService()
export const correspondenceService: CorrespondenceService = new MockCorrespondenceService()
