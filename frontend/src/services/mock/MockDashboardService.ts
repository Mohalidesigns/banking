import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { regulatoryRepository } from '@/mocks/repositories/regulatoryRepository'
import { supervisionRepository } from '@/mocks/repositories/supervisionRepository'
import type {
  AlertRow,
  CommandCentreData,
  DashboardPeriod,
  DashboardService,
  FindingRow,
  WatchlistRow,
} from '@/services/contracts/DashboardService'
import type { Institution } from '@/types/institution'
import type { UpcomingItem } from '@/types/supervision'

const LATENCY_MS = 220
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

const MS_PER_DAY = 86_400_000
const today = () => new Date()
const isoToday = () => today().toISOString().slice(0, 10)
const isoInDays = (n: number) => new Date(today().getTime() + n * MS_PER_DAY).toISOString().slice(0, 10)
const daysIn = (period: DashboardPeriod): number =>
  period === 'quarter' ? 90 : period === 'ytd' ? Math.ceil((today().getTime() - new Date(`${today().getFullYear()}-01-01`).getTime()) / MS_PER_DAY) : 365

/** Number of trailing quarterly snapshots shown per period selection. */
const windowSize = (period: DashboardPeriod): number =>
  period === 'quarter' ? 2 : period === 'ytd' ? 4 : 8

