import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { prudentialRepository } from '@/mocks/repositories/prudentialRepository'
import { surveillanceRepository } from '@/mocks/repositories/surveillanceRepository'
import {
  CURRENCY_EXPOSURE,
  COLLATERAL_ROWS,
  FUNDING_MATURITY,
  LARGE_EXPOSURES,
  LIQUID_ASSETS,
  LIQUIDITY_SEEDS,
  LOAN_BOOK_SEEDS,
  CREDIT_EXAMINATION_SUMMARIES,
  RELATED_PARTY_LOANS,
  RESTRUCTURED_LOANS,
  RWA_BREAKDOWN_SEED,
  SECTOR_MIX,
  TOP_BORROWERS,
} from '@/mocks/fixtures/prudential.fixture'
import { RATIO_BY_CODE } from '@/mocks/fixtures/surveillance.fixture'
import { assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'
import type {
  CapitalAdequacyService,
  CreditQualityService,
  IndicatorCatalogueService,
  LiquidityTreasuryService,
  StressTestingService,
} from '@/services/contracts/PrudentialService'
import type { ActorContext } from '@/types/common'
import type { FinancialSnapshot } from '@/types/institution'
import type {
  AgeingBucketRow,
  CapitalBreachRow,
  CapitalComponentSlice,
  CapitalMetricDetail,
  CapitalOverview,
  CapitalSubmissionRow,
  CapitalTrendPoint,
  CollateralRow,
  CreateStressRunInput,
  CreditExaminationSummary,
  CreditKpis,
  CreditOverview,
  IndicatorDetail,
  IndicatorReadingRow,
  InstitutionCapitalDetail,
  LargeExposureRow,
  LiquidityExceptionNote,
  LiquidityKpis,
  LiquidityOverview,
  LoanClassificationRow,
  LoanSample,
  ProvisionMovementRow,
  PrudentialIndicatorDefinition,
  PrudentialPeriodQuery,
  RelatedPartyLoanRow,
  RestructuredLoanRow,
  RwaBreakdownSlice,
  SectorExposureRow,
  StressRun,
  StressScenario,
  TopBorrowerRow,
  TreasuryExaminerResult,
  TreasuryTransaction,
  UpdateIndicatorThresholdsInput,
} from '@/types/prudential'
import type { ExceptionRow } from '@/types/surveillance'

/**
 * Mock prudential services (Spec §8.1–§8.5, §18.3). Portfolio series are
 * derived from the same demo financial snapshots the surveillance screens
 * use; story figures reconcile with the Phase-3A returns (SUB-2026-0143/
 * 0144/0145), exceptions (EXC-2026-011/008/013/016/018/005) and alerts
 * (EWA-2026-011/008/013). Mutations are role-gated per §19 and stay in the
 * prototype session only. EVERY figure is illustrative demo data; stress
 * results are never official regulatory outcomes (Spec §8.4).
 */

/** Demo capital-structure split applied to snapshot CAR series (§8.1 trend). */
const CET1_SHARE = 0.79
const TIER1_SHARE = 0.86

const num = (v: string): number => Number(v)
const fix1 = (v: number): string => v.toFixed(1)
const fix2 = (v: number): string => v.toFixed(2)

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)

const CHRONOLOGICAL_LABELS = [
  'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026',
  'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026',
]
const labelOrder = (label: string): number => {
  const i = CHRONOLOGICAL_LABELS.indexOf(label)
  return i === -1 ? CHRONOLOGICAL_LABELS.length : i
}

/** Live exception rows (Phase-3A repository state) enriched for display. */
function exceptionRows(ratioCodes: string[]): ExceptionRow[] {
  const institutions = institutionRepository.list()
  return surveillanceRepository
    .exceptions()
    .filter((e) => ratioCodes.includes(e.ratioCode))
    .map((e) => {
      const inst = institutions.find((i) => i.id === e.institutionId)
      return {
        ...e,
        institutionName: inst?.tradingName ?? '—',
        institutionCode: inst?.code ?? '—',
        ratioName: RATIO_BY_CODE[e.ratioCode]?.name ?? e.ratioCode,
      }
    })
}

/** Latest submission row per institution (October where filed, else September). */
function latestSubmissionsByInstitution(submissions: CapitalSubmissionRow[]): Map<string, CapitalSubmissionRow> {
  const latest = new Map<string, CapitalSubmissionRow>()
  for (const s of submissions) {
    const cur = latest.get(s.institutionId)
    if (!cur || labelOrder(s.periodLabel) > labelOrder(cur.periodLabel)) latest.set(s.institutionId, s)
  }
  return latest
}

