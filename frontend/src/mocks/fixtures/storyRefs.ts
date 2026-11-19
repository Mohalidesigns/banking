/**
 * Stable cross-module reference lookups for the one demo story-world
 * (Spec §17.5). Phase 2B fixtures link findings, evidence, procedures and
 * corrective actions by human reference (e.g. FND-2026-101); Phase 3A adds
 * return submission and early-warning alert anchors so returns,
 * surveillance, exceptions and alerts keep telling the same story
 * (EWA-2026-011 → ARV-2026-005 → EXM-2026-024; MPR-09 Vanguard →
 * EWA-2026-008 → ENF-2026-002). These maps resolve references to the
 * UUID-shaped ids so cross-links never drift.
 */
import {
  CAPITAL_BREACHES,
  LOAN_SAMPLES,
  STRESS_RUNS,
} from '@/mocks/fixtures/prudential.fixture'
import {
  CORRESPONDENCE_ID_BY_REF,
  FRAMEWORK_ID_BY_CODE,
  OBLIGATION_ID_BY_REF,
  REGULATORY_REQUIREMENTS,
  REGULATORY_STORY,
} from '@/mocks/fixtures/regulatory.fixture'
import {
  CORRECTIVE_ACTIONS,
  EARLY_WARNING_ALERTS,
  FINDINGS,
  RETURN_SUBMISSIONS,
} from '@/mocks/fixtures/supervision.fixture'
import { PRUDENTIAL_EXCEPTIONS } from '@/mocks/fixtures/surveillance.fixture'

/** Finding reference (FND-…) -> finding id. */
export const FINDING_ID_BY_REF: Record<string, string> = Object.fromEntries(
  FINDINGS.map((f) => [f.reference, f.id]),
)

/** Corrective action reference (CAP-…) -> action id. */
export const CAP_ID_BY_REF: Record<string, string> = Object.fromEntries(
  CORRECTIVE_ACTIONS.map((c) => [c.reference, c.id]),
)

/** Return submission reference (SUB-…) -> submission id (Phase 3A). */
export const SUBMISSION_ID_BY_REF: Record<string, string> = Object.fromEntries(
  RETURN_SUBMISSIONS.map((s) => [s.reference, s.id]),
)

/** Early-warning alert reference (EWA-…) -> alert id (Phase 3A). */
export const ALERT_ID_BY_REF: Record<string, string> = Object.fromEntries(
  EARLY_WARNING_ALERTS.filter((a) => a.reference).map((a) => [a.reference!, a.id]),
)

/** Prudential exception reference (EXC-…) -> exception id (Phase 3A). */
export const EXCEPTION_ID_BY_REF: Record<string, string> = Object.fromEntries(
  PRUDENTIAL_EXCEPTIONS.map((e) => [e.reference, e.id]),
)

/** Stress run reference (RUN-…) -> run id (Phase 3B). */
export const STRESS_RUN_ID_BY_REF: Record<string, string> = Object.fromEntries(
  STRESS_RUNS.map((r) => [r.reference, r.id]),
)

/** Loan sample reference (LNG-…) -> sample id (Phase 3B). */
export const LOAN_SAMPLE_ID_BY_REF: Record<string, string> = Object.fromEntries(
  LOAN_SAMPLES.map((l) => [l.reference, l.id]),
)

/** Named Phase-3A story anchors (Journey B steps 1–3 and 5–7). */
export const STORY = {
  /** Northstar MPR-04 October 2026 — LCR 104.2% warnings, in review (Journey B step 2–3). */
  northstarLiquiditySubmissionId: SUBMISSION_ID_BY_REF['SUB-2026-0144'],
  /** Vanguard MPR-09 October 2026 — rejected: CAR 6.4% + capital reconciliation error. */
  vanguardCapitalSubmissionId: SUBMISSION_ID_BY_REF['SUB-2026-0143'],
  /** Meridian QAR-02 Q3 2026 — accepted; NPL 6.9% feeds EWA-2026-013. */
  meridianAssetQualitySubmissionId: SUBMISSION_ID_BY_REF['SUB-2026-0145'],
  /** Meridian MPR-09 October 2026 — overdue, chased via My Work. */
  meridianOverdueSubmissionId: SUBMISSION_ID_BY_REF['SUB-2026-0141'],
  /** Northstar LCR amber alert → EXM-2026-024 (Journey B steps 5–7). */
  northstarLcrAlertId: ALERT_ID_BY_REF['EWA-2026-011'],
  /** Vanguard sustained capital breach alert → ENF-2026-002. */
  vanguardCarAlertId: ALERT_ID_BY_REF['EWA-2026-008'],
  /** Meridian NPL amber alert → EXM-2026-014 scope. */
  meridianNplAlertId: ALERT_ID_BY_REF['EWA-2026-013'],
  // Phase 3B — prudential anchors (Spec §8, Journey B step 4).
  /** Vanguard red CAR breach ↔ EWA-2026-008 ↔ ENF-2026-002 (Spec §8.1). */
  vanguardCarBreachId: CAPITAL_BREACHES.find(
    (b) => b.measure === 'CAR' && b.relatedRefs.includes('ENF-2026-002'),
  )?.id,
  /** Approved severe-scenario portfolio run (Spec §8.4). */
  severePortfolioRunId: STRESS_RUN_ID_BY_REF['RUN-2026-003'],
  /** Northstar idiosyncratic funding run awaiting review (Spec §8.4). */
  northstarFundingRunId: STRESS_RUN_ID_BY_REF['RUN-2026-004'],
  /** Vanguard related-party loan sample escalated to FND-2026-033 (Spec §8.2). */
  vanguardLoanSampleId: LOAN_SAMPLE_ID_BY_REF['LNG-2026-011'],
  // Phase 4A — regulatory administration anchors (Spec §10): the AML
  // framework/requirement behind EXM-2026-014, the STR and MPR-09
  // obligations, and the Crestline cyber draft used by the correspondence
  // compose/review/approve/send-demo workflow.
  ...REGULATORY_STORY,
} as const

// Phase 4A — regulatory administration ref lookups (Spec §10).

/** Regulatory framework code (MBA/…) -> framework id. */
export { FRAMEWORK_ID_BY_CODE }

/** Obligation reference (OBL-…) -> obligation id. */
export { OBLIGATION_ID_BY_REF }

/** Correspondence reference (COR-…) -> correspondence id. */
export { CORRESPONDENCE_ID_BY_REF }

/** Framework id -> code, for building citation keys. */
const FRAMEWORK_CODE_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FRAMEWORK_ID_BY_CODE).map(([code, id]) => [id, code]),
)

/** Requirement id by "CODE §ref" citation (e.g. "MBA/AML/2023 §6.3"). */
export const REQUIREMENT_ID_BY_CITATION: Record<string, string> = Object.fromEntries(
  REGULATORY_REQUIREMENTS.map((r) => [
    `${FRAMEWORK_CODE_BY_ID[r.frameworkId] ?? ''} ${r.reference}`.trim(),
    r.id,
  ]),
)
