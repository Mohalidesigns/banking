import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  FolderSearch,
  Play,
  RefreshCw,
  Users,
} from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select } from '@/components/forms/FormControls'
import { PriorityBadge, RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import { evidenceService } from '@/services/mock/MockEvidenceService'
import { findingService } from '@/services/mock/MockFindingService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  ExaminationReport,
  ExaminationTeamMember,
  EvidenceItem,
  InformationRequest,
} from '@/types/examination'
import type { FindingDetail } from '@/types/finding'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Examination Detail (Spec §7.3): header with stage/progress/contextual
 * actions and the eleven specified tabs. Fieldwork testing itself lives in
 * the dedicated workspace route; every tab deep-links there or to the
 * relevant register. Demo data only.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  Planned: 'planning',
  'In Progress': 'active',
  Fieldwork: 'fieldwork',
  Reporting: 'reporting',
  Completed: 'completed',
  Cancelled: 'closed',
  'Not Started': 'draft',
  'Draft Saved': 'draft',
  'Submitted for Review': 'reporting',
  'Returned for Rework': 'overdue',
  Approved: 'active',
  'Pending Review': 'planning',
  Reviewed: 'active',
  Rejected: 'overdue',
  Requested: 'planning',
  Received: 'active',
  Overdue: 'overdue',
  Waived: 'closed',
  Issued: 'planning',
  'Partially Fulfilled': 'fieldwork',
  Fulfilled: 'active',
  'In Review': 'reporting',
}

const RESULT_TONES: Record<string, StatusTone> = {
  Pass: 'active',
  Fail: 'overdue',
  Partial: 'fieldwork',
  'Not Applicable': 'closed',
  'Not Tested': 'draft',
}

const ACTIVE_STATUSES = new Set(['In Progress', 'Fieldwork', 'Reporting'])

