/**
 * Mock prudential repository (Spec §8.1–§8.5, §17.4, §18.3). Owns the
 * mutable prototype-session state for the prudential screens: capital
 * submission review status, breach status, loan-sample conclusions,
 * treasury examination results, stress runs (create/submit/review) and the
 * indicator catalogue (threshold updates + history). Derived series
 * (indicator readings, portfolio trends) are computed from the same demo
 * fixtures and financial snapshots the surveillance screens use, so the
 * one-story rule holds across modules.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import {
  CAPITAL_BREACHES,
  CAPITAL_SUBMISSIONS,
  DEMO_CAR_AMBER_PCT,
  DEMO_CAR_MINIMUM_PCT,
  FINANCIAL_SNAPSHOTS,
  INDICATOR_DEFINITIONS,
  INDICATOR_LATEST_SEEDS,
  INDICATOR_STORY_ANCHORS,
  INDICATOR_THRESHOLD_HISTORY,
  INST_KEY_BY_ID,
  LIQUIDITY_SEEDS,
  LOAN_BOOK_SEEDS,
  LOAN_SAMPLES,
  REGULATORY_ADJUSTMENTS,
  SEED_HISTORY_OVERRIDES,
  SEED_MONTHLY_LABELS,
  SEED_QUARTERLY_LABELS,
  SEVERITY_FACTORS,
  SENSITIVITY_SEED,
  STRESS_RUNS,
  STRESS_SCENARIOS,
  TREASURY_TRANSACTIONS,
} from '@/mocks/fixtures/prudential.fixture'
import type { ActorContext } from '@/types/common'
import type {
  CapitalBreachRow,
  CapitalSubmissionRow,
  CreateStressRunInput,
  IndicatorReadingRow,
  IndicatorThresholdLevel,
  LoanSample,
  PrudentialIndicatorDefinition,
  PrudentialReviewStatus,
  RegulatoryAdjustmentRow,
  StressRun,
  StressRunResult,
  StressScenario,
  TreasuryExaminerResult,
  TreasuryTransaction,
  UpdateIndicatorThresholdsInput,
} from '@/types/prudential'

// Cloners keep fixture arrays immutable -----------------------------------
const cloneSubmission = (s: CapitalSubmissionRow): CapitalSubmissionRow => ({ ...s })
const cloneBreach = (b: CapitalBreachRow): CapitalBreachRow => ({ ...b, relatedRefs: [...b.relatedRefs] })
const cloneAdjustment = (a: RegulatoryAdjustmentRow): RegulatoryAdjustmentRow => ({ ...a })
const cloneSample = (l: LoanSample): LoanSample => ({ ...l, evidenceRefs: [...l.evidenceRefs] })
const cloneTreasury = (t: TreasuryTransaction): TreasuryTransaction => ({ ...t })
const cloneScenario = (s: StressScenario): StressScenario => ({
  ...s,
  assumptions: s.assumptions.map((a) => ({ ...a })),
})
const cloneRun = (r: StressRun): StressRun => ({
  ...r,
  results: r.results.map((x) => ({ ...x })),
  sensitivity: r.sensitivity.map((x) => ({ ...x })),
})
const cloneDefinition = (d: PrudentialIndicatorDefinition): PrudentialIndicatorDefinition => ({
  ...d,
  thresholds: d.thresholds.map((t) => ({ ...t })),
  sourceReturnFields: [...d.sourceReturnFields],
  validationRules: [...d.validationRules],
  applicableInstitutionTypes: [...d.applicableInstitutionTypes],
})

// Mutable prototype-session state -------------------------------------------
const submissions: CapitalSubmissionRow[] = CAPITAL_SUBMISSIONS.map(cloneSubmission)
const breaches: CapitalBreachRow[] = CAPITAL_BREACHES.map(cloneBreach)
const adjustments: RegulatoryAdjustmentRow[] = REGULATORY_ADJUSTMENTS.map(cloneAdjustment)
const loanSamples: LoanSample[] = LOAN_SAMPLES.map(cloneSample)
const treasury: TreasuryTransaction[] = TREASURY_TRANSACTIONS.map(cloneTreasury)
const scenarios: StressScenario[] = STRESS_SCENARIOS.map(cloneScenario)
const runs: StressRun[] = STRESS_RUNS.map(cloneRun)
const definitions: PrudentialIndicatorDefinition[] = INDICATOR_DEFINITIONS.map(cloneDefinition)
const thresholdHistory: Record<string, Array<{ version: string; effectiveFrom: string; change: string; approvedByName: string }>> =
  Object.fromEntries(Object.entries(INDICATOR_THRESHOLD_HISTORY).map(([k, v]) => [k, v.map((r) => ({ ...r }))]))

let runSeq = 5

// Indicator reading derivation ------------------------------------------------

/** Snapshot-derived indicator codes and the snapshot field they read. */
const SNAPSHOT_CODES: Record<string, (v: { capitalAdequacyPct: number; liquidityRatioPct: number; nplPct: number }) => number> = {
  CAR: (s) => s.capitalAdequacyPct,
  LCR: (s) => s.liquidityRatioPct,
  NPL: (s) => s.nplPct,
}

