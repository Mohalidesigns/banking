/**
 * Mock examination repository (Spec §7.1–§7.4, §17.4). Owns the mutable
 * examination lifecycle for the prototype session: detail records, work
 * programme procedure instances, information requests and workflow events.
 * `base()` exposes the Phase-2A summary view so dashboards, profile tabs and
 * queue counts stay live with every 2B mutation.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import {
  EXAMINATION_DETAILS,
  EXAMINATION_PROCEDURES,
  INFORMATION_REQUESTS,
  mkProcedure,
  type ProcedureSeed,
} from '@/mocks/fixtures/examinationDetail.fixture'
import { libraryRepository } from '@/mocks/repositories/libraryRepository'
import type { ActorContext, Priority } from '@/types/common'
import type { Examination, ExaminationStatus } from '@/types/supervision'
import type { CreateExaminationInput, CustomProcedureInput } from '@/services/contracts/ExaminationService'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  ExaminationReport,
  ExaminationTeamMember,
  InformationRequest,
  ProcedureResultInput,
  WorkflowEvent,
} from '@/types/examination'

// ---------------------------------------------------------------------------
// Mutable state
// ---------------------------------------------------------------------------

const cloneProcedure = (p: ExaminationProcedure): ExaminationProcedure => ({
  ...p,
  steps: [...p.steps],
  requiredEvidence: [...p.requiredEvidence],
  evidenceIds: [...p.evidenceIds],
  samples: p.samples.map((s) => ({ ...s })),
  comments: p.comments.map((c) => ({ ...c })),
})

const cloneDetail = (d: ExaminationDetail): ExaminationDetail => ({
  ...d,
  scope: { ...d.scope, domains: [...d.scope.domains], locations: [...d.scope.locations], productLines: [...d.scope.productLines] },
  team: d.team.map((t) => ({ ...t })),
  programmeRefs: [...d.programmeRefs],
  relatedFindingRefs: d.relatedFindingRefs ? [...d.relatedFindingRefs] : undefined,
  milestones: d.milestones.map((m) => ({ ...m })),
  reports: d.reports.map((r) => ({ ...r, sections: r.sections.map((s) => ({ ...s })) })),
  workflowHistory: d.workflowHistory.map((w) => ({ ...w })),
})

const details: ExaminationDetail[] = EXAMINATION_DETAILS.map(cloneDetail)
const procedures: ExaminationProcedure[] = EXAMINATION_PROCEDURES.map(cloneProcedure)
const infoRequests: InformationRequest[] = INFORMATION_REQUESTS.map((r) => ({
  ...r,
  recipientNames: [...r.recipientNames],
  items: r.items.map((i) => ({ ...i })),
}))

let refSeq = 100
let irSeq = 100

const eventId = (): string => `wev-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const detailById = (id: string): ExaminationDetail | undefined => details.find((d) => d.id === id)
const procedureById = (id: string): ExaminationProcedure | undefined => procedures.find((p) => p.id === id)

export const pushWorkflowEvent = (d: ExaminationDetail, actorName: string, action: string, note?: string): void => {
  d.workflowHistory.push({ id: eventId(), at: new Date().toISOString(), actorName, action, note } satisfies WorkflowEvent)
}

/** Summary projection for Phase-2A consumers (dashboards, profile tabs). */
const toBase = (d: ExaminationDetail): Examination => ({
  id: d.id,
  reference: d.reference,
  institutionId: d.institutionId,
  type: d.type,
  scopeAreas: d.scopeAreas,
  status: d.status,
  riskRating: d.riskRating,
  leadExaminerId: d.leadExaminerId,
  leadExaminerName: d.leadExaminerName,
  teamMemberNames: d.teamMemberNames,
  startDate: d.startDate,
  plannedEndDate: d.plannedEndDate,
  endDate: d.endDate,
  progressPct: d.progressPct,
  findingsCount: d.findingsCount,
  openFindingsCount: d.openFindingsCount,
  summary: d.summary,
})

// ---------------------------------------------------------------------------
// Creation (wizard step 6 → create; procedure instances from library)
// ---------------------------------------------------------------------------

