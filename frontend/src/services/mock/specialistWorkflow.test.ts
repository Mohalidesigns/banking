import { beforeEach, describe, expect, it } from 'vitest'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { DemoPermissionError } from '@/services/contracts/errors'
import { specialistService } from '@/services/mock/MockSpecialistService'
import type { DemoRole } from '@/types/auth'
import type { ActorContext } from '@/types/common'

/**
 * Specialist domain workflow mutations and role gating (Spec §9, §19,
 * Phase 4B): assessment lifecycle, checklist conclusions, the simulated
 * evidence request/receipt/review flow, the report Draft → In Review →
 * Issued (demo) machine, and the Phase-4 acceptance join — every detail
 * resolves its §10.1 requirement citations to real framework records.
 */

const actor = (role: DemoRole, name = 'Test User'): ActorContext => ({
  actorId: `test-${role}`,
  actorName: name,
  actorRole: role,
})

const DEPUTY = actor('deputy-director', 'Tunde Bakare') // ALL_ACTIONS
const LEAD = actor('supervisory-team-lead', 'Amara Osei') // approval tier
const PRINCIPAL = actor('principal-examiner', 'Chuka Eze') // REVIEW tier — never approves
const EXAMINER = actor('examiner', 'Samuel Ike') // FIELDWORK tier
const READ_ONLY = actor('read-only-supervisor', 'Robin Vale')
const INSTITUTION = actor('institution-administrator', 'Grace Mbeki')

describe('Specialist service reads (§9 pattern)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('exposes domain configs for the 4B domains plus AML and operations (4C), none for consumer protection yet', async () => {
    for (const d of ['governance', 'erm', 'cybersecurity', 'aml', 'operations'] as const) {
      const spec = await specialistService.domainSpec(d)
      expect(spec).toBeDefined()
      expect(spec!.submodules.length).toBeGreaterThan(0)
      expect(spec!.checklistTemplates.length).toBeGreaterThan(0)
    }
    // §9.4 submodules and the LIB-AML-002-mirroring templates are configured.
    const aml = await specialistService.domainSpec('aml')
    expect(aml!.libraryProgrammeCode).toBe('LIB-AML-002')
    expect(aml!.checklistTemplates.map((t) => t.code)).toEqual([
      'AML-01',
      'AML-02',
      'AML-03',
      'AML-04',
      'AML-05',
      'AML-06',
    ])
    // §9.5 templates mirror LIB-OPS-001 and cite MBA/OPS/2026 §2.1.
    const ops = await specialistService.domainSpec('operations')
    expect(ops!.libraryProgrammeCode).toBe('LIB-OPS-001')
    expect(ops!.checklistTemplates.map((t) => t.code)).toEqual([
      'OPS-01',
      'OPS-02',
      'OPS-03',
      'OPS-04',
      'OPS-05',
      'OPS-06',
    ])
    expect(await specialistService.domainSpec('consumer-protection')).toBeUndefined()
  })

  it('joins register rows with institution labels and checklist progress', async () => {
    const rows = await specialistService.list({ domain: 'governance' })
    expect(rows.length).toBeGreaterThanOrEqual(4)
    const meridian = rows.find((r) => r.reference === 'GOVA-2026-002')
    expect(meridian).toBeDefined()
    expect(meridian!.institutionName).toBe('Meridian Commercial Bank')
    expect(meridian!.checklistProgress.total).toBe(6) // six governance templates
    expect(meridian!.checklistProgress.completed).toBe(1) // GOV-02 Deficient
    expect(meridian!.openFindingCount).toBeGreaterThan(0)
  })

  it('computes the domain dashboard with overdue evidence and posture', async () => {
    const dash = await specialistService.dashboard('cybersecurity')
    expect(dash).toBeDefined()
    expect(dash!.totals.activeAssessments).toBeGreaterThanOrEqual(2)
    expect(dash!.totals.overdueEvidenceRequests).toBeGreaterThanOrEqual(1)
    expect(dash!.maturityDistribution).toHaveLength(5)
    const crestline = dash!.posture.find((p) => p.institutionCode === 'CPB-004')
    expect(crestline).toBeDefined()
    expect(crestline!.openFindingCount).toBeGreaterThan(0)
    expect(dash!.recentRelations.some((r) => r.targetRef === 'EXM-2026-005')).toBe(true)
  })

  it('resolves requirement citations to §10.1 records — Phase-4 acceptance', async () => {
    const detail = await specialistService.detail('CYBA-2026-001')
    expect(detail).toBeDefined()
    const req52 = detail!.requirements.find((r) => r.citation === 'MBA/CYB/2025 §5.2')
    expect(req52).toBeDefined()
    expect(req52!.requirementId).toBeTruthy()
    expect(req52!.title).toBe('Third-party and outsourcing risk')
    expect(req52!.link).toContain('/app/regulatory/frameworks?framework=MBA%2FCYB%2F2025')
    expect(req52!.link).toContain('requirement=')
    // The linked §7 examination resolves to a navigable relation, not a bare ref.
    const exam = detail!.assessment.relations.find((r) => r.targetRef === 'EXM-2026-005')
    expect(exam?.link).toContain('/app/examinations/')
    // Story anchors survive the join.
    expect(detail!.assessment.relations.some((r) => r.targetRef === 'FND-2026-066')).toBe(true)
    expect(detail!.assessment.relations.some((r) => r.targetRef === 'CAP-2026-008')).toBe(true)
  })

  it('returns undefined for an unknown assessment reference', async () => {
    expect(await specialistService.detail('CYBA-1999-999')).toBeUndefined()
  })

  it('filters domain findings by the domain categories', async () => {
    const gov = await specialistService.domainFindings('governance')
    const refs = gov.map((f) => f.reference)
    expect(refs).toContain('FND-2026-109')
    expect(refs).toContain('FND-2026-037')
    expect(refs).toContain('FND-2026-118')
    expect(refs).not.toContain('FND-2026-101') // AML, not governance

    const cyber = await specialistService.domainFindings('cybersecurity')
    expect(cyber.map((f) => f.reference)).toContain('FND-2026-066')
  })
})

