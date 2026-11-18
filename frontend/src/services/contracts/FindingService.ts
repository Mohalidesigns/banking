import type { ActorContext } from '@/types/common'
import type {
  FindingDetail,
  ManagementResponse,
  RaiseFindingInput,
} from '@/types/finding'

/**
 * Supervisory findings contract (Spec §7.7, §18.3). Workflow: raise →
 * submit for review → return for rework / approve → escalate → close, with
 * management responses recorded from the institution side. Role gating
 * (Spec §19): examiners may raise and submit but never approve
 * (`approve-finding` is reserved for team lead and above); approvals throw
 * DemoPermissionError otherwise.
 */
export interface FindingQuery {
  institutionId?: string
  examinationId?: string
  domain?: string
  severity?: string
  status?: string
  breachClassification?: string
  /** 'open' hides Closed findings (Command Centre deep-link). */
  view?: 'open' | 'all'
  search?: string
}

export interface FindingService {
  list(query?: FindingQuery): Promise<FindingDetail[]>
  getById(id: string): Promise<FindingDetail | undefined>
  getByReference(reference: string): Promise<FindingDetail | undefined>
  awaitingReviewCount(): Promise<number>
  raise(input: RaiseFindingInput, actor: ActorContext): Promise<FindingDetail>
  submitForReview(id: string, actor: ActorContext, comment?: string): Promise<FindingDetail | undefined>
  returnForRework(id: string, actor: ActorContext, comment: string): Promise<FindingDetail | undefined>
  approve(id: string, actor: ActorContext, comment?: string): Promise<FindingDetail | undefined>
  escalate(id: string, actor: ActorContext, comment: string): Promise<FindingDetail | undefined>
  close(id: string, actor: ActorContext, rationale: string): Promise<FindingDetail | undefined>
  addManagementResponse(
    id: string,
    input: Omit<ManagementResponse, 'id' | 'findingId'>,
    actor: ActorContext,
  ): Promise<FindingDetail | undefined>
}
