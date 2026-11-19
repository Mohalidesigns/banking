/**
 * Mock regulatory administration repository (Spec §10.1–§10.3, §17.4).
 * Mutable prototype-session state over the regulatory fixtures: simulated
 * framework upload with an optional Demo AI extraction pass, requirement
 * approval/rejection, version publishing, obligation applicability and
 * review mutations, and the correspondence compose → review → approve →
 * send-demo lifecycle. Nothing is persisted beyond the session and no real
 * communication is ever sent (prototype honesty, Spec §1.1/§10.3).
 */
import { demoUuid, isoDay } from '@/mocks/fixtures/demoIds'
import {
  REGULATORY_CORRESPONDENCE,
  REGULATORY_FRAMEWORKS,
  REGULATORY_OBLIGATIONS,
  REGULATORY_REQUIREMENTS,
  relationFromRef,
} from '@/mocks/fixtures/regulatory.fixture'
import {
  CORRECTIVE_ACTIONS,
  EARLY_WARNING_ALERTS,
  EXAMINATIONS,
  FINDINGS,
  RETURN_SUBMISSIONS,
} from '@/mocks/fixtures/supervision.fixture'
import type {
  FrameworkDocumentConfidentiality,
  FrameworkMapping,
  ObligationCompliance,
  RegulatoryCorrespondence,
  RegulatoryFramework,
  RegulatoryObligation,
  RegulatoryRequirement,
  SupervisoryDomain,
  UploadFrameworkInput,
} from '@/types/regulatory'

const cloneMapping = (m: FrameworkMapping): FrameworkMapping => ({ ...m })

const cloneFramework = (f: RegulatoryFramework): RegulatoryFramework => ({
  ...f,
  applicableCategories: [...f.applicableCategories],
  domains: [...f.domains],
  sourceDocuments: f.sourceDocuments.map((d) => ({ ...d })),
  versions: f.versions.map((v) => ({ ...v })),
  mappings: f.mappings.map(cloneMapping),
})

const cloneRequirement = (r: RegulatoryRequirement): RegulatoryRequirement => ({
  ...r,
  institutionCategories: [...r.institutionCategories],
  evidenceExpected: [...r.evidenceExpected],
  mappedProcedureRefs: [...r.mappedProcedureRefs],
  relatedObligationRefs: [...r.relatedObligationRefs],
  storyAnchors: r.storyAnchors.map(cloneMapping),
})

const cloneObligation = (o: RegulatoryObligation): RegulatoryObligation => ({
  ...o,
  requirementRefs: [...o.requirementRefs],
  applicableInstitutionIds: [...o.applicableInstitutionIds],
  institutionStatus: o.institutionStatus.map((s) => ({ ...s, anchors: s.anchors.map(cloneMapping) })),
  changeHistory: o.changeHistory.map((h) => ({ ...h })),
})

const cloneCorrespondence = (c: RegulatoryCorrespondence): RegulatoryCorrespondence => ({
  ...c,
  attachments: c.attachments.map((a) => ({ ...a })),
  relations: c.relations.map(cloneMapping),
  thread: c.thread.map((t) => ({ ...t })),
})

const frameworks: RegulatoryFramework[] = REGULATORY_FRAMEWORKS.map(cloneFramework)
const requirements: RegulatoryRequirement[] = REGULATORY_REQUIREMENTS.map(cloneRequirement)
const obligations: RegulatoryObligation[] = REGULATORY_OBLIGATIONS.map(cloneObligation)
const correspondence: RegulatoryCorrespondence[] = REGULATORY_CORRESPONDENCE.map(cloneCorrespondence)

let frameworkSeq = 100
let requirementSeq = 500
let entitySeq = 9000
let correspondenceRefSeq = REGULATORY_CORRESPONDENCE.length

const nextId = (namespace: number): string => {
  entitySeq += 1
  return demoUuid(namespace, entitySeq)
}

const ATTACHMENT_NOTE = 'Simulated attachment — the prototype stores no real file (Spec §17.4).'

// ---------------------------------------------------------------------------
// Simulated AI extraction (Spec §10.1 — "Framework upload and AI extraction
// are simulated"; drafts must be clearly distinguishable from approved text)
// ---------------------------------------------------------------------------

