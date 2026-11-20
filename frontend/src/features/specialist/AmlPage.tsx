import { ScanSearch } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * AML/CFT/CPF (Spec §9.4) — `/app/specialist/aml`. Instantiates the shared
 * §9 pattern with the AML domain config: ML/TF/PF risk assessment,
 * CDD/KYC/EDD, beneficial ownership, PEP and sanctions screening,
 * transaction monitoring, suspicious transaction reporting, correspondent
 * banking, AML governance and training, and independent AML review.
 * Checklist templates mirror the LIB-AML-002 programme (AML-01…06).
 * Story anchors: EXM-2026-014 (Meridian) → FND-2026-101/107 → CAP-2026-003,
 * with DIR-2026-004 as a labelled non-link Phase-5 chip. All sample case
 * data is fictional and anonymised (Spec §9.4).
 */
export function AmlPage() {
  return (
    <SpecialistDomainPage
      domain="aml"
      icon={<ScanSearch className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
