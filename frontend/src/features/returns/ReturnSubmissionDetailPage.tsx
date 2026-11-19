import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck,
  FileSpreadsheet,
  Play,
  ScrollText,
  Send,
  Shield,
  TriangleExclamationPoint,
} from 'lucide-react'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { TextArea } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { returnsService } from '@/services/mock/MockReturnsService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { ReturnSubmissionDetail } from '@/types/returns'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Submission detail (Spec §11.3): seven tabs — Submission Overview,
 * Submitted Data (with historical comparison), Validation Results
 * (field-level errors + cross-return exceptions + live demo re-run),
 * Reconciliation, Review Notes, Version History and Activity. Analyst
 * review demo actions (accept / reject / return-for-correction) are gated:
 * review steps need `review-submission`, decisions need `approve-submission`
 * (Spec §19). Prototype-session state only.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Submitted: 'active',
  'Due Soon': 'planning',
  Overdue: 'overdue',
  'In Review': 'fieldwork',
  Accepted: 'completed',
  Rejected: 'overdue',
}

const REVIEW_TONES: Record<string, StatusTone> = {
  'Awaiting Review': 'planning',
  'Under Review': 'fieldwork',
  Accepted: 'completed',
  Rejected: 'overdue',
  'Returned for Correction': 'overdue',
}

const VALIDATION_TONES: Record<string, StatusTone> = {
  Passed: 'active',
  Warnings: 'fieldwork',
  Errors: 'overdue',
  'Not Run': 'draft',
}

