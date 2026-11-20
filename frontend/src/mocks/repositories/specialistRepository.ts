/**
 * Specialist domain repository (Spec §9, Phase 4B). Mutable prototype-session
 * state over the specialist fixtures with the assessment/checklist/evidence/
 * report workflow mutations the shared §9 page pattern needs. Components
 * never touch this directly — `MockSpecialistService` is the only consumer
 * (Spec §18.3). `reset()` restores the seeded dataset for the central
 * Reset Demo Data action (Spec §17.4).
 */
import { demoUuid, isoDay } from '@/mocks/fixtures/demoIds'
import {
  SPECIALIST_ASSESSMENTS,
  SPECIALIST_CHECKLIST,
  SPECIALIST_DOMAINS,
  SPECIALIST_EVIDENCE,
  STORAGE_NOTE,
  maturityFor,
  type SpecialistDomainSpec,
} from '@/mocks/fixtures/specialist.fixture'
import type { SupervisoryDomain } from '@/types/regulatory'
import type {
  ChecklistItemStatus,
  CreateSpecialistAssessmentInput,
  RecordChecklistResultInput,
  RequestEvidenceInput,
  SpecialistAssessment,
  SpecialistChecklistItem,
  SpecialistConclusion,
  SpecialistEvidenceItem,
  SpecialistQuery,
  SpecialistReportStatus,
} from '@/types/specialist'

const clone = <T,>(v: T): T => structuredClone(v)

let idSeq = 500

const CONCLUDED: ChecklistItemStatus[] = ['Satisfactory', 'Deficient', 'Not Applicable']

const REPORT_FLOW: Partial<Record<SpecialistReportStatus, SpecialistReportStatus[]>> = {
  'Not Started': ['Draft'],
  Draft: ['In Review'],
  'In Review': ['Draft', 'Issued (demo)'],
}

class SpecialistRepository {
  private assessments: SpecialistAssessment[] = clone(SPECIALIST_ASSESSMENTS)
  private checklist: SpecialistChecklistItem[] = clone(SPECIALIST_CHECKLIST)
  private evidence: SpecialistEvidenceItem[] = clone(SPECIALIST_EVIDENCE)

  reset(): void {
    this.assessments = clone(SPECIALIST_ASSESSMENTS)
    this.checklist = clone(SPECIALIST_CHECKLIST)
    this.evidence = clone(SPECIALIST_EVIDENCE)
    idSeq = 500
  }

  domainSpec(domain: SupervisoryDomain): SpecialistDomainSpec | undefined {
    return SPECIALIST_DOMAINS[domain]
  }

  configuredDomains(): SpecialistDomainSpec[] {
    return Object.values(SPECIALIST_DOMAINS)
  }

  listAssessments(query: SpecialistQuery = {}): SpecialistAssessment[] {
    const search = query.search?.trim().toLowerCase()
    return this.assessments
      .filter((a) => !query.domain || a.domain === query.domain)
      .filter((a) => !query.institutionId || a.institutionId === query.institutionId)
      .filter((a) => !query.status || a.status === query.status)
      .filter((a) => !query.type || a.type === query.type)
      .filter((a) => !search || `${a.reference} ${a.title}`.toLowerCase().includes(search))
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
  }

  getAssessment(referenceOrId: string): SpecialistAssessment | undefined {
    return this.assessments.find(
      (a) => a.id === referenceOrId || a.reference === referenceOrId,
    )
  }

  checklistFor(assessmentId: string): SpecialistChecklistItem[] {
    return this.checklist.filter((c) => c.assessmentId === assessmentId)
  }

  checklistProgress(assessmentId: string): { completed: number; total: number } {
    const items = this.checklistFor(assessmentId)
    return {
      completed: items.filter((c) => CONCLUDED.includes(c.status)).length,
      total: items.length,
    }
  }

