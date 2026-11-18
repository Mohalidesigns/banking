import { Link } from 'react-router'
import {
  Briefcase,
  Building,
  ClipboardList,
  FileSpreadsheet,
  Gavel,
  Radar,
  ShieldAlert,
  TriangleExclamationPoint,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useSessionStore } from '@/store/sessionStore'
import { DEMO_ROLE_LABELS } from '@/types/auth'

/**
 * Phase 1 landing for /app/dashboard: a designed welcome shell for the demo
 * session. The full Supervisory Command Centre screen lands in Phase 2.
 */
const QUICK_LINKS = [
  { label: 'My Work', path: '/app/my-work', icon: Briefcase, note: '7 demo items queued' },
  { label: 'Institution Registry', path: '/app/institutions', icon: Building, note: '4 fictional institutions' },
  { label: 'Off-Site Surveillance', path: '/app/surveillance', icon: Radar, note: 'Phase 3 module' },
  { label: 'Examination Register', path: '/app/examinations', icon: ClipboardList, note: 'Phase 2 module' },
  { label: 'Regulatory Returns', path: '/app/returns', icon: FileSpreadsheet, note: '5 demo submissions due' },
  { label: 'Early Warning Alerts', path: '/app/early-warnings', icon: TriangleExclamationPoint, note: '3 demo escalations' },
  { label: 'Enforcement Cases', path: '/app/enforcement', icon: Gavel, note: '2 demo cases open' },
  { label: 'Risk Assessments', path: '/app/risk-assessments', icon: ClipboardList, note: 'Phase 2 module' },
]

export function DashboardWelcome() {
  const currentUser = useSessionStore((s) => s.currentUser)
  const jurisdiction = useSessionStore((s) => s.jurisdiction)

  return (
    <div>
      <div className="tld-gradient-ai-header mb-6 flex flex-col gap-4 rounded-xl px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[1.5px] text-accent uppercase">
            Supervisory Command Centre
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Welcome, {currentUser?.fullName ?? 'Supervisor'}
          </h2>
          <p className="mt-1 text-xs text-white/70">
            {currentUser && DEMO_ROLE_LABELS[currentUser.role]}
            {jurisdiction ? ` · ${jurisdiction.name}` : ''} · Prototype session with fictional data
          </p>
        </div>
        <p className="flex items-center gap-2 self-start rounded-lg bg-accent/15 px-3 py-2 text-[10px] font-semibold tracking-wide text-accent uppercase md:self-auto">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Demo role — not secure authentication
        </p>
      </div>

      <Card className="mb-6 flex flex-col gap-3 border-accent/30 bg-accent/5 p-5 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-relaxed text-ink">
          <span className="font-semibold text-primary">Phase 1 of the prototype:</span> the
          application shell, design system and navigation are live. The full Command Centre
          dashboard (KPIs, alerts, supervisory pipeline) lands in Phase 2. Every sidebar
          destination is registered and reachable.
        </p>
        <Link
          to="/app/my-work"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white uppercase transition-colors hover:bg-primary-light"
        >
          Open My Work
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.path + link.label} to={link.path}>
              <Card hoverable className="card-hover flex h-full items-start gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-tint-blue text-primary"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{link.label}</span>
                  <span className="block truncate text-[11px] text-ink-secondary">{link.note}</span>
                </span>
              </Card>
            </Link>
          )
        })}
      </div>

      <p className="mt-6 text-center text-[10px] text-ink-tertiary">
        All metrics, institutions and people shown anywhere in this prototype are fictional and
        illustrative — they are not real statistics and carry no regulatory effect.
      </p>
    </div>
  )
}
