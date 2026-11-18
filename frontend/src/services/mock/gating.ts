import { can } from '@/config/roles'
import { isInstitutionRole } from '@/types/auth'
import type { ActorContext } from '@/types/common'
import type { DemoAction } from '@/types/auth'
import { DemoPermissionError } from '@/services/contracts/errors'

/**
 * Demo role gating for workflow mutations (Spec §19). The mock services
 * assert the actor's role before mutating repository state; UI screens gate
 * buttons up-front with `can()` from `config/roles.ts`. A real backend
 * would enforce this server-side (Spec §18.6).
 */
export function assertCan(actor: ActorContext, action: DemoAction): void {
  if (!can(actor.actorRole, action)) {
    throw new DemoPermissionError(action, actor.actorRole)
  }
}

/** Spec §7.8 hard rule: institution users can never close/validate. */
export function assertRegulator(actor: ActorContext, action: DemoAction): void {
  if (isInstitutionRole(actor.actorRole)) {
    throw new DemoPermissionError(action, actor.actorRole)
  }
  assertCan(actor, action)
}