const customSeed = (c: CustomProcedureInput): ProcedureSeed => ({
  programmeCode: '',
  procCode: c.code,
  ownerName: c.ownerName,
  dueOffsetDays: 0,
  dueDate: c.dueDate,
  status: 'Not Started',
  result: 'Not Tested',
  priority: c.priority,
  custom: true,
  customTemplate: {
    code: c.code,
    title: c.title,
    objective: c.objective,
    question: c.question,
    steps: c.steps,
    regulatoryCriteria: c.regulatoryCriteria,
    requiredEvidence: c.requiredEvidence,
    testingMethod: c.testingMethod,
    suggestedSample: '',
    priority: c.priority,
  },
})

const buildProcedures = (
  examId: string,
  team: ExaminationTeamMember[],
  input: CreateExaminationInput,
): ExaminationProcedure[] => {
  const created: ExaminationProcedure[] = []
  const owners = team.length > 0 ? team : [{ staffId: 'demo', name: 'Unassigned (demo)', roleInExamination: 'Examiner' as const, conflictDeclaration: 'Pending' as const }]
  let ownerIdx = 0
  const nextOwner = (): string => {
    const o = owners[ownerIdx % owners.length]
    ownerIdx += 1
    return o.name
  }
  let dueCursor = 5
  for (const programmeId of input.programmeIds) {
    const programme = libraryRepository.getById(programmeId)
    if (!programme || programme.status !== 'Approved') continue
    for (const template of programme.procedures) {
      if (input.excludedProcedureIds?.includes(template.id)) continue
      const override = input.procedureOverrides?.[template.id]
      created.push(
        mkProcedure(examId, {
          programmeCode: programme.code,
          procCode: template.code,
          ownerName: override?.ownerName ?? nextOwner(),
          dueOffsetDays: (dueCursor += 3),
          status: 'Not Started',
          result: 'Not Tested',
          priority: override?.priority ?? template.priority,
        }),
      )
    }
  }
  for (const custom of input.customProcedures ?? []) {
    created.push(mkProcedure(examId, customSeed(custom)))
  }
  return created
}