export function ExaminationDetailPage() {
  const { examinationId } = useParams<{ examinationId: string }>()
  const navigate = useNavigate()
  const actor = useActor()
  const canFieldwork = can(actor.actorRole, 'record-fieldwork')
  const canApproveResults = can(actor.actorRole, 'approve-results')
  const canAssign = can(actor.actorRole, 'assign-team')
  const canRequestInfo = can(actor.actorRole, 'request-information')
  const canReviewEvidence = can(actor.actorRole, 'review-evidence')

  const [exam, setExam] = useState<ExaminationDetail | null | undefined>(undefined)
  const [procedures, setProcedures] = useState<ExaminationProcedure[]>([])
  const [requests, setRequests] = useState<InformationRequest[]>([])
  const [reports, setReports] = useState<ExaminationReport[]>([])
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [findings, setFindings] = useState<FindingDetail[]>([])
  const [relatedFindings, setRelatedFindings] = useState<FindingDetail[]>([])
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  // Team modal
  const [teamOpen, setTeamOpen] = useState(false)
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; jobTitle: string }>>([])
  const [teamLeadId, setTeamLeadId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [specialistIds, setSpecialistIds] = useState<string[]>([])

  // Report approval confirm
  const [reportToApprove, setReportToApprove] = useState<ExaminationReport | null>(null)

  const load = useCallback(async () => {
    if (!examinationId) return
    const detail = await examinationService.getDetail(examinationId)
    setExam(detail ?? null)
    if (!detail) return
    const [procs, reqs, reps, ev, fnd, inst] = await Promise.all([
      examinationService.procedures(detail.id),
      examinationService.informationRequests(detail.id),
      examinationService.reports(detail.id),
      evidenceService.byExamination(detail.id),
      findingService.list({ examinationId: detail.id }),
      institutionService.getById(detail.institutionId),
    ])
    setProcedures(procs)
    setRequests(reqs)
    setReports(reps)
    setEvidence(ev)
    setFindings(fnd)
    setInstitution(inst)
    const related = await Promise.all(
      (detail.relatedFindingRefs ?? [])
        .filter((ref) => !fnd.some((f) => f.reference === ref))
        .map((ref) => findingService.getByReference(ref)),
    )
    setRelatedFindings(related.filter((f): f is FindingDetail => f !== undefined))
  }, [examinationId])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const approved = procedures.filter((p) => p.status === 'Approved')
    return {
      approved: approved.length,
      total: procedures.length,
      pending: procedures.filter((p) => p.status === 'Not Started').length,
      inReview: procedures.filter((p) => p.status === 'Submitted for Review').length,
      evidenceReceived: evidence.filter((e) => e.reviewStatus !== 'Rejected').length,
      evidencePending: evidence.filter((e) => e.reviewStatus === 'Pending Review').length,
      fails: approved.filter((p) => p.result === 'Fail').length,
    }
  }, [procedures, evidence])

  const findingsBySeverity = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    for (const f of findings) if (f.status !== 'Closed') counts[f.riskRating] += 1
    return counts
  }, [findings])

  if (exam === undefined) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  if (exam === null) {
    return (
      <div>
        <PageHeader title="Examination not found" />
        <ErrorState
          title="Unknown examination"
          message={`No examination with id "${examinationId}" exists in the demo dataset. It may have been created in a prototype session that was reset.`}
          onRetry={() => navigate('/app/examinations')}
          retryLabel="Back to register"
        />
      </div>
    )
  }

  const e = exam

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

  const openTeamModal = async () => {
    const list = await institutionService.listStaff()
    setStaff(list)
    setTeamLeadId(e.team.find((t) => t.roleInExamination === 'Team Lead')?.staffId ?? '')
    setMemberIds(e.team.filter((t) => t.roleInExamination === 'Examiner').map((t) => t.staffId))
    setSpecialistIds(e.team.filter((t) => t.roleInExamination === 'Specialist Reviewer').map((t) => t.staffId))
    setTeamOpen(true)
  }

  const saveTeam = () => {
    const byIdMap = new Map(staff.map((s) => [s.id, s]))
    const members: ExaminationTeamMember[] = []
    const lead = byIdMap.get(teamLeadId)
    if (lead) members.push({ staffId: lead.id, name: lead.fullName, roleInExamination: 'Team Lead', conflictDeclaration: 'None declared' })
    for (const id of memberIds) {
      const s = byIdMap.get(id)
      if (s) members.push({ staffId: s.id, name: s.fullName, roleInExamination: 'Examiner', conflictDeclaration: 'None declared' })
    }
    for (const id of specialistIds) {
      const s = byIdMap.get(id)
      if (s) members.push({ staffId: s.id, name: s.fullName, roleInExamination: 'Specialist Reviewer', conflictDeclaration: 'None declared' })
    }
    if (members.length === 0) {
      toast.error('Team required', 'Assign at least a team lead.')
      return
    }
    setTeamOpen(false)
    void runAction('Team assigned', () => examinationService.assignTeam(e.id, members, actor))
  }

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader title="Completion progress" />
            <CardBody className="flex items-center gap-5">
              <ProgressRing value={e.progressPct} label="Examination progress" />
              <div className="flex flex-col gap-1.5 text-xs text-ink-secondary">
                <p><span className="font-semibold text-ink">{stats.approved}</span> / {stats.total} procedures approved</p>
                <p><span className="font-semibold text-ink">{stats.inReview}</span> awaiting review</p>
                <p><span className="font-semibold text-ink">{stats.pending}</span> not started</p>
                <p><span className="font-semibold text-error">{stats.fails}</span> approved with Fail result</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Domain coverage & evidence" />
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {e.scope.domains.map((d) => (
                  <span key={d} className="rounded-full bg-tint-blue px-2.5 py-1 text-[11px] font-medium text-primary">{d}</span>
                ))}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="overline">Evidence received</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{stats.evidenceReceived} items</dd>
                </div>
                <div>
                  <dt className="overline">Evidence pending review</dt>
                  <dd className="mt-0.5 font-semibold text-warning">{stats.evidencePending} items</dd>
                </div>
                <div>
                  <dt className="overline">Information requests</dt>
                  <dd className="mt-0.5 text-ink">{requests.length} ({requests.filter((r) => r.status === 'Fulfilled').length} fulfilled)</dd>
                </div>
                <div>
                  <dt className="overline">Programmes</dt>
                  <dd className="mt-0.5 text-ink">{e.programmeRefs.join(', ') || '—'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Findings by severity" subtitle="Raised in this examination (open)." />
            <CardBody>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(['Critical', 'High', 'Medium', 'Low'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    className="cursor-pointer rounded-lg bg-page px-2 py-3 hover:bg-tint-blue"
                    onClick={() => navigate(`/app/findings?examinationId=${e.id}&severity=${sev}`)}
                    title={`Open findings register filtered to ${sev}`}
                  >
                    <p className="text-xl font-bold text-ink">{findingsBySeverity[sev]}</p>
                    <p className="text-[10px] text-ink-secondary">{sev}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-ink-secondary">
                {findings.length} finding(s) raised in this examination
                {relatedFindings.length > 0 && ` · ${relatedFindings.length} related from earlier work`} (demo).
              </p>
            </CardBody>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader title="Upcoming milestones" />
            <CardBody>
              <ul className="flex flex-col gap-2">
                {e.milestones.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg bg-page px-3 py-2 text-xs">
                    <span className={cx('flex items-center gap-2', m.done ? 'text-ink-secondary line-through' : 'font-medium text-ink')}>
                      {m.done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />}
                      {m.label}
                    </span>
                    <span className="text-ink-secondary">{formatDate(m.date)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Activity timeline" subtitle="Latest workflow events." />
            <CardBody>
              <ul className="flex flex-col gap-2">
                {e.workflowHistory.slice(-5).reverse().map((w) => (
                  <li key={w.id} className="text-xs">
                    <p className="font-medium text-ink">{w.action}</p>
                    <p className="text-[10px] text-ink-secondary">{w.actorName} · {formatRelativeTime(w.at)}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      ),
    },
    {
      id: 'scope',
      label: 'Scope & Objectives',
      content: (
        <Card>
          <CardHeader title="Scope & objectives" subtitle={`${e.scope.methodologyName} ${e.scope.methodologyVersion} · review period ${formatDate(e.scope.reviewPeriodStart)} → ${formatDate(e.scope.reviewPeriodEnd)}`} />
          <CardBody>
            <p className="text-sm leading-relaxed text-ink">{e.scope.objectives}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
              <div>
                <p className="overline">Domains</p>
                <p className="mt-1 text-ink">{e.scope.domains.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="overline">Products / business lines</p>
                <p className="mt-1 text-ink">{e.scope.productLines.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="overline">Locations</p>
                <p className="mt-1 text-ink">{e.scope.locations.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="overline">Scope limitations</p>
                <p className="mt-1 text-ink">{e.scope.limitations || 'None recorded (demo).'}</p>
              </div>
              {e.sourceAlertRef && (
                <div>
                  <p className="overline">Source alert</p>
                  <p className="mt-1 font-mono text-[11px] text-ink">
                    {e.sourceAlertRef} — targeted examination converted from an early warning (§6.4)
                  </p>
                </div>
              )}
              {e.relatedFindingRefs && e.relatedFindingRefs.length > 0 && (
                <div>
                  <p className="overline">Related findings / actions</p>
                  <p className="mt-1 font-mono text-[11px] text-ink">{e.relatedFindingRefs.join(', ')}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'team',
      label: 'Team',
      count: e.team.length,
      content: (
        <Card>
          <CardHeader
            title="Examination team"
            subtitle="Roles within the examination and conflict-declaration placeholders (Spec §7.2 step 3)."
            action={
              canAssign ? (
                <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => void openTeamModal()}>
                  <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Assign team
                </button>
              ) : undefined
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {e.team.map((m) => (
                <div key={m.staffId} className="rounded-lg border border-line p-3">
                  <p className="text-sm font-semibold text-ink">{m.name}</p>
                  <p className="text-[11px] text-primary">{m.roleInExamination}</p>
                  <p className="mt-1.5 text-[10px] text-ink-secondary">Conflict declaration: {m.conflictDeclaration}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'programme',
      label: 'Work Programme',
      count: procedures.length,
      content: (
        <Card>
          <CardHeader
            title="Work programme"
            subtitle={`${stats.approved} of ${procedures.length} procedures approved — instantiated from ${e.programmeRefs.join(', ') || 'custom procedures'}.`}
            action={
              canFieldwork && ACTIVE_STATUSES.has(e.status) ? (
                <button
                  type="button"
                  className="cursor-pointer text-xs font-medium text-primary hover:underline"
                  onClick={() => navigate(`/app/examinations/${e.id}/workspace`)}
                >
                  <FolderSearch className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Open fieldwork workspace
                </button>
              ) : undefined
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="overline border-b border-line bg-page">
                  <th className="px-5 py-2.5">Procedure</th>
                  <th className="px-3 py-2.5">Domain</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Due</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Result</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p) => (
                  <tr
                    key={p.id}
                    className={cx('border-b border-line/60 last:border-0', canFieldwork && 'cursor-pointer hover:bg-page')}
                    onClick={() => canFieldwork && navigate(`/app/examinations/${e.id}/workspace?procedure=${p.id}`)}
                  >
                    <td className="px-5 py-2.5">
                      <span className="font-mono text-[10px] font-semibold text-primary">{p.code}</span>
                      <p className="max-w-64 truncate font-medium text-ink">{p.title}</p>
                    </td>
                    <td className="px-3 py-2.5 text-ink-secondary">{p.domainName}</td>
                    <td className="px-3 py-2.5 text-ink-secondary">{p.ownerName}</td>
                    <td className="px-3 py-2.5 text-ink-secondary">{formatDate(p.dueDate)}</td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={p.priority} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.result} tone={RESULT_TONES[p.result]} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} tone={STATUS_TONES[p.status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {procedures.length === 0 && (
              <p className="px-5 py-4 text-xs text-ink-secondary">
                No procedures yet — work programmes are instantiated from approved library templates in the create
                wizard (Spec §7.2 step 4).
              </p>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'requests',
      label: 'Information Requests',
      count: requests.length,
      content: (
        <div className="flex flex-col gap-4">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardHeader
                title={<span className="flex items-center gap-2"><span className="font-mono text-xs text-primary">{r.reference}</span> {r.title}</span>}
                subtitle={`Issued ${formatDate(r.issuedAt)} · due ${formatDate(r.dueDate)}${r.templateName ? ` · template: ${r.templateName}` : ''}`}
                action={<StatusBadge status={r.status} tone={STATUS_TONES[r.status]} />}
              />
              <CardBody>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="overline border-b border-line">
                      <th className="py-2 pr-3">Document</th>
                      <th className="py-2 pr-3">Deadline</th>
                      <th className="py-2 pr-3">Status</th>
                      {canRequestInfo && <th className="py-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((item) => (
                      <tr key={item.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-3 text-ink">{item.document}</td>
                        <td className="py-2 pr-3 text-ink-secondary">{formatDate(item.deadline)}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={item.status} tone={STATUS_TONES[item.status]} />
                          {item.receivedAt && <span className="ml-1.5 text-[9px] text-ink-secondary">{formatRelativeTime(item.receivedAt)}</span>}
                        </td>
                        {canRequestInfo && (
                          <td className="py-2">
                            <div className="flex justify-end gap-1">
                              {item.status !== 'Received' && item.status !== 'Waived' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void runAction(`"${item.document}" marked received`, () =>
                                    examinationService.setRequestItemStatus(r.id, item.id, 'Received', actor),
                                  )}
                                >
                                  Mark received
                                </Button>
                              )}
                              {item.status !== 'Waived' && item.status !== 'Received' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void runAction(`"${item.document}" waived`, () =>
                                    examinationService.setRequestItemStatus(r.id, item.id, 'Waived', actor),
                                  )}
                                >
                                  Waive
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-ink-secondary">
                  Portal recipients (demo): {r.recipientNames.join(' · ')}
                </p>
              </CardBody>
            </Card>
          ))}
          {requests.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-xs text-ink-secondary">
                  No information request issued for this examination. Requests are created in the wizard (step 5) or
                  can be added later — a demo action in this prototype.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'fieldwork',
      label: 'Fieldwork',
      content: (
        <Card>
          <CardHeader
            title="Fieldwork status"
            subtitle="Daily testing happens in the three-panel fieldwork workspace (Spec §7.4)."
            action={
              <Button
                variant="primary"
                size="sm"
                iconLeft={<FolderSearch className="h-3.5 w-3.5" />}
                disabled={!canFieldwork}
                onClick={() => navigate(`/app/examinations/${e.id}/workspace`)}
              >
                Open workspace
              </Button>
            }
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {(['Not Started', 'In Progress', 'Draft Saved', 'Submitted for Review', 'Returned for Rework', 'Approved'] as const).map((status) => {
                const count = procedures.filter((p) => p.status === status).length
                return (
                  <div key={status} className="rounded-lg bg-page p-3 text-center">
                    <p className="text-xl font-bold text-ink">{count}</p>
                    <p className="text-[10px] text-ink-secondary">{status}</p>
                  </div>
                )
              })}
            </div>
            {!ACTIVE_STATUSES.has(e.status) && (
              <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-[11px] text-accent-dark">
                This examination is at the <strong>{e.status}</strong> stage — the workspace is read-only context
                outside active fieldwork (demo behaviour).
              </p>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'evidence',
      label: 'Evidence',
      count: evidence.length,
      content: (
        <Card>
          <CardHeader
            title="Evidence collected"
            subtitle="Confidentiality-classified demo items; the full repository lives under Evidence."
            action={
              <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => navigate('/app/evidence')}>
                Open evidence repository
              </button>
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="overline border-b border-line bg-page">
                  <th className="px-5 py-2.5">Reference</th>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Confidentiality</th>
                  <th className="px-3 py-2.5">Uploaded</th>
                  <th className="px-3 py-2.5">Review</th>
                  {canReviewEvidence && <th className="px-3 py-2.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {evidence.map((ev) => (
                  <tr key={ev.id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-page" onClick={() => navigate(`/app/evidence?highlight=${ev.id}`)}>
                    <td className="px-5 py-2.5 font-mono text-[10px] font-semibold text-primary">{ev.reference}</td>
                    <td className="max-w-64 px-3 py-2.5 truncate text-ink">{ev.title}</td>
                    <td className="px-3 py-2.5 text-ink-secondary">{ev.category}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={ev.confidentiality} tone={ev.confidentiality === 'Restricted' ? 'overdue' : ev.confidentiality === 'Confidential' ? 'fieldwork' : 'draft'} /></td>
                    <td className="px-3 py-2.5 text-ink-secondary">{formatDate(ev.uploadedAt)} · {ev.uploadedByName.split(' (')[0]}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={ev.reviewStatus} tone={STATUS_TONES[ev.reviewStatus]} /></td>
                    {canReviewEvidence && (
                      <td className="px-3 py-2.5 text-right">
                        {ev.reviewStatus === 'Pending Review' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(ev2) => {
                              ev2.stopPropagation()
                              void runAction(`Evidence ${ev.reference} marked reviewed`, () =>
                                evidenceService.markReviewed(ev.id, 'Reviewed from the examination detail tab (demo note).', actor),
                              )
                            }}
                          >
                            Mark reviewed
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {evidence.length === 0 && (
              <p className="px-5 py-4 text-xs text-ink-secondary">No evidence linked to this examination yet (demo).</p>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'findings',
      label: 'Findings',
      count: findings.length + relatedFindings.length,
      content: (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Findings raised in this examination"
              action={
                <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => navigate(`/app/findings?examinationId=${e.id}`)}>
                  Open in findings register
                </button>
              }
            />
            <CardBody className="p-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="overline border-b border-line bg-page">
                    <th className="px-5 py-2.5">Reference</th>
                    <th className="px-3 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Severity</th>
                    <th className="px-3 py-2.5">Breach class</th>
                    <th className="px-3 py-2.5">From procedure</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr key={f.id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-page" onClick={() => navigate(`/app/findings/${f.id}`)}>
                      <td className="px-5 py-2.5 font-mono text-[10px] font-semibold text-primary">{f.reference}</td>
                      <td className="max-w-72 px-3 py-2.5 truncate font-medium text-ink">{f.title}</td>
                      <td className="px-3 py-2.5"><RiskBadge rating={f.riskRating} /></td>
                      <td className="px-3 py-2.5 text-ink-secondary">{f.breachClassification}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-ink-secondary">{f.procedureCode ?? '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {findings.length === 0 && (
                <p className="px-5 py-4 text-xs text-ink-secondary">
                  No findings raised in this examination yet. Findings are raised from procedure exceptions in the
                  fieldwork workspace (Spec §7.4).
                </p>
              )}
            </CardBody>
          </Card>
          {relatedFindings.length > 0 && (
            <Card>
              <CardHeader title="Related findings from earlier work" subtitle="Context for this examination's trigger (demo story links)." />
              <CardBody>
                <ul className="flex flex-col gap-2">
                  {relatedFindings.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-primary-surface"
                        onClick={() => navigate(`/app/findings/${f.id}`)}
                      >
                        <span>
                          <span className="font-mono text-[10px] font-semibold text-primary">{f.reference}</span>{' '}
                          <span className="font-medium text-ink">{f.title}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <RiskBadge rating={f.riskRating} />
                          <StatusBadge status={f.status} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'responses',
      label: 'Management Responses',
      content: (
        <Card>
          <CardHeader title="Management responses" subtitle="Institution responses to this examination's findings (Spec §7.7)." />
          <CardBody>
            {findings.filter((f) => f.managementResponses.length > 0).length === 0 ? (
              <p className="text-xs text-ink-secondary">
                No management responses recorded yet for this examination's findings. Responses are recorded from the
                finding detail screen (Management Response tab).
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {findings.map((f) =>
                  f.managementResponses.map((r) => (
                    <div key={r.id} className="rounded-lg border border-line p-3">
                      <p className="flex flex-wrap items-center gap-2 text-xs">
                        <button type="button" className="cursor-pointer font-mono text-[10px] font-semibold text-primary hover:underline" onClick={() => navigate(`/app/findings/${f.id}`)}>
                          {f.reference}
                        </button>
                        <span className="font-medium text-ink">{r.respondedByName}</span>
                        <span className="text-ink-secondary">{r.respondedByOrg}</span>
                        <StatusBadge status={r.position} tone={r.position === 'Accepted' ? 'active' : r.position === 'Disputed' ? 'overdue' : 'fieldwork'} />
                        <span className="text-[10px] text-ink-secondary">{formatRelativeTime(r.at)}</span>
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">{r.responseText}</p>
                      {r.plannedAction && (
                        <p className="mt-1.5 text-[11px] text-ink">
                          <span className="overline">Planned action:</span> {r.plannedAction}
                          {r.plannedDate ? ` (target ${formatDate(r.plannedDate)})` : ''}
                        </p>
                      )}
                    </div>
                  )),
                )}
              </div>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      count: reports.length,
      content: (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader
                title={<span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" aria-hidden="true" /> {r.title}</span>}
                subtitle={`${r.version} · updated ${formatRelativeTime(r.updatedAt)} · author ${r.authorName}`}
                action={<StatusBadge status={r.status} tone={STATUS_TONES[r.status]} />}
              />
              <CardBody>
                <div className="flex flex-col gap-3">
                  {r.sections.map((s) => (
                    <div key={s.heading}>
                      <p className="text-xs font-semibold text-primary">{s.heading}</p>
                      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-secondary">{s.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                  {(r.status === 'Draft' || r.status === 'In Review') && (
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => void runAction('Draft report refreshed from live fieldwork state', () =>
                        examinationService.refreshDraftReport(e.id, actor),
                      )}
                    >
                      Refresh from fieldwork
                    </Button>
                  )}
                  {r.status === 'Draft' && canFieldwork && (
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={<ArrowUpRight className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => void runAction('Draft report submitted for approval', () =>
                        examinationService.submitReportForApproval(e.id, r.id, actor),
                      )}
                    >
                      Submit for approval
                    </Button>
                  )}
                  {r.status === 'In Review' && canApproveResults && (
                    <Button variant="success" size="sm" iconLeft={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setReportToApprove(r)}>
                      Approve report
                    </Button>
                  )}
                </div>
                <p className="mt-3 rounded bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
                  Draft report content is auto-assembled from prototype-session fieldwork state and is clearly
                  labelled demo — it is not a real supervisory report.
                </p>
              </CardBody>
            </Card>
          ))}
          {reports.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-xs text-ink-secondary">No report drafted yet. A draft report is generated when the examination moves into reporting (demo behaviour).</p>
              </CardBody>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'activity',
      label: 'Activity & Approvals',
      count: e.workflowHistory.length,
      content: (
        <Card>
          <CardHeader title="Activity & approvals" subtitle="Full workflow history for this examination (demo events + prototype session)." />
          <CardBody>
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {e.workflowHistory.slice().reverse().map((w) => (
                <li key={w.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <p className="text-xs font-semibold text-ink">{w.action}</p>
                  <p className="text-[10px] text-ink-secondary">{w.actorName} · {formatRelativeTime(w.at)}</p>
                  {w.note && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{w.note}</p>}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl text-primary">{e.reference}</span>
            <span className="text-lg font-semibold text-ink">{e.title}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => navigate(`/app/institutions/${e.institutionId}`)}>
              {institution?.tradingName ?? 'Institution'}
            </button>
            <span aria-hidden="true">·</span>
            <span>{e.type} examination</span>
            <span aria-hidden="true">·</span>
            <StatusBadge status={e.status} tone={STATUS_TONES[e.status]} />
            <RiskBadge rating={e.riskRating} />
            <span aria-hidden="true">·</span>
            <span>Lead {e.leadExaminerName}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(e.startDate)} → {formatDate(e.plannedEndDate)}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo record
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Examination Register', path: '/app/examinations' }, { label: e.reference }]}
        actions={
          <>
            <span className="hidden w-28 md:block">
              <ProgressBar value={e.progressPct} showValue tone={e.progressPct >= 100 ? 'success' : 'primary'} label="Progress" />
            </span>
            {canFieldwork && (e.status === 'Planned' || e.status === 'Draft') && (
              <Button
                variant="success"
                iconLeft={<Play className="h-4 w-4" />}
                loading={busy}
                onClick={() => void runAction('Fieldwork started', () => examinationService.startFieldwork(e.id, actor))}
              >
                Start fieldwork
              </Button>
            )}
            {canApproveResults && e.status === 'Fieldwork' && (
              <Button
                variant="outline"
                iconLeft={<ArrowUpRight className="h-4 w-4" />}
                loading={busy}
                onClick={() => void runAction('Moved to reporting', () => examinationService.setStatus(e.id, 'Reporting', actor, 'Fieldwork complete; moved to reporting stage.'))}
              >
                Move to reporting
              </Button>
            )}
            {canApproveResults && (e.status === 'Reporting' || e.status === 'In Progress') && (
              <Button
                variant="primary"
                iconLeft={<CheckCircle2 className="h-4 w-4" />}
                loading={busy}
                onClick={() => void runAction('Examination completed', () => examinationService.setStatus(e.id, 'Completed', actor, 'Completed in the prototype session.'))}
              >
                Complete examination
              </Button>
            )}
            {canFieldwork && ACTIVE_STATUSES.has(e.status) && (
              <Button
                variant="primary"
                iconLeft={<FolderSearch className="h-4 w-4" />}
                onClick={() => navigate(`/app/examinations/${e.id}/workspace`)}
              >
                Open workspace
              </Button>
            )}
          </>
        }
      />

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Team assignment modal */}
      <Modal open={teamOpen} onClose={() => setTeamOpen(false)} title="Assign examination team" size="lg">
        <div className="flex flex-col gap-3">
          <Select
            label="Team lead"
            required
            value={teamLeadId}
            onChange={(ev) => setTeamLeadId(ev.target.value)}
            placeholder="Select the lead…"
            options={staff.map((s) => ({ value: s.id, label: `${s.fullName} — ${s.jobTitle}` }))}
          />
          <fieldset>
            <legend className="overline">Examiners</legend>
            <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {staff.filter((s) => s.id !== teamLeadId).map((s) => (
                <Checkbox
                  key={s.id}
                  label={`${s.fullName} — ${s.jobTitle}`}
                  checked={memberIds.includes(s.id)}
                  onChange={(ev) => setMemberIds((prev) => (ev.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="overline">Specialist reviewers</legend>
            <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {staff.filter((s) => s.id !== teamLeadId && !memberIds.includes(s.id)).map((s) => (
                <Checkbox
                  key={s.id}
                  label={`${s.fullName} — ${s.jobTitle}`}
                  checked={specialistIds.includes(s.id)}
                  onChange={(ev) => setSpecialistIds((prev) => (ev.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
                />
              ))}
            </div>
          </fieldset>
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] text-accent-dark">
            Conflict declarations are recorded as a placeholder ("None declared") — the prototype does not collect
            real declarations (Spec §7.2 step 3).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTeamOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={busy} loading={busy} onClick={saveTeam}>
              Save team
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report approval */}
      <ConfirmDialog
        open={reportToApprove !== null}
        variant="success"
        title="Approve examination report?"
        message={
          <span>
            Approving <strong>{reportToApprove?.title}</strong> marks it Approved in the prototype session and
            completes the linked My Work approval item (demo).
          </span>
        }
        confirmLabel="Approve report"
        loading={busy}
        onConfirm={() => {
          const r = reportToApprove
          setReportToApprove(null)
          if (r) void runAction('Report approved', () => examinationService.approveReport(e.id, r.id, actor))
        }}
        onClose={() => setReportToApprove(null)}
      />
    </div>
  )
}
