import type { SupervisoryDomain } from '@/types/regulatory'
import type { ActorContext } from '@/types/common'
import type {
  CreateSpecialistAssessmentInput,
  RecordChecklistResultInput,
  RequestEvidenceInput,
  SpecialistAssessmentDetail,
  SpecialistAssessmentRow,
  SpecialistConclusion,
  SpecialistDashboard,
  SpecialistDomainSpec,
  SpecialistFindingRow,
  SpecialistQuery,
} from '@/types/specialist'

/**
 * Specialist supervisory domain contracts (Spec §9, §18.3, Phase 4B). One
 * interface serves ALL six §9 domains — the shared 8-part page pattern
 * (dashboard · register · detail · checklist & procedures · evidence ·
 * findings · report · history) is parameterized by the `SpecialistDomainSpec`
 * configuration this service delivers, so a future ApiSpecialistService
 * slots in without screen changes (Spec §18.6). Role gating per §19:
 * - `manage-specialist-assessments` — create/start assessments, request
 *   evidence, draft and submit reports (review tier + approval tier);
 * - `record-specialist-checklist` — record checklist conclusions, simulate
 *   evidence receipt, review evidence (fieldwork tier and above);
 * - `approve-specialist-report` — request report changes, issue the report
 *   (a SIMULATION — nothing is ever sent) and complete the assessment with
 *   its conclusion/maturity (approval tier only; never an institution
 *   role — §7.8 hard rule).
 */
export interface SpecialistService {
  /** Domain configuration (submodules, checklist templates, evidence kinds). */
  domainSpec(domain: SupervisoryDomain): Promise<SpecialistDomainSpec | undefined>
  /** Pattern part 1 — domain dashboard aggregates. */
  dashboard(domain: SupervisoryDomain): Promise<SpecialistDashboard | undefined>
  /** Pattern part 2 — assessment register (pre-joined rows). */
  list(query?: SpecialistQuery): Promise<SpecialistAssessmentRow[]>
  /** Pattern parts 3–8 joined for one assessment (undefined when unknown). */
  detail(referenceOrId: string): Promise<SpecialistAssessmentDetail | undefined>
  /** Pattern part 6 — domain-wide findings panel (all institutions). */
  domainFindings(domain: SupervisoryDomain): Promise<SpecialistFindingRow[]>

  create(
    input: CreateSpecialistAssessmentInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentRow | undefined>
  /** Planned → In Progress. */
  start(id: string, actor: ActorContext): Promise<SpecialistAssessmentRow | undefined>
  /** In Progress → In Review (assessment-level handoff). */
  submitForReview(id: string, actor: ActorContext): Promise<SpecialistAssessmentRow | undefined>

  /** Pattern part 4 — record a checklist conclusion. */
  recordChecklistResult(
    itemId: string,
    input: RecordChecklistResultInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>

  /** Pattern part 5 — simulated evidence request/receipt/review. */
  requestEvidence(
    input: RequestEvidenceInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>
  receiveEvidence(id: string, actor: ActorContext): Promise<SpecialistAssessmentDetail | undefined>
  reviewEvidence(
    id: string,
    verdict: 'Reviewed' | 'Insufficient',
    note: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>

  /** Pattern part 7 — report lifecycle (issue step is a simulation). */
  saveReportDraft(
    id: string,
    executiveSummary: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>
  submitReport(id: string, actor: ActorContext): Promise<SpecialistAssessmentDetail | undefined>
  requestReportChanges(
    id: string,
    note: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>
  issueReport(id: string, actor: ActorContext): Promise<SpecialistAssessmentDetail | undefined>
  /** Record the final conclusion + demo maturity (approval tier). */
  completeAssessment(
    id: string,
    conclusion: SpecialistConclusion,
    maturityScore: number,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined>
}
