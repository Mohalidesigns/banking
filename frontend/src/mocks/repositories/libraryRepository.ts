/**
 * Mock examination library repository (Spec §7.5). Mutable template state:
 * draft → under review → approved → retired lifecycle, template edits and
 * version bumps. Only `Approved` programmes may be selected for a new
 * examination; existing examinations retain their selected version.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import { DOCUMENT_REQUEST_TEMPLATES, LIBRARY_PROGRAMMES } from '@/mocks/fixtures/library.fixture'
import type { ActorContext } from '@/types/common'
import type { InstitutionCategory } from '@/types/institution'
import type { ExaminationType } from '@/types/supervision'
import type { DocumentRequestTemplate, LibraryProgramme, TemplateStatus } from '@/types/examination'

const clone = (p: LibraryProgramme): LibraryProgramme => ({
  ...p,
  institutionCategories: [...p.institutionCategories],
  examinationTypes: [...p.examinationTypes],
  evidenceRequirements: [...p.evidenceRequirements],
  regulatoryMapping: p.regulatoryMapping.map((m) => ({ ...m })),
  procedures: p.procedures.map((pr) => ({ ...pr, steps: [...pr.steps], requiredEvidence: [...pr.requiredEvidence] })),
  versionHistory: p.versionHistory.map((v) => ({ ...v })),
})

const records: LibraryProgramme[] = LIBRARY_PROGRAMMES.map(clone)

const byId = (id: string): LibraryProgramme | undefined => records.find((p) => p.id === id)

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
  effectiveFrom: string
  ownerName: string
}

export const libraryRepository = {
  list(query: LibraryQuery = {}): LibraryProgramme[] {
    const search = query.search?.trim().toLowerCase()
    return records
      .filter((p) => !query.jurisdictionId || p.jurisdictionId === query.jurisdictionId)
      .filter((p) => !query.category || p.institutionCategories.includes(query.category))
      .filter((p) => !query.domain || p.domainName === query.domain)
      .filter((p) => !query.examinationType || p.examinationTypes.includes(query.examinationType))
      .filter((p) => !query.status || p.status === query.status)
      .filter((p) => !search || `${p.code} ${p.title} ${p.domainName} ${p.ownerName}`.toLowerCase().includes(search))
      .map(clone)
  },

  getById(id: string): LibraryProgramme | undefined {
    const p = byId(id)
    return p ? clone(p) : undefined
  },

  /** Approved programmes selectable for a new examination (Spec §7.5). */
  approved(options?: { category?: InstitutionCategory; domain?: string; examinationType?: ExaminationType }): LibraryProgramme[] {
    return records
      .filter((p) => p.status === 'Approved')
      .filter((p) => !options?.category || p.institutionCategories.includes(options.category))
      .filter((p) => !options?.domain || p.domainName === options.domain)
      .filter((p) => !options?.examinationType || p.examinationTypes.includes(options.examinationType))
      .map(clone)
  },

  domains(): string[] {
    return Array.from(new Set(records.map((p) => p.domainName))).sort()
  },

  documentRequestTemplates(): DocumentRequestTemplate[] {
    return DOCUMENT_REQUEST_TEMPLATES.map((t) => ({ ...t, documents: [...t.documents] }))
  },

  createDraft(input: LibraryTemplateInput): LibraryProgramme {
    const now = new Date().toISOString().slice(0, 10)
    const created: LibraryProgramme = {
      ...input,
      id: demoUuid(83, records.length + 1),
      version: 'v0.1',
      status: 'Draft',
      effectiveTo: undefined,
      procedures: [],
      versionHistory: [
        { version: 'v0.1', at: now, authorName: input.ownerName, changeNote: 'Initial draft created in prototype session.', status: 'Draft' },
      ],
    }
    records.unshift(created)
    return clone(created)
  },

  update(id: string, patch: Partial<Omit<LibraryProgramme, 'id' | 'versionHistory' | 'version' | 'status'>>, actor: ActorContext, changeNote: string): LibraryProgramme | undefined {
    const p = byId(id)
    if (!p) return undefined
    Object.assign(p, patch)
    p.versionHistory.unshift({
      version: `${p.version} (edited)`,
      at: new Date().toISOString().slice(0, 10),
      authorName: actor.actorName,
      changeNote,
      status: p.status,
    })
    return clone(p)
  },

  setStatus(id: string, status: TemplateStatus, actor: ActorContext, changeNote: string): LibraryProgramme | undefined {
    const p = byId(id)
    if (!p) return undefined
    p.status = status
    if (status === 'Retired') p.effectiveTo = new Date().toISOString().slice(0, 10)
    p.versionHistory.unshift({
      version: p.version,
      at: new Date().toISOString().slice(0, 10),
      authorName: actor.actorName,
      changeNote,
      status,
    })
    return clone(p)
  },

  reset(): void {
    records.length = 0
    LIBRARY_PROGRAMMES.map(clone).forEach((p) => records.push(p))
  },
}
