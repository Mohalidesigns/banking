import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  MessageSquarePlus,
  RotateCcw,
  Send,
  TriangleAlert,
} from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { isInstitutionRole } from '@/types/auth'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { evidenceService } from '@/services/mock/MockEvidenceService'
import { findingService } from '@/services/mock/MockFindingService'
import { remediationService } from '@/services/mock/MockRemediationService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { EvidenceItem } from '@/types/examination'
import type { CorrectiveActionDetail, FindingDetail, ManagementResponsePosition } from '@/types/finding'
import { formatDate, formatRelativeTime } from '@/utils/datetime'

/**
 * Finding detail (Spec §7.7): seven tabs — Overview (five-Cs), Examination
 * Evidence, Regulatory Mapping, Management Response, Corrective Actions,
 * Review & Approval, History. Workflow actions are role-gated: submit for
 * review (raiser), return/approve (reviewers with approve-finding —
 * examiners can never approve), management response (institution side),
 * escalate. Demo data only.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  'Under Review': 'reporting',
  Confirmed: 'active',
  'Remediation In Progress': 'fieldwork',
  Closed: 'closed',
  Escalated: 'overdue',
}

export function FindingDetailPage() {
  const { findingId } = useParams<{ findingId: string }>()
  const navigate = useNavigate()
  const actor = useActor()
  const canRaise = can(actor.actorRole, 'raise-finding')
  const canReview = can(actor.actorRole, 'review-finding')
  const canApprove = can(actor.actorRole, 'approve-finding') && !isInstitutionRole(actor.actorRole)
  const canRespond = can(actor.actorRole, 'respond-finding')

  const [finding, setFinding] = useState<FindingDetail | null | undefined>(undefined)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [corrective, setCorrective] = useState<CorrectiveActionDetail | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState('')
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateComment, setEscalateComment] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [responseOpen, setResponseOpen] = useState(false)
  const [responseDraft, setResponseDraft] = useState({
    position: 'Accepted' as ManagementResponsePosition,
    responseText: '',
    plannedAction: '',
    plannedDate: '',
  })

  const load = useCallback(async () => {
    if (!findingId) return
    const found = await findingService.getById(findingId)
    setFinding(found ?? null)
    if (!found) return
    const [inst, ev, caps] = await Promise.all([
      institutionService.getById(found.institutionId),
      evidenceService.byFinding(found.id),
      remediationService.list({ findingId: found.id }),
    ])
    setInstitution(inst)
    setEvidence(ev)
    setCorrective(caps[0] ?? null)
  }, [findingId])

  useEffect(() => {
    void load()
  }, [load])

  const evidenceByRef = useMemo(() => new Map(evidence.map((e) => [e.reference, e])), [evidence])

  if (finding === undefined) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  if (finding === null) {
    return (
      <div>
        <PageHeader title="Finding not found" />
        <ErrorState
          title="Unknown finding"
          message={`No finding with id "${findingId}" exists in the demo dataset. It may have been created in a prototype session that was reset.`}
          onRetry={() => navigate('/app/findings')}
          retryLabel="Back to findings"
        />
      </div>
    )
  }

  const f = finding

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

  const fiveCs: Array<[string, string]> = [
    ['Condition — what was found', f.fiveCs.condition],
    ['Criteria — requirement breached', f.fiveCs.criteria],
    ['Cause', f.fiveCs.cause],
    ['Consequence / risk', f.fiveCs.consequence],
    ['Recommendation / corrective measure', f.fiveCs.recommendation],
  ]

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Five-Cs finding structure" subtitle="Documentation aid per Spec §7.7 — supports regulator-specific breach and intervention classifications." />
            <CardBody>
              <dl className="flex flex-col gap-3">
                {fiveCs.map(([label, text]) => (
                  <div key={label} className="rounded-lg border border-line p-3">
                    <dt className="overline">{label}</dt>
                    <dd className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink">{text}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Severity & classification" />
              <CardBody>
                <div className="flex flex-col gap-2 text-xs">
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Severity</span>
                    <RiskBadge rating={f.riskRating} />
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Breach classification</span>
                    <StatusBadge
                      status={f.breachClassification}
                      tone={f.breachClassification === 'Breach' ? 'overdue' : f.breachClassification === 'Deficiency' ? 'fieldwork' : f.breachClassification === 'Observation' ? 'planning' : 'active'}
                    />
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Status</span>
                    <StatusBadge status={f.status} tone={STATUS_TONES[f.status]} />
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Due</span>
                    <span className={f.status !== 'Closed' && f.dueDate < new Date().toISOString().slice(0, 10) ? 'font-semibold text-error' : 'text-ink'}>
                      {formatDate(f.dueDate)}
                    </span>
                  </p>
                </div>
                <p className="mt-3 rounded-lg bg-page p-2.5 text-[11px] leading-relaxed text-ink-secondary">
                  <span className="overline">Severity rationale</span>
                  <br />
                  {f.severityRationale}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Ownership" />
              <CardBody>
                <dl className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <dt className="overline">Institution</dt>
                    <dd className="mt-0.5">
                      <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => navigate(`/app/institutions/${f.institutionId}`)}>
                        {institution?.tradingName ?? '—'}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="overline">Responsible institution owner</dt>
                    <dd className="mt-0.5 text-ink">
                      {f.institutionOwnerName ?? f.ownerName}
                      <span className="block text-[10px] text-ink-secondary">{f.institutionOwnerRole}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="overline">Raised by / reviewer</dt>
                    <dd className="mt-0.5 text-ink">
                      {f.ownerName}
                      <span className="block text-[10px] text-ink-secondary">
                        Reviewer: {f.reviewerName ?? 'not yet assigned (demo)'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="overline">Cross-domain links</dt>
                    <dd className="mt-0.5 text-ink">
                      {f.crossDomainLinks.length > 0 ? f.crossDomainLinks.join(', ') : 'None recorded (demo)'}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'evidence',
      label: 'Examination Evidence',
      count: f.evidenceLinks.length + evidence.length,
      content: (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Examination context"
              subtitle={f.examinationRef ? 'The examination and procedure this finding came from.' : 'Not raised inside an examination.'}
            />
            <CardBody>
              {f.examinationRef ? (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-line bg-page px-3 py-2 font-mono text-[11px] font-semibold text-primary hover:border-primary-surface"
                    onClick={() => navigate(`/app/examinations/${f.examinationId}`)}
                  >
                    {f.examinationRef} → examination detail
                  </button>
                  {f.procedureCode && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-lg border border-line bg-page px-3 py-2 font-mono text-[11px] font-semibold text-primary hover:border-primary-surface"
                      onClick={() => navigate(`/app/examinations/${f.examinationId}/workspace`)}
                    >
                      Procedure {f.procedureCode} → fieldwork workspace
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">
                  This finding was recorded outside a specific examination in the demo dataset (e.g. off-site
                  follow-up). Remediation is still tracked under Follow-Up & Remediation.
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Evidence supporting the finding" subtitle="Linked items from the evidence repository (demo)." />
            <CardBody className="p-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="overline border-b border-line bg-page">
                    <th className="px-5 py-2.5">Reference</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-3 py-2.5">Review status</th>
                  </tr>
                </thead>
                <tbody>
                  {f.evidenceLinks.map((link) => {
                    const item = link.evidenceId ? evidence.find((e) => e.id === link.evidenceId) : evidenceByRef.get(link.reference)
                    return (
                      <tr
                        key={link.reference}
                        className={item ? 'cursor-pointer border-b border-line/60 hover:bg-page' : 'border-b border-line/60'}
                        onClick={() => item && navigate(`/app/evidence?highlight=${item.id}`)}
                      >
                        <td className="px-5 py-2.5 font-mono text-[10px] font-semibold text-primary">{link.reference}</td>
                        <td className="px-3 py-2.5 text-ink-secondary">{link.description}</td>
                        <td className="px-3 py-2.5">
                          {item ? <StatusBadge status={item.reviewStatus} /> : <span className="text-[10px] text-ink-secondary">archived (demo)</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {f.evidenceLinks.length === 0 && (
                <p className="px-5 py-4 text-xs text-ink-secondary">
                  No evidence linked yet — items are attached from the fieldwork workspace or the evidence
                  repository ("Link finding").
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      ),
    },
    {
      id: 'regulatory',
      label: 'Regulatory Mapping',
      content: (
        <Card>
          <CardHeader title="Regulatory mapping" subtitle="Demo regulatory references — fictional instruments (Spec §17.5)." />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
              <div className="rounded-lg border border-line p-3">
                <p className="overline">Regulatory reference</p>
                <p className="mt-1 font-mono text-[11px] font-semibold text-primary">{f.regulatoryReference}</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <p className="overline">Breach classification</p>
                <p className="mt-1 text-ink">
                  {f.breachClassification} — {f.riskRating} severity (demo matrix)
                </p>
              </div>
              <div className="rounded-lg border border-line p-3 md:col-span-2">
                <p className="overline">Criteria (as documented in the finding)</p>
                <p className="mt-1 leading-relaxed text-ink">{f.fiveCs.criteria}</p>
              </div>
              <div className="rounded-lg border border-line p-3 md:col-span-2">
                <p className="overline">Domain mapping</p>
                <p className="mt-1 text-ink">
                  Primary domain: {f.category}
                  {f.crossDomainLinks.length > 0 && ` · cross-domain: ${f.crossDomainLinks.join(', ')}`}
                </p>
                <p className="mt-1 text-[10px] text-ink-secondary">
                  The examination library holds the authoritative mapping between procedures and demo regulatory
                  instruments — see the programme used for this examination.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'response',
      label: 'Management Response',
      count: f.managementResponses.length,
      content: (
        <Card>
          <CardHeader
            title="Management responses"
            subtitle="Recorded by the institution side (demo portal identities) — Spec §7.7."
            action={
              canRespond && f.status !== 'Closed' && f.status !== 'Draft' ? (
                <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => setResponseOpen(true)}>
                  <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Record response
                </button>
              ) : undefined
            }
          />
          <CardBody>
            {f.managementResponses.length === 0 ? (
              <p className="text-xs text-ink-secondary">
                No management response recorded yet.
                {f.status === 'Confirmed'
                  ? ' The institution can respond once the finding is confirmed (demo workflow).'
                  : ' Responses become available after the finding passes review (demo workflow).'}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {f.managementResponses.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line p-3">
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-ink">{r.respondedByName}</span>
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
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'corrective',
      label: 'Corrective Actions',
      content: (
        <Card>
          <CardHeader
            title="Corrective action"
            subtitle="Remediation tracked under Follow-Up & Remediation (Spec §7.8)."
            action={
              <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => navigate('/app/remediation')}>
                Open remediation workspace
              </button>
            }
          />
          <CardBody>
            {corrective ? (
              <div className="rounded-lg border border-line p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{corrective.reference}</span>
                  <span className="text-sm font-medium text-ink">{corrective.title}</span>
                  <StatusBadge status={corrective.status} tone={corrective.status === 'Overdue' ? 'overdue' : corrective.status === 'Closed' ? 'closed' : corrective.status === 'Validated' ? 'active' : 'fieldwork'} />
                </p>
                <p className="mt-2 text-xs text-ink-secondary">
                  Owner: {corrective.ownerName} · target {formatDate(corrective.dueDate)} · progress {corrective.progressPct}% ·
                  validation: {corrective.validationStatus}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-secondary">{corrective.agreedPlan}</p>
                <div className="mt-3 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/remediation')}>
                    Milestones, updates & closure →
                  </Button>
                </div>
              </div>
            ) : f.correctiveActionRef ? (
              <p className="text-xs text-ink-secondary">
                Corrective action <span className="font-mono font-semibold text-primary">{f.correctiveActionRef}</span>{' '}
                is referenced by this finding — open the remediation workspace for its live state.
              </p>
            ) : (
              <p className="text-xs text-ink-secondary">
                No corrective action agreed yet. In the demo workflow, a corrective action is agreed with the
                institution after the finding is confirmed (Spec §7.8).
              </p>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'review',
      label: 'Review & Approval',
      count: f.approvalTrail.length,
      content: (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Approval trail" subtitle="Raise → submit → return/approve → escalate (Spec §7.7)." />
            <CardBody>
              <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
                {f.approvalTrail.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card ${
                        event.decision === 'Approved' ? 'bg-success' : event.decision === 'Returned' || event.decision === 'Escalated' ? 'bg-error' : event.decision === 'Submitted' ? 'bg-warning' : 'bg-primary'
                      }`}
                    />
                    <p className="text-xs font-semibold text-ink">
                      {event.decision}
                      <span className="ml-2 font-normal text-ink-secondary">
                        {event.actorName} ({event.actorRoleLabel}) · {formatRelativeTime(event.at)}
                      </span>
                    </p>
                    {event.comment && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{event.comment}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Review actions" subtitle="Gated per the Spec §19 demo role matrix." />
            <CardBody>
              <div className="flex flex-col gap-3">
                <p className="rounded-lg bg-page px-3 py-2 text-[11px] leading-relaxed text-ink-secondary">
                  Current demo role: <span className="font-semibold text-ink">{actor.actorRole}</span>.
                  {canApprove
                    ? ' This role can return, approve and escalate findings.'
                    : canReview
                      ? ' This role can review and return findings but NOT approve (approval needs Team Lead or above).'
                      : canRaise
                        ? ' This role can raise and submit findings but not review or approve them.'
                        : ' This role has read-only access to findings.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {canRaise && f.status === 'Draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={<Send className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => void runAction(`${f.reference} submitted for review`, () => findingService.submitForReview(f.id, actor))}
                    >
                      Submit for review
                    </Button>
                  )}
                  {canReview && f.status === 'Under Review' && (
                    <Button variant="warning" size="sm" iconLeft={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { setReturnComment(''); setReturnOpen(true) }}>
                      Return for rework
                    </Button>
                  )}
                  {canApprove && f.status === 'Under Review' && (
                    <Button variant="success" size="sm" iconLeft={<Check className="h-3.5 w-3.5" />} onClick={() => setConfirmApprove(true)}>
                      Approve finding
                    </Button>
                  )}
                  {canApprove && (f.status === 'Confirmed' || f.status === 'Remediation In Progress') && (
                    <Button variant="danger" size="sm" iconLeft={<TriangleAlert className="h-3.5 w-3.5" />} onClick={() => { setEscalateComment(''); setEscalateOpen(true) }}>
                      Escalate
                    </Button>
                  )}
                  {f.status === 'Under Review' && !canApprove && !canReview && (
                    <p className="text-[11px] text-ink-secondary">
                      Awaiting review by a Team Lead or above (Spec §19) — no action available for this demo role.
                    </p>
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
      label: 'History',
      content: (
        <Card>
          <CardHeader title="Finding history" subtitle="Combined workflow, response and remediation events (demo)." />
          <CardBody>
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {f.approvalTrail.map((event) => (
                <li key={event.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <p className="text-xs font-semibold text-ink">{event.decision}</p>
                  <p className="text-[10px] text-ink-secondary">
                    {event.actorName} · {formatDate(event.at)}
                  </p>
                  {event.comment && <p className="mt-0.5 text-[11px] text-ink-secondary">{event.comment}</p>}
                </li>
              ))}
              {f.managementResponses.map((r) => (
                <li key={r.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card bg-warning" />
                  <p className="text-xs font-semibold text-ink">Management response ({r.position})</p>
                  <p className="text-[10px] text-ink-secondary">
                    {r.respondedByName} · {formatDate(r.at)}
                  </p>
                </li>
              ))}
              {corrective && (
                <li className="relative">
                  <span aria-hidden="true" className="absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card bg-success" />
                  <p className="text-xs font-semibold text-ink">Corrective action {corrective.reference}</p>
                  <p className="text-[10px] text-ink-secondary">
                    {corrective.status} · validation {corrective.validationStatus} · progress {corrective.progressPct}%
                  </p>
                </li>
              )}
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
            <span className="font-mono text-xl text-primary">{f.reference}</span>
            <span className="text-lg font-semibold text-ink">{f.title}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => navigate(`/app/institutions/${f.institutionId}`)}>
              {institution?.tradingName ?? 'Institution'}
            </button>
            {f.examinationRef && (
              <>
                <span aria-hidden="true">·</span>
                <button type="button" className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline" onClick={() => navigate(`/app/examinations/${f.examinationId}`)}>
                  {f.examinationRef}
                </button>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{f.category}</span>
            <RiskBadge rating={f.riskRating} />
            <StatusBadge status={f.status} tone={STATUS_TONES[f.status]} />
            <span aria-hidden="true">·</span>
            <span>raised {formatDate(f.raisedDate)} · due {formatDate(f.dueDate)}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo record
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Supervisory Findings', path: '/app/findings' }, { label: f.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/app/findings')}>
              Register
            </Button>
            {canRaise && f.status === 'Draft' && (
              <Button
                variant="primary"
                iconLeft={<Send className="h-4 w-4" />}
                loading={busy}
                onClick={() => void runAction(`${f.reference} submitted for review`, () => findingService.submitForReview(f.id, actor))}
              >
                Submit for review
              </Button>
            )}
            {canApprove && f.status === 'Under Review' && (
              <Button variant="success" iconLeft={<Check className="h-4 w-4" />} onClick={() => setConfirmApprove(true)}>
                Approve finding
              </Button>
            )}
            {f.correctiveActionRef && (
              <Button variant="outline" iconLeft={<ArrowUpRight className="h-4 w-4" />} onClick={() => navigate('/app/remediation')}>
                Remediation ({f.correctiveActionRef})
              </Button>
            )}
          </>
        }
      />

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Return modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title={`Return ${f.reference} for rework`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Reviewer comment"
            required
            rows={3}
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            placeholder="What must the examiner revise in the five-Cs or severity? (demo)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={returnComment.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setReturnOpen(false)
                const comment = returnComment.trim()
                setReturnComment('')
                void runAction(`${f.reference} returned for rework`, () => findingService.returnForRework(f.id, actor, comment))
              }}
            >
              Return finding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escalate modal */}
      <Modal open={escalateOpen} onClose={() => setEscalateOpen(false)} title={`Escalate ${f.reference}`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Escalation rationale"
            required
            rows={3}
            value={escalateComment}
            onChange={(e) => setEscalateComment(e.target.value)}
            placeholder="e.g. Remediation overdue without validated progress; refer to enforcement (demo)."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={escalateComment.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                setEscalateOpen(false)
                const comment = escalateComment.trim()
                setEscalateComment('')
                void runAction(`${f.reference} escalated`, () => findingService.escalate(f.id, actor, comment))
              }}
            >
              Escalate finding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Management response modal */}
      <Modal open={responseOpen} onClose={() => setResponseOpen(false)} title={`Record management response — ${f.reference}`} size="lg">
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            In the prototype this response is recorded by the current demo identity on behalf of the institution
            (the real flow runs through the institution portal — Spec §15). Institution roles can respond but can
            never approve or close the finding (Spec §7.8).
          </p>
          <Select
            label="Institution position"
            value={responseDraft.position}
            onChange={(e) => setResponseDraft({ ...responseDraft, position: e.target.value as ManagementResponsePosition })}
            options={['Accepted', 'Partially Accepted', 'Disputed'].map((p) => ({ value: p, label: p }))}
          />
          <TextArea
            label="Response"
            required
            rows={3}
            value={responseDraft.responseText}
            onChange={(e) => setResponseDraft({ ...responseDraft, responseText: e.target.value })}
            placeholder="The institution's position on the finding (demo)."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Planned action"
              value={responseDraft.plannedAction}
              onChange={(e) => setResponseDraft({ ...responseDraft, plannedAction: e.target.value })}
              placeholder="What will be done?"
            />
            <TextInput
              label="Planned date"
              type="date"
              value={responseDraft.plannedDate}
              onChange={(e) => setResponseDraft({ ...responseDraft, plannedDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResponseOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={responseDraft.responseText.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const d = responseDraft
                setResponseOpen(false)
                void runAction('Management response recorded', () =>
                  findingService.addManagementResponse(
                    f.id,
                    {
                      respondedByName: actor.actorName,
                      respondedByOrg: `${institution?.tradingName ?? 'Institution'} (institution side — demo)`,
                      at: new Date().toISOString(),
                      position: d.position,
                      responseText: d.responseText.trim(),
                      plannedAction: d.plannedAction.trim() || undefined,
                      plannedDate: d.plannedDate || undefined,
                    },
                    actor,
                  ),
                )
                setResponseDraft({ position: 'Accepted', responseText: '', plannedAction: '', plannedDate: '' })
              }}
            >
              Record response
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={confirmApprove}
        variant="success"
        title={`Approve ${f.reference}?`}
        message={
          <span>
            Approving confirms this <strong>{f.riskRating}</strong> severity finding ({f.breachClassification})
            and moves it to <strong>Confirmed</strong>. The decision is recorded on the approval trail in this
            prototype session (demo).
          </span>
        }
        confirmLabel="Approve finding"
        loading={busy}
        onConfirm={() => {
          setConfirmApprove(false)
          void runAction(`${f.reference} approved`, () => findingService.approve(f.id, actor))
        }}
        onClose={() => setConfirmApprove(false)}
      />
    </div>
  )
}