const AI_NOTE =
  'Demo AI response — machine-extracted draft from the simulated document upload. Not approved regulatory content until reviewed (Spec §10.1).'

const AI_EXTRACTION_POOL: Array<{
  reference: string
  title: string
  text: string
  domain: SupervisoryDomain
  evidence: string[]
}> = [
  {
    reference: '§A.1 (draft)',
    title: 'Governance and accountability [AI-extracted draft]',
    text: 'Draft: the document appears to require a named accountable executive and a documented governance framework with periodic board reporting. (Machine-extracted summary — wording is indicative only, demo.)',
    domain: 'governance',
    evidence: ['Governance framework document', 'Board reporting pack samples'],
  },
  {
    reference: '§A.2 (draft)',
    title: 'Record-keeping and reporting [AI-extracted draft]',
    text: 'Draft: extracted clauses suggest record retention for a minimum period and periodic reporting to the Authority, with thresholds to be confirmed during consultation. (Machine-extracted summary — demo.)',
    domain: 'operations',
    evidence: ['Retention policy', 'Reporting calendar extract'],
  },
  {
    reference: '§A.3 (draft)',
    title: 'Risk management and controls [AI-extracted draft]',
    text: 'Draft: the source text refers to risk management obligations, control testing and escalation of material weaknesses; classification and calibration require analyst review. (Machine-extracted summary — demo.)',
    domain: 'erm',
    evidence: ['Risk register extract', 'Control testing results'],
  },
]

function simulateAiExtraction(frameworkId: string, documentName: string): RegulatoryRequirement[] {
  return AI_EXTRACTION_POOL.map((seed) => {
    requirementSeq += 1
    return {
      id: demoUuid(92, requirementSeq),
      frameworkId,
      reference: seed.reference,
      title: seed.title,
      text: seed.text,
      legalSource: `Extracted from ${documentName} (simulated upload)`,
      effectiveFrom: isoDay(0),
      status: 'AI-Extracted Draft' as const,
      institutionCategories: [],
      domain: seed.domain,
      evidenceExpected: seed.evidence,
      mappedProcedureRefs: [],
      relatedObligationRefs: [],
      storyAnchors: [],
      extractionNote: AI_NOTE,
    }
  })
}

/** Relation candidates for the compose form: this institution's live story
 *  anchors (examinations, findings, submissions, alerts, CAPs) plus the
 *  obligations that apply to it. */