function snapshotTrend(institutionId?: string): CapitalTrendPoint[] {
  const institutions = institutionId
    ? institutionRepository.list().filter((i) => i.id === institutionId)
    : institutionRepository.list()
  const snapsByInst = institutions.map((i) => institutionRepository.financials(i.id))
  const labels = (snapsByInst[0] ?? []).map((s) => s.periodLabel)
  return labels.map((label, idx) => {
    const snaps = snapsByInst
      .map((snaps) => snaps[idx])
      .filter((s): s is FinancialSnapshot => s !== undefined)
    const weights = snaps.map((s) => Number(s.totalAssetsMM))
    const totalWeight = sum(weights) || 1
    const car = sum(snaps.map((s, i) => s.capitalAdequacyPct * weights[i])) / totalWeight
    return {
      periodLabel: label,
      carPct: Number(fix1(car)),
      cet1Pct: Number(fix1(car * CET1_SHARE)),
      tier1Pct: Number(fix1(car * TIER1_SHARE)),
      tier2Pct: Number(fix1(car * (1 - TIER1_SHARE))),
    }
  })
}

// ---------------------------------------------------------------------------
// Capital adequacy (§8.1)
// ---------------------------------------------------------------------------

class MockCapitalAdequacyService implements CapitalAdequacyService {
  async overview(query: PrudentialPeriodQuery = {}): Promise<CapitalOverview> {
    await latency()
    const all = prudentialRepository.capitalSubmissions()
    const submissions = all
      .filter((s) => !query.institutionId || s.institutionId === query.institutionId)
      .sort((a, b) => labelOrder(b.periodLabel) - labelOrder(a.periodLabel))
    const latest = latestSubmissionsByInstitution(submissions)

    const totalCapital = sum([...latest.values()].map((s) => num(s.totalCapitalMM)))
    const totalRwa = sum([...latest.values()].map((s) => num(s.rwaMM)))
    const breaches = prudentialRepository
      .capitalBreaches()
      .filter((b) => !query.institutionId || b.institutionId === query.institutionId)
    const buffers = [...latest.values()].map((s) => num(s.bufferPct))

    const rwaBreakdown: RwaBreakdownSlice[] = RWA_BREAKDOWN_SEED.map((slice) => ({
      riskCategory: slice.riskCategory,
      amountMM: fix1((num(slice.pct) / 100) * totalRwa),
      pctOfTotal: slice.pct,
    }))

    return {
      reportingDate: new Date().toISOString().slice(0, 10),
      kpis: {
        totalRegulatoryCapitalMM: fix1(totalCapital),
        totalRwaMM: fix1(totalRwa),
        portfolioCarPct: totalRwa > 0 ? fix1((totalCapital / totalRwa) * 100) : '0.0',
        institutionsWithBuffer: buffers.filter((b) => b > 0).length,
        institutionsWithShortfall: buffers.filter((b) => b < 0).length,
        openBreaches: breaches.filter((b) => b.status !== 'Cleared').length,
      },
      submissions,
      breaches,
      adjustments: prudentialRepository
        .regulatoryAdjustments()
        .filter((a) => !query.institutionId || a.institutionId === query.institutionId),
      portfolioTrend: snapshotTrend(query.institutionId),
      rwaBreakdown,
      exceptions: exceptionRows(['CAR']),
    }
  }

