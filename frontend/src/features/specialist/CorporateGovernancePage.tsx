import { Landmark } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * Corporate Governance (Spec §9.1) — `/app/specialist/governance`.
 * Instantiates the shared §9 pattern with the governance domain config:
 * board composition, fit-and-proper, committees, effectiveness, executive
 * management, conflicts, related-party governance, succession and policies.
 * Story anchors: EXM-2026-021 (Unity, planned) and FND-2026-109/037/118.
 */
export function CorporateGovernancePage() {
  return (
    <SpecialistDomainPage
      domain="governance"
      icon={<Landmark className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
