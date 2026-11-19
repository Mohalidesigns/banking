import { beforeEach, describe, expect, it } from 'vitest'
import { REQUIREMENT_ID_BY_CITATION, REGULATORY_STORY } from '@/mocks/fixtures/storyRefs'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { DemoPermissionError } from '@/services/contracts/errors'
import {
  correspondenceService,
  frameworkService,
  obligationService,
} from '@/services/mock/MockRegulatoryService'
import type { DemoRole } from '@/types/auth'
import type { ActorContext } from '@/types/common'

/**
 * Regulatory administration workflow mutations and role gating
 * (Spec §10.1–§10.3, §19, Phase 4A): simulated framework upload with the
 * Demo AI extraction distinction, requirement approval, obligation
 * applicability/review/status mutations, and the correspondence
 * compose → review → approve → send-demo lifecycle (send is SIMULATED —
 * the prototype never dispatches real communications).
 */

const actor = (role: DemoRole, name = 'Test User'): ActorContext => ({
  actorId: `test-${role}`,
  actorName: name,
  actorRole: role,
})

const DEPUTY = actor('deputy-director', 'Tunde Bakare')
const LEGAL = actor('legal-enforcement-officer', 'Zainab Lawal')
const PRINCIPAL = actor('principal-examiner', 'Chuka Eze')
const ANALYST = actor('prudential-analyst', 'Fatima Bello')
const READ_ONLY = actor('read-only-supervisor', 'Robin Vale')
const INSTITUTION = actor('institution-administrator', 'Grace Mbeki')