  async institutionDetail(institutionId: string): Promise<InstitutionCapitalDetail | undefined> {
    await latency()
    const inst = institutionRepository.byId(institutionId)
    if (!inst) return undefined
    const submissions = prudentialRepository
      .capitalSubmissions()
      .filter((s) => s.institutionId === institutionId)
      .sort((a, b) => labelOrder(b.periodLabel) - labelOrder(a.periodLabel))
    const latest = submissions[0]
    const rwa = latest ? num(latest.rwaMM) : 0

    const composition: CapitalComponentSlice[] = latest
      ? [
          { code: 'CET1', label: 'Common Equity Tier 1', amountMM: latest.cet1MM, pctOfTotal: fix1((num(latest.cet1MM) / num(latest.totalCapitalMM)) * 100) },
          { code: 'AT1', label: 'Additional Tier 1', amountMM: fix1(num(latest.tier1MM) - num(latest.cet1MM)), pctOfTotal: fix1(((num(latest.tier1MM) - num(latest.cet1MM)) / num(latest.totalCapitalMM)) * 100) },
          { code: 'T2', label: 'Tier 2', amountMM: latest.tier2MM, pctOfTotal: fix1((num(latest.tier2MM) / num(latest.totalCapitalMM)) * 100) },
        ]
      : []

    const carDetail: CapitalMetricDetail = {
      metric: 'Capital Adequacy Ratio (CAR)',
      definition: 'Total regulatory capital as a percentage of risk-weighted assets (demo definition).',
      formula: 'CAR = (CET1 + AT1 + Tier 2) ÷ RWA × 100',
      sourceSubmissionRef: latest?.submissionRef,
      sourceSubmissionId: latest?.submissionId,
      periodLabel: latest?.periodLabel ?? 'n/a',
      ruleVersion: latest?.ruleVersion ?? 'TH-CAR-2026.1 (demo)',
      breakdown: latest
        ? [
            { label: 'CET1 capital', value: latest.cet1MM, unit: 'MRD m', formula: 'Paid-up capital + retained earnings − deductions' },
            { label: 'Additional Tier 1', value: fix1(num(latest.tier1MM) - num(latest.cet1MM)), unit: 'MRD m', formula: 'Tier 1 − CET1' },
            { label: 'Tier 1 capital', value: latest.tier1MM, unit: 'MRD m', formula: 'CET1 + AT1' },
            { label: 'Tier 2 capital', value: latest.tier2MM, unit: 'MRD m', formula: 'Subordinated debt + general provisions (capped)' },
            { label: 'Total regulatory capital', value: latest.totalCapitalMM, unit: 'MRD m', formula: 'Tier 1 + Tier 2' },
            { label: 'Risk-weighted assets', value: latest.rwaMM, unit: 'MRD m', formula: 'Σ exposure × risk weight + market/operational RWA' },
            { label: 'Capital adequacy ratio', value: latest.carPct, unit: '%', formula: 'Total capital ÷ RWA × 100' },
          ]
        : [],
      reviewerStatus: latest?.reviewStatus ?? 'Awaiting Review',
    }

    // Latest approved portfolio run provides the stress summary (§8.1 panel).
    const approvedRun = prudentialRepository
      .stressRuns()
      .filter((r) => r.status === 'Approved')
      .sort((a, b) => b.runAt.localeCompare(a.runAt))[0]
    const stressSummary = (approvedRun?.results ?? [])
      .filter((r) => r.institutionId === institutionId)
      .map((r) => ({
        scenarioName: approvedRun.scenarioName,
        carBaselinePct: r.carBaselinePct,
        carStressedPct: r.carStressedPct,
        verdict: r.verdict,
        runReference: approvedRun.reference,
      }))

    return {
      institutionId,
      institutionName: inst.tradingName,
      institutionCode: inst.code,
      category: inst.category,
      periodLabel: latest?.periodLabel ?? 'n/a',
      composition,
      trend: snapshotTrend(institutionId),
      rwaBreakdown: RWA_BREAKDOWN_SEED.map((slice) => ({
        riskCategory: slice.riskCategory,
        amountMM: fix1((num(slice.pct) / 100) * rwa),
        pctOfTotal: slice.pct,
      })),
      deductions: prudentialRepository.regulatoryAdjustments().filter((a) => a.institutionId === institutionId),
      breaches: prudentialRepository.capitalBreaches().filter((b) => b.institutionId === institutionId),
      submissions,
      carDetail,
      stressSummary,
      exceptions: exceptionRows(['CAR']).filter((e) => e.institutionId === institutionId),
    }
  }

  async startSubmissionReview(id: string, actor: ActorContext): Promise<CapitalSubmissionRow | undefined> {
    assertRegulator(actor, 'review-prudential')
    await latency()
    const updated = prudentialRepository.setSubmissionReviewStatus(id, 'In Review', actor)
    if (updated) {
      notificationRepository.push({
        category: 'review-required',
        severity: 'info',
        title: `Capital submission review started — ${updated.institutionName}`,
        body: `${updated.periodLabel} ${updated.returnCode} (CAR ${updated.carPct}%) moved to In Review by ${actor.actorName} (demo notification).`,
        link: '/app/prudential/capital',
      })
    }
    return updated
  }

