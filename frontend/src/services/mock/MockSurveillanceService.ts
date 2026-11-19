import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { returnsRepository } from '@/mocks/repositories/returnsRepository'
import { surveillanceRepository } from '@/mocks/repositories/surveillanceRepository'
import { supervisionRepository } from '@/mocks/repositories/supervisionRepository'
import { MONITORED_RATIOS, RULE_BY_RATIO, RATIO_BY_CODE, THRESHOLD_RULES } from '@/mocks/fixtures/surveillance.fixture'
import { assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'
import type {
  EarlyWarningService,
  SurveillanceService,
} from '@/services/contracts/SurveillanceService'
import type { ActorContext } from '@/types/common'
import type { FinancialSnapshot, Institution } from '@/types/institution'
import type { EarlyWarningAlert } from '@/types/supervision'
import type {
  AlertQuery,
  AlertRow,
  CalculatedRatio,
  CreateAnalystReviewInput,
  EarlyWarningAlertDetail,
  ExceptionRow,
  InstitutionSurveillanceDetail,
  PeerComparisonRow,
  PrudentialException,
  SourceDataRow,
  SupervisoryDecisionEvent,
  SurveillanceAlertNote,
  SurveillanceOverview,
  SurveillanceQuery,
  SurveillanceTrendPoint,
} from '@/types/surveillance'

/**
 * Mock off-site surveillance & early-warning services (Spec §6.1, §6.4).
 * Derived figures (calculated ratios, trends, peer stats) are computed from
 * the same demo financial snapshots the profile screens use, so the story
 * stays coherent. Alert/exception/review mutations are role-gated
 * (`manage-alerts`, `create-analyst-review`) and prototype-session only.
 */

const latestSnapshot = (snaps: FinancialSnapshot[]): FinancialSnapshot | undefined =>
  snaps.length > 0 ? snaps[snaps.length - 1] : undefined

const priorSnapshot = (snaps: FinancialSnapshot[]): FinancialSnapshot | undefined =>
  snaps.length > 1 ? snaps[snaps.length - 2] : undefined

/** Ratio value pulled from the demo snapshot series for a ratio code. */
const snapshotValue = (snap: FinancialSnapshot | undefined, ratioCode: string): number | null => {
  if (!snap) return null
  switch (ratioCode) {
    case 'CAR':
      return snap.capitalAdequacyPct
    case 'LCR':
      return snap.liquidityRatioPct
    case 'NPL':
      return snap.nplPct
    case 'ROA':
      return snap.roaPct
    default:
      return null
  }
}

/** Breach evaluation against an illustrative demo threshold rule. */
const breachFor = (value: number, ratioCode: string): 'none' | 'Amber' | 'Red' => {
  const rule = RULE_BY_RATIO[ratioCode]
  if (!rule) return 'none'
  let breach: 'none' | 'Amber' | 'Red' = 'none'
  for (const level of rule.levels) {
    const threshold = Number(level.value)
    const hit = level.operator === 'below' ? value < threshold : value > threshold
    if (hit && (breach === 'none' || level.severity === 'Red')) breach = level.severity
  }
  return breach
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

class MockSurveillanceService implements SurveillanceService {
  async overview(query: SurveillanceQuery = {}): Promise<SurveillanceOverview> {
    await latency()
    const institutions = institutionRepository.list()
    const snapshotsByInst = new Map(
      institutions.map((i) => [i.id, institutionRepository.financials(i.id)]),
    )

    // Portfolio trend: averages per period across all institutions.
    const periodLabels = [...new Set(institutionRepository.financials(institutions[0].id).map((s) => s.periodLabel))]
    const trend: SurveillanceTrendPoint[] = periodLabels.map((label) => {
      const snaps = institutions
        .map((i) => (snapshotsByInst.get(i.id) ?? []).find((s) => s.periodLabel === label))
        .filter((s): s is FinancialSnapshot => s !== undefined)
      const avg = (pick: (s: FinancialSnapshot) => number) =>
        snaps.length > 0 ? Number((snaps.reduce((a, s) => a + pick(s), 0) / snaps.length).toFixed(1)) : 0
      return {
        periodLabel: label,
        capitalAdequacyPct: avg((s) => s.capitalAdequacyPct),
        nplPct: avg((s) => s.nplPct),
        liquidityRatioPct: avg((s) => s.liquidityRatioPct),
      }
    })

    const filteredInstitutions = query.institutionId
      ? institutions.filter((i) => i.id === query.institutionId)
      : institutions

    // Deteriorating: latest CAR or liquidity down vs prior period, or NPL up.
    const deteriorating = filteredInstitutions.filter((i) => {
      const snaps = snapshotsByInst.get(i.id) ?? []
      const latest = latestSnapshot(snaps)
      const prior = priorSnapshot(snaps)
      if (!latest || !prior) return false
      return (
        latest.capitalAdequacyPct < prior.capitalAdequacyPct ||
        latest.liquidityRatioPct < prior.liquidityRatioPct - 1 ||
        latest.nplPct > prior.nplPct + 0.2
      )
    })

    const exceptions = this.exceptionRows(institutions).filter(
      (e) => !query.severity || e.severity === query.severity,
    )
    const alerts = surveillanceRepository.alerts().filter(
      (a) => !query.alertStatus || a.status === query.alertStatus,
    )

    const kpis = {
      institutionsMonitored: filteredInstitutions.length,
      breachesDetected: exceptions.filter((e) => e.status !== 'Cleared').length,
      newAlerts: surveillanceRepository
        .alertBase()
        .filter((a) => a.status === 'Open' || a.status === 'Acknowledged').length,
      returnsAwaitingValidation: returnsRepository
        .base()
        .filter((r) => r.validation === 'Not Run').length,
      deterioratingInstitutions: deteriorating.length,
    }

    // Peer comparison: latest CAR across the portfolio.
    const carValues = institutions.map((i) => snapshotValue(latestSnapshot(snapshotsByInst.get(i.id) ?? []), 'CAR') ?? 0)
    const carMedian = median(carValues)
    const peerComparisons: PeerComparisonRow[] = institutions.map((i, idx) => ({
      institutionId: i.id,
      institutionName: i.tradingName,
      institutionCode: i.code,
      category: 'Capital adequacy (CAR %)',
      value: carValues[idx].toFixed(1),
      peerMedian: carMedian.toFixed(1),
      peerMin: Math.min(...carValues).toFixed(1),
      peerMax: Math.max(...carValues).toFixed(1),
      position: carValues[idx] > carMedian ? 'Above median' : carValues[idx] === carMedian ? 'At median' : 'Below median',
    }))

    const alertsAndNotes: SurveillanceAlertNote[] = alerts.map((a) => {
      const inst = institutions.find((i) => i.id === a.institutionId)
      const lastAssessment = a.assessments[a.assessments.length - 1]
      return {
        id: a.id,
        institutionId: a.institutionId,
        institutionName: inst?.tradingName ?? '—',
        indicator: a.indicator,
        severity: a.severity,
        status: a.status,
        triggeredAt: a.triggeredAt,
        note: lastAssessment?.text,
        noteBy: lastAssessment?.authorName,
      }
    })

    const watchlist = supervisionRepository.watchlist().map((w) => {
      const inst = institutions.find((i) => i.id === w.institutionId)
      return {
        id: w.id,
        institutionId: w.institutionId,
        institutionName: inst?.tradingName ?? '—',
        institutionCode: inst?.code ?? '—',
        reason: w.reason,
        severity: w.severity,
        addedDate: w.addedDate,
      }
    })

    return {
      reportingDate: new Date().toISOString().slice(0, 10),
      kpis,
      trend,
      exceptions,
      watchlist,
      peerComparisons,
      alertsAndNotes,
    }
  }

  private exceptionRows(institutions: Institution[]): ExceptionRow[] {
    return surveillanceRepository.exceptions().map((e) => {
      const inst = institutions.find((i) => i.id === e.institutionId)
      return {
        ...e,
        institutionName: inst?.tradingName ?? '—',
        institutionCode: inst?.code ?? '—',
        ratioName: RATIO_BY_CODE[e.ratioCode]?.name ?? e.ratioCode,
      }
    })
  }

  async institutionDetail(institutionId: string): Promise<InstitutionSurveillanceDetail | undefined> {
    await latency()
    const inst = institutionRepository.byId(institutionId)
    if (!inst) return undefined
    const snaps = institutionRepository.financials(institutionId)
    const latest = latestSnapshot(snaps)
    const prior = priorSnapshot(snaps)
    const periodLabel = latest?.periodLabel ?? 'n/a'

    const sourceData: SourceDataRow[] = latest
      ? [
          { periodLabel, label: 'Total assets', value: latest.totalAssetsMM, unit: 'MRD m', sourceReturn: 'MPR-09 (demo)' },
          { periodLabel, label: 'Total capital', value: latest.totalCapitalMM, unit: 'MRD m', sourceReturn: 'MPR-09 (demo)' },
          { periodLabel, label: 'Net profit', value: latest.netProfitMM, unit: 'MRD m', sourceReturn: 'MPR-09 (demo)' },
          { periodLabel, label: 'Capital adequacy', value: latest.capitalAdequacyPct.toFixed(1), unit: '%', sourceReturn: 'MPR-09 (demo)' },
          { periodLabel, label: 'Liquidity ratio', value: latest.liquidityRatioPct.toFixed(1), unit: '%', sourceReturn: 'MPR-04 (demo)' },
          { periodLabel, label: 'NPL ratio', value: latest.nplPct.toFixed(1), unit: '%', sourceReturn: 'QAR-02 (demo)' },
          { periodLabel, label: 'ROA', value: latest.roaPct.toFixed(2), unit: '%', sourceReturn: 'MPR-09 (demo)' },
          { periodLabel, label: 'ROE', value: latest.roePct.toFixed(2), unit: '%', sourceReturn: 'MPR-09 (demo)' },
        ]
      : []

    const calculatedRatios: CalculatedRatio[] = MONITORED_RATIOS.filter((r) => snapshotValue(latest, r.code) !== null).map((r) => {
      const value = snapshotValue(latest, r.code)!
      const priorValue = snapshotValue(prior, r.code)
      const improving = priorValue === null ? true : r.direction === 'higher-is-better' ? value > priorValue : value < priorValue
      const stable = priorValue !== null && Math.abs(value - priorValue) < 0.15
      return {
        code: r.code,
        name: r.name,
        definition: r.definition,
        unit: r.unit,
        value: value.toFixed(r.code === 'ROA' ? 2 : 1),
        priorValue: priorValue === null ? undefined : priorValue.toFixed(r.code === 'ROA' ? 2 : 1),
        trendDirection: stable ? 'stable' : improving ? 'improving' : 'deteriorating',
        thresholdRule: RULE_BY_RATIO[r.code],
        breach: breachFor(value, r.code),
      }
    })

    const trend: SurveillanceTrendPoint[] = snaps.map((s) => ({
      periodLabel: s.periodLabel,
      capitalAdequacyPct: s.capitalAdequacyPct,
      nplPct: s.nplPct,
      liquidityRatioPct: s.liquidityRatioPct,
    }))

    // Peer benchmark rows for each snapshot-derived ratio.
    const allInstitutions = institutionRepository.list()
    const peerBenchmark: PeerComparisonRow[] = MONITORED_RATIOS.filter((r) => r.code !== 'PC' && r.code !== 'DC').map((r) => {
      const values = allInstitutions.map(
        (i) => snapshotValue(latestSnapshot(institutionRepository.financials(i.id)), r.code) ?? 0,
      )
      const own = snapshotValue(latest, r.code) ?? 0
      const med = median(values)
      return {
        institutionId,
        institutionName: inst.tradingName,
        institutionCode: inst.code,
        category: `${r.name} (${r.code})`,
        value: own.toFixed(1),
        peerMedian: med.toFixed(1),
        peerMin: Math.min(...values).toFixed(1),
        peerMax: Math.max(...values).toFixed(1),
        position:
          r.direction === 'higher-is-better'
            ? own > med
              ? 'Above median'
              : own === med
                ? 'At median'
                : 'Below median'
            : own < med
              ? 'Above median'
              : own === med
                ? 'At median'
                : 'Below median',
      }
    })

    const alerts = surveillanceRepository
      .alerts()
      .filter((a) => a.institutionId === institutionId)
      .map((a) => ({ id: a.id, reference: a.reference, indicator: a.indicator, severity: a.severity, status: a.status }))

    return {
      institutionId,
      institutionName: inst.tradingName,
      institutionCode: inst.code,
      category: inst.category,
      riskRating: inst.riskRating,
      periodLabel,
      leadSupervisorName: inst.supervisory.leadSupervisorName,
      sourceData,
      calculatedRatios,
      trend,
      peerBenchmark,
      thresholdRules: THRESHOLD_RULES.map((r) => ({ ...r, levels: r.levels.map((l) => ({ ...l })) })),
      exceptions: this.exceptionRows(allInstitutions).filter((e) => e.institutionId === institutionId),
      analystReviews: surveillanceRepository.reviews(institutionId),
      decisions: surveillanceRepository.decisionsFor(institutionId),
      alerts,
    }
  }

  async listExceptions(query: SurveillanceQuery = {}): Promise<ExceptionRow[]> {
    await latency()
    const institutions = institutionRepository.list()
    return this.exceptionRows(institutions)
      .filter((e) => !query.institutionId || e.institutionId === query.institutionId)
      .filter((e) => !query.severity || e.severity === query.severity)
      .filter((e) => !query.indicator || e.ratioCode === query.indicator)
  }

  async listAnalystReviews(institutionId?: string) {
    await latency()
    return surveillanceRepository.reviews(institutionId)
  }

  async listDecisions(institutionId?: string) {
    await latency()
    return surveillanceRepository.decisionsFor(institutionId)
  }

  async createAnalystReview(input: CreateAnalystReviewInput, actor: ActorContext) {
    assertRegulator(actor, 'create-analyst-review')
    await latency()
    const created = surveillanceRepository.createReview(input, actor)
    notificationRepository.push({
      category: 'review-required',
      severity: 'info',
      title: `Analyst review ${created.reference} submitted`,
      body: `${created.trigger} — awaiting supervisory decision (demo notification).`,
      link: '/app/surveillance',
    })
    return created
  }

  async recordReviewDecision(id: string, decision: string, note: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return surveillanceRepository.recordReviewDecision(id, decision, note, actor)
  }

  async recordDecision(
    institutionId: string,
    action: SupervisoryDecisionEvent['action'],
    detail: string,
    actor: ActorContext,
  ) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    const created = surveillanceRepository.recordDecision(institutionId, action, detail, actor)
    if (action === 'Clarification requested') {
      notificationRepository.push({
        category: 'information-request-deadline',
        severity: 'info',
        title: 'Clarification requested (demo)',
        body: `${detail} — recorded in the supervisory decision history (demo notification).`,
        link: `/app/surveillance?institution=${institutionId}`,
      })
    }
    return created
  }

  async setExceptionStatus(
    id: string,
    status: PrudentialException['status'],
    actor: ActorContext,
    note?: string,
  ) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return surveillanceRepository.setExceptionStatus(id, status, actor, note)
  }
}

