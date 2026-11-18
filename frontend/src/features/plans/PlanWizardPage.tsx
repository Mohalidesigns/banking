import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Plus,
  Save,
  Send,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { planService } from '@/services/mock/MockPlanService'
import { DemoPermissionError } from '@/services/contracts/errors'
import { useSessionStore } from '@/store/sessionStore'
import type { Institution } from '@/types/institution'
import type { PlanActivityType, PlanCycle } from '@/types/supervision'
import type { Priority } from '@/types/common'
import { formatDate } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Plan creation wizard (Spec §6.3): 1 planning cycle, 2 institutions or
 * portfolio, 3 supervisory activities, 4 teams and resources, 5 dates and
 * priority, 6 conflicts and coverage gaps review, 7 review & submit for
 * approval. Prototype-session only; nothing is really planned.
 */

const STEPS = [
  'Planning cycle',
  'Institutions / portfolio',
  'Supervisory activities',
  'Teams & resources',
  'Dates & priority',
  'Conflicts & coverage',
  'Review & submit',
]

const ACTIVITY_TYPES: PlanActivityType[] = [
  'Comprehensive examination',
  'Targeted examination',
  'Thematic review',
  'Off-site review',
  'Follow-up visit',
  'Risk assessment',
  'Management meeting',
]

interface ActivityDraft {
  key: string
  type: PlanActivityType
  title: string
  institutionIds: string[]
  teamId: string
  effortDays: number
  startDate: string
  endDate: string
  priority: Priority
}