  async decideSubmission(
    id: string,
    decision: 'Accepted' | 'Rejected',
    note: string,
    actor: ActorContext,
  ): Promise<CapitalSubmissionRow | undefined> {
    assertRegulator(actor, 'approve-prudential')
    await latency()
    const updated = prudentialRepository.setSubmissionReviewStatus(id, decision, actor, note)
    if (updated) {
      notificationRepository.push({
        category: decision === 'Rejected' ? 'early-warning' : 'review-required',
        severity: decision === 'Rejected' ? 'warning' : 'info',
        title: `Capital submission ${decision.toLowerCase()} — ${updated.institutionName}`,
        body: `${updated.periodLabel} ${updated.returnCode}: ${note} (demo notification).`,
        link: '/app/prudential/capital',
      })
    }
    return updated
  }

  async setBreachStatus(
    id: string,
    status: CapitalBreachRow['status'],
    note: string,
    actor: ActorContext,
  ): Promise<CapitalBreachRow | undefined> {
    assertRegulator(actor, 'approve-prudential')
    await latency()
    const updated = prudentialRepository.setBreachStatus(id, status, actor, note)
    if (updated) {
      notificationRepository.push({
        category: 'early-warning',
        severity: status === 'Cleared' ? 'info' : 'warning',
        title: `Capital breach ${status.toLowerCase()} — ${updated.institutionName}`,
        body: `${updated.measure} ${updated.observedPct}% vs required ${updated.requiredPct}%: ${note} (demo notification).`,
        link: '/app/prudential/capital',
      })
    }
    return updated
  }
}

// ---------------------------------------------------------------------------
// Credit & asset quality (§8.2)
// ---------------------------------------------------------------------------

interface CreditBook {
  institutionId: string
  gross: number
  nplBalance: number
  provisions: number
  par30to90: number
  restructuredPct: number
}

function creditBooks(query: PrudentialPeriodQuery): CreditBook[] {
  return LOAN_BOOK_SEEDS.filter((b) => !query.institutionId || b.institutionId === query.institutionId)
    .map((b) => {
      const gross = num(b.grossLoansMM)
      const nplBalance = (gross * b.nplPct) / 100
      return {
        institutionId: b.institutionId,
        gross,
        nplBalance,
        provisions: (nplBalance * b.coveragePct) / 100,
        par30to90: num(b.par30To90MM),
        restructuredPct: b.restructuredPct,
      }
    })
    .filter((b) => b.gross > 0)
}

