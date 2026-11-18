import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  MessageSquarePlus,
  RotateCcw,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react'
import { RiskHeatMap, type HeatCell } from '@/components/charts/RiskHeatMap'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { riskAssessmentService } from '@/services/mock/MockRiskAssessmentService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { AssessmentMethodology, RiskAssessmentDetail } from '@/types/supervision'
import type { RiskRating } from '@/types/common'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Risk assessment detail (Spec §6.2): heat map (DS §8.14 colours), category
 * scores with narratives and evidence references, prior-period comparison,
 * reviewer comments, approval trail and the recommended supervisory
 * intensity. Methodology name/version is always shown with the demo scoring
 * explanation — never presented as a universal formula.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  'Not Started': 'draft',
  'In Progress': 'fieldwork',
  'In Review': 'reporting',
  Completed: 'completed',
}

const ratingOf = (value: number): RiskRating =>
  value >= 4.5 ? 'Critical' : value >= 3.5 ? 'High' : value >= 2.5 ? 'Medium' : 'Low'

const intensityTone: Record<string, string> = {
  Routine: 'bg-tint-green text-success',
  Enhanced: 'bg-tint-yellow text-yellow',
  Intensive: 'bg-tint-orange text-warning',
  Intervention: 'bg-tint-red text-error',
}

