import { HeartHandshake } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * Consumer Protection (Spec §9.6) — `/app/specialist/consumer-protection`.
 * Instantiates the shared §9 pattern with the consumer-protection domain
 * config: customer complaints, complaint resolution, fees and charges,
 * customer disclosures, digital channel disputes, consent and privacy,
 * fair treatment and consumer lending. No examination-library programme
 * exists for this domain — the checklist templates cite the MBA/CPC/2025
 * framework requirements directly (plus MBA/NIB/2023 §3.2 for non-interest
 * banks). Story anchors: OBL-2026-007 (Crestline Q3 report late, Partial)
 * with cross-department referrals to the §9.5 and §9.4 assessments.
 */
export function ConsumerProtectionPage() {
  return (
    <SpecialistDomainPage
      domain="consumer-protection"
      icon={<HeartHandshake className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
