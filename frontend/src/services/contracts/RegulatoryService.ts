import type { ActorContext } from '@/types/common'
import type {
  ComposeCorrespondenceInput,
  CorrespondenceQuery,
  CorrespondenceRelationCandidate,
  CorrespondenceRow,
  FrameworkDetail,
  FrameworkQuery,
  ObligationDetail,
  ObligationQuery,
  ObligationRow,
  RecordObligationReviewInput,
  RegulatoryCorrespondence,
  RegulatoryFramework,
  RegulatoryRequirement,
  UpdateObligationApplicabilityInput,
  UploadFrameworkInput,
} from '@/types/regulatory'

/**
 * Regulatory administration contracts (Spec §10.1–§10.3, §18.3, Phase 4A).
 * Components consume these interfaces only; MockRegulatoryService implements
 * them over `regulatoryRepository`, and a future ApiRegulatoryService would
 * slot in without screen changes (Spec §18.6). Role gating per §19:
 * - `manage-frameworks` — simulated upload + AI extraction, approve/reject
 *   extracted draft requirements, publish versions (approval tier + legal);
 * - `manage-obligations` — applicability editor, compliance verification,
 *   review recording (approval tier);
 * - `manage-correspondence` — compose/edit drafts, submit for review,
 *   request changes, log responses to incoming letters (review tier +
 *   legal + approval tier);
 * - `approve-correspondence` — approve and send-demo outgoing letters
 *   (approval tier only; never an institution role — §7.8 hard rule).
 * The send step is a SIMULATION: the prototype never sends real
 * communications (Spec §10.3) and says so in every confirmation.
 */

export interface FrameworkService {
  /** §10.1 framework library. */
  list(query?: FrameworkQuery): Promise<RegulatoryFramework[]>
  /** Detail with requirements, mapped institutions and story anchors. */
  detail(codeOrId: string): Promise<FrameworkDetail | undefined>
  listRequirements(frameworkId: string): Promise<RegulatoryRequirement[]>
  getRequirement(id: string): Promise<RegulatoryRequirement | undefined>
  /** Simulated upload; `runAiExtraction` produces labelled draft requirements. */
  upload(input: UploadFrameworkInput, actor: ActorContext): Promise<RegulatoryFramework | undefined>
  approveRequirement(id: string, note: string, actor: ActorContext): Promise<RegulatoryRequirement | undefined>
  rejectRequirement(id: string, note: string, actor: ActorContext): Promise<RegulatoryRequirement | undefined>
  publishVersion(
    frameworkId: string,
    version: string,
    changeSummary: string,
    actor: ActorContext,
  ): Promise<RegulatoryFramework | undefined>
}

export interface ObligationService {
  /** §10.2 obligation register (pre-joined rows). */
  list(query?: ObligationQuery): Promise<ObligationRow[]>
  detail(referenceOrId: string): Promise<ObligationDetail | undefined>
  /** §10.2 applicability editor — every change lands in the change history. */
  updateApplicability(
    id: string,
    input: UpdateObligationApplicabilityInput,
    actor: ActorContext,
  ): Promise<ObligationRow | undefined>
  /** Verify/adjust one institution's compliance status. */
  setInstitutionStatus(
    id: string,
    institutionId: string,
    status: 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Assessed',
    note: string,
    actor: ActorContext,
  ): Promise<ObligationDetail | undefined>
  /** §10.2 review workflow — updates last/next review and the history. */
  recordReview(
    id: string,
    input: RecordObligationReviewInput,
    actor: ActorContext,
  ): Promise<ObligationDetail | undefined>
}

export interface CorrespondenceService {
  /** §10.3 official correspondence register (pre-joined rows). */
  list(query?: CorrespondenceQuery): Promise<CorrespondenceRow[]>
  detail(referenceOrId: string): Promise<RegulatoryCorrespondence | undefined>
  /** Candidate related records for the compose form (story-anchored). */
  relationCandidates(institutionId?: string): Promise<CorrespondenceRelationCandidate[]>
  /** Compose a draft (never sent for real — Spec §10.3). */
  compose(input: ComposeCorrespondenceInput, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
  updateDraft(
    id: string,
    patch: { subject?: string; body?: string; responseDueDate?: string },
    actor: ActorContext,
  ): Promise<RegulatoryCorrespondence | undefined>
  submitForReview(id: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
  requestChanges(id: string, note: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
  approve(id: string, note: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
  /** SIMULATED dispatch — records the event and labels it as a demo send. */
  sendDemo(id: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
  /** Log/assess the response to an incoming letter and close the thread. */
  logResponse(id: string, summary: string, actor: ActorContext): Promise<RegulatoryCorrespondence | undefined>
}
