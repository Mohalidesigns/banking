import { planRepository } from '@/mocks/repositories/planRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import type { ActorContext } from '@/types/common'
import type {
  PlanActivity,
  PlanActivityStatus,
  SupervisoryPlanDetail,
} from '@/types/supervision'
import type {
  CreatePlanInput,
  PlanService,
} from '@/services/contracts/PlanService'
import { assertCan, assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'

/**
 * Mock supervisory plan service (Spec §6.3). Plan management requires
 * `manage-plans`; approval/return require `approve-plans` (assistant
 * director and above in the demo matrix). Prototype-session state only.
 */
class MockPlanService implements PlanService {
  async list(): Promise<SupervisoryPlanDetail[]> {
    await latency()
    return planRepository.list().sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))
  }

  async getById(id: string): Promise<SupervisoryPlanDetail | undefined> {
    await latency()
    return planRepository.getById(id)
  }

  async create(input: CreatePlanInput, actor: ActorContext): Promise<SupervisoryPlanDetail> {
    assertCan(actor, 'manage-plans')
    await latency()
    const created = planRepository.create(input, actor)
    notificationRepository.push({
      category: input.submit ? 'approval-required' : 'task-assigned',
      severity: 'info',
      title: `Supervisory plan ${created.name} ${input.submit ? 'submitted for approval' : 'saved as draft'}`,
      body: `${created.activities.length} activities planned (prototype session, demo notification).`,
      link: `/app/supervisory-plans/${created.id}`,
    })
    return created
  }

  async addActivity(
    planId: string,
    activity: Omit<PlanActivity, 'id' | 'status' | 'progressPct'>,
    actor: ActorContext,
  ): Promise<SupervisoryPlanDetail | undefined> {
    assertCan(actor, 'manage-plans')
    await latency()
    return planRepository.addActivity(planId, activity, actor)
  }

  async updateActivityStatus(
    planId: string,
    activityId: string,
    status: PlanActivityStatus,
    progressPct: number | undefined,
    actor: ActorContext,
    note?: string,
  ): Promise<SupervisoryPlanDetail | undefined> {
    assertCan(actor, 'manage-plans')
    await latency()
    return planRepository.updateActivityStatus(planId, activityId, status, progressPct, actor, note)
  }

  async recordChange(planId: string, type: 'Change' | 'Deferral' | 'Addition', description: string, actor: ActorContext): Promise<SupervisoryPlanDetail | undefined> {
    assertCan(actor, 'manage-plans')
    await latency()
    return planRepository.recordChange(planId, type, description, actor)
  }

  async submitForApproval(planId: string, actor: ActorContext): Promise<SupervisoryPlanDetail | undefined> {
    assertCan(actor, 'manage-plans')
    await latency()
    const updated = planRepository.submitForApproval(planId, actor)
    if (updated) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Plan "${updated.name}" awaiting approval`,
        body: `Submitted by ${actor.actorName} (demo notification).`,
        link: `/app/supervisory-plans/${updated.id}`,
      })
    }
    return updated
  }

  async approve(planId: string, actor: ActorContext, comment?: string): Promise<SupervisoryPlanDetail | undefined> {
    assertRegulator(actor, 'approve-plans')
    await latency()
    const updated = planRepository.approve(planId, actor, comment)
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Plan "${updated.name}" approved`,
        body: `Approved by ${actor.actorName} (demo notification).`,
        link: `/app/supervisory-plans/${updated.id}`,
      })
    }
    return updated
  }

  async returnPlan(planId: string, actor: ActorContext, comment: string): Promise<SupervisoryPlanDetail | undefined> {
    assertRegulator(actor, 'approve-plans')
    await latency()
    return planRepository.returnPlan(planId, actor, comment)
  }
}

export const planService: PlanService = new MockPlanService()
