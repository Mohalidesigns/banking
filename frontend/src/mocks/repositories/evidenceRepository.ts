/**
 * Mock evidence repository (Spec §7.6, §17.4). Mutable prototype-session
 * state over the evidence fixture: upload (simulated — nothing is really
 * stored), link to procedures/findings, reviewer notes, review decisions,
 * version history and access history. Integrity hashes are placeholders.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import { EVIDENCE_ITEMS } from '@/mocks/fixtures/evidence.fixture'
import type { EvidenceItem, EvidenceReviewStatus } from '@/types/examination'

const clone = (e: EvidenceItem): EvidenceItem => ({
  ...e,
  linkedProcedureIds: [...e.linkedProcedureIds],
  linkedFindingRefs: [...e.linkedFindingRefs],
  versionHistory: e.versionHistory.map((v) => ({ ...v })),
  accessHistory: e.accessHistory.map((a) => ({ ...a })),
})

const records: EvidenceItem[] = EVIDENCE_ITEMS.map(clone)

let refSeq = 200

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
  confidentiality: EvidenceItem['confidentiality']
  uploadedByName: string
  sourceDescription: string
}

const byId = (id: string): EvidenceItem | undefined => records.find((e) => e.id === id)

export const evidenceRepository = {
  list(): EvidenceItem[] {
    return records.map(clone)
  },

  getById(id: string): EvidenceItem | undefined {
    const e = byId(id)
    return e ? clone(e) : undefined
  },

  getByReference(reference: string): EvidenceItem | undefined {
    const e = records.find((x) => x.reference === reference)
    return e ? clone(e) : undefined
  },

  byExamination(examinationId: string): EvidenceItem[] {
    return records.filter((e) => e.examinationId === examinationId).map(clone)
  },

  byProcedure(procedureId: string): EvidenceItem[] {
    return records.filter((e) => e.procedureId === procedureId || e.linkedProcedureIds.includes(procedureId)).map(clone)
  },

  byFinding(findingId: string): EvidenceItem[] {
    return records.filter((e) => e.findingId === findingId).map(clone)
  },

  byInstitution(institutionId: string): EvidenceItem[] {
    return records.filter((e) => e.institutionId === institutionId).map(clone)
  },

  pendingReview(): EvidenceItem[] {
    return records.filter((e) => e.reviewStatus === 'Pending Review')
  },

  /** Simulated upload (Spec §7.6 "upload demo file") — metadata only. */
  upload(input: EvidenceUploadInput): EvidenceItem {
    refSeq += 1
    const now = new Date().toISOString()
    const created: EvidenceItem = {
      id: demoUuid(82, refSeq + records.length + 1),
      reference: `EV-2026-${refSeq}`,
      ...input,
      uploadedAt: now,
      version: 1,
      reviewStatus: 'Pending Review',
      collectedAt: now.slice(0, 10),
      integrityHash: `sha256-demo:${Math.random().toString(16).slice(2, 18)}… (placeholder — prototype stores no real file)`,
      linkedProcedureIds: input.procedureId ? [input.procedureId] : [],
      linkedFindingRefs: [],
      versionHistory: [{ version: 1, at: now, uploadedByName: input.uploadedByName, note: 'Initial upload (demo)' }],
      accessHistory: [{ at: now, byName: input.uploadedByName, action: 'Viewed' }],
    }
    records.unshift(created)
    return clone(created)
  },

  linkProcedure(id: string, procedureId: string): EvidenceItem | undefined {
    const e = byId(id)
    if (!e) return undefined
    if (!e.linkedProcedureIds.includes(procedureId)) {
      e.linkedProcedureIds.push(procedureId)
      e.procedureId = e.procedureId ?? procedureId
    }
    return clone(e)
  },

  linkFinding(id: string, findingRef: string, findingId?: string): EvidenceItem | undefined {
    const e = byId(id)
    if (!e) return undefined
    if (!e.linkedFindingRefs.includes(findingRef)) e.linkedFindingRefs.push(findingRef)
    if (findingId && !e.findingId) e.findingId = findingId
    return clone(e)
  },

  setReviewStatus(
    id: string,
    status: Exclude<EvidenceReviewStatus, 'Pending Review'>,
    reviewerName: string,
    note: string,
  ): EvidenceItem | undefined {
    const e = byId(id)
    if (!e) return undefined
    e.reviewStatus = status
    e.reviewerName = reviewerName
    e.reviewerNote = note
    e.accessHistory.push({ at: new Date().toISOString(), byName: reviewerName, action: 'Reviewed' })
    return clone(e)
  },

  /** Simulated re-upload: bumps version and returns to pending review. */
  addVersion(id: string, uploadedByName: string, note: string): EvidenceItem | undefined {
    const e = byId(id)
    if (!e) return undefined
    e.version += 1
    e.reviewStatus = 'Pending Review'
    e.reviewerName = undefined
    e.reviewerNote = undefined
    const now = new Date().toISOString()
    e.versionHistory.push({ version: e.version, at: now, uploadedByName, note })
    return clone(e)
  },

  recordAccess(id: string, byName: string, action: EvidenceItem['accessHistory'][number]['action']): void {
    const e = byId(id)
    if (e) e.accessHistory.push({ at: new Date().toISOString(), byName, action })
  },

  reset(): void {
    records.length = 0
    EVIDENCE_ITEMS.map(clone).forEach((e) => records.push(e))
    refSeq = 200
  },
}
