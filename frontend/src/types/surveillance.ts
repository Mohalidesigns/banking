/**
 * Off-site surveillance and early-warning domain contracts
 * (Spec §6.1, §6.4, §18.4, Phase 3A). Extends the Phase-2
 * `EarlyWarningAlert` summary with the full alert detail (trigger, source
 * return, trend, rule version, assessments, escalation history, linked
 * action) and adds the surveillance model: monitored ratio definitions,
 * versioned threshold rules, prudential exceptions, analyst reviews and
 * peer comparisons.
 *
 * Every threshold here is an ILLUSTRATIVE DEMO value — the screens label
 * them as such until "approved regulatory rules" are loaded (Spec §6.4).
 */
import type { EarlyWarningAlert } from '@/types/supervision'

// ---------------------------------------------------------------------------
// Monitored ratios and threshold rules (Spec §6.1)
// ---------------------------------------------------------------------------

export type RatioCategory =
  | 'Capital'
  | 'Asset Quality'
  | 'Liquidity'
  | 'Earnings'
  | 'Market Sensitivity'

export interface MonitoredRatioDefinition {
  /** Short code, e.g. "CAR" */
  code: string
  name: string
  category: RatioCategory
  /** Formula/description shown in "calculated ratios and definitions". */
  definition: string
  unit: '%' | 'x' | 'MRD m'
  /** Which direction is prudent — drives breach semantics. */
  direction: 'higher-is-better' | 'lower-is-better'
  /** Return codes that feed this ratio, e.g. ["MPR-09"]. */
  sourceReturns: string[]
}

export type ThresholdRuleStatus =
  | 'Illustrative demo'
  | 'Pending approval'
  | 'Approved regulatory rule'

export interface ThresholdLevel {
  severity: 'Amber' | 'Red'
  operator: 'below' | 'above'
  /** Decimal string, e.g. "110.0" for an LCR amber floor. */
  value: string
}

export interface ThresholdRule {
  id: string
  ratioCode: string
  /** Rule version, e.g. "TH-LCR-2026.1 (demo)" — surfaced on alert detail. */
  version: string
  /** ISO 8601 */
  effectiveFrom: string
  status: ThresholdRuleStatus
  levels: ThresholdLevel[]
  note: string
}

// ---------------------------------------------------------------------------
// Prudential exceptions (Spec §6.1 exception table)
// ---------------------------------------------------------------------------

export type ExceptionSeverity = 'Amber' | 'Red'

export type PrudentialExceptionStatus = 'Open' | 'Monitoring' | 'Escalated' | 'Cleared'

export interface PrudentialException {
  id: string
  /** e.g. EXC-2026-014 */
  reference: string
  institutionId: string
  /** Reporting period label, e.g. "October 2026" */
  periodLabel: string
  ratioCode: string
  /** Decimal strings */
  observedValue: string
  thresholdValue: string
  severity: ExceptionSeverity
  /** Threshold rule version applied */
  ruleVersion: string
  /** ISO 8601 */
  detectedAt: string
  status: PrudentialExceptionStatus
  /** Early-warning alert raised from this exception, if any. */
  relatedAlertRef?: string
  note: string
}

// ---------------------------------------------------------------------------
// Analyst reviews and supervisory decisions (Spec §6.1 detail)
// ---------------------------------------------------------------------------

export type AnalystReviewStatus = 'Draft' | 'Submitted' | 'Actioned'

export interface AnalystReview {
  id: string
  /** e.g. ARV-2026-005 */
  reference: string
  institutionId: string
  periodLabel: string
  analystName: string
  /** ISO 8601 */
  createdAt: string
  /** What triggered the review, e.g. "EWA-2026-011 liquidity amber". */
  trigger: string
  assessment: string
  recommendation: string
  status: AnalystReviewStatus
  /** Supervisory decision recorded against the review, if any. */
  decision?: {
    /** ISO 8601 */
    at: string
    byName: string
    decision: string
    note: string
  }
}

export type SupervisoryDecisionAction =
  | 'Analyst review created'
  | 'Clarification requested'
  | 'Alert escalated'
  | 'Targeted examination initiated'
  | 'Watchlist decision'
  | 'Exception cleared'

export interface SupervisoryDecisionEvent {
  id: string
  institutionId: string
  /** ISO 8601 */
  at: string
  actorName: string
  action: SupervisoryDecisionAction
  detail: string
}

// ---------------------------------------------------------------------------
// Peer comparison (Spec §6.1)
// ---------------------------------------------------------------------------

export interface PeerComparisonRow {
  institutionId: string
  institutionName: string
  institutionCode: string
  category: string
  /** Decimal string for the latest period */
  value: string
  peerMedian: string
  peerMin: string
  peerMax: string
  position: 'Above median' | 'At median' | 'Below median'
}

// ---------------------------------------------------------------------------
// Surveillance overview + institution detail (Spec §6.1)
// ---------------------------------------------------------------------------

export interface SurveillanceKpis {
  institutionsMonitored: number
  breachesDetected: number
  newAlerts: number
  returnsAwaitingValidation: number
  deterioratingInstitutions: number
}

