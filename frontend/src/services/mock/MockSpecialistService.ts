import { findingRepository } from '@/mocks/repositories/findingRepository'
import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { regulatoryRepository } from '@/mocks/repositories/regulatoryRepository'
import { specialistRepository } from '@/mocks/repositories/specialistRepository'
import { REQUIREMENT_ID_BY_CITATION } from '@/mocks/fixtures/storyRefs'
import type { SpecialistService } from '@/services/contracts/SpecialistService'
import { assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'
import type { ActorContext } from '@/types/common'
import type { Institution } from '@/types/institution'
import type { SupervisoryDomain } from '@/types/regulatory'
import type {
  CreateSpecialistAssessmentInput,
  RecordChecklistResultInput,
  RequestEvidenceInput,
  SpecialistAssessment,
  SpecialistAssessmentDetail,
  SpecialistAssessmentRow,
  SpecialistConclusion,
  SpecialistDashboard,
  SpecialistDomainSpec,
  SpecialistFindingRow,
  SpecialistInstitutionPosture,
  SpecialistQuery,
  SpecialistRequirementRef,
  SpecialistSubmoduleCoverage,
} from '@/types/specialist'

/**
 * Mock specialist domain service (Spec §9). All mutations are refused for
 * institution roles (`assertRegulator`, §7.8 hard rule) and gated by the
 * §19 demo actions documented on the contract. Report issuance is a
 * SIMULATION — nothing is ever sent or persisted beyond the prototype
 * session (Spec §17.4).
 */

const isOpen = (status: string): boolean => status !== 'Closed'

class MockSpecialistService implements SpecialistService {
  // ---- reads ----------------------------------------------------------------

  async domainSpec(domain: SupervisoryDomain): Promise<SpecialistDomainSpec | undefined> {
    await latency()
    return specialistRepository.domainSpec(domain)
  }

  async list(query: SpecialistQuery = {}): Promise<SpecialistAssessmentRow[]> {
    await latency()
    return specialistRepository.listAssessments(query).map((a) => this.toRow(a))
  }

  private toRow(a: SpecialistAssessment): SpecialistAssessmentRow {
    const inst: Institution | undefined = institutionRepository.byId(a.institutionId)
    const spec = specialistRepository.domainSpec(a.domain)
    const openFindingCount = findingRepository
      .list()
      .filter(
        (f) =>
          f.institutionId === a.institutionId &&
          (spec?.findingCategories ?? []).includes(f.category) &&
          isOpen(f.status),
      ).length
    return {
      ...a,
      institutionName: inst?.tradingName ?? 'Unknown institution',
      institutionCode: inst?.code ?? '—',
      institutionCategory: inst?.category ?? '—',
      checklistProgress: specialistRepository.checklistProgress(a.id),
      openFindingCount,
    }
  }

  async detail(referenceOrId: string): Promise<SpecialistAssessmentDetail | undefined> {
    await latency()
    const assessment = specialistRepository.getAssessment(referenceOrId)
    if (!assessment) return undefined
    return this.joinDetail(assessment)
  }

  private joinDetail(assessment: SpecialistAssessment): SpecialistAssessmentDetail {
    const inst: Institution | undefined = institutionRepository.byId(assessment.institutionId)
    const spec = specialistRepository.domainSpec(assessment.domain)
    const checklist = specialistRepository.checklistFor(assessment.id)
    const evidence = specialistRepository.evidenceFor(assessment.id)
    const categories = spec?.findingCategories ?? []
    const checklistFindingRefs = new Set(checklist.flatMap((c) => c.findingRefs))
    const findings = findingRepository
      .list()
      .filter(
        (f) =>
          f.institutionId === assessment.institutionId &&
          (categories.includes(f.category) || checklistFindingRefs.has(f.reference)),
      )
      .map((f) => this.toFindingRow(f))
    return {
      assessment,
      institution: {
        id: assessment.institutionId,
        name: inst?.tradingName ?? 'Unknown institution',
        code: inst?.code ?? '—',
        category: inst?.category ?? '—',
        riskRating: inst?.riskRating ?? '—',
      },
      checklist,
      evidence,
      findings,
      requirements: assessment.requirementCitations.map((c) => this.resolveRequirement(c)),
      history: specialistRepository
        .listAssessments({
          domain: assessment.domain,
          institutionId: assessment.institutionId,
          status: 'Completed',
        })
        .filter((h) => h.id !== assessment.id)
        .map((h) => this.toRow(h)),
      progress: specialistRepository.checklistProgress(assessment.id),
    }
  }

  private toFindingRow(f: {
    id: string
    reference: string
    title: string
    riskRating: string
    status: string
    institutionId: string
    raisedDate: string
    dueDate: string
    ownerName: string
    examinationRef?: string
  }): SpecialistFindingRow {
    const inst: Institution | undefined = institutionRepository.byId(f.institutionId)
    return {
      id: f.id,
      reference: f.reference,
      title: f.title,
      riskRating: f.riskRating,
      status: f.status,
      institutionId: f.institutionId,
      institutionName: inst?.tradingName ?? 'Unknown institution',
      raisedDate: f.raisedDate,
      dueDate: f.dueDate,
      ownerName: f.ownerName,
      link: `/app/findings/${f.id}`,
    }
  }

  /** Phase-4 acceptance wiring: citation → §10.1 requirement record + link. */
  private resolveRequirement(citation: string): SpecialistRequirementRef {
    const id = REQUIREMENT_ID_BY_CITATION[citation]
    const requirement = id ? regulatoryRepository.getRequirement(id) : undefined
    const code = citation.split(' §')[0]
    return {
      citation,
      requirementId: requirement?.id,
      title: requirement?.title,
      status: requirement?.status,
      link: requirement
        ? `/app/regulatory/frameworks?framework=${encodeURIComponent(code)}&requirement=${encodeURIComponent(requirement.id)}`
        : undefined,
    }
  }

  async domainFindings(domain: SupervisoryDomain): Promise<SpecialistFindingRow[]> {
    await latency()
    const categories = specialistRepository.domainSpec(domain)?.findingCategories ?? []
    return findingRepository
      .list()
      .filter((f) => categories.includes(f.category))
      .map((f) => this.toFindingRow(f))
      .sort((a, b) => b.raisedDate.localeCompare(a.raisedDate))
  }

  async dashboard(domain: SupervisoryDomain): Promise<SpecialistDashboard | undefined> {
    await latency()
    const spec = specialistRepository.domainSpec(domain)
    if (!spec) return undefined
    const assessments = specialistRepository.listAssessments({ domain })
    const year = new Date().getFullYear()
    const categories = spec.findingCategories
    const coveredIds = new Set(assessments.map((a) => a.institutionId))
    const openFindings = findingRepository
      .list()
      .filter((f) => categories.includes(f.category) && isOpen(f.status))

    const maturityDistribution = [1, 2, 3, 4, 5].map((score) => ({
      score,
      label: ['', 'Initial', 'Developing', 'Defined', 'Managed', 'Optimised'][score],
      count: assessments.filter((a) => a.maturity?.score === score).length,
    }))

    const submoduleCoverage: SpecialistSubmoduleCoverage[] = spec.submodules.map((s) => {
      const items = assessments.flatMap((a) =>
        specialistRepository
          .checklistFor(a.id)
          .filter((c) => c.submoduleKey === s.key),
      )
      const assessmentIds = new Set(
        items.map((i) => i.assessmentId),
      )
      const deficientItems = items.filter((i) => i.status === 'Deficient').length
      const concluded = items.filter(
        (i) => i.status === 'Satisfactory' || i.status === 'Deficient',
      )
      const satisfactory = concluded.filter((i) => i.status === 'Satisfactory').length
      // Demo heuristic (illustrative only): start at 3, move one level per
      // net satisfactory/deficient balance across concluded items.
      const maturityScore = concluded.length
        ? Math.min(5, Math.max(1, 3 + Math.round((satisfactory - deficientItems) / concluded.length)))
        : 3
      return {
        key: s.key,
        label: s.label,
        assessments: assessmentIds.size,
        deficientItems,
        maturityScore,
      }
    })

    const posture: SpecialistInstitutionPosture[] = institutionRepository
      .list()
      .filter((i) => coveredIds.has(i.id))
      .map((i) => {
        const own = assessments
          .filter((a) => a.institutionId === i.id)
          .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        const completed = own.filter((a) => a.status === 'Completed')
        const latest = completed[0]
        const openOwnFindings = openFindings.filter((f) => f.institutionId === i.id).length
        const trend: SpecialistInstitutionPosture['trend'] =
          latest?.conclusion === 'Unsatisfactory'
            ? 'Deteriorating'
            : latest?.conclusion === 'Satisfactory'
              ? 'Improving'
              : 'Stable'
        return {
          institutionId: i.id,
          institutionName: i.tradingName,
          institutionCode: i.code,
          riskRating: i.riskRating,
          maturity: latest?.maturity,
          openAssessments: own.filter((a) => a.status !== 'Completed').length,
          openFindingCount: openOwnFindings,
          trend,
          latestAssessmentRef: latest?.reference,
        }
      })
      .sort((a, b) => b.openFindingCount - a.openFindingCount)

    return {
      domain,
      totals: {
        institutionsCovered: coveredIds.size,
        activeAssessments: assessments.filter((a) => a.status !== 'Completed').length,
        completedThisYear: assessments.filter(
          (a) => a.status === 'Completed' && a.completedDate?.startsWith(String(year)),
        ).length,
        openFindings: openFindings.length,
        overdueEvidenceRequests: specialistRepository.overdueEvidenceRequests(domain).length,
      },
      maturityDistribution,
      submoduleCoverage,
      posture,
      recentRelations: assessments.flatMap((a) => a.relations).slice(0, 8),
    }
  }

  // ---- mutations (role-gated, Spec §19) --------------------------------------

  async create(
    input: CreateSpecialistAssessmentInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentRow | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    const created = specialistRepository.createAssessment(input, actor.actorName)
    notificationRepository.push({
      category: 'task-assigned',
      severity: 'info',
      title: `${created.reference} created (demo)`,
      body: `Specialist assessment planned for the prototype session — ${input.title}.`,
      link: `${specialistRepository.domainSpec(input.domain)?.route ?? '/app/specialist'}?assessment=${encodeURIComponent(created.reference)}`,
    })
    return this.toRow(created)
  }

  async start(id: string, actor: ActorContext): Promise<SpecialistAssessmentRow | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    const updated = specialistRepository.startAssessment(id)
    return updated ? this.toRow(updated) : undefined
  }

  async submitForReview(
    id: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentRow | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    const updated = specialistRepository.submitForReview(id)
    if (updated) {
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `${updated.reference} submitted for review (demo)`,
        body: 'Specialist assessment handoff recorded in the prototype session.',
        link: this.detailLink(updated),
      })
    }
    return updated ? this.toRow(updated) : undefined
  }

  async recordChecklistResult(
    itemId: string,
    input: RecordChecklistResultInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'record-specialist-checklist')
    await latency()
    const item = specialistRepository.recordChecklistResult(itemId, input, actor.actorName)
    if (!item) return undefined
    return this.detailById(item.assessmentId)
  }

  async requestEvidence(
    input: RequestEvidenceInput,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    specialistRepository.requestEvidence(input, actor.actorName)
    return this.detailById(input.assessmentId)
  }

  async receiveEvidence(
    id: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'record-specialist-checklist')
    await latency()
    const item = specialistRepository.receiveEvidence(id, 'Institution portal (demo upload)')
    if (!item) return undefined
    return this.detailById(item.assessmentId)
  }

  async reviewEvidence(
    id: string,
    verdict: 'Reviewed' | 'Insufficient',
    note: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'record-specialist-checklist')
    await latency()
    const item = specialistRepository.reviewEvidence(id, verdict, note, actor.actorName)
    if (!item) return undefined
    return this.detailById(item.assessmentId)
  }

  async saveReportDraft(
    id: string,
    executiveSummary: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    const updated = specialistRepository.saveReportDraft(id, executiveSummary)
    return updated ? this.detailById(id) : undefined
  }

  async submitReport(
    id: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'manage-specialist-assessments')
    await latency()
    const updated = specialistRepository.transitionReport(id, 'In Review', actor.actorName)
    if (updated) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `${updated.reference} report awaiting approval (demo)`,
        body: 'Specialist assessment report submitted for review in the prototype session.',
        link: this.detailLink(updated),
      })
    }
    return updated ? this.detailById(id) : undefined
  }

  async requestReportChanges(
    id: string,
    note: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-specialist-report')
    await latency()
    const updated = specialistRepository.transitionReport(id, 'Draft', actor.actorName)
    if (updated && note) {
      updated.report.executiveSummary = `${updated.report.executiveSummary}\n\nReviewer note (${actor.actorName}): ${note}`.trim()
    }
    return updated ? this.detailById(id) : undefined
  }

  async issueReport(
    id: string,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-specialist-report')
    await latency()
    const updated = specialistRepository.transitionReport(id, 'Issued (demo)', actor.actorName)
    if (updated) {
      notificationRepository.push({
        category: 'system',
        severity: 'info',
        title: `${updated.reference} report issued (demo)`,
        body: 'Simulated issuance — no real communication was sent (prototype session only).',
        link: this.detailLink(updated),
      })
    }
    return updated ? this.detailById(id) : undefined
  }

  async completeAssessment(
    id: string,
    conclusion: SpecialistConclusion,
    maturityScore: number,
    actor: ActorContext,
  ): Promise<SpecialistAssessmentDetail | undefined> {
    assertRegulator(actor, 'approve-specialist-report')
    await latency()
    const updated = specialistRepository.completeAssessment(id, conclusion, maturityScore)
    return updated ? this.detailById(id) : undefined
  }

  // ---- helpers -----------------------------------------------------------------

  private detailLink(a: SpecialistAssessment): string {
    const route = specialistRepository.domainSpec(a.domain)?.route ?? '/app/specialist'
    return `${route}?assessment=${encodeURIComponent(a.reference)}`
  }

  private detailById(assessmentId: string): SpecialistAssessmentDetail | undefined {
    const assessment = specialistRepository.getAssessment(assessmentId)
    return assessment ? this.joinDetail(assessment) : undefined
  }
}

export const specialistService: SpecialistService = new MockSpecialistService()
