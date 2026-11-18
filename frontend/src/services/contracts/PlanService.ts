import type { ActorContext } from '@/types/common'
import type {
  PlanActivity,
  PlanActivityStatus,
  PlanActivityType,
  PlanCycle,
  SupervisoryPlanDetail,
} from '@/types/supervision'

/**
 * Supervisory plans contract (Spec §6.3, §18.3). Annual/quarterly/
 * event-driven plans, activity scheduling and execution tracking, deferrals
 * with recorded reasons, and the submit → approve lifecycle. Management
 * requires `manage-plans`; approval `approve-plans` (assistant director+).
 */
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
    /** ISO 8601 */
    startDate: string
    endDate: string
    priority: PlanActivity['priority']
  }>
  submit: boolean
}

export interface PlanService {
  list(): Promise<SupervisoryPlanDetail[]>
  getById(id: string): Promise<SupervisoryPlanDetail | undefined>
  create(input: CreatePlanInput, actor: ActorContext): Promise<SupervisoryPlanDetail>
  addActivity(
    planId: string,
    activity: Omit<PlanActivity, 'id' | 'status' | 'progressPct'>,
    actor: ActorContext,
  ): Promise<SupervisoryPlanDetail | undefined>
  updateActivityStatus(
    planId: string,
    activityId: string,
    status: PlanActivityStatus,
    progressPct: number | undefined,
    actor: ActorContext,
    note?: string,
  ): Promise<SupervisoryPlanDetail | undefined>
  recordChange(planId: string, type: 'Change' | 'Deferral' | 'Addition', description: string, actor: ActorContext): Promise<SupervisoryPlanDetail | undefined>
  submitForApproval(planId: string, actor: ActorContext): Promise<SupervisoryPlanDetail | undefined>
  approve(planId: string, actor: ActorContext, comment?: string): Promise<SupervisoryPlanDetail | undefined>
  returnPlan(planId: string, actor: ActorContext, comment: string): Promise<SupervisoryPlanDetail | undefined>
}
