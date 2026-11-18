import { examinationRepository } from '@/mocks/repositories/examinationRepository'
import { findingRepository } from '@/mocks/repositories/findingRepository'
import { evidenceRepository } from '@/mocks/repositories/evidenceRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type { ActorContext } from '@/types/common'
import type { FindingDetail, RaiseFindingInput } from '@/types/finding'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  ExaminationReport,
  ExaminationTeamMember,
  InformationRequest,
  ProcedureResultInput,
} from '@/types/examination'
import type { ExaminationStatus } from '@/types/supervision'
import type {
  CreateExaminationInput,
  ExaminationQuery,
  ExaminationService,
} from '@/services/contracts/ExaminationService'
import { assertCan } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock examination workflow service (Spec §7.1–§7.4). Mutations are gated
 * by the demo role profiles and keep the Phase-2A surfaces live: finding
 * counts flow to the register/profile, submitted procedures and reports
 * enqueue My Work items, and key steps raise demo notifications.
 * Prototype-session state only — "Saved in prototype session" honesty.
 */
const syncExamFindingCounts = (examinationId: string): void => {
  const findings = findingRepository.base().filter((f) => f.examinationId === examinationId)
  examinationRepository.syncFindingsCount(
    examinationId,
    findings.length,
    findings.filter((f) => f.status !== 'Closed').length,
  )
}

const workspaceLink = (examinationId: string): string =>
  `/app/examinations/${examinationId}/workspace`

class MockExaminationService implements ExaminationService {
  async list(query: ExaminationQuery = {}): Promise<ExaminationDetail[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return examinationRepository
      .detailsAll()
      .filter((e) => !query.institutionId || e.institutionId === query.institutionId)
      .filter((e) => !query.type || e.type === query.type)
      .filter((e) => !query.domain || e.scope.domains.includes(query.domain!) || e.scopeAreas.some((s) => s.toLowerCase().includes(query.domain!.toLowerCase())))
      .filter((e) => !query.teamLeadName || e.leadExaminerName === query.teamLeadName)
      .filter((e) => !query.status || e.status === query.status)
      .filter((e) => !query.priority || e.riskRating === query.priority)
      .filter((e) => !query.dateFrom || e.plannedEndDate >= query.dateFrom)
      .filter((e) => !query.dateTo || e.startDate <= query.dateTo)
      .filter((e) => !search || `${e.reference} ${e.title} ${e.leadExaminerName}`.toLowerCase().includes(search))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  async getDetail(id: string): Promise<ExaminationDetail | undefined> {
    await latency()
    return examinationRepository.getDetail(id)
  }

  async getByReference(reference: string): Promise<ExaminationDetail | undefined> {
    await latency()
    return examinationRepository.getDetailByReference(reference)
  }

  async create(input: CreateExaminationInput, actor: ActorContext): Promise<ExaminationDetail> {
    assertCan(actor, 'create-examination')
    await latency()
    const created = examinationRepository.create(input, actor)
    notificationRepository.push({
      category: 'task-assigned',
      severity: 'info',
      title: `Examination ${created.reference} ${input.submit ? 'submitted' : 'saved as draft'}`,
      body: `${created.title} — ${input.submit ? 'team assigned and work programme instantiated from approved library templates.' : 'Draft saved in the prototype session.'} Demo notification.`,
      link: `/app/examinations/${created.id}`,
    })
    if (input.submit) {
      workQueueRepository.push({
        type: 'examination',
        title: `Prepare ${created.reference} entry meeting and information pack`,
        institutionId: created.institutionId,
        relatedRef: created.reference,
        link: `/app/examinations/${created.id}`,
        priority: created.riskRating,
        dueDate: created.startDate,
        status: 'Open',
        assignedToId: actor.actorId,
        assignedToName: actor.actorName,
      })
    }
    return created
  }

  async submitDraft(id: string, actor: ActorContext): Promise<ExaminationDetail | undefined> {
    assertCan(actor, 'create-examination')
    await latency()
    return examinationRepository.setStatus(id, 'Planned', actor, 'Draft submitted in the prototype session.')
  }

  async assignTeam(id: string, team: ExaminationTeamMember[], actor: ActorContext): Promise<ExaminationDetail | undefined> {
    assertCan(actor, 'assign-team')
    await latency()
    return examinationRepository.assignTeam(id, team, actor)
  }

  async startFieldwork(id: string, actor: ActorContext): Promise<ExaminationDetail | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    return examinationRepository.setStatus(id, 'Fieldwork', actor, 'Fieldwork started in the prototype session.')
  }

