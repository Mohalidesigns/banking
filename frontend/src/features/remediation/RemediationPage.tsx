import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Check,
  Download,
  Gavel,
  Lock,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
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
import type { CorrectiveActionDetail, FindingDetail } from '@/types/finding'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Follow-Up & Remediation (Spec §7.8): register with overdue indicators plus
 * a detail workspace covering the agreed action plan, milestones,
 * institution updates, evidence, supervisory validation, extension requests,
 * escalation history and the closure decision. HARD RULE: the closure
 * decision is only offered to regulator roles holding `close-remediation` —
 * institution roles see an explicit refusal note and the mock service also
 * throws DemoPermissionError (Spec §7.8).
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Open: 'planning',
  'In Progress': 'fieldwork',
  Overdue: 'overdue',
  Validated: 'active',
  Closed: 'closed',
}

const VALIDATION_TONES: Record<string, StatusTone> = {
  'Pending Validation': 'draft',
  'Under Validation': 'reporting',
  Validated: 'active',
  'Validation Failed': 'overdue',
}

const today = (): string => new Date().toISOString().slice(0, 10)

export function RemediationPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-remediation')
  const canValidate = can(actor.actorRole, 'validate-remediation') && !isInstitutionRole(actor.actorRole)
  const canClose = can(actor.actorRole, 'close-remediation') && !isInstitutionRole(actor.actorRole)
  const canUpload = can(actor.actorRole, 'upload-evidence')

  const [actions, setActions] = useState<CorrectiveActionDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [findings, setFindings] = useState<FindingDetail[]>([])
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [search, setSearch] = useState('')
  const [fInstitution, setFInstitution] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fValidation, setFValidation] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Modals
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateDraft, setUpdateDraft] = useState({ text: '', progress: '' })
  const [milestoneOpen, setMilestoneOpen] = useState(false)
  const [milestoneDraft, setMilestoneDraft] = useState({ label: '', targetDate: today() })
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionDraft, setExtensionDraft] = useState({ newDueDate: today(), reason: '' })
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateDraft, setEscalateDraft] = useState({ level: 'Level 1 — supervisory team lead', note: '' })
  const [validateOpen, setValidateOpen] = useState<'pass' | 'fail' | null>(null)
  const [validateNote, setValidateNote] = useState('')
  const [closureOpen, setClosureOpen] = useState<'close' | 'reject' | null>(null)
  const [closureRationale, setClosureRationale] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachEvidenceId, setAttachEvidenceId] = useState('')

  const load = useCallback(async () => {
    const [list, instPage, findingList, evidenceList] = await Promise.all([
      remediationService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
      findingService.list({}),
      evidenceService.list({}),
    ])
    setActions(list)
    setInstitutions(instPage.items)
    setFindings(findingList)
    setEvidence(evidenceList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])
  const findingByRef = useMemo(() => new Map(findings.map((f) => [f.reference, f])), [findings])
  const evidenceById = useMemo(() => new Map(evidence.map((e) => [e.id, e])), [evidence])
  const active = useMemo(() => actions?.find((c) => c.id === activeId) ?? null, [actions, activeId])

  const rows = useMemo(() => {
    if (!actions) return []
    const s = search.trim().toLowerCase()
    return actions
      .filter((c) => !fInstitution || c.institutionId === fInstitution)
      .filter((c) => !fStatus || c.status === fStatus)
      .filter((c) => !fValidation || c.validationStatus === fValidation)
      .filter((c) => !overdueOnly || (c.status === 'Overdue' || (!c.closure && c.dueDate < today() && c.progressPct < 100)))
      .filter((c) => !s || `${c.reference} ${c.title} ${c.ownerName} ${c.findingRef ?? ''}`.toLowerCase().includes(s))
  }, [actions, search, fInstitution, fStatus, fValidation, overdueOnly])

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

  const handleExport = () => {
    if (!can(actor.actorRole, 'export')) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-remediation-demo.csv',
      ['CAP reference', 'Institution', 'Finding', 'Action', 'Owner', 'Target date', 'Progress %', 'Evidence items', 'Validation', 'Status'],
      rows.map((c) => [
        c.reference,
        instById.get(c.institutionId)?.tradingName ?? c.institutionId,
        c.findingRef ?? '—',
        c.title,
        c.ownerName,
        c.dueDate,
        c.progressPct,
        c.evidenceIds.length,
        c.validationStatus,
        c.status,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<CorrectiveActionDetail, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'CAP ref',
        cell: ({ row }) => <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>,
      },
      {
        id: 'institution',
        accessorFn: (c) => instById.get(c.institutionId)?.tradingName ?? '',
        header: 'Institution',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={(ev) => {
              ev.stopPropagation()
              navigate(`/app/institutions/${row.original.institutionId}`)
            }}
          >
            {instById.get(row.original.institutionId)?.tradingName ?? '—'}
          </button>
        ),
      },
      {
        id: 'finding',
        accessorFn: (c) => c.findingRef ?? '',
        header: 'Finding',
        cell: ({ row }) => {
          const f = row.original.findingRef ? findingByRef.get(row.original.findingRef) : undefined
          return f ? (
            <button
              type="button"
              className="cursor-pointer font-mono text-[10px] font-semibold text-primary hover:underline"
              onClick={(ev) => {
                ev.stopPropagation()
                navigate(`/app/findings/${f.id}`)
              }}
            >
              {f.reference}
            </button>
          ) : (
            <span className="text-[10px] text-ink-secondary">—</span>
          )
        },
      },
      {
        accessorKey: 'title',
        header: 'Corrective action',
        cell: ({ row }) => <span className="line-clamp-2 max-w-64 text-[13px] text-ink">{row.original.title}</span>,
      },
      {
        accessorKey: 'ownerName',
        header: 'Action owner',
        cell: ({ row }) => <span className="text-xs text-ink-secondary">{row.original.ownerName}</span>,
      },
      {
        accessorKey: 'dueDate',
        header: 'Target date',
        cell: ({ row }) => {
          const overdue = !row.original.closure && row.original.dueDate < today() && row.original.progressPct < 100
          return (
            <span className="flex items-center gap-1.5 text-xs">
              <span className={overdue ? 'font-semibold text-error' : 'text-ink-secondary'}>{formatDate(row.original.dueDate)}</span>
              {overdue && <StatusBadge status="Overdue" tone="overdue" />}
            </span>
          )
        },
      },
      {
        id: 'progress',
        accessorFn: (c) => c.progressPct,
        header: 'Progress',
        cell: ({ row }) => (
          <div className="w-24">
            <ProgressBar
              value={row.original.progressPct}
              showValue
              tone={row.original.progressPct >= 100 ? 'success' : row.original.status === 'Overdue' ? 'error' : 'primary'}
              label={`${row.original.reference} progress`}
            />
          </div>
        ),
      },
      {
        id: 'evidenceCount',
        accessorFn: (c) => c.evidenceIds.length,
        header: 'Evidence',
        cell: ({ row }) => <span className="text-xs text-ink">{row.original.evidenceIds.length} item(s)</span>,
      },
      {
        accessorKey: 'validationStatus',
        header: 'Validation',
        cell: ({ row }) => <StatusBadge status={row.original.validationStatus} tone={VALIDATION_TONES[row.original.validationStatus]} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
    ],
    [instById, findingByRef, navigate],
  )

  return (
    <div>
      <PageHeader
        title="Follow-Up & Remediation"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Corrective action plans, milestones, validation and closure across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
            Export register
          </Button>
        }
      />

      {actions === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<CorrectiveActionDetail>
          columns={columns}
          data={rows}
          title="Corrective action register"
          headerAction={<span className="text-xs text-ink-secondary">{rows.length} actions · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => setActiveId(row.id)}
          initialPageSize={10}
          emptyTitle="No corrective actions match"
          emptyDescription="Adjust the filters — the demo dataset covers CAP-2026-002/003/005/007/008."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TextInput
                aria-label="Search corrective actions"
                placeholder="Search CAP reference, action, owner or finding…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Filter by institution"
                value={fInstitution}
                onChange={(e) => setFInstitution(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by status"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                placeholder="All statuses"
                options={['Open', 'In Progress', 'Overdue', 'Validated', 'Closed'].map((s) => ({ value: s, label: s }))}
              />
              <Select
                aria-label="Filter by validation status"
                value={fValidation}
                onChange={(e) => setFValidation(e.target.value)}
                placeholder="All validation states"
                options={['Pending Validation', 'Under Validation', 'Validated', 'Validation Failed'].map((s) => ({ value: s, label: s }))}
              />
              <label className="flex cursor-pointer items-center gap-2 self-center text-xs text-ink-secondary">
                <input
                  type="checkbox"
                  className="accent-[var(--tld-primary)]"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                />
                Overdue only
              </label>
            </div>
          }
        />
      )}

      {/* Detail drawer */}
      <Drawer
        open={active !== null}
        onClose={() => setActiveId(null)}
        width="720px"
        title={
          active && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-primary">{active.reference}</span>
              <StatusBadge status={active.status} tone={STATUS_TONES[active.status]} />
              <StatusBadge status={active.validationStatus} tone={VALIDATION_TONES[active.validationStatus]} />
              {active.closure && <StatusBadge status={active.closure.decision} tone={active.closure.decision === 'Closed' ? 'closed' : 'overdue'} />}
            </span>
          )
        }
        footer={
          active && !active.closure && (
            <div className="flex flex-wrap justify-end gap-2">
              {canManage && (
                <>
                  <Button variant="outline" size="sm" iconLeft={<MessageSquarePlus className="h-3.5 w-3.5" />} onClick={() => setUpdateOpen(true)}>
                    Add update
                  </Button>
                  <Button variant="outline" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => setMilestoneOpen(true)}>
                    Add milestone
                  </Button>
                  {canUpload && (
                    <Button variant="outline" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => { setAttachEvidenceId(''); setAttachOpen(true) }}>
                      Attach evidence
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setExtensionOpen(true)}>
                    Request extension
                  </Button>
                  {active.validationStatus !== 'Under Validation' && (
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={<ShieldCheck className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => void runAction(`${active.reference} submitted for validation`, () => remediationService.submitForValidation(active.id, actor))}
                    >
                      Submit for validation
                    </Button>
                  )}
                </>
              )}
              {canValidate && active.validationStatus === 'Under Validation' && (
                <>
                  <Button variant="danger" size="sm" iconLeft={<X className="h-3.5 w-3.5" />} onClick={() => { setValidateNote(''); setValidateOpen('fail') }}>
                    Fail validation
                  </Button>
                  <Button variant="success" size="sm" iconLeft={<Check className="h-3.5 w-3.5" />} onClick={() => { setValidateNote(''); setValidateOpen('pass') }}>
                    Validate
                  </Button>
                </>
              )}
              {canValidate && !active.closure && (
                <Button variant="warning" size="sm" iconLeft={<Gavel className="h-3.5 w-3.5" />} onClick={() => { setEscalateDraft({ level: 'Level 1 — supervisory team lead', note: '' }); setEscalateOpen(true) }}>
                  Escalate
                </Button>
              )}
              {canClose && (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setClosureRationale(''); setClosureOpen('reject') }}>
                    Reject closure
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    iconLeft={<Lock className="h-3.5 w-3.5" />}
                    onClick={() => { setClosureRationale(''); setClosureOpen('close') }}
                    title={active.validationStatus === 'Validated' ? undefined : 'Validation has not passed yet — closure is still possible but will be recorded as a demo judgement.'}
                  >
                    Approve closure
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {active && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-sm font-semibold text-ink">{active.title}</p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {instById.get(active.institutionId)?.tradingName} · owner {active.ownerName} · target{' '}
                <span className={!active.closure && active.dueDate < today() && active.progressPct < 100 ? 'font-semibold text-error' : ''}>
                  {formatDate(active.dueDate)}
                </span>
              </p>
              {active.findingRef && (
                <button
                  type="button"
                  className="mt-1 cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
                  onClick={() => {
                    const f = findingByRef.get(active.findingRef!)
                    if (f) navigate(`/app/findings/${f.id}`)
                  }}
                >
                  {active.findingRef} → finding detail
                </button>
              )}
            </div>

            {/* Closure decision banner */}
            {active.closure && (
              <div className={`rounded-lg border px-3 py-2.5 ${active.closure.decision === 'Closed' ? 'border-green-200 bg-tint-green' : 'border-red-200 bg-tint-red'}`}>
                <p className={`text-xs font-semibold ${active.closure.decision === 'Closed' ? 'text-success' : 'text-error'}`}>
                  Closure {active.closure.decision === 'Closed' ? 'approved' : 'rejected'} by {active.closure.decidedByName} ({active.closure.decidedByRoleLabel}) · {formatRelativeTime(active.closure.at)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{active.closure.rationale}</p>
              </div>
            )}

            {/* Closure gating note for institution roles */}
            {isInstitutionRole(actor.actorRole) && !active.closure && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-tint-yellow px-3 py-2 text-[11px] leading-relaxed text-yellow">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Institution users can submit updates, milestones and evidence but can never close a supervisory
                finding or corrective action — closure is reserved for authorised regulator roles (Spec §7.8).
              </p>
            )}

            {/* Agreed action plan */}
            <div>
              <p className="overline">Agreed action plan</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{active.agreedPlan}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Milestones */}
              <div>
                <p className="overline">Milestones</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {active.milestones.map((m) => (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line px-2.5 py-1.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[var(--tld-primary)]"
                          checked={m.done}
                          disabled={!canManage || Boolean(active.closure)}
                          onChange={() => void runAction(`Milestone "${m.label}" ${m.done ? 'reopened' : 'completed'}`, () => remediationService.toggleMilestone(active.id, m.id, actor))}
                        />
                        <span>
                          <span className={`block text-[11px] ${m.done ? 'text-ink-secondary line-through' : 'font-medium text-ink'}`}>{m.label}</span>
                          <span className="block text-[9px] text-ink-secondary">
                            target {formatDate(m.targetDate)}
                            {m.done && m.doneAt ? ` · done ${formatDate(m.doneAt)}` : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <ProgressBar value={active.progressPct} showValue tone={active.progressPct >= 100 ? 'success' : active.status === 'Overdue' ? 'error' : 'primary'} label="Overall progress" />
                </div>
              </div>

              {/* Evidence */}
              <div>
                <p className="overline">Evidence submitted</p>
                {active.evidenceIds.length === 0 ? (
                  <p className="mt-1 text-xs text-ink-secondary">No evidence attached yet (demo).</p>
                ) : (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {active.evidenceIds.map((id) => {
                      const ev = evidenceById.get(id)
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className="w-full cursor-pointer rounded-lg border border-line px-2.5 py-1.5 text-left hover:border-primary-surface"
                            onClick={() => ev && navigate(`/app/evidence?highlight=${ev.id}`)}
                          >
                            <span className="font-mono text-[10px] font-semibold text-primary">{ev?.reference ?? id}</span>
                            <span className="ml-2 text-[11px] text-ink">{ev?.title ?? 'evidence item'}</span>
                            {ev && <span className="block text-[9px] text-ink-secondary">{ev.reviewStatus} · {formatRelativeTime(ev.uploadedAt)}</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Institution updates */}
            <div>
              <p className="overline">Institution updates</p>
              {active.institutionUpdates.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">No updates recorded (demo).</p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {active.institutionUpdates.slice().reverse().map((u) => (
                    <li key={u.id} className="rounded-lg bg-page px-2.5 py-1.5">
                      <p className="text-[11px] text-ink">{u.text}</p>
                      <p className="mt-0.5 text-[9px] text-ink-secondary">
                        {u.authorName} · {formatRelativeTime(u.at)}
                        {u.progressPct !== undefined ? ` · progress ${u.progressPct}%` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Extension requests */}
            <div>
              <p className="overline">Extension requests</p>
              {active.extensionRequests.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">None requested (demo).</p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {active.extensionRequests.map((x) => (
                    <li key={x.id} className="rounded-lg border border-line px-2.5 py-2">
                      <p className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-ink">New target {formatDate(x.newDueDate)}</span>
                        <StatusBadge status={x.status} tone={x.status === 'Approved' ? 'active' : x.status === 'Rejected' ? 'overdue' : 'planning'} />
                        <span className="text-[9px] text-ink-secondary">{x.requestedByName} · {formatRelativeTime(x.requestedAt)}</span>
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-ink-secondary">{x.reason}</p>
                      {x.status === 'Pending' && canValidate && (
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void runAction('Extension rejected', () => remediationService.decideExtension(active.id, x.id, false, 'Rejected in the prototype session (demo).', actor))}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void runAction('Extension approved — target date moved', () => remediationService.decideExtension(active.id, x.id, true, 'Approved in the prototype session (demo).', actor))}
                          >
                            Approve extension
                          </Button>
                        </div>
                      )}
                      {x.decidedByName && (
                        <p className="mt-1 text-[9px] text-ink-secondary">
                          Decided by {x.decidedByName} {x.decidedAt ? `· ${formatRelativeTime(x.decidedAt)}` : ''}
                          {x.decisionNote ? ` · ${x.decisionNote}` : ''}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Escalation history */}
            <div>
              <p className="overline">Escalation history</p>
              {active.escalations.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">No escalations (demo).</p>
              ) : (
                <ol className="relative mt-1.5 flex flex-col gap-3 border-l border-line pl-4">
                  {active.escalations.map((esc) => (
                    <li key={esc.id} className="relative">
                      <span aria-hidden="true" className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-card bg-error" />
                      <p className="text-[11px] font-semibold text-ink">{esc.level}</p>
                      <p className="text-[9px] text-ink-secondary">{esc.byName} · {formatRelativeTime(esc.at)}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ink-secondary">{esc.note}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Institution update modal */}
      <Modal open={updateOpen} onClose={() => setUpdateOpen(false)} title={`Add institution update — ${active?.reference ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Update"
            required
            rows={3}
            value={updateDraft.text}
            onChange={(e) => setUpdateDraft({ ...updateDraft, text: e.target.value })}
            placeholder="Progress report from the institution (demo)."
          />
          <TextInput
            label="Reported progress % (optional)"
            type="number"
            min={0}
            max={100}
            value={updateDraft.progress}
            onChange={(e) => setUpdateDraft({ ...updateDraft, progress: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={updateDraft.text.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const d = updateDraft
                setUpdateOpen(false)
                setUpdateDraft({ text: '', progress: '' })
                void runAction('Institution update recorded', () =>
                  remediationService.addUpdate(active!.id, d.text.trim(), d.progress === '' ? undefined : Number(d.progress), actor),
                )
              }}
            >
              Record update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add milestone modal */}
      <Modal open={milestoneOpen} onClose={() => setMilestoneOpen(false)} title={`Add milestone — ${active?.reference ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <TextInput
            label="Milestone"
            required
            value={milestoneDraft.label}
            onChange={(e) => setMilestoneDraft({ ...milestoneDraft, label: e.target.value })}
            placeholder="e.g. Vendor contract signed for monitoring upgrade"
          />
          <TextInput
            label="Target date"
            required
            type="date"
            value={milestoneDraft.targetDate}
            onChange={(e) => setMilestoneDraft({ ...milestoneDraft, targetDate: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMilestoneOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={milestoneDraft.label.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const d = milestoneDraft
                setMilestoneOpen(false)
                setMilestoneDraft({ label: '', targetDate: today() })
                void runAction('Milestone added', () => remediationService.addMilestone(active!.id, d.label.trim(), d.targetDate, actor))
              }}
            >
              Add milestone
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extension request modal */}
      <Modal open={extensionOpen} onClose={() => setExtensionOpen(false)} title={`Request extension — ${active?.reference ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <TextInput
            label="New target date"
            required
            type="date"
            value={extensionDraft.newDueDate}
            onChange={(e) => setExtensionDraft({ ...extensionDraft, newDueDate: e.target.value })}
          />
          <TextArea
            label="Reason"
            required
            rows={3}
            value={extensionDraft.reason}
            onChange={(e) => setExtensionDraft({ ...extensionDraft, reason: e.target.value })}
            placeholder="Why is more time needed? (demo — decided by a supervisor role)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setExtensionOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={extensionDraft.reason.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const d = extensionDraft
                setExtensionOpen(false)
                setExtensionDraft({ newDueDate: today(), reason: '' })
                void runAction('Extension requested', () => remediationService.requestExtension(active!.id, { newDueDate: d.newDueDate, reason: d.reason.trim() }, actor))
              }}
            >
              Request extension
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escalate modal */}
      <Modal open={escalateOpen} onClose={() => setEscalateOpen(false)} title={`Escalate ${active?.reference ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <Select
            label="Escalation level"
            value={escalateDraft.level}
            onChange={(e) => setEscalateDraft({ ...escalateDraft, level: e.target.value })}
            options={[
              'Level 1 — supervisory team lead',
              'Level 2 — enforcement referral',
              'Level 3 — enforcement',
            ].map((l) => ({ value: l, label: l }))}
          />
          <TextArea
            label="Escalation note"
            required
            rows={3}
            value={escalateDraft.note}
            onChange={(e) => setEscalateDraft({ ...escalateDraft, note: e.target.value })}
            placeholder="Recorded on the escalation history (demo)."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={escalateDraft.note.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const d = escalateDraft
                setEscalateOpen(false)
                void runAction(`${active!.reference} escalated`, () => remediationService.escalate(active!.id, d.level, d.note.trim(), actor))
              }}
            >
              Escalate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Validation modal */}
      <Modal
        open={validateOpen !== null}
        onClose={() => setValidateOpen(null)}
        title={validateOpen === 'pass' ? `Validate ${active?.reference ?? ''}` : `Fail validation — ${active?.reference ?? ''}`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <TextArea
            label="Supervisory validation note"
            required
            rows={3}
            value={validateNote}
            onChange={(e) => setValidateNote(e.target.value)}
            placeholder={validateOpen === 'pass' ? 'What evidence confirmed remediation? (demo)' : 'What is still outstanding? (demo)'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setValidateOpen(null)}>Cancel</Button>
            <Button
              variant={validateOpen === 'pass' ? 'success' : 'danger'}
              disabled={validateNote.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const ok = validateOpen === 'pass'
                const note = validateNote.trim()
                setValidateOpen(null)
                setValidateNote('')
                void runAction(ok ? 'Remediation validated' : 'Validation failed', () => remediationService.validate(active!.id, ok, note, actor))
              }}
            >
              {validateOpen === 'pass' ? 'Validate remediation' : 'Fail validation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attach evidence modal */}
      <Modal open={attachOpen} onClose={() => setAttachOpen(false)} title={`Attach evidence — ${active?.reference ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <Select
            label="Evidence item"
            value={attachEvidenceId}
            onChange={(e) => setAttachEvidenceId(e.target.value)}
            placeholder="Select an existing evidence item for this institution…"
            options={evidence
              .filter((ev) => ev.institutionId === active?.institutionId && !active?.evidenceIds.includes(ev.id))
              .map((ev) => ({ value: ev.id, label: `${ev.reference} — ${ev.title}` }))}
            help="Uploads happen in the Evidence Repository or the fieldwork workspace; this links an existing demo item."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAttachOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!attachEvidenceId || busy}
              loading={busy}
              onClick={() => {
                const id = attachEvidenceId
                setAttachOpen(false)
                void runAction('Evidence attached', () => remediationService.attachEvidence(active!.id, id, actor))
              }}
            >
              Attach
            </Button>
          </div>
        </div>
      </Modal>

      {/* Closure decision (regulator-only — Spec §7.8) */}
      <Modal
        open={closureOpen !== null}
        onClose={() => setClosureOpen(null)}
        title={closureOpen === 'close' ? `Approve closure of ${active?.reference ?? ''}?` : `Reject closure of ${active?.reference ?? ''}?`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-accent-dark">
            {closureOpen === 'close'
              ? 'Closure also closes the linked supervisory finding and completes related My Work items. Only authorised regulator roles can take this decision (Spec §7.8) — it is recorded with your demo role on the trail.'
              : 'Rejecting closure keeps the corrective action open and records the decision on the trail (demo).'}
          </p>
          {active && active.validationStatus !== 'Validated' && closureOpen === 'close' && (
            <p className="rounded-lg bg-tint-yellow px-3 py-2 text-[11px] text-yellow">
              Note: supervisory validation has not passed yet ({active.validationStatus}) — closure will be recorded
              as a supervisory judgement (demo).
            </p>
          )}
          <TextArea
            label="Closure rationale"
            rows={3}
            value={closureRationale}
            onChange={(e) => setClosureRationale(e.target.value)}
            placeholder={closureOpen === 'close' ? 'Evidence reviewed, milestones complete, finding remediated (demo).' : 'Outstanding items remain — describe what is missing (demo).'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setClosureOpen(null)}>Cancel</Button>
            <Button
              variant={closureOpen === 'close' ? 'success' : 'danger'}
              disabled={busy}
              loading={busy}
              onClick={() => {
                const closing = closureOpen === 'close'
                setClosureOpen(null)
                void runAction(closing ? `${active?.reference} closed` : `Closure rejected for ${active?.reference}`, () =>
                  remediationService.decideClosure(
                    active!.id,
                    closing,
                    closureRationale.trim() || (closing ? 'Remediation evidenced and validated (demo closure).' : 'Outstanding items remain (demo rejection).'),
                    actor,
                  ),
                )
                setClosureRationale('')
              }}
            >
              {closureOpen === 'close' ? 'Approve closure' : 'Reject closure'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
