/**
 * Mock risk assessment repository (Spec §6.2, §17.4). Owns the mutable
 * assessment lifecycle: create (wizard), category scoring with supervisory
 * overrides, submit for approval, reviewer comments, approve/return.
 * `base()` keeps Phase-2A consumers (profile Risk tab, Command Centre) live.
 * Demo scoring only — the methodology's scoring note is always shown.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import { RISK_ASSESSMENTS } from '@/mocks/fixtures/supervision.fixture'
import {
  APPROVED_METHODOLOGY,
  ASSESSMENT_METHODOLOGIES,
  buildAssessmentDetail,
  demoResidual,
  intensityForComposite,
  ratingForResidual,
} from '@/mocks/fixtures/riskAssessmentDetail.fixture'
import type { ActorContext, RiskRating } from '@/types/common'
import type { CreateAssessmentInput } from '@/services/contracts/RiskAssessmentService'
import type {
  AssessmentCategoryScore,
  AssessmentMethodology,
  RiskAssessment,
  RiskAssessmentDetail,
  SupervisoryIntensity,
} from '@/types/supervision'

const clone = (a: RiskAssessmentDetail): RiskAssessmentDetail => ({
  ...a,
  categoryScores: a.categoryScores.map((c) => ({ ...c, evidenceRefs: [...c.evidenceRefs] })),
  reviewComments: a.reviewComments.map((c) => ({ ...c })),
  approvalTrail: a.approvalTrail.map((e) => ({ ...e })),
  priorComparison: a.priorComparison ? { ...a.priorComparison } : undefined,
  dimensions: a.dimensions.map((d) => ({ ...d })),
})

const records: RiskAssessmentDetail[] = RISK_ASSESSMENTS.map((a, i) => buildAssessmentDetail(i, a))

let refSeq = 100
const eventId = (): string => `ra-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const byId = (id: string): RiskAssessmentDetail | undefined => records.find((a) => a.id === id)

const toBase = (a: RiskAssessmentDetail): RiskAssessment => ({
  id: a.id,
  institutionId: a.institutionId,
  year: a.year,
  status: a.status,
  overallRisk: a.overallRisk,
  compositeScore: a.compositeScore,
  assessedByName: a.assessedByName,
  dueDate: a.dueDate,
  completedDate: a.completedDate,
  dimensions: a.dimensions.map((d) => ({ ...d })),
})

const compositeOf = (scores: AssessmentCategoryScore[]): number => {
  if (scores.length === 0) return 1
  const mean = scores.reduce((sum, s) => sum + s.residual, 0) / scores.length
  return Math.round(mean * 10) / 10
}

const dimensionsFrom = (scores: AssessmentCategoryScore[]): RiskAssessment['dimensions'] =>
  scores.map((s) => ({
    name: s.category,
    intrinsic: s.inherent,
    control: s.control,
    rating: ratingForResidual(s.residual),
  }))

export const riskAssessmentRepository = {
  list(): RiskAssessmentDetail[] {
    return records.map(clone)
  },

  base(): RiskAssessment[] {
    return records.map(toBase)
  },

  getById(id: string): RiskAssessmentDetail | undefined {
    const a = byId(id)
    return a ? clone(a) : undefined
  },

  methodologies(): AssessmentMethodology[] {
    return ASSESSMENT_METHODOLOGIES.map((m) => ({ ...m, categories: [...m.categories] }))
  },

  approvedMethodologies(): AssessmentMethodology[] {
    return ASSESSMENT_METHODOLOGIES.filter((m) => m.status === 'Approved').map((m) => ({ ...m, categories: [...m.categories] }))
  },

  awaitingReview(): RiskAssessmentDetail[] {
    return records.filter((a) => a.status === 'In Review')
  },

  /** Demo scoring helpers surfaced to the wizard so the UI never hardcodes
   *  a "universal formula" — the methodology's own note explains it. */
  computeResidual(inherent: number, control: number): number {
    return demoResidual(inherent, control)
  },

  intensityFor(composite: number): SupervisoryIntensity {
    return intensityForComposite(composite)
  },

  create(input: CreateAssessmentInput, actor: ActorContext): RiskAssessmentDetail {
    refSeq += 1
    const methodology =
      ASSESSMENT_METHODOLOGIES.find((m) => m.id === input.methodologyId) ?? APPROVED_METHODOLOGY
    const composite = compositeOf(input.categoryScores)
    const created: RiskAssessmentDetail = {
      id: demoUuid(87, refSeq + records.length + 1),
      institutionId: input.institutionId,
      year: input.year,
      status: input.submit ? 'In Review' : 'In Progress',
      overallRisk: ratingForResidual(Math.round(composite)) as RiskRating,
      compositeScore: composite,
      assessedByName: input.assessedByName,
      dueDate: input.dueDate,
      completedDate: undefined,
      dimensions: dimensionsFrom(input.categoryScores),
      reference: `RA-${input.year}-${String(refSeq).padStart(3, '0')}`,
      methodologyId: methodology.id,
      methodologyName: methodology.name,
      methodologyVersion: methodology.version,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      categoryScores: input.categoryScores.map((c) => ({ ...c, evidenceRefs: [...c.evidenceRefs] })),
      supervisoryJudgement: input.supervisoryJudgement,
      recommendedIntensity: intensityForComposite(composite),
      reviewerName: input.reviewerName,
      reviewComments: [],
      approvalTrail: [
        {
          id: eventId(),
          at: new Date().toISOString(),
          actorName: actor.actorName,
          action: input.submit ? 'Submitted' : 'Created',
          comment: input.submit ? 'Submitted for approval from the create-assessment wizard (prototype session).' : 'Saved as draft from the create-assessment wizard (prototype session).',
        },
      ],
      priorComparison: undefined,
    }
    records.unshift(created)
    return clone(created)
  },

  updateScores(id: string, categoryScores: AssessmentCategoryScore[]): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || a.status === 'Completed') return undefined
    a.categoryScores = categoryScores.map((c) => ({ ...c, evidenceRefs: [...c.evidenceRefs] }))
    a.compositeScore = compositeOf(a.categoryScores)
    a.overallRisk = ratingForResidual(Math.round(a.compositeScore))
    a.dimensions = dimensionsFrom(a.categoryScores)
    a.recommendedIntensity = intensityForComposite(a.compositeScore)
    return clone(a)
  },

  setJudgement(id: string, judgement: string): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || a.status === 'Completed') return undefined
    a.supervisoryJudgement = judgement
    return clone(a)
  },

  applyOverride(id: string, category: string, residual: number, reason: string, actor: ActorContext): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || a.status === 'Completed') return undefined
    const score = a.categoryScores.find((c) => c.category === category)
    if (!score) return undefined
    score.residual = residual
    score.overridden = true
    score.overrideReason = `${reason} (override by ${actor.actorName}, prototype session)`
    a.compositeScore = compositeOf(a.categoryScores)
    a.overallRisk = ratingForResidual(Math.round(a.compositeScore))
    a.dimensions = dimensionsFrom(a.categoryScores)
    a.recommendedIntensity = intensityForComposite(a.compositeScore)
    return clone(a)
  },

  submitForApproval(id: string, actor: ActorContext): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || (a.status !== 'In Progress' && a.status !== 'Not Started')) return undefined
    a.status = 'In Review'
    a.approvalTrail.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Submitted',
      comment: 'Submitted for approval (prototype session).',
    })
    return clone(a)
  },

  addReviewComment(id: string, text: string, actor: ActorContext): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.reviewComments.push({ id: eventId(), at: new Date().toISOString(), reviewerName: actor.actorName, text })
    a.approvalTrail.push({ id: eventId(), at: new Date().toISOString(), actorName: actor.actorName, action: 'Commented', comment: text })
    return clone(a)
  },

  approve(id: string, actor: ActorContext, comment?: string): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || a.status !== 'In Review') return undefined
    a.status = 'Completed'
    a.completedDate = new Date().toISOString().slice(0, 10)
    a.reviewerName = a.reviewerName ?? actor.actorName
    a.approvalTrail.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Approved',
      comment: comment ?? `Approved at ${a.overallRisk} overall risk; recommended intensity ${a.recommendedIntensity} (demo).`,
    })
    return clone(a)
  },

  returnAssessment(id: string, actor: ActorContext, comment: string): RiskAssessmentDetail | undefined {
    const a = byId(id)
    if (!a || a.status !== 'In Review') return undefined
    a.status = 'In Progress'
    a.approvalTrail.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Returned',
      comment,
    })
    return clone(a)
  },

  reset(): void {
    records.length = 0
    RISK_ASSESSMENTS.forEach((a, i) => records.push(buildAssessmentDetail(i, a)))
    refSeq = 100
  },
}