class MockEarlyWarningService implements EarlyWarningService {
  private rows(): AlertRow[] {
    const institutions = institutionRepository.list()
    return surveillanceRepository.alerts().map((a) => {
      const inst = institutions.find((i) => i.id === a.institutionId)
      return {
        ...a,
        institutionName: inst?.tradingName ?? 'Unknown institution',
        institutionCode: inst?.code ?? '—',
      }
    })
  }

  async list(query: AlertQuery = {}): Promise<AlertRow[]> {
    await latency()
    const search = query.search?.trim().toLowerCase()
    return this.rows()
      .filter((a) => !query.institutionId || a.institutionId === query.institutionId)
      .filter((a) => !query.severity || a.severity === query.severity)
      .filter((a) => !query.status || a.status === query.status)
      .filter((a) => !query.indicator || a.indicator === query.indicator)
      .filter(
        (a) =>
          !search ||
          `${a.reference} ${a.indicator} ${a.institutionName} ${a.message}`.toLowerCase().includes(search),
      )
      .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
  }

  async getById(id: string): Promise<EarlyWarningAlertDetail | undefined> {
    await latency()
    return surveillanceRepository.alertById(id)
  }

  async getByReference(reference: string): Promise<EarlyWarningAlertDetail | undefined> {
    await latency()
    return surveillanceRepository.alertByReference(reference)
  }

