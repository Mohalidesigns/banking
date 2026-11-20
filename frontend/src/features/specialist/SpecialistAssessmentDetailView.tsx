import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, FilePlus2, Play, Send } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import {
  DEMO_NOTE,
  FindingsTable,
  RelationsPanel,
  assessmentTone,
  checklistTone,
  evidenceTone,
  makeWorkflowRunner,
  reportTone,
} from '@/features/specialist/panels'
import { useActor } from '@/hooks/useActor'
import { specialistService } from '@/services/mock/MockSpecialistService'
import type {
  ChecklistItemStatus,
  SpecialistAssessmentDetail,
  SpecialistAssessmentRow,
  SpecialistChecklistItem,
  SpecialistConclusion,
  SpecialistDomainSpec,
  SpecialistEvidenceItem,
  SpecialistEvidenceKind,
} from '@/types/specialist'
import { formatDate } from '@/utils/datetime'

/**
 * Pattern parts 3–8 — assessment/examination detail (3) with the checklist
 * & procedures (4), evidence (5), findings (6), report (7) and historical
 * assessments (8) tabs. Checklist items cite §10.1 requirements and resolve
 * to the Regulatory Frameworks drawer — the Phase-4 acceptance mapping
 * (a specialist examination rendered against regulatory requirement records).
 * Mutations are role-gated (Spec §19); report issuance is simulated and
 * says so.
 */

const CONCLUSIONS: SpecialistConclusion[] = ['Satisfactory', 'Needs Improvement', 'Unsatisfactory']
const ITEM_STATUSES: ChecklistItemStatus[] = [
  'In Progress',
  'Satisfactory',
  'Deficient',
  'Not Applicable',
]

