import { ClipboardCheck } from 'lucide-react'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'

/**
 * Operations & Internal Controls (Spec §9.5) — `/app/specialist/operations`.
 * Instantiates the shared §9 pattern with the operations domain config:
 * branch operations, cash/vault, transaction processing, maker-checker,
 * reconciliations, GL and suspense, fraud management, operational losses,
 * internal audit effectiveness and outsourced operations. Checklist
 * templates mirror the LIB-OPS-001 programme (OPS-01…06) and cite
 * MBA/OPS/2026 §2.1. Story anchors: FND-2026-062 (Crestline agent network),
 * FND-2026-091 (Northstar mandate escalation) and FND-2026-051 (Delta
 * branch cash limits).
 */
export function OperationsPage() {
  return (
    <SpecialistDomainPage
      domain="operations"
      icon={<ClipboardCheck className="h-6 w-6 text-primary" aria-hidden="true" />}
    />
  )
}