const newKey = (): string => `act-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

export function PlanWizardPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const jurisdiction = useSessionStore((s) => s.jurisdiction)
  const canManage = can(actor.actorRole, 'manage-plans')

  const [step, setStep] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [institutions, setInstitutions] = useState<Institution[] | null>(null)
  const [teams, setTeams] = useState<Array<{ id: string; name: string; leadName: string }>>([])
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  // Step 1 — cycle
  const now = new Date()
  const [cycle, setCycle] = useState<PlanCycle>('Quarterly')
  const [year, setYear] = useState(String(now.getFullYear()))
  const [quarter, setQuarter] = useState(`Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`)
  const [name, setName] = useState('')

  // Step 2 — coverage
  const [wholePortfolio, setWholePortfolio] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Steps 3–5 — activities
  const [activities, setActivities] = useState<ActivityDraft[]>([])

  const defaultStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString().slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const defaultEnd = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 32).toISOString().slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    void (async () => {
      const [instPage, teamList] = await Promise.all([
        institutionService.list({ page: 1, pageSize: 200 }),
        institutionService.listTeams(),
      ])
      setInstitutions(instPage.items)
      setTeams(teamList)
      if (!name) setName(`${quarter} Supervisory Plan — ${jurisdiction?.name ?? 'Meridia Banking Authority'}`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const instById = useMemo(() => new Map((institutions ?? []).map((i) => [i.id, i])), [institutions])
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  const coveredIds = wholePortfolio
    ? (institutions ?? []).map((i) => i.id)
    : selectedIds

  const addActivity = () =>
    setActivities((prev) => [
      ...prev,
      {
        key: newKey(),
        type: 'Targeted examination',
        title: '',
        institutionIds: coveredIds.slice(0, 1),
        teamId: teams[0]?.id ?? '',
        effortDays: 10,
        startDate: defaultStart,
        endDate: defaultEnd,
        priority: 'Medium',
      },
    ])

  const patchActivity = (key: string, patch: Partial<ActivityDraft>) =>
    setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))

  // Step 6 — conflict & coverage analysis (demo heuristics)
  const analysis = useMemo(() => {
    const conflicts: string[] = []
    for (let i = 0; i < activities.length; i += 1) {
      for (let j = i + 1; j < activities.length; j += 1) {
        const a = activities[i]
        const b = activities[j]
        if (a.teamId === b.teamId && a.startDate <= b.endDate && b.startDate <= a.endDate) {
          conflicts.push(
            `"${a.title || 'Untitled'}" and "${b.title || 'Untitled'}" overlap for ${teamById.get(a.teamId)?.name ?? 'the same team'} (${formatDate(a.startDate)}–${formatDate(a.endDate)} vs ${formatDate(b.startDate)}–${formatDate(b.endDate)}).`,
          )
        }
      }
    }
    const gaps = coveredIds.filter((id) => !activities.some((a) => a.institutionIds.includes(id)))
    return { conflicts, gaps }
  }, [activities, coveredIds, teamById])

  const stepErrors = useMemo((): string[] => {
    switch (step) {
      case 0: {
        const errs: string[] = []
        if (!name.trim()) errs.push('Plan name is required.')
        if (cycle === 'Quarterly' && !quarter.trim()) errs.push('Quarter label is required for quarterly plans.')
        return errs
      }
      case 1:
        return coveredIds.length > 0 ? [] : ['Select at least one institution or the whole portfolio.']
      case 2:
        return activities.length > 0 ? [] : ['Add at least one supervisory activity.']
      case 3:
        return activities.some((a) => !a.teamId) ? ['Every activity needs a responsible team.'] : []
      case 4:
        return activities.some((a) => !a.title.trim() || !a.startDate || !a.endDate || a.endDate <= a.startDate)
          ? ['Every activity needs a title and a valid start/end date range.']
          : []
      default:
        return []
    }
  }, [step, name, cycle, quarter, coveredIds.length, activities])

  const canProceed = stepErrors.length === 0

  const goTo = (next: number) => {
    setStep(next)
    setMaxVisited((m) => Math.max(m, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dirty = name.trim() !== '' || activities.length > 0 || selectedIds.length > 0

  const handleFinish = async (submit: boolean) => {
    if (!jurisdiction) {
      toast.error('No jurisdiction', 'Sign in again to pick a demo jurisdiction.')
      return
    }
    const effortByTeam = new Map<string, number>()
    for (const a of activities) effortByTeam.set(a.teamId, (effortByTeam.get(a.teamId) ?? 0) + a.effortDays)
    if (submit && analysis.conflicts.length > 0) {
      toast.warning('Resolve conflicts first', 'Team scheduling conflicts must be acknowledged on step 6 before submitting.')
      return
    }
    setSaving(true)
    try {
      const created = await planService.create(
        {
          name: name.trim(),
          year: Number(year),
          cycle,
          quarter: cycle === 'Quarterly' ? quarter : undefined,
          jurisdictionId: jurisdiction.id,
          leadName: actor.actorName,
          institutionIds: coveredIds,
          coverageNote: `Created in the prototype session covering ${coveredIds.length} demo institution(s); ${activities.length} activities totalling ${Array.from(effortByTeam.values()).reduce((s, v) => s + v, 0)} person-days (demo estimates).`,
          activities: activities.map((a) => ({
            type: a.type,
            title: a.title.trim(),
            institutionIds: a.institutionIds,
            teamId: a.teamId,
            teamName: teamById.get(a.teamId)?.name ?? 'Unassigned team',
            effortDays: a.effortDays,
            startDate: a.startDate,
            endDate: a.endDate,
            priority: a.priority,
          })),
          submit,
        },
        actor,
      )
      toast.success(
        submit ? 'Plan submitted for approval' : 'Draft plan saved',
        `${created.name} — saved in prototype session (demo data).`,
      )
      navigate(`/app/supervisory-plans/${created.id}`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The prototype could not save the plan.')
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="New Supervisory Plan" breadcrumbs={[{ label: 'Supervisory Plans', path: '/app/supervisory-plans' }]} />
        <EmptyState
          icon={<CircleAlert className="h-8 w-8 text-warning" />}
          title="Permission denied (demo role)"
          description={`The "${actor.actorRole}" demo role cannot create supervisory plans (Spec §19). Switch to a Team Lead, Assistant Director or Director role to run this wizard.`}
          action={{ label: 'Back to plans', onClick: () => navigate('/app/supervisory-plans') }}
        />
      </div>
    )
  }

  if (institutions === null) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  return (
    <div>
      <PageHeader
        title="New Supervisory Plan"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Seven-step planning wizard — demo data, prototype session only</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo / illustrative
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Supervisory Plans', path: '/app/supervisory-plans' }]}
        actions={
          <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={() => (dirty ? setConfirmCancel(true) : navigate('/app/supervisory-plans'))}>
            Cancel
          </Button>
        }
      />

      {/* Progress indicator */}
      <nav aria-label="Wizard progress" className="mb-6">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : i <= maxVisited ? 'todo' : 'locked'
            return (
              <li key={label} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={i > maxVisited}
                  onClick={() => i <= maxVisited && goTo(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cx(
                    'flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    state === 'done' && 'bg-tint-green text-success',
                    state === 'current' && 'bg-primary text-white',
                    state === 'todo' && 'bg-page text-ink-secondary hover:text-primary',
                    state === 'locked' && 'cursor-not-allowed bg-page text-gray-400',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold',
                      state === 'done' ? 'bg-success text-white' : state === 'current' ? 'bg-accent text-primary' : 'bg-line text-ink-secondary',
                    )}
                  >
                    {state === 'done' ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-line" />}
              </li>
            )
          })}
        </ol>
      </nav>

      {stepErrors.length > 0 && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-tint-red px-3 py-2 text-xs text-error">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <ul className="list-inside list-disc">
            {stepErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1 — cycle */}
      {step === 0 && (
        <Card>
          <CardHeader title="Step 1 — Select planning cycle" />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Cycle"
                required
                value={cycle}
                onChange={(e) => setCycle(e.target.value as PlanCycle)}
                options={['Annual', 'Quarterly', 'Event-Driven'].map((c) => ({ value: c, label: c }))}
                help="Event-driven plans are typically inserted after alerts or enforcement triggers (Spec §6.3)."
              />
              <Select
                label="Year"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={[2026, 2027].map((y) => ({ value: String(y), label: String(y) }))}
              />
              {cycle === 'Quarterly' && (
                <Select
                  label="Quarter"
                  required
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  options={[`Q1 ${year}`, `Q2 ${year}`, `Q3 ${year}`, `Q4 ${year}`].map((q) => ({ value: q, label: q }))}
                />
              )}
              <TextInput
                label="Plan name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 2027 Thematic Cycle — Agent Banking"
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2 — institutions */}
      {step === 1 && (
        <Card>
          <CardHeader title="Step 2 — Select institutions or portfolio" subtitle="Coverage determines which institutions appear in gap analysis at step 6." />
          <CardBody>
            <Checkbox
              label={`Whole supervised portfolio (${institutions.length} demo institutions)`}
              help="Annual plans typically cover the full portfolio; quarterly/thematic plans target a subset."
              checked={wholePortfolio}
              onChange={(e) => setWholePortfolio(e.target.checked)}
            />
            {!wholePortfolio && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {institutions.map((inst) => (
                  <Checkbox
                    key={inst.id}
                    label={`${inst.tradingName} (${inst.code})`}
                    help={`Risk: ${inst.riskRating} · ${inst.category}`}
                    checked={selectedIds.includes(inst.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) => (e.target.checked ? [...prev, inst.id] : prev.filter((x) => x !== inst.id)))
                    }
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Step 3 — activities */}
      {step === 2 && (
        <Card>
          <CardHeader
            title="Step 3 — Add supervisory activities"
            subtitle={`${activities.length} activity draft(s). Teams, dates and priority are refined in steps 4–5.`}
            action={
              <button type="button" className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={addActivity}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add activity
              </button>
            }
          />
          <CardBody>
            {activities.length === 0 ? (
              <EmptyState
                title="No activities yet"
                description="Add the supervisory activities this plan will execute — examinations, reviews, assessments and meetings."
                action={{ label: 'Add first activity', onClick: addActivity, icon: <Plus className="h-3.5 w-3.5" /> }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {activities.map((a) => (
                  <div key={a.key} className="rounded-lg border border-line p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Select
                        label="Type"
                        value={a.type}
                        onChange={(e) => patchActivity(a.key, { type: e.target.value as PlanActivityType })}
                        options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))}
                      />
                      <div className="md:col-span-2">
                        <TextInput
                          label="Title"
                          required
                          value={a.title}
                          onChange={(e) => patchActivity(a.key, { title: e.target.value })}
                          placeholder="e.g. Crestline cyber resilience follow-up"
                        />
                      </div>
                    </div>
                    <fieldset className="mt-2">
                      <legend className="overline">Institutions covered</legend>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {coveredIds.map((id) => (
                          <Checkbox
                            key={id}
                            label={instById.get(id)?.tradingName ?? id}
                            checked={a.institutionIds.includes(id)}
                            onChange={(e) =>
                              patchActivity(a.key, {
                                institutionIds: e.target.checked
                                  ? [...a.institutionIds, id]
                                  : a.institutionIds.filter((x) => x !== id),
                              })
                            }
                          />
                        ))}
                      </div>
                    </fieldset>
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setActivities((prev) => prev.filter((x) => x.key !== a.key))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Step 4 — teams & resources */}
      {step === 3 && (
        <Card>
          <CardHeader title="Step 4 — Assign teams and resources" subtitle="Effort estimates feed the plan's resource allocation view (demo person-days)." />
          <CardBody>
            <div className="flex flex-col gap-3">
              {activities.map((a) => (
                <div key={a.key} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-line p-3 md:grid-cols-[1fr_auto_auto]">
                  <div>
                    <p className="text-xs font-medium text-ink">{a.title || 'Untitled activity'}</p>
                    <p className="text-[10px] text-ink-secondary">{a.type}</p>
                  </div>
                  <div className="w-full md:w-56">
                    <Select
                      label="Responsible team"
                      required
                      value={a.teamId}
                      onChange={(e) => patchActivity(a.key, { teamId: e.target.value })}
                      placeholder="Select a team…"
                      options={teams.map((t) => ({ value: t.id, label: `${t.name} (lead ${t.leadName})` }))}
                    />
                  </div>
                  <div className="w-full md:w-36">
                    <TextInput
                      label="Effort (days)"
                      type="number"
                      min={1}
                      value={String(a.effortDays)}
                      onChange={(e) => patchActivity(a.key, { effortDays: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-xs text-ink-secondary">Add activities at step 3 first.</p>}
            </div>
            {activities.length > 0 && (
              <div className="mt-4 rounded-lg bg-page p-3">
                <p className="overline">Allocation preview</p>
                <ul className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-ink-secondary">
                  {Array.from(
                    activities.reduce((map, a) => map.set(a.teamId, (map.get(a.teamId) ?? 0) + a.effortDays), new Map<string, number>()),
                  ).map(([teamId, days]) => (
                    <li key={teamId} className="rounded-full border border-line bg-card px-2.5 py-1">
                      {teamById.get(teamId)?.name ?? 'Unassigned'} · <span className="font-semibold text-ink">{days} days</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Step 5 — dates & priority */}
      {step === 4 && (
        <Card>
          <CardHeader title="Step 5 — Set dates and priority" subtitle="Dates feed the plan timeline; priority drives calendar colour coding." />
          <CardBody>
            <div className="flex flex-col gap-3">
              {activities.map((a) => (
                <div key={a.key} className="rounded-lg border border-line p-3">
                  <p className="text-xs font-medium text-ink">{a.title || 'Untitled activity'}</p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TextInput label="Start" required type="date" value={a.startDate} onChange={(e) => patchActivity(a.key, { startDate: e.target.value })} />
                    <TextInput
                      label="End"
                      required
                      type="date"
                      value={a.endDate}
                      onChange={(e) => patchActivity(a.key, { endDate: e.target.value })}
                      error={a.startDate && a.endDate && a.endDate <= a.startDate ? 'End must be after start.' : undefined}
                    />
                    <Select
                      label="Priority"
                      value={a.priority}
                      onChange={(e) => patchActivity(a.key, { priority: e.target.value as Priority })}
                      options={['Critical', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))}
                    />
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-xs text-ink-secondary">Add activities at step 3 first.</p>}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 6 — conflicts & coverage */}
      {step === 5 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Step 6 — Review conflicts and coverage gaps" subtitle="Demo heuristics over the drafted schedule — resolve before submitting." />
            <CardBody>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="overline">Team scheduling conflicts</p>
                  {analysis.conflicts.length === 0 ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> No overlapping team assignments detected.
                    </p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {analysis.conflicts.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 rounded-lg bg-tint-orange/40 px-2.5 py-1.5 text-[11px] text-warning">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="overline">Coverage gaps</p>
                  {analysis.gaps.length === 0 ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Every covered institution has at least one planned activity.
                    </p>
                  ) : (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {analysis.gaps.map((id) => (
                        <li key={id} className="rounded-full bg-tint-red px-2.5 py-1 text-[11px] text-error">
                          {instById.get(id)?.tradingName ?? id} — no activity
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 text-[10px] text-ink-secondary">
                    Gaps do not block submission (a plan may intentionally defer an institution), but they are
                    recorded in the coverage note.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Step 7 — review & submit */}
      {step === 6 && (
        <Card>
          <CardHeader title="Step 7 — Review and submit for approval" subtitle="Check the summary, then submit or save a draft (prototype session only)." />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="overline">Plan</dt>
                <dd className="mt-0.5 font-medium text-ink">{name || '—'}</dd>
              </div>
              <div>
                <dt className="overline">Cycle</dt>
                <dd className="mt-0.5 text-ink">
                  {cycle} · {year}
                  {cycle === 'Quarterly' ? ` · ${quarter}` : ''}
                </dd>
              </div>
              <div>
                <dt className="overline">Coverage</dt>
                <dd className="mt-0.5 text-ink">{coveredIds.length} institutions{wholePortfolio ? ' (full portfolio)' : ''}</dd>
              </div>
              <div>
                <dt className="overline">Activities</dt>
                <dd className="mt-0.5 text-ink">
                  {activities.length} · {activities.reduce((s, a) => s + a.effortDays, 0)} person-days (demo)
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <p className="overline">Activity summary</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {activities.map((a) => (
                  <li key={a.key} className="flex flex-wrap items-center justify-between gap-2 rounded bg-page px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-ink">{a.title || 'Untitled'}</span>
                    <span className="flex items-center gap-2 text-[10px] text-ink-secondary">
                      {a.type} · {teamById.get(a.teamId)?.name ?? 'no team'} ·{' '}
                      {a.startDate && a.endDate ? `${formatDate(a.startDate)} → ${formatDate(a.endDate)}` : 'no dates'} ·{' '}
                      {a.effortDays}d
                      <PriorityBadge priority={a.priority} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {analysis.conflicts.length > 0 && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-tint-orange/40 px-3 py-2 text-[11px] text-warning">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {analysis.conflicts.length} scheduling conflict(s) remain — return to steps 4–5 to resolve before
                submitting (saving a draft is still allowed).
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" iconLeft={<Save className="h-4 w-4" />} disabled={saving} onClick={() => void handleFinish(false)}>
                Save draft
              </Button>
              <Button variant="primary" iconLeft={<Send className="h-4 w-4" />} loading={saving} onClick={() => void handleFinish(true)}>
                Submit for approval
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Wizard navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />} disabled={step === 0} onClick={() => goTo(step - 1)}>
          Back
        </Button>
        <p className="text-[11px] text-ink-secondary" aria-live="polite">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!canProceed} onClick={() => goTo(step + 1)}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <span className="w-16" aria-hidden="true" />
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        variant="warning"
        title="Discard this plan draft?"
        message="The wizard holds unsaved answers in this prototype session. Cancelling discards them."
        confirmLabel="Discard and exit"
        cancelLabel="Keep editing"
        onConfirm={() => navigate('/app/supervisory-plans')}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  )
}
