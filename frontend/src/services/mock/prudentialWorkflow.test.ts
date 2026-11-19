import { beforeEach, describe, expect, it } from 'vitest'
import {
  capitalAdequacyService,
  creditQualityService,
  indicatorCatalogueService,
  liquidityTreasuryService,
  stressTestingService,
} from '@/services/mock/MockPrudentialService'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { STORY } from '@/mocks/fixtures/storyRefs'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { ActorContext } from '@/types/common'
import type { DemoRole } from '@/types/auth'

/**
 * Prudential workflow mutations and role gating (Spec §8.1–§8.5, §19):
 * capital submission review/decision tiers, loan-sample and treasury
 * examiner conclusions (record-fieldwork tier), stress run creation,
 * submission and approval, and indicator threshold maintenance. The demo
 * stress calculator must reproduce the story: Vanguard breaches under the
 * severe scenario and Northstar's LCR falls below the 100% demo minimum
 * under the idiosyncratic funding stress.
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
const PORTAL = actor('institution-submitter', 'Ibrahim Sani')

describe('Capital submission review workflow (§8.1)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('analyst starts the review of the Vanguard resubmission; lead rejects it', async () => {
    const overview = await capitalAdequacyService.overview({})
    const pending = overview.submissions.find(
      (s) => s.institutionName === 'Vanguard Regional Bank' && s.periodLabel === 'November 2026',
    )
    expect(pending).toBeDefined()
    expect(pending!.reviewStatus).toBe('Awaiting Review')

    const started = await capitalAdequacyService.startSubmissionReview(pending!.id, ANALYST)
    expect(started!.reviewStatus).toBe('In Review')

    const rejected = await capitalAdequacyService.decideSubmission(
      pending!.id,
      'Rejected',
      'CAR 6.4% remains below the demo minimum; restoration plan still with legal (test note).',
      LEAD,
    )
    expect(rejected!.reviewStatus).toBe('Rejected')
    expect(rejected!.note).toContain('restoration plan')
  })

  it('refuses decisions below the approval tier and for institution roles (§19)', async () => {
    const overview = await capitalAdequacyService.overview({})
    const pending = overview.submissions.find((s) => s.reviewStatus === 'Awaiting Review')!

    // Analysts may review but never accept/reject.
    await expect(
      capitalAdequacyService.decideSubmission(pending.id, 'Accepted', 'nope', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      capitalAdequacyService.decideSubmission(pending.id, 'Accepted', 'nope', READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    // Institution users can never validate/decide (Spec §7.8 hard rule).
    await expect(
      capitalAdequacyService.startSubmissionReview(pending.id, PORTAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('moves breach status at the approval tier and keeps the story anchors', async () => {
    const overview = await capitalAdequacyService.overview({})
    const vanguardCar = overview.breaches.find(
      (b) => b.measure === 'CAR' && b.institutionName === 'Vanguard Regional Bank',
    )
    expect(vanguardCar).toBeDefined()
    expect(vanguardCar!.relatedRefs).toEqual(
      expect.arrayContaining(['EWA-2026-008', 'ENF-2026-002', 'SUB-2026-0143']),
    )

    await expect(
      capitalAdequacyService.setBreachStatus(vanguardCar!.id, 'Under remediation', 'test', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const updated = await capitalAdequacyService.setBreachStatus(
      vanguardCar!.id,
      'Under remediation',
      'Capital restoration plan received (test note).',
      LEAD,
    )
    expect(updated!.status).toBe('Under remediation')
  })
})

describe('Credit loan-sample conclusions (§8.2)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('examiner concludes the pending Vanguard related-party sample', async () => {
    const samples = await creditQualityService.listLoanSamples({})
    const pending = samples.find((s) => s.reference === 'LNG-2026-013')
    expect(pending).toBeDefined()
    expect(pending!.examinerConclusion).toBeUndefined()

    const concluded = await creditQualityService.concludeLoanSample(
      pending!.id,
      'Escalate to finding',
      'Related-party facility with insufficient collateral and withdrawn approval (test note).',
      EXAMINER,
    )
    expect(concluded!.examinerConclusion).toBe('Escalate to finding')
    expect(concluded!.conclusionByName).toBe('Samuel Ike')
    expect(concluded!.concludedAt).toBeTruthy()

    // The examination summary counts move with the workflow state.
    const overview = await creditQualityService.overview({})
    const summary = overview.examinationSummaries.find((s) => s.examinationRef === 'EXM-2026-012')
    expect(summary!.samplesConcluded).toBe(3)
    expect(summary!.exceptions).toBe(3)
  })

  it('refuses conclusions for analyst-tier and read-only roles (§19)', async () => {
    const samples = await creditQualityService.listLoanSamples({})
    const pending = samples.find((s) => !s.examinerConclusion)!
    await expect(
      creditQualityService.concludeLoanSample(pending.id, 'Satisfactory', 'x', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      creditQualityService.concludeLoanSample(pending.id, 'Satisfactory', 'x', READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      creditQualityService.concludeLoanSample(pending.id, 'Satisfactory', 'x', PORTAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('keeps the portfolio NPL story in the amber demo band', async () => {
    const overview = await creditQualityService.overview({})
    // Portfolio NPL ratio stays in the amber demo band driven by Meridian + Vanguard.
    expect(Number(overview.kpis.nplRatioPct)).toBeGreaterThan(6)
    expect(overview.kpis.concentratedExposures).toBeGreaterThan(0)
    const harmattan = overview.largeExposures.find((l) => l.counterparty === 'Harmattan Energy Ltd')
    expect(harmattan!.status).toBe('Near limit')
    expect(harmattan!.note).toContain('EWA-2026-013')
  })
})

describe('Treasury examination results (§8.3)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('records an examiner result on the Northstar HQLA drawdown', async () => {
    const transactions = await liquidityTreasuryService.listTreasuryTransactions({})
    const target = transactions.find((t) => t.reference === 'TRX-2026-032')
    expect(target).toBeDefined()

    const updated = await liquidityTreasuryService.recordExaminerResult(
      target!.id,
      'Exception',
      'HQLA drawdown ahead of the LCR amber reading — funding plan review required (test note).',
      EXAMINER,
    )
    expect(updated!.examinerResult).toBe('Exception')
    expect(updated!.examinerName).toBe('Samuel Ike')
  })

  it('refuses examiner results above/below the fieldwork tier (§19)', async () => {
    const transactions = await liquidityTreasuryService.listTreasuryTransactions({})
    const target = transactions.find((t) => t.reference === 'TRX-2026-031')!
    await expect(
      liquidityTreasuryService.recordExaminerResult(target.id, 'Satisfactory', 'x', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      liquidityTreasuryService.recordExaminerResult(target.id, 'Satisfactory', 'x', PORTAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('surfaces the Northstar LCR exception with its story anchors', async () => {
    const overview = await liquidityTreasuryService.overview({})
    const northstar = overview.exceptions.find((e) => e.exceptionRef === 'EXC-2026-011')
    expect(northstar).toBeDefined()
    expect(northstar!.observed).toBe('104.2')
    expect(northstar!.relatedAlertRef).toBe('EWA-2026-011')
    expect(northstar!.relatedSubmissionRef).toBe('SUB-2026-0144')

    // Institution-filtered KPIs reproduce the Northstar slide (SUB-2026-0144).
    const northstarRow = overview.depositConcentration.find((d) => d.institutionCode === 'NMB-002')!
    const filtered = await liquidityTreasuryService.overview({ institutionId: northstarRow.institutionId })
    expect(filtered.kpis.lcrPct).toBe('104.2')
    expect(filtered.kpis.lcrTrendDirection).toBe('deteriorating')
  })
})

describe('Stress run lifecycle (§8.4)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('creates a severe run, reproduces the Vanguard breach, then submits and approves it', async () => {
    const scenarios = await stressTestingService.listScenarios()
    const severe = scenarios.find((s) => s.reference === 'SCN-2026-002')!

    // Use the full demo portfolio via the institution ids on the seeded runs.
    const seeded = await stressTestingService.getRun(STORY.severePortfolioRunId)
    const allIds = seeded!.results.map((r) => r.institutionId)

    const created = await stressTestingService.createRun({ scenarioId: severe.id, institutionIds: allIds }, ANALYST)
    expect(created).toBeDefined()
    expect(created!.reference).toBe('RUN-2026-005')
    expect(created!.status).toBe('Draft')

    const vanguard = created!.results.find((r) => r.institutionName === 'Vanguard Regional Bank')!
    expect(vanguard.verdict).toBe('Breach')
    expect(Number(vanguard.carStressedPct)).toBeLessThan(10)
    const northstar = created!.results.find((r) => r.institutionName === 'Northstar Merchant Bank')!
    expect(Number(northstar.lcrStressedPct)).toBeLessThan(100)

    const submitted = await stressTestingService.submitRun(created!.id, ANALYST)
    expect(submitted!.status).toBe('Submitted')

    // Analysts cannot approve their own runs (§19 approval tier).
    await expect(
      stressTestingService.reviewRun(created!.id, 'Approved', 'nope', ANALYST),
    ).rejects.toBeInstanceOf(DemoPermissionError)

    const approved = await stressTestingService.reviewRun(
      created!.id,
      'Approved',
      'Approved for the demo financial-stability briefing (test note).',
      LEAD,
    )
    expect(approved!.status).toBe('Approved')
    expect(approved!.reviewerName).toBe('Amara Osei')
  })

  it('refuses run creation for read-only and institution roles (§19)', async () => {
    const scenarios = await stressTestingService.listScenarios()
    const seeded = await stressTestingService.getRun(STORY.severePortfolioRunId)
    const allIds = seeded!.results.map((r) => r.institutionId)
    await expect(
      stressTestingService.createRun({ scenarioId: scenarios[0].id, institutionIds: allIds }, READ_ONLY),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      stressTestingService.createRun({ scenarioId: scenarios[0].id, institutionIds: allIds }, PORTAL),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })

  it('labels every scenario illustrative and never official (§8.4)', async () => {
    const scenarios = await stressTestingService.listScenarios()
    expect(scenarios.length).toBeGreaterThan(0)
    for (const s of scenarios) {
      expect(s.illustrativeNote).toMatch(/illustrative/i)
      expect(s.illustrativeNote).toMatch(/not an official regulatory stress-test result/i)
    }
  })
})

describe('Indicator catalogue & thresholds (§8.5)', () => {
  beforeEach(() => {
    resetAllDemoData()
  })

  it('serves the LCR detail with the Northstar story reading and threshold history', async () => {
    const detail = await indicatorCatalogueService.detail('LCR')
    expect(detail).toBeDefined()
    expect(detail!.definition.formula).toContain('HQLA')
    expect(detail!.thresholdHistory.length).toBeGreaterThan(0)

    const northstarQ3 = detail!.readings.find(
      (r) => r.institutionName === 'Northstar Merchant Bank' && r.periodLabel === 'Q3 2026',
    )
    expect(northstarQ3).toBeDefined()
    expect(northstarQ3!.value).toBe('104.2')
    expect(northstarQ3!.breach).toBe('Amber')
    expect(northstarQ3!.relatedAlertRef).toBe('EWA-2026-011')
    expect(northstarQ3!.relatedExceptionRef).toBe('EXC-2026-011')
  })

  it('versions the rule and records history when thresholds change', async () => {
    const defs = await indicatorCatalogueService.listDefinitions()
    const lcr = defs.find((d) => d.code === 'LCR')!
    expect(lcr.ruleVersion).toBe('TH-LCR-2026.1 (demo)')

    const updated = await indicatorCatalogueService.updateThresholds(
      lcr.id,
      {
        thresholds: [
          { severity: 'Amber', operator: 'below', value: '115.0' },
          { severity: 'Red', operator: 'below', value: '100.0' },
        ],
        changeNote: 'Amber watch level raised 110 → 115 after the Northstar story review (test note).',
      },
      LEAD,
    )
    expect(updated!.ruleVersion).toBe('TH-LCR-2026.2 (demo)')

    const detail = await indicatorCatalogueService.detail('LCR')
    expect(detail!.thresholdHistory[0].change).toContain('115')
    expect(detail!.thresholdHistory[0].approvedByName).toBe('Amara Osei')
  })

  it('refuses threshold changes below the approval tier (§19)', async () => {
    const defs = await indicatorCatalogueService.listDefinitions()
    const car = defs.find((d) => d.code === 'CAR')!
    await expect(
      indicatorCatalogueService.updateThresholds(
        car.id,
        { thresholds: car.thresholds, changeNote: 'x' },
        ANALYST,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
    await expect(
      indicatorCatalogueService.updateThresholds(
        car.id,
        { thresholds: car.thresholds, changeNote: 'x' },
        PORTAL,
      ),
    ).rejects.toBeInstanceOf(DemoPermissionError)
  })
})
