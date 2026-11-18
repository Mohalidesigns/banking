import { Link, useMatches, useNavigate } from 'react-router'
import { ArrowLeft, Construction, Sparkles } from 'lucide-react'
import { getRouteHandle } from '@/app/handle'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { Button } from '@/components/ui/Button'

/** Phase scopes per Spec §21 — shown on placeholders for prototype honesty. */
const PHASE_SCOPE: Record<number, string> = {
  2: 'Command Centre, My Work, Institution Registry & Profiles, Risk Assessments, Supervisory Plans, Examinations, Evidence, Findings and Remediation',
  3: 'Off-Site Surveillance, Regulatory Returns, Capital, Credit, Liquidity, Stress Testing, Prudential Indicators and Early Warnings',
  4: 'Specialist supervision domains, Regulatory Frameworks, Obligations and Correspondence',
  5: 'Enforcement, Directives, Sanctions, Corrective Action Plans, Reports, Intelligence, Peer Benchmarking and the AI Assistant',
  6: 'User access management, system administration and the Institution Portal',
  7: 'Responsive QA, accessibility audit and stakeholder review',
}

/**
 * Shared designed placeholder for registered-but-unimplemented routes
 * (Spec §4: every route renders a complete page, never a blank one).
 * Navy/gold on-brand card with breadcrumb and back action.
 */
export function ModulePlaceholder() {
  const matches = useMatches()
  const navigate = useNavigate()
  const handle = matches.length > 0 ? getRouteHandle(matches[matches.length - 1]) : {}
  const title = handle.breadcrumb ?? 'Module'
  const phase = handle.phase ?? 2

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Home', path: '/app/dashboard' }, { label: title }]} className="mb-3" />
      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-line bg-card shadow-card">
        <div className="tld-gradient-ai-header flex items-center gap-3 px-6 py-5">
          <span
            aria-hidden="true"
            className="tld-gradient-logo flex h-10 w-10 items-center justify-center rounded-[10px]"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-[11px] font-medium tracking-wide text-accent uppercase">
              Atheris Reg prototype
            </p>
          </div>
        </div>
        <div className="px-6 py-6 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tint-orange text-warning"
          >
            <Construction className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-ink">Module scheduled for Phase {phase}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-secondary">
            This route is registered and reachable — the full screen lands in Phase {phase} of the
            prototype build. Phase {phase} covers: {PHASE_SCOPE[phase]}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app/dashboard'))}
              iconLeft={<ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Back
            </Button>
            <Link to="/app/dashboard">
              <Button variant="primary" size="sm">
                Go to Command Centre
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
