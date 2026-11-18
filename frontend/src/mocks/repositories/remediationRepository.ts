/**
 * Mock remediation repository (Spec §7.8, §17.4). Owns the mutable
 * corrective-action lifecycle: institution updates, milestones, evidence
 * links, supervisory validation, extension requests, escalation and the
 * closure decision (closure itself is role-gated at the service layer —
 * institution roles can never close a supervisory finding/action).
 * `base()` keeps Phase-2A consumers live.
 */
import { CORRECTIVE_ACTIONS } from '@/mocks/fixtures/supervision.fixture'
import { buildCapDetail } from '@/mocks/fixtures/remediation.fixture'
import { EVIDENCE_ITEMS } from '@/mocks/fixtures/evidence.fixture'
import type { ActorContext } from '@/types/common'
import { DEMO_ROLE_LABELS } from '@/types/auth'
import type { CorrectiveAction } from '@/types/supervision'
import type { CorrectiveActionDetail } from '@/types/finding'

const evidenceIdByRef = (ref: string): string | undefined =>
  EVIDENCE_ITEMS.find((e) => e.reference === ref)?.id

const clone = (c: CorrectiveActionDetail): CorrectiveActionDetail => ({
  ...c,
  milestones: c.milestones.map((m) => ({ ...m })),
  institutionUpdates: c.institutionUpdates.map((u) => ({ ...u })),
  evidenceIds: [...c.evidenceIds],
  extensionRequests: c.extensionRequests.map((x) => ({ ...x })),
  escalations: c.escalations.map((e) => ({ ...e })),
  closure: c.closure ? { ...c.closure } : undefined,
})

const build = (index: number, cap: CorrectiveAction): CorrectiveActionDetail => {
  const detail = buildCapDetail(index, cap)
  // Resolve EV-… references from the seed into evidence ids.
  detail.evidenceIds = detail.evidenceIds
    .map((token) => (token.startsWith('ref:') ? evidenceIdByRef(token.slice(4)) : token))
    .filter((x): x is string => Boolean(x))
  return detail
}

const records: CorrectiveActionDetail[] = CORRECTIVE_ACTIONS.map((c, i) => build(i, c))

