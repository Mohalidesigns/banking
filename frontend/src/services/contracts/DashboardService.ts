import type { RiskRating } from '@/types/common'
import type { ActivityEvent } from '@/types/institution'
import type {
  EarlyWarningAlert,
  SupervisoryFinding,
  UpcomingItem,
} from '@/types/supervision'

/** Reporting period selector values (Spec §5.2 — changes mock values/charts). */
export type DashboardPeriod = 'quarter' | 'ytd' | 'trailing-12m'

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  quarter: 'Current quarter',
  ytd: 'Year to date',
  'trailing-12m': 'Trailing 12 months',
}

/** KPI card content; every value is derived from the mock repositories. */
export interface CommandCentreKpi {
  supervisedInstitutions: number
  highCriticalInstitutions: number
  examinationsInProgress: number
  outstandingActions: number
  overdueReturns: number
  /** Demo trend deltas vs the previous equivalent period. */
  deltas: {
    highCritical: number
    examinations: number
    outstandingActions: number
    overdueReturns: number
  }
}

export interface RiskDistributionSlice {
  rating: RiskRating
  count: number
}

export interface CategorySlice {
  category: string
  count: number
  /** Decimal string, millions */
  assetsMM: string
}

export interface PrudentialTrendPoint {
  periodLabel: string
  /** Portfolio-weighted averages, percent — illustrative demo figures */
  capitalAdequacyPct: number
  nplPct: number
  liquidityRatioPct: number
}

export interface PlanExecutionRow {
  planName: string
  plannedActivities: number
  completedActivities: number
  executionPct: number
  status: string
}

/** Alert / finding / watchlist rows pre-joined with institution labels so
 *  dashboard components never need a second lookup (still service data). */
export interface AlertRow extends EarlyWarningAlert {
  institutionName: string
  institutionCode: string
}

export interface FindingRow extends SupervisoryFinding {
  institutionName: string
  institutionCode: string
}

export interface WatchlistRow {
  id: string
  institutionId: string
  institutionName: string
  institutionCode: string
  reason: string
  severity: RiskRating
  addedDate: string
}

export interface CommandCentreData {
  /** ISO 8601 date the demo figures are reported as of. */
  reportingDate: string
  period: DashboardPeriod
  kpis: CommandCentreKpi
  riskDistribution: RiskDistributionSlice[]
  portfolioByCategory: CategorySlice[]
  prudentialTrend: PrudentialTrendPoint[]
  planExecution: PlanExecutionRow[]
  earlyWarnings: AlertRow[]
  highPriorityFindings: FindingRow[]
  upcoming: UpcomingItem[]
  timeline: ActivityEvent[]
  watchlist: WatchlistRow[]
}

/**
 * Supervisory Command Centre contract (Spec §5.2). One call returns the
 * full demo dashboard; a future ApiDashboardService swaps in unchanged.
 */
export interface DashboardService {
  getCommandCentre(period: DashboardPeriod): Promise<CommandCentreData>
}