const breachFor = (value: number, thresholds: IndicatorThresholdLevel[]): 'none' | 'Amber' | 'Red' => {
  let breach: 'none' | 'Amber' | 'Red' = 'none'
  for (const level of thresholds) {
    const threshold = Number(level.value)
    const hit = level.operator === 'below' ? value < threshold : value > threshold
    if (hit && (breach === 'none' || level.severity === 'Red')) breach = level.severity
  }
  return breach
}

const anchorFor = (code: string, institutionId: string, periodLabel: string) =>
  INDICATOR_STORY_ANCHORS[`${code}|${INST_KEY_BY_ID[institutionId] ?? ''}|${periodLabel}`]

function buildReadings(defs: PrudentialIndicatorDefinition[]): IndicatorReadingRow[] {
  const rows: IndicatorReadingRow[] = []

  for (const def of defs) {
    if (def.code in SNAPSHOT_CODES) {
      const pick = SNAPSHOT_CODES[def.code]
      for (const snap of FINANCIAL_SNAPSHOTS) {
        const value = pick(snap)
        const anchor = anchorFor(def.code, snap.institutionId, snap.periodLabel)
        rows.push({
          institutionId: snap.institutionId,
          institutionName: '', // filled by the service from the institution registry
          institutionCode: '',
          periodLabel: snap.periodLabel,
          value: value.toFixed(1),
          breach: breachFor(value, def.thresholds),
          relatedAlertRef: anchor?.alertRef,
          relatedExceptionRef: anchor?.exceptionRef,
        })
      }
      continue
    }

    // Seed-derived indicator (NSFR, PC, DC, FXOP, LEV).
    const seeds = INDICATOR_LATEST_SEEDS[def.code]
    if (!seeds) continue
    const labels = def.frequency === 'Monthly' ? SEED_MONTHLY_LABELS : SEED_QUARTERLY_LABELS
    for (const [institutionId, latest] of Object.entries(seeds)) {
      if (latest === 0) continue // no loan book / not applicable (demo empty state)
      const override = SEED_HISTORY_OVERRIDES[def.code]?.[institutionId]
      // Align the override history to end on the latest label.
      const history = override
        ? labels.map((_, i) => override[override.length - labels.length + i] ?? latest)
        : labels.map((_, i) => Number((latest * (1 + Math.sin(i * 2.1 + latest) * 0.02)).toFixed(1)))
      history[history.length - 1] = override ? (override[override.length - 1] ?? latest) : latest
      labels.forEach((periodLabel, i) => {
        const value = history[i]
        const anchor = anchorFor(def.code, institutionId, periodLabel)
        rows.push({
          institutionId,
          institutionName: '',
          institutionCode: '',
          periodLabel,
          value: value.toFixed(1),
          breach: breachFor(value, def.thresholds),
          relatedAlertRef: anchor?.alertRef,
          relatedExceptionRef: anchor?.exceptionRef,
        })
      })
    }
  }
  return rows
}

// Stress-run calculator (illustrative demo maths, Spec §8.4) -------------------

function computeRunResults(scenario: StressScenario, institutionIds: string[]): StressRunResult[] {
  const factors = SEVERITY_FACTORS[scenario.severity]
  return institutionIds.map((institutionId) => {
    const latestCap = submissions
      .filter((s) => s.institutionId === institutionId)
      .sort((a, b) => (a.receivedAt ?? a.periodLabel).localeCompare(b.receivedAt ?? b.periodLabel))
      .pop()
    const liq = LIQUIDITY_SEEDS.find((l) => l.institutionId === institutionId)
    const book = LOAN_BOOK_SEEDS.find((b) => b.institutionId === institutionId)
    const carBaseline = latestCap ? Number(latestCap.carPct) : 12.0
    const rwa = latestCap ? Number(latestCap.rwaMM) : 500
    const lcrBaseline = liq?.lcrPct ?? 120
    const nplBaseline = book?.nplPct ?? 0
    const carStressed = carBaseline + factors.carDeltaPct
    return {
      institutionId,
      institutionName: '', // filled by the service
      carBaselinePct: carBaseline.toFixed(1),
      carStressedPct: carStressed.toFixed(1),
      carDeltaPct: factors.carDeltaPct.toFixed(1),
      lcrBaselinePct: lcrBaseline.toFixed(1),
      lcrStressedPct: Math.max(0, lcrBaseline + factors.lcrDeltaPct).toFixed(1),
      nplBaselinePct: nplBaseline.toFixed(1),
      nplStressedPct: Math.min(100, nplBaseline + factors.nplDeltaPct).toFixed(1),
      capitalImpactMM: ((Math.abs(factors.carDeltaPct) / 100) * rwa).toFixed(1),
      verdict:
        carStressed < DEMO_CAR_MINIMUM_PCT
          ? 'Breach'
          : carStressed < DEMO_CAR_AMBER_PCT
            ? 'Pass — buffer depleted'
            : 'Pass',
    }
  })
}

