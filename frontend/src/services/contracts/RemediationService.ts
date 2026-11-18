import type { ActorContext } from '@/types/common'
import type { CorrectiveActionDetail } from '@/types/finding'

/**
 * Follow-up & remediation contract (Spec §7.8, §18.3). Institution-side
 * updates and evidence, supervisory validation, extension requests,
 * escalation history and the closure decision. HARD RULE (Spec §7.8): an
 * institution user can never close a supervisory finding/action — only
 * authorised regulator roles holding `close-remediation` may decide closure,
 * enforced in the mock service via DemoPermissionError.
 */
export interface RemediationQuery {
  institutionId?: string
  findingId?: string
  status?: string
  validationStatus?: string
  /** true → only records past their target date and not closed. */
  overdueOnly?: boolean
  search?: string
}

export interface RemediationService {
  list(query?: RemediationQuery): Promise<CorrectiveActionDetail[]>
  getById(id: string): Promise<CorrectiveActionDetail | undefined>
  getByReference(reference: string): Promise<CorrectiveActionDetail | undefined>
  overdue(): Promise<CorrectiveActionDetail[]>
  /** Institution-side progress update (portal roles + supervisors). */
  addUpdate(id: string, text: string, progressPct: number | undefined, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  toggleMilestone(id: string, milestoneId: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  addMilestone(id: string, label: string, targetDate: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  attachEvidence(id: string, evidenceId: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  submitForValidation(id: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  validate(id: string, ok: boolean, note: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  requestExtension(id: string, input: { newDueDate: string; reason: string }, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  decideExtension(id: string, requestId: string, approve: boolean, note: string | undefined, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  escalate(id: string, level: string, note: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
  /** Regulator-role-gated closure decision (Spec §7.8). */
  decideClosure(id: string, closed: boolean, rationale: string, actor: ActorContext): Promise<CorrectiveActionDetail | undefined>
}
