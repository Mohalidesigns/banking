import { Activity } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * Enterprise Risk Management (Spec §9.2) — `/app/specialist/erm`.
 * Instantiates the shared §9 pattern with the ERM domain config: framework,
 * risk appetite, risk register, risk governance, KRIs and limits, stress
 * testing, risk aggregation and operational resilience. Story anchors:
 * EWA-2026-011 → EXM-2026-024 (Northstar targeted review) and the
 * Vanguard 2025 full assessment (FND-2026-035/030 → CAP-2026-007).
 */
export function EnterpriseRiskPage() {
  return (
    <SpecialistDomainPage
      domain="erm"
      icon={<Activity className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
