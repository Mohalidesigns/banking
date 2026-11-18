/**
 * Risk assessment detail fixtures (Spec §6.2): demo methodologies with
 * explicit versioning, per-category inherent/control/residual scores,
 * narratives, supervisory judgement, prior-period comparison, reviewer
 * comments and approval trails — merged onto the Phase-2A `RISK_ASSESSMENTS`
 * summaries. Scoring is demo-only and explained on screen; it is never
 * presented as a universal regulatory formula (Spec §6.2).
 */
import { demoUuid, iso, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { RISK_ASSESSMENTS } from '@/mocks/fixtures/supervision.fixture'
import type { RiskRating } from '@/types/common'
import type {
  AssessmentMethodology,
  RiskAssessmentDetail,
  SupervisoryIntensity,
} from '@/types/supervision'

// ---------------------------------------------------------------------------
// Methodologies (only Approved versions selectable in the wizard)
// ---------------------------------------------------------------------------

export const ASSESSMENT_METHODOLOGIES: AssessmentMethodology[] = [
  {
    id: demoUuid(71, 1),
    name: 'MBA Risk-Based Supervision Methodology',
    version: 'v3.2',
    status: 'Approved',
    description:
      'Meridia Banking Authority supervisory risk assessment methodology (demo). Assesses six risk categories on inherent risk and control effectiveness, derives residual risk through a configured matrix and recommends a supervisory intensity.',
    scoringNote:
      'Demo scoring (illustrative only, not a universal regulatory formula): inherent and control effectiveness are scored 1–5 per category; residual = round((inherent + control) / 2), raised by one level where controls are weak (control score ≥ 4), capped at 5. Composite = mean of category residuals. Intensity mapping: composite ≤ 2 Routine, ≤ 3 Enhanced, ≤ 4 Intensive, > 4 Intervention.',
    categories: ['Credit Risk', 'Liquidity Risk', 'Market Risk', 'Operational Risk', 'AML/CFT Risk', 'Cyber Risk'],
  },
  {
    id: demoUuid(71, 2),
    name: 'MBA Risk-Based Supervision Methodology',
    version: 'v4.0',
    status: 'Draft',
    description:
      'Draft 2027 refresh adding a Conduct & Consumer Protection category and climate-related financial risk overlays. Pending methodology committee approval — not selectable for new assessments.',
    scoringNote: 'Draft — scoring guidance pending committee approval (demo).',
    categories: [
      'Credit Risk',
      'Liquidity Risk',
      'Market Risk',
      'Operational Risk',
      'AML/CFT Risk',
      'Cyber Risk',
      'Conduct & Consumer Protection',
      'Climate-Related Financial Risk',
    ],
  },
]

export const APPROVED_METHODOLOGY = ASSESSMENT_METHODOLOGIES[0]

/** Demo residual computation per the methodology scoring note above. */
export const demoResidual = (inherent: number, control: number): number => {
  const base = Math.round((inherent + control) / 2)
  return Math.min(5, Math.max(1, base + (control >= 4 ? 1 : 0)))
}

export const intensityForComposite = (composite: number): SupervisoryIntensity =>
  composite > 4 ? 'Intervention' : composite > 3 ? 'Intensive' : composite > 2 ? 'Enhanced' : 'Routine'

export const ratingForResidual = (residual: number): RiskRating =>
  residual >= 5 ? 'Critical' : residual === 4 ? 'High' : residual === 3 ? 'Medium' : 'Low'

// ---------------------------------------------------------------------------
// Per-assessment detail
// ---------------------------------------------------------------------------

interface RaSeed {
  judgement: string
  reviewerName?: string
  reviewComments: Array<{ offsetDays: number; reviewerName: string; text: string }>
  approvalTrail: Array<{ offsetDays: number; actorName: string; action: RiskAssessmentDetail['approvalTrail'][number]['action']; comment?: string }>
  prior?: { year: number; overallRisk: RiskRating; compositeScore: number; note: string }
  /** Category narratives keyed by category name (defaults synthesised). */
  narratives?: Record<string, string>
  /** Categories already scored, for in-progress assessments (defaults: all). */
  scoredCategories?: number
  overrides?: Record<string, { residual: number; reason: string }>
}

const RA_SEEDS: RaSeed[] = [
  // 1 Meridian — Completed, High (4)
  {
    judgement:
      'Overall High residual risk driven by AML/CFT (repeat monitoring findings, overdue CAP-2026-003). Recommend Intensive supervision: AML thematic examination in cycle (EXM-2026-014), quarterly off-site monitoring of monitoring-rule remediation, and enforcement linkage via ENF-2026-001. Demo judgement.',
    reviewerName: 'Tunde Bakare',
    reviewComments: [
      { offsetDays: -218, reviewerName: 'Tunde Bakare', text: 'AML residual endorsed at 5; enforcement trajectory reflected in intensity. Demo comment.' },
    ],
    approvalTrail: [
      { offsetDays: -230, actorName: 'Aisha Yusuf', action: 'Created' },
      { offsetDays: -222, actorName: 'Aisha Yusuf', action: 'Submitted', comment: 'All six categories scored with evidence references.' },
      { offsetDays: -216, actorName: 'Tunde Bakare', action: 'Approved', comment: 'High overall risk confirmed; Intensive intensity.' },
    ],
    prior: { year: 2025, overallRisk: 'High', compositeScore: 4, note: 'Stable at High; AML category deteriorated (control score weakened from 3 to 4 on demo scale).' },
    narratives: {
      'AML/CFT Risk': 'Repeat condition: monitoring rule gaps confirmed again in EXM-2026-014 fieldwork (procedure AML-01 Fail). CDD refresh backlog of 2,300 high-risk customers (demo). Control effectiveness weak pending CAP-2026-003.',
      'Credit Risk': 'NPL ratio 6.9% above the demo amber threshold; two large exposures under watch. Collateral valuation exceptions noted in EXM-2026-014 (FND-2026-104).',
    },
  },
  // 2 Northstar — Completed, Medium (3)
  {
    judgement:
      'Medium residual risk with a deteriorating liquidity trend. Enhanced supervision: targeted liquidity examination triggered (EXM-2026-024 from EWA-2026-011), monthly LCR monitoring until two clean quarters. Demo judgement.',
    reviewerName: 'Daniel Adeyemi',
    reviewComments: [
      { offsetDays: -192, reviewerName: 'Daniel Adeyemi', text: 'Liquidity trajectory to be revisited mid-year if amber persists. Demo comment.' },
    ],
    approvalTrail: [
      { offsetDays: -200, actorName: 'Aisha Yusuf', action: 'Created' },
      { offsetDays: -195, actorName: 'Aisha Yusuf', action: 'Submitted' },
      { offsetDays: -190, actorName: 'Daniel Adeyemi', action: 'Approved' },
    ],
    prior: { year: 2025, overallRisk: 'Medium', compositeScore: 3, note: 'Stable at Medium; liquidity category watch item after Q3 reporting delays (FND-2026-087).' },
    narratives: {
      'Liquidity Risk': 'LCR in the demo amber band (104.2% vs 110% threshold); reporting timeliness remediation under CAP-2026-002 at 80%.',
    },
  },
  // 3 Unity — Completed, Low (2)
  {
    judgement:
      'Low residual risk. Routine supervision with the planned governance examination (EXM-2026-021) to verify Shariah governance documentation after FND-2026-118 draft observation. Demo judgement.',
    reviewerName: 'Lerato Mokoena',
    reviewComments: [],
    approvalTrail: [
      { offsetDays: -170, actorName: 'Lerato Mokoena', action: 'Created' },
      { offsetDays: -165, actorName: 'Lerato Mokoena', action: 'Submitted' },
      { offsetDays: -160, actorName: 'Tunde Bakare', action: 'Approved' },
    ],
    prior: { year: 2025, overallRisk: 'Low', compositeScore: 2, note: 'Stable at Low.' },
  },
  // 4 Crestline — In Progress, Medium (3, provisional)
  {
    judgement: '',
    reviewComments: [],
    approvalTrail: [{ offsetDays: -20, actorName: 'Fatima Bello', action: 'Created', comment: '2026 cycle started; three of six categories scored (demo in-progress state).' }],
    prior: { year: 2025, overallRisk: 'Low', compositeScore: 2, note: 'Rose from Low: agent-network and third-party technology risk after rapid 2025 growth (demo).' },
    scoredCategories: 3,
    narratives: {
      'Operational Risk': 'Agent network onboarding control gaps (FND-2026-062 confirmed); branch cash-limit monitoring under review.',
      'Cyber Risk': 'Third-party risk register remediation (CAP-2026-008) at 55%; API security reviews aging.',
    },
  },
  // 5 Aurora — Completed, Low (2)
  {
    judgement: 'Low residual risk; routine supervision. EXM-2026-008 closed with no findings. Demo judgement.',
    reviewerName: 'Lerato Mokoena',
    reviewComments: [],
    approvalTrail: [
      { offsetDays: -140, actorName: 'Peter Okonjo', action: 'Created' },
      { offsetDays: -135, actorName: 'Peter Okonjo', action: 'Submitted' },
      { offsetDays: -130, actorName: 'Lerato Mokoena', action: 'Approved' },
    ],
    prior: { year: 2025, overallRisk: 'Low', compositeScore: 2, note: 'Stable at Low.' },
  },
  // 6 Delta — In Review, Medium (3)
  {
    judgement:
      'Medium residual risk concentrated in credit documentation and provisioning. Enhanced supervision: follow-up examination EXM-2026-017 in flight to validate CAP-2026-005; provisioning shortfall (FND-2026-048) to be tracked monthly. Demo judgement (proposed, awaiting review).',
    reviewerName: 'Lerato Mokoena',
    reviewComments: [
      { offsetDays: -2, reviewerName: 'Lerato Mokoena', text: 'Provisioning narrative should quantify the shortfall against the demo 100% coverage standard before approval. Demo comment.' },
    ],
    approvalTrail: [
      { offsetDays: -30, actorName: 'Nkechi Balogun', action: 'Created' },
      { offsetDays: -6, actorName: 'Nkechi Balogun', action: 'Submitted', comment: 'Submitted for review with six categories scored.' },
      { offsetDays: -2, actorName: 'Lerato Mokoena', action: 'Commented', comment: 'One clarification requested (see reviewer comments).' },
    ],
    prior: { year: 2025, overallRisk: 'Medium', compositeScore: 3, note: 'Stable at Medium; credit documentation remediation on track.' },
    narratives: {
      'Credit Risk': 'Provision coverage below the demo 100% standard on portfolio-at-risk buckets (FND-2026-048); loan appraisal remediation validated under CAP-2026-005.',
    },
  },
  // 7 Sentinel — Completed, Low (1)
  {
    judgement: 'Lowest residual risk in the portfolio; routine supervision with standard off-site monitoring. Demo judgement.',
    reviewerName: 'Daniel Adeyemi',
    reviewComments: [],
    approvalTrail: [
      { offsetDays: -110, actorName: 'Chuka Eze', action: 'Created' },
      { offsetDays: -105, actorName: 'Chuka Eze', action: 'Submitted' },
      { offsetDays: -100, actorName: 'Daniel Adeyemi', action: 'Approved' },
    ],
    prior: { year: 2025, overallRisk: 'Low', compositeScore: 1, note: 'Stable at Low.' },
  },
  // 8 Vanguard — Completed, Critical (5)
  {
    judgement:
      'Critical residual risk: sustained capital breach (CAR 6.4% vs demo 10% minimum), insider lending concentrations and governance failure. Intervention supervision: licence suspended, enforcement case ENF-2026-002, restructuring under CAP-2026-007 with monthly reporting to the Director. Demo judgement.',
    reviewerName: 'Amara Osei',
    reviewComments: [
      { offsetDays: -72, reviewerName: 'Amara Osei', text: 'Intervention intensity endorsed; resolution planning to be tabled at the next supervisory committee (demo).' },
    ],
    approvalTrail: [
      { offsetDays: -85, actorName: 'Aisha Yusuf', action: 'Created' },
      { offsetDays: -78, actorName: 'Aisha Yusuf', action: 'Submitted', comment: 'Fast-tracked after EXM-2026-012 fieldwork results.' },
      { offsetDays: -70, actorName: 'Amara Osei', action: 'Approved', comment: 'Critical confirmed; escalation to enforcement and licence suspension (demo).' },
    ],
    prior: { year: 2025, overallRisk: 'High', compositeScore: 4, note: 'Deteriorated from High to Critical during 2026 (capital breach sustained).' },
    overrides: {
      'Liquidity Risk': { residual: 5, reason: 'Supervisory override: deposit outflow reporting gaps (FND-2026-039) and untested contingency plan justify maximum residual despite the computed score of 4. Override by Aisha Yusuf, endorsed at approval. Demo override.' },
    },
    narratives: {
      'Credit Risk': 'Insider loan concentrations above demo single-obligor limits; asset classification understated by 4.1% of the demo loan book.',
      'Liquidity Risk': 'Contingency funding plan untested for four demo quarters; large deposit outflows not reported within the 48-hour demo standard.',
    },
  },
]

/** Category seeds mirror the Phase-2A dimension generator (raDims). */
const CATEGORY_BASES = (base: number): Array<{ category: string; inherent: number; control: number }> => [
  { category: 'Credit Risk', inherent: base, control: Math.max(1, base - 1) },
  { category: 'Liquidity Risk', inherent: Math.max(1, base - 1), control: base - 1 > 0 ? Math.max(1, base - 2) : 1 },
  { category: 'Market Risk', inherent: Math.max(1, base - 1), control: Math.max(1, base - 1) },
  { category: 'Operational Risk', inherent: base, control: Math.max(1, base - 2) },
  { category: 'AML/CFT Risk', inherent: Math.min(5, base + 1), control: Math.max(1, base - 1) },
  { category: 'Cyber Risk', inherent: base, control: Math.max(1, base - 1) },
]

export const buildAssessmentDetail = (index: number, base: (typeof RISK_ASSESSMENTS)[number]): RiskAssessmentDetail => {
  const seed = RA_SEEDS[index]
  if (!seed) throw new Error(`demo assessment seed missing at index ${index}`)
  const scored = seed.scoredCategories ?? APPROVED_METHODOLOGY.categories.length
  const categoryScores = CATEGORY_BASES(Math.min(5, Math.max(1, Math.round(base.compositeScore)))).slice(0, scored).map((c) => {
    const computed = demoResidual(c.inherent, c.control)
    const override = seed.overrides?.[c.category]
    return {
      category: c.category,
      inherent: c.inherent,
      control: c.control,
      residual: override ? override.residual : computed,
      evidenceRefs: [
        `Working paper RA-2026-${String(index + 1).padStart(3, '0')}/${c.category.split(' ')[0].toLowerCase()} (demo)`,
      ],
      narrative: seed.narratives?.[c.category] ?? `${c.category} scored from the ${base.year} supervisory cycle evidence pack (demo narrative).`,
      overridden: Boolean(override),
      overrideReason: override?.reason,
    }
  })
  return {
    ...base,
    reference: `RA-2026-${String(index + 1).padStart(3, '0')}`,
    methodologyId: APPROVED_METHODOLOGY.id,
    methodologyName: APPROVED_METHODOLOGY.name,
    methodologyVersion: APPROVED_METHODOLOGY.version,
    periodStart: iso(base.year, 1, 1),
    periodEnd: iso(base.year, 12, 31),
    categoryScores,
    supervisoryJudgement: seed.judgement,
    recommendedIntensity: intensityForComposite(base.compositeScore),
    reviewerName: seed.reviewerName,
    reviewComments: seed.reviewComments.map((c, i) => ({
      id: demoUuid(72, index * 10 + i),
      at: isoDateTime(c.offsetDays, 11, 0),
      reviewerName: c.reviewerName,
      text: c.text,
    })),
    approvalTrail: seed.approvalTrail.map((e, i) => ({
      id: demoUuid(73, index * 10 + i),
      at: isoDateTime(e.offsetDays, 10, 0),
      actorName: e.actorName,
      action: e.action,
      comment: e.comment,
    })),
    priorComparison: seed.prior,
  }
}

/** Due-date display helper: assessments keep relative due dates (demo). */
export const assessmentDue = (offsetDays: number): string => isoDay(offsetDays)
