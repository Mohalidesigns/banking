import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { SpecialistDashboardView } from '@/features/specialist/SpecialistDashboardView'
import { SpecialistRegisterView } from '@/features/specialist/SpecialistRegisterView'
import { SpecialistAssessmentDetailView } from '@/features/specialist/SpecialistAssessmentDetailView'
import { FindingsTable } from '@/features/specialist/panels'
import { specialistService } from '@/services/mock/MockSpecialistService'
import type { SupervisoryDomain } from '@/types/regulatory'
import type { SpecialistDomainSpec, SpecialistFindingRow } from '@/types/specialist'

/**
 * Shared §9 specialist domain page — the consistent 8-part pattern built
 * once and parameterized by domain: 1 dashboard, 2 assessment register,
 * 3–8 the assessment detail (overview · checklist & procedures · evidence ·
 * findings · report · history) via `?assessment=REF`, plus a domain-wide
 * findings panel. Phase 4B instantiates governance (§9.1), ERM (§9.2) and
 * cybersecurity (§9.3); Phase 4C reuses this component unchanged for AML
 * (§9.4), operations (§9.5) and consumer protection (§9.6) by adding their
 * domain configs.
 */
export function SpecialistDomainPage({
  domain,
  icon,
}: {
  domain: SupervisoryDomain
  icon?: ReactNode
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [spec, setSpec] = useState<SpecialistDomainSpec | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    void specialistService.domainSpec(domain).then((s) => {
      if (alive) setSpec(s ?? null)
    })
    return () => {
      alive = false
    }
  }, [domain])

  if (spec === undefined) return <LoadingSkeleton className="h-96" />
  if (spec === null) {
    return (
      <div>
        <PageHeader title="Specialist domain" subtitle="Configuration not available in this prototype build." />
        <ErrorState
          title="Domain not configured"
          message={`The ${domain} specialist domain has no demo configuration. All six Spec §9 domains — governance, ERM, cybersecurity, AML, operations and consumer protection — are configured in this prototype build (Phase 4B/4C).`}
        />
      </div>
    )
  }

  const assessmentParam = searchParams.get('assessment')
  if (assessmentParam) {
    return (
      <SpecialistAssessmentDetailView
        spec={spec}
        referenceOrId={assessmentParam}
        onBack={() => setSearchParams({}, { replace: true })}
      />
    )
  }

  const institutionParam = searchParams.get('institution') ?? ''
  const view = searchParams.get('view') ?? (institutionParam ? 'assessments' : 'dashboard')
  const setView = (next: string) => {
    setSearchParams(next === 'dashboard' ? {} : { view: next }, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {spec.label}
          </span>
        }
        subtitle={`${spec.specRef} specialist supervision — ${spec.intro}`}
      />
      <Tabs
        items={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            content: (
              <SpecialistDashboardView domain={domain} spec={spec} onOpenRegister={() => setView('assessments')} />
            ),
          },
          {
            id: 'assessments',
            label: 'Assessment register',
            content: (
              <SpecialistRegisterView domain={domain} spec={spec} initialInstitutionId={institutionParam} />
            ),
          },
          {
            id: 'findings',
            label: 'Findings',
            content: <DomainFindingsView domain={domain} />,
          },
        ]}
        activeId={['dashboard', 'assessments', 'findings'].includes(view) ? view : 'dashboard'}
        onChange={setView}
      />
    </div>
  )
}

/** Pattern part 6 at domain level — every finding in the domain categories. */
function DomainFindingsView({ domain }: { domain: SupervisoryDomain }) {
  const [rows, setRows] = useState<SpecialistFindingRow[] | null>(null)

  useEffect(() => {
    let alive = true
    void specialistService.domainFindings(domain).then((r) => {
      if (alive) setRows(r)
    })
    return () => {
      alive = false
    }
  }, [domain])

  return (
    <FindingsTable
      rows={rows ?? []}
      loading={rows === null}
      title="Domain findings (all institutions)"
      emptyDescription="No findings in the demo dataset carry this domain's categories yet."
    />
  )
}
