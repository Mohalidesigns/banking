import type { ActorContext } from '@/types/common'
import type {
  ConfidentialityClassification,
  EvidenceItem,
  EvidenceReviewStatus,
} from '@/types/examination'

/**
 * Evidence repository contract (Spec §7.6, §18.3). Upload is simulated —
 * the prototype stores metadata only, never real files, and integrity
 * hashes are placeholders. Review decisions are gated by the
 * `review-evidence` demo action; uploads by `upload-evidence`.
 */
export interface EvidenceQuery {
  institutionId?: string
  examinationId?: string
  procedureId?: string
  findingId?: string
  domain?: string
  category?: string
  confidentiality?: ConfidentialityClassification | ''
  reviewStatus?: EvidenceReviewStatus | ''
  search?: string
}

export interface EvidenceUploadInput {
  title: string
  fileName: string
  mimeType: string
  sizeKb: number
  institutionId: string
  examinationId?: string
  examinationRef?: string
  procedureId?: string
  findingId?: string
  domainName: string
  category: string
  confidentiality: ConfidentialityClassification
  sourceDescription: string
}

export interface EvidenceService {
  list(query?: EvidenceQuery): Promise<EvidenceItem[]>
  getById(id: string): Promise<EvidenceItem | undefined>
  byExamination(examinationId: string): Promise<EvidenceItem[]>
  byProcedure(procedureId: string): Promise<EvidenceItem[]>
  byFinding(findingId: string): Promise<EvidenceItem[]>
  pendingReviewCount(): Promise<number>
  /** Simulated upload (metadata only — prototype honesty, Spec §1.1). */
  upload(input: EvidenceUploadInput, actor: ActorContext): Promise<EvidenceItem>
  linkToProcedure(evidenceId: string, procedureId: string, actor: ActorContext): Promise<EvidenceItem | undefined>
  linkToFinding(evidenceId: string, findingRef: string, findingId: string | undefined, actor: ActorContext): Promise<EvidenceItem | undefined>
  markReviewed(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined>
  markRejected(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined>
  addVersion(evidenceId: string, note: string, actor: ActorContext): Promise<EvidenceItem | undefined>
  recordAccess(evidenceId: string, action: EvidenceItem['accessHistory'][number]['action'], actor: ActorContext): Promise<void>
}