  async setStatus(id: string, status: ExaminationStatus, actor: ActorContext, note?: string): Promise<ExaminationDetail | undefined> {
    if (status === 'Reporting' || status === 'Completed' || status === 'Cancelled') {
      assertCan(actor, 'approve-results')
    } else {
      assertCan(actor, 'create-examination')
    }
    await latency()
    return examinationRepository.setStatus(id, status, actor, note)
  }

  // --- work programme -------------------------------------------------------

  async procedures(examinationId: string): Promise<ExaminationProcedure[]> {
    await latency()
    return examinationRepository.proceduresFor(examinationId)
  }

  async getProcedure(id: string): Promise<ExaminationProcedure | undefined> {
    await latency()
    return examinationRepository.getProcedure(id)
  }

  async startProcedure(id: string, actor: ActorContext): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    const p = examinationRepository.startProcedure(id, actor)
    if (p) examinationRepository.recomputeProgress(p.examinationId)
    return p
  }

  async saveProcedureDraft(id: string, input: ProcedureResultInput, actor: ActorContext): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    const p = examinationRepository.saveProcedureDraft(id, input, actor)
    if (p) examinationRepository.recomputeProgress(p.examinationId)
    return p
  }

  async submitProcedure(id: string, input: ProcedureResultInput, actor: ActorContext): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    const p = examinationRepository.completeProcedure(id, input, actor)
    if (p) {
      examinationRepository.recomputeProgress(p.examinationId)
      const exam = examinationRepository.getDetail(p.examinationId)
      workQueueRepository.push({
        type: 'procedure',
        title: `Review procedure ${p.code} result (${p.result}) — ${exam?.reference ?? 'examination'}`,
        institutionId: exam?.institutionId ?? '',
        relatedRef: `${exam?.reference ?? 'EXM'}/${p.code}`,
        link: workspaceLink(p.examinationId),
        priority: p.priority,
        dueDate: p.dueDate,
        status: 'Open',
        assignedToId: exam?.leadExaminerId ?? actor.actorId,
        assignedToName: exam?.leadExaminerName ?? actor.actorName,
      })
      notificationRepository.push({
        category: 'review-required',
        severity: p.result === 'Fail' ? 'warning' : 'info',
        title: `Procedure ${p.code} submitted for review`,
        body: `Result: ${p.result}. Review in the fieldwork workspace (demo notification).`,
        link: workspaceLink(p.examinationId),
      })
    }
    return p
  }

  async returnProcedure(id: string, actor: ActorContext, comment: string): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'review-procedures')
    await latency()
    const p = examinationRepository.returnProcedure(id, actor, comment)
    if (p) {
      examinationRepository.recomputeProgress(p.examinationId)
      workQueueRepository.completeByRef(`${p.code}`, 'procedure')
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'warning',
        title: `Procedure ${p.code} returned for rework`,
        body: `${actor.actorName}: ${comment} (demo notification).`,
        link: workspaceLink(p.examinationId),
      })
    }
    return p
  }

  async approveProcedure(id: string, actor: ActorContext, comment?: string): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'approve-results')
    await latency()
    const p = examinationRepository.approveProcedure(id, actor, comment)
    if (p) {
      examinationRepository.recomputeProgress(p.examinationId)
      const exam = examinationRepository.getDetail(p.examinationId)
      workQueueRepository.list()
        .filter((w) => w.type === 'procedure' && w.relatedRef?.endsWith(`/${p.code}`) && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Procedure ${p.code} approved (${p.result})`,
        body: `Approved by ${actor.actorName} in ${exam?.reference ?? 'the examination'} (demo notification).`,
        link: workspaceLink(p.examinationId),
      })
    }
    return p
  }

  async addSample(
    procedureId: string,
    sample: { label: string; population: string; outcome: 'Satisfactory' | 'Exception'; note?: string },
    actor: ActorContext,
  ): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    return examinationRepository.addSample(procedureId, sample.label, sample.population, sample.outcome, sample.note, actor)
  }

  async addProcedureComment(procedureId: string, text: string, actor: ActorContext): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    return examinationRepository.addComment(procedureId, text, actor)
  }

  async attachEvidence(procedureId: string, evidenceId: string, actor: ActorContext): Promise<ExaminationProcedure | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    const p = examinationRepository.attachEvidence(procedureId, evidenceId, actor)
    if (p) evidenceRepository.linkProcedure(evidenceId, procedureId)
    return p
  }

  async raiseFindingFromProcedure(procedureId: string, input: RaiseFindingInput, actor: ActorContext): Promise<FindingDetail> {
    assertCan(actor, 'raise-finding')
    await latency()
    const procedure = examinationRepository.getProcedure(procedureId)
    const finding = findingRepository.create(
      {
        ...input,
        procedureId,
        procedureCode: procedure?.code,
        examinationId: input.examinationId ?? procedure?.examinationId,
      },
      actor,
    )
    examinationRepository.linkFinding(procedureId, finding.id, finding.reference)
    if (procedure) {
      syncExamFindingCounts(procedure.examinationId)
      examinationRepository.addRelatedFindingRef(procedure.examinationId, finding.reference)
    }
    workQueueRepository.push({
      type: 'finding-review',
      title: `Review draft finding ${finding.reference} — ${finding.title}`,
      institutionId: finding.institutionId,
      relatedRef: finding.reference,
      link: `/app/findings/${finding.id}`,
      priority: finding.riskRating === 'Critical' || finding.riskRating === 'High' ? 'High' : 'Medium',
      dueDate: finding.dueDate,
      status: 'Open',
      assignedToId: actor.actorId,
      assignedToName: actor.actorName,
    })
    notificationRepository.push({
      category: 'review-required',
      severity: finding.riskRating === 'Critical' ? 'critical' : 'warning',
      title: `Finding ${finding.reference} raised`,
      body: `${finding.title} — raised from procedure ${procedure?.code ?? 'fieldwork'} (demo notification).`,
      link: `/app/findings/${finding.id}`,
    })
    return finding
  }

  // --- information requests ---------------------------------------------------

  async informationRequests(examinationId: string): Promise<InformationRequest[]> {
    await latency()
    return examinationRepository.informationRequestsFor(examinationId)
  }

  async createInformationRequest(
    examinationId: string,
    input: { title: string; templateName?: string; documents: string[]; deadline: string; recipientNames: string[] },
    actor: ActorContext,
  ): Promise<InformationRequest | undefined> {
    assertCan(actor, 'request-information')
    await latency()
    const created = examinationRepository.createInformationRequest(examinationId, input, actor)
    if (created) {
      const exam = examinationRepository.getDetail(examinationId)
      workQueueRepository.push({
        type: 'information-request',
        title: `Track information request ${created.reference} (${created.items.length} documents)`,
        institutionId: exam?.institutionId ?? '',
        relatedRef: created.reference,
        link: `/app/examinations/${examinationId}`,
        priority: 'Medium',
        dueDate: created.dueDate,
        status: 'Open',
        assignedToId: actor.actorId,
        assignedToName: actor.actorName,
      })
    }
    return created
  }

  async setRequestItemStatus(
    requestId: string,
    itemId: string,
    status: InformationRequest['items'][number]['status'],
    actor: ActorContext,
  ): Promise<InformationRequest | undefined> {
    assertCan(actor, 'request-information')
    await latency()
    return examinationRepository.setRequestItemStatus(requestId, itemId, status, actor)
  }

  // --- reports (Journey A step 10) ---------------------------------------------

  async reports(examinationId: string): Promise<ExaminationReport[]> {
    await latency()
    return examinationRepository.reportsFor(examinationId)
  }

  async submitReportForApproval(examinationId: string, reportId: string, actor: ActorContext): Promise<ExaminationReport | undefined> {
    assertCan(actor, 'record-fieldwork')
    await latency()
    const exam = examinationRepository.getDetail(examinationId)
    const report = examinationRepository.updateReport(examinationId, reportId, { status: 'In Review' }, actor, 'Draft report submitted for approval')
    if (report) {
      workQueueRepository.push({
        type: 'report-approval',
        title: `Approve ${report.title}`,
        institutionId: exam?.institutionId ?? '',
        relatedRef: exam?.reference,
        link: `/app/examinations/${examinationId}`,
        priority: 'Medium',
        dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        status: 'Open',
        assignedToId: exam?.leadExaminerId ?? actor.actorId,
        assignedToName: exam?.leadExaminerName ?? actor.actorName,
      })
    }
    return report
  }

  async approveReport(examinationId: string, reportId: string, actor: ActorContext): Promise<ExaminationReport | undefined> {
    assertCan(actor, 'approve-results')
    await latency()
    const report = examinationRepository.updateReport(examinationId, reportId, { status: 'Approved' }, actor, 'Report approved')
    if (report) {
      const exam = examinationRepository.getDetail(examinationId)
      workQueueRepository.list()
        .filter((w) => w.type === 'report-approval' && w.relatedRef === exam?.reference && w.status !== 'Completed')
        .forEach((w) => workQueueRepository.setStatus(w.id, 'Completed'))
    }
    return report
  }

  async refreshDraftReport(examinationId: string, actor: ActorContext): Promise<ExaminationReport | undefined> {
    await latency()
    const findings = findingRepository.base().filter((f) => f.examinationId === examinationId)
    const lines = findings.map(
      (f) => `${f.reference} (${f.riskRating}, ${f.status}): ${f.title}.`,
    )
    return examinationRepository.refreshDraftReport(examinationId, lines, actor)
  }
}

export const examinationService: ExaminationService = new MockExaminationService()