function relationCandidatesFor(institutionId?: string): Array<{
  kind: FrameworkMapping['kind']
  ref: string
  label: string
}> {
  const out: Array<{ kind: FrameworkMapping['kind']; ref: string; label: string }> = []
  for (const e of EXAMINATIONS) {
    if (!institutionId || e.institutionId === institutionId) {
      out.push({ kind: 'examination', ref: e.reference, label: `${e.reference} — ${e.type} examination` })
    }
  }
  for (const f of FINDINGS) {
    if (!institutionId || f.institutionId === institutionId) {
      out.push({ kind: 'finding', ref: f.reference, label: `${f.reference} — ${f.title}` })
    }
  }
  for (const s of RETURN_SUBMISSIONS) {
    if (!institutionId || s.institutionId === institutionId) {
      out.push({ kind: 'return-submission', ref: s.reference, label: `${s.reference} — ${s.returnCode} ${s.period}` })
    }
  }
  for (const a of EARLY_WARNING_ALERTS) {
    if (a.reference && (!institutionId || a.institutionId === institutionId)) {
      out.push({ kind: 'alert', ref: a.reference, label: `${a.reference} — ${a.indicator} alert` })
    }
  }
  for (const c of CORRECTIVE_ACTIONS) {
    if (!institutionId || c.institutionId === institutionId) {
      out.push({ kind: 'corrective-action', ref: c.reference, label: `${c.reference} — ${c.title}` })
    }
  }
  for (const o of obligations) {
    if (!institutionId || o.applicableInstitutionIds.includes(institutionId)) {
      out.push({ kind: 'obligation', ref: o.reference, label: `${o.reference} — ${o.title}` })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const regulatoryRepository = {
  // Frameworks ---------------------------------------------------------------
  listFrameworks(): RegulatoryFramework[] {
    return frameworks.map(cloneFramework)
  },

  getFramework(codeOrId: string): RegulatoryFramework | undefined {
    const f = frameworks.find((x) => x.id === codeOrId) ?? frameworks.find((x) => x.code === codeOrId)
    return f ? cloneFramework(f) : undefined
  },

  frameworkExists(code: string): boolean {
    return frameworks.some((f) => f.code.toLowerCase() === code.trim().toLowerCase())
  },

  listRequirements(frameworkId?: string): RegulatoryRequirement[] {
    return requirements.filter((r) => !frameworkId || r.frameworkId === frameworkId).map(cloneRequirement)
  },

  getRequirement(id: string): RegulatoryRequirement | undefined {
    const r = requirements.find((x) => x.id === id)
    return r ? cloneRequirement(r) : undefined
  },

  getRequirementByRef(frameworkId: string, reference: string): RegulatoryRequirement | undefined {
    const r = requirements.find((x) => x.frameworkId === frameworkId && x.reference === reference)
    return r ? cloneRequirement(r) : undefined
  },

  /** Simulated framework upload (Spec §10.1). Returns undefined on a duplicate code. */
  createFramework(input: UploadFrameworkInput, actorName: string): RegulatoryFramework | undefined {
    if (this.frameworkExists(input.code)) return undefined
    frameworkSeq += 1
    const now = new Date().toISOString()
    const created: RegulatoryFramework = {
      id: demoUuid(91, frameworkSeq),
      code: input.code.trim(),
      name: input.name.trim(),
      category: input.category,
      jurisdictionCode: 'MBA',
      jurisdictionName: 'Meridia Banking Authority',
      issuingAuthority: input.issuingAuthority.trim(),
      version: input.version.trim(),
      publishedDate: now.slice(0, 10),
      effectiveDate: input.effectiveDate,
      status: 'Draft',
      description: input.description.trim(),
      applicableCategories: [...input.applicableCategories],
      domains: [],
      sourceDocuments: [
        {
          id: nextId(95),
          name: input.documentName.trim(),
          version: input.version.trim(),
          uploadedAt: now,
          uploadedByName: actorName,
          sizeKb: 1024,
          confidentiality: 'Internal',
          storageNote: ATTACHMENT_NOTE,
        },
      ],
      versions: [
        {
          version: input.version.trim(),
          effectiveFrom: now.slice(0, 10),
          changeSummary: `Simulated prototype upload (Demo AI extraction ${input.runAiExtraction ? 'run' : 'skipped'}).`,
        },
      ],
      mappings: [],
      ownerName: actorName,
      lastReviewedAt: now.slice(0, 10),
    }
    frameworks.unshift(created)
    if (input.runAiExtraction) {
      requirements.unshift(...simulateAiExtraction(created.id, input.documentName))
    }
    return cloneFramework(created)
  },

  approveRequirement(id: string, note: string, actorName: string): RegulatoryRequirement | undefined {
    const r = requirements.find((x) => x.id === id)
    if (!r) return undefined
    r.status = 'Approved'
    r.approvedAt = new Date().toISOString()
    r.approvedByName = actorName
    r.extractionNote = r.extractionNote
      ? `${r.extractionNote} Reviewed and approved in the prototype session by ${actorName}${note ? ` — "${note}"` : ''}.`
      : `Approved in the prototype session by ${actorName}${note ? ` — "${note}"` : ''}.`
    return cloneRequirement(r)
  },

  rejectRequirement(id: string, note: string, actorName: string): RegulatoryRequirement | undefined {
    const r = requirements.find((x) => x.id === id)
    if (!r) return undefined
    r.status = 'Rejected'
    r.extractionNote = `Demo AI response rejected in the prototype session by ${actorName}${note ? ` — "${note}"` : ''}. Not regulatory content.`
    return cloneRequirement(r)
  },

  publishVersion(
    frameworkId: string,
    version: string,
    changeSummary: string,
    actorName: string,
  ): RegulatoryFramework | undefined {
    const f = frameworks.find((x) => x.id === frameworkId)
    if (!f) return undefined
    const now = new Date().toISOString()
    f.versions.push({
      version: version.trim(),
      effectiveFrom: now.slice(0, 10),
      changeSummary: changeSummary.trim(),
      approvedByName: actorName,
      approvedAt: now,
    })
    f.version = version.trim()
    f.lastReviewedAt = now.slice(0, 10)
    return cloneFramework(f)
  },

  // Obligations ----------------------------------------------------------------
  listObligations(): RegulatoryObligation[] {
    return obligations.map(cloneObligation)
  },

  getObligation(refOrId: string): RegulatoryObligation | undefined {
    const o = obligations.find((x) => x.id === refOrId) ?? obligations.find((x) => x.reference === refOrId)
    return o ? cloneObligation(o) : undefined
  },

  updateObligationApplicability(
    id: string,
    addIds: string[],
    removeIds: string[],
    reason: string,
    actorName: string,
  ): RegulatoryObligation | undefined {
    const o = obligations.find((x) => x.id === id)
    if (!o) return undefined
    const now = new Date().toISOString()
    for (const add of addIds) {
      if (!o.applicableInstitutionIds.includes(add)) {
        o.applicableInstitutionIds.push(add)
        o.institutionStatus.push({ institutionId: add, status: 'Not Assessed', anchors: [] })
      }
    }
    for (const remove of removeIds) {
      o.applicableInstitutionIds = o.applicableInstitutionIds.filter((x) => x !== remove)
      o.institutionStatus = o.institutionStatus.filter((s) => s.institutionId !== remove)
    }
    o.changeHistory.push({
      id: nextId(96),
      at: now,
      byName: actorName,
      change: `Applicability updated: +${addIds.length} / −${removeIds.length} institution(s).`,
      reason: reason.trim(),
    })
    return cloneObligation(o)
  },

  setInstitutionCompliance(
    id: string,
    institutionId: string,
    status: ObligationCompliance,
    note: string,
    actorName: string,
  ): RegulatoryObligation | undefined {
    const o = obligations.find((x) => x.id === id)
    if (!o) return undefined
    const row = o.institutionStatus.find((s) => s.institutionId === institutionId)
    if (!row) return undefined
    const now = new Date().toISOString()
    const previous = row.status
    row.status = status
    row.lastVerifiedAt = now.slice(0, 10)
    if (note.trim()) row.note = note.trim()
    o.changeHistory.push({
      id: nextId(96),
      at: now,
      byName: actorName,
      change: `Compliance status ${previous} → ${status}.`,
      reason: note.trim() || 'Supervisory review (demo).',
    })
    return cloneObligation(o)
  },

  recordObligationReview(
    id: string,
    nextReviewDate: string | undefined,
    note: string,
    actorName: string,
  ): RegulatoryObligation | undefined {
    const o = obligations.find((x) => x.id === id)
    if (!o) return undefined
    const now = new Date().toISOString()
    o.lastReviewDate = now.slice(0, 10)
    o.nextReviewDate = nextReviewDate?.trim() || isoDay(90)
    o.changeHistory.push({
      id: nextId(96),
      at: now,
      byName: actorName,
      change: `Obligation reviewed; next review ${o.nextReviewDate}.`,
      reason: note.trim() || 'Scheduled review (demo).',
    })
    return cloneObligation(o)
  },

  // Correspondence ----------------------------------------------------------------
  listCorrespondence(): RegulatoryCorrespondence[] {
    return correspondence.map(cloneCorrespondence)
  },

  getCorrespondence(refOrId: string): RegulatoryCorrespondence | undefined {
    const c =
      correspondence.find((x) => x.id === refOrId) ?? correspondence.find((x) => x.reference === refOrId)
    return c ? cloneCorrespondence(c) : undefined
  },

  createCorrespondence(
    input: {
      institutionId: string
      type: RegulatoryCorrespondence['type']
      direction: RegulatoryCorrespondence['direction']
      subject: string
      body: string
      responseDueDate?: string
      relationRefs: string[]
      attachments: Array<{ fileName: string; sizeKb: number; confidentiality: FrameworkDocumentConfidentiality }>
    },
    relationLabels: Record<string, string>,
    actorName: string,
    actorRoleLabel: string,
  ): RegulatoryCorrespondence {
    correspondenceRefSeq += 1
    const now = new Date().toISOString()
    const created: RegulatoryCorrespondence = {
      id: demoUuid(94, 100 + correspondenceRefSeq),
      reference: `COR-2026-${String(correspondenceRefSeq).padStart(3, '0')}`,
      institutionId: input.institutionId,
      type: input.type,
      direction: input.direction,
      subject: input.subject.trim(),
      body: input.body.trim(),
      date: now.slice(0, 10),
      senderName: actorName,
      senderRole: actorRoleLabel,
      recipientName: 'Institution contact of record (demo)',
      recipientRole: 'Authorised institution representative',
      status: 'Draft',
      responseDueDate: input.responseDueDate?.trim() || undefined,
      attachments: input.attachments.map((a, i) => ({
        id: demoUuid(96, 300 + correspondenceRefSeq * 10 + i),
        fileName: a.fileName.trim(),
        sizeKb: a.sizeKb,
        confidentiality: a.confidentiality,
        storageNote: ATTACHMENT_NOTE,
      })),
      relations: input.relationRefs.map((ref) => relationFromRef(ref, relationLabels[ref] ?? ref)),
      thread: [
        {
          id: nextId(96),
          at: now,
          byName: actorName,
          action: 'Draft composed',
          note: 'Created in the prototype session (demo).',
        },
      ],
    }
    correspondence.unshift(created)
    return cloneCorrespondence(created)
  },

  updateCorrespondenceDraft(
    id: string,
    patch: { subject?: string; body?: string; responseDueDate?: string },
    actorName: string,
  ): RegulatoryCorrespondence | undefined {
    const c = correspondence.find((x) => x.id === id)
    if (!c || (c.status !== 'Draft' && c.status !== 'Changes Requested')) return undefined
    if (patch.subject !== undefined) c.subject = patch.subject.trim()
    if (patch.body !== undefined) c.body = patch.body.trim()
    if (patch.responseDueDate !== undefined) c.responseDueDate = patch.responseDueDate.trim() || undefined
    c.thread.push({ id: nextId(96), at: new Date().toISOString(), byName: actorName, action: 'Draft edited' })
    return cloneCorrespondence(c)
  },

  /** Append a lifecycle event and move status (workflow order enforced by the service). */
  transitionCorrespondence(
    id: string,
    status: RegulatoryCorrespondence['status'],
    action: string,
    byName: string,
    note?: string,
    authorisedBy?: { name: string },
  ): RegulatoryCorrespondence | undefined {
    const c = correspondence.find((x) => x.id === id)
    if (!c) return undefined
    const now = new Date().toISOString()
    c.status = status
    if (authorisedBy) {
      c.authorisedByName = authorisedBy.name
      c.authorisedAt = now
    }
    if (status === 'Sent' || status === 'Received') {
      c.date = now.slice(0, 10)
    }
    c.thread.push({ id: nextId(96), at: now, byName, action, note })
    return cloneCorrespondence(c)
  },

  relationCandidates(institutionId?: string): ReturnType<typeof relationCandidatesFor> {
    return relationCandidatesFor(institutionId)
  },

  reset(): void {
    frameworks.length = 0
    REGULATORY_FRAMEWORKS.map(cloneFramework).forEach((f) => frameworks.push(f))
    requirements.length = 0
    REGULATORY_REQUIREMENTS.map(cloneRequirement).forEach((r) => requirements.push(r))
    obligations.length = 0
    REGULATORY_OBLIGATIONS.map(cloneObligation).forEach((o) => obligations.push(o))
    correspondence.length = 0
    REGULATORY_CORRESPONDENCE.map(cloneCorrespondence).forEach((c) => correspondence.push(c))
    frameworkSeq = 100
    requirementSeq = 500
    entitySeq = 9000
    correspondenceRefSeq = REGULATORY_CORRESPONDENCE.length
  },
}