describe('Regulatory frameworks service (§10.1)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('lists the demo framework library across statuses', async () => {
    const list = await frameworkService.list()
    expect(list.length).toBeGreaterThanOrEqual(8)
    const byCode = new Map(list.map((f) => [f.code, f]))
    expect(byCode.get('MBA/PRU/2024')?.status).toBe('Active')
    expect(byCode.get('MBA/PRU/2021')?.status).toBe('Superseded')
    expect(byCode.get('MBA/PSB/2026')?.status).toBe('Under Consultation')
  })

  it('joins requirements and applicable institutions on framework detail', async () => {
    const detail = await frameworkService.detail('MBA/AML/2023')
    expect(detail).toBeDefined()
    expect(detail!.requirements.length).toBeGreaterThanOrEqual(4)
    // AML/CFT applies to every licence category → all 8 demo institutions.
    expect(detail!.applicableInstitutions).toHaveLength(8)
    const s63 = detail!.requirements.find((r) => r.reference === '§6.3')
    expect(s63?.relatedObligationRefs).toContain('OBL-2026-004')
  })

  it('keeps the §6.3 transaction-monitoring story anchors wired (Phase-4 acceptance)', async () => {
    const req = await frameworkService.getRequirement(REGULATORY_STORY.transactionMonitoringRequirementId)
    expect(req).toBeDefined()
    expect(req!.id).toBe(REQUIREMENT_ID_BY_CITATION['MBA/AML/2023 §6.3'])
    const refs = req!.storyAnchors.map((a) => a.targetRef)
    expect(refs).toEqual(expect.arrayContaining(['EXM-2026-014', 'FND-2026-101', 'CAP-2026-003', 'DIR-2026-004']))
    const exam = req!.storyAnchors.find((a) => a.targetRef === 'EXM-2026-014')!
    expect(exam.link).toMatch(/^\/app\/examinations\//)
    // Directive refs are Phase-5 placeholders: chips, never link targets.
    const dir = req!.storyAnchors.find((a) => a.targetRef === 'DIR-2026-004')!
    expect(dir.link).toBeUndefined()
    expect(dir.note).toMatch(/Phase 5/)
  })

  it('labels MBA/PSB/2026 extracted requirements as Demo AI drafts, not approved content', async () => {
    const detail = await frameworkService.detail('MBA/PSB/2026')
    const drafts = detail!.requirements.filter((r) => r.status === 'AI-Extracted Draft')
    expect(drafts.length).toBeGreaterThanOrEqual(3)
    for (const d of drafts) {
      expect(d.extractionNote).toMatch(/Demo AI response/)
      expect(d.approvedByName).toBeUndefined()
    }
  })

  it('simulated upload creates a Draft framework with AI-extracted draft requirements', async () => {
    const created = await frameworkService.upload(
      {
        name: 'Demo Escrow Regulation',
        code: 'MBA/ESC/2026',
        category: 'Prudential',
        issuingAuthority: 'Meridia Banking Authority',
        version: '0.1 (draft)',
        effectiveDate: '2027-01-01',
        description: 'Upload flow exercised by the demo test suite.',
        applicableCategories: ['Commercial Bank'],
        documentName: 'MBA-ESC-Draft.pdf',
        runAiExtraction: true,
      },
      DEPUTY,
    )
    expect(created).toBeDefined()
    expect(created!.status).toBe('Draft')
    const detail = await frameworkService.detail('MBA/ESC/2026')
    const drafts = detail!.requirements.filter((r) => r.status === 'AI-Extracted Draft')
    expect(drafts).toHaveLength(3)
    expect(drafts.every((d) => d.extractionNote?.includes('Demo AI response'))).toBe(true)
    // A duplicate citation code is refused (returns undefined — no change).
    const dup = await frameworkService.upload(
      {
        name: 'Duplicate',
        code: 'MBA/ESC/2026',
        category: 'Prudential',
        issuingAuthority: 'MBA',
        version: '0.1',
        effectiveDate: '2027-01-01',
        description: 'dup',
        applicableCategories: [],
        documentName: 'dup.pdf',
        runAiExtraction: false,
      },
      DEPUTY,
    )
    expect(dup).toBeUndefined()
  })

  it('approves and rejects AI drafts; publishVersion bumps version and history', async () => {
    const detail = await frameworkService.detail('MBA/PSB/2026')
    const drafts = detail!.requirements.filter((r) => r.status === 'AI-Extracted Draft')

    const approved = await frameworkService.approveRequirement(drafts[0].id, 'Wording confirmed with legal (demo).', DEPUTY)
    expect(approved?.status).toBe('Approved')
    expect(approved?.approvedByName).toBe('Tunde Bakare')
    expect(approved?.extractionNote).toMatch(/Demo AI response/)

    const rejected = await frameworkService.rejectRequirement(drafts[1].id, 'Out of consultation scope (demo).', LEGAL)
    expect(rejected?.status).toBe('Rejected')
    expect(rejected?.extractionNote).toMatch(/rejected/i)

    const published = await frameworkService.publishVersion(detail!.framework.id, '1.0', 'Consultation closed (demo).', DEPUTY)
    expect(published?.version).toBe('1.0')
    expect(published?.versions.at(-1)?.changeSummary).toBe('Consultation closed (demo).')
  })

  it('refuses framework mutations below the tier and for institution roles (§19)', async () => {
    const detail = await frameworkService.detail('MBA/PSB/2026')
    const draft = detail!.requirements.find((r) => r.status === 'AI-Extracted Draft')!
    await expect(
      frameworkService.approveRequirement(draft.id, 'attempt', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      frameworkService.publishVersion(detail!.framework.id, '9.9', 'attempt', READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      frameworkService.upload(
        {
          name: 'Blocked', code: 'MBA/BLK/2026', category: 'Prudential', issuingAuthority: 'MBA',
          version: '0.1', effectiveDate: '2027-01-01', description: 'blocked', applicableCategories: [],
          documentName: 'blocked.pdf', runAiExtraction: false,
        },
        INSTITUTION,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})

describe('Regulatory obligations service (§10.2)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('registers twelve demo obligations with framework joins and worst-case status', async () => {
    const rows = await obligationService.list()
    expect(rows).toHaveLength(12)
    const capital = rows.find((o) => o.reference === 'OBL-2026-001')!
    expect(capital.frameworkCode).toBe('MBA/PRU/2024')
    expect(capital.returnCode).toBe('MPR-09')
    // Vanguard is Non-Compliant → the rollup is Non-Compliant.
    expect(capital.overallStatus).toBe('Non-Compliant')
    // OBL-2026-003 next review is seeded overdue.
    const qar = rows.find((o) => o.reference === 'OBL-2026-003')!
    expect(qar.reviewOverdue).toBe(true)
  })

  it('anchors the Meridian STR obligation to the live AML story (§10.2 detail)', async () => {
    const detail = await obligationService.detail('OBL-2026-004')
    expect(detail).toBeDefined()
    expect(detail!.frameworkCode).toBe('MBA/AML/2023')
    expect(detail!.requirements.map((r) => r.reference)).toContain('§6.3')
    const meridian = detail!.institutions.find((i) => i.code === 'MCB-001')!
    expect(meridian.status.status).toBe('Non-Compliant')
    const refs = meridian.status.anchors.map((a) => a.targetRef)
    expect(refs).toEqual(expect.arrayContaining(['FND-2026-101', 'CAP-2026-003', 'EXM-2026-014', 'DIR-2026-004']))
    const cap = meridian.status.anchors.find((a) => a.targetRef === 'CAP-2026-003')!
    expect(cap.link).toBe('/app/remediation')
    const dir = meridian.status.anchors.find((a) => a.targetRef === 'DIR-2026-004')!
    expect(dir.link).toBeUndefined()
    expect(dir.note).toMatch(/Phase 5/)
  })

  it('edits applicability and records the change in history', async () => {
    const detail = await obligationService.detail('OBL-2026-012') // Unity only
    const before = detail!.obligation.applicableInstitutionIds.length
    const sentinel = detail!.availableInstitutions.find((i) => i.code === 'SCT-007')!

    const updated = await obligationService.updateApplicability(
      detail!.obligation.id,
      { addInstitutionIds: [sentinel.id], removeInstitutionIds: [], reason: 'Pilot extension (demo test).' },
      DEPUTY,
    )
    expect(updated!.applicableInstitutionIds).toHaveLength(before + 1)
    expect(updated!.changeHistory.at(-1)?.reason).toBe('Pilot extension (demo test).')

    const after = await obligationService.detail('OBL-2026-012')
    const added = after!.institutions.find((i) => i.code === 'SCT-007')!
    expect(added.status.status).toBe('Not Assessed')

    // Removing without a reason-less change still records history.
    const shrunk = await obligationService.updateApplicability(
      detail!.obligation.id,
      { addInstitutionIds: [], removeInstitutionIds: [sentinel.id], reason: 'Pilot ended (demo test).' },
      DEPUTY,
    )
    expect(shrunk!.applicableInstitutionIds).toHaveLength(before)
  })

  it('records reviews (defaults next review +90d) and verifies institution status', async () => {
    const detail = await obligationService.detail('OBL-2026-002')
    const reviewed = await obligationService.recordReview(
      detail!.obligation.id,
      { note: 'Monthly cycle reviewed against SUB-2026-0144 (demo test).' },
      DEPUTY,
    )
    expect(reviewed!.obligation.lastReviewDate).toBe(new Date().toISOString().slice(0, 10))
    const next = new Date(reviewed!.obligation.nextReviewDate).getTime()
    expect(next).toBeGreaterThan(Date.now())
    expect(reviewed!.obligation.changeHistory.at(-1)?.reason).toMatch(/SUB-2026-0144/)

    const northstar = reviewed!.institutions.find((i) => i.code === 'NMB-002')!
    expect(northstar.status.status).toBe('Partial')
    const verified = await obligationService.setInstitutionStatus(
      detail!.obligation.id,
      northstar.id,
      'Compliant',
      'Buffer restored above the demo watch level (test).',
      DEPUTY,
    )
    expect(verified!.institutions.find((i) => i.code === 'NMB-002')!.status.status).toBe('Compliant')
    expect(verified!.obligation.changeHistory.at(-1)?.change).toMatch(/Partial → Compliant/)
  })

  it('refuses obligation mutations without manage-obligations (§19)', async () => {
    const detail = await obligationService.detail('OBL-2026-002')
    // Legal/enforcement has no manage-obligations in the demo matrix.
    await expect(
      obligationService.recordReview(detail!.obligation.id, { note: 'attempt' }, LEGAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      obligationService.updateApplicability(
        detail!.obligation.id,
        { addInstitutionIds: [], removeInstitutionIds: [], reason: 'attempt' },
        ANALYST,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      obligationService.setInstitutionStatus(detail!.obligation.id, detail!.institutions[0].id, 'Compliant', 'x', INSTITUTION),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})

describe('Regulatory correspondence service (§10.3)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('registers the demo threads with institution joins', async () => {
    const rows = await correspondenceService.list()
    expect(rows.length).toBeGreaterThanOrEqual(10)
    const northstarLcr = rows.find((c) => c.reference === 'COR-2026-002')!
    expect(northstarLcr.institutionName).toMatch(/Northstar/)
    expect(northstarLcr.status).toBe('Sent')
    expect(northstarLcr.relations.map((r) => r.targetRef)).toContain('EWA-2026-011')
    const alert = northstarLcr.relations.find((r) => r.targetRef === 'EWA-2026-011')!
    expect(alert.link).toContain('/app/early-warnings?reference=EWA-2026-011')
  })

  it('runs the full compose → review → approve → send-demo lifecycle with a simulated dispatch', async () => {
    // Legal drafts, submits; deputy approves and runs the simulated send.
    const draftId = REGULATORY_STORY.crestlineCyberDraftId
    const submitted = await correspondenceService.submitForReview(draftId, LEGAL)
    expect(submitted?.status).toBe('In Review')
    // Submitting for review notifies the approval tier (demo notification).
    expect(
      notificationRepository.list().some((n) => n.title.includes('COR-2026-005') && (n.link ?? '').includes('COR-2026-005')),
    ).toBe(true)

    const changes = await correspondenceService.requestChanges(draftId, 'Add the CAP-2026-008 milestone table (demo).', LEGAL)
    expect(changes?.status).toBe('Changes Requested')

    const resubmitted = await correspondenceService.submitForReview(draftId, LEGAL)
    expect(resubmitted?.status).toBe('In Review')

    const approved = await correspondenceService.approve(draftId, 'Approved for simulated dispatch.', DEPUTY)
    expect(approved?.status).toBe('Approved')
    expect(approved?.authorisedByName).toBe('Tunde Bakare')

    const sent = await correspondenceService.sendDemo(draftId, DEPUTY)
    expect(sent?.status).toBe('Sent')
    const sendEvent = sent!.thread.at(-1)!
    expect(sendEvent.action).toBe('Sent (demo)')
    expect(sendEvent.note).toMatch(/no real communication sent/i)
  })

  it('enforces the workflow state machine (invalid transitions return undefined)', async () => {
    const draftId = REGULATORY_STORY.crestlineCyberDraftId
    // Cannot approve or send a Draft directly.
    expect(await correspondenceService.approve(draftId, 'skip', DEPUTY)).toBeUndefined()
    expect(await correspondenceService.sendDemo(draftId, DEPUTY)).toBeUndefined()
    // A Sent letter cannot re-enter the workflow.
    const sentRef = 'COR-2026-002'
    const sent = await correspondenceService.detail(sentRef)
    expect(await correspondenceService.submitForReview(sent!.id, LEGAL)).toBeUndefined()
    expect(await correspondenceService.updateDraft(sent!.id, { subject: 'rewrite' }, LEGAL)).toBeUndefined()
  })

  it('composes a new draft with resolved relations and simulated attachments', async () => {
    const candidates = await correspondenceService.relationCandidates()
    const examRef = candidates.find((c) => c.ref === 'EXM-2026-014')!
    const created = await correspondenceService.compose(
      {
        institutionId: (await obligationService.detail('OBL-2026-004'))!.institutions.find((i) => i.code === 'MCB-001')!.id,
        type: 'Information Request',
        direction: 'Outgoing',
        subject: 'Follow-up request (demo test)',
        body: 'Test body for the compose flow — fictional demo content.',
        responseDueDate: '2026-12-15',
        relationRefs: ['EXM-2026-014'],
        attachments: [{ fileName: 'annex-demo.pdf', sizeKb: 64, confidentiality: 'Internal' }],
      },
      PRINCIPAL,
    )
    expect(created).toBeDefined()
    expect(created!.reference).toBe('COR-2026-011')
    expect(created!.status).toBe('Draft')
    expect(examRef.kind).toBe('examination')
    const relation = created!.relations.find((r) => r.targetRef === 'EXM-2026-014')!
    expect(relation.link).toMatch(/^\/app\/examinations\//)
    expect(created!.attachments[0].storageNote).toMatch(/no real file/i)
  })

  it('logs and closes responses to incoming letters', async () => {
    const incoming = await correspondenceService.detail('COR-2026-006') // Meridian CAP update
    expect(incoming!.direction).toBe('Incoming')
    expect(incoming!.status).toBe('Response Required')
    const closed = await correspondenceService.logResponse(
      incoming!.id,
      'Milestones validated against the remediation register (demo test).',
      LEGAL,
    )
    expect(closed?.status).toBe('Closed')
    expect(closed!.thread.at(-1)?.action).toBe('Response logged')
  })

  it('gates the workflow per §19 — and refuses institution roles outright', async () => {
    const draftId = REGULATORY_STORY.crestlineCyberDraftId
    // Analyst has no correspondence actions at all.
    await expect(correspondenceService.submitForReview(draftId, ANALYST)).rejects.toBeInstanceOf(DemoPermissionError)
    // Legal can manage but never approve/send (approve-correspondence is approval tier).
    await correspondenceService.submitForReview(draftId, LEGAL)
    await expect(correspondenceService.approve(draftId, 'attempt', LEGAL)).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(correspondenceService.sendDemo(draftId, LEGAL)).rejects.toBeInstanceOf(DemoPermissionError)
    // Read-only cannot log responses.
    const incoming = await correspondenceService.detail('COR-2026-006')
    await expect(correspondenceService.logResponse(incoming!.id, 'attempt', READ_ONLY)).rejects.toBeInstanceOf(
      DemoPermissionError,
    )
    // Institution roles are refused every correspondence mutation (§7.8 hard rule).
    await expect(
      correspondenceService.compose(
        {
          institutionId: incoming!.institutionId,
          type: 'Acknowledgement',
          direction: 'Outgoing',
          subject: 'blocked',
          body: 'blocked',
          relationRefs: [],
          attachments: [],
        },
        INSTITUTION,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})
