/**
 * Mock returns repository (Spec §11.1–§11.3, §17.4, §18.3). Owns the
 * mutable ReturnSubmissionDetail records and ReturnDefinition templates for
 * the prototype session. `base()` exposes the Phase-2A ReturnSubmission
 * summary projection so `supervisionRepository` — and every Phase-2A
 * consumer (Command Centre KPIs, profile tabs, queue counts) — stays live
 * with Phase-3A review/validation/template mutations.
 */
import { buildSubmissionDetail, evaluateValidation, RETURN_DEFINITIONS, SUBMISSION_DETAILS } from '@/mocks/fixtures/returns.fixture'
import { RETURN_SUBMISSIONS } from '@/mocks/fixtures/supervision.fixture'
import type { ActorContext } from '@/types/common'
import type { ReturnSubmission, ReturnReviewStatus } from '@/types/supervision'
import type {
  ReturnDefinition,
  ReturnField,
  ReturnFieldInput,
  ReturnRuleInput,
  ReturnSubmissionDetail,
} from '@/types/returns'

const cloneDetail = (s: ReturnSubmissionDetail): ReturnSubmissionDetail => ({
  ...s,
  data: s.data.map((d) => ({ ...d })),
  validationResult: s.validationResult
    ? {
        ...s.validationResult,
        fieldErrors: s.validationResult.fieldErrors.map((e) => ({ ...e })),
        crossReturnExceptions: s.validationResult.crossReturnExceptions.map((c) => ({ ...c })),
      }
    : undefined,
  reconciliation: s.reconciliation.map((r) => ({ ...r })),
  reviewNotes: s.reviewNotes.map((n) => ({ ...n })),
  versions: s.versions.map((v) => ({ ...v })),
  activity: s.activity.map((a) => ({ ...a })),
  fileMetadata: s.fileMetadata ? { ...s.fileMetadata } : undefined,
  certification: s.certification ? { ...s.certification } : undefined,
})

const cloneDefinition = (d: ReturnDefinition): ReturnDefinition => ({
  ...d,
  institutionCategories: [...d.institutionCategories],
  fields: d.fields.map((f) => ({ ...f, validationRules: f.validationRules.map((r) => ({ ...r, params: r.params ? { ...r.params } : undefined })) })),
  certification: d.certification.map((c) => ({ ...c })),
  versions: d.versions.map((v) => ({ ...v })),
})

const records: ReturnSubmissionDetail[] = SUBMISSION_DETAILS.map(cloneDetail)
const definitions: ReturnDefinition[] = RETURN_DEFINITIONS.map(cloneDefinition)