class MockCreditQualityService implements CreditQualityService {
  async overview(query: PrudentialPeriodQuery = {}): Promise<CreditOverview> {
    await latency()
    const books = creditBooks(query)
    const gross = sum(books.map((b) => b.gross))
    const nplBalance = sum(books.map((b) => b.nplBalance))
    const provisions = sum(books.map((b) => b.provisions))
    const par30to90 = sum(books.map((b) => b.par30to90))

    const kpis: CreditKpis = {
      grossLoansMM: fix1(gross),
      nplBalanceMM: fix1(nplBalance),
      nplRatioPct: gross > 0 ? fix1((nplBalance / gross) * 100) : '0.0',
      provisionCoveragePct: nplBalance > 0 ? fix1((provisions / nplBalance) * 100) : '0.0',
      concentratedExposures: LARGE_EXPOSURES.filter(
        (l) => (!query.institutionId || l.institutionId === query.institutionId) && l.status !== 'Within limit',
      ).length,
    }

    // Sector exposures: portfolio mix applied to the filtered loan books.
    const sectorExposures: SectorExposureRow[] = SECTOR_MIX.map((sector) => {
      const outstanding = sum(books.map((b) => (b.gross * sector.weightPct) / 100))
      const weightedNpl =
        outstanding > 0
          ? sum(
              books.map((b) => {
                const share = (b.gross * sector.weightPct) / 100
                const seed = LOAN_BOOK_SEEDS.find((s) => s.institutionId === b.institutionId)
                const npl = Math.max(0.1, (seed?.nplPct ?? 0) + sector.sectorNplUpliftPct)
                return share * npl
              }),
            ) / outstanding
          : 0
      return {
        sector: sector.sector,
        outstandingMM: fix1(outstanding),
        pctOfPortfolio: gross > 0 ? fix1((outstanding / gross) * 100) : '0.0',
        nplPct: fix1(weightedNpl),
      }
    })

    // Classification: NPL grades split 55/30/15; provisions distributed so the
    // portfolio coverage reconciles with the story seeds (demo derivation).
    const sub = nplBalance * 0.55
    const doubt = nplBalance * 0.3
    const loss = nplBalance * 0.15
    const specialMention = sum(books.map((b) => (b.gross * (b.restructuredPct * 0.55 + 0.8)) / 100))
    const pass = Math.max(0, gross - nplBalance - specialMention)
    const provWeights: Array<[LoanClassificationRow['classification'], number, number]> = [
      ['Pass', pass, 0.1],
      ['Special Mention', specialMention, 0.15],
      ['Substandard', sub, 0.35],
      ['Doubtful', doubt, 0.25],
      ['Loss', loss, 0.15],
    ]
    const classifications: LoanClassificationRow[] = provWeights.map(([classification, balance, w]) => ({
      classification,
      facilities: Math.max(2, Math.round((balance / Math.max(gross, 1)) * 16400)),
      outstandingMM: fix1(balance),
      provisionMM: fix1(provisions * w),
      pctOfPortfolio: gross > 0 ? fix1((balance / gross) * 100) : '0.0',
    }))

    const over90 = nplBalance * 0.82
    const d61to90 = par30to90 * 0.42
    const d31to60 = par30to90 * 0.36
    const d1to30 = par30to90 * 0.22
    const current = Math.max(0, gross - over90 - d61to90 - d31to60 - d1to30)
    const ageing: AgeingBucketRow[] = [
      ['Current', current],
      ['1–30 days', d1to30],
      ['31–60 days', d31to60],
      ['61–90 days', d61to90],
      ['Over 90 days', over90],
    ].map(([bucket, amount]) => ({
      bucket: bucket as AgeingBucketRow['bucket'],
      outstandingMM: fix1(amount as number),
      pctOfPortfolio: gross > 0 ? fix1(((amount as number) / gross) * 100) : '0.0',
    }))

    // Provision movement: four quarters converging on the current coverage.
    const provFactors = [0.86, 0.91, 0.96, 1.0]
    const nplFactors = [0.88, 0.92, 0.96, 1.0]
    const provLabels = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026']
    const provisionMovement: ProvisionMovementRow[] = provLabels.map((periodLabel, i) => {
      const closing = provisions * provFactors[i]
      const opening = i === 0 ? closing * 0.97 : provisions * provFactors[i - 1]
      const writeOff = nplBalance * 0.021
      const recoveries = writeOff * 0.42
      const charge = closing - opening + writeOff - recoveries
      const nplNow = nplBalance * nplFactors[i]
      return {
        periodLabel,
        openingMM: fix1(opening),
        chargeMM: fix1(charge),
        writeOffMM: fix1(writeOff),
        recoveriesMM: fix1(recoveries),
        closingMM: fix1(closing),
        coveragePct: nplNow > 0 ? fix1((closing / nplNow) * 100) : '0.0',
      }
    })

    // Examination summaries keep concluded/exception counts live with the
    // loan-sample workflow state.
    const samples = prudentialRepository.loanSamples()
    const examinationSummaries: CreditExaminationSummary[] = CREDIT_EXAMINATION_SUMMARIES.filter(
      (s) => !query.institutionId || s.institutionId === query.institutionId,
    ).map((s) => {
      const drawn = samples.filter((l) => l.examinationRef === s.examinationRef)
      return {
        examinationRef: s.examinationRef,
        institutionId: s.institutionId,
        institutionName: drawn[0]?.institutionName ?? institutionRepository.byId(s.institutionId)?.tradingName ?? '—',
        samplesDrawn: s.samplesDrawn,
        samplesConcluded: drawn.filter((l) => l.examinerConclusion).length,
        exceptions: drawn.filter((l) => l.examinerConclusion && l.examinerConclusion !== 'Satisfactory').length,
        status: s.status,
      }
    })

    const byInst = <T extends { institutionId: string }>(rows: T[]): T[] =>
      rows.filter((r) => !query.institutionId || r.institutionId === query.institutionId)

    return {
      reportingDate: new Date().toISOString().slice(0, 10),
      kpis,
      sectorExposures,
      classifications,
      ageing,
      topBorrowers: byInst<TopBorrowerRow>(TOP_BORROWERS),
      restructured: byInst<RestructuredLoanRow>(RESTRUCTURED_LOANS),
      provisionMovement,
      largeExposures: byInst<LargeExposureRow>(LARGE_EXPOSURES),
      relatedParty: byInst<RelatedPartyLoanRow>(RELATED_PARTY_LOANS),
      collateral: byInst<CollateralRow>(COLLATERAL_ROWS),
      examinationSummaries,
    }
  }

  async listLoanSamples(query: PrudentialPeriodQuery = {}): Promise<LoanSample[]> {
    await latency()
    return prudentialRepository
      .loanSamples()
      .filter((l) => !query.institutionId || l.institutionId === query.institutionId)
  }