describe('Specialist assessment lifecycle (§19 gating)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('refuses creation for institution roles and the fieldwork tier', async () => {
    const input = {
      domain: 'governance' as const,
      institutionId: (await specialistService.list({ domain: 'governance' }))[0].institutionId,
      title: 'Test governance assessment',
      type: 'Thematic Review' as const,
      periodCovered: 'Q4 2026',
      startDate: '2026-12-01',
      targetDate: '2027-01-15',
      scopeSummary: 'Demo scope.',
      submoduleKeys: ['board-composition'],
    }
    await expect(specialistService.create(input, INSTITUTION)).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(specialistService.create(input, EXAMINER)).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(specialistService.create(input, READ_ONLY)).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('creates an assessment for the review tier, generating the checklist from submodules', async () => {
    const rows = await specialistService.list({ domain: 'erm' })
    const vanguard = rows.find((r) => r.reference === 'ERMA-2025-003')!
    const created = await specialistService.create(
      {
        domain: 'erm',
        institutionId: vanguard.institutionId,
        title: 'ERM follow-up assessment — Vanguard Regional Bank',
        type: 'Targeted Review',
        periodCovered: 'Q4 2026',
        startDate: '2026-12-01',
        targetDate: '2027-01-15',
        scopeSummary: 'Follow-up on the 2025 Unsatisfactory assessment (demo).',
        submoduleKeys: ['risk-appetite', 'kris-limits'],
        examinationRef: 'EXM-2026-012',
      },
      LEAD,
    )
    expect(created).toBeDefined()
    expect(created!.reference).toMatch(/^ERMA-\d{4}-\d{3}$/)
    expect(created!.status).toBe('Planned')
    expect(created!.checklistProgress).toEqual({ completed: 0, total: 2 })

    const detail = await specialistService.detail(created!.reference)
    expect(detail!.checklist.map((c) => c.code).sort()).toEqual(['ERM-02', 'ERM-03'])
    expect(detail!.assessment.requirementCitations).toContain('MBA/PRU/2024 §2.4')
    // Pattern part 8 — history picks up the completed 2025 assessment.
    expect(detail!.history.map((h) => h.reference)).toContain('ERMA-2025-003')
    // The linked examination resolved into a navigable relation.
    expect(detail!.assessment.relations.some((r) => r.targetRef === 'EXM-2026-012' && r.link)).toBe(true)
  })

  it('moves Planned → In Progress → In Review and refuses invalid transitions', async () => {
    const started = await specialistService.start('GOVA-2026-001', LEAD)
    expect(started?.status).toBe('In Progress')
    expect(await specialistService.start('GOVA-2026-001', LEAD)).toBeUndefined()

    const submitted = await specialistService.submitForReview('GOVA-2026-001', LEAD)
    expect(submitted?.status).toBe('In Review')
    expect(
      notificationRepository.list().some((n) => n.title.includes('GOVA-2026-001')),
    ).toBe(true)
  })

  it('refuses assessment management for institution roles at every step', async () => {
    await expect(specialistService.start('GOVA-2026-001', INSTITUTION)).rejects.toBeInstanceOf(
      DemoPermissionError,
    )
    await expect(specialistService.submitForReview('GOVA-2026-002', INSTITUTION)).rejects.toBeInstanceOf(
      DemoPermissionError,
    )
  })

  it('records checklist conclusions for the fieldwork tier and refuses read-only/institution', async () => {
    const detail = await specialistService.detail('GOVA-2026-001')
    const item = detail!.checklist.find((c) => c.code === 'GOV-01')!
    expect(item.status).toBe('Not Started')

    await expect(
      specialistService.recordChecklistResult(item.id, { status: 'Satisfactory', conclusionNote: '' }, READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      specialistService.recordChecklistResult(item.id, { status: 'Satisfactory', conclusionNote: '' }, INSTITUTION),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const updated = await specialistService.recordChecklistResult(
      item.id,
      { status: 'Satisfactory', conclusionNote: 'Composition within demo limits.' },
      EXAMINER,
    )
    expect(updated).toBeDefined()
    const recorded = updated!.checklist.find((c) => c.code === 'GOV-01')!
    expect(recorded.status).toBe('Satisfactory')
    expect(recorded.assessorName).toBe('Samuel Ike')
    expect(recorded.assessedAt).toBeTruthy()
    expect(recorded.conclusionNote).toBe('Composition within demo limits.')
    expect(updated!.progress.completed).toBe(1)
  })
})

describe('Specialist evidence flow (§9 part 5, simulated)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('runs request → receive → review with honest simulated state', async () => {
    const requested = await specialistService.requestEvidence(
      {
        assessmentId: (await specialistService.detail('GOVA-2026-001'))!.assessment.id,
        name: 'Annual board evaluation report',
        kind: 'Report',
        dueAt: '2026-12-15',
        note: 'Demo request.',
      },
      LEAD,
    )
    expect(requested).toBeDefined()
    const item = requested!.evidence.find((e) => e.name === 'Annual board evaluation report')!
    expect(item.status).toBe('Requested')
    expect(item.storageNote).toMatch(/Simulated/i)

    const received = await specialistService.receiveEvidence(item.id, EXAMINER)
    expect(received!.evidence.find((e) => e.id === item.id)!.status).toBe('Received')
    // Receiving twice is invalid.
    expect(await specialistService.receiveEvidence(item.id, EXAMINER)).toBeUndefined()

    const reviewed = await specialistService.reviewEvidence(item.id, 'Insufficient', 'Missing annexes (demo).', EXAMINER)
    const reviewedItem = reviewed!.evidence.find((e) => e.id === item.id)!
    expect(reviewedItem.status).toBe('Insufficient')
    expect(reviewedItem.reviewNote).toBe('Missing annexes (demo).')
  })

  it('gates evidence requests to the management tier and receipt/review to the record tier', async () => {
    const id = (await specialistService.detail('GOVA-2026-001'))!.assessment.id
    await expect(
      specialistService.requestEvidence(
        { assessmentId: id, name: 'X', kind: 'Report', dueAt: '2026-12-15', note: '' },
        EXAMINER,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      specialistService.requestEvidence(
        { assessmentId: id, name: 'X', kind: 'Report', dueAt: '2026-12-15', note: '' },
        INSTITUTION,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const seeded = (await specialistService.detail('CYBA-2026-001'))!.evidence.find(
      (e) => e.status === 'Requested',
    )!
    await expect(specialistService.receiveEvidence(seeded.id, READ_ONLY)).rejects.toBeInstanceOf(
      DemoPermissionError,
    )
  })
})

describe('Specialist report lifecycle (§9 part 7, simulated issuance)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('runs Draft → In Review → Issued (demo) with approval-tier gating', async () => {
    const detail = await specialistService.detail('CYBA-2026-001')
    expect(detail!.assessment.report.status).toBe('Draft')

    const submitted = await specialistService.submitReport(detail!.assessment.id, LEAD)
    expect(submitted!.assessment.report.status).toBe('In Review')

    // The review tier never issues (Spec §19 canApprove = false).
    await expect(
      specialistService.issueReport(detail!.assessment.id, PRINCIPAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const issued = await specialistService.issueReport(detail!.assessment.id, DEPUTY)
    expect(issued!.assessment.report.status).toBe('Issued (demo)')
    expect(issued!.assessment.report.issuedByName).toBe('Tunde Bakare')
    expect(issued!.assessment.report.issuedAt).toBeTruthy()
    expect(
      notificationRepository
        .list()
        .some((n) => n.title.includes('CYBA-2026-001') && /simulated/i.test(n.body)),
    ).toBe(true)

    // Issuing twice is an invalid transition, not an error.
    expect(await specialistService.issueReport(detail!.assessment.id, DEPUTY)).toBeUndefined()
  })

  it('refuses to submit a report that has not been drafted', async () => {
    const detail = await specialistService.detail('GOVA-2026-001')
    expect(detail!.assessment.report.status).toBe('Not Started')
    expect(await specialistService.submitReport(detail!.assessment.id, LEAD)).toBeUndefined()
  })

  it('saves a draft summary and appends reviewer notes on request-changes', async () => {
    const detail = await specialistService.detail('CYBA-2026-001')
    const drafted = await specialistService.saveReportDraft(
      detail!.assessment.id,
      'Updated draft summary (demo).',
      LEAD,
    )
    expect(drafted!.assessment.report.executiveSummary).toBe('Updated draft summary (demo).')

    await specialistService.submitReport(detail!.assessment.id, LEAD)
    const changed = await specialistService.requestReportChanges(
      detail!.assessment.id,
      'Quantify the SLA breaches before issuing.',
      DEPUTY,
    )
    expect(changed!.assessment.report.status).toBe('Draft')
    expect(changed!.assessment.report.executiveSummary).toContain('Reviewer note (Tunde Bakare)')
    expect(changed!.assessment.report.executiveSummary).toContain('Quantify the SLA breaches')
  })

  it('completes an assessment with conclusion and demo maturity at the approval tier only', async () => {
    const detail = await specialistService.detail('CYBA-2026-001')
    await expect(
      specialistService.completeAssessment(detail!.assessment.id, 'Needs Improvement', 3, PRINCIPAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const completed = await specialistService.completeAssessment(
      detail!.assessment.id,
      'Needs Improvement',
      3,
      DEPUTY,
    )
    expect(completed!.assessment.status).toBe('Completed')
    expect(completed!.assessment.conclusion).toBe('Needs Improvement')
    expect(completed!.assessment.maturity).toEqual({ score: 3, label: 'Defined' })
    expect(completed!.assessment.completedDate).toBeTruthy()
    // Completing twice is invalid.
    expect(
      await specialistService.completeAssessment(detail!.assessment.id, 'Satisfactory', 4, DEPUTY),
    ).toBeUndefined()
  })
})
