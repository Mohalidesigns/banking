import type { ActorContext } from '@/types/common'
import type { InstitutionCategory } from '@/types/institution'
import type { ExaminationType } from '@/types/supervision'
import type {
  DocumentRequestTemplate,
  LibraryProgramme,
  TemplateStatus,
} from '@/types/examination'

/**
 * Examination library contract (Spec §7.5, §18.3). Hierarchy facets,
 * template CRUD with the draft → under review → approved → retired
 * lifecycle, and the rule that only approved versions are selectable for a
 * new examination. Mutations are gated by the `manage-library` demo action.
 */
export interface LibraryQuery {
  jurisdictionId?: string
  category?: InstitutionCategory | ''
  domain?: string
  examinationType?: ExaminationType | ''
  status?: TemplateStatus | ''
  search?: string
}

export interface LibraryTemplateInput {
  code: string
  title: string
  jurisdictionId: string
  institutionCategories: InstitutionCategory[]
  domainName: string
  examinationTypes: ExaminationType[]
  objectives: string
  scopeGuidance: string
  evidenceRequirements: string[]
  testingMethodology: string
  scoringGuidance: string
  regulatoryMapping: { reference: string; title: string }[]
  /** ISO 8601 */
  effectiveFrom: string
  ownerName: string
}

export interface LibraryService {
  list(query?: LibraryQuery): Promise<LibraryProgramme[]>
  getById(id: string): Promise<LibraryProgramme | undefined>
  /** Approved templates selectable in the create-examination wizard. */
  approvedFor(options?: {
    category?: InstitutionCategory
    domain?: string
    examinationType?: ExaminationType
  }): Promise<LibraryProgramme[]>
  domains(): Promise<string[]>
  documentRequestTemplates(): Promise<DocumentRequestTemplate[]>
  createDraft(input: LibraryTemplateInput, actor: ActorContext): Promise<LibraryProgramme>
  update(
    id: string,
    patch: Partial<Omit<LibraryProgramme, 'id' | 'versionHistory' | 'version' | 'status'>>,
    changeNote: string,
    actor: ActorContext,
  ): Promise<LibraryProgramme | undefined>
  submitForReview(id: string, actor: ActorContext): Promise<LibraryProgramme | undefined>
  approve(id: string, actor: ActorContext, note?: string): Promise<LibraryProgramme | undefined>
  retire(id: string, actor: ActorContext, note?: string): Promise<LibraryProgramme | undefined>
}
