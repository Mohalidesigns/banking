import type { ActorContext, Priority, RiskRating } from '@/types/common'
import type { Institution } from '@/types/institution'
import type { FindingDetail, RaiseFindingInput } from '@/types/finding'
import type { Examination, ExaminationStatus } from '@/types/supervision'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  ExaminationReport,
  ExaminationTeamMember,
  InformationRequest,
  ProcedureResultInput,
} from '@/types/examination'

/**
 * Examination operations contract (Spec §7.1–§7.4, §18.3). Components
 * depend on this interface only; MockExaminationService reads/writes the
 * mutable examination repository, a future ApiExaminationService calls
 * Spring Boot endpoints unchanged. Workflow mutations are role-gated with
 * the demo permission profiles (Spec §19) and throw DemoPermissionError.
 */
export interface ExaminationQuery {
  institutionId?: string
  type?: string
  domain?: string
  teamLeadName?: string
  status?: string
  /** ISO 8601 date range over planned fieldwork dates. */
  dateFrom?: string
  dateTo?: string
  priority?: string
  search?: string
}

/** A procedure added ad-hoc in the create wizard (not from the library). */
export interface CustomProcedureInput {
  code: string
  title: string
  objective: string
  question: string
  steps: string[]
  regulatoryCriteria: string
  requiredEvidence: string[]
  testingMethod: string
  ownerName: string
  /** ISO 8601 */
  dueDate: string
  priority: Priority
}

/** Create-examination wizard output (Spec §7.2 steps 1–6). */
export interface CreateExaminationInput {
  institution: Institution
  title: string
  type: Examination['type']
  riskPriority: RiskRating
  /** ISO 8601 review period covered by the examination. */
  reviewPeriodStart: string
  reviewPeriodEnd: string
  /** ISO 8601 planned fieldwork dates. */
  startDate: string
  plannedEndDate: string
  jurisdictionId: string
  department: string
  objectives: string
  domains: string[]
  locations: string[]
  productLines: string[]
  scopeLimitations?: string
  methodologyName: string
  methodologyVersion: string
  team: ExaminationTeamMember[]
  /** Selected approved library programmes (ids); procedures instantiate from them. */
  programmeIds: string[]
  /** Library procedure template ids deselected in step 4 (empty = take all). */
  excludedProcedureIds?: string[]
  /** Per-template owner/priority overrides set in wizard step 4. */
  procedureOverrides?: Record<string, { ownerName?: string; priority?: Priority }>
  customProcedures?: CustomProcedureInput[]
  informationRequest?: {
    templateName?: string
    title: string
    documents: string[]
    /** ISO 8601 */
    deadline: string
    recipientNames: string[]
  } | null
  /** Early-warning alert reference when converted from an alert (§6.4). */
  sourceAlertRef?: string
  /** true = submit for approval (Planned); false = save draft (Draft). */
  submit: boolean
  summary?: string
}

export interface ExaminationService {
  list(query?: ExaminationQuery): Promise<ExaminationDetail[]>
  getDetail(id: string): Promise<ExaminationDetail | undefined>
  getByReference(reference: string): Promise<ExaminationDetail | undefined>

  // Wizard (Spec §7.2)
  create(input: CreateExaminationInput, actor: ActorContext): Promise<ExaminationDetail>
  submitDraft(id: string, actor: ActorContext): Promise<ExaminationDetail | undefined>

  // Lifecycle & team (Spec §7.1/§7.3)
  assignTeam(id: string, team: ExaminationTeamMember[], actor: ActorContext): Promise<ExaminationDetail | undefined>
  startFieldwork(id: string, actor: ActorContext): Promise<ExaminationDetail | undefined>
  setStatus(id: string, status: ExaminationStatus, actor: ActorContext, note?: string): Promise<ExaminationDetail | undefined>

  // Work programme (Spec §7.4)
  procedures(examinationId: string): Promise<ExaminationProcedure[]>
  getProcedure(id: string): Promise<ExaminationProcedure | undefined>
  startProcedure(id: string, actor: ActorContext): Promise<ExaminationProcedure | undefined>
  saveProcedureDraft(id: string, input: ProcedureResultInput, actor: ActorContext): Promise<ExaminationProcedure | undefined>
  submitProcedure(id: string, input: ProcedureResultInput, actor: ActorContext): Promise<ExaminationProcedure | undefined>
  returnProcedure(id: string, actor: ActorContext, comment: string): Promise<ExaminationProcedure | undefined>
  approveProcedure(id: string, actor: ActorContext, comment?: string): Promise<ExaminationProcedure | undefined>
  addSample(
    procedureId: string,
    sample: { label: string; population: string; outcome: 'Satisfactory' | 'Exception'; note?: string },
    actor: ActorContext,
  ): Promise<ExaminationProcedure | undefined>
  addProcedureComment(procedureId: string, text: string, actor: ActorContext): Promise<ExaminationProcedure | undefined>
  attachEvidence(procedureId: string, evidenceId: string, actor: ActorContext): Promise<ExaminationProcedure | undefined>
  raiseFindingFromProcedure(procedureId: string, input: RaiseFindingInput, actor: ActorContext): Promise<FindingDetail>

  // Information requests (Spec §7.2 step 5 / §7.3 tab 5)
  informationRequests(examinationId: string): Promise<InformationRequest[]>
  createInformationRequest(
    examinationId: string,
    input: { title: string; templateName?: string; documents: string[]; deadline: string; recipientNames: string[] },
    actor: ActorContext,
  ): Promise<InformationRequest | undefined>
  setRequestItemStatus(
    requestId: string,
    itemId: string,
    status: InformationRequest['items'][number]['status'],
    actor: ActorContext,
  ): Promise<InformationRequest | undefined>

  // Reports (Journey A step 10)
  reports(examinationId: string): Promise<ExaminationReport[]>
  submitReportForApproval(examinationId: string, reportId: string, actor: ActorContext): Promise<ExaminationReport | undefined>
  approveReport(examinationId: string, reportId: string, actor: ActorContext): Promise<ExaminationReport | undefined>
  refreshDraftReport(examinationId: string, actor: ActorContext): Promise<ExaminationReport | undefined>
}
