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
} as const