const draftReportFor = (d: ExaminationDetail): ExaminationReport => ({
  id: demoUuid(84, details.length * 31 + d.reports.length + 7),
  title: `Draft examination report — ${d.reference}`,
  version: 'v0.1 (auto-assembled draft)',
  status: 'Draft',
  updatedAt: new Date().toISOString(),
  authorName: d.leadExaminerName,
  sections: [
    {
      heading: '1. Executive summary (demo draft)',
      body: `Auto-assembled prototype draft for ${d.title}. Fieldwork has not concluded; this view demonstrates the Journey A "draft report" step. All content is illustrative demo data.`,
    },
    {
      heading: '2. Scope and methodology',
      body: `${d.scope.domains.join(', ')} — ${d.scope.methodologyName} ${d.scope.methodologyVersion} (demo). Programmes: ${d.programmeRefs.join(', ') || 'to be selected'}.`,
    },
    {
      heading: '3. Findings',
      body: 'Findings raised during fieldwork will be summarised here with severity and five-Cs references (demo).',
    },
    {
      heading: '4. Recommended actions',
      body: 'To be completed at exit meeting (demo).',
    },
  ],
})

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const examinationRepository = {
  list(): Examination[] {
    return details.map(toBase)
  },

  detailsAll(): ExaminationDetail[] {
    return details.map(cloneDetail)
  },

  getDetail(id: string): ExaminationDetail | undefined {
    const d = detailById(id)
    return d ? cloneDetail(d) : undefined
  },

  getDetailByReference(reference: string): ExaminationDetail | undefined {
    const d = details.find((x) => x.reference === reference)
    return d ? cloneDetail(d) : undefined
  },

  proceduresFor(examinationId: string): ExaminationProcedure[] {
    return procedures.filter((p) => p.examinationId === examinationId).map(cloneProcedure)
  },

  getProcedure(id: string): ExaminationProcedure | undefined {
    const p = procedureById(id)
    return p ? cloneProcedure(p) : undefined
  },

  informationRequestsFor(examinationId: string): InformationRequest[] {
    return infoRequests
      .filter((r) => r.examinationId === examinationId)
      .map((r) => ({ ...r, recipientNames: [...r.recipientNames], items: r.items.map((i) => ({ ...i })) }))
  },

  /** Examinations currently in fieldwork (for the /app/fieldwork landing). */
  inFieldwork(): ExaminationDetail[] {
    return details.filter((d) => d.status === 'Fieldwork' || d.status === 'In Progress').map(cloneDetail)
  },

  // --- lifecycle -----------------------------------------------------------

  create(input: CreateExaminationInput, actor: ActorContext): ExaminationDetail {
    refSeq += 1
    const reference = `EXM-2026-${String(refSeq).padStart(3, '0')}`
    const id = demoUuid(85, refSeq + details.length + 1)
    const lead = input.team.find((t) => t.roleInExamination === 'Team Lead') ?? input.team[0]
    const created: ExaminationDetail = {
      id,
      reference,
      institutionId: input.institution.id,
      type: input.type,
      scopeAreas: input.domains,
      status: input.submit ? 'Planned' : 'Draft',
      riskRating: input.riskPriority,
      leadExaminerId: lead?.staffId ?? actor.actorId,
      leadExaminerName: lead?.name ?? actor.actorName,
      teamMemberNames: input.team.map((t) => t.name),
      startDate: input.startDate,
      plannedEndDate: input.plannedEndDate,
      progressPct: 0,
      findingsCount: 0,
      openFindingsCount: 0,
      summary:
        input.summary ??
        `${input.type} examination created in the prototype session (demo). ${input.sourceAlertRef ? `Initiated from early-warning alert ${input.sourceAlertRef}. ` : ''}Objectives: ${input.objectives.slice(0, 140)}${input.objectives.length > 140 ? '…' : ''}`,
      title: input.title,
      jurisdictionId: input.jurisdictionId,
      department: input.department,
      scope: {
        objectives: input.objectives,
        domains: input.domains,
        locations: input.locations,
        productLines: input.productLines,
        limitations: input.scopeLimitations,
        methodologyName: input.methodologyName,
        methodologyVersion: input.methodologyVersion,
        reviewPeriodStart: input.reviewPeriodStart,
        reviewPeriodEnd: input.reviewPeriodEnd,
      },
      team: input.team.map((t) => ({ ...t })),
      sourceAlertRef: input.sourceAlertRef,
      relatedFindingRefs: [],
      programmeRefs: input.programmeIds
        .map((pid) => {
          const p = libraryRepository.getById(pid)
          return p ? `${p.code} ${p.version}` : undefined
        })
        .filter((x): x is string => Boolean(x)),
      milestones: [
        { id: eventId(), label: 'Entry meeting', date: input.startDate, done: false },
        { id: eventId(), label: 'Exit meeting', date: input.plannedEndDate, done: false },
      ],
      reports: [],
      workflowHistory: [],
    }
    details.unshift(created)
    procedures.push(...buildProcedures(id, input.team, input))
    created.reports.push(draftReportFor(created))
    pushWorkflowEvent(created, actor.actorName, input.submit ? 'Examination created and submitted' : 'Examination saved as draft', `${input.team.length} team members; ${procedures.filter((p) => p.examinationId === id).length} procedures from ${created.programmeRefs.length || 0} programme(s).`)
    if (input.informationRequest && input.informationRequest.documents.length > 0) {
      irSeq += 1
      infoRequests.push({
        id: demoUuid(86, irSeq),
        examinationId: id,
        reference: `IR-2026-${String(irSeq).padStart(3, '0')}`,
        title: input.informationRequest.title,
        templateName: input.informationRequest.templateName,
        issuedAt: new Date().toISOString(),
        dueDate: input.informationRequest.deadline,
        status: 'Issued',
        recipientNames: [...input.informationRequest.recipientNames],
        items: input.informationRequest.documents.map((doc) => ({
          id: eventId(),
          document: doc,
          deadline: input.informationRequest!.deadline,
          status: 'Requested' as const,
        })),
      })
      pushWorkflowEvent(created, actor.actorName, 'Information request issued', input.informationRequest.title)
    }
    return cloneDetail(created)
  },

  setStatus(id: string, status: ExaminationStatus, actor: ActorContext, note?: string): ExaminationDetail | undefined {
    const d = detailById(id)
    if (!d) return undefined
    d.status = status
    if (status === 'Fieldwork' || (status === 'In Progress' && !d.startDate)) d.startDate = new Date().toISOString().slice(0, 10)
    if (status === 'Completed') {
      d.endDate = new Date().toISOString().slice(0, 10)
      d.progressPct = 100
    }
    pushWorkflowEvent(d, actor.actorName, `Stage changed to ${status}`, note)
    return cloneDetail(d)
  },

  assignTeam(id: string, team: ExaminationTeamMember[], actor: ActorContext): ExaminationDetail | undefined {
    const d = detailById(id)
    if (!d) return undefined
    d.team = team.map((t) => ({ ...t }))
    const lead = team.find((t) => t.roleInExamination === 'Team Lead') ?? team[0]
    if (lead) {
      d.leadExaminerId = lead.staffId
      d.leadExaminerName = lead.name
    }
    d.teamMemberNames = team.map((t) => t.name)
    pushWorkflowEvent(d, actor.actorName, 'Team assigned', team.map((t) => `${t.name} (${t.roleInExamination})`).join(', '))
    return cloneDetail(d)
  },

  syncFindingsCount(id: string, findingsCount: number, openFindingsCount: number): void {
    const d = detailById(id)
    if (d) {
      d.findingsCount = findingsCount
      d.openFindingsCount = openFindingsCount
    }
  },

  addRelatedFindingRef(id: string, ref: string): void {
    const d = detailById(id)
    if (!d) return
    d.relatedFindingRefs = [...new Set([...(d.relatedFindingRefs ?? []), ref])]
  },

  // --- procedures ----------------------------------------------------------

  startProcedure(id: string, actor: ActorContext): ExaminationProcedure | undefined {
    const p = procedureById(id)
    if (!p || p.status === 'Approved') return undefined
    if (p.status === 'Not Started') {
      p.status = 'In Progress'
      p.startedAt = new Date().toISOString()
    }
    const d = detailById(p.examinationId)
    if (d) pushWorkflowEvent(d, actor.actorName, `Procedure ${p.code} started`)
    return cloneProcedure(p)
  },

  saveProcedureDraft(id: string, input: ProcedureResultInput, _actor: ActorContext): ExaminationProcedure | undefined {
    const p = procedureById(id)
    if (!p || p.status === 'Approved' || p.status === 'Submitted for Review') return undefined
    p.result = input.result
    p.exceptionDetails = input.exceptionDetails
    p.conclusion = input.conclusion
    p.severity = input.severity
    if (input.sampleSize !== undefined) p.sampleSize = input.sampleSize
    if (input.population !== undefined) p.population = input.population
    if (input.ownerName !== undefined) p.ownerName = input.ownerName
    p.status = 'Draft Saved'
    if (!p.startedAt) p.startedAt = new Date().toISOString()
    return cloneProcedure(p)
  },

  completeProcedure(id: string, input: ProcedureResultInput, actor: ActorContext): ExaminationProcedure | undefined {
    const saved = examinationRepository.saveProcedureDraft(id, input, actor)
    const p = procedureById(id)
    if (!saved || !p) return undefined
    p.status = 'Submitted for Review'
    p.completedAt = new Date().toISOString()
    const d = detailById(p.examinationId)
    if (d) pushWorkflowEvent(d, actor.actorName, `Procedure ${p.code} submitted for review`, `Result: ${p.result}`)
    return cloneProcedure(p)
  },

  returnProcedure(id: string, actor: ActorContext, comment: string): ExaminationProcedure | undefined {
    const p = procedureById(id)
    if (!p || p.status !== 'Submitted for Review') return undefined
    p.status = 'Returned for Rework'
    p.completedAt = undefined
    p.comments.push({ id: eventId(), author: actor.actorName, at: new Date().toISOString(), text: comment, kind: 'reviewer' })
    const d = detailById(p.examinationId)
    if (d) pushWorkflowEvent(d, actor.actorName, `Procedure ${p.code} returned for rework`, comment)
    return cloneProcedure(p)
  },

  approveProcedure(id: string, actor: ActorContext, comment?: string): ExaminationProcedure | undefined {
    const p = procedureById(id)
    if (!p || p.status !== 'Submitted for Review') return undefined
    p.status = 'Approved'
    p.completedAt = new Date().toISOString()
    if (comment) p.comments.push({ id: eventId(), author: actor.actorName, at: new Date().toISOString(), text: comment, kind: 'reviewer' })
    const d = detailById(p.examinationId)
    if (d) pushWorkflowEvent(d, actor.actorName, `Procedure ${p.code} approved`, `Result: ${p.result}${comment ? ` — ${comment}` : ''}`)
    return cloneProcedure(p)
  },

  addSample(procedureId: string, label: string, population: string, outcome: 'Satisfactory' | 'Exception', note: string | undefined, _actor: ActorContext): ExaminationProcedure | undefined {
    const p = procedureById(procedureId)
    if (!p) return undefined
    p.samples.push({ id: eventId(), label, population, outcome, note })
    if (p.status === 'Not Started') {
      p.status = 'In Progress'
      p.startedAt = new Date().toISOString()
    }
    return cloneProcedure(p)
  },

  addComment(procedureId: string, text: string, actor: ActorContext, kind: 'comment' | 'reviewer' = 'comment'): ExaminationProcedure | undefined {
    const p = procedureById(procedureId)
    if (!p) return undefined
    p.comments.push({ id: eventId(), author: actor.actorName, at: new Date().toISOString(), text, kind })
    return cloneProcedure(p)
  },

  attachEvidence(procedureId: string, evidenceId: string, _actor: ActorContext): ExaminationProcedure | undefined {
    const p = procedureById(procedureId)
    if (!p) return undefined
    if (!p.evidenceIds.includes(evidenceId)) p.evidenceIds.push(evidenceId)
    if (p.status === 'Not Started') {
      p.status = 'In Progress'
      p.startedAt = new Date().toISOString()
    }
    return cloneProcedure(p)
  },

  linkFinding(procedureId: string, findingId: string, findingRef: string): ExaminationProcedure | undefined {
    const p = procedureById(procedureId)
    if (!p) return undefined
    p.linkedFindingId = findingId
    p.linkedFindingRef = findingRef
    const d = detailById(p.examinationId)
    if (d) {
      d.findingsCount += 1
      d.openFindingsCount += 1
      pushWorkflowEvent(d, p.ownerName, `Finding ${findingRef} raised from ${p.code}`, 'Prototype-session workflow event.')
    }
    return cloneProcedure(p)
  },

  /** Recompute header progress from the work programme (demo rule:
   *  approved procedures count fully, submitted/draft count half). */
  recomputeProgress(examinationId: string): void {
    const d = detailById(examinationId)
    if (!d) return
    const ps = procedures.filter((p) => p.examinationId === examinationId)
    if (ps.length === 0) return
    const weighted = ps.reduce((sum, p) => {
      if (p.status === 'Approved') return sum + 1
      if (p.status === 'Submitted for Review' || p.status === 'Draft Saved') return sum + 0.5
      if (p.status === 'In Progress' || p.status === 'Returned for Rework') return sum + 0.25
      return sum
    }, 0)
    d.progressPct = Math.min(100, Math.round((weighted / ps.length) * 100))
  },

  // --- information requests -------------------------------------------------

  createInformationRequest(
    examinationId: string,
    input: { title: string; templateName?: string; documents: string[]; deadline: string; recipientNames: string[] },
    actor: ActorContext,
  ): InformationRequest | undefined {
    const d = detailById(examinationId)
    if (!d) return undefined
    irSeq += 1
    const created: InformationRequest = {
      id: demoUuid(86, irSeq),
      examinationId,
      reference: `IR-2026-${String(irSeq).padStart(3, '0')}`,
      title: input.title,
      templateName: input.templateName,
      issuedAt: new Date().toISOString(),
      dueDate: input.deadline,
      status: 'Issued',
      recipientNames: [...input.recipientNames],
      items: input.documents.map((doc) => ({ id: eventId(), document: doc, deadline: input.deadline, status: 'Requested' as const })),
    }
    infoRequests.push(created)
    pushWorkflowEvent(d, actor.actorName, `Information request ${created.reference} issued`, input.title)
    return { ...created, items: created.items.map((i) => ({ ...i })) }
  },

  setRequestItemStatus(requestId: string, itemId: string, status: InformationRequest['items'][number]['status'], actor: ActorContext): InformationRequest | undefined {
    const r = infoRequests.find((x) => x.id === requestId)
    if (!r) return undefined
    const item = r.items.find((i) => i.id === itemId)
    if (!item) return undefined
    item.status = status
    item.receivedAt = status === 'Received' ? new Date().toISOString() : undefined
    const received = r.items.filter((i) => i.status === 'Received' || i.status === 'Waived').length
    r.status = received === r.items.length ? 'Fulfilled' : received > 0 ? 'Partially Fulfilled' : r.status
    const d = detailById(r.examinationId)
    if (d) pushWorkflowEvent(d, actor.actorName, `Information request ${r.reference} updated`, `${item.document} → ${status}`)
    return { ...r, recipientNames: [...r.recipientNames], items: r.items.map((i) => ({ ...i })) }
  },

  // --- reports ---------------------------------------------------------------

  reportsFor(examinationId: string): ExaminationReport[] {
    const d = detailById(examinationId)
    return d ? d.reports.map((r) => ({ ...r, sections: r.sections.map((s) => ({ ...s })) })) : []
  },

  updateReport(examinationId: string, reportId: string, patch: Partial<Pick<ExaminationReport, 'status' | 'sections' | 'version'>>, actor: ActorContext, eventLabel?: string): ExaminationReport | undefined {
    const d = detailById(examinationId)
    if (!d) return undefined
    const r = d.reports.find((x) => x.id === reportId)
    if (!r) return undefined
    Object.assign(r, patch, { updatedAt: new Date().toISOString() })
    if (eventLabel) pushWorkflowEvent(d, actor.actorName, eventLabel, `${r.title} → ${r.status}`)
    return { ...r, sections: r.sections.map((s) => ({ ...s })) }
  },

  /** Refresh the auto-assembled draft report body from live workflow state
   *  (findings/procedures) — the Journey A "view draft report" step. */
  refreshDraftReport(examinationId: string, findingLines: string[], actor: ActorContext): ExaminationReport | undefined {
    const d = detailById(examinationId)
    if (!d) return undefined
    const draft = d.reports.find((r) => r.status === 'Draft' || r.status === 'In Review')
    if (!draft) return undefined
    const ps = procedures.filter((p) => p.examinationId === examinationId)
    const approved = ps.filter((p) => p.status === 'Approved')
    const fails = approved.filter((p) => p.result === 'Fail' || p.result === 'Partial')
    draft.sections = [
      {
        heading: '1. Executive summary (demo draft)',
        body: `${d.title} — auto-assembled prototype draft (illustrative demo content, refreshed ${new Date().toISOString().slice(0, 10)}). Work programme: ${approved.length} of ${ps.length} procedures approved; ${fails.length} with Fail/Partial results. Overall progress ${d.progressPct}% (demo figure).`,
      },
      {
        heading: '2. Scope and methodology',
        body: `${d.scope.domains.join(', ')} — ${d.scope.methodologyName} ${d.scope.methodologyVersion} (demo). Programmes: ${d.programmeRefs.join(', ') || 'n/a'}. Review period ${d.scope.reviewPeriodStart} to ${d.scope.reviewPeriodEnd}.`,
      },
      {
        heading: '3. Findings',
        body: findingLines.length > 0 ? findingLines.join(' ') : 'No findings raised yet in the prototype session (demo).',
      },
      {
        heading: '4. Recommended actions',
        body: 'To be completed at the exit meeting; corrective actions will be agreed per finding (demo).',
      },
    ]
    draft.updatedAt = new Date().toISOString()
    pushWorkflowEvent(d, actor.actorName, 'Draft report refreshed', 'Auto-assembled from live work-programme state (demo).')
    return { ...draft, sections: draft.sections.map((s) => ({ ...s })) }
  },

  reset(): void {
    details.length = 0
    EXAMINATION_DETAILS.map(cloneDetail).forEach((d) => details.push(d))
    procedures.length = 0
    EXAMINATION_PROCEDURES.map(cloneProcedure).forEach((p) => procedures.push(p))
    infoRequests.length = 0
    INFORMATION_REQUESTS.forEach((r) =>
      infoRequests.push({ ...r, recipientNames: [...r.recipientNames], items: r.items.map((i) => ({ ...i })) }),
    )
    refSeq = 100
    irSeq = 100
  },
}

/** Procedure priority helper re-exported for wizard defaults. */
export const DEFAULT_PROCEDURE_PRIORITY: Priority = 'Medium'
