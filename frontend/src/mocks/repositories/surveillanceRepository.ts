/**
 * Mock surveillance repository (Spec §6.1, §6.4, §17.4, §18.3). Owns the
 * mutable early-warning alert details, prudential exceptions, analyst
 * reviews and supervisory decision history for the prototype session.
 * `alertBase()` exposes the Phase-2A EarlyWarningAlert summary projection
 * so `supervisionRepository` — and every Phase-2A consumer (Command Centre
 * alert queue/drawer, profile tabs, queue counts) — stays live with
 * Phase-3A alert workflow mutations.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import {
  ANALYST_REVIEWS,
  ALERT_DETAILS,
  PRUDENTIAL_EXCEPTIONS,
  SUPERVISORY_DECISIONS,
  buildAlertDetail,
} from '@/mocks/fixtures/surveillance.fixture'
import { EARLY_WARNING_ALERTS } from '@/mocks/fixtures/supervision.fixture'
import type { ActorContext } from '@/types/common'
import type { AlertStatus, EarlyWarningAlert } from '@/types/supervision'
import type {
  AlertEscalationAction,
  AnalystReview,
  CreateAnalystReviewInput,
  EarlyWarningAlertDetail,
  PrudentialException,
  SupervisoryDecisionEvent,
} from '@/types/surveillance'

const cloneAlert = (a: EarlyWarningAlertDetail): EarlyWarningAlertDetail => ({
  ...a,
  historicalTrend: a.historicalTrend.map((t) => ({ ...t })),
  relatedAlertRefs: [...a.relatedAlertRefs],
  assessments: a.assessments.map((x) => ({ ...x })),
  escalationHistory: a.escalationHistory.map((x) => ({ ...x })),
  sourceReturn: a.sourceReturn ? { ...a.sourceReturn } : undefined,
  linkedExamination: a.linkedExamination ? { ...a.linkedExamination } : undefined,
  linkedAction: a.linkedAction ? { ...a.linkedAction } : undefined,
})

const cloneException = (e: PrudentialException): PrudentialException => ({ ...e })
const cloneReview = (r: AnalystReview): AnalystReview => ({ ...r, decision: r.decision ? { ...r.decision } : undefined })

const alerts: EarlyWarningAlertDetail[] = ALERT_DETAILS.map(cloneAlert)
const exceptions: PrudentialException[] = PRUDENTIAL_EXCEPTIONS.map(cloneException)
const reviews: AnalystReview[] = ANALYST_REVIEWS.map(cloneReview)
const decisions: SupervisoryDecisionEvent[] = SUPERVISORY_DECISIONS.map((d) => ({ ...d }))

const seq = (): string => `srv-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

const byId = (id: string): EarlyWarningAlertDetail | undefined => alerts.find((a) => a.id === id)

const toBase = (a: EarlyWarningAlertDetail): EarlyWarningAlert => ({
  id: a.id,
  reference: a.reference,
  institutionId: a.institutionId,
  indicator: a.indicator,
  severity: a.severity,
  triggeredAt: a.triggeredAt,
  threshold: a.threshold,
  currentValue: a.currentValue,
  message: a.message,
  status: a.status,
  assignedToName: a.assignedToName,
})

const history = (a: EarlyWarningAlertDetail, actorName: string, action: AlertEscalationAction, note?: string): void => {
  a.escalationHistory.push({ id: seq(), at: new Date().toISOString(), byName: actorName, action, note })
}

const decide = (institutionId: string, actorName: string, action: SupervisoryDecisionEvent['action'], detail: string): void => {
  decisions.unshift({ id: seq(), institutionId, at: new Date().toISOString(), actorName, action, detail })
}

let reviewSeq = 7

export const surveillanceRepository = {
  // Alerts ------------------------------------------------------------------
  alerts(): EarlyWarningAlertDetail[] {
    return alerts.map(cloneAlert)
  },

  alertBase(): EarlyWarningAlert[] {
    return alerts.map(toBase)
  },

  alertById(id: string): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    return a ? cloneAlert(a) : undefined
  },

  alertByReference(reference: string): EarlyWarningAlertDetail | undefined {
    const a = alerts.find((x) => x.reference === reference)
    return a ? cloneAlert(a) : undefined
  },

  acknowledge(id: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a || a.status !== 'Open') return undefined
    a.status = 'Acknowledged'
    history(a, actor.actorName, 'Acknowledged')
    return cloneAlert(a)
  },

  assign(id: string, analystName: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.assignedToName = analystName
    history(a, actor.actorName, 'Assigned', `Assigned to ${analystName} (demo action).`)
    return cloneAlert(a)
  },

  addAssessment(id: string, text: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.assessments.push({ id: seq(), at: new Date().toISOString(), authorName: actor.actorName, text })
    history(a, actor.actorName, 'Assessment added')
    return cloneAlert(a)
  },

  escalate(id: string, note: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a || a.status === 'Resolved' || a.status === 'Dismissed') return undefined
    a.status = 'Escalated'
    history(a, actor.actorName, 'Escalated', note)
    decide(a.institutionId, actor.actorName, 'Alert escalated', `${a.reference} escalated — ${note}`)
    return cloneAlert(a)
  },

  dismiss(id: string, reason: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a || a.status === 'Resolved') return undefined
    a.status = 'Dismissed'
    a.dismissedReason = reason
    history(a, actor.actorName, 'Dismissed', reason)
    return cloneAlert(a)
  },

  resolve(id: string, note: string, actor: ActorContext): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.status = 'Resolved'
    history(a, actor.actorName, 'Resolved', note)
    return cloneAlert(a)
  },

  linkExamination(
    id: string,
    examination: { reference: string; id: string; status: string },
    actor: ActorContext,
  ): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.linkedExamination = { ...examination }
    history(a, actor.actorName, 'Converted to supervisory action', `Targeted examination ${examination.reference} linked (demo).`)
    decide(a.institutionId, actor.actorName, 'Targeted examination initiated', `${examination.reference} initiated from ${a.reference} (Journey B pattern).`)
    return cloneAlert(a)
  },

  linkAction(
    id: string,
    action: NonNullable<EarlyWarningAlertDetail['linkedAction']>,
    actor: ActorContext,
  ): EarlyWarningAlertDetail | undefined {
    const a = byId(id)
    if (!a) return undefined
    a.linkedAction = { ...action }
    history(a, actor.actorName, 'Converted to supervisory action', `${action.type} ${action.reference} linked (demo).`)
    return cloneAlert(a)
  },

  // Exceptions ----------------------------------------------------------------
  exceptions(): PrudentialException[] {
    return exceptions.map(cloneException)
  },

  exceptionsByInstitution(institutionId: string): PrudentialException[] {
    return exceptions.filter((e) => e.institutionId === institutionId).map(cloneException)
  },

  setExceptionStatus(id: string, status: PrudentialException['status'], actor: ActorContext, note?: string): PrudentialException | undefined {
    const e = exceptions.find((x) => x.id === id)
    if (!e) return undefined
    e.status = status
    if (note) e.note = note
    decide(e.institutionId, actor.actorName, status === 'Cleared' ? 'Exception cleared' : 'Watchlist decision', `${e.reference} → ${status}${note ? ` — ${note}` : ''}`)
    return cloneException(e)
  },

  // Analyst reviews & decisions ------------------------------------------------
  reviews(institutionId?: string): AnalystReview[] {
    const list = institutionId ? reviews.filter((r) => r.institutionId === institutionId) : reviews
    return list.map(cloneReview)
  },

  reviewById(id: string): AnalystReview | undefined {
    const r = reviews.find((x) => x.id === id)
    return r ? cloneReview(r) : undefined
  },

  createReview(input: CreateAnalystReviewInput, actor: ActorContext): AnalystReview {
    const created: AnalystReview = {
      id: demoUuid(56, reviewSeq + reviews.length),
      reference: `ARV-2026-${String(reviewSeq + reviews.length).padStart(3, '0')}`,
      institutionId: input.institutionId,
      periodLabel: input.periodLabel,
      analystName: actor.actorName,
      createdAt: new Date().toISOString(),
      trigger: input.trigger,
      assessment: input.assessment,
      recommendation: input.recommendation,
      status: 'Submitted',
    }
    reviews.unshift(created)
    decide(input.institutionId, actor.actorName, 'Analyst review created', `${created.reference} — ${input.trigger}`)
    return cloneReview(created)
  },

  recordReviewDecision(id: string, decisionText: string, note: string, actor: ActorContext): AnalystReview | undefined {
    const r = reviews.find((x) => x.id === id)
    if (!r || r.status === 'Actioned') return undefined
    r.status = 'Actioned'
    r.decision = { at: new Date().toISOString(), byName: actor.actorName, decision: decisionText, note }
    decide(r.institutionId, actor.actorName, 'Watchlist decision', `${r.reference} actioned — ${decisionText}`)
    return cloneReview(r)
  },

  decisionsFor(institutionId?: string): SupervisoryDecisionEvent[] {
    const list = institutionId ? decisions.filter((d) => d.institutionId === institutionId) : decisions
    return list.map((d) => ({ ...d })).sort((a, b) => b.at.localeCompare(a.at))
  },

  reset(): void {
    alerts.length = 0
    EARLY_WARNING_ALERTS.map(buildAlertDetail).forEach((a) => alerts.push(cloneAlert(a)))
    exceptions.length = 0
    PRUDENTIAL_EXCEPTIONS.forEach((e) => exceptions.push(cloneException(e)))
    reviews.length = 0
    ANALYST_REVIEWS.forEach((r) => reviews.push(cloneReview(r)))
    decisions.length = 0
    SUPERVISORY_DECISIONS.forEach((d) => decisions.push({ ...d }))
    reviewSeq = 7
  },
}

/** Convenience for status colour mapping on the alert screens. */
export const isOpenAlertStatus = (status: AlertStatus): boolean =>
  status === 'Open' || status === 'Acknowledged' || status === 'Escalated'