  async concludeLoanSample(
    id: string,
    conclusion: NonNullable<LoanSample['examinerConclusion']>,
    note: string,
    actor: ActorContext,
  ): Promise<LoanSample | undefined> {
    assertRegulator(actor, 'record-fieldwork')
    await latency()
    const updated = prudentialRepository.concludeLoanSample(id, conclusion, note, actor)
    if (updated) {
      notificationRepository.push({
        category: conclusion === 'Escalate to finding' ? 'early-warning' : 'review-required',
        severity: conclusion === 'Escalate to finding' ? 'warning' : 'info',
        title: `Loan sample ${updated.reference} concluded — ${conclusion}`,
        body: `${updated.borrower} (${updated.institutionName}): ${note} (demo notification).`,
        link: '/app/prudential/credit',
      })
    }
    return updated
  }
}

// ---------------------------------------------------------------------------
// Liquidity & treasury (§8.3)
// ---------------------------------------------------------------------------

/** Exceptions → source submissions for the liquidity exception notes (story). */
const LIQUIDITY_EXCEPTION_SUBMISSIONS: Record<string, string> = {
  'EXC-2026-011': 'SUB-2026-0144',
  'EXC-2026-005': 'SUB-2026-0142',
}

class MockLiquidityTreasuryService implements LiquidityTreasuryService {
  async overview(query: PrudentialPeriodQuery = {}): Promise<LiquidityOverview> {
    await latency()
    const seeds = LIQUIDITY_SEEDS.filter(
      (s) => !query.institutionId || s.institutionId === query.institutionId,
    )
    const hqla = sum(seeds.map((s) => num(s.hqlaMM)))
    const outflows = sum(seeds.map((s) => num(s.netOutflows30dMM)))
    const deposits = sum(seeds.map((s) => num(s.totalDepositsMM)))
    const weighted = (pick: (s: (typeof seeds)[number]) => number): number =>
      deposits > 0 ? sum(seeds.map((s) => pick(s) * num(s.totalDepositsMM))) / deposits : 0

    // Portfolio NSFR offset derived from the seed averages (demo derivation).
    const nsfrAvg = seeds.length > 0 ? sum(seeds.map((s) => s.nsfrPct)) / seeds.length : 0
    const lcrSeedAvg = seeds.length > 0 ? sum(seeds.map((s) => s.lcrPct)) / seeds.length : 0
    const nsfrOffset = nsfrAvg - lcrSeedAvg

    const snapshots = institutionRepository
      .list()
      .filter((i) => !query.institutionId || i.id === query.institutionId)
      .map((i) => institutionRepository.financials(i.id))
    const labels = (snapshots[0] ?? []).map((s) => s.periodLabel)
    const trend = labels.map((label, idx) => {
      const rows = snapshots.map((s) => s[idx]).filter((s): s is FinancialSnapshot => s !== undefined)
      const weights = rows.map((r) => Number(r.totalAssetsMM))
      const lcr = sum(rows.map((r, i) => r.liquidityRatioPct * weights[i])) / (sum(weights) || 1)
      return { periodLabel: label, lcrPct: Number(fix1(lcr)), nsfrPct: Number(fix1(Math.max(60, lcr + nsfrOffset))) }
    })
    const last = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    const lcrTrendDirection: LiquidityKpis['lcrTrendDirection'] =
      !last || !prev ? 'stable' : last.lcrPct > prev.lcrPct + 0.5 ? 'improving' : last.lcrPct < prev.lcrPct - 0.5 ? 'deteriorating' : 'stable'

    const latest = latestSubmissionsByInstitution(prudentialRepository.capitalSubmissions())
    const totalCapital = sum([...latest.values()].map((s) => num(s.totalCapitalMM))) || 1
    const fxOpen = sum(CURRENCY_EXPOSURE.map((c) => Math.abs(num(c.netOpenMM))))

    const kpis: LiquidityKpis = {
      hqlaMM: fix1(hqla),
      lcrPct: outflows > 0 ? fix1((hqla / outflows) * 100) : '0.0',
      nsfrPct: fix1(Math.max(60, (outflows > 0 ? (hqla / outflows) * 100 : 0) + nsfrOffset)),
      depositConcentrationPct: fix1(weighted((s) => num(s.largestDepositorPct))),
      fxOpenPositionPct: fix2((fxOpen / totalCapital) * 100),
      lcrTrendDirection,
    }

    const depositConcentration = seeds.map((s) => {
      const largest = num(s.largestDepositorPct)
      return {
        institutionId: s.institutionId,
        institutionName: institutionRepository.byId(s.institutionId)?.tradingName ?? '—',
        institutionCode: institutionRepository.byId(s.institutionId)?.code ?? '—',
        totalDepositsMM: s.totalDepositsMM,
        top10Pct: s.top10Pct,
        largestDepositorPct: s.largestDepositorPct,
        retailPct: s.retailPct,
        wholesalePct: s.wholesalePct,
        status: largest > 25 ? ('Red' as const) : largest > 20 ? ('Amber' as const) : ('Within threshold' as const),
      }
    })

    const exceptions: LiquidityExceptionNote[] = surveillanceRepository
      .exceptions()
      .filter((e) => ['LCR', 'NSFR', 'DC'].includes(e.ratioCode))
      .filter((e) => !query.institutionId || e.institutionId === query.institutionId)
      .map((e) => {
        const inst = institutionRepository.byId(e.institutionId)
        return {
          exceptionRef: e.reference,
          institutionName: inst?.tradingName ?? '—',
          ratioCode: e.ratioCode,
          observed: e.observedValue,
          threshold: e.thresholdValue,
          severity: e.severity,
          status: e.status,
          relatedAlertRef: e.relatedAlertRef,
          relatedSubmissionRef: LIQUIDITY_EXCEPTION_SUBMISSIONS[e.reference],
          note: e.note,
        }
      })

    return {
      reportingDate: new Date().toISOString().slice(0, 10),
      kpis,
      trend,
      fundingMaturity: FUNDING_MATURITY.map((r) => ({ ...r })),
      liquidAssets: LIQUID_ASSETS.map((r) => ({ ...r })),
      depositConcentration,
      currencyExposure: CURRENCY_EXPOSURE.map((r) => ({ ...r })),
      exceptions,
    }
  }

