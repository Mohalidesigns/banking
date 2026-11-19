import { beforeEach, describe, expect, it } from 'vitest'
import { earlyWarningService, surveillanceService } from '@/services/mock/MockSurveillanceService'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { surveillanceRepository } from '@/mocks/repositories/surveillanceRepository'
import { ALERT_ID_BY_REF } from '@/mocks/fixtures/storyRefs'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { ActorContext } from '@/types/common'
import type { DemoRole } from '@/types/auth'

/**
 * Early-warning alert flows and role gating (Spec §6.1/§6.4, §19):
 * acknowledge → assign → assess → escalate/dismiss transitions, conversion
 * to a supervisory action with decision-history recording, and analyst
 * review creation. `manage-alerts` (analyst tier and above) gates every
 * mutation; examiner/read-only/institution roles are refused.
 */

const actor = (role: DemoRole, name = 'Test User'): ActorContext => ({
  actorId: `test-${role}`,
  actorName: name,
  actorRole: role,
})

const ANALYST = actor('prudential-analyst', 'Fatima Bello')
const LEAD = actor('supervisory-team-lead', 'Amara Osei')
const EXAMINER = actor('examiner', 'Samuel Ike')
const READ_ONLY = actor('read-only-supervisor', 'Robin Vale')
const INST_ADMIN = actor('institution-administrator', 'Grace Mbeki')

const LCR_ALERT = ALERT_ID_BY_REF['EWA-2026-011'] // Northstar, Open
const NPL_ALERT = ALERT_ID_BY_REF['EWA-2026-013'] // Meridian, Acknowledged

describe('Early-warning alert workflow (§6.4)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('acknowledge moves an Open alert to Acknowledged and records history', async () => {
    const updated = await earlyWarningService.acknowledge(LCR_ALERT, ANALYST)
    expect(updated?.status).toBe('Acknowledged')
    expect(updated?.escalationHistory.at(-1)?.action).toBe('Acknowledged')
    expect(updated?.escalationHistory.at(-1)?.byName).toBe('Fatima Bello')
  })

  it('assign sets the analyst and adds an Assigned history entry', async () => {
    const updated = await earlyWarningService.assign(LCR_ALERT, 'Aisha Yusuf', LEAD)
    expect(updated?.assignedToName).toBe('Aisha Yusuf')
    expect(updated?.escalationHistory.at(-1)?.action).toBe('Assigned')
  })

  it('add assessment appends to the analyst assessment list', async () => {
    const before = await earlyWarningService.getById(LCR_ALERT)
    const updated = await earlyWarningService.addAssessment(
      LCR_ALERT,
      'Deposit outflows concentrated in two corporates; weekly flash reporting requested (demo).',
      ANALYST,
    )
    expect(updated?.assessments.length).toBe((before?.assessments.length ?? 0) + 1)
    expect(updated?.assessments.at(-1)?.authorName).toBe('Fatima Bello')
  })

  it('escalate moves the alert to Escalated and records a supervisory decision', async () => {
    const alert = await earlyWarningService.getById(NPL_ALERT)
    const updated = await earlyWarningService.escalate(NPL_ALERT, 'Director attention requested (demo).', LEAD)
    expect(updated?.status).toBe('Escalated')

    const decisions = await surveillanceService.listDecisions(alert?.institutionId)
    expect(decisions.some((d) => d.action === 'Alert escalated' && d.detail.includes('EWA-2026-013'))).toBe(true)
  })

  it('dismiss requires a reason and stores it on the alert', async () => {
    const updated = await earlyWarningService.dismiss(NPL_ALERT, 'Indicator normalised after portfolio clean-up (demo).', LEAD)
    expect(updated?.status).toBe('Dismissed')
    expect(updated?.dismissedReason).toContain('normalised')
    // A dismissed alert can no longer be escalated.
    const again = await earlyWarningService.escalate(NPL_ALERT, 'late escalation', LEAD)
    expect(again).toBeUndefined()
  })

  it('convert to supervisory action links an examination and records the Journey-B decision', async () => {
    const updated = await earlyWarningService.linkExamination(
      NPL_ALERT,
      { reference: 'EXM-2026-099', id: 'demo-exam-id', status: 'Planned' },
      LEAD,
    )
    expect(updated?.linkedExamination?.reference).toBe('EXM-2026-099')
    expect(updated?.escalationHistory.at(-1)?.action).toBe('Converted to supervisory action')

    const alert = await earlyWarningService.getById(NPL_ALERT)
    const decisions = await surveillanceService.listDecisions(alert?.institutionId)
    expect(
      decisions.some((d) => d.action === 'Targeted examination initiated' && d.detail.includes('EXM-2026-099')),
    ).toBe(true)
  })

  it('every alert mutation is refused without manage-alerts (§19)', async () => {
    for (const denied of [EXAMINER, READ_ONLY, INST_ADMIN]) {
      await expect(earlyWarningService.acknowledge(LCR_ALERT, denied)).rejects.toBeInstanceOf(DemoPermissionError)
      await expect(earlyWarningService.assign(LCR_ALERT, 'Anyone', denied)).rejects.toBeInstanceOf(DemoPermissionError)
      await expect(earlyWarningService.escalate(LCR_ALERT, 'nope', denied)).rejects.toBeInstanceOf(DemoPermissionError)
      await expect(earlyWarningService.dismiss(LCR_ALERT, 'nope', denied)).rejects.toBeInstanceOf(DemoPermissionError)
    }
    // The story alert is untouched by the refused attempts.
    const still = await earlyWarningService.getById(LCR_ALERT)
    expect(still?.status).toBe('Open')
  })
})

describe('Analyst reviews and supervisory decisions (§6.1)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('create analyst review (create-analyst-review tier) and record a decision', async () => {
    const review = await surveillanceService.createAnalystReview(
      {
        institutionId: (await earlyWarningService.getById(LCR_ALERT))!.institutionId,
        periodLabel: 'October 2026',
        trigger: 'EWA-2026-011 liquidity amber',
        assessment: 'Sustained amber LCR with rising outflows (demo).',
        recommendation: 'Weekly flash reporting and targeted examination.',
      },
      ANALYST,
    )
    expect(review.reference).toMatch(/^ARV-2026-\d{3}$/)
    expect(review.status).toBe('Submitted')
    expect(review.analystName).toBe('Fatima Bello')

    const actioned = await surveillanceService.recordReviewDecision(
      review.id,
      'Targeted examination initiated — EXM-2026-024',
      'Approved (demo).',
      LEAD,
    )
    expect(actioned?.status).toBe('Actioned')
    expect(actioned?.decision?.byName).toBe('Amara Osei')
  })

  it('examiner and institution roles cannot create analyst reviews', async () => {
    const input = {
      institutionId: (await earlyWarningService.getById(LCR_ALERT))!.institutionId,
      periodLabel: 'October 2026',
      trigger: 'test',
      assessment: 'test',
      recommendation: 'test',
    }
    await expect(surveillanceService.createAnalystReview(input, EXAMINER)).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(surveillanceService.createAnalystReview(input, INST_ADMIN)).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('request-clarification decisions land in the institution decision history', async () => {
    const alert = await earlyWarningService.getById(LCR_ALERT)
    await surveillanceService.recordDecision(
      alert!.institutionId,
      'Clarification requested',
      'Explain the HQLA decline in MPR-04 October (demo).',
      ANALYST,
    )
    const decisions = surveillanceRepository.decisionsFor(alert!.institutionId)
    expect(decisions[0].action).toBe('Clarification requested')
    expect(decisions[0].detail).toContain('HQLA')
  })
})
