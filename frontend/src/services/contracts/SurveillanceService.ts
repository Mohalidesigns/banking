import type { ActorContext } from '@/types/common'
import type {
  AlertQuery,
  AlertRow,
  AnalystReview,
  CreateAnalystReviewInput,
  EarlyWarningAlertDetail,
  ExceptionRow,
  InstitutionSurveillanceDetail,
  PrudentialException,
  SupervisoryDecisionEvent,
  SurveillanceOverview,
  SurveillanceQuery,
} from '@/types/surveillance'

/**
 * Off-site surveillance & early-warning contracts (Spec §6.1, §6.4, §18.3).
 * Components consume these interfaces only; mock implementations live over
 * `surveillanceRepository` (+ institution/snapshot repositories for derived
 * ratios and peer stats). Role gating per §19: `manage-alerts` for alert
 * workflow mutations, `create-analyst-review` for reviews,
 * `approve-submission`-tier leads record supervisory decisions.
 */

export interface SurveillanceService {
  overview(query?: SurveillanceQuery): Promise<SurveillanceOverview>
  institutionDetail(institutionId: string): Promise<InstitutionSurveillanceDetail | undefined>
  listExceptions(query?: SurveillanceQuery): Promise<ExceptionRow[]>
  listAnalystReviews(institutionId?: string): Promise<AnalystReview[]>
  listDecisions(institutionId?: string): Promise<SupervisoryDecisionEvent[]>
  createAnalystReview(input: CreateAnalystReviewInput, actor: ActorContext): Promise<AnalystReview>
  recordReviewDecision(id: string, decision: string, note: string, actor: ActorContext): Promise<AnalystReview | undefined>
  /** Generic supervisory decision (e.g. "Clarification requested") recorded against an institution. */
  recordDecision(
    institutionId: string,
    action: SupervisoryDecisionEvent['action'],
    detail: string,
    actor: ActorContext,
  ): Promise<SupervisoryDecisionEvent>
  setExceptionStatus(
    id: string,
    status: PrudentialException['status'],
    actor: ActorContext,
    note?: string,
  ): Promise<PrudentialException | undefined>
}

export interface EarlyWarningService {
  list(query?: AlertQuery): Promise<AlertRow[]>
  getById(id: string): Promise<EarlyWarningAlertDetail | undefined>
  getByReference(reference: string): Promise<EarlyWarningAlertDetail | undefined>
  acknowledge(id: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  assign(id: string, analystName: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  addAssessment(id: string, text: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  escalate(id: string, note: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  dismiss(id: string, reason: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  resolve(id: string, note: string, actor: ActorContext): Promise<EarlyWarningAlertDetail | undefined>
  /** Spec §6.4 → §7.2: convert the alert into a supervisory action. */
  linkExamination(
    id: string,
    examination: { reference: string; id: string; status: string },
    actor: ActorContext,
  ): Promise<EarlyWarningAlertDetail | undefined>
  linkAction(
    id: string,
    action: NonNullable<EarlyWarningAlertDetail['linkedAction']>,
    actor: ActorContext,
  ): Promise<EarlyWarningAlertDetail | undefined>
}