  async listTreasuryTransactions(query: PrudentialPeriodQuery = {}): Promise<TreasuryTransaction[]> {
    await latency()
    return prudentialRepository
      .treasuryTransactions()
      .filter((t) => !query.institutionId || t.institutionId === query.institutionId)
      .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  }

  async recordExaminerResult(
    id: string,
    result: TreasuryExaminerResult,
    note: string,
    actor: ActorContext,
  ): Promise<TreasuryTransaction | undefined> {
    assertRegulator(actor, 'record-fieldwork')
    await latency()
    const updated = prudentialRepository.recordTreasuryResult(id, result, note, actor)
    if (updated) {
      notificationRepository.push({
        category: result === 'Escalate' ? 'early-warning' : 'review-required',
        severity: result === 'Escalate' ? 'warning' : 'info',
        title: `Treasury transaction ${updated.reference} — ${result}`,
        body: `${updated.instrument} (${updated.institutionName}): ${note} (demo notification).`,
        link: '/app/prudential/liquidity',
      })
    }
    return updated
  }
}

// ---------------------------------------------------------------------------
// Stress testing (§8.4) — illustrative demo calculations only
// ---------------------------------------------------------------------------

class MockStressTestingService implements StressTestingService {
  private fillNames(run: StressRun): StressRun {
    return {
      ...run,
      results: run.results.map((r) => ({
        ...r,
        institutionName: r.institutionName || institutionRepository.byId(r.institutionId)?.tradingName || '—',
      })),
    }
  }

  async listScenarios(): Promise<StressScenario[]> {
    await latency()
    return prudentialRepository.stressScenarios()
  }

  async getScenario(id: string): Promise<StressScenario | undefined> {
    await latency()
    return prudentialRepository.stressScenarioById(id)
  }

  async listRuns(): Promise<StressRun[]> {
    await latency()
    return prudentialRepository
      .stressRuns()
      .map((r) => this.fillNames(r))
      .sort((a, b) => b.runAt.localeCompare(a.runAt))
  }

  async getRun(id: string): Promise<StressRun | undefined> {
    await latency()
    const run = prudentialRepository.stressRunById(id)
    return run ? this.fillNames(run) : undefined
  }

