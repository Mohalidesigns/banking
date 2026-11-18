/**
 * Mock finding repository (Spec §7.7, §17.4, §18.3). Owns the mutable
 * FindingDetail records for the prototype session: the five-Cs detail is
 * merged from the detail fixture onto the Phase-2A FINDINGS summaries, and
 * workflow mutations (raise → submit → return/approve → escalate → close)
 * mutate this single source of truth. `base()` exposes the summary view so
 * `supervisionRepository` (and every Phase-2A consumer: dashboards, profile
 * tabs, queue counts) stays live with Phase-2B mutations.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import { FINDINGS } from '@/mocks/fixtures/supervision.fixture'
import { buildFindingDetail } from '@/mocks/fixtures/findingDetail.fixture'
import type { ActorContext } from '@/types/common'
import { DEMO_ROLE_LABELS } from '@/types/auth'
import type { DemoRole } from '@/types/auth'
import type {
  FindingDetail,
  ManagementResponse,
  RaiseFindingInput,
} from '@/types/finding'
import type { SupervisoryFinding } from '@/types/supervision'

const clone = (f: FindingDetail): FindingDetail => ({
  ...f,
  fiveCs: { ...f.fiveCs },
  crossDomainLinks: [...f.crossDomainLinks],
  evidenceLinks: f.evidenceLinks.map((e) => ({ ...e })),
  managementResponses: f.managementResponses.map((r) => ({ ...r })),
  approvalTrail: f.approvalTrail.map((e) => ({ ...e })),
})

const records: FindingDetail[] = FINDINGS.map(buildFindingDetail)

let refSeq = 200

const nextRef = (): string => {
  refSeq += 1
  return `FND-2026-${refSeq}`
}

const eventId = (): string => `fev-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const roleLabel = (role: DemoRole): string =>
  // Imported lazily as a value to avoid a module cycle at fixture load time.
  DEMO_ROLE_LABELS[role]

const trail = (f: FindingDetail, actor: ActorContext, decision: FindingDetail['approvalTrail'][number]['decision'], comment?: string): void => {
  f.approvalTrail.push({
    id: eventId(),
    at: new Date().toISOString(),
    actorName: actor.actorName,
    actorRoleLabel: roleLabel(actor.actorRole),
    decision,
    comment,
  })
}

/** Summary projection for Phase-2A consumers. */
const toBase = (f: FindingDetail): SupervisoryFinding => ({
  id: f.id,
  reference: f.reference,
  institutionId: f.institutionId,
  examinationId: f.examinationId,
  examinationRef: f.examinationRef,
  title: f.title,
  description: f.description,
  riskRating: f.riskRating,
  category: f.category,
  status: f.status,
  raisedDate: f.raisedDate,
  dueDate: f.dueDate,
  ownerName: f.ownerName,
  correctiveActionRef: f.correctiveActionRef,
})

const byId = (id: string): FindingDetail | undefined => records.find((f) => f.id === id)

export const findingRepository = {
  list(): FindingDetail[] {
    return records.map(clone)
  },

  base(): SupervisoryFinding[] {
    return records.map(toBase)
  },

  getById(id: string): FindingDetail | undefined {
    const f = byId(id)
    return f ? clone(f) : undefined
  },

  getByReference(reference: string): FindingDetail | undefined {
    const f = records.find((x) => x.reference === reference)
    return f ? clone(f) : undefined
  },

  awaitingReview(): FindingDetail[] {
    return records.filter((f) => f.status === 'Under Review' || f.status === 'Draft')
  },

  create(input: RaiseFindingInput, actor: ActorContext): FindingDetail {
    const now = new Date().toISOString()
    const created: FindingDetail = {
      id: demoUuid(81, refSeq + records.length + 1),
      reference: nextRef(),
      institutionId: input.institutionId,
      examinationId: input.examinationId,
      examinationRef: input.examinationRef,
      title: input.title,
      description: input.fiveCs.condition,
      riskRating: input.riskRating,
      category: input.category,
      status: 'Draft',
      raisedDate: now.slice(0, 10),
      dueDate: input.dueDate,
      ownerName: actor.actorName,
      fiveCs: { ...input.fiveCs },
      severityRationale: input.severityRationale,
      breachClassification: input.breachClassification,
      regulatoryReference: input.regulatoryReference,
      institutionOwnerRole: input.institutionOwnerRole,
      crossDomainLinks: [...input.crossDomainLinks],
      evidenceLinks: input.evidenceLinks.map((e) => ({ ...e })),
      procedureId: input.procedureId,
      procedureCode: input.procedureCode,
      managementResponses: [],
      approvalTrail: [],
    }
    trail(created, actor, 'Raised', input.procedureCode ? `Raised from procedure ${input.procedureCode}.` : undefined)
    records.unshift(created)
    return clone(created)
  },

  submitForReview(id: string, actor: ActorContext, comment?: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f || (f.status !== 'Draft' && f.status !== 'Confirmed')) return undefined
    f.status = 'Under Review'
    trail(f, actor, 'Submitted', comment)
    return clone(f)
  },

  returnForRework(id: string, actor: ActorContext, comment: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f || f.status !== 'Under Review') return undefined
    f.status = 'Draft'
    trail(f, actor, 'Returned', comment)
    return clone(f)
  },

  approve(id: string, actor: ActorContext, comment?: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f || f.status !== 'Under Review') return undefined
    f.status = 'Confirmed'
    f.reviewerName = actor.actorName
    trail(f, actor, 'Approved', comment)
    return clone(f)
  },

  escalate(id: string, actor: ActorContext, comment: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f) return undefined
    f.status = 'Escalated'
    trail(f, actor, 'Escalated', comment)
    return clone(f)
  },

  markRemediationStarted(id: string, correctiveActionRef: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f) return undefined
    f.status = 'Remediation In Progress'
    f.correctiveActionRef = correctiveActionRef
    return clone(f)
  },

  close(id: string, actor: ActorContext, comment: string): FindingDetail | undefined {
    const f = byId(id)
    if (!f) return undefined
    f.status = 'Closed'
    trail(f, actor, 'Approved', `Closure approved — ${comment}`)
    return clone(f)
  },

  addManagementResponse(
    id: string,
    input: Omit<ManagementResponse, 'id' | 'findingId'>,
  ): FindingDetail | undefined {
    const f = byId(id)
    if (!f) return undefined
    f.managementResponses.push({ ...input, id: eventId(), findingId: f.id })
    return clone(f)
  },

  addEvidenceLink(id: string, link: FindingDetail['evidenceLinks'][number]): FindingDetail | undefined {
    const f = byId(id)
    if (!f) return undefined
    f.evidenceLinks.push({ ...link })
    return clone(f)
  },

  reset(): void {
    records.length = 0
    FINDINGS.map(buildFindingDetail).forEach((f) => records.push(f))
    refSeq = 200
  },
}
