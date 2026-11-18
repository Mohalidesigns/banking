/**
 * Mock supervisory plan repository (Spec §6.3, §17.4). Owns the mutable
 * plan lifecycle: creation wizard output, activity scheduling/status,
 * deferrals with recorded reasons, plan changes and the approval history.
 * `base()` keeps the Phase-2A Command Centre plan widget live.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import { SUPERVISORY_PLANS } from '@/mocks/fixtures/supervision.fixture'
import { buildPlanDetail } from '@/mocks/fixtures/planDetail.fixture'
import type { ActorContext, Priority } from '@/types/common'
import type {
  PlanActivity,
  PlanActivityStatus,
  PlanActivityType,
  PlanCycle,
  SupervisoryPlan,
  SupervisoryPlanDetail,
} from '@/types/supervision'

const clone = (p: SupervisoryPlanDetail): SupervisoryPlanDetail => ({
  ...p,
  institutionIds: [...p.institutionIds],
  activities: p.activities.map((a) => ({ ...a, institutionIds: [...a.institutionIds] })),
  resourceAllocation: p.resourceAllocation.map((r) => ({ ...r })),
  changes: p.changes.map((c) => ({ ...c })),
  approvalHistory: p.approvalHistory.map((h) => ({ ...h })),
})

const records: SupervisoryPlanDetail[] = SUPERVISORY_PLANS.map((p, i) => buildPlanDetail(i, p))

const eventId = (): string => `pln-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const byId = (id: string): SupervisoryPlanDetail | undefined => records.find((p) => p.id === id)

const toBase = (p: SupervisoryPlanDetail): SupervisoryPlan => ({
  id: p.id,
  year: p.year,
  name: p.name,
  jurisdictionId: p.jurisdictionId,
  status: p.status,
  plannedActivities: p.plannedActivities,
  completedActivities: p.completedActivities,
  executionPct: p.executionPct,
  leadName: p.leadName,
  institutionIds: [...p.institutionIds],
})

const syncExecution = (p: SupervisoryPlanDetail): void => {
  // Wizard-created plans track their full activity list; seeded plans show a
  // headline extract, so their completedActivities is maintained by delta in
  // updateActivityStatus and only recomputed here for created plans.
  if (p.plannedActivities === p.activities.length) {
    p.completedActivities = p.activities.filter((a) => a.status === 'Completed').length
  }
  p.executionPct = p.plannedActivities > 0 ? Math.round((p.completedActivities / p.plannedActivities) * 100) : 0
}

export interface CreatePlanInput {
  name: string
  year: number
  cycle: PlanCycle
  quarter?: string
  jurisdictionId: string
  leadName: string
  institutionIds: string[]
  coverageNote: string
  activities: Array<{
    type: PlanActivityType
    title: string
    institutionIds: string[]
    teamId: string
    teamName: string
    effortDays: number
    startDate: string
    endDate: string
    priority: Priority
  }>
  submit: boolean
}

export const planRepository = {
  list(): SupervisoryPlanDetail[] {
    return records.map(clone)
  },

  base(): SupervisoryPlan[] {
    return records.map(toBase)
  },

  getById(id: string): SupervisoryPlanDetail | undefined {
    const p = byId(id)
    return p ? clone(p) : undefined
  },

  create(input: CreatePlanInput, actor: ActorContext): SupervisoryPlanDetail {
    const created: SupervisoryPlanDetail = {
      id: demoUuid(88, records.length + 1),
      year: input.year,
      name: input.name,
      jurisdictionId: input.jurisdictionId,
      status: 'Draft',
      plannedActivities: input.activities.length,
      completedActivities: 0,
      executionPct: 0,
      leadName: input.leadName,
      institutionIds: [...input.institutionIds],
      cycle: input.cycle,
      quarter: input.quarter,
      activities: input.activities.map((a) => ({
        ...a,
        id: eventId(),
        institutionIds: [...a.institutionIds],
        status: 'Planned' as PlanActivityStatus,
        progressPct: 0,
      })),
      resourceAllocation: [],
      changes: [],
      approvalHistory: [
        {
          id: eventId(),
          at: new Date().toISOString(),
          actorName: actor.actorName,
          action: input.submit ? 'Submitted' : 'Amended',
          comment: input.submit
            ? 'Created and submitted for approval in the prototype session.'
            : 'Saved as draft in the prototype session.',
        },
      ],
      coverageNote: input.coverageNote,
    }
    // Derive resource allocation from the activity list (demo rule).
    const byTeam = new Map<string, { teamName: string; days: number }>()
    for (const a of created.activities) {
      const entry = byTeam.get(a.teamId) ?? { teamName: a.teamName, days: 0 }
      entry.days += a.effortDays
      byTeam.set(a.teamId, entry)
    }
    created.resourceAllocation = Array.from(byTeam.entries()).map(([teamId, v]) => ({
      teamId,
      teamName: v.teamName,
      allocatedDays: v.days,
      utilisationPct: Math.min(100, Math.round((v.days / 120) * 100)),
    }))
    records.unshift(created)
    return clone(created)
  },

  addActivity(
    planId: string,
    activity: Omit<PlanActivity, 'id' | 'status' | 'progressPct'>,
    actor: ActorContext,
  ): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p) return undefined
    p.activities.push({ ...activity, institutionIds: [...activity.institutionIds], id: eventId(), status: 'Planned', progressPct: 0 })
    p.plannedActivities += 1
    p.changes.push({
      id: eventId(),
      at: new Date().toISOString(),
      type: 'Addition',
      description: `Activity added: ${activity.title} (prototype session).`,
      byName: actor.actorName,
    })
    syncExecution(p)
    return clone(p)
  },

  updateActivityStatus(
    planId: string,
    activityId: string,
    status: PlanActivityStatus,
    progressPct: number | undefined,
    actor: ActorContext,
    note?: string,
  ): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p) return undefined
    const a = p.activities.find((x) => x.id === activityId)
    if (!a) return undefined
    const wasCompleted = a.status === 'Completed'
    a.status = status
    if (progressPct !== undefined) a.progressPct = progressPct
    if (status === 'Completed') a.progressPct = 100
    if (status === 'Deferred' && note) a.deferralReason = note
    // Seeded plans track more activities than the demo extract; adjust the
    // completed counter by delta so headline execution stats stay coherent.
    if (p.plannedActivities !== p.activities.length) {
      const isCompleted = status === 'Completed'
      if (isCompleted && !wasCompleted) p.completedActivities += 1
      if (!isCompleted && wasCompleted) p.completedActivities = Math.max(0, p.completedActivities - 1)
    }
    if (status === 'Deferred') {
      p.changes.push({
        id: eventId(),
        at: new Date().toISOString(),
        type: 'Deferral',
        description: `Activity deferred: ${a.title}${note ? ` — ${note}` : ''} (prototype session).`,
        byName: actor.actorName,
      })
    }
    if (p.status === 'Approved' && p.activities.some((x) => x.status === 'In Progress')) p.status = 'In Execution'
    syncExecution(p)
    return clone(p)
  },

  recordChange(planId: string, type: 'Change' | 'Deferral' | 'Addition', description: string, actor: ActorContext): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p) return undefined
    p.changes.push({ id: eventId(), at: new Date().toISOString(), type, description, byName: actor.actorName })
    return clone(p)
  },

  submitForApproval(planId: string, actor: ActorContext): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p || p.status !== 'Draft') return undefined
    p.approvalHistory.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Submitted',
      comment: 'Submitted for approval (prototype session).',
    })
    return clone(p)
  },

  approve(planId: string, actor: ActorContext, comment?: string): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p || (p.status !== 'Draft' && p.status !== 'In Execution')) return undefined
    p.status = 'Approved'
    p.approvalHistory.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Approved',
      comment: comment ?? 'Approved in the prototype session (demo).',
    })
    return clone(p)
  },

  returnPlan(planId: string, actor: ActorContext, comment: string): SupervisoryPlanDetail | undefined {
    const p = byId(planId)
    if (!p || p.status !== 'Draft') return undefined
    p.approvalHistory.push({
      id: eventId(),
      at: new Date().toISOString(),
      actorName: actor.actorName,
      action: 'Returned',
      comment,
    })
    return clone(p)
  },

  reset(): void {
    records.length = 0
    SUPERVISORY_PLANS.forEach((p, i) => records.push(buildPlanDetail(i, p)))
  },
}