  async createRun(input: CreateStressRunInput, actor: ActorContext): Promise<StressRun | undefined> {
    assertRegulator(actor, 'run-stress-test')
    await latency()
    const created = prudentialRepository.createRun(input, actor)
    if (created) {
      const filled = this.fillNames(created)
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `Stress run ${filled.reference} created (demo)`,
        body: `${filled.scenarioName} across ${filled.results.length} institution(s) — illustrative prototype calculation, not an official regulatory result.`,
        link: '/app/prudential/stress-testing',
      })
      return filled
    }
    return undefined
  }

  async submitRun(id: string, actor: ActorContext): Promise<StressRun | undefined> {
    assertRegulator(actor, 'run-stress-test')
    await latency()
    const updated = prudentialRepository.submitRun(id, actor)
    if (updated) {
      notificationRepository.push({
        category: 'approval-required',
        severity: 'info',
        title: `Stress run ${updated.reference} submitted for review`,
        body: `${updated.scenarioName} — awaiting reviewer approval (demo notification).`,
        link: '/app/prudential/stress-testing',
      })
    }
    return updated ? this.fillNames(updated) : undefined
  }

  async reviewRun(
    id: string,
    decision: 'Approved' | 'Rejected',
    note: string,
    actor: ActorContext,
  ): Promise<StressRun | undefined> {
    assertRegulator(actor, 'approve-prudential')
    await latency()
    const updated = prudentialRepository.reviewRun(id, decision, note, actor)
    if (updated) {
      notificationRepository.push({
        category: 'review-required',
        severity: decision === 'Rejected' ? 'warning' : 'info',
        title: `Stress run ${updated.reference} ${decision.toLowerCase()} (demo)`,
        body: `${note} — reviewer ${actor.actorName}. Illustrative prototype calculation only.`,
        link: '/app/prudential/stress-testing',
      })
    }
    return updated ? this.fillNames(updated) : undefined
  }
}

// ---------------------------------------------------------------------------
// Indicator catalogue (§8.5)
// ---------------------------------------------------------------------------

class MockIndicatorCatalogueService implements IndicatorCatalogueService {
  private fillReadings(readings: IndicatorReadingRow[], query: PrudentialPeriodQuery): IndicatorReadingRow[] {
    return readings
      .filter((r) => !query.institutionId || r.institutionId === query.institutionId)
      .map((r) => {
        const inst = institutionRepository.byId(r.institutionId)
        return { ...r, institutionName: inst?.tradingName ?? '—', institutionCode: inst?.code ?? '—' }
      })
  }

  async listDefinitions(): Promise<PrudentialIndicatorDefinition[]> {
    await latency()
    return prudentialRepository.indicatorDefinitions()
  }

  async detail(codeOrId: string, query: PrudentialPeriodQuery = {}): Promise<IndicatorDetail | undefined> {
    await latency()
    const definition =
      prudentialRepository.indicatorDefinitionByCode(codeOrId) ??
      prudentialRepository.indicatorDefinitionById(codeOrId)
    if (!definition) return undefined
    const filled = this.fillReadings(prudentialRepository.indicatorReadings(definition.code), query).sort(
      (a, b) => labelOrder(a.periodLabel) - labelOrder(b.periodLabel),
    )

    // Portfolio-average history across periods.
    const byPeriod = new Map<string, number[]>()
    for (const r of filled) {
      const list = byPeriod.get(r.periodLabel) ?? []
      list.push(Number(r.value))
      byPeriod.set(r.periodLabel, list)
    }
    const history = [...byPeriod.entries()]
      .sort((a, b) => labelOrder(a[0]) - labelOrder(b[0]))
      .map(([periodLabel, values]) => ({
        periodLabel,
        value: fix1(sum(values) / values.length),
      }))

    return {
      definition,
      history,
      thresholdHistory: prudentialRepository.thresholdHistoryFor(definition.code),
      readings: filled,
    }
  }

  async updateThresholds(
    id: string,
    input: UpdateIndicatorThresholdsInput,
    actor: ActorContext,
  ): Promise<PrudentialIndicatorDefinition | undefined> {
    assertRegulator(actor, 'manage-indicator-thresholds')
    await latency()
    const updated = prudentialRepository.updateThresholds(id, input, actor)
    if (updated) {
      notificationRepository.push({
        category: 'system',
        severity: 'info',
        title: `Indicator thresholds updated — ${updated.code}`,
        body: `${updated.name} now ${updated.ruleVersion}: ${input.changeNote} (demo notification).`,
        link: '/app/prudential/indicators',
      })
    }
    return updated
  }
}

export const capitalAdequacyService: CapitalAdequacyService = new MockCapitalAdequacyService()
export const creditQualityService: CreditQualityService = new MockCreditQualityService()
export const liquidityTreasuryService: LiquidityTreasuryService = new MockLiquidityTreasuryService()
export const stressTestingService: StressTestingService = new MockStressTestingService()
export const indicatorCatalogueService: IndicatorCatalogueService = new MockIndicatorCatalogueService()