  recordChecklistResult(
    itemId: string,
    input: RecordChecklistResultInput,
    actorName: string,
  ): SpecialistChecklistItem | undefined {
    const item = this.checklist.find((c) => c.id === itemId)
    if (!item) return undefined
    item.status = input.status
    item.conclusionNote = input.conclusionNote || undefined
    item.assessorName = actorName
    item.assessedAt = isoDay(0)
    this.touch(item.assessmentId)
    return item
  }

  evidenceFor(assessmentId: string): SpecialistEvidenceItem[] {
    return this.evidence
      .filter((e) => e.assessmentId === assessmentId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  }

  allEvidence(domain?: SupervisoryDomain): SpecialistEvidenceItem[] {
    const ids = new Set(
      this.assessments.filter((a) => !domain || a.domain === domain).map((a) => a.id),
    )
    return this.evidence.filter((e) => ids.has(e.assessmentId))
  }

  requestEvidence(input: RequestEvidenceInput, actorName: string): SpecialistEvidenceItem {
    const item: SpecialistEvidenceItem = {
      id: demoUuid(98, ++idSeq),
      assessmentId: input.assessmentId,
      name: input.name,
      kind: input.kind,
      checklistItemId: input.checklistItemId,
      status: 'Requested',
      requestedAt: isoDay(0),
      dueAt: input.dueAt,
      requestedByName: actorName,
      confidentiality: 'Restricted',
      reviewNote: input.note || undefined,
      storageNote: STORAGE_NOTE,
    }
    this.evidence.push(item)
    this.touch(input.assessmentId)
    return item
  }

  /** Simulated receipt — the institution "provides" the record in-session. */
  receiveEvidence(id: string, providedByName: string): SpecialistEvidenceItem | undefined {
    const item = this.evidence.find((e) => e.id === id)
    if (!item || item.status !== 'Requested') return undefined
    item.status = 'Received'
    item.receivedAt = isoDay(0)
    item.providedByName = providedByName
    item.sizeKb = 200 + (idSeq % 900)
    this.touch(item.assessmentId)
    return item
  }

  reviewEvidence(
    id: string,
    verdict: 'Reviewed' | 'Insufficient',
    note: string,
    actorName: string,
  ): SpecialistEvidenceItem | undefined {
    const item = this.evidence.find((e) => e.id === id)
    if (!item || (item.status !== 'Received' && item.status !== 'Reviewed' && item.status !== 'Insufficient')) {
      return undefined
    }
    item.status = verdict
    item.reviewNote = note || item.reviewNote
    void actorName // recorded by the service layer's activity trail
    this.touch(item.assessmentId)
    return item
  }

  overdueEvidenceRequests(domain?: SupervisoryDomain): SpecialistEvidenceItem[] {
    const today = isoDay(0)
    return this.allEvidence(domain).filter(
      (e) => e.status === 'Requested' && e.dueAt !== undefined && e.dueAt < today,
    )
  }

  // ---- Assessment lifecycle ------------------------------------------------

  startAssessment(id: string): SpecialistAssessment | undefined {
    return this.transition(id, 'Planned', 'In Progress')
  }

  submitForReview(id: string): SpecialistAssessment | undefined {
    return this.transition(id, 'In Progress', 'In Review')
  }

  private transition(
    referenceOrId: string,
    from: SpecialistAssessment['status'],
    to: SpecialistAssessment['status'],
  ): SpecialistAssessment | undefined {
    const a = this.getAssessment(referenceOrId)
    if (!a || a.status !== from) return undefined
    a.status = to
    this.touch(a.id)
    return a
  }

  /** Report status machine — returns undefined on an invalid transition. */
  transitionReport(
    referenceOrId: string,
    to: SpecialistReportStatus,
    actorName: string,
  ): SpecialistAssessment | undefined {
    const a = this.getAssessment(referenceOrId)
    if (!a) return undefined
    const allowed = REPORT_FLOW[a.report.status] ?? []
    if (!allowed.includes(to)) return undefined
    a.report.status = to
    if (to === 'Issued (demo)') {
      a.report.issuedAt = isoDay(0)
      a.report.issuedByName = actorName
    }
    if (to === 'In Review' && !a.report.reviewerName) a.report.reviewerName = actorName
    this.touch(a.id)
    return a
  }

  saveReportDraft(
    referenceOrId: string,
    executiveSummary: string,
  ): SpecialistAssessment | undefined {
    const a = this.getAssessment(referenceOrId)
    if (!a || (a.report.status !== 'Not Started' && a.report.status !== 'Draft')) return undefined
    a.report.executiveSummary = executiveSummary
    a.report.status = 'Draft'
    this.touch(a.id)
    return a
  }

  completeAssessment(
    referenceOrId: string,
    conclusion: SpecialistConclusion,
    maturityScore: number,
  ): SpecialistAssessment | undefined {
    const a = this.getAssessment(referenceOrId)
    if (!a || (a.status !== 'In Progress' && a.status !== 'In Review')) return undefined
    a.status = 'Completed'
    a.completedDate = isoDay(0)
    a.conclusion = conclusion
    a.maturity = maturityFor(maturityScore)
    this.touch(a.id)
    return a
  }

  createAssessment(input: CreateSpecialistAssessmentInput, actorName: string): SpecialistAssessment {
    const spec = SPECIALIST_DOMAINS[input.domain]
    if (!spec) throw new Error(`No specialist domain config for ${input.domain}`)
    const reference = this.nextReference(spec.refPrefix)
    const assessment: SpecialistAssessment = {
      id: demoUuid(96, ++idSeq),
      reference,
      domain: input.domain,
      institutionId: input.institutionId,
      title: input.title,
      type: input.type,
      status: 'Planned',
      periodCovered: input.periodCovered,
      startDate: input.startDate,
      targetDate: input.targetDate,
      leadName: actorName,
      teamNames: [],
      scopeSummary: input.scopeSummary,
      examinationRef: input.examinationRef,
      requirementCitations: Array.from(
        new Set(
          spec.checklistTemplates
            .filter((t) => input.submoduleKeys.includes(t.submoduleKey))
            .flatMap((t) => t.requirementCitations),
        ),
      ),
      relations: [],
      report: {
        status: 'Not Started',
        executiveSummary: '',
        sections: [],
        storageNote: STORAGE_NOTE,
      },
      lastActivityAt: isoDay(0),
    }
    this.assessments.push(assessment)
    for (const t of spec.checklistTemplates.filter((x) =>
      input.submoduleKeys.includes(x.submoduleKey),
    )) {
      this.checklist.push({
        id: demoUuid(97, ++idSeq),
        assessmentId: assessment.id,
        submoduleKey: t.submoduleKey,
        code: t.code,
        title: t.title,
        objective: t.objective,
        procedureQuestion: t.procedureQuestion,
        testSteps: t.testSteps,
        method: t.method,
        sample: t.sample,
        priority: t.priority,
        status: 'Not Started',
        requirementCitations: t.requirementCitations,
        criteriaRef: t.criteriaRef,
        expectedEvidence: t.expectedEvidence,
        findingRefs: [],
      })
    }
    return assessment
  }

  private nextReference(prefix: string): string {
    const year = new Date().getFullYear()
    const stem = `${prefix}-${year}-`
    const max = this.assessments
      .filter((a) => a.reference.startsWith(stem))
      .reduce((m, a) => Math.max(m, Number(a.reference.slice(stem.length)) || 0), 0)
    return `${stem}${String(max + 1).padStart(3, '0')}`
  }

  private touch(assessmentId: string): void {
    const a = this.assessments.find((x) => x.id === assessmentId)
    if (a) a.lastActivityAt = isoDay(0)
  }
}

export const specialistRepository = new SpecialistRepository()