export function SpecialistAssessmentDetailView({
  spec,
  referenceOrId,
  onBack,
}: {
  spec: SpecialistDomainSpec
  referenceOrId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-specialist-assessments')
  const canRecord = can(actor.actorRole, 'record-specialist-checklist')
  const canApprove = can(actor.actorRole, 'approve-specialist-report')

  const [detail, setDetail] = useState<SpecialistAssessmentDetail | null | undefined>(undefined)
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  // Checklist conclusion drawer
  const [checkTarget, setCheckTarget] = useState<SpecialistChecklistItem | null>(null)
  const [checkStatus, setCheckStatus] = useState<ChecklistItemStatus>('Satisfactory')
  const [checkNote, setCheckNote] = useState('')
  const [checkError, setCheckError] = useState('')

  // Evidence modals
  const [requestOpen, setRequestOpen] = useState(false)
  const [evName, setEvName] = useState('')
  const [evKind, setEvKind] = useState<SpecialistEvidenceKind>('Report')
  const [evDue, setEvDue] = useState('')
  const [evNote, setEvNote] = useState('')
  const [evErrors, setEvErrors] = useState<Record<string, string>>({})
  const [reviewTarget, setReviewTarget] = useState<SpecialistEvidenceItem | null>(null)
  const [reviewVerdict, setReviewVerdict] = useState<'Reviewed' | 'Insufficient'>('Reviewed')
  const [reviewNote, setReviewNote] = useState('')

  // Report + completion workflows
  const [summaryDraft, setSummaryDraft] = useState<string | null>(null)
  const [changesOpen, setChangesOpen] = useState(false)
  const [changesNote, setChangesNote] = useState('')
  const [issueOpen, setIssueOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [conclusion, setConclusion] = useState<SpecialistConclusion>('Satisfactory')
  const [maturityScore, setMaturityScore] = useState('3')

  const load = useCallback(async () => {
    const d = await specialistService.detail(referenceOrId)
    setDetail(d ?? null)
    return d
  }, [referenceOrId])

  useEffect(() => {
    void load()
  }, [load])

  const run = useMemo(() => makeWorkflowRunner(setBusy, async () => load()), [load])

  // Sync the summary draft when a different assessment loads
  useEffect(() => {
    setSummaryDraft(null)
  }, [referenceOrId])

  if (detail === undefined) return <LoadingSkeleton className="h-96" />
  if (detail === null) {
    return (
      <ErrorState
        title="Assessment not found"
        message={`No ${spec.label.toLowerCase()} assessment matches "${referenceOrId}" in the demo dataset.`}
        onRetry={onBack}
      />
    )
  }

  const { assessment } = detail
  const progressPct =
    detail.progress.total === 0 ? 0 : Math.round((detail.progress.completed / detail.progress.total) * 100)
  const requirementByCitation = new Map(detail.requirements.map((r) => [r.citation, r]))
  const openEvidence = detail.evidence.filter((e) => e.status === 'Requested')
  const today = new Date().toISOString().slice(0, 10)

  const openCheckDrawer = (item: SpecialistChecklistItem) => {
    setCheckTarget(item)
    setCheckStatus(item.status === 'Not Started' ? 'Satisfactory' : item.status === 'Deficient' ? 'Deficient' : 'Satisfactory')
    setCheckNote(item.conclusionNote ?? '')
    setCheckError('')
  }

  const saveChecklist = async () => {
    if (!checkTarget) return
    if (checkStatus === 'Deficient' && !checkNote.trim()) {
      setCheckError('A conclusion note is required for a Deficient outcome (demo standard).')
      return
    }
    const ok = await run(`Checklist ${checkTarget.code}`, () =>
      specialistService.recordChecklistResult(
        checkTarget.id,
        { status: checkStatus, conclusionNote: checkNote.trim() },
        actor,
      ),
    )
    if (ok) setCheckTarget(null)
  }

  const submitEvidenceRequest = async () => {
    const next: Record<string, string> = {}
    if (!evName.trim()) next.evName = 'Name the evidence being requested.'
    if (!evDue) next.evDue = 'A due date is required.'
    setEvErrors(next)
    if (Object.keys(next).length > 0) return
    const ok = await run('Evidence request', () =>
      specialistService.requestEvidence(
        { assessmentId: assessment.id, name: evName.trim(), kind: evKind, dueAt: evDue, note: evNote.trim() },
        actor,
      ),
    )
    if (ok) {
      setRequestOpen(false)
      setEvName('')
      setEvNote('')
      setEvDue('')
      setEvErrors({})
    }
  }

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Scope" subtitle={assessment.periodCovered} />
            <CardBody>
              <p className="text-sm text-ink-secondary">{assessment.scopeSummary}</p>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Assessment facts" />
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-ink-secondary">Institution</dt>
                  <dd>
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-primary-surface hover:underline"
                      onClick={() => navigate(`/app/institutions/${detail.institution.id}`)}
                    >
                      {detail.institution.name}
                      <span className="ml-1 font-mono text-[10px] font-normal">{detail.institution.code}</span>
                    </button>
                  </dd>
                  <dt className="text-ink-secondary">Type</dt>
                  <dd>{assessment.type}</dd>
                  <dt className="text-ink-secondary">Status</dt>
                  <dd>
                    <StatusBadge status={assessment.status} tone={assessmentTone(assessment.status)} />
                  </dd>
                  <dt className="text-ink-secondary">Lead / team</dt>
                  <dd>
                    {assessment.leadName}
                    {assessment.teamNames.length > 0 && (
                      <span className="text-ink-secondary"> · {assessment.teamNames.join(', ')}</span>
                    )}
                  </dd>
                  <dt className="text-ink-secondary">Start → target</dt>
                  <dd>
                    {formatDate(assessment.startDate)} → {formatDate(assessment.targetDate)}
                  </dd>
                  {assessment.completedDate && (
                    <>
                      <dt className="text-ink-secondary">Completed</dt>
                      <dd>{formatDate(assessment.completedDate)}</dd>
                    </>
                  )}
                  {assessment.conclusion && (
                    <>
                      <dt className="text-ink-secondary">Conclusion</dt>
                      <dd>
                        <StatusBadge
                          status={assessment.conclusion}
                          tone={
                            assessment.conclusion === 'Satisfactory'
                              ? 'active'
                              : assessment.conclusion === 'Unsatisfactory'
                                ? 'overdue'
                                : 'fieldwork'
                          }
                        />
                      </dd>
                    </>
                  )}
                  {assessment.maturity && (
                    <>
                      <dt className="text-ink-secondary">Demo maturity</dt>
                      <dd>
                        {assessment.maturity.score} — {assessment.maturity.label}
                        <span className="ml-1 text-xs text-ink-secondary">(illustrative)</span>
                      </dd>
                    </>
                  )}
                  <dt className="text-ink-secondary">Checklist progress</dt>
                  <dd className="min-w-32">
                    <ProgressBar value={progressPct} tone={progressPct === 100 ? 'success' : 'primary'} showValue />
                    <span className="text-[10px] text-ink-secondary">
                      {detail.progress.completed}/{detail.progress.total} concluded
                    </span>
                  </dd>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Regulatory requirements assessed"
                subtitle="Phase-4 acceptance: this specialist assessment rendered against §10.1 requirement records."
              />
              <CardBody>
                {detail.requirements.length === 0 ? (
                  <p className="text-xs text-ink-secondary">
                    No requirement citations on this assessment (demo).
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {detail.requirements.map((r) => (
                      <li key={r.citation} className="rounded-lg border border-gray-200 bg-page p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">{r.citation}</span>
                          {r.status && <StatusBadge status={r.status} />}
                        </div>
                        {r.title && <p className="mt-1 text-xs font-semibold text-ink">{r.title}</p>}
                        {r.link ? (
                          <button
                            type="button"
                            className="mt-1 cursor-pointer text-xs text-primary-surface hover:underline"
                            onClick={() => navigate(r.link!)}
                          >
                            Open requirement in Regulatory Frameworks →
                          </button>
                        ) : (
                          <p className="mt-1 text-xs text-ink-secondary">
                            Citation not in the §10.1 demo library — reference label only.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Cross-module references"
              subtitle="Examinations, findings, alerts and corrective actions anchored to this assessment."
            />
            <CardBody>
              <RelationsPanel relations={assessment.relations} />
            </CardBody>
          </Card>
        </div>
      ),
    },
    {
      id: 'checklist',
      label: 'Checklist & procedures',
      count: detail.checklist.length,
      content: (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-48">
                  <p className="text-xs text-ink-secondary">Checklist completion</p>
                  <ProgressBar value={progressPct} tone={progressPct === 100 ? 'success' : 'primary'} showValue />
                </div>
                {spec.libraryProgrammeCode && (
                  <p className="text-xs text-ink-secondary">
                    Procedures mirror examination library programme{' '}
                    <button
                      type="button"
                      className="cursor-pointer font-mono font-semibold text-primary-surface hover:underline"
                      onClick={() => navigate(`/app/library?search=${encodeURIComponent(spec.libraryProgrammeCode!)}`)}
                    >
                      {spec.libraryProgrammeCode} →
                    </button>
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {spec.submodules.map((sub) => {
            const items = detail.checklist.filter((c) => c.submoduleKey === sub.key)
            if (items.length === 0) return null
            return (
              <Card key={sub.key}>
                <CardHeader title={sub.label} subtitle={sub.description} />
                <CardBody>
                  <ul className="space-y-4">
                    {items.map((item) => (
                      <li key={item.id} className="rounded-lg border border-gray-200 bg-page p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                            <span className="text-sm font-semibold text-ink">{item.title}</span>
                            <StatusBadge status={item.priority} tone={item.priority === 'High' ? 'overdue' : item.priority === 'Medium' ? 'fieldwork' : 'draft'} />
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status} tone={checklistTone(item.status)} />
                            {canRecord && (
                              <Button variant="outline" onClick={() => openCheckDrawer(item)}>
                                {item.status === 'Not Started' ? 'Record conclusion' : 'Update conclusion'}
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-ink-secondary">
                          <span className="font-semibold text-ink">Testing question: </span>
                          {item.procedureQuestion}
                        </p>
                        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-ink-secondary">
                          {item.testSteps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                        <p className="mt-2 text-xs text-ink-secondary">
                          Method: {item.method} · Sample: {item.sample}
                        </p>
                        {item.assessorName && (
                          <p className="mt-1 text-xs text-ink-secondary">
                            {item.status} by {item.assessorName}
                            {item.assessedAt && ` · ${formatDate(item.assessedAt)}`}
                          </p>
                        )}
                        {item.conclusionNote && (
                          <p className="mt-2 rounded-md bg-tint-blue p-2 text-xs text-ink">
                            <span className="font-semibold">Conclusion note: </span>
                            {item.conclusionNote}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-ink-secondary">Criteria</span>
                          <button
                            type="button"
                            title={`Examination library criteria reference: ${item.criteriaRef}`}
                            className="cursor-pointer rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-700 transition-colors hover:bg-tint-blue"
                            onClick={() => navigate(`/app/library?search=${encodeURIComponent(item.criteriaRef)}`)}
                          >
                            {item.criteriaRef} →
                          </button>
                          {item.requirementCitations.map((c) => {
                            const resolved = requirementByCitation.get(c)
                            return resolved?.link ? (
                              <button
                                key={c}
                                type="button"
                                title={`Regulatory requirement ${c}${resolved.title ? ` — ${resolved.title}` : ''}`}
                                className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface transition-colors hover:bg-tint-blue"
                                onClick={() => navigate(resolved.link!)}
                              >
                                {c} →
                              </button>
                            ) : (
                              <span
                                key={c}
                                title="Citation not in the §10.1 demo library — reference label only"
                                className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600"
                              >
                                {c}
                              </span>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.expectedEvidence.map((e) => (
                            <span key={e} className="rounded-full bg-tint-blue px-2 py-0.5 text-[10px] font-medium text-primary">
                              {e}
                            </span>
                          ))}
                        </div>
                        {item.findingRefs.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wide text-ink-secondary">Findings</span>
                            {item.findingRefs.map((ref) => (
                              <button
                                key={ref}
                                type="button"
                                className="cursor-pointer rounded-full bg-tint-red px-2 py-0.5 font-mono text-[10px] font-semibold text-error hover:underline"
                                onClick={() => navigate(`/app/findings?search=${encodeURIComponent(ref)}`)}
                              >
                                {ref} →
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )
          })}
          {detail.checklist.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-sm text-ink-secondary">
                  No checklist items were generated for this assessment (demo).
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'evidence',
      label: 'Evidence',
      count: detail.evidence.length,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-secondary">
              {openEvidence.length} outstanding request{openEvidence.length === 1 ? '' : 's'}
              {openEvidence.some((e) => e.dueAt && e.dueAt < today) && (
                <span className="ml-2 font-semibold text-error">overdue items marked in red</span>
              )}
              {' · '}
              {DEMO_NOTE}
            </p>
            {canManage && (
              <Button
                variant="primary"
                iconLeft={<FilePlus2 className="h-4 w-4" />}
                onClick={() => {
                  setEvName('')
                  setEvKind(spec.evidenceKinds[0] ?? 'Report')
                  setEvDue('')
                  setEvNote('')
                  setEvErrors({})
                  setRequestOpen(true)
                }}
              >
                Request evidence
              </Button>
            )}
          </div>
          <ul className="space-y-3">
            {detail.evidence.map((e) => {
              const overdue = e.status === 'Requested' && e.dueAt !== undefined && e.dueAt < today
              return (
                <li key={e.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{e.name}</span>
                            <StatusBadge status={e.status} tone={overdue ? 'overdue' : evidenceTone(e.status)} />
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              {e.kind}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              {e.confidentiality}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-secondary">
                            Requested {formatDate(e.requestedAt)} by {e.requestedByName}
                            {e.dueAt && (
                              <span className={overdue ? 'ml-2 font-semibold text-error' : 'ml-2'}>
                                due {formatDate(e.dueAt)}
                                {overdue && ' (overdue)'}
                              </span>
                            )}
                            {e.receivedAt && <span className="ml-2">received {formatDate(e.receivedAt)}</span>}
                            {e.providedByName && <span className="ml-2">by {e.providedByName}</span>}
                            {e.sizeKb !== undefined && <span className="ml-2">{e.sizeKb} kB (simulated)</span>}
                          </p>
                          {e.reviewNote && (
                            <p className="mt-1 rounded-md bg-tint-blue p-2 text-xs text-ink">
                              <span className="font-semibold">Review note: </span>
                              {e.reviewNote}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-ink-secondary">{e.storageNote}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {e.status === 'Requested' && canRecord && (
                            <Button
                              variant="outline"
                              loading={busy}
                              onClick={() => void run('Evidence receipt (demo)', () => specialistService.receiveEvidence(e.id, actor))}
                            >
                              Mark received (demo)
                            </Button>
                          )}
                          {(e.status === 'Received' || e.status === 'Reviewed' || e.status === 'Insufficient') && canRecord && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setReviewTarget(e)
                                setReviewVerdict(e.status === 'Insufficient' ? 'Insufficient' : 'Reviewed')
                                setReviewNote(e.reviewNote ?? '')
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              )
            })}
          </ul>
          {detail.evidence.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-sm text-ink-secondary">
                  No evidence requests on this assessment yet{canManage ? ' — use “Request evidence” to add one (demo).' : '.'}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'findings',
      label: 'Findings',
      count: detail.findings.length,
      content: (
        <FindingsTable
          rows={detail.findings}
          loading={false}
          title="Findings for this institution and domain"
          emptyDescription="No findings recorded for this institution in this domain (demo). Checklist conclusions marked Deficient feed the §7.7 findings register."
        />
      ),
    },
    {
      id: 'report',
      label: 'Report',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Assessment report"
              subtitle={`Report status: ${assessment.report.status}. Issuance is simulated — the prototype never sends real communications.`}
              action={<StatusBadge status={assessment.report.status} tone={reportTone(assessment.report.status)} />}
            />
            <CardBody>
              <div className="space-y-4">
                {assessment.report.status === 'Not Started' || assessment.report.status === 'Draft' ? (
                  canManage ? (
                    <div>
                      <TextArea
                        label="Executive summary (draft)"
                        rows={4}
                        value={summaryDraft ?? assessment.report.executiveSummary}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                        help="Saved in the prototype session only."
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="outline"
                          loading={busy}
                          onClick={() =>
                            void run('Report draft', () =>
                              specialistService.saveReportDraft(assessment.id, summaryDraft ?? assessment.report.executiveSummary, actor),
                            )
                          }
                        >
                          Save draft
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-secondary">
                      {assessment.report.executiveSummary || 'No draft summary yet (demo).'}
                    </p>
                  )
                ) : (
                  <div>
                    <h4 className="overline text-ink-secondary">Executive summary</h4>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink">
                      {assessment.report.executiveSummary || '—'}
                    </p>
                  </div>
                )}

                {assessment.report.sections.length > 0 && (
                  <div className="space-y-3">
                    {assessment.report.sections.map((s) => (
                      <div key={s.id} className="rounded-lg border border-gray-200 bg-page p-3">
                        <h5 className="text-xs font-bold text-ink">{s.heading}</h5>
                        <p className="mt-1 text-xs text-ink-secondary">{s.body}</p>
                        {s.requirementCitations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {s.requirementCitations.map((c) => {
                              const resolved = requirementByCitation.get(c)
                              return resolved?.link ? (
                                <button
                                  key={c}
                                  type="button"
                                  className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                                  onClick={() => navigate(resolved.link!)}
                                >
                                  {c} →
                                </button>
                              ) : (
                                <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                                  {c}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {assessment.report.issuedAt && (
                  <p className="text-xs text-ink-secondary">
                    Issued (demo) {formatDate(assessment.report.issuedAt)}
                    {assessment.report.issuedByName && ` by ${assessment.report.issuedByName}`}
                    {assessment.report.reviewerName && ` · reviewer ${assessment.report.reviewerName}`} —{' '}
                    {assessment.report.storageNote}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                  {assessment.report.status === 'Draft' && canManage && (
                    <Button
                      variant="primary"
                      iconLeft={<Send className="h-4 w-4" />}
                      loading={busy}
                      onClick={() => void run('Report submitted for review', () => specialistService.submitReport(assessment.id, actor))}
                    >
                      Submit for review
                    </Button>
                  )}
                  {assessment.report.status === 'In Review' && canApprove && (
                    <>
                      <Button
                        variant="outline"
                        loading={busy}
                        onClick={() => {
                          setChangesNote('')
                          setChangesOpen(true)
                        }}
                      >
                        Request changes
                      </Button>
                      <Button variant="primary" loading={busy} onClick={() => setIssueOpen(true)}>
                        Issue report (demo)
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ),
    },
    {
      id: 'history',
      label: 'Historical assessments',
      count: detail.history.length,
      content: <HistoryTable rows={detail.history} spec={spec} />,
    },
  ]

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary-surface hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to {spec.label} register
      </button>
      <PageHeader
        title={assessment.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">{assessment.reference}</span>
            <StatusBadge status={assessment.status} tone={assessmentTone(assessment.status)} />
            <span>{detail.institution.name}</span>
            <span className="text-ink-secondary">· {assessment.periodCovered}</span>
            {assessment.examinationRef && (
              <span className="font-mono text-xs text-ink-secondary">exam {assessment.examinationRef}</span>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {assessment.status === 'Planned' && canManage && (
              <Button
                variant="primary"
                iconLeft={<Play className="h-4 w-4" />}
                loading={busy}
                onClick={() => void run('Assessment started', () => specialistService.start(assessment.id, actor))}
              >
                Start assessment
              </Button>
            )}
            {assessment.status === 'In Progress' && canManage && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run('Submitted for review', () => specialistService.submitForReview(assessment.id, actor))}
              >
                Submit for review
              </Button>
            )}
            {(assessment.status === 'In Progress' || assessment.status === 'In Review') && canApprove && (
              <Button
                variant="primary"
                loading={busy}
                onClick={() => {
                  setConclusion(assessment.conclusion ?? 'Satisfactory')
                  setMaturityScore(String(assessment.maturity?.score ?? 3))
                  setCompleteOpen(true)
                }}
              >
                Complete assessment
              </Button>
            )}
          </div>
        }
      />
      <p className="mb-4 text-xs text-ink-secondary">{DEMO_NOTE}</p>
      <Tabs items={tabs} activeId={tab} onChange={setTab} />

      {/* Checklist conclusion drawer */}
      <Drawer
        open={checkTarget !== null}
        onClose={() => setCheckTarget(null)}
        title={checkTarget ? `Record conclusion — ${checkTarget.code}` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCheckTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={() => void saveChecklist()}>
              Save conclusion
            </Button>
          </div>
        }
      >
        {checkTarget && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">{checkTarget.title}</h4>
              <p className="mt-1 text-xs text-ink-secondary">{checkTarget.procedureQuestion}</p>
              <p className="mt-2 text-xs text-ink-secondary">
                Criteria: <span className="font-mono">{checkTarget.criteriaRef}</span> · Requirements:{' '}
                {checkTarget.requirementCitations.join(', ')}
              </p>
            </div>
            <Select
              label="Conclusion"
              value={checkStatus}
              onChange={(e) => setCheckStatus(e.target.value as ChecklistItemStatus)}
              options={ITEM_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <TextArea
              label="Conclusion note"
              help={checkStatus === 'Deficient' ? 'Required for a Deficient outcome — describe the gap (demo).' : 'Optional context for the report draft.'}
              rows={4}
              value={checkNote}
              onChange={(e) => setCheckNote(e.target.value)}
              error={checkError}
            />
            <p className="text-[10px] text-ink-secondary">
              Conclusions are demo data recorded in the prototype session — a real finding is raised in the §7.7
              findings register, never here.
            </p>
          </div>
        )}
      </Drawer>

      {/* Request evidence modal */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request evidence (demo)"
        description="Simulated request — recorded in the prototype session; no communication is sent."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={() => void submitEvidenceRequest()}>
              Send request (demo)
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput
            label="Evidence name"
            required
            value={evName}
            onChange={(e) => setEvName(e.target.value)}
            error={evErrors.evName}
            placeholder="e.g. Third-party risk register extract"
          />
          <Select
            label="Evidence kind"
            value={evKind}
            onChange={(e) => setEvKind(e.target.value as SpecialistEvidenceKind)}
            options={spec.evidenceKinds.map((k) => ({ value: k, label: k }))}
          />
          <TextInput
            label="Due date"
            required
            type="date"
            value={evDue}
            onChange={(e) => setEvDue(e.target.value)}
            error={evErrors.evDue}
          />
          <TextArea
            label="Note to the institution"
            rows={3}
            value={evNote}
            onChange={(e) => setEvNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Evidence review modal */}
      <Modal
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        title="Review evidence (demo)"
        description={reviewTarget?.name}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                if (!reviewTarget) return
                const ok = await run('Evidence review', () =>
                  specialistService.reviewEvidence(reviewTarget.id, reviewVerdict, reviewNote.trim(), actor),
                )
                if (ok) setReviewTarget(null)
              }}
            >
              Save review
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Verdict"
            value={reviewVerdict}
            onChange={(e) => setReviewVerdict(e.target.value as 'Reviewed' | 'Insufficient')}
            options={[
              { value: 'Reviewed', label: 'Reviewed — sufficient for the demo file' },
              { value: 'Insufficient', label: 'Insufficient — follow-up required' },
            ]}
          />
          <TextArea
            label="Review note"
            rows={3}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Request report changes */}
      <Modal
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request report changes (demo)"
        description="Returns the report to Draft with your note appended to the summary."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChangesOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                if (!changesNote.trim()) return
                const ok = await run('Changes requested', () =>
                  specialistService.requestReportChanges(assessment.id, changesNote.trim(), actor),
                )
                if (ok) setChangesOpen(false)
              }}
            >
              Request changes
            </Button>
          </div>
        }
      >
        <TextArea
          label="Reviewer note"
          required
          rows={4}
          value={changesNote}
          onChange={(e) => setChangesNote(e.target.value)}
          help="Describe what must change before the report can be issued (demo)."
        />
      </Modal>

      {/* Issue report confirmation */}
      <ConfirmDialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue report (simulated)?"
        message="This is a SIMULATION for the prototype session — no real report is issued and no communication is sent. The issuance is recorded and labelled “Issued (demo)”."
        confirmLabel="Issue (demo)"
        variant="primary"
        loading={busy}
        onConfirm={async () => {
          const ok = await run('Report issued (demo)', () => specialistService.issueReport(assessment.id, actor))
          if (ok) setIssueOpen(false)
        }}
      />

      {/* Complete assessment */}
      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete assessment (demo)"
        description="Records the final conclusion and illustrative maturity score in the prototype session."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                const ok = await run('Assessment completed', () =>
                  specialistService.completeAssessment(assessment.id, conclusion, Number(maturityScore), actor),
                )
                if (ok) setCompleteOpen(false)
              }}
            >
              Complete assessment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Conclusion"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value as SpecialistConclusion)}
            options={CONCLUSIONS.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Demo maturity score"
            help="Illustrative 1–5 demo scale, never an official rating."
            value={maturityScore}
            onChange={(e) => setMaturityScore(e.target.value)}
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: String(n),
              label: `${n} — ${['Initial', 'Developing', 'Defined', 'Managed', 'Optimised'][n - 1]}`,
            }))}
          />
        </div>
      </Modal>
    </div>
  )
}

/** Pattern part 8 — historical assessments for the same institution+domain. */
function HistoryTable({ rows, spec }: { rows: SpecialistAssessmentRow[]; spec: SpecialistDomainSpec }) {
  const navigate = useNavigate()
  const columns: Array<ColumnDef<SpecialistAssessmentRow, unknown>> = [
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => <span className="font-mono text-xs font-semibold text-primary-surface">{row.original.reference}</span>,
    },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'periodCovered', header: 'Period' },
    {
      accessorKey: 'completedDate',
      header: 'Completed',
      cell: ({ row }) => (row.original.completedDate ? formatDate(row.original.completedDate) : '—'),
    },
    {
      accessorKey: 'conclusion',
      header: 'Conclusion',
      cell: ({ row }) =>
        row.original.conclusion ? (
          <StatusBadge
            status={row.original.conclusion}
            tone={
              row.original.conclusion === 'Satisfactory'
                ? 'active'
                : row.original.conclusion === 'Unsatisfactory'
                  ? 'overdue'
                  : 'fieldwork'
            }
          />
        ) : (
          '—'
        ),
    },
    {
      id: 'maturity',
      header: 'Demo maturity',
      cell: ({ row }) =>
        row.original.maturity ? `${row.original.maturity.score} — ${row.original.maturity.label}` : '—',
    },
    {
      accessorKey: 'report',
      header: 'Report',
      cell: ({ row }) => <StatusBadge status={row.original.report.status} tone={reportTone(row.original.report.status)} />,
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      state={rows.length === 0 ? 'empty' : 'ready'}
      title={`Historical ${spec.label.toLowerCase()} assessments for this institution`}
      onRowClick={(row) => navigate(`${spec.route}?assessment=${encodeURIComponent(row.reference)}`)}
      getRowId={(row) => row.id}
      emptyTitle="No historical assessments"
      emptyDescription="This is the first completed demo assessment for this institution and domain."
    />
  )
}
