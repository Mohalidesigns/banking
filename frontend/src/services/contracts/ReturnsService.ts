import type { ActorContext } from '@/types/common'
import type {
  InstitutionComplianceRow,
  ReturnDefinition,
  ReturnFieldInput,
  ReturnRuleInput,
  ReturnSubmissionDetail,
  ReturnSubmissionQuery,
  ReturnsCalendarDay,
  ReturnsKpis,
  ReturnTypeRow,
  SubmissionRow,
  ValidationExceptionRow,
} from '@/types/returns'

/**
 * Regulatory returns contracts (Spec §11.1–§11.3, §18.3). Components
 * consume these interfaces only; MockReturnsService implements them over
 * `returnsRepository`, and a future ApiReturnsService would slot in without
 * screen changes (Spec §18.6). Role gating per §19: `review-submission`
 * (analyst tier and above) for validation/review notes; `approve-submission`
 * (team lead and above) for accept/reject decisions;
 * `manage-return-templates` for the template designer.
 */

/** Everything the returns dashboard renders in one call (Spec §11.1). */
export interface ReturnsDashboardData {
  kpis: ReturnsKpis
  calendar: ReturnsCalendarDay[]
  compliance: InstitutionComplianceRow[]
  byType: ReturnTypeRow[]
  validationExceptions: ValidationExceptionRow[]
}

export interface ReturnsService {
  dashboard(query?: ReturnSubmissionQuery): Promise<ReturnsDashboardData>
  listSubmissions(query?: ReturnSubmissionQuery): Promise<SubmissionRow[]>
  getSubmission(id: string): Promise<ReturnSubmissionDetail | undefined>
  awaitingReviewCount(): Promise<number>
  /** Re-run the demo rule engine against the submitted data (Spec §11.3). */
  runValidation(id: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined>
  startReview(id: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined>
  addReviewNote(id: string, text: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined>
  decide(
    id: string,
    decision: 'Accepted' | 'Rejected' | 'Returned for Correction',
    note: string,
    actor: ActorContext,
  ): Promise<ReturnSubmissionDetail | undefined>
}

export interface ReturnTemplateService {
  listDefinitions(): Promise<ReturnDefinition[]>
  getDefinition(id: string): Promise<ReturnDefinition | undefined>
  getByCode(code: string): Promise<ReturnDefinition | undefined>
  updateMeta(
    id: string,
    patch: Partial<Pick<ReturnDefinition, 'name' | 'description' | 'frequency' | 'reportingBasis' | 'submissionFormat' | 'effectiveFrom' | 'effectiveTo' | 'institutionCategories'>>,
    actor: ActorContext,
  ): Promise<ReturnDefinition | undefined>
  addField(definitionId: string, input: ReturnFieldInput, actor: ActorContext): Promise<ReturnDefinition | undefined>
  updateField(definitionId: string, fieldId: string, patch: Partial<ReturnFieldInput>, actor: ActorContext): Promise<ReturnDefinition | undefined>
  removeField(definitionId: string, fieldId: string, actor: ActorContext): Promise<ReturnDefinition | undefined>
  moveField(definitionId: string, fieldId: string, direction: 'up' | 'down', actor: ActorContext): Promise<ReturnDefinition | undefined>
  addRule(definitionId: string, fieldId: string, input: ReturnRuleInput, actor: ActorContext): Promise<ReturnDefinition | undefined>
  removeRule(definitionId: string, fieldId: string, ruleId: string, actor: ActorContext): Promise<ReturnDefinition | undefined>
  submitForApproval(id: string, actor: ActorContext): Promise<ReturnDefinition | undefined>
  approve(id: string, actor: ActorContext): Promise<ReturnDefinition | undefined>
  retire(id: string, actor: ActorContext): Promise<ReturnDefinition | undefined>
}
