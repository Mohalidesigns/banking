import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowUpRight,
  Ban,
  Check,
  ChevronLeft,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { planService } from '@/services/mock/MockPlanService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { PlanActivity, PlanActivityType, SupervisoryPlanDetail } from '@/types/supervision'
import type { Priority } from '@/types/common'
import { cx } from '@/utils/cx'
import { formatDate } from '@/utils/datetime'

/**
 * Plan detail (Spec §6.3): timeline, institution coverage, activity
 * schedule with execution controls, resource allocation, plan changes and
 * deferrals, approval history and execution tracking. Demo data only.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  Approved: 'active',
  'In Execution': 'fieldwork',
  Completed: 'completed',
  Deferred: 'reporting',
  Cancelled: 'closed',
  Planned: 'planning',
  'In Progress': 'fieldwork',
}

const ACTIVITY_TYPES: PlanActivityType[] = [
  'Comprehensive examination',
  'Targeted examination',
  'Thematic review',
  'Off-site review',
  'Follow-up visit',
  'Risk assessment',
  'Management meeting',
]

const PRIORITY_BAR: Record<Priority, string> = {
  Critical: 'bg-error',
  High: 'bg-warning',
  Medium: 'bg-accent',
  Low: 'bg-success',
}

const MS_DAY = 86_400_000

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-plans')
  const canApprove = can(actor.actorRole, 'approve-plans')

  const [plan, setPlan] = useState<SupervisoryPlanDetail | null | undefined>(undefined)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string; leadName: string }>>([])
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deferTarget, setDeferTarget] = useState<PlanActivity | null>(null)
  const [deferReason, setDeferReason] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState('')

  // Add-activity form state
  const [actType, setActType] = useState<PlanActivityType>('Targeted examination')
  const [actTitle, setActTitle] = useState('')
  const [actInstIds, setActInstIds] = useState<string[]>([])
  const [actTeamId, setActTeamId] = useState('')
  const [actEffort, setActEffort] = useState('10')
  const [actStart, setActStart] = useState('')
  const [actEnd, setActEnd] = useState('')
  const [actPriority, setActPriority] = useState<Priority>('Medium')

  const load = useCallback(async () => {
    if (!planId) return
    const [found, instPage, teamList] = await Promise.all([
      planService.getById(planId),
      institutionService.list({ page: 1, pageSize: 200 }),
      institutionService.listTeams(),
    ])
    setPlan(found ?? null)
    setInstitutions(instPage.items)
    setTeams(teamList)
  }, [planId])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const timeline = useMemo(() => {
    if (!plan || plan.activities.length === 0) return null
    const starts = plan.activities.map((a) => Date.parse(a.startDate))
    const ends = plan.activities.map((a) => Date.parse(a.endDate))
    const min = Math.min(...starts) - 7 * MS_DAY
    const max = Math.max(...ends) + 7 * MS_DAY
    const span = Math.max(1, max - min)
    const months: Date[] = []
    const cursor = new Date(min)
    cursor.setDate(1)
    while (cursor.getTime() <= max) {
      months.push(new Date(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return { min, span, months }
  }, [plan])

  if (plan === undefined) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  if (plan === null) {
    return (
      <div>
        <PageHeader title="Plan not found" />
        <ErrorState
          title="Unknown supervisory plan"
          message={`No plan with id "${planId}" exists in the demo dataset. It may have been created in a prototype session that was reset.`}
          onRetry={() => navigate('/app/supervisory-plans')}
          retryLabel="Back to plans"
        />
      </div>
    )
  }

  const p = plan

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await load()
      toast.success('Demo action completed', `${label} — saved in prototype session.`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', `${label} could not be completed in the prototype.`)
    } finally {
      setBusy(false)
    }
  }

  const handleAddActivity = () => {
    const team = teams.find((t) => t.id === actTeamId)
    if (!actTitle.trim() || !team || actInstIds.length === 0 || !actStart || !actEnd || actEnd <= actStart) {
      toast.error('Check the form', 'Title, team, at least one institution and a valid date range are required.')
      return
    }
    setAddOpen(false)
    void runAction(`Activity "${actTitle}" added`, () =>
      planService.addActivity(
        p.id,
        {
          type: actType,
          title: actTitle.trim(),
          institutionIds: actInstIds,
          teamId: team.id,
          teamName: team.name,
          effortDays: Number(actEffort) || 0,
          startDate: actStart,
          endDate: actEnd,
          priority: actPriority,
        },
        actor,
      ),
    )
    setActTitle('')
    setActInstIds([])
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {p.name}
            <StatusBadge status={p.status} tone={STATUS_TONES[p.status]} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              {p.year} · {p.cycle}
              {p.quarter ? ` · ${p.quarter}` : ''} · lead {p.leadName}
            </span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo plan
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Supervisory Plans', path: '/app/supervisory-plans' }, { label: p.name }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/app/supervisory-plans')}>
              Plans
            </Button>
            {canManage && p.status !== 'Completed' && (
              <Button variant="outline" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                Add activity
              </Button>
            )}
            {p.status === 'Draft' && canManage && (
              <Button
                variant="primary"
                iconLeft={<ArrowUpRight className="h-4 w-4" />}
                loading={busy}
                onClick={() => void runAction('Plan submitted for approval', () => planService.submitForApproval(p.id, actor))}
              >
                Submit for approval
              </Button>
            )}
            {p.status === 'Draft' && canApprove && (
              <>
                <Button variant="warning" iconLeft={<RotateCcw className="h-4 w-4" />} onClick={() => setReturnOpen(true)}>
                  Return
                </Button>
                <Button variant="success" iconLeft={<Check className="h-4 w-4" />} onClick={() => setConfirmApprove(true)}>
                  Approve plan
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Execution tracking */}
        <Card>
          <CardHeader title="Execution tracking" subtitle={`${p.completedActivities} of ${p.plannedActivities} planned activities complete.`} />
          <CardBody className="flex items-center gap-5">
            <ProgressRing value={p.executionPct} label="Plan execution" />
            <div className="flex flex-col gap-2 text-xs">
              <p className="text-ink-secondary">
                <span className="font-semibold text-ink">{p.activities.filter((a) => a.status === 'In Progress').length}</span> in progress
              </p>
              <p className="text-ink-secondary">
                <span className="font-semibold text-ink">{p.activities.filter((a) => a.status === 'Planned').length}</span> planned
              </p>
              <p className="text-ink-secondary">
                <span className="font-semibold text-warning">{p.activities.filter((a) => a.status === 'Deferred').length}</span> deferred
              </p>
              <p className="text-[10px] text-ink-secondary">
                Headline figures track the full {p.year} programme; the schedule below shows the demo extract.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Institution coverage */}
        <Card>
          <CardHeader title="Institution coverage" subtitle={`${p.institutionIds.length} institutions in scope.`} />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {p.institutionIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="cursor-pointer rounded-full border border-line bg-page px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-primary-surface hover:text-primary"
                  onClick={() => navigate(`/app/institutions/${id}`)}
                >
                  {instById.get(id)?.tradingName ?? id}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-secondary">{p.coverageNote}</p>
          </CardBody>
        </Card>

        {/* Resource allocation */}
        <Card>
          <CardHeader title="Resource allocation" subtitle="Estimated supervisory effort per team (demo person-days)." />
          <CardBody>
            {p.resourceAllocation.length === 0 ? (
              <p className="text-xs text-ink-secondary">No team allocations recorded yet (demo).</p>
            ) : (
              <div className="flex flex-col gap-3">
                {p.resourceAllocation.map((r) => (
                  <div key={r.teamId}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{r.teamName}</span>
                      <span className="text-ink-secondary">
                        {r.allocatedDays} days · {r.utilisationPct}% utilised
                      </span>
                    </div>
                    <ProgressBar
                      value={r.utilisationPct}
                      tone={r.utilisationPct > 85 ? 'warning' : 'primary'}
                      label={`${r.teamName} utilisation`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Timeline */}
        <Card className="xl:col-span-3">
          <CardHeader title="Timeline" subtitle="Activity schedule across the plan window (demo Gantt view)." />
          <CardBody>
            {timeline === null ? (
              <p className="text-xs text-ink-secondary">No activities scheduled yet.</p>
            ) : (
              <div>
                <div className="ml-44 flex text-[9px] text-ink-secondary">
                  {timeline.months.map((m, i) => (
                    <span
                      key={m.toISOString()}
                      className="border-l border-line pl-1"
                      style={{
                        width: `${((i === timeline.months.length - 1
                          ? timeline.min + timeline.span - m.getTime()
                          : timeline.months[i + 1].getTime() - m.getTime()) /
                          timeline.span) *
                          100}%`,
                      }}
                    >
                      {m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex flex-col gap-1.5">
                  {p.activities.map((a) => {
                    const start = Date.parse(a.startDate)
                    const width = Math.max(1.5, ((Date.parse(a.endDate) - start + MS_DAY) / timeline.span) * 100)
                    const left = ((start - timeline.min) / timeline.span) * 100
                    return (
                      <div key={a.id} className="flex items-center gap-2">
                        <span className="w-44 shrink-0 truncate text-right text-[10px] text-ink-secondary" title={a.title}>
                          {a.title}
                        </span>
                        <div className="relative h-4 flex-1 rounded bg-page">
                          <div
                            role="img"
                            aria-label={`${a.title}: ${formatDate(a.startDate)} to ${formatDate(a.endDate)}, ${a.status}`}
                            title={`${a.title} · ${a.teamName} · ${formatDate(a.startDate)} → ${formatDate(a.endDate)} · ${a.status}`}
                            className={cx(
                              'absolute top-0.5 h-3 rounded-full opacity-90',
                              a.status === 'Completed' ? 'bg-success' : a.status === 'Deferred' ? 'bg-gray-400' : a.status === 'Cancelled' ? 'bg-gray-300' : PRIORITY_BAR[a.priority],
                            )}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[10px] text-ink-secondary">
                  Bar colour = priority (completed work shows green; deferred grey). Hover a bar for dates and team.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Activity schedule */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Activity schedule"
            subtitle="Planned supervisory activity with effort, priority and execution state."
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="overline border-b border-line bg-page">
                    <th className="px-5 py-2.5">Activity</th>
                    <th className="px-3 py-2.5">Institutions</th>
                    <th className="px-3 py-2.5">Team / effort</th>
                    <th className="px-3 py-2.5">Dates</th>
                    <th className="px-3 py-2.5">Priority</th>
                    <th className="px-3 py-2.5">Status</th>
                    {canManage && <th className="px-3 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {p.activities.map((a) => (
                    <tr key={a.id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink">{a.title}</p>
                        <p className="text-[10px] text-ink-secondary">
                          {a.type}
                          {a.examinationRef ? ` · ${a.examinationRef}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {a.institutionIds.map((id) => instById.get(id)?.tradingName ?? id).join(', ')}
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {a.teamName}
                        <span className="block text-[10px]">{a.effortDays} person-days (demo)</span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {formatDate(a.startDate)} → {formatDate(a.endDate)}
                      </td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={a.priority} /></td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={a.status} tone={STATUS_TONES[a.status]} />
                        {(a.status === 'In Progress' || a.status === 'Completed') && (
                          <ProgressBar value={a.progressPct} className="mt-1 w-16" label={`${a.title} progress`} />
                        )}
                        {a.status === 'Deferred' && a.deferralReason && (
                          <p className="mt-1 max-w-40 text-[9px] text-warning">{a.deferralReason}</p>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1">
                            {a.status === 'Planned' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Start ${a.title}`}
                                title="Mark in progress"
                                onClick={() => void runAction(`"${a.title}" started`, () => planService.updateActivityStatus(p.id, a.id, 'In Progress', 10, actor))}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(a.status === 'Planned' || a.status === 'In Progress') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Complete ${a.title}`}
                                  title="Mark completed"
                                  onClick={() => void runAction(`"${a.title}" completed`, () => planService.updateActivityStatus(p.id, a.id, 'Completed', 100, actor))}
                                >
                                  <Check className="h-3.5 w-3.5 text-success" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Defer ${a.title}`}
                                  title="Defer with reason"
                                  onClick={() => {
                                    setDeferTarget(a)
                                    setDeferReason('')
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-warning" />
                                </Button>
                              </>
                            )}
                            {a.status === 'Deferred' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Cancel ${a.title}`}
                                title="Cancel activity"
                                onClick={() => void runAction(`"${a.title}" cancelled`, () => planService.updateActivityStatus(p.id, a.id, 'Cancelled', a.progressPct, actor, 'Cancelled in the prototype session.'))}
                              >
                                <Ban className="h-3.5 w-3.5 text-error" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.activities.length === 0 && (
              <p className="px-5 py-4 text-xs text-ink-secondary">No activities in this plan yet.</p>
            )}
          </CardBody>
        </Card>

        {/* Changes & approvals */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Plan changes & deferrals" />
            <CardBody>
              {p.changes.length === 0 ? (
                <p className="text-xs text-ink-secondary">No changes recorded (demo).</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {p.changes.map((c) => (
                    <li key={c.id} className="rounded-lg border border-line p-2.5">
                      <p className="flex items-center gap-2 text-[11px] font-semibold text-ink">
                        <StatusBadge status={c.type} tone={c.type === 'Deferral' ? 'reporting' : c.type === 'Addition' ? 'active' : 'draft'} />
                        <span className="font-normal text-ink-secondary">{formatDate(c.at)}</span>
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{c.description}</p>
                      <p className="mt-1 text-[10px] text-ink-tertiary">{c.byName}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Approval history" />
            <CardBody>
              <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
                {p.approvalHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-card',
                        h.action === 'Approved' ? 'bg-success' : h.action === 'Returned' ? 'bg-error' : 'bg-primary',
                      )}
                    />
                    <p className="text-[11px] font-semibold text-ink">
                      {h.action}
                      <span className="ml-1.5 font-normal text-ink-secondary">{h.actorName} · {formatDate(h.at)}</span>
                    </p>
                    {h.comment && <p className="mt-0.5 text-[10px] leading-relaxed text-ink-secondary">{h.comment}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add activity modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add supervisory activity" size="lg">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Activity type"
              value={actType}
              onChange={(e) => setActType(e.target.value as PlanActivityType)}
              options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <TextInput
              label="Title"
              required
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              placeholder="e.g. Thematic review of agent-network controls"
            />
            <TextInput label="Start date" required type="date" value={actStart} onChange={(e) => setActStart(e.target.value)} />
            <TextInput label="End date" required type="date" value={actEnd} onChange={(e) => setActEnd(e.target.value)} error={actStart && actEnd && actEnd <= actStart ? 'End must be after start.' : undefined} />
            <Select
              label="Responsible team"
              required
              value={actTeamId}
              onChange={(e) => setActTeamId(e.target.value)}
              placeholder="Select a team…"
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Effort (person-days)"
                required
                type="number"
                min={1}
                value={actEffort}
                onChange={(e) => setActEffort(e.target.value)}
              />
              <Select
                label="Priority"
                value={actPriority}
                onChange={(e) => setActPriority(e.target.value as Priority)}
                options={['Critical', 'High', 'Medium', 'Low'].map((x) => ({ value: x, label: x }))}
              />
            </div>
          </div>
          <fieldset>
            <legend className="overline">Institutions covered</legend>
            <div className="mt-1 grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {institutions.map((inst) => (
                <Checkbox
                  key={inst.id}
                  label={inst.tradingName}
                  checked={actInstIds.includes(inst.id)}
                  onChange={(e) =>
                    setActInstIds((prev) => (e.target.checked ? [...prev, inst.id] : prev.filter((x) => x !== inst.id)))
                  }
                />
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddActivity} disabled={busy}>
              Add activity
            </Button>
          </div>
        </div>
      </Modal>

      {/* Defer modal */}
      <Modal open={deferTarget !== null} onClose={() => setDeferTarget(null)} title={`Defer "${deferTarget?.title ?? ''}"`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Deferral reason"
            required
            rows={3}
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value)}
            placeholder="Recorded on the plan's change log (demo)."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeferTarget(null)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={deferReason.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const target = deferTarget
                const reason = deferReason
                setDeferTarget(null)
                if (target) {
                  void runAction(`"${target.title}" deferred`, () =>
                    planService.updateActivityStatus(p.id, target.id, 'Deferred', target.progressPct, actor, reason),
                  )
                }
              }}
            >
              Defer activity
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Return plan for revision" size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Return comment"
            required
            rows={3}
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            placeholder="What must the plan lead revise? (demo)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={returnComment.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setReturnOpen(false)
                const comment = returnComment
                setReturnComment('')
                void runAction('Plan returned', () => planService.returnPlan(p.id, actor, comment))
              }}
            >
              Return plan
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmApprove}
        variant="success"
        title={`Approve "${p.name}"?`}
        message={
          <span>
            Approving moves the plan to <strong>Approved</strong> with {p.plannedActivities} planned
            activities across {p.institutionIds.length} institutions. Recorded in the approval
            history for this prototype session (demo).
          </span>
        }
        confirmLabel="Approve plan"
        loading={busy}
        onConfirm={() => {
          setConfirmApprove(false)
          void runAction('Plan approved', () => planService.approve(p.id, actor))
        }}
        onClose={() => setConfirmApprove(false)}
      />
    </div>
  )
}
