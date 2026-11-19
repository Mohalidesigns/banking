import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  ClipboardList,
  FileText,
  Mail,
  Network,
  StickyNote,
} from 'lucide-react'
import { PrudentialTrendChart } from '@/components/charts/PrudentialTrendChart'
import { toast } from '@/components/feedback/toastStore'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { TextArea } from '@/components/forms/FormControls'
import { ComplianceBadge, RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { directorService } from '@/services/mock/MockDirectorService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { supervisionReadService } from '@/services/mock/MockSupervisionReadService'
import { useSessionStore } from '@/store/sessionStore'
import type {
  ActivityEvent,
  Director,
  FinancialSnapshot,
  Institution,
  InstitutionDocument,
  InstitutionGroup,
  RatingDimension,
  Shareholder,
} from '@/types/institution'
import type {
  CorrectiveAction,
  EarlyWarningAlert,
  EnforcementCase,
  Examination,
  RiskAssessment,
  ReturnSubmission,
  SupervisoryFinding,
} from '@/types/supervision'
import { cx } from '@/utils/cx'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Institution Profile (Spec §5.5) — detailed workspace with header, quick
 * actions and the thirteen working tabs. The /financials, /risk and
 * /examinations sub-routes (Spec §4) open the same workspace on the matching
 * tab; other tabs live on ?tab=. Examinations/Findings tabs render read-only
 * lists from the coherent demo dataset — the deep workflow screens arrive in
 * Phase 2B.
 */

const TAB_BY_SEGMENT: Record<string, string> = {
  financials: 'financial',
  risk: 'risk',
  examinations: 'examinations',
}

const SEGMENT_BY_TAB: Record<string, string> = {
  financial: 'financials',
  risk: 'risk',
  examinations: 'examinations',
}

const LICENCE_TONES: Record<string, StatusTone> = {
  Active: 'active',
  Provisional: 'planning',
  Suspended: 'overdue',
  Revoked: 'closed',
}

const PORTFOLIO_TONES: Record<string, StatusTone> = {
  Satisfactory: 'active',
  'Under Review': 'planning',
  Watch: 'fieldwork',
  Deteriorating: 'overdue',
}

const CONFIDENTIALITY_TONES: Record<string, string> = {
  Public: 'bg-tint-green text-success',
  Internal: 'bg-tint-blue text-primary',
  Confidential: 'bg-tint-orange text-warning',
  Restricted: 'bg-tint-red text-error',
}

const FIT_PROPER_TONES: Record<string, StatusTone> = {
  Approved: 'active',
  Conditional: 'fieldwork',
  'Under Review': 'planning',
  Pending: 'draft',
  Rejected: 'overdue',
}

function Field({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="overline">{label}</p>
      <p className={cx('mt-0.5 text-xs text-ink', mono && 'font-mono text-[11px]')}>{value ?? '—'}</p>
    </div>
  )
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={action} />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

function SimpleList<T>({
  rows,
  keyOf,
  empty,
  render,
}: {
  rows: T[]
  keyOf: (row: T) => string
  empty: string
  render: (row: T) => React.ReactNode
}) {
  if (rows.length === 0) return <EmptyState title={empty} description="No demo records of this kind for this institution." />
  return <ul className="divide-y divide-line-light">{rows.map((row) => <li key={keyOf(row)}>{render(row)}</li>)}</ul>
}

export function InstitutionProfilePage() {
  const { institutionId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useSessionStore((s) => s.currentUser)

  // Which tab: §4 sub-route segments win, then ?tab=, then Overview.
  const [activeTab, setActiveTab] = useState(() => {
    const segment = location.pathname.split('/').pop() ?? ''
    if (segment !== institutionId && TAB_BY_SEGMENT[segment]) return TAB_BY_SEGMENT[segment]
    return new URLSearchParams(location.search).get('tab') ?? 'overview'
  })

  const [inst, setInst] = useState<Institution | null>(null)
  const [failed, setFailed] = useState(false)
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [groups, setGroups] = useState<InstitutionGroup[]>([])
  const [directors, setDirectors] = useState<Director[]>([])
  const [financials, setFinancials] = useState<FinancialSnapshot[]>([])
  const [dimensions, setDimensions] = useState<RatingDimension[]>([])
  const [documents, setDocuments] = useState<InstitutionDocument[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [examinations, setExaminations] = useState<Examination[]>([])
  const [findings, setFindings] = useState<SupervisoryFinding[]>([])
  const [returns, setReturns] = useState<ReturnSubmission[]>([])
  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>([])
  const [assessments, setAssessments] = useState<RiskAssessment[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [enforcement, setEnforcement] = useState<EnforcementCase[]>([])

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestText, setRequestText] = useState('')

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const [
        institution,
        sh,
        gr,
        dir,
        fin,
        dims,
        docs,
        act,
        exams,
        fnds,
        rets,
        alts,
        ras,
        caps,
        enf,
      ] = await Promise.all([
        institutionService.getById(institutionId),
        institutionService.shareholders(institutionId),
        institutionService.groupsForInstitution(institutionId),
        directorService.list({ institutionId }),
        institutionService.financials(institutionId),
        institutionService.ratingDimensions(institutionId),
        institutionService.documents(institutionId),
        institutionService.activity(institutionId),
        supervisionReadService.listExaminations(institutionId),
        supervisionReadService.listFindings(institutionId),
        supervisionReadService.listReturns(institutionId),
        supervisionReadService.listAlerts(institutionId),
        supervisionReadService.listRiskAssessments(institutionId),
        supervisionReadService.listCorrectiveActions(institutionId),
        supervisionReadService.listEnforcementCases(institutionId),
      ])
      setInst(institution)
      setShareholders(sh)
      setGroups(gr)
      setDirectors(dir)
      setFinancials(fin)
      setDimensions(dims)
      setDocuments(docs)
      setActivity(act)
      setExaminations(exams)
      setFindings(fnds)
      setReturns(rets)
      setAlerts(alts)
      setAssessments(ras)
      setCorrectiveActions(caps)
      setEnforcement(enf)
    } catch {
      setFailed(true)
    }
  }, [institutionId])

  useEffect(() => {
    void load()
  }, [load])

  // Keep the URL in sync with the active tab (sub-routes for §4 paths).
  const changeTab = (id: string) => {
    setActiveTab(id)
    const base = `/app/institutions/${institutionId}`
    const segment = SEGMENT_BY_TAB[id]
    if (segment) {
      navigate(`${base}/${segment}`, { replace: true })
    } else {
      const next = new URLSearchParams()
      if (id !== 'overview') next.set('tab', id)
      navigate(next.toString() ? `${base}?${next.toString()}` : base, { replace: true })
    }
  }

  const trendData = useMemo(
    () =>
      financials.slice(-4).map((f) => ({
        periodLabel: f.periodLabel,
        capitalAdequacyPct: f.capitalAdequacyPct,
        nplPct: f.nplPct,
        liquidityRatioPct: f.liquidityRatioPct,
      })),
    [financials],
  )

  const canNote = currentUser ? can(currentUser.role, 'add-note') : false
  const canExport = currentUser ? can(currentUser.role, 'export') : false

  if (failed) {
    return (
      <div>
        <PageHeader title="Institution Profile" breadcrumbs={[{ label: 'Institution Registry', path: '/app/institutions' }, { label: 'Not found' }]} />
        <Card>
          <ErrorState
            title="Institution not available"
            message={`No demo institution matches "${institutionId}". It may have been created in another prototype session.`}
            onRetry={() => void load()}
          />
          <div className="flex justify-center pb-6">
            <Button variant="outline" onClick={() => navigate('/app/institutions')}>
              Back to registry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!inst) {
    return (
      <div>
        <PageHeader title="Institution Profile" subtitle="Loading demo record…" />
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      </div>
    )
  }

  const latest = financials[financials.length - 1]
  const openFindings = findings.filter((f) => f.status !== 'Closed')
  const latestAssessment = assessments[0]

  const handleExportProfile = () => {
    exportCsv(
      `institution-profile-${inst.code}.csv`,
      ['Field', 'Value'],
      [
        ['Legal name', inst.legalName],
        ['Trading name', inst.tradingName],
        ['Code', inst.code],
        ['Licence number', inst.licenceNumber],
        ['Licence status', inst.licenceStatus],
        ['Category', inst.category],
        ['Jurisdiction id', inst.jurisdictionId],
        ['Region', inst.region],
        ['Risk rating (demo)', inst.riskRating],
        ['Supervisory rating (demo)', inst.supervisoryRating],
        ['Portfolio status', inst.portfolioStatus],
        ['Lead supervisor', inst.supervisory.leadSupervisorName],
        ['Team', inst.supervisory.teamName],
        ['Total assets MM (demo)', inst.totalAssetsMM],
        ['Branch count', inst.branchCount],
        ['Open findings', inst.openFindingsCount],
        ['Last examination', inst.lastExaminationDate ?? '—'],
      ],
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data only.')
  }

  // -------------------------------------------------------------------------
  // Tab content builders
  // -------------------------------------------------------------------------

  const overviewTab = (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {[
          { label: 'Total assets (MM, demo)', value: `₣ ${latest ? Number(inst.totalAssetsMM).toLocaleString('en-GB', { minimumFractionDigits: 2 }) : inst.totalAssetsMM}` },
          { label: 'Open findings', value: String(openFindings.length) },
          { label: 'Branches', value: String(inst.branchCount) },
          { label: 'Supervisory rating', value: `C${inst.supervisoryRating} (demo)` },
          { label: 'Last examination', value: inst.lastExaminationDate ? formatDate(inst.lastExaminationDate) : '—' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-xl font-bold text-primary">{kpi.value}</p>
            <p className="mt-1 text-[11px] text-ink-secondary">{kpi.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Risk Profile Summary">
          <div className="flex items-center gap-3">
            <RiskBadge rating={inst.riskRating} />
            <StatusBadge status={inst.portfolioStatus} tone={PORTFOLIO_TONES[inst.portfolioStatus]} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-secondary">
            Composite supervisory rating C{inst.supervisoryRating} (1 strongest – 5 weakest).
            {latestAssessment
              ? ` Last risk assessment (${latestAssessment.year}): ${latestAssessment.overallRisk}, composite score ${latestAssessment.compositeScore}/5, ${latestAssessment.status}.`
              : ''}{' '}
            Illustrative demo rating.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {dimensions.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-ink">{d.dimension}</span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-secondary">C{d.composite}</span>
                  <RiskBadge rating={d.rating} />
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <Card className="lg:col-span-2">
          <CardHeader title="Financial Trend (demo)" action={<span className="text-[10px] font-normal text-ink-tertiary">Last 4 quarters</span>} />
          <CardBody>
            <PrudentialTrendChart data={trendData} />
            <p className="mt-1 text-[10px] text-ink-tertiary">Institution-level ratios — illustrative demo figures.</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title={`Open Findings (${openFindings.length})`}
          action={
            <button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary" onClick={() => changeTab('findings')}>
              All findings →
            </button>
          }
        >
          <SimpleList
            rows={openFindings.slice(0, 4)}
            keyOf={(f) => f.id}
            empty="No open findings"
            render={(f) => (
              <button type="button" className="flex w-full cursor-pointer items-start gap-3 py-2.5 text-left" onClick={() => navigate(`/app/findings/${f.id}`)}>
                <RiskBadge rating={f.riskRating} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">{f.reference} — {f.title}</span>
                  <span className="block text-[10px] text-ink-secondary">{f.status} · due {formatDate(f.dueDate)}</span>
                </span>
              </button>
            )}
          />
        </SectionCard>

        <SectionCard title="Latest Returns" action={<button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary" onClick={() => changeTab('returns')}>All returns →</button>}>
          <SimpleList
            rows={returns.slice(0, 4)}
            keyOf={(r) => r.id}
            empty="No returns on file"
            render={(r) => (
              <button type="button" className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left" onClick={() => navigate(`/app/returns/${r.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">{r.returnCode} — {r.period}</span>
                  <span className="block text-[10px] text-ink-secondary">{r.returnName} · due {formatDate(r.dueDate)}</span>
                </span>
                <StatusBadge status={r.status} tone={r.status === 'Overdue' ? 'overdue' : r.status === 'Due Soon' ? 'fieldwork' : r.status === 'Rejected' ? 'overdue' : 'active'} />
              </button>
            )}
          />
        </SectionCard>

        <SectionCard title="Recent Examinations" action={<button type="button" className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary" onClick={() => changeTab('examinations')}>All examinations →</button>}>
          <SimpleList
            rows={examinations.slice(0, 4)}
            keyOf={(e) => e.id}
            empty="No examinations recorded"
            render={(e) => (
              <button type="button" className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left" onClick={() => navigate(`/app/examinations/${e.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">{e.reference} — {e.type}</span>
                  <span className="block text-[10px] text-ink-secondary">Lead {e.leadExaminerName} · {formatDate(e.startDate)}</span>
                </span>
                <StatusBadge status={e.status} />
              </button>
            )}
          />
        </SectionCard>

        <SectionCard title="Early Warning Alerts & Supervisory Actions">
          <SimpleList
            rows={[
              ...alerts.filter((a) => a.status !== 'Resolved').map((a) => ({
                id: a.id,
                label: `${a.indicator} — ${a.currentValue} vs ${a.threshold}`,
                badge: <StatusBadge status={a.status} tone={a.status === 'Escalated' ? 'overdue' : 'fieldwork'} />,
                link: `/app/early-warnings?alert=${a.id}`,
              })),
              ...correctiveActions
                .filter((c) => c.status !== 'Closed' && c.status !== 'Validated')
                .map((c) => ({
                  id: c.id,
                  label: `${c.reference} — ${c.title} (due ${formatDate(c.dueDate)})`,
                  badge: <StatusBadge status={c.status} tone={c.status === 'Overdue' ? 'overdue' : 'planning'} />,
                  link: undefined as string | undefined,
                })),
            ]}
            keyOf={(x) => x.id}
            empty="No active alerts or actions"
            render={(x) => (
              <div className="flex items-center gap-3 py-2.5">
                {x.link ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer truncate text-left text-xs text-primary hover:underline"
                    onClick={() => navigate(x.link!)}
                    title="Open the early-warning alert detail"
                  >
                    {x.label}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs text-ink">{x.label}</span>
                )}
                {x.badge}
              </div>
            )}
          />
        </SectionCard>
      </div>
    </div>
  )

  const corporateTab = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <SectionCard title="Legal Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Legal name" value={inst.legalName} />
          <Field label="Trading name" value={inst.tradingName} />
          <Field label="Institution code" value={inst.code} mono />
          <Field label="Registration number" value={inst.registrationNumber} mono />
          <Field label="Licence number" value={inst.licenceNumber} mono />
          <Field label="Licence type" value={inst.licenceType} />
          <Field label="Legal form" value={inst.legalForm} />
          <Field label="Ownership type" value={inst.ownershipType} />
        </div>
      </SectionCard>
      <SectionCard title="Jurisdiction & Dates">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country" value={inst.country} />
          <Field label="Region" value={inst.region} />
          <Field label="Currency" value={inst.currency} mono />
          <Field label="Incorporated" value={formatDate(inst.dates.incorporation)} />
          <Field label="Licence issued" value={formatDate(inst.dates.licenceIssue)} />
          <Field label="Commenced" value={formatDate(inst.dates.commencement)} />
        </div>
      </SectionCard>
      <SectionCard title="Contacts">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="overline">Registered address</p>
            <p className="mt-0.5 text-xs text-ink">{inst.registeredAddress}</p>
            <p className="overline mt-3">Website</p>
            <p className="mt-0.5 text-xs text-primary-surface">{inst.website}</p>
          </div>
          <div>
            <p className="overline">Official contact</p>
            <p className="mt-0.5 text-xs text-ink">{inst.officialContact.name}</p>
            <p className="text-[11px] text-ink-secondary">{inst.officialContact.email}</p>
            <p className="text-[11px] text-ink-secondary">{inst.officialContact.phone}</p>
            <p className="overline mt-3">Regulatory liaison</p>
            <p className="mt-0.5 text-xs text-ink">{inst.regulatoryLiaison.name}</p>
            <p className="text-[11px] text-ink-secondary">{inst.regulatoryLiaison.email}</p>
            <p className="text-[11px] text-ink-secondary">{inst.regulatoryLiaison.phone}</p>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Supervisory Assignment & Status">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" value={inst.supervisory.department} />
          <Field label="Portfolio" value={inst.supervisory.portfolio} />
          <Field label="Lead supervisor" value={inst.supervisory.leadSupervisorName} />
          <Field label="Team" value={inst.supervisory.teamName} />
          <Field label="Institution status" value={<StatusBadge status={inst.status} tone={inst.status === 'Active' ? 'active' : 'overdue'} />} />
          <Field label="Licence status" value={<StatusBadge status={inst.licenceStatus} tone={LICENCE_TONES[inst.licenceStatus]} />} />
          <Field label="Watchlist" value={inst.onWatchlist ? 'Yes — see Command Centre (demo)' : 'No'} />
        </div>
        {inst.notes && (
          <p className="mt-4 rounded-lg bg-page p-3 text-xs leading-relaxed text-ink-secondary">{inst.notes}</p>
        )}
      </SectionCard>
    </div>
  )

  const ownershipTab = (
    <div className="flex flex-col gap-5">
      <SectionCard title="Ownership Structure (demo hierarchy visual)">
        {groups.length > 0 && (
          <div className="mb-4 flex flex-col items-center gap-0">
            <div className="rounded-lg border border-line bg-tint-blue px-4 py-2 text-center">
              <p className="text-xs font-semibold text-primary">{groups[0].parentEntity}</p>
              <p className="text-[10px] text-ink-secondary">Group parent · {groups[0].identifier}</p>
            </div>
            <div aria-hidden="true" className="h-5 w-px bg-line" />
            <div className="rounded-lg border-2 border-primary bg-card px-4 py-2 text-center shadow-card">
              <p className="text-xs font-bold text-primary">{inst.legalName}</p>
              <p className="font-mono text-[10px] text-ink-secondary">{inst.code}</p>
            </div>
            {shareholders.some((s) => s.relatedEntities.length > 0) && (
              <>
                <div aria-hidden="true" className="h-5 w-px bg-line" />
                <div className="flex flex-wrap justify-center gap-3">
                  {shareholders.flatMap((s) => s.relatedEntities).map((rel) => (
                    <div key={rel} className="rounded-lg border border-line bg-page px-3 py-1.5 text-center">
                      <p className="text-[11px] font-medium text-ink">{rel}</p>
                      <p className="text-[9px] text-ink-secondary">Related entity (demo)</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                <th className="px-4 py-2.5">Shareholder</th>
                <th className="px-4 py-2.5">Ownership %</th>
                <th className="px-4 py-2.5">Beneficial owner</th>
                <th className="px-4 py-2.5">Related entities</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.map((s) => (
                <tr key={s.id} className="border-t border-line-light text-[13px]">
                  <td className="px-4 py-2.5 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.ownershipPct}%</td>
                  <td className="px-4 py-2.5">
                    {s.beneficialOwner ? <ComplianceBadge state="Compliant" /> : <span className="text-xs text-ink-secondary">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-secondary">{s.relatedEntities.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-ink-tertiary">
          Beneficial-owner column shows the demo flag only. All ownership data is fictional.
        </p>
      </SectionCard>
      <SectionCard title="Consolidated Supervision">
        <SimpleList
          rows={groups}
          keyOf={(g) => g.id}
          empty="No group relationships"
          render={(g) => (
            <div className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Network className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-semibold text-ink">{g.name}</p>
                <span className="font-mono text-[10px] text-ink-secondary">{g.identifier}</span>
                <StatusBadge status={g.consolidatedSupervision} tone={g.consolidatedSupervision === 'Consolidated' ? 'active' : g.consolidatedSupervision === 'Pending' ? 'fieldwork' : 'planning'} />
                <RiskBadge rating={g.riskRating} />
              </div>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Parent: {g.parentEntity} · group exposure ₣{Number(g.groupExposureMM).toLocaleString('en-GB')} MM (demo) · lead {g.leadSupervisorName}
              </p>
              {g.notes && <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">{g.notes}</p>}
            </div>
          )}
        />
      </SectionCard>
    </div>
  )

  const boardTab = (
    <SectionCard title={`Board & Key Officers (${directors.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Position</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Appointed</th>
              <th className="px-4 py-2.5">Committees</th>
              <th className="px-4 py-2.5">Fit & proper</th>
            </tr>
          </thead>
          <tbody>
            {directors.map((d) => (
              <tr key={d.id} className="border-t border-line-light text-[13px]">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{d.fullName}</p>
                  {d.conflictDeclarations > 0 && (
                    <p className="text-[10px] text-warning">{d.conflictDeclarations} conflict declaration(s)</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs">{d.position}</td>
                <td className="px-4 py-2.5 text-xs">{d.category}</td>
                <td className="px-4 py-2.5 text-xs">{formatDate(d.appointmentDate)}</td>
                <td className="px-4 py-2.5 text-[11px] text-ink-secondary">{d.committeeMemberships.join(', ') || '—'}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={d.fitAndProperStatus} tone={FIT_PROPER_TONES[d.fitAndProperStatus]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-ink-tertiary">
        Full register with appointment and status history lives under Directors & Key Officers. Demo data.
      </p>
      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/directors')}>
          Open full directors register
        </Button>
      </div>
    </SectionCard>
  )

  const financialTab = (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Financial Performance Trend (demo)" />
        <CardBody>
          <PrudentialTrendChart data={trendData} />
        </CardBody>
      </Card>
      <SectionCard title="Quarterly Snapshots">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Total assets (MM)</th>
                <th className="px-4 py-2.5">Capital (MM)</th>
                <th className="px-4 py-2.5">Net profit (MM)</th>
                <th className="px-4 py-2.5">CAR %</th>
                <th className="px-4 py-2.5">NPL %</th>
                <th className="px-4 py-2.5">Liquidity %</th>
                <th className="px-4 py-2.5">ROA %</th>
                <th className="px-4 py-2.5">ROE %</th>
              </tr>
            </thead>
            <tbody>
              {[...financials].reverse().map((f) => (
                <tr key={f.id} className="border-t border-line-light text-[12px]">
                  <td className="px-4 py-2 font-medium text-ink">{f.periodLabel}</td>
                  <td className="px-4 py-2 font-mono">{Number(f.totalAssetsMM).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 font-mono">{Number(f.totalCapitalMM).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td className={cx('px-4 py-2 font-mono', Number(f.netProfitMM) < 0 && 'text-error')}>
                    {Number(f.netProfitMM).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={cx('px-4 py-2 font-mono', f.capitalAdequacyPct < 10 && 'font-semibold text-error')}>{f.capitalAdequacyPct.toFixed(1)}</td>
                  <td className={cx('px-4 py-2 font-mono', f.nplPct > 6 && 'font-semibold text-error')}>{f.nplPct.toFixed(1)}</td>
                  <td className={cx('px-4 py-2 font-mono', f.liquidityRatioPct < 110 && 'font-semibold text-warning')}>{f.liquidityRatioPct.toFixed(1)}</td>
                  <td className="px-4 py-2 font-mono">{f.roaPct.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono">{f.roePct.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-ink-tertiary">
          Money shown in millions of the fictional currency (MRD) as decimal strings. Highlighted cells breach demo thresholds. Illustrative only.
        </p>
      </SectionCard>
    </div>
  )

  const prudentialTab = (
    <SectionCard title="Prudential Indicators — Latest Period (demo)">
      {latest ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: 'Capital adequacy ratio', value: `${latest.capitalAdequacyPct.toFixed(1)}%`, threshold: '≥ 10.0% (demo minimum)', ok: latest.capitalAdequacyPct >= 10 },
            { label: 'NPL ratio', value: `${latest.nplPct.toFixed(1)}%`, threshold: '≤ 6.0% (demo amber)', ok: latest.nplPct <= 6 },
            { label: 'Liquidity ratio', value: `${latest.liquidityRatioPct.toFixed(1)}%`, threshold: '≥ 110.0% (demo amber)', ok: latest.liquidityRatioPct >= 110 },
            { label: 'Return on assets', value: `${latest.roaPct.toFixed(2)}%`, threshold: 'contextual', ok: latest.roaPct >= 0 },
            { label: 'Return on equity', value: `${latest.roePct.toFixed(2)}%`, threshold: 'contextual', ok: latest.roePct >= 0 },
            { label: 'Total assets', value: `₣${Number(latest.totalAssetsMM).toLocaleString('en-GB')} MM`, threshold: '—', ok: true },
          ].map((ind) => (
            <Card key={ind.label} className="p-4">
              <p className="overline">{ind.label}</p>
              <p className={cx('mt-1 text-xl font-bold', ind.ok ? 'text-primary' : 'text-error')}>{ind.value}</p>
              <p className="mt-1 text-[10px] text-ink-secondary">Threshold: {ind.threshold}</p>
              <div className="mt-2">
                <StatusBadge status={ind.ok ? 'Within threshold' : 'Breach'} tone={ind.ok ? 'active' : 'overdue'} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No prudential snapshots" description="This demo institution has no financial snapshots yet." />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/prudential/capital?institution=${encodeURIComponent(institutionId)}`)}>
          Capital adequacy →
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/prudential/credit?institution=${encodeURIComponent(institutionId)}`)}>
          Credit & asset quality →
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/prudential/liquidity?institution=${encodeURIComponent(institutionId)}`)}>
          Liquidity & treasury →
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/app/prudential/indicators')}>
          Indicator catalogue →
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/app/prudential/stress-testing')}>
          Stress testing →
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-ink-tertiary">
        Period {latest?.periodLabel ?? '—'} · deep links open the prudential screens (Phase 3B) for this institution. Illustrative demo figures.
      </p>
    </SectionCard>
  )

  const riskTab = (
    <div className="flex flex-col gap-5">
      <SectionCard title="CAMELS-style Rating Dimensions (demo)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dimensions.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-ink">{d.dimension}</p>
                <RiskBadge rating={d.rating} />
              </div>
              <p className="mt-2 text-lg font-bold text-primary">
                C{d.composite}
                <span className={cx('ml-2 text-[10px] font-semibold', d.trend === 'Improving' ? 'text-success' : d.trend === 'Deteriorating' ? 'text-error' : 'text-ink-secondary')}>
                  {d.trend}
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-ink-secondary">{d.commentary}</p>
              <p className="mt-2 text-[10px] text-ink-tertiary">Assessed {formatDate(d.lastAssessed)}</p>
            </Card>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Risk Assessments">
        <SimpleList
          rows={assessments}
          keyOf={(a) => a.id}
          empty="No risk assessments"
          render={(a) => (
            <div className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-ink">{a.year} Annual Risk Assessment</p>
                <RiskBadge rating={a.overallRisk} />
                <StatusBadge status={a.status} />
                <span className="text-[10px] text-ink-secondary">composite {a.compositeScore}/5 · {a.assessedByName} · due {formatDate(a.dueDate)}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {a.dimensions.map((d) => (
                  <div key={d.name} className="rounded-lg bg-page px-3 py-2">
                    <p className="text-[10px] font-medium text-ink">{d.name}</p>
                    <p className="text-[10px] text-ink-secondary">
                      intrinsic {d.intrinsic}/5 · control {d.control}/5
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-ink-tertiary">
                Full assessment workflow lands in Phase 2B — see Risk Assessments module. Demo scores.
              </p>
            </div>
          )}
        />
      </SectionCard>
    </div>
  )

  const examinationsTab = (
    <SectionCard
      title={`Examinations (${examinations.length})`}
      action={
        <Button variant="outline" size="sm" onClick={() => navigate(`/app/examinations/new?institutionId=${inst.id}`)}>
          Create examination (demo)
        </Button>
      }
    >
      <SimpleList
        rows={examinations}
        keyOf={(e) => e.id}
        empty="No examinations recorded"
        render={(e) => (
          <button type="button" className="w-full cursor-pointer py-3 text-left transition-colors hover:bg-page" onClick={() => navigate(`/app/examinations/${e.id}`)}>
            <div className="flex flex-wrap items-center gap-2 px-1">
              <p className="text-xs font-semibold text-ink">{e.reference}</p>
              <StatusBadge status={e.status} />
              <RiskBadge rating={e.riskRating} />
              <span className="text-[11px] text-ink-secondary">{e.type} · lead {e.leadExaminerName}</span>
            </div>
            <p className="mt-1 px-1 text-[11px] text-ink-secondary">
              {formatDate(e.startDate)} → {e.endDate ? formatDate(e.endDate) : `planned ${formatDate(e.plannedEndDate)}`} · {e.findingsCount} finding(s), {e.openFindingsCount} open
            </p>
            <p className="mt-1 px-1 text-[11px] leading-snug text-ink-tertiary">{e.summary}</p>
            {e.progressPct > 0 && e.progressPct < 100 && (
              <div className="mt-2 px-1">
                <ProgressBar value={e.progressPct} showValue label="Execution progress (demo)" tone="primary" />
              </div>
            )}
          </button>
        )}
      />
      <p className="mt-2 text-[10px] text-ink-tertiary">
        Read-only list from the coherent demo dataset — the examination register, wizard and workspace arrive in Phase 2B.
      </p>
    </SectionCard>
  )

  const returnsTab = (
    <SectionCard title={`Regulatory Returns (${returns.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
              <th className="px-4 py-2.5">Return</th>
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5">Due</th>
              <th className="px-4 py-2.5">Submitted</th>
              <th className="px-4 py-2.5">Validation</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-t border-line-light text-[12px] transition-colors hover:bg-gray-50"
                onClick={() => navigate(`/app/returns/${r.id}`)}
              >
                <td className="px-4 py-2.5">
                  <p className="font-mono text-[11px] font-semibold text-ink">{r.returnCode}</p>
                  <p className="text-[11px] text-ink-secondary">{r.returnName}</p>
                </td>
                <td className="px-4 py-2.5">{r.period}</td>
                <td className="px-4 py-2.5">{formatDate(r.dueDate)}</td>
                <td className="px-4 py-2.5">{r.submittedAt ? formatDate(r.submittedAt) : '—'}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={r.validation} tone={r.validation === 'Passed' ? 'active' : r.validation === 'Warnings' ? 'fieldwork' : r.validation === 'Errors' ? 'overdue' : 'draft'} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={r.status} tone={r.status === 'Overdue' || r.status === 'Rejected' ? 'overdue' : r.status === 'Due Soon' ? 'fieldwork' : r.status === 'In Review' ? 'planning' : 'active'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-ink-tertiary">
        Submission detail screens arrive in Phase 3. Demo records only.
      </p>
    </SectionCard>
  )

  const findingsTab = (
    <div className="flex flex-col gap-5">
      <SectionCard title={`Findings (${findings.length})`}>
        <SimpleList
          rows={findings}
          keyOf={(f) => f.id}
          empty="No findings recorded"
          render={(f) => (
            <button type="button" className="w-full cursor-pointer py-3 text-left transition-colors hover:bg-page" onClick={() => navigate(`/app/findings/${f.id}`)}>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <p className="text-xs font-semibold text-ink">{f.reference} — {f.title}</p>
                <RiskBadge rating={f.riskRating} />
                <StatusBadge status={f.status} />
              </div>
              <p className="mt-1 line-clamp-2 px-1 text-[11px] leading-snug text-ink-secondary">{f.description}</p>
              <p className="mt-1 px-1 text-[10px] text-ink-tertiary">
                {f.category} · raised {formatDate(f.raisedDate)} · due {formatDate(f.dueDate)} · owner {f.ownerName}
                {f.examinationRef ? ` · from ${f.examinationRef}` : ''}
              </p>
            </button>
          )}
        />
      </SectionCard>
      <SectionCard title="Remediation / Corrective Actions">
        <SimpleList
          rows={correctiveActions}
          keyOf={(c) => c.id}
          empty="No corrective actions"
          render={(c) => (
            <div className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs font-semibold text-ink">{c.reference}</p>
                <p className="text-xs text-ink">{c.title}</p>
                <StatusBadge status={c.status} tone={c.status === 'Overdue' ? 'overdue' : c.status === 'Validated' ? 'completed' : 'planning'} />
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={c.progressPct}
                  showValue
                  tone={c.status === 'Overdue' ? 'error' : c.progressPct === 100 ? 'success' : 'primary'}
                  label={`Due ${formatDate(c.dueDate)} · ${c.ownerName}`}
                />
              </div>
            </div>
          )}
        />
        <p className="mt-2 text-[10px] text-ink-tertiary">
          Remediation workflow screens arrive in Phase 2B. Demo records only.
        </p>
      </SectionCard>
    </div>
  )

  const enforcementTab = (
    <SectionCard title={`Enforcement (${enforcement.length})`}>
      <SimpleList
        rows={enforcement}
        keyOf={(c) => c.id}
        empty="No enforcement cases"
        render={(c) => (
          <button type="button" className="w-full cursor-pointer py-3 text-left transition-colors hover:bg-page" onClick={() => navigate(`/app/enforcement/${c.id}`)}>
            <div className="flex flex-wrap items-center gap-2 px-1">
              <p className="font-mono text-xs font-semibold text-ink">{c.reference}</p>
              <p className="text-xs text-ink">{c.title}</p>
              <StatusBadge status={c.status} tone={c.status === 'Closed' ? 'closed' : 'overdue'} />
            </div>
            <p className="mt-1 px-1 text-[11px] leading-snug text-ink-secondary">{c.summary}</p>
            <p className="mt-1 px-1 text-[10px] text-ink-tertiary">Opened {formatDate(c.openedDate)} · officer {c.officerName}</p>
          </button>
        )}
      />
      <p className="mt-2 text-[10px] text-ink-tertiary">Enforcement case detail screens arrive in Phase 5. Demo records only.</p>
    </SectionCard>
  )

  const documentsTab = (
    <SectionCard title={`Documents (${documents.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
              <th className="px-4 py-2.5">Document</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Version</th>
              <th className="px-4 py-2.5">Uploaded</th>
              <th className="px-4 py-2.5">Uploader</th>
              <th className="px-4 py-2.5">Confidentiality</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t border-line-light text-[12px]">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-ink-secondary" aria-hidden="true" />
                    {d.title}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">{d.category}</td>
                <td className="px-4 py-2.5 font-mono text-[11px]">{d.version}</td>
                <td className="px-4 py-2.5">{formatDate(d.uploadedDate)}</td>
                <td className="px-4 py-2.5 text-xs">{d.uploader}</td>
                <td className="px-4 py-2.5">
                  <span className={cx('inline-flex rounded-full px-2.5 py-[3px] text-[10px] leading-none font-semibold', CONFIDENTIALITY_TONES[d.confidentiality])}>
                    {d.confidentiality}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-ink-tertiary">
        Document files are never stored in this prototype — metadata rows are fictional demo records.
      </p>
    </SectionCard>
  )

  const activityTab = (
    <SectionCard title={`Activity History (${activity.length})`}>
      {activity.length === 0 ? (
        <EmptyState title="No activity yet" description="Demo events for this institution will appear here." />
      ) : (
        <ol className="relative ml-2 border-l border-line pl-5">
          {activity.map((event) => (
            <li key={event.id} className="relative pb-4 last:pb-0">
              <span
                aria-hidden="true"
                className={cx(
                  'absolute top-1 -left-[26px] h-2.5 w-2.5 rounded-full ring-4 ring-card',
                  event.type === 'alert' || event.type === 'enforcement'
                    ? 'bg-error'
                    : event.type === 'finding'
                      ? 'bg-warning'
                      : event.type === 'note'
                        ? 'bg-accent'
                        : 'bg-primary-surface',
                )}
              />
              <p className="text-xs font-semibold text-ink">{event.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">{event.detail}</p>
              <p className="mt-0.5 text-[10px] text-ink-tertiary">
                {event.actor} · {formatDate(event.at)} ({formatRelativeTime(event.at)})
              </p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )

  const tabItems: TabItem[] = [
    { id: 'overview', label: 'Overview', content: overviewTab },
    { id: 'corporate', label: 'Corporate Profile', content: corporateTab },
    { id: 'ownership', label: 'Ownership & Group', content: ownershipTab },
    { id: 'board', label: 'Board & Management', count: directors.length, content: boardTab },
    { id: 'financial', label: 'Financial Performance', content: financialTab },
    { id: 'prudential', label: 'Prudential Indicators', content: prudentialTab },
    { id: 'risk', label: 'Risk Profile', content: riskTab },
    { id: 'examinations', label: 'Examinations', count: examinations.length, content: examinationsTab },
    { id: 'returns', label: 'Regulatory Returns', count: returns.length, content: returnsTab },
    { id: 'findings', label: 'Findings & Remediation', count: openFindings.length, content: findingsTab },
    { id: 'enforcement', label: 'Enforcement', count: enforcement.length, content: enforcementTab },
    { id: 'documents', label: 'Documents', count: documents.length, content: documentsTab },
    { id: 'activity', label: 'Activity History', content: activityTab },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Institution Registry', path: '/app/institutions' },
          { label: inst.tradingName },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {inst.legalName}
            <span className="font-mono text-sm font-medium text-ink-secondary">{inst.code}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{inst.category} · Licence {inst.licenceNumber}</span>
            <StatusBadge status={`Licence ${inst.licenceStatus}`} tone={LICENCE_TONES[inst.licenceStatus]} />
            <StatusBadge status={inst.portfolioStatus} tone={PORTFOLIO_TONES[inst.portfolioStatus]} />
            {inst.status !== 'Active' && <StatusBadge status={inst.status} tone="overdue" />}
            <RiskBadge rating={inst.riskRating} />
            <span className="text-ink-secondary">Lead supervisor: {inst.supervisory.leadSupervisorName}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              iconLeft={<Mail className="h-3.5 w-3.5" />}
              onClick={() => setRequestOpen(true)}
            >
              Request information
            </Button>
            <Button
              variant="outline"
              iconLeft={<ClipboardList className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/app/examinations/new?institutionId=${inst.id}`)}
            >
              Create examination
            </Button>
            {canNote && (
              <Button variant="outline" iconLeft={<StickyNote className="h-3.5 w-3.5" />} onClick={() => setNoteOpen(true)}>
                Add note
              </Button>
            )}
            {canExport && (
              <Button variant="outline" iconLeft={<FileText className="h-3.5 w-3.5" />} onClick={handleExportProfile}>
                Export profile
              </Button>
            )}
          </>
        }
      />

      <Tabs items={tabItems} activeId={activeTab} onChange={changeTab} />

      <p className="mt-6 text-center text-[10px] text-ink-tertiary">
        Institution profile — fictional demo record. All ratings, figures and documents are illustrative
        and carry no regulatory effect.
      </p>

      {/* Quick action: add note */}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        size="md"
        title={<span className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-accent-dark" aria-hidden="true" />Add supervisory note</span>}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={noteText.trim().length === 0}
              onClick={() => {
                void institutionService
                  .addNote(inst.id, noteText.trim(), currentUser?.fullName ?? 'Demo user')
                  .then(async () => {
                    setNoteText('')
                    setNoteOpen(false)
                    toast.success('Note added', 'Saved in prototype session — demo note only.')
                    setActivity(await institutionService.activity(inst.id))
                  })
              }}
            >
              Save note (demo)
            </Button>
          </div>
        }
      >
        <TextArea
          label="Note"
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Supervisory note — stored in this prototype session only…"
          help="Notes appear in the institution activity history."
        />
      </Modal>

      {/* Quick action: request information */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        size="md"
        title={<span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" aria-hidden="true" />Request information</span>}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={requestText.trim().length === 0}
              onClick={() => {
                setRequestText('')
                setRequestOpen(false)
                toast.success(
                  'Demo action completed',
                  'Information request simulated — the institution portal request screens arrive in Phase 6. Nothing was sent.',
                )
              }}
            >
              Send request (demo)
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-secondary">
            Draft a request to {inst.regulatoryLiaison.name} ({inst.regulatoryLiaison.email}). This
            prototype does not send messages — the request is simulated.
          </p>
          <TextArea
            label="Request detail"
            rows={4}
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe the information requested…"
          />
        </div>
      </Modal>
    </div>
  )
}