const eventId = (): string => `cap-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const byId = (id: string): CorrectiveActionDetail | undefined => records.find((c) => c.id === id)
const byRef = (ref: string): CorrectiveActionDetail | undefined => records.find((c) => c.reference === ref)

const toBase = (c: CorrectiveActionDetail): CorrectiveAction => ({
  id: c.id,
  reference: c.reference,
  institutionId: c.institutionId,
  findingId: c.findingId,
  title: c.title,
  status: c.status,
  dueDate: c.dueDate,
  progressPct: c.progressPct,
  ownerName: c.ownerName,
})

/** Keep the summary status coherent with milestones/updates (demo rule). */
const syncStatus = (c: CorrectiveActionDetail): void => {
  if (c.closure) {
    c.status = 'Closed'
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  if (c.validationStatus === 'Validated') {
    c.status = 'Validated'
  } else if (c.progressPct >= 100) {
    c.status = 'In Progress'
  } else if (c.dueDate < today && c.progressPct < 100) {
    c.status = 'Overdue'
  } else if (c.institutionUpdates.length > 0 || c.progressPct > 0) {
    c.status = 'In Progress'
  }
}

export const remediationRepository = {
  list(): CorrectiveActionDetail[] {
    return records.map(clone)
  },

  base(): CorrectiveAction[] {
    return records.map(toBase)
  },

  getById(id: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    return c ? clone(c) : undefined
  },

  getByReference(reference: string): CorrectiveActionDetail | undefined {
    const c = byRef(reference)
    return c ? clone(c) : undefined
  },

  overdue(): CorrectiveActionDetail[] {
    const today = new Date().toISOString().slice(0, 10)
    return records.filter((c) => !c.closure && c.dueDate < today && c.progressPct < 100)
  },

  pendingValidation(): CorrectiveActionDetail[] {
    return records.filter((c) => c.validationStatus === 'Under Validation')
  },

  addUpdate(id: string, text: string, authorName: string, progressPct?: number): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    c.institutionUpdates.push({
      id: eventId(),
      at: new Date().toISOString(),
      authorName,
      text,
      progressPct,
    })
    if (progressPct !== undefined) c.progressPct = Math.max(0, Math.min(100, progressPct))
    syncStatus(c)
    return clone(c)
  },

  toggleMilestone(id: string, milestoneId: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    const m = c.milestones.find((x) => x.id === milestoneId)
    if (!m) return undefined
    m.done = !m.done
    m.doneAt = m.done ? new Date().toISOString().slice(0, 10) : undefined
    const done = c.milestones.filter((x) => x.done).length
    c.progressPct = c.milestones.length > 0 ? Math.round((done / c.milestones.length) * 100) : c.progressPct
    syncStatus(c)
    return clone(c)
  },

  addMilestone(id: string, label: string, targetDate: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    c.milestones.push({ id: eventId(), label, targetDate, done: false })
    syncStatus(c)
    return clone(c)
  },

  attachEvidence(id: string, evidenceId: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    if (!c.evidenceIds.includes(evidenceId)) c.evidenceIds.push(evidenceId)
    return clone(c)
  },

  submitForValidation(id: string, _actor: ActorContext): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    c.validationStatus = 'Under Validation'
    return clone(c)
  },

  validate(id: string, actor: ActorContext, ok: boolean, note: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    c.validationStatus = ok ? 'Validated' : 'Validation Failed'
    c.escalations.push({
      id: eventId(),
      at: new Date().toISOString(),
      byName: actor.actorName,
      level: 'Supervisory validation',
      note: `${ok ? 'Validated' : 'Validation failed'} — ${note} (demo action)`,
    })
    syncStatus(c)
    return clone(c)
  },

  requestExtension(id: string, input: { newDueDate: string; reason: string; requestedByName: string }): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c || c.closure) return undefined
    c.extensionRequests.push({
      id: eventId(),
      requestedAt: new Date().toISOString(),
      requestedByName: input.requestedByName,
      newDueDate: input.newDueDate,
      reason: input.reason,
      status: 'Pending',
    })
    return clone(c)
  },

  decideExtension(id: string, requestId: string, approve: boolean, actor: ActorContext, note?: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c) return undefined
    const x = c.extensionRequests.find((r) => r.id === requestId && r.status === 'Pending')
    if (!x) return undefined
    x.status = approve ? 'Approved' : 'Rejected'
    x.decidedByName = actor.actorName
    x.decidedAt = new Date().toISOString()
    x.decisionNote = note
    if (approve) {
      c.dueDate = x.newDueDate
      syncStatus(c)
    }
    return clone(c)
  },

  escalate(id: string, actor: ActorContext, level: string, note: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c) return undefined
    c.escalations.push({ id: eventId(), at: new Date().toISOString(), byName: actor.actorName, level, note })
    return clone(c)
  },

  /** Closure decision — the service layer enforces the regulator-role gate
   *  (Spec §7.8: institution users can never close). */
  decideClosure(id: string, actor: ActorContext, closed: boolean, rationale: string): CorrectiveActionDetail | undefined {
    const c = byId(id)
    if (!c) return undefined
    c.closure = {
      at: new Date().toISOString(),
      decidedByName: actor.actorName,
      decidedByRoleLabel: DEMO_ROLE_LABELS[actor.actorRole],
      decision: closed ? 'Closed' : 'Closure Rejected',
      rationale,
    }
    if (closed) {
      c.status = 'Closed'
      c.progressPct = 100
    }
    return clone(c)
  },

  reset(): void {
    records.length = 0
    CORRECTIVE_ACTIONS.forEach((c, i) => records.push(build(i, c)))
  },
}