export class MockDashboardService implements DashboardService {
  async getCommandCentre(period: DashboardPeriod): Promise<CommandCentreData> {
    await latency()

    const institutions = institutionRepository.list()
    const instById = new Map<string, Institution>(institutions.map((i) => [i.id, i]))
    const label = (id: string) => ({
      institutionName: instById.get(id)?.tradingName ?? 'Unknown institution',
      institutionCode: instById.get(id)?.code ?? '—',
    })

    const window = daysIn(period)

    // KPIs — every value derived from the mock repositories.
    const exams = supervisionRepository.examinations()
    const inProgress = supervisionRepository.examinationsInProgress()
    const openFindings = supervisionRepository.openFindingsByStatus()
    const activeCaps = supervisionRepository
      .correctiveActions()
      .filter((c) => c.status === 'Open' || c.status === 'In Progress' || c.status === 'Overdue')
    const overdueReturns = supervisionRepository.overdueReturns()
    const alerts = supervisionRepository.alerts().filter((a) => a.status !== 'Resolved')
    const highCritical = institutions.filter(
      (i) => i.riskRating === 'High' || i.riskRating === 'Critical',
    )

    const countIn = <T,>(items: T[], dateOf: (t: T) => string, days: number, offset = 0) =>
      items.filter((t) => {
        const time = new Date(dateOf(t)).getTime()
        const now = today().getTime() - offset * MS_PER_DAY
        return time <= now && time >= now - days * MS_PER_DAY
      }).length

    const kpis = {
      supervisedInstitutions: institutions.length,
      highCriticalInstitutions: highCritical.length,
      examinationsInProgress: inProgress.length,
      outstandingActions: openFindings.length + activeCaps.length + alerts.length,
      overdueReturns: overdueReturns.length,
      deltas: {
        highCritical:
          countIn(supervisionRepository.watchlist(), (w) => w.addedDate, window) -
          countIn(supervisionRepository.watchlist(), (w) => w.addedDate, window, window),
        examinations:
          countIn(exams, (e) => e.startDate, window) -
          countIn(exams, (e) => e.startDate, window, window),
        outstandingActions:
          countIn(supervisionRepository.findings(), (f) => f.raisedDate, window) -
          countIn(supervisionRepository.findings(), (f) => f.raisedDate, window, window),
        overdueReturns:
          countIn(overdueReturns, (r) => r.dueDate, window) -
          countIn(overdueReturns, (r) => r.dueDate, window, window),
      },
    }

    // Risk distribution donut
    const riskDistribution = (['Critical', 'High', 'Medium', 'Low'] as const).map((rating) => ({
      rating,
      count: institutions.filter((i) => i.riskRating === rating).length,
    }))

    // Portfolio by category
    const byCategory = new Map<string, { count: number; assets: number }>()
    institutions.forEach((i) => {
      const entry = byCategory.get(i.category) ?? { count: 0, assets: 0 }
      entry.count += 1
      entry.assets += Number(i.totalAssetsMM)
      byCategory.set(i.category, entry)
    })
    const portfolioByCategory = [...byCategory.entries()]
      .map(([category, v]) => ({ category, count: v.count, assetsMM: v.assets.toFixed(2) }))
      .sort((a, b) => b.count - a.count)

    // Prudential trend — asset-weighted portfolio averages over the window
    const snapshotsByPeriod = new Map<string, { label: string; rows: Array<{ inst: Institution; car: number; npl: number; liq: number; assets: number }> }>()
    institutions.forEach((inst) => {
      institutionRepository.financials(inst.id).forEach((s) => {
        const bucket = snapshotsByPeriod.get(s.periodEnd) ?? { label: s.periodLabel, rows: [] }
        bucket.rows.push({
          inst,
          car: s.capitalAdequacyPct,
          npl: s.nplPct,
          liq: s.liquidityRatioPct,
          assets: Number(s.totalAssetsMM),
        })
        snapshotsByPeriod.set(s.periodEnd, bucket)
      })
    })
    const periodEnds = [...snapshotsByPeriod.keys()].sort()
    const windowEnds = periodEnds.slice(-windowSize(period))
    const prudentialTrend = windowEnds.map((end) => {
      const bucket = snapshotsByPeriod.get(end)!
      const totalAssets = bucket.rows.reduce((sum, r) => sum + r.assets, 0) || 1
      const wavg = (pick: (r: (typeof bucket.rows)[number]) => number) =>
        Number(
          (bucket.rows.reduce((sum, r) => sum + pick(r) * r.assets, 0) / totalAssets).toFixed(1),
        )
      return {
        periodLabel: bucket.label,
        capitalAdequacyPct: wavg((r) => r.car),
        nplPct: wavg((r) => r.npl),
        liquidityRatioPct: wavg((r) => r.liq),
      }
    })

    // Plan execution
    const planExecution = supervisionRepository
      .plans()
      .filter((p) => p.status !== 'Completed')
      .map((p) => ({
        planName: p.name,
        plannedActivities: p.plannedActivities,
        completedActivities: p.completedActivities,
        executionPct: p.executionPct,
        status: p.status,
      }))

    // Queues & panels
    const earlyWarnings: AlertRow[] = alerts
      .map((a) => ({ ...a, ...label(a.institutionId) }))
      .sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 }
        return sev[a.severity] - sev[b.severity]
      })

    const highPriorityFindings: FindingRow[] = supervisionRepository
      .highPriorityFindings()
      .slice(0, 6)
      .map((f) => ({ ...f, ...label(f.institutionId) }))

    const upcoming: UpcomingItem[] = [
      ...exams
        .filter((e) => e.status === 'Planned' && e.startDate >= isoToday())
        .map((e): UpcomingItem => ({
          id: e.id,
          kind: 'examination',
          title: `${e.reference} — ${e.type} examination`,
          institutionId: e.institutionId,
          date: e.startDate,
          statusLabel: 'Planned',
          link: `/app/examinations/${e.id}`,
        })),
      ...supervisionRepository
        .returns()
        .filter((r) => r.status === 'Due Soon' || r.status === 'Overdue')
        .map((r): UpcomingItem => ({
          id: r.id,
          kind: 'return-deadline',
          title: `${r.returnCode} — ${r.period}`,
          institutionId: r.institutionId,
          date: r.dueDate,
          statusLabel: r.status,
          link: `/app/returns/${r.id}`,
        })),
      ...supervisionRepository
        .riskAssessments()
        .filter((a) => a.status === 'In Progress' || a.status === 'In Review')
        .map((a): UpcomingItem => ({
          id: a.id,
          kind: 'assessment',
          title: `${a.year} risk assessment (${a.status})`,
          institutionId: a.institutionId,
          date: a.dueDate,
          statusLabel: a.status,
          link: '/app/risk-assessments',
        })),
      // Phase 4A — obligation reviews that are overdue or due within 7 days
      // (§10.2 register deep-link; keeps the Command Centre on the one story).
      ...regulatoryRepository
        .listObligations()
        .filter((o) => o.nextReviewDate <= isoInDays(7))
        .map((o): UpcomingItem => ({
          id: o.id,
          kind: 'obligation-review',
          title: `${o.reference} — ${o.title}`,
          date: o.nextReviewDate,
          statusLabel: o.nextReviewDate < isoToday() ? 'Review overdue' : 'Review due',
          link: `/app/regulatory/obligations?obligation=${encodeURIComponent(o.reference)}`,
        })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8)

    const watchlist: WatchlistRow[] = supervisionRepository.watchlist().map((w) => ({
      id: w.id,
      institutionId: w.institutionId,
      institutionName: label(w.institutionId).institutionName,
      institutionCode: label(w.institutionId).institutionCode,
      reason: w.reason,
      severity: w.severity,
      addedDate: w.addedDate,
    }))

    const timeline = institutionRepository.activity().slice(0, 10)

    return {
      reportingDate: isoToday(),
      period,
      kpis,
      riskDistribution,
      portfolioByCategory,
      prudentialTrend,
      planExecution,
      earlyWarnings,
      highPriorityFindings,
      upcoming,
      timeline,
      watchlist,
    }
  }
}

export const dashboardService: DashboardService = new MockDashboardService()