  private mutate(
    fn: () => EarlyWarningAlertDetail | undefined,
  ): Promise<EarlyWarningAlertDetail | undefined> {
    return Promise.resolve(fn())
  }

  async acknowledge(id: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    const updated = await this.mutate(() => surveillanceRepository.acknowledge(id, actor))
    if (updated) {
      notificationRepository.push({
        category: 'early-warning',
        severity: 'info',
        title: `${updated.reference} acknowledged`,
        body: `${updated.indicator} — acknowledged by ${actor.actorName} (demo notification).`,
        link: `/app/early-warnings?alert=${updated.id}`,
      })
    }
    return updated
  }

  async assign(id: string, analystName: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    const updated = await this.mutate(() => surveillanceRepository.assign(id, analystName, actor))
    if (updated) {
      notificationRepository.push({
        category: 'task-assigned',
        severity: 'info',
        title: `${updated.reference} assigned to ${analystName}`,
        body: `${updated.indicator} — early-warning analysis assigned (demo notification).`,
        link: `/app/early-warnings?alert=${updated.id}`,
      })
    }
    return updated
  }

  async addAssessment(id: string, text: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return this.mutate(() => surveillanceRepository.addAssessment(id, text, actor))
  }

  async escalate(id: string, note: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    const updated = await this.mutate(() => surveillanceRepository.escalate(id, note, actor))
    if (updated) {
      notificationRepository.push({
        category: 'early-warning',
        severity: 'critical',
        title: `${updated.reference} escalated`,
        body: `${note} (demo notification).`,
        link: `/app/early-warnings?alert=${updated.id}`,
      })
    }
    return updated
  }

  async dismiss(id: string, reason: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return this.mutate(() => surveillanceRepository.dismiss(id, reason, actor))
  }

  async resolve(id: string, note: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return this.mutate(() => surveillanceRepository.resolve(id, note, actor))
  }

  async linkExamination(
    id: string,
    examination: { reference: string; id: string; status: string },
    actor: ActorContext,
  ) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return this.mutate(() => surveillanceRepository.linkExamination(id, examination, actor))
  }

  async linkAction(id: string, action: NonNullable<EarlyWarningAlertDetail['linkedAction']>, actor: ActorContext) {
    assertRegulator(actor, 'manage-alerts')
    await latency()
    return this.mutate(() => surveillanceRepository.linkAction(id, action, actor))
  }
}

export const surveillanceService: SurveillanceService = new MockSurveillanceService()
export const earlyWarningService: EarlyWarningService = new MockEarlyWarningService()

/** Re-export for screens that render alert summaries from Phase-2A shapes. */
export type { EarlyWarningAlert }