export interface SurveillanceTrendPoint {
  periodLabel: string
  /** Portfolio-weighted demo averages, percent */
  capitalAdequacyPct: number
  nplPct: number
  liquidityRatioPct: number
}

export interface ExceptionRow extends PrudentialException {
  institutionName: string
  institutionCode: string
  ratioName: string
}

export interface WatchlistRow {
  id: string
  institutionId: string
  institutionName: string
  institutionCode: string
  reason: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  /** ISO 8601 */
  addedDate: string
}

export interface SurveillanceAlertNote {
  id: string
  institutionId: string
  institutionName: string
  indicator: string
  severity: 'critical' | 'warning' | 'info'
  status: string
  /** ISO 8601 */
  triggeredAt: string
  /** Latest analyst note, if any. */
  note?: string
  noteBy?: string
}

export interface SurveillanceQuery {
  institutionId?: string
  category?: string
  period?: string
  indicator?: string
  severity?: string
  alertStatus?: string
}

export interface SurveillanceOverview {
  /** ISO 8601 date the demo figures are reported as of */
  reportingDate: string
  kpis: SurveillanceKpis
  trend: SurveillanceTrendPoint[]
  exceptions: ExceptionRow[]
  watchlist: WatchlistRow[]
  peerComparisons: PeerComparisonRow[]
  alertsAndNotes: SurveillanceAlertNote[]
}

/** A calculated ratio for the institution surveillance detail screen. */
export interface CalculatedRatio {
  code: string
  name: string
  definition: string
  unit: string
  /** Decimal string, latest submitted value */
  value: string
  priorValue?: string
  trendDirection: 'improving' | 'deteriorating' | 'stable'
  thresholdRule?: ThresholdRule
  breach: 'none' | 'Amber' | 'Red'
}

/** Submitted source data row for the surveillance detail screen. */
export interface SourceDataRow {
  periodLabel: string
  label: string
  value: string
  unit?: string
  /** Return reference the figure came from, e.g. "MPR-09 Oct 2026". */
  sourceReturn?: string
}

export interface InstitutionSurveillanceDetail {
  institutionId: string
  institutionName: string
  institutionCode: string
  category: string
  riskRating: 'Critical' | 'High' | 'Medium' | 'Low'
  /** Latest reporting period reviewed */
  periodLabel: string
  leadSupervisorName: string
  sourceData: SourceDataRow[]
  calculatedRatios: CalculatedRatio[]
  /** Trend series for charts (last 8 quarters). */
  trend: SurveillanceTrendPoint[]
  peerBenchmark: PeerComparisonRow[]
  thresholdRules: ThresholdRule[]
  exceptions: ExceptionRow[]
  analystReviews: AnalystReview[]
  decisions: SupervisoryDecisionEvent[]
  alerts: Array<{ id: string; reference?: string; indicator: string; severity: string; status: string }>
}

// ---------------------------------------------------------------------------
// Early-warning alert detail (Spec §6.4)
// ---------------------------------------------------------------------------

export interface AlertAssessment {
  id: string
  /** ISO 8601 */
  at: string
  authorName: string
  text: string
}

export type AlertEscalationAction =
  | 'Raised'
  | 'Acknowledged'
  | 'Assigned'
  | 'Assessment added'
  | 'Escalated'
  | 'Dismissed'
  | 'Converted to supervisory action'
  | 'Resolved'

export interface AlertEscalationEvent {
  id: string
  /** ISO 8601 */
  at: string
  byName: string
  action: AlertEscalationAction
  note?: string
}

export interface EarlyWarningAlertDetail extends EarlyWarningAlert {
  /** Required on the detail record, e.g. EWA-2026-011 */
  reference: string
  /** Plain-language explanation of why the rule fired. */
  triggerExplanation: string
  /** Threshold rule applied */
  ruleCode: string
  ruleVersion: string
  /** Illustrative/demo labelling for the threshold (Spec §6.4). */
  thresholdNote: string
  /** Underlying source return and period (§6.4). */
  sourceReturn?: {
    submissionId: string
    returnCode: string
    period: string
  }
  /** Historical trend of the indicator (decimal strings). */
  historicalTrend: Array<{ periodLabel: string; value: string }>
  /** References of related alerts, e.g. ["EWA-2026-008"]. */
  relatedAlertRefs: string[]
  assessments: AlertAssessment[]
  escalationHistory: AlertEscalationEvent[]
  /** Linked examination or supervisory action (§6.4). */
  linkedExamination?: {
    reference: string
    id: string
    status: string
  }
  linkedAction?: {
    type: 'Enforcement case' | 'Corrective action' | 'Analyst review' | 'Watchlist'
    reference: string
    link: string
  }
  assignedAnalystId?: string
  dismissedReason?: string
}

/** Alert table row pre-joined with institution labels (§6.4 columns). */
export interface AlertRow extends EarlyWarningAlertDetail {
  institutionName: string
  institutionCode: string
}

export interface AlertQuery {
  institutionId?: string
  severity?: string
  status?: string
  indicator?: string
  search?: string
}

export interface CreateAnalystReviewInput {
  institutionId: string
  periodLabel: string
  trigger: string
  assessment: string
  recommendation: string
}
