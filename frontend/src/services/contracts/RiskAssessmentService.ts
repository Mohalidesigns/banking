import type { ActorContext } from '@/types/common'
import type {
  AssessmentCategoryScore,
  AssessmentMethodology,
  RiskAssessmentDetail,
  SupervisoryIntensity,
} from '@/types/supervision'

/**
 * Risk-based supervision contract (Spec §6.2, §18.3). Assessment register,
 * the 8-step create wizard, category scoring with supervisory overrides and
 * the submit → review → approve lifecycle. Only `Approved` methodologies are
 * selectable; demo scoring is always explained via the methodology's
 * scoringNote — never presented as a universal regulatory formula.
 * Submission requires `submit-assessment`; approval `approve-assessment`.
 */
export interface RiskAssessmentQuery {
  institutionId?: string
  year?: number
  status?: string
  methodologyId?: string
  search?: string
}

/** Create-assessment wizard output (Spec §6.2, steps 1–8). */
export interface CreateAssessmentInput {
  institutionId: string
  year: number
  /** ISO 8601 assessment period. */
  periodStart: string
  periodEnd: string
  /** Must reference an Approved methodology. */
  methodologyId: string
  assessedByName: string
  /** ISO 8601 */
  dueDate: string
  categoryScores: AssessmentCategoryScore[]
  supervisoryJudgement: string
  reviewerName?: string
  /** true = submit for approval (In Review); false = save draft (In Progress). */
  submit: boolean
}

export interface RiskAssessmentService {
  list(query?: RiskAssessmentQuery): Promise<RiskAssessmentDetail[]>
  getById(id: string): Promise<RiskAssessmentDetail | undefined>
  methodologies(): Promise<AssessmentMethodology[]>
  approvedMethodologies(): Promise<AssessmentMethodology[]>
  /** Demo scoring helpers from the configured methodology (not hardcoded UI). */
  computeResidual(inherent: number, control: number): number
  intensityFor(composite: number): SupervisoryIntensity
  create(input: CreateAssessmentInput, actor: ActorContext): Promise<RiskAssessmentDetail>
  updateScores(id: string, categoryScores: AssessmentCategoryScore[], actor: ActorContext): Promise<RiskAssessmentDetail | undefined>
  setJudgement(id: string, judgement: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined>
  applyOverride(id: string, category: string, residual: number, reason: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined>
  submitForApproval(id: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined>
  addReviewComment(id: string, text: string, actor: ActorContext): Promise<RiskAssessmentDetail | undefined>
  approve(id: string, actor: ActorContext, comment?: string): Promise<RiskAssessmentDetail | undefined>
  returnAssessment(id: string, actor: ActorContext, comment: string): Promise<RiskAssessmentDetail | undefined>
}
