import { libraryRepository } from '@/mocks/repositories/libraryRepository'
import type { ActorContext } from '@/types/common'
import type { InstitutionCategory } from '@/types/institution'
import type { ExaminationType } from '@/types/supervision'
import type { DocumentRequestTemplate, LibraryProgramme } from '@/types/examination'
import type {
  LibraryQuery,
  LibraryService,
  LibraryTemplateInput,
} from '@/services/contracts/LibraryService'
import { assertCan } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock examination library service (Spec §7.5). Reads are open to every
 * signed-in demo role; template maintenance requires `manage-library`, and
 * approval/retirement additionally requires the profile's `approve`
 * capability (methodology-committee stand-in in the prototype).
 */
class MockLibraryService implements LibraryService {
  async list(query: LibraryQuery = {}): Promise<LibraryProgramme[]> {
    await latency()
    return libraryRepository.list(query)
  }

  async getById(id: string): Promise<LibraryProgramme | undefined> {
    await latency()
    return libraryRepository.getById(id)
  }

  async approvedFor(options?: {
    category?: InstitutionCategory
    domain?: string
    examinationType?: ExaminationType
  }): Promise<LibraryProgramme[]> {
    await latency()
    return libraryRepository.approved(options)
  }

  async domains(): Promise<string[]> {
    await latency()
    return libraryRepository.domains()
  }

  async documentRequestTemplates(): Promise<DocumentRequestTemplate[]> {
    await latency()
    return libraryRepository.documentRequestTemplates()
  }

  async createDraft(input: LibraryTemplateInput, actor: ActorContext): Promise<LibraryProgramme> {
    assertCan(actor, 'manage-library')
    await latency()
    return libraryRepository.createDraft(input)
  }

  async update(
    id: string,
    patch: Partial<Omit<LibraryProgramme, 'id' | 'versionHistory' | 'version' | 'status'>>,
    changeNote: string,
    actor: ActorContext,
  ): Promise<LibraryProgramme | undefined> {
    assertCan(actor, 'manage-library')
    await latency()
    return libraryRepository.update(id, patch, actor, changeNote)
  }

  async submitForReview(id: string, actor: ActorContext): Promise<LibraryProgramme | undefined> {
    assertCan(actor, 'manage-library')
    await latency()
    return libraryRepository.setStatus(id, 'Under Review', actor, 'Submitted for methodology committee review (prototype session).')
  }

  async approve(id: string, actor: ActorContext, note?: string): Promise<LibraryProgramme | undefined> {
    assertCan(actor, 'manage-library')
    assertCan(actor, 'approve')
    await latency()
    return libraryRepository.setStatus(id, 'Approved', actor, note ?? 'Approved for use in new examinations (prototype session).')
  }

  async retire(id: string, actor: ActorContext, note?: string): Promise<LibraryProgramme | undefined> {
    assertCan(actor, 'manage-library')
    assertCan(actor, 'approve')
    await latency()
    return libraryRepository.setStatus(id, 'Retired', actor, note ?? 'Retired — existing examinations keep their selected version (prototype session).')
  }
}

export const libraryService: LibraryService = new MockLibraryService()