const seq = (): string => `ret-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const byId = (id: string): ReturnSubmissionDetail | undefined => records.find((r) => r.id === id)

const toBase = (s: ReturnSubmissionDetail): ReturnSubmission => ({
  id: s.id,
  reference: s.reference,
  returnCode: s.returnCode,
  returnName: s.returnName,
  institutionId: s.institutionId,
  period: s.period,
  dueDate: s.dueDate,
  submittedAt: s.submittedAt,
  status: s.status,
  version: s.version,
  validation: s.validation,
  reviewStatus: s.reviewStatus,
})

const event = (s: ReturnSubmissionDetail, actorName: string, action: string, detail: string): void => {
  s.activity.push({ id: seq(), at: new Date().toISOString(), actorName, action, detail })
}

export const returnsRepository = {
  list(): ReturnSubmissionDetail[] {
    return records.map(cloneDetail)
  },

  base(): ReturnSubmission[] {
    return records.map(toBase)
  },

  getById(id: string): ReturnSubmissionDetail | undefined {
    const s = byId(id)
    return s ? cloneDetail(s) : undefined
  },

  awaitingReview(): ReturnSubmissionDetail[] {
    return records.filter((s) => s.reviewStatus === 'Awaiting Review' || s.reviewStatus === 'Under Review')
  },

  overdue(): ReturnSubmission[] {
    return records.filter((s) => s.status === 'Overdue').map(toBase)
  },

  definitions(): ReturnDefinition[] {
    return definitions.map(cloneDefinition)
  },

  definitionById(id: string): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    return d ? cloneDefinition(d) : undefined
  },

  definitionByCode(code: string): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.code === code)
    return d ? cloneDefinition(d) : undefined
  },

  /** Re-run the demo rule engine against the submitted data (Spec §11.3). */
  runValidation(id: string, actor: ActorContext): ReturnSubmissionDetail | undefined {
    const s = byId(id)
    if (!s) return undefined
    const def = definitions.find((d) => d.id === s.definitionId)
    if (!def) return undefined
    const runAt = new Date().toISOString()
    s.validationResult = evaluateValidation(
      def,
      s.data.map((d) => ({ ...d })),
      runAt,
      s.validationResult?.crossReturnExceptions.map((c) => ({ ...c })) ?? [],
    )
    s.validation = s.validationResult.status
    event(s, actor.actorName, 'Validation run', `Demo rule engine result: ${s.validationResult.status} (${s.validationResult.errorCount} errors, ${s.validationResult.warningCount} warnings).`)
    return cloneDetail(s)
  },

  startReview(id: string, actor: ActorContext): ReturnSubmissionDetail | undefined {
    const s = byId(id)
    if (!s || s.reviewStatus !== 'Awaiting Review') return undefined
    s.reviewStatus = 'Under Review'
    if (s.status === 'Submitted' || s.status === 'Overdue') s.status = 'In Review'
    event(s, actor.actorName, 'Review started', 'Submission picked up for supervisory review (demo).')
    return cloneDetail(s)
  },

  addReviewNote(id: string, text: string, actor: ActorContext): ReturnSubmissionDetail | undefined {
    const s = byId(id)
    if (!s) return undefined
    s.reviewNotes.push({ id: seq(), at: new Date().toISOString(), authorName: actor.actorName, text })
    event(s, actor.actorName, 'Review note added', text)
    return cloneDetail(s)
  },

  /** Accept / reject / return-for-correction (Spec §11.3 demo actions). */
  decide(
    id: string,
    decision: 'Accepted' | 'Rejected' | 'Returned for Correction',
    note: string,
    actor: ActorContext,
  ): ReturnSubmissionDetail | undefined {
    const s = byId(id)
    if (!s) return undefined
    s.reviewStatus = decision as ReturnReviewStatus
    if (decision === 'Accepted') s.status = 'Accepted'
    if (decision === 'Rejected') s.status = 'Rejected'
    s.reviewNotes.push({
      id: seq(),
      at: new Date().toISOString(),
      authorName: actor.actorName,
      text: note,
      decision,
    })
    event(s, actor.actorName, `Review decision — ${decision}`, note)
    return cloneDetail(s)
  },

  // Template designer mutations (Spec §11.2) ------------------------------

  updateDefinitionMeta(id: string, patch: Partial<Pick<ReturnDefinition, 'name' | 'description' | 'frequency' | 'reportingBasis' | 'submissionFormat' | 'effectiveFrom' | 'effectiveTo' | 'institutionCategories'>>, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    if (!d) return undefined
    Object.assign(d, patch)
    void actor
    return cloneDefinition(d)
  },

  addField(definitionId: string, input: ReturnFieldInput, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    if (!d) return undefined
    if (d.fields.some((f) => f.code === input.code)) return undefined
    const field: ReturnField = {
      id: seq(),
      code: input.code,
      label: input.label,
      section: input.section,
      type: input.type,
      unit: input.unit,
      required: input.required,
      helpText: input.helpText,
      // Orders are unique per template — append after the current maximum.
      order: d.fields.reduce((max, f) => Math.max(max, f.order), -1) + 1,
      validationRules: [],
    }
    d.fields.push(field)
    void actor
    return cloneDefinition(d)
  },

  updateField(definitionId: string, fieldId: string, patch: Partial<ReturnFieldInput>, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    const f = d?.fields.find((x) => x.id === fieldId)
    if (!d || !f) return undefined
    Object.assign(f, patch)
    void actor
    return cloneDefinition(d)
  },

  removeField(definitionId: string, fieldId: string, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    if (!d) return undefined
    const idx = d.fields.findIndex((f) => f.id === fieldId)
    if (idx < 0) return undefined
    d.fields.splice(idx, 1)
    d.fields.forEach((f, i) => {
      f.order = i
    })
    void actor
    return cloneDefinition(d)
  },

  moveField(definitionId: string, fieldId: string, direction: 'up' | 'down', actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    if (!d) return undefined
    const sorted = [...d.fields].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((f) => f.id === fieldId)
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || target < 0 || target >= sorted.length) return undefined
    const tmp = sorted[idx].order
    sorted[idx].order = sorted[target].order
    sorted[target].order = tmp
    void actor
    return cloneDefinition(d)
  },

  addRule(definitionId: string, fieldId: string, input: ReturnRuleInput, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    const f = d?.fields.find((x) => x.id === fieldId)
    if (!d || !f) return undefined
    f.validationRules.push({ id: seq(), rule: input.rule, expression: input.expression, severity: input.severity, message: input.message })
    void actor
    return cloneDefinition(d)
  },

  removeRule(definitionId: string, fieldId: string, ruleId: string, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === definitionId)
    const f = d?.fields.find((x) => x.id === fieldId)
    if (!d || !f) return undefined
    f.validationRules = f.validationRules.filter((r) => r.id !== ruleId)
    void actor
    return cloneDefinition(d)
  },

  submitDefinitionForApproval(id: string, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    if (!d || d.approvalStatus === 'Under Review') return undefined
    d.approvalStatus = 'Under Review'
    void actor
    return cloneDefinition(d)
  },

  approveDefinition(id: string, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    if (!d) return undefined
    d.approvalStatus = 'Approved'
    void actor
    return cloneDefinition(d)
  },

  retireDefinition(id: string, actor: ActorContext): ReturnDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    if (!d) return undefined
    d.approvalStatus = 'Retired'
    d.effectiveTo = new Date().toISOString().slice(0, 10)
    void actor
    return cloneDefinition(d)
  },

  reset(): void {
    records.length = 0
    RETURN_SUBMISSIONS.map(buildSubmissionDetail).forEach((s) => records.push(cloneDetail(s)))
    definitions.length = 0
    RETURN_DEFINITIONS.forEach((d) => definitions.push(cloneDefinition(d)))
  },
}
