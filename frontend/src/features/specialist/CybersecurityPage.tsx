import { ShieldCheck } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * IT & Cybersecurity (Spec §9.3) — `/app/specialist/cybersecurity`.
 * Instantiates the shared §9 pattern with the cyber domain config: IT
 * governance/risk, infrastructure, IAM/PAM, network/database/application
 * security, vulnerability management, SOC/SIEM, incident response, BC/DR,
 * cloud & third-party technology, data protection and AI governance, with
 * the §9.3 domain-specific evidence kinds (architecture diagram, access
 * review, vulnerability report, incident log, SOC alert, DR test,
 * third-party assurance). Story anchors: EXM-2026-005 (Crestline) with
 * FND-2026-066/062 → CAP-2026-008.
 */
export function CybersecurityPage() {
  return (
    <SpecialistDomainPage
      domain="cybersecurity"
      icon={<ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
