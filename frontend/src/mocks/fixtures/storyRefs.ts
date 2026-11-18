/**
 * Stable cross-module reference lookups for the one demo story-world
 * (Spec §17.5). Phase 2B fixtures link findings, evidence, procedures and
 * corrective actions by human reference (e.g. FND-2026-101); these maps
 * resolve references to the UUID-shaped ids so cross-links never drift.
 */
import { CORRECTIVE_ACTIONS, FINDINGS } from '@/mocks/fixtures/supervision.fixture'

/** Finding reference (FND-…) -> finding id. */
export const FINDING_ID_BY_REF: Record<string, string> = Object.fromEntries(
  FINDINGS.map((f) => [f.reference, f.id]),
)

/** Corrective action reference (CAP-…) -> action id. */
export const CAP_ID_BY_REF: Record<string, string> = Object.fromEntries(
  CORRECTIVE_ACTIONS.map((c) => [c.reference, c.id]),
)