type Decision = 'Accepted' | 'Rejected' | 'Returned for Correction'

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ReturnSubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const actor = useActor()
  const canReview = can(actor.actorRole, 'review-submission')
  const canDecide = can(actor.actorRole, 'approve-submission')

  const [submission, setSubmission] = useState<ReturnSubmissionDetail | null | undefined>(undefined)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!submissionId) return
    const s = await returnsService.getSubmission(submissionId)
    setSubmission(s ?? null)
    if (s) {
      const inst = await institutionService.getById(s.institutionId)
      setInstitution(inst ?? null)
    }
  }, [submissionId])

  useEffect(() => {
    void load()
  }, [load])

  const dataBySection = useMemo(() => {
    if (!submission) return []
    const names = [...new Set(submission.data.map((d) => d.section))]
    return names.map((name) => ({ name, points: submission.data.filter((d) => d.section === name) }))
  }, [submission])

  if (submission === undefined) return <LoadingSkeleton variant="text" rows={12} />

  if (submission === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Submission not found"
            description="This demo submission id does not exist in the prototype dataset. It may have been from a previous session."
            action={{ label: 'Back to Regulatory Returns', onClick: () => navigate('/app/returns') }}
          />
        </CardBody>
      </Card>
    )
  }

  const s = submission
  const validation = s.validationResult

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const runValidation = async () => {
    setBusy(true)
    try {
      const updated = await returnsService.runValidation(s.id, actor)
      if (updated) {
        setSubmission(updated)
        setTab('validation')
        toast.success(
          'Demo validation complete',
          `${updated.validationResult?.status ?? 'Not Run'} — ${updated.validationResult?.errorCount ?? 0} error(s), ${updated.validationResult?.warningCount ?? 0} warning(s). Saved in prototype session.`,
        )
      }
    } catch (err) {
      guard(err, 'The demo validation engine could not run.')
    } finally {
      setBusy(false)
    }
  }

  const startReview = async () => {
    setBusy(true)
    try {
      const updated = await returnsService.startReview(s.id, actor)
      if (updated) {
        setSubmission(updated)
        toast.success('Demo action completed', 'Review started — saved in prototype session.')
      } else {
        toast.warning('No change', 'This submission is not awaiting review.')
      }
    } catch (err) {
      guard(err, 'The review could not be started in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const addNote = async () => {
    if (!note.trim()) {
      toast.warning('Empty note', 'Write the review note before saving (demo).')
      return
    }
    setBusy(true)
    try {
      const updated = await returnsService.addReviewNote(s.id, note.trim(), actor)
      if (updated) {
        setSubmission(updated)
        setNote('')
        toast.success('Saved in prototype session', 'Review note added.')
      }
    } catch (err) {
      guard(err, 'The note could not be saved in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const submitDecision = async () => {
    if (!decision) return
    if (!decisionNote.trim()) {
      setDecisionError('A decision note is required — it is recorded in the review trail (demo).')
      return
    }
    setBusy(true)
    try {
      const updated = await returnsService.decide(s.id, decision, decisionNote.trim(), actor)
      if (updated) {
        setSubmission(updated)
        setDecision(null)
        setDecisionNote('')
        setDecisionError('')
        toast.success('Demo action completed', `${s.reference} — ${decision}. Saved in prototype session.`)
      }
    } catch (err) {
      guard(err, 'The decision could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const decided = s.reviewStatus === 'Accepted' || s.reviewStatus === 'Rejected' || s.reviewStatus === 'Returned for Correction'

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl text-primary">{s.reference}</span>
            <StatusBadge status={s.status} tone={STATUS_TONES[s.status]} />
            <StatusBadge status={s.reviewStatus} tone={REVIEW_TONES[s.reviewStatus]} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <button
              type="button"
              className="cursor-pointer font-medium text-primary-surface hover:underline"
              onClick={() => navigate(`/app/institutions/${s.institutionId}`)}
            >
              {institution?.tradingName ?? 'Institution'}
            </button>
            <span>·</span>
            <span className="font-mono">{s.returnCode}</span>
            <span>{s.returnName}</span>
            <span>·</span>
            <span>{s.period}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Regulatory Returns', path: '/app/returns' }, { label: s.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate('/app/returns')}>
              Register
            </Button>
            <Button
              variant="outline"
              iconLeft={<Play className="h-3.5 w-3.5" />}
              disabled={!canReview || busy || !s.submittedAt}
              title={!canReview ? 'Your demo role cannot run supervisory validation (Spec §19)' : !s.submittedAt ? 'No submitted data to validate yet' : undefined}
              onClick={() => void runValidation()}
            >
              Run validation
            </Button>
            {s.reviewStatus === 'Awaiting Review' && (
              <Button
                variant="outline"
                disabled={!canReview || busy}
                title={canReview ? undefined : 'Your demo role cannot review submissions (Spec §19)'}
                onClick={() => void startReview()}
              >
                Start review
              </Button>
            )}
            <Button
              variant="primary"
              iconLeft={<Send className="h-4 w-4" />}
              disabled={!canDecide || busy || decided || !s.submittedAt}
              title={
                !canDecide
                  ? 'Accept/reject decisions are reserved for Team Lead and above (Spec §19)'
                  : decided
                    ? `This submission is already ${s.reviewStatus.toLowerCase()}`
                    : undefined
              }
              onClick={() => {
                setDecision(null)
                setDecisionNote('')
                setDecisionError('')
                setDecision('Accepted')
              }}
            >
              Review decision
            </Button>
          </>
        }
      />

      <Tabs
        activeId={tab}
        onChange={setTab}
        items={[
          {
            id: 'overview',
            label: 'Submission Overview',
            content: (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="flex flex-col gap-4 xl:col-span-2">
                  <Card>
                    <CardHeader title="Submission summary" subtitle="Spec §11.3 tab 1 — demo record" />
                    <CardBody>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                        <div><dt className="overline">Institution</dt><dd className="mt-0.5 text-ink">{institution?.tradingName ?? '—'} ({institution?.code ?? '—'})</dd></div>
                        <div><dt className="overline">Return</dt><dd className="mt-0.5 font-mono text-ink">{s.returnCode} — {s.returnName}</dd></div>
                        <div><dt className="overline">Reporting period</dt><dd className="mt-0.5 text-ink">{s.period}</dd></div>
                        <div><dt className="overline">Due date</dt><dd className={cx('mt-0.5', s.status === 'Overdue' ? 'font-semibold text-error' : 'text-ink')}>{formatDate(s.dueDate)}</dd></div>
                        <div><dt className="overline">Submitted</dt><dd className="mt-0.5 text-ink">{s.submittedAt ? `${formatDate(s.submittedAt)} (${formatRelativeTime(s.submittedAt)})` : 'Not received'}</dd></div>
                        <div><dt className="overline">Version</dt><dd className="mt-0.5 font-mono text-ink">v{s.version}</dd></div>
                        <div><dt className="overline">Submitted by</dt><dd className="mt-0.5 text-ink">{s.submittedByName ?? '—'}</dd></div>
                        <div><dt className="overline">Channel</dt><dd className="mt-0.5 text-ink">{s.submittedVia ?? '—'}</dd></div>
                        <div><dt className="overline">Validation</dt><dd className="mt-0.5"><StatusBadge status={s.validation} tone={VALIDATION_TONES[s.validation]} /></dd></div>
                      </dl>
                      <div className="mt-4 border-t border-line pt-3">
                        <button
                          type="button"
                          className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary-surface hover:underline"
                          onClick={() => navigate(`/app/returns?view=designer&template=${s.definitionId}`)}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                          Open the {s.returnCode} template in the definition designer
                        </button>
                      </div>
                    </CardBody>
                  </Card>

                  {s.certification && (
                    <Card>
                      <CardHeader title="Certification" subtitle="Officer certification captured at submission (demo)" />
                      <CardBody>
                        <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                          <BadgeCheck className="h-4 w-4 text-accent-dark" aria-hidden="true" />
                          {s.certification.certifiedByName} — {s.certification.certifiedRole}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{s.certification.statement}</p>
                        <p className="mt-1.5 text-[10px] text-ink-tertiary">Certified {formatDate(s.certification.certifiedAt)} · demo certification</p>
                      </CardBody>
                    </Card>
                  )}

                  {validation && (
                    <Card>
                      <CardHeader
                        title="Validation summary"
                        subtitle={`${validation.engine} · run ${formatRelativeTime(validation.runAt)}`}
                        action={<StatusBadge status={validation.status} tone={VALIDATION_TONES[validation.status]} />}
                      />
                      <CardBody>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span className="flex items-center gap-1.5 text-error">
                            <TriangleExclamationPoint className="h-3.5 w-3.5" aria-hidden="true" />
                            {validation.errorCount} error(s)
                          </span>
                          <span className="flex items-center gap-1.5 text-warning">
                            <TriangleExclamationPoint className="h-3.5 w-3.5" aria-hidden="true" />
                            {validation.warningCount} warning(s)
                          </span>
                          <span className="text-ink-secondary">{validation.crossReturnExceptions.length} cross-return exception(s)</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{validation.summary}</p>
                        <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => setTab('validation')}>
                          Inspect field-level results →
                        </Button>
                      </CardBody>
                    </Card>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <Card>
                    <CardHeader title="Original file" subtitle="Uploaded artefact metadata (demo)" />
                    <CardBody>
                      {s.fileMetadata ? (
                        <dl className="flex flex-col gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            <dd className="break-all font-mono text-[11px] text-ink">{s.fileMetadata.fileName}</dd>
                          </div>
                          <div><dt className="overline">Format</dt><dd className="mt-0.5 text-ink">{s.fileMetadata.format}</dd></div>
                          <div><dt className="overline">Size</dt><dd className="mt-0.5 text-ink">{s.fileMetadata.sizeKb} kB</dd></div>
                          <div><dt className="overline">Uploaded</dt><dd className="mt-0.5 text-ink">{formatDate(s.fileMetadata.uploadedAt)} · {s.fileMetadata.uploadedByName}</dd></div>
                          <div><dt className="overline">Checksum (fictional)</dt><dd className="mt-0.5 break-all font-mono text-[10px] text-ink-secondary">{s.fileMetadata.checksum}</dd></div>
                        </dl>
                      ) : (
                        <EmptyState
                          title="No file received"
                          description="This period has not been submitted yet — nothing has been uploaded in the demo flow."
                          icon={<FileCheck className="h-7 w-7" />}
                        />
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader title="Review trail" subtitle="Latest decision state" />
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">Review status</span>
                        <StatusBadge status={s.reviewStatus} tone={REVIEW_TONES[s.reviewStatus]} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">Review notes</span>
                        <span className="font-semibold text-ink">{s.reviewNotes.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">Versions</span>
                        <span className="font-semibold text-ink">{s.versions.length}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setTab('review')}>
                        Open review notes →
                      </Button>
                    </CardBody>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: 'data',
            label: 'Submitted Data',
            count: s.data.length,
            content: (
              <Card>
                <CardHeader
                  title="Submitted data with historical comparison"
                  subtitle={`Values as reported by the institution for ${s.period} (decimal strings, demo currency MRD)`}
                />
                <CardBody>
                  {s.data.length === 0 ? (
                    <EmptyState
                      title="No submitted data"
                      description="The institution has not filed this period yet in the demo flow. Data appears here once the submission is received."
                      icon={<FileSpreadsheet className="h-7 w-7" />}
                    />
                  ) : (
                    <div className="flex flex-col gap-5">
                      {dataBySection.map((section) => (
                        <div key={section.name}>
                          <p className="overline mb-2">{section.name}</p>
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                                <th scope="col" className="px-3 py-2">Field</th>
                                <th scope="col" className="px-3 py-2 text-right">Reported</th>
                                <th scope="col" className="px-3 py-2 text-right">Prior period</th>
                                <th scope="col" className="px-3 py-2 text-right">Change</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.points.map((p) => {
                                const value = num(p.value)
                                const prior = num(p.priorValue)
                                const change = value !== null && prior !== null ? value - prior : null
                                return (
                                  <tr key={p.fieldCode} className="border-t border-line-light">
                                    <td className="px-3 py-2">
                                      <p className="text-xs font-medium text-ink">{p.label}</p>
                                      <p className="font-mono text-[10px] text-ink-secondary">{p.fieldCode}{p.unit ? ` · ${p.unit}` : ''}</p>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-ink">{p.value || '—'}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs text-ink-secondary">{p.priorValue ?? '—'}</td>
                                    <td className="px-3 py-2 text-right">
                                      {change !== null && Math.abs(change) >= 0.05 ? (
                                        <span className={cx('font-mono text-xs font-semibold', change > 0 ? 'text-success' : 'text-error')}>
                                          {change > 0 ? '+' : ''}{change.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-ink-tertiary">—</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      <p className="text-[10px] text-ink-tertiary">
                        Change colouring is directional only (up = green) and does not imply prudential
                        judgement — some ratios are better when falling. Illustrative demo figures.
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            ),
          },
          {
            id: 'validation',
            label: 'Validation Results',
            count: validation ? validation.errorCount + validation.warningCount : undefined,
            content: (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader
                    title="Demo rule engine result"
                    subtitle={validation ? `${validation.engine} · run ${formatDate(validation.runAt)}` : 'Validation has not been run for this period'}
                    action={validation ? <StatusBadge status={validation.status} tone={VALIDATION_TONES[validation.status]} /> : undefined}
                  />
                  <CardBody>
                    {validation ? (
                      <>
                        <p className="text-xs leading-relaxed text-ink-secondary">{validation.summary}</p>
                        <p className="mt-2 rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
                          The rule engine is a prototype demonstration over illustrative thresholds — it is not
                          connected to any real validation service.
                        </p>
                        {validation.fieldErrors.length > 0 && (
                          <table className="mt-4 w-full text-left">
                            <thead>
                              <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                                <th scope="col" className="px-3 py-2">Field</th>
                                <th scope="col" className="px-3 py-2">Rule</th>
                                <th scope="col" className="px-3 py-2">Severity</th>
                                <th scope="col" className="px-3 py-2 text-right">Submitted</th>
                                <th scope="col" className="px-3 py-2 text-right">Expected</th>
                                <th scope="col" className="px-3 py-2">Message</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validation.fieldErrors.map((e) => (
                                <tr key={e.id} className="border-t border-line-light align-top">
                                  <td className="px-3 py-2">
                                    <p className="text-xs font-medium text-ink">{e.fieldLabel}</p>
                                    <p className="font-mono text-[10px] text-ink-secondary">{e.fieldCode}</p>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[10px] text-ink-secondary">{e.rule}</td>
                                  <td className="px-3 py-2">
                                    <StatusBadge status={e.severity} tone={e.severity === 'Error' ? 'overdue' : 'fieldwork'} />
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-error">{e.submittedValue ?? '—'}</td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-ink-secondary">{e.expected ?? '—'}</td>
                                  <td className="px-3 py-2 text-xs text-ink-secondary">{e.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {validation.crossReturnExceptions.length > 0 && (
                          <div className="mt-4">
                            <p className="overline mb-2">Cross-return exceptions</p>
                            <ul className="flex flex-col gap-2">
                              {validation.crossReturnExceptions.map((c) => (
                                <li key={c.id} className={cx('rounded-lg border px-3 py-2 text-xs', c.severity === 'Error' ? 'border-error/40 bg-tint-red' : 'border-warning/40 bg-tint-orange')}>
                                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                                    {c.severity}{c.relatedReturnCode ? ` · related return ${c.relatedReturnCode}` : ''}
                                  </p>
                                  <p className="mt-1 leading-relaxed text-ink-secondary">{c.description}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {validation.fieldErrors.length === 0 && validation.crossReturnExceptions.length === 0 && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-success">
                            <FileCheck className="h-4 w-4" aria-hidden="true" />
                            No field-level exceptions — the demo engine found nothing to report.
                          </p>
                        )}
                      </>
                    ) : (
                      <EmptyState
                        title="Validation not run"
                        description="Run the demo rule engine once the submission is received, or wait for the institution to file this period."
                        icon={<Play className="h-7 w-7" />}
                        action={canReview && s.submittedAt ? { label: 'Run validation (demo)', onClick: () => void runValidation() } : undefined}
                      />
                    )}
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            id: 'reconciliation',
            label: 'Reconciliation',
            content: (
              <Card>
                <CardHeader title="Return-to-source reconciliation" subtitle="Reported figures vs demo source ledger, within tolerance" />
                <CardBody>
                  {s.reconciliation.length === 0 ? (
                    <EmptyState
                      title="Nothing to reconcile"
                      description="Reconciliation rows appear once the institution has submitted data for this period."
                    />
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                          <th scope="col" className="px-3 py-2">Check</th>
                          <th scope="col" className="px-3 py-2 text-right">Return value</th>
                          <th scope="col" className="px-3 py-2 text-right">Source value</th>
                          <th scope="col" className="px-3 py-2 text-right">Variance</th>
                          <th scope="col" className="px-3 py-2 text-right">Tolerance</th>
                          <th scope="col" className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.reconciliation.map((r) => (
                          <tr key={r.id} className="border-t border-line-light">
                            <td className="px-3 py-2">
                              <p className="text-xs font-medium text-ink">{r.label}</p>
                              {r.note && <p className="mt-0.5 text-[10px] text-ink-secondary">{r.note}</p>}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-ink">{r.returnValue}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-ink-secondary">{r.sourceValue}</td>
                            <td className={cx('px-3 py-2 text-right font-mono text-xs', r.status === 'Unreconciled' ? 'font-semibold text-error' : 'text-ink-secondary')}>{r.variance}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-ink-tertiary">{r.tolerance}</td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                status={r.status}
                                tone={r.status === 'Reconciled' ? 'completed' : r.status === 'Within Tolerance' ? 'fieldwork' : 'overdue'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            ),
          },
          {
            id: 'review',
            label: 'Review Notes',
            count: s.reviewNotes.length,
            content: (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader title="Analyst review trail" subtitle="Notes and decisions recorded by supervisors (demo)" />
                  <CardBody>
                    {s.reviewNotes.length === 0 ? (
                      <EmptyState title="No review notes yet" description="Supervisory notes and accept/reject decisions will appear here." icon={<ScrollText className="h-7 w-7" />} />
                    ) : (
                      <ol className="flex flex-col gap-3">
                        {[...s.reviewNotes].reverse().map((n) => (
                          <li key={n.id} className="relative border-l-2 border-line pl-4">
                            <span aria-hidden="true" className={cx('absolute top-1 -left-[5px] h-2 w-2 rounded-full', n.decision ? 'bg-accent' : 'bg-line')} />
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold text-ink">{n.authorName}</p>
                              <p className="text-[10px] text-ink-tertiary">{formatDate(n.at)} · {formatRelativeTime(n.at)}</p>
                              {n.decision && <StatusBadge status={n.decision} tone={n.decision === 'Accepted' ? 'completed' : 'overdue'} />}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{n.text}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Add review note" subtitle={canReview ? 'Saved in prototype session' : 'Requires the review-submission demo action'} />
                  <CardBody className="flex flex-col gap-3">
                    <TextArea
                      label="Note"
                      rows={5}
                      value={note}
                      disabled={!canReview}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Record an observation for the review trail, e.g. clarification requested from the institution…"
                    />
                    <Button variant="primary" iconLeft={<ScrollText className="h-4 w-4" />} disabled={!canReview || busy} loading={busy} onClick={() => void addNote()}>
                      Save note
                    </Button>
                    {!canReview && (
                      <p className="text-[11px] text-ink-tertiary">Your demo role cannot review submissions (Spec §19). Switch to an analyst or supervisory role to add notes.</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            id: 'versions',
            label: 'Version History',
            count: s.versions.length,
            content: (
              <Card>
                <CardHeader title="Version history" subtitle="Every filed version of this submission (demo)" />
                <CardBody>
                  {s.versions.length === 0 ? (
                    <EmptyState title="No versions filed" description="Versions appear once the institution submits this period." />
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {[...s.versions].reverse().map((v) => (
                        <li key={v.version} className="relative border-l-2 border-line pl-4">
                          <span aria-hidden="true" className={cx('absolute top-1 -left-[5px] h-2 w-2 rounded-full', v.isCurrent ? 'bg-accent' : 'bg-line')} />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-xs font-semibold text-ink">v{v.version}</p>
                            {v.isCurrent && <StatusBadge status="Current version" tone="active" />}
                            <StatusBadge status={v.validation} tone={VALIDATION_TONES[v.validation]} />
                          </div>
                          <p className="mt-1 text-xs text-ink-secondary">{v.note}</p>
                          <p className="mt-0.5 text-[10px] text-ink-tertiary">
                            {v.submittedAt ? `${formatDate(v.submittedAt)} · ` : ''}{v.byName}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardBody>
              </Card>
            ),
          },
          {
            id: 'activity',
            label: 'Activity',
            count: s.activity.length,
            content: (
              <Card>
                <CardHeader title="Submission activity" subtitle="Full prototype-session and fixture history for this record" />
                <CardBody>
                  <ol className="flex flex-col gap-3">
                    {[...s.activity].reverse().map((a) => (
                      <li key={a.id} className="relative border-l-2 border-line pl-4">
                        <span aria-hidden="true" className="absolute top-1 -left-[5px] h-2 w-2 rounded-full bg-line" />
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-ink">{a.action}</p>
                          <p className="text-[10px] text-ink-tertiary">{formatDate(a.at)} · {a.actorName}</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{a.detail}</p>
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            ),
          },
        ]}
      />

      {/* Review decision modal — accept / reject / return for correction */}
      <Modal
        open={decision !== null}
        onClose={() => setDecision(null)}
        title="Analyst review decision (demo)"
        description={`${s.reference} — ${s.returnCode} · ${s.period}`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Review decision">
            {(['Accepted', 'Rejected', 'Returned for Correction'] as Decision[]).map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={decision === opt}
                onClick={() => {
                  setDecision(opt)
                  setDecisionError('')
                }}
                className={cx(
                  'cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors',
                  decision === opt
                    ? opt === 'Accepted'
                      ? 'border-success bg-tint-green text-success'
                      : 'border-error bg-tint-red text-error'
                    : 'border-line bg-card text-ink-secondary hover:bg-page',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <TextArea
            label="Decision note"
            required
            rows={3}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Recorded in the review trail — e.g. accepted subject to monitoring, or the corrections required…"
          />
          {decisionError && <p role="alert" className="rounded-lg bg-tint-red px-3 py-2 text-xs text-error">{decisionError}</p>}
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Demo workflow — the decision is saved in this prototype session only. No real regulatory
            acceptance, rejection or enforcement communication takes place. Decisions require the
            approve-submission demo action (Spec §19).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              variant={decision === 'Accepted' ? 'success' : 'danger'}
              loading={busy}
              onClick={() => void submitDecision()}
            >
              Record {decision ?? 'decision'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
