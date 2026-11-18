import type { DemoAction, DemoRole } from '@/types/auth'
import { DEMO_ROLE_LABELS } from '@/types/auth'

/**
 * Thrown by mock workflow services when the current demo role is not
 * permitted to perform an action (Spec §19 gating, §7.4/§7.8 role-gated
 * interactions). UI screens gate buttons up-front with `can()`; this error
 * is the service-layer backstop and the hook a real backend authorisation
 * failure would replace (Spec §18.6).
 */
export class DemoPermissionError extends Error {
  readonly action: DemoAction
  readonly role: DemoRole

  constructor(action: DemoAction, role: DemoRole) {
    super(
      `Demo permission denied: the "${DEMO_ROLE_LABELS[role]}" role cannot perform "${action}" in the prototype (Spec §19 role matrix).`,
    )
    this.name = 'DemoPermissionError'
    this.action = action
    this.role = role
  }
}