export function RiskAssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const navigate = useNavigate()
  const actor = useActor()
  const canSubmit = can(actor.actorRole, 'submit-assessment')
  const canApprove = can(actor.actorRole, 'approve-assessment')

  const [assessment, setAssessment] = useState<RiskAssessmentDetail | null | undefined>(undefined)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [methodologies, setMethodologies] = useState<AssessmentMethodology[]>([])
  const [busy, setBusy] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState('')
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideCategory, setOverrideCategory] = useState('')
  const [overrideResidual, setOverrideResidual] = useState('3')
  const [overrideReason, setOverrideReason] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)

  const load = useCallback(async () => {
    if (!assessmentId) return
    const [found, meths] = await Promise.all([
      riskAssessmentService.getById(assessmentId),
      riskAssessmentService.methodologies(),
    ])
    setAssessment(found ?? null)
    setMethodologies(meths)
    if (found) setInstitution(await institutionService.getById(found.institutionId))
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const methodology = useMemo(
    () => methodologies.find((m) => m.id === assessment?.methodologyId),
    [methodologies, assessment],
  )

  const heatCells = useMemo<HeatCell[]>(() => {
    if (!assessment) return []
    const cells: HeatCell[] = []
    for (const score of assessment.categoryScores) {
      const existing = cells.find((c) => c.x === score.inherent && c.y === score.control)
      const names = existing ? `${existing.title}, ${score.category}` : score.category
      if (existing) {
        existing.count += 1
        existing.title = names
        existing.tone = Math.max(existing.tone, Math.min(5, Math.max(1, score.residual))) as HeatCell['tone']
      } else {
        cells.push({
          x: Math.min(5, Math.max(1, score.inherent)),
          y: Math.min(5, Math.max(1, score.control)),
          count: 1,
          tone: Math.min(5, Math.max(1, score.residual)) as HeatCell['tone'],
          title: names,
          label: score.category.split(' ').map((w) => w[0]).join('').slice(0, 3),
        })
      }
    }
    return cells
  }, [assessment])

  if (assessment === undefined) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  if (assessment === null) {
    return (
      <div>
        <PageHeader title="Risk assessment not found" />
        <ErrorState
          title="Unknown assessment"
          message={`No risk assessment with id "${assessmentId}" exists in the demo dataset. It may have been created in a previous prototype session that was reset.`}
          onRetry={() => navigate('/app/risk-assessments')}
          retryLabel="Back to register"
        />
      </div>
    )
  }

  const a = assessment

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await load()
      toast.success('Demo action completed', `${label} — saved in prototype session.`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', `${label} could not be completed in the prototype.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl text-primary">{a.reference}</span>
            <StatusBadge status={a.status} tone={STATUS_TONES[a.status]} />
            <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-semibold', intensityTone[a.recommendedIntensity] ?? 'bg-page text-ink-secondary')}>
              Recommended intensity: {a.recommendedIntensity} (demo)
            </span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <button
              type="button"
              className="cursor-pointer font-medium text-primary hover:underline"
              onClick={() => navigate(`/app/institutions/${a.institutionId}/risk`)}
            >
              {institution?.tradingName ?? 'Institution'}
            </button>
            <span aria-hidden="true">·</span>
            <span>{a.year} cycle ({formatDate(a.periodStart)} → {formatDate(a.periodEnd)})</span>
            <span aria-hidden="true">·</span>
            <span>
              Methodology {a.methodologyName} <span className="font-mono text-[10px]">{a.methodologyVersion}</span>
            </span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo scoring
            </span>
          </span>
        }
        breadcrumbs={[
          { label: 'Risk Assessments', path: '/app/risk-assessments' },
          { label: a.reference },
        ]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/app/risk-assessments')}>
              Register
            </Button>
            {a.status === 'In Progress' && canSubmit && (
              <>
                <Button variant="outline" iconLeft={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setOverrideOpen(true)}>
                  Override residual
                </Button>
                <Button
                  variant="primary"
                  iconLeft={<ArrowUpRight className="h-4 w-4" />}
                  loading={busy}
                  onClick={() => void runAction('Assessment submitted for approval', () =>
                    riskAssessmentService.submitForApproval(a.id, actor),
                  )}
                >
                  Submit for approval
                </Button>
              </>
            )}
            {a.status === 'In Review' && canApprove && (
              <>
                <Button
                  variant="outline"
                  iconLeft={<MessageSquarePlus className="h-4 w-4" />}
                  onClick={() => setCommentOpen(true)}
                >
                  Add comment
                </Button>
                <Button variant="warning" iconLeft={<RotateCcw className="h-4 w-4" />} onClick={() => setReturnOpen(true)}>
                  Return
                </Button>
                <Button
                  variant="success"
                  iconLeft={<Check className="h-4 w-4" />}
                  loading={busy}
                  onClick={() => setConfirmApprove(true)}
                >
                  Approve
                </Button>
              </>
            )}
            {a.status === 'In Review' && !canApprove && (
              <p className="rounded-lg bg-page px-3 py-2 text-[11px] text-ink-secondary">
                Awaiting approval by a reviewer with the demo <em>approve-assessment</em> permission
                (Assistant Director or above — Spec §19). Current role: {actor.actorRole}.
              </p>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Heat map */}
        <Card className="xl:col-span-1">
          <CardHeader
            title="Risk heat map"
            subtitle="Inherent risk × control weakness; cell colour = residual band (DS §8.14 demo scale)."
          />
          <CardBody>
            <RiskHeatMap
              cells={heatCells}
              xLabel="Inherent risk →"
              yLabel="Control weakness →"
              xTicks={['1 Low', '2', '3', '4', '5 High']}
              yTicks={['1 Strong', '2', '3', '4', '5 Weak']}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-secondary">
              Cell labels are category initials; counts show how many assessed categories fall in each
              inherent/control combination. Prototype rendering of demo scores.
            </p>
          </CardBody>
        </Card>

        {/* Category scores */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Category scores"
            subtitle={`${a.categoryScores.length} categories scored under ${a.methodologyName} ${a.methodologyVersion}.`}
            action={<RiskBadge rating={a.overallRisk} />}
          />
          <CardBody>
            <div className="flex flex-col gap-3">
              {a.categoryScores.map((c) => (
                <div key={c.category} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{c.category}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded bg-page px-2 py-0.5 text-ink-secondary">
                        Inherent <span className="font-semibold text-ink">{c.inherent}</span>
                      </span>
                      <span className="rounded bg-page px-2 py-0.5 text-ink-secondary">
                        Control <span className="font-semibold text-ink">{c.control}</span></span>
                      <span className="rounded bg-primary px-2 py-0.5 font-semibold text-white">
                        Residual {c.residual}
                      </span>
                      <RiskBadge rating={ratingOf(c.residual)} />
                      {c.overridden && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tint-orange px-2 py-0.5 text-[9px] font-semibold text-warning">
                          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                          Override
                        </span>
                      )}
                    </div>
                  </div>
                  {c.narrative && <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{c.narrative}</p>}
                  {c.overridden && c.overrideReason && (
                    <p className="mt-2 rounded bg-tint-orange/40 px-2.5 py-1.5 text-[11px] text-warning">
                      <span className="font-semibold">Override rationale:</span> {c.overrideReason}
                    </p>
                  )}
                  {c.evidenceRefs.length > 0 && (
                    <p className="mt-2 text-[10px] text-ink-secondary">
                      <span className="overline">Supporting evidence (demo references):</span>{' '}
                      {c.evidenceRefs.join(' · ')}
                    </p>
                  )}
                </div>
              ))}
              {a.categoryScores.length === 0 && (
                <p className="text-xs text-ink-secondary">
                  No categories scored yet — this assessment is still being drafted in the prototype session.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Methodology & scoring explanation */}
        <Card>
          <CardHeader title="Methodology & demo scoring" subtitle={`${a.methodologyName} ${a.methodologyVersion}`} />
          <CardBody>
            <p className="text-xs leading-relaxed text-ink-secondary">
              {methodology?.scoringNote ??
                'Demo scoring note unavailable for this methodology version — scores are illustrative only.'}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="overline">Composite residual</dt>
                <dd className="mt-0.5 font-semibold text-ink">{a.compositeScore.toFixed(1)} / 5 (demo)</dd>
              </div>
              <div>
                <dt className="overline">Recommended intensity</dt>
                <dd className="mt-0.5 font-semibold text-primary">{a.recommendedIntensity}</dd>
              </div>
              <div>
                <dt className="overline">Assessed by</dt>
                <dd className="mt-0.5 text-ink">{a.assessedByName}</dd>
              </div>
              <div>
                <dt className="overline">Reviewer</dt>
                <dd className="mt-0.5 text-ink">{a.reviewerName ?? 'Not assigned (demo)'}</dd>
              </div>
              <div>
                <dt className="overline">Due</dt>
                <dd className="mt-0.5 text-ink">{formatDate(a.dueDate)}</dd>
              </div>
              <div>
                <dt className="overline">Completed</dt>
                <dd className="mt-0.5 text-ink">{a.completedDate ? formatDate(a.completedDate) : '—'}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Supervisory judgement */}
        <Card>
          <CardHeader title="Supervisory judgement" />
          <CardBody>
            {a.supervisoryJudgement ? (
              <p className="whitespace-pre-line text-xs leading-relaxed text-ink">{a.supervisoryJudgement}</p>
            ) : (
              <p className="text-xs text-ink-secondary">
                No judgement recorded yet — this assessment is in progress (demo state).
              </p>
            )}
          </CardBody>
        </Card>

        {/* Prior-period comparison */}
        <Card>
          <CardHeader title="Prior-period comparison" />
          <CardBody>
            {a.priorComparison ? (
              <div className="text-xs">
                <div className="flex items-center justify-between rounded-lg bg-page px-3 py-2">
                  <span className="text-ink-secondary">{a.priorComparison.year} assessment</span>
                  <span className="flex items-center gap-2">
                    <RiskBadge rating={a.priorComparison.overallRisk} />
                    <span className="font-semibold text-ink">{a.priorComparison.compositeScore.toFixed(1)}</span>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-page px-3 py-2">
                  <span className="text-ink-secondary">{a.year} (current)</span>
                  <span className="flex items-center gap-2">
                    <RiskBadge rating={a.overallRisk} />
                    <span className="font-semibold text-ink">{a.compositeScore.toFixed(1)}</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary">{a.priorComparison.note}</p>
              </div>
            ) : (
              <p className="text-xs text-ink-secondary">
                No prior-period assessment in the demo dataset for comparison (first cycle in the prototype).
              </p>
            )}
          </CardBody>
        </Card>

        {/* Reviewer comments */}
        <Card>
          <CardHeader
            title="Reviewer comments"
            action={
              canApprove && a.status === 'In Review' ? (
                <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => setCommentOpen(true)}>
                  Add comment
                </button>
              ) : undefined
            }
          />
          <CardBody>
            {a.reviewComments.length === 0 ? (
              <p className="text-xs text-ink-secondary">No reviewer comments yet (demo).</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {a.reviewComments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-line p-3">
                    <p className="text-xs leading-relaxed text-ink">{c.text}</p>
                    <p className="mt-1.5 text-[10px] text-ink-secondary">
                      {c.reviewerName} · {formatRelativeTime(c.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Approval trail */}
        <Card className="xl:col-span-3">
          <CardHeader title="Approval trail" subtitle="Workflow events recorded in the prototype session and demo history." />
          <CardBody>
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {a.approvalTrail.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card',
                      event.action === 'Approved' ? 'bg-success' : event.action === 'Returned' ? 'bg-error' : event.action === 'Submitted' ? 'bg-warning' : 'bg-primary',
                    )}
                  />
                  <p className="text-xs font-semibold text-ink">
                    {event.action}
                    <span className="ml-2 font-normal text-ink-secondary">
                      {event.actorName} · {formatRelativeTime(event.at)}
                    </span>
                  </p>
                  {event.comment && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{event.comment}</p>}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      {/* Return modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title={`Return ${a.reference} for rework`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Return comment"
            required
            rows={3}
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            placeholder="Explain what the assessor must revise (demo)."
            error={returnComment.trim() === '' ? undefined : undefined}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={returnComment.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setReturnOpen(false)
                const comment = returnComment
                setReturnComment('')
                void runAction('Assessment returned', () => riskAssessmentService.returnAssessment(a.id, actor, comment))
              }}
            >
              Return assessment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Comment modal */}
      <Modal open={commentOpen} onClose={() => setCommentOpen(false)} title="Add reviewer comment" size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Comment"
            required
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Reviewer observation on the scores, narratives or judgement (demo)."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCommentOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={commentText.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setCommentOpen(false)
                const text = commentText
                setCommentText('')
                void runAction('Comment added', () => riskAssessmentService.addReviewComment(a.id, text, actor))
              }}
            >
              Save comment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Override modal */}
      <Modal open={overrideOpen} onClose={() => setOverrideOpen(false)} title="Override computed residual" size="md">
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-accent-dark">
            Overrides replace the methodology-computed residual with documented supervisory judgement.
            They stay visible on the assessment with the reason (demo behaviour, Spec §6.2 step 7).
          </p>
          <Select
            label="Category"
            value={overrideCategory}
            onChange={(e) => setOverrideCategory(e.target.value)}
            placeholder="Select a category…"
            options={a.categoryScores.map((c) => ({
              value: c.category,
              label: `${c.category} (computed residual ${c.residual})`,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="New residual (1–5)"
              value={overrideResidual}
              onChange={(e) => setOverrideResidual(e.target.value)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            />
            <TextInput
              label="Reason"
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Documented supervisory rationale"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={!overrideCategory || overrideReason.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setOverrideOpen(false)
                const [cat, res, reason] = [overrideCategory, Number(overrideResidual), overrideReason]
                setOverrideReason('')
                void runAction(`Residual overridden for ${cat}`, () =>
                  riskAssessmentService.applyOverride(a.id, cat, res, reason, actor),
                )
              }}
            >
              Apply override
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={confirmApprove}
        variant="success"
        title={`Approve ${a.reference}?`}
        message={
          <span>
            Approving confirms <strong>{a.overallRisk}</strong> overall residual risk and the{' '}
            <strong>{a.recommendedIntensity}</strong> supervisory intensity recommendation (demo
            scoring). The decision is recorded on the approval trail in this prototype session.
          </span>
        }
        confirmLabel="Approve assessment"
        loading={busy}
        onConfirm={() => {
          setConfirmApprove(false)
          void runAction('Assessment approved', () => riskAssessmentService.approve(a.id, actor))
        }}
        onClose={() => setConfirmApprove(false)}
      />
    </div>
  )
}