function computeSensitivity(scenario: StressScenario) {
  const scale = scenario.severity === 'Mild' ? 0.4 : scenario.severity === 'Adverse' ? 0.7 : scenario.severity === 'Severe' ? 1.0 : 1.4
  return SENSITIVITY_SEED.map((s) => ({
    factor: s.factor,
    shock: s.shock,
    carImpactPct: (s.car * scale).toFixed(1),
    nplImpactPct: (s.npl * scale).toFixed(1),
    lcrImpactPct: (s.lcr * scale).toFixed(1),
  }))
}

// Repository ------------------------------------------------------------------

export const prudentialRepository = {
  // Capital (§8.1) ------------------------------------------------------------
  capitalSubmissions(): CapitalSubmissionRow[] {
    return submissions.map(cloneSubmission)
  },

  capitalSubmissionById(id: string): CapitalSubmissionRow | undefined {
    const s = submissions.find((x) => x.id === id)
    return s ? cloneSubmission(s) : undefined
  },

  setSubmissionReviewStatus(
    id: string,
    status: PrudentialReviewStatus,
    actor: ActorContext,
    note?: string,
  ): CapitalSubmissionRow | undefined {
    const s = submissions.find((x) => x.id === id)
    if (!s) return undefined
    s.reviewStatus = status
    if (note) s.note = note
    s.receivedAt = s.receivedAt ?? new Date().toISOString()
    void actor
    return cloneSubmission(s)
  },

  capitalBreaches(): CapitalBreachRow[] {
    return breaches.map(cloneBreach)
  },

  setBreachStatus(
    id: string,
    status: CapitalBreachRow['status'],
    actor: ActorContext,
    note?: string,
  ): CapitalBreachRow | undefined {
    const b = breaches.find((x) => x.id === id)
    if (!b) return undefined
    b.status = status
    if (note) b.note = note
    void actor
    return cloneBreach(b)
  },

  regulatoryAdjustments(): RegulatoryAdjustmentRow[] {
    return adjustments.map(cloneAdjustment)
  },

  // Credit (§8.2) -------------------------------------------------------------
  loanSamples(): LoanSample[] {
    return loanSamples.map(cloneSample)
  },

  concludeLoanSample(
    id: string,
    conclusion: NonNullable<LoanSample['examinerConclusion']>,
    note: string,
    actor: ActorContext,
  ): LoanSample | undefined {
    const l = loanSamples.find((x) => x.id === id)
    if (!l) return undefined
    l.examinerConclusion = conclusion
    l.conclusionNote = note
    l.conclusionByName = actor.actorName
    l.concludedAt = new Date().toISOString()
    return cloneSample(l)
  },

  // Liquidity & treasury (§8.3) ------------------------------------------------
  treasuryTransactions(): TreasuryTransaction[] {
    return treasury.map(cloneTreasury)
  },

  recordTreasuryResult(
    id: string,
    result: TreasuryExaminerResult,
    note: string,
    actor: ActorContext,
  ): TreasuryTransaction | undefined {
    const t = treasury.find((x) => x.id === id)
    if (!t) return undefined
    t.examinerResult = result
    t.examinerNote = note
    t.examinerName = actor.actorName
    t.examinedAt = new Date().toISOString()
    return cloneTreasury(t)
  },

  // Stress testing (§8.4) --------------------------------------------------------
  stressScenarios(): StressScenario[] {
    return scenarios.map(cloneScenario)
  },

  stressScenarioById(id: string): StressScenario | undefined {
    const s = scenarios.find((x) => x.id === id)
    return s ? cloneScenario(s) : undefined
  },

  stressRuns(): StressRun[] {
    return runs.map(cloneRun)
  },

  stressRunById(id: string): StressRun | undefined {
    const r = runs.find((x) => x.id === id)
    return r ? cloneRun(r) : undefined
  },

  createRun(input: CreateStressRunInput, actor: ActorContext): StressRun | undefined {
    const scenario = scenarios.find((s) => s.id === input.scenarioId)
    if (!scenario || input.institutionIds.length === 0) return undefined
    const created: StressRun = {
      id: demoUuid(65, 10 + runSeq),
      reference: `RUN-2026-${String(runSeq).padStart(3, '0')}`,
      scenarioId: scenario.id,
      scenarioReference: scenario.reference,
      scenarioName: scenario.name,
      runAt: new Date().toISOString().slice(0, 10),
      runByName: actor.actorName,
      status: 'Draft',
      results: computeRunResults(scenario, input.institutionIds),
      sensitivity: computeSensitivity(scenario),
    }
    runSeq += 1
    runs.unshift(created)
    return cloneRun(created)
  },

  submitRun(id: string, actor: ActorContext): StressRun | undefined {
    const r = runs.find((x) => x.id === id)
    if (!r || r.status !== 'Draft') return undefined
    r.status = 'Submitted'
    void actor
    return cloneRun(r)
  },

  reviewRun(
    id: string,
    decision: 'Approved' | 'Rejected',
    note: string,
    actor: ActorContext,
  ): StressRun | undefined {
    const r = runs.find((x) => x.id === id)
    if (!r || r.status !== 'Submitted') return undefined
    r.status = decision
    r.reviewerName = actor.actorName
    r.reviewedAt = new Date().toISOString()
    r.reviewNote = note
    return cloneRun(r)
  },

  // Indicator catalogue (§8.5) ----------------------------------------------------
  indicatorDefinitions(): PrudentialIndicatorDefinition[] {
    return definitions.map(cloneDefinition)
  },

  indicatorDefinitionById(id: string): PrudentialIndicatorDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    return d ? cloneDefinition(d) : undefined
  },

  indicatorDefinitionByCode(code: string): PrudentialIndicatorDefinition | undefined {
    const d = definitions.find((x) => x.code === code)
    return d ? cloneDefinition(d) : undefined
  },

  /** Readings for one indicator code (empty array for unknown codes). */
  indicatorReadings(code: string): IndicatorReadingRow[] {
    const def = definitions.find((d) => d.code === code)
    return def ? buildReadings([def]) : []
  },

  thresholdHistoryFor(code: string): Array<{ version: string; effectiveFrom: string; change: string; approvedByName: string }> {
    return (thresholdHistory[code] ?? []).map((r) => ({ ...r }))
  },

  updateThresholds(
    id: string,
    input: UpdateIndicatorThresholdsInput,
    actor: ActorContext,
  ): PrudentialIndicatorDefinition | undefined {
    const d = definitions.find((x) => x.id === id)
    if (!d) return undefined
    d.thresholds = input.thresholds.map((t) => ({ ...t }))
    // Bump the demo rule version: TH-XXX-2026.1 → TH-XXX-2026.2
    d.ruleVersion = d.ruleVersion.replace(/\.(\d+) \(demo\)$/, (_m, n: string) => `.${Number(n) + 1} (demo)`)
    const history = thresholdHistory[d.code] ?? (thresholdHistory[d.code] = [])
    history.unshift({
      version: d.ruleVersion,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      change: input.changeNote,
      approvedByName: actor.actorName,
    })
    return cloneDefinition(d)
  },

  reset(): void {
    submissions.length = 0
    CAPITAL_SUBMISSIONS.forEach((s) => submissions.push(cloneSubmission(s)))
    breaches.length = 0
    CAPITAL_BREACHES.forEach((b) => breaches.push(cloneBreach(b)))
    adjustments.length = 0
    REGULATORY_ADJUSTMENTS.forEach((a) => adjustments.push(cloneAdjustment(a)))
    loanSamples.length = 0
    LOAN_SAMPLES.forEach((l) => loanSamples.push(cloneSample(l)))
    treasury.length = 0
    TREASURY_TRANSACTIONS.forEach((t) => treasury.push(cloneTreasury(t)))
    scenarios.length = 0
    STRESS_SCENARIOS.forEach((s) => scenarios.push(cloneScenario(s)))
    runs.length = 0
    STRESS_RUNS.forEach((r) => runs.push(cloneRun(r)))
    definitions.length = 0
    INDICATOR_DEFINITIONS.forEach((d) => definitions.push(cloneDefinition(d)))
    for (const [code, rows] of Object.entries(INDICATOR_THRESHOLD_HISTORY)) {
      thresholdHistory[code] = rows.map((r) => ({ ...r }))
    }
    runSeq = 5
  },
}
