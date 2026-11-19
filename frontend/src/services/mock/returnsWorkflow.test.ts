import { beforeEach, describe, expect, it } from 'vitest'
import { returnTemplateService, returnsService } from '@/services/mock/MockReturnsService'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import { STORY } from '@/mocks/fixtures/storyRefs'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { ActorContext } from '@/types/common'
import type { DemoRole } from '@/types/auth'

/**
 * Returns workflow mutations and role gating (Spec §11.1–§11.3, §19):
 * the demo validation engine reproduces the seeded story outcomes
 * (Northstar MPR-04 warnings → EWA-2026-011; Vanguard MPR-09 errors →
 * rejected), review/decision transitions follow the register states, and
 * accept/reject plus template management are refused below their tiers.
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

describe('Returns demo validation engine (§11.3)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('re-running validation on the Northstar liquidity return reproduces the story warnings', async () => {
    const updated = await returnsService.runValidation(STORY.northstarLiquiditySubmissionId, ANALYST)
    expect(updated?.validation).toBe('Warnings')
    expect(updated?.validationResult?.errorCount).toBe(0)
    expect(updated?.validationResult?.warningCount).toBe(2) // LCR amber + top-10 funding concentration
    const codes = (updated?.validationResult?.fieldErrors ?? []).map((e) => e.fieldCode)
    expect(codes).toContain('lcr')
    expect(codes).toContain('top10FundingPct')
  })

  it('flags the Vanguard capital return with errors (CAR minimum + capital reconciliation)', async () => {
    const updated = await returnsService.runValidation(STORY.vanguardCapitalSubmissionId, ANALYST)
    expect(updated?.validation).toBe('Errors')
    const errors = (updated?.validationResult?.fieldErrors ?? []).filter((e) => e.severity === 'Error')
    expect(errors.map((e) => e.fieldCode)).toEqual(expect.arrayContaining(['car', 'totalCapital']))
  })

  it('passes the accepted Meridian asset-quality return', async () => {
    const updated = await returnsService.runValidation(STORY.meridianAssetQualitySubmissionId, ANALYST)
    expect(updated?.validation).toBe('Passed')
    expect(updated?.validationResult?.errorCount).toBe(0)
    expect(updated?.validationResult?.warningCount).toBe(0)
  })

  it('is refused for read-only and examiner roles (review-submission tier, §19)', async () => {
    await expect(
      returnsService.runValidation(STORY.northstarLiquiditySubmissionId, READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      returnsService.runValidation(STORY.northstarLiquiditySubmissionId, EXAMINER),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})

describe('Returns review workflow (§11.1/§11.3)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('analyst starts the review, lead accepts — state transitions and queue complete', async () => {
    // startReview only applies from Awaiting Review; the Crestline QSL-03
    // submission (Submitted, validation Passed) is in that state in the seed.
    const qsl = await returnsService.listSubmissions({ returnCode: 'QSL-03', reviewStatus: 'Awaiting Review' })
    expect(qsl.length).toBeGreaterThan(0)
    const target = qsl[0]

    const started = await returnsService.startReview(target.id, ANALYST)
    expect(started?.reviewStatus).toBe('Under Review')
    expect(started?.status).toBe('In Review')

    const accepted = await returnsService.decide(target.id, 'Accepted', 'Clean pass — accepted (demo).', LEAD)
    expect(accepted?.reviewStatus).toBe('Accepted')
    expect(accepted?.status).toBe('Accepted')
    expect(accepted?.reviewNotes.at(-1)?.decision).toBe('Accepted')

    // Any return-validation queue item for this submission is completed.
    const open = workQueueRepository
      .list()
      .filter((w) => w.type === 'return-validation' && w.relatedRef === target.reference && w.status !== 'Completed')
    expect(open).toHaveLength(0)
  })

  it('an analyst cannot accept/reject — approve-submission is team lead and above (§19)', async () => {
    const qsl = await returnsService.listSubmissions({ returnCode: 'QSL-03', reviewStatus: 'Awaiting Review' })
    const target = qsl[0]
    await expect(
      returnsService.decide(target.id, 'Accepted', 'attempt', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const after = await returnsService.getSubmission(target.id)
    expect(after?.reviewStatus).toBe('Awaiting Review')
  })

  it('rejecting a return records the decision and opens a follow-up queue item', async () => {
    const qsl = await returnsService.listSubmissions({ returnCode: 'QSL-03', reviewStatus: 'Awaiting Review' })
    const target = qsl[0]
    const rejected = await returnsService.decide(
      target.id,
      'Returned for Correction',
      'Figures disagree with the Q3 liquidity series (demo).',
      LEAD,
    )
    expect(rejected?.reviewStatus).toBe('Returned for Correction')

    const queued = workQueueRepository
      .list()
      .filter((w) => w.type === 'return-validation' && w.relatedRef === target.reference && w.status !== 'Completed')
    expect(queued.length).toBeGreaterThan(0)
  })

  it('validation errors push a return-validation work item (My Work wiring)', async () => {
    // No fixture queue item exists for the rejected Vanguard return.
    const before = workQueueRepository
      .list()
      .filter((w) => w.type === 'return-validation' && w.relatedRef === 'SUB-2026-0143')
    expect(before).toHaveLength(0)

    await returnsService.runValidation(STORY.vanguardCapitalSubmissionId, ANALYST) // Errors

    const after = workQueueRepository
      .list()
      .filter((w) => w.type === 'return-validation' && w.relatedRef === 'SUB-2026-0143' && w.status !== 'Completed')
    expect(after).toHaveLength(1)
    expect(after[0].link).toBe(`/app/returns/${STORY.vanguardCapitalSubmissionId}`)
  })
})

describe('Return template designer mutations (§11.2)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('add / reorder / remove a field with manage-return-templates', async () => {
    const defs = await returnTemplateService.listDefinitions()
    const mpr09 = defs.find((d) => d.code === 'MPR-09')!
    const initial = mpr09.fields.length

    const added = await returnTemplateService.addField(
      mpr09.id,
      { code: 'demoBuffer', label: 'Demo capital buffer', section: 'Ratios', type: 'percentage', required: false },
      LEAD,
    )
    expect(added?.fields).toHaveLength(initial + 1)
    const newField = added!.fields.find((f) => f.code === 'demoBuffer')!

    // Duplicate codes are refused (returns undefined — no change).
    const dup = await returnTemplateService.addField(
      mpr09.id,
      { code: 'demoBuffer', label: 'Duplicate', section: 'Ratios', type: 'percentage', required: false },
      LEAD,
    )
    expect(dup).toBeUndefined()

    const moved = await returnTemplateService.moveField(mpr09.id, newField.id, 'up', LEAD)
    const movedField = moved!.fields.find((f) => f.code === 'demoBuffer')!
    expect(movedField.order).toBeLessThan(newField.order)

    const removed = await returnTemplateService.removeField(mpr09.id, newField.id, LEAD)
    expect(removed?.fields).toHaveLength(initial)
  })

  it('template mutations are refused without manage-return-templates (§19)', async () => {
    const defs = await returnTemplateService.listDefinitions()
    const mpr09 = defs.find((d) => d.code === 'MPR-09')!
    await expect(
      returnTemplateService.addField(
        mpr09.id,
        { code: 'blocked', label: 'Blocked', section: 'Ratios', type: 'text', required: false },
        ANALYST, // analyst tier has review-submission but not manage-return-templates
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(returnTemplateService.approve(mpr09.id, EXAMINER)).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('supports the draft → under review → approved lifecycle', async () => {
    const defs = await returnTemplateService.listDefinitions()
    const qsl = defs.find((d) => d.code === 'QSL-03')!
    const submitted = await returnTemplateService.submitForApproval(qsl.id, LEAD)
    expect(submitted?.approvalStatus).toBe('Under Review')
    const approved = await returnTemplateService.approve(qsl.id, LEAD)
    expect(approved?.approvalStatus).toBe('Approved')
  })
})
