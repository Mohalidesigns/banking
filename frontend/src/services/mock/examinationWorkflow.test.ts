import { beforeEach, describe, expect, it } from 'vitest'
import { examinationService } from '@/services/mock/MockExaminationService'
import { libraryService } from '@/services/mock/MockLibraryService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { EXAMINATIONS, FINDINGS } from '@/mocks/fixtures/supervision.fixture'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { ActorContext } from '@/types/common'
import type { DemoRole } from '@/types/auth'

/**
 * Examination workflow service coverage (Spec §7.2/§7.4): creating an
 * examination instantiates its work programme from APPROVED library
 * templates only; procedure results save as drafts, submit for review and
 * can raise a finding from the recorded exception — all role-gated per the
 * §19 demo matrix.
 */

const actor = (role: DemoRole, name = 'Test User'): ActorContext => ({
  actorId: `test-${role}`,
  actorName: name,
  actorRole: role,
})

const EXM_014 = EXAMINATIONS.find((e) => e.reference === 'EXM-2026-014')!

describe('Examination creation from library templates', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('only exposes Approved templates for selection', async () => {
    const approved = await libraryService.approvedFor({})
    expect(approved.length).toBeGreaterThan(0)
    expect(approved.every((p) => p.status === 'Approved')).toBe(true)
    const all = await libraryService.list({})
    const nonApproved = all.filter((p) => p.status !== 'Approved')
    expect(nonApproved.length).toBeGreaterThan(0) // draft / under review / retired exist in the demo library
    for (const p of nonApproved) {
      expect(approved.find((a) => a.id === p.id)).toBeUndefined()
    }
  })

  it('instantiates the work programme from the selected approved template', async () => {
    const institution = (await institutionService.list({ page: 1, pageSize: 10 })).items[0]
    const approved = await libraryService.list({ search: 'LIB-AML-002' })
    const programme = approved[0]
    expect(programme.status).toBe('Approved')

    const created = await examinationService.create(
      {
        institution,
        title: `${institution.tradingName} — Test AML Examination`,
        type: 'Thematic',
        riskPriority: 'High',
        reviewPeriodStart: '2026-01-01',
        reviewPeriodEnd: '2026-09-30',
        startDate: '2026-12-01',
        plannedEndDate: '2026-12-20',
        jurisdictionId: 'jur-demo',
        department: 'Banking Supervision Department',
        objectives: 'Template-instantiation test (demo).',
        domains: ['AML/CFT'],
        locations: ['Head office'],
        productLines: ['Retail deposits'],
        methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
        methodologyVersion: 'v2.1',
        team: [
          { staffId: 'test-lead', name: 'Test Lead', roleInExamination: 'Team Lead', conflictDeclaration: 'None declared' },
        ],
        programmeIds: [programme.id],
        informationRequest: null,
        submit: true,
      },
      actor('director-of-supervision'),
    )

    expect(created.status).toBe('Planned')
    expect(created.programmeRefs).toEqual([`${programme.code} ${programme.version}`])
    const procedures = await examinationService.procedures(created.id)
    expect(procedures).toHaveLength(programme.procedures.length)
    expect(procedures.every((p) => p.status === 'Not Started' && p.result === 'Not Tested')).toBe(true)
    expect(procedures.every((p) => p.libraryProcedureId !== undefined)).toBe(true)
    // Round-robin owner assignment fell back to the single team member.
    expect(procedures.every((p) => p.ownerName === 'Test Lead')).toBe(true)
  })

  it('ignores non-approved template ids passed to create (defensive)', async () => {
    const institution = (await institutionService.list({ page: 1, pageSize: 10 })).items[0]
    const draft = (await libraryService.list({ status: 'Draft' }))[0]
    expect(draft).toBeDefined()

    const created = await examinationService.create(
      {
        institution,
        title: 'Draft-template guard test (demo)',
        type: 'Targeted',
        riskPriority: 'Medium',
        reviewPeriodStart: '2026-01-01',
        reviewPeriodEnd: '2026-06-30',
        startDate: '2026-12-01',
        plannedEndDate: '2026-12-10',
        jurisdictionId: 'jur-demo',
        department: 'Banking Supervision Department',
        objectives: 'Guard test (demo).',
        domains: ['AML/CFT'],
        locations: [],
        productLines: [],
        methodologyName: 'MBA Risk-Based Examination Methodology (demo)',
        methodologyVersion: 'v2.1',
        team: [
          { staffId: 'test-lead', name: 'Test Lead', roleInExamination: 'Team Lead', conflictDeclaration: 'None declared' },
        ],
        programmeIds: [draft.id],
        informationRequest: null,
        submit: false,
      },
      actor('supervisory-team-lead'),
    )
    expect(created.status).toBe('Draft')
    expect(await examinationService.procedures(created.id)).toHaveLength(0)
  })

  it('rejects creation by a role without create-examination (examiner)', async () => {
    const institution = (await institutionService.list({ page: 1, pageSize: 10 })).items[0]
    await expect(
      examinationService.create(
        {
          institution,
          title: 'Should not be created',
          type: 'Targeted',
          riskPriority: 'Low',
          reviewPeriodStart: '2026-01-01',
          reviewPeriodEnd: '2026-06-30',
          startDate: '2026-12-01',
          plannedEndDate: '2026-12-10',
          jurisdictionId: 'jur-demo',
          department: 'BSD',
          objectives: 'x',
          domains: ['AML/CFT'],
          locations: [],
          productLines: [],
          methodologyName: 'm',
          methodologyVersion: 'v',
          team: [],
          programmeIds: [],
          informationRequest: null,
          submit: true,
        },
        actor('examiner'),
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})

describe('Workspace procedure results and raise-finding-from-exception', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  const procByCode = async (code: string) => {
    const procs = await examinationService.procedures(EXM_014.id)
    const p = procs.find((x) => x.code === code)
    expect(p, `procedure ${code} on EXM-2026-014`).toBeDefined()
    return p!
  }

  it('saves a draft result, then submits and approves it through the review chain', async () => {
    const examiner = actor('examiner', 'Nkechi Balogun')
    const lead = actor('supervisory-team-lead', 'Chuka Eze')

    const aml05 = await procByCode('AML-05')
    expect(aml05.status).toBe('In Progress')

    // Examiner saves a draft Fail result with exception details.
    const drafted = await examinationService.saveProcedureDraft(
      aml05.id,
      { result: 'Fail', exceptionDetails: 'STR narratives incomplete in 4 of 15 samples (demo).', conclusion: 'Fail.', severity: 'Medium' },
      examiner,
    )
    expect(drafted?.status).toBe('Draft Saved')
    expect(drafted?.result).toBe('Fail')

    // Examiner submits for review → My Work review item is enqueued.
    const submitted = await examinationService.submitProcedure(
      aml05.id,
      { result: 'Fail', exceptionDetails: 'STR narratives incomplete in 4 of 15 samples (demo).', conclusion: 'Fail.', severity: 'Medium' },
      examiner,
    )
    expect(submitted?.status).toBe('Submitted for Review')
    const queue = workQueueRepository.list()
    expect(queue.some((w) => w.type === 'procedure' && w.relatedRef?.endsWith('/AML-05'))).toBe(true)

    // Examiner cannot approve (no approve-results) — team lead can.
    await expect(examinationService.approveProcedure(aml05.id, examiner)).rejects.toBeInstanceOf(DemoPermissionError)
    const approved = await examinationService.approveProcedure(aml05.id, lead, ' endorsed (demo)')
    expect(approved?.status).toBe('Approved')
    expect(approved?.result).toBe('Fail')
  })

  it('raises a finding from the procedure exception and links it both ways', async () => {
    const aml05 = await procByCode('AML-05')
    const before = FINDINGS.length

    const raised = await examinationService.raiseFindingFromProcedure(
      aml05.id,
      {
        institutionId: EXM_014.institutionId,
        examinationId: EXM_014.id,
        examinationRef: EXM_014.reference,
        procedureId: aml05.id,
        procedureCode: aml05.code,
        title: 'STR narrative quality gaps (test)',
        category: 'AML/CFT',
        riskRating: 'Medium',
        fiveCs: {
          condition: 'STR narratives incomplete in 4 of 15 sampled reports (demo).',
          criteria: 'MBA/AML/2024 §2.2 (demo reference)',
          cause: 'Template lacks mandatory fields (demo).',
          consequence: 'FIU may not act on incomplete reports (demo).',
          recommendation: 'Update the STR template and retrain analysts (demo).',
        },
        severityRationale: 'Medium — limited sample, remediable (demo).',
        breachClassification: 'Deficiency',
        regulatoryReference: 'MBA/AML/2024 §2.2 (demo reference)',
        institutionOwnerName: 'Grace Mbeki',
        institutionOwnerRole: 'Chief Compliance Officer (demo)',
        crossDomainLinks: [],
        evidenceLinks: [],
        dueDate: '2027-01-31',
      },
      actor('examiner', 'Nkechi Balogun'),
    )

    expect(raised.status).toBe('Draft')
    expect(raised.procedureCode).toBe('AML-05')
    expect(raised.reference).toMatch(/^FND-2026-\d+$/)

    // Procedure ↔ finding link and examination counters updated.
    const procAfter = await examinationService.getProcedure(aml05.id)
    expect(procAfter?.linkedFindingRef).toBe(raised.reference)
    const examAfter = await examinationService.getDetail(EXM_014.id)
    expect(examAfter?.findingsCount).toBe(4) // was 3 in the seeded story
    expect(examAfter?.relatedFindingRefs).toContain(raised.reference)

    // A finding-review work item was enqueued with a deep link.
    const queue = workQueueRepository.list()
    const item = queue.find((w) => w.type === 'finding-review' && w.relatedRef === raised.reference)
    expect(item?.link).toBe(`/app/findings/${raised.id}`)

    void before
  })

  it('blocks raise-finding for roles without the permission (read-only supervisor)', async () => {
    const aml05 = await procByCode('AML-05')
    await expect(
      examinationService.raiseFindingFromProcedure(
        aml05.id,
        {
          institutionId: EXM_014.institutionId,
          title: 'Should not be raised',
          category: 'AML/CFT',
          riskRating: 'Low',
          fiveCs: { condition: 'c', criteria: 'c', cause: 'c', consequence: 'c', recommendation: 'c' },
          severityRationale: 'r',
          breachClassification: 'Observation',
          regulatoryReference: 'demo',
          institutionOwnerName: 'Owner',
          institutionOwnerRole: 'Role',
          crossDomainLinks: [],
          evidenceLinks: [],
          dueDate: '2027-01-31',
        },
        actor('read-only-supervisor'),
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})
