import { beforeEach, describe, expect, it } from 'vitest'
import { findingService } from '@/services/mock/MockFindingService'
import { remediationService } from '@/services/mock/MockRemediationService'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { FINDINGS } from '@/mocks/fixtures/supervision.fixture'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { ActorContext } from '@/types/common'
import type { DemoRole } from '@/types/auth'

/**
 * Role gating for finding approval (Spec §7.7/§19) and remediation closure
 * (Spec §7.8 hard rule: institution users can never close a supervisory
 * finding — only authorised regulator roles may approve closure).
 */

const actor = (role: DemoRole, name = 'Test User'): ActorContext => ({
  actorId: `test-${role}`,
  actorName: name,
  actorRole: role,
})

const findingByRef = (ref: string) => FINDINGS.find((f) => f.reference === ref)!

describe('Finding approval role gating (§19)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('an examiner cannot approve a finding even after submitting it', async () => {
    const fnd = findingByRef('FND-2026-109') // Draft in the seeded story
    const examiner = actor('examiner', 'Nkechi Balogun')

    // Examiner may submit for review…
    const submitted = await findingService.submitForReview(fnd.id, examiner)
    expect(submitted?.status).toBe('Under Review')

    // …but approval is refused with a demo permission error.
    await expect(findingService.approve(fnd.id, examiner)).rejects.toBeInstanceOf(DemoPermissionError)
    const still = await findingService.getById(fnd.id)
    expect(still?.status).toBe('Under Review')
  })

  it('a principal examiner (review tier, canApprove=false) also cannot approve', async () => {
    const fnd = findingByRef('FND-2026-107') // Under Review in the seeded story
    await expect(
      findingService.approve(fnd.id, actor('principal-examiner', 'Chuka Eze')),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('the Director of Supervision can approve the same finding', async () => {
    const fnd = findingByRef('FND-2026-107')
    const director = actor('director-of-supervision', 'Amara Osei')

    const approved = await findingService.approve(fnd.id, director, 'Severity endorsed (demo).')
    expect(approved?.status).toBe('Confirmed')
    expect(approved?.reviewerName).toBe('Amara Osei')

    const detail = await findingService.getById(fnd.id)
    const last = detail?.approvalTrail.at(-1)
    expect(last?.decision).toBe('Approved')
    expect(last?.actorRoleLabel).toBe('Director of Supervision')
  })

  it('an institution role can respond but never approve or close', async () => {
    const fnd = findingByRef('FND-2026-104') // Confirmed
    const instAdmin = actor('institution-administrator', 'Grace Mbeki')

    const responded = await findingService.addManagementResponse(
      fnd.id,
      {
        respondedByName: 'Grace Mbeki',
        respondedByOrg: 'Meridian Commercial Bank (demo)',
        at: new Date().toISOString(),
        position: 'Accepted',
        responseText: 'The bank accepts the finding (demo response).',
      },
      instAdmin,
    )
    expect(responded?.managementResponses).toHaveLength(1)

    await expect(findingService.approve(fnd.id, instAdmin)).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(findingService.close(fnd.id, instAdmin, 'attempted self-closure')).rejects.toBeInstanceOf(
      DemoPermissionError,
    )
  })
})

describe('Remediation closure gating (§7.8)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('institution roles can update remediation but can NEVER close it', async () => {
    const cap = await remediationService.getByReference('CAP-2026-005') // Validated, ready for closure
    expect(cap).toBeDefined()
    const instAdmin = actor('institution-administrator', 'Ngozi Emenike')

    // Institution side may post progress updates…
    const updated = await remediationService.addUpdate(cap!.id, 'Final evidence pack refreshed (demo).', 100, instAdmin)
    expect(updated).toBeDefined()

    // …but every closure path is refused.
    await expect(
      remediationService.decideClosure(cap!.id, true, 'institution self-closure attempt', instAdmin),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      remediationService.validate(cap!.id, true, 'institution self-validation attempt', instAdmin),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const after = await remediationService.getByReference('CAP-2026-005')
    expect(after?.closure).toBeUndefined()
    expect(after?.status).not.toBe('Closed')
  })

  it('an authorised regulator role can approve closure, closing the linked finding too', async () => {
    const cap = await remediationService.getByReference('CAP-2026-005')
    const director = actor('director-of-supervision', 'Amara Osei')

    const closed = await remediationService.decideClosure(
      cap!.id,
      true,
      'Remediation evidenced and validated; closure approved (demo).',
      director,
    )
    expect(closed?.status).toBe('Closed')
    expect(closed?.closure?.decision).toBe('Closed')
    expect(closed?.closure?.decidedByRoleLabel).toBe('Director of Supervision')

    // The linked finding FND-2026-044 is closed by the same decision.
    const fnd = await findingService.getByReference('FND-2026-044')
    expect(fnd?.status).toBe('Closed')
  })

  it('a regulator role without close-remediation (examiner) is also refused', async () => {
    const cap = await remediationService.getByReference('CAP-2026-005')
    await expect(
      remediationService.decideClosure(cap!.id, true, 'not authorised', actor('examiner')),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})
