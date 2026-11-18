import { useMemo } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import type { ActorContext } from '@/types/common'

/**
 * Current demo user as a workflow ActorContext (Spec §19 gating). Falls back
 * to a read-only supervisor identity when no session exists (e.g. in tests
 * that render a page directly) so unauthenticated renders can never perform
 * privileged mutations.
 */
export function useActor(): ActorContext {
  const user = useSessionStore((s) => s.currentUser)
  return useMemo(
    () => ({
      actorId: user?.id ?? 'demo-anonymous',
      actorName: user?.fullName ?? 'Demo Supervisor',
      actorRole: user?.role ?? 'read-only-supervisor',
    }),
    [user],
  )
}
