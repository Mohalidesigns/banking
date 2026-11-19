import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  Download,
  Inbox,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { RelationChip } from '@/features/regulatory/RelationChip'
import { useActor } from '@/hooks/useActor'
import { DemoPermissionError } from '@/services/contracts/errors'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { correspondenceService } from '@/services/mock/MockRegulatoryService'
import { DEMO_ROLE_LABELS } from '@/types/auth'
import type { Institution } from '@/types/institution'
import type {
  CorrespondenceRelationCandidate,
  CorrespondenceRow,
  CorrespondenceType,
  RegulatoryCorrespondence,
} from '@/types/regulatory'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Regulatory Correspondence (Spec §10.3) — `/app/regulatory/correspondence`.
 * Official correspondence register (institution, reference, type, dates,
 * subject, related examination/finding/directive, authorised sender/
 * recipient, status, attachments) with the full compose → review → approve
 * → send-demo workflow. THE PROTOTYPE NEVER SENDS REAL COMMUNICATIONS
 * (Spec §10.3): dispatch is simulated, labelled, and recorded in the thread.
 * Directive/enforcement references are Phase-5 chips, never link targets.
 * Workflow gating (§19): `manage-correspondence` composes/reviews;
 * `approve-correspondence` approves and runs the simulated send.
 */

const DEMO_NOTE =
  'All correspondence is fictional demo content. Sending is simulated — the prototype never dispatches real communications (Spec §10.3).'

const CORRESPONDENCE_TYPES: CorrespondenceType[] = [
  'Information Request',
  'Supervisory Letter',
  'Examination Notice',
  'Enforcement Notice',
  'Directive Cover Letter',
  'Meeting Invitation',
  'Acknowledgement',
  'Institution Submission',
]

const STATUS_TONES: Record<RegulatoryCorrespondence['status'], StatusTone> = {
  Draft: 'draft',
  'In Review': 'fieldwork',
  'Changes Requested': 'overdue',
  Approved: 'planning',
  Sent: 'active',
  Received: 'planning',
  'Response Required': 'fieldwork',
  Closed: 'closed',
}

const CONFIDENTIALITY_TONES: Record<string, StatusTone> = {
  Public: 'active',
  Internal: 'planning',
  Restricted: 'overdue',
}

export function RegulatoryCorrespondencePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const correspondenceParam = searchParams.get('correspondence')
  const institutionParam = searchParams.get('institution')

  return correspondenceParam ? (
    <CorrespondenceDetailView
      referenceOrId={correspondenceParam}
      onBack={() => setSearchParams(institutionParam ? { institution: institutionParam } : {}, { replace: true })}
    />
  ) : (
    <RegisterView initialInstitution={institutionParam} />
  )
}

// ---------------------------------------------------------------------------
// Register (list)
// ---------------------------------------------------------------------------

function RegisterView({ initialInstitution }: { initialInstitution: string | null }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canCompose = can(actor.actorRole, 'manage-correspondence')

  const [rows, setRows] = useState<CorrespondenceRow[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [search, setSearch] = useState('')
  const [fInstitution, setFInstitution] = useState(initialInstitution ?? '')
  const [fType, setFType] = useState('')
  const [fDirection, setFDirection] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const [list, instPage] = await Promise.all([
      correspondenceService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setRows(list)
    setInstitutions(instPage.items)
    setBusy(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    const s = search.trim().toLowerCase()
    return rows
      .filter((c) => !fInstitution || c.institutionId === fInstitution)
      .filter((c) => !fType || c.type === fType)
      .filter((c) => !fDirection || c.direction === fDirection)
      .filter((c) => !fStatus || c.status === fStatus)
      .filter(
        (c) =>
          !s ||
          `${c.reference} ${c.subject} ${c.body} ${c.senderName} ${c.recipientName} ${c.institutionName}`
            .toLowerCase()
            .includes(s),
      )
  }, [rows, search, fInstitution, fType, fDirection, fStatus])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-correspondence-register-demo.csv',
      ['Reference', 'Institution', 'Type', 'Direction', 'Date', 'Subject', 'Sender', 'Recipient', 'Status', 'Related', 'Attachments'],
      filtered.map((c) => [
        c.reference, c.institutionName, c.type, c.direction, c.date, c.subject,
        `${c.senderName} (${c.senderRole})`, `${c.recipientName} (${c.recipientRole})`, c.status,
        c.relations.map((r) => r.targetRef).join('; '), String(c.attachments.length),
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const openDetail = (ref: string) => {
    const params = new URLSearchParams({ correspondence: ref })
    if (fInstitution) params.set('institution', fInstitution)
    navigate(`/app/regulatory/correspondence?${params.toString()}`)
  }

  const columns = useMemo<Array<ColumnDef<CorrespondenceRow, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
            onClick={() => openDetail(row.original.reference)}
          >
            {row.original.reference}
          </button>
        ),
      },
      {
        accessorKey: 'institutionName',
        header: 'Institution',
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="cursor-pointer text-[12px] font-medium text-primary hover:underline"
              onClick={() => navigate(`/app/institutions/${row.original.institutionId}`)}
            >
              {row.original.institutionName}
            </button>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.institutionCode}</p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <div>
            <p className="text-[11px] font-medium text-ink">{row.original.type}</p>
            <p className="inline-flex items-center gap-1 text-[10px] text-ink-secondary">
              {row.original.direction === 'Outgoing' ? <Send className="h-2.5 w-2.5" aria-hidden="true" /> : <Inbox className="h-2.5 w-2.5" aria-hidden="true" />}
              {row.original.direction}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="text-[11px]">
            <p className="text-ink">{formatDate(row.original.date)}</p>
            {row.original.responseDueDate && (
              <p className="text-[10px] text-ink-tertiary">reply by {formatDate(row.original.responseDueDate)}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => <p className="max-w-[320px] truncate text-[12px] text-ink">{row.original.subject}</p>,
      },
      {
        id: 'relations',
        header: 'Related',
        cell: ({ row }) => (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {row.original.relations.length === 0 ? (
              <span className="text-[10px] text-ink-tertiary">—</span>
            ) : (
              row.original.relations.slice(0, 3).map((r) => <RelationChip key={r.id} mapping={r} />)
            )}
            {row.original.relations.length > 3 && (
              <span className="text-[10px] text-ink-tertiary">+{row.original.relations.length - 3}</span>
            )}
          </div>
        ),
      },
      {
        id: 'parties',
        header: 'Sender → Recipient',
        cell: ({ row }) => (
          <div className="max-w-[220px] text-[10px] leading-relaxed">
            <p className="truncate text-ink">{row.original.senderName}</p>
            <p className="truncate text-ink-tertiary">{row.original.senderRole}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
      {
        id: 'attachments',
        header: 'Files',
        cell: ({ row }) =>
          row.original.attachments.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-secondary" title={`${row.original.attachments.length} simulated attachment(s)`}>
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {row.original.attachments.length}
            </span>
          ) : (
            <span className="text-[10px] text-ink-tertiary">—</span>
          ),
      },
    ],
    [navigate, fInstitution],
  )

  if (!rows) {
    return (
      <div>
        <PageHeader title="Regulatory Correspondence" subtitle="Official correspondence register — loading demo data…" />
        <LoadingSkeleton variant="cards" rows={6} />
      </div>
    )
  }

  const awaitingApproval = rows.filter((c) => c.status === 'In Review').length
  const responseRequired = rows.filter((c) => c.status === 'Response Required').length

  return (
    <div>
      <PageHeader
        title="Regulatory Correspondence"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Official correspondence register — {rows.length} demo items</span>
            {awaitingApproval > 0 && <StatusBadge status={`${awaitingApproval} awaiting approval`} tone="fieldwork" />}
            {responseRequired > 0 && <StatusBadge status={`${responseRequired} response required`} tone="fieldwork" />}
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" iconLeft={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void load()} loading={busy}>
              Refresh
            </Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export register
            </Button>
            <Button
              variant="primary"
              iconLeft={<Mail className="h-3.5 w-3.5" />}
              disabled={!canCompose}
              title={canCompose ? 'Compose a demo correspondence draft' : 'Requires the manage-correspondence demo action (Spec §19)'}
              onClick={() => setComposeOpen(true)}
            >
              Compose (demo)
            </Button>
          </>
        }
      />

      <DataTable<CorrespondenceRow>
        columns={columns}
        data={filtered}
        title="Correspondence register"
        getRowId={(c) => c.id}
        initialPageSize={10}
        onRowClick={(c) => openDetail(c.reference)}
        emptyTitle="No correspondence matches"
        emptyDescription="Adjust the filters or compose a new demo draft."
        onRetry={() => void load()}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <TextInput
              aria-label="Search correspondence"
              type="search"
              placeholder="Search reference, subject or body…"
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
              aria-label="Filter by type"
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              placeholder="All types"
              options={CORRESPONDENCE_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Select
              aria-label="Filter by direction"
              value={fDirection}
              onChange={(e) => setFDirection(e.target.value)}
              placeholder="Both directions"
              options={[
                { value: 'Outgoing', label: 'Outgoing' },
                { value: 'Incoming', label: 'Incoming' },
              ]}
            />
            <Select
              aria-label="Filter by status"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              placeholder="All statuses"
              options={['Draft', 'In Review', 'Changes Requested', 'Approved', 'Sent', 'Received', 'Response Required', 'Closed'].map((s) => ({ value: s, label: s }))}
            />
          </div>
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      <ComposeCorrespondenceModal
        open={composeOpen}
        institutions={institutions}
        initialInstitutionId={fInstitution}
        onClose={() => setComposeOpen(false)}
        onComposed={(ref) => {
          setComposeOpen(false)
          navigate(`/app/regulatory/correspondence?correspondence=${encodeURIComponent(ref)}`)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compose modal (Spec §10.3 compose step — draft only, never sent for real)
// ---------------------------------------------------------------------------

function ComposeCorrespondenceModal({
  open,
  institutions,
  initialInstitutionId,
  onClose,
  onComposed,
}: {
  open: boolean
  institutions: Institution[]
  initialInstitutionId: string
  onClose: () => void
  onComposed: (reference: string) => void
}) {
  const actor = useActor()
  const [institutionId, setInstitutionId] = useState(initialInstitutionId)
  const [type, setType] = useState<CorrespondenceType>('Supervisory Letter')
  const [direction, setDirection] = useState<'Outgoing' | 'Incoming'>('Outgoing')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [responseDueDate, setResponseDueDate] = useState('')
  const [candidates, setCandidates] = useState<CorrespondenceRelationCandidate[]>([])
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Array<{ fileName: string; sizeKb: number; confidentiality: 'Public' | 'Internal' | 'Restricted' }>>([])
  const [attachmentName, setAttachmentName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      const list = await correspondenceService.relationCandidates(institutionId || undefined)
      if (!cancelled) setCandidates(list)
    })()
    return () => {
      cancelled = true
    }
  }, [open, institutionId])

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!institutionId) next.institutionId = 'Select the institution.'
    if (!subject.trim()) next.subject = 'Subject is required.'
    if (!body.trim()) next.body = 'Letter body is required.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const created = await correspondenceService.compose(
        {
          institutionId,
          type,
          direction,
          subject,
          body,
          responseDueDate: responseDueDate || undefined,
          relationRefs: selectedRefs,
          attachments,
        },
        actor,
      )
      if (created) {
        toast.success('Saved in prototype session', `${created.reference} created as a draft — nothing is sent until the approve + send-demo steps.`)
        setSubject('')
        setBody('')
        setResponseDueDate('')
        setSelectedRefs([])
        setAttachments([])
        setErrors({})
        onComposed(created.reference)
      }
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The draft could not be composed in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compose correspondence (demo)"
      description="Creates a draft in the prototype session. The send step is simulated — the prototype never dispatches real communications (Spec §10.3)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Send className="h-3.5 w-3.5" />} loading={busy} onClick={() => void submit()}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Institution"
            required
            value={institutionId}
            error={errors.institutionId}
            onChange={(e) => {
              setInstitutionId(e.target.value)
              setSelectedRefs([])
            }}
            placeholder="Select institution"
            options={institutions.map((i) => ({ value: i.id, label: `${i.tradingName} (${i.code})` }))}
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as CorrespondenceType)}
            options={CORRESPONDENCE_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'Outgoing' | 'Incoming')}
            options={[
              { value: 'Outgoing', label: 'Outgoing (authority → institution)' },
              { value: 'Incoming', label: 'Incoming (institution → authority)' },
            ]}
          />
        </div>
        <TextInput label="Subject" required value={subject} error={errors.subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Request for liquidity buffer restoration plan" />
        <TextArea label="Letter body" required rows={6} value={body} error={errors.body} onChange={(e) => setBody(e.target.value)} placeholder="Full letter text (fictional demo content)…" />
        <TextInput
          label="Reply deadline (optional)"
          type="date"
          value={responseDueDate}
          onChange={(e) => setResponseDueDate(e.target.value)}
          help="Shown as “reply by” in the register."
        />

        <section>
          <h3 className="overline text-ink-tertiary">Related records (optional)</h3>
          {candidates.length === 0 ? (
            <p className="mt-1 text-[11px] text-ink-tertiary">Select an institution to list its story anchors.</p>
          ) : (
            <div className="mt-1.5 max-h-36 overflow-y-auto rounded-md border border-line p-2">
              {candidates.map((c) => (
                <label key={`${c.kind}-${c.ref}`} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] text-ink-secondary hover:bg-page">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-[var(--tld-color-primary)]"
                    checked={selectedRefs.includes(c.ref)}
                    onChange={(e) =>
                      setSelectedRefs((prev) => (e.target.checked ? [...prev, c.ref] : prev.filter((x) => x !== c.ref)))
                    }
                  />
                  <span className="font-mono text-[10px] font-semibold text-primary">{c.ref}</span>
                  <span className="truncate">{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="overline text-ink-tertiary">Attachments (simulated)</h3>
          <div className="mt-1.5 flex items-end gap-2">
            <TextInput
              aria-label="Attachment file name"
              className="flex-1"
              placeholder="e.g. annex-a-demo.pdf"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
            />
            <Button
              variant="outline"
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                const name = attachmentName.trim()
                if (!name) {
                  toast.warning('Attachment name required', 'Enter a file name to add a simulated attachment (demo).')
                  return
                }
                setAttachments((prev) => [...prev, { fileName: name, sizeKb: 128, confidentiality: 'Internal' }])
                setAttachmentName('')
              }}
            >
              Add
            </Button>
          </div>
          {attachments.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {attachments.map((a, i) => (
                <li key={`${a.fileName}-${i}`} className="flex items-center justify-between rounded-md bg-page px-2.5 py-1.5 text-[11px] text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3 text-ink-tertiary" aria-hidden="true" />
                    {a.fileName} <span className="text-ink-tertiary">({a.sizeKb} kB · {a.confidentiality} · simulated)</span>
                  </span>
                  <Button variant="ghost" aria-label={`Remove ${a.fileName}`} onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Trash className="h-3.5 w-3.5 text-error" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10px] italic text-ink-tertiary">No real file is stored — metadata only (Spec §17.4).</p>
        </section>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Detail (?correspondence=<ref>) — letter preview + workflow + thread
// ---------------------------------------------------------------------------

function CorrespondenceDetailView({ referenceOrId, onBack }: { referenceOrId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canManage = can(actor.actorRole, 'manage-correspondence')
  const canApprove = can(actor.actorRole, 'approve-correspondence')

  const [record, setRecord] = useState<RegulatoryCorrespondence | null | undefined>(undefined)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [busy, setBusy] = useState(false)

  // Edit draft
  const [editOpen, setEditOpen] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editError, setEditError] = useState('')

  // Note-driven actions (request changes / approve / log response)
  const [noteModal, setNoteModal] = useState<'changes' | 'approve' | 'response' | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteError, setNoteError] = useState('')

  // Send confirmation
  const [sendOpen, setSendOpen] = useState(false)

  const load = useCallback(async () => {
    const c = await correspondenceService.detail(referenceOrId)
    setRecord(c ?? null)
    if (c) {
      const inst = await institutionService.getById(c.institutionId).catch(() => undefined)
      setInstitution(inst ?? null)
    }
  }, [referenceOrId])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const run = async (fn: () => Promise<unknown>, successTitle: string, successBody: string, fallback: string) => {
    setBusy(true)
    let outcome: 'success' | 'unavailable' | 'error' = 'error'
    try {
      const updated = await fn()
      if (updated) {
        await load()
        outcome = 'success'
      } else {
        outcome = 'unavailable'
      }
    } catch (err) {
      guard(err, fallback)
    } finally {
      // Release busy BEFORE the toast so the next workflow button is enabled
      // in the same render the confirmation appears.
      setBusy(false)
    }
    if (outcome === 'success') toast.success(successTitle, successBody)
    else if (outcome === 'unavailable') {
      toast.warning('Demo action not available', 'This workflow step does not apply to the current status (demo state machine).')
    }
  }

  const submitForReview = () =>
    run(
      () => correspondenceService.submitForReview(record!.id, actor),
      'Submitted for review',
      'The approval tier has been notified (demo notification). Saved in the prototype session.',
      'The draft could not be submitted in the prototype.',
    )

  const saveEdit = async () => {
    if (!record) return
    if (!editSubject.trim() || !editBody.trim()) {
      setEditError('Subject and body are both required (demo form).')
      return
    }
    await run(
      () => correspondenceService.updateDraft(record.id, { subject: editSubject, body: editBody, responseDueDate: editDue }, actor),
      'Saved in prototype session',
      `${record.reference} draft updated.`,
      'The draft could not be updated in the prototype.',
    )
    setEditOpen(false)
  }

  const submitNote = async () => {
    if (!record || !noteModal) return
    if (!noteText.trim() && noteModal !== 'approve') {
      setNoteError('A note is required (demo form).')
      return
    }
    if (noteModal === 'changes') {
      await run(
        () => correspondenceService.requestChanges(record.id, noteText.trim(), actor),
        'Changes requested',
        `${record.reference} returned to the drafter with your note. Saved in the prototype session.`,
        'The review decision could not be recorded in the prototype.',
      )
    } else if (noteModal === 'approve') {
      await run(
        () => correspondenceService.approve(record.id, noteText.trim(), actor),
        'Approved (demo)',
        `${record.reference} approved and authorised by ${actor.actorName}. The send step remains simulated.`,
        'The approval could not be recorded in the prototype.',
      )
    } else {
      await run(
        () => correspondenceService.logResponse(record.id, noteText.trim(), actor),
        'Response logged',
        `${record.reference} assessed and closed. Saved in the prototype session.`,
        'The response could not be logged in the prototype.',
      )
    }
    setNoteModal(null)
    setNoteText('')
    setNoteError('')
  }

  const confirmSend = async () => {
    if (!record) return
    await run(
      () => correspondenceService.sendDemo(record.id, actor),
      'Demo action completed',
      `${record.reference} marked as sent. SIMULATED dispatch — no real communication left the prototype (Spec §10.3).`,
      'The simulated send could not be recorded in the prototype.',
    )
    setSendOpen(false)
  }

  const handleExport = () => {
    if (!record) return
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      `atheris-reg-correspondence-${record.reference.toLowerCase()}-demo.csv`,
      ['Field', 'Value'],
      [
        ['Reference', record.reference],
        ['Type', `${record.type} (${record.direction})`],
        ['Date', record.date],
        ['Subject', record.subject],
        ['Sender', `${record.senderName} — ${record.senderRole}`],
        ['Recipient', `${record.recipientName} — ${record.recipientRole}`],
        ['Authorised by', record.authorisedByName ?? '—'],
        ['Status', record.status],
        ['Body', record.body],
      ],
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  if (record === undefined) {
    return (
      <div>
        <PageHeader title="Correspondence" subtitle="Loading demo record…" breadcrumbs={[{ label: 'Regulatory Correspondence', path: '/app/regulatory/correspondence' }, { label: referenceOrId }]} />
        <LoadingSkeleton variant="text" rows={12} />
      </div>
    )
  }

  if (record === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Correspondence not found"
            description={`No demo correspondence matches “${referenceOrId}” — it may be from a previous prototype session.`}
            icon={<Mail className="h-7 w-7" />}
            action={{ label: 'Back to register', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const isOutgoing = record.direction === 'Outgoing'
  const editable = record.status === 'Draft' || record.status === 'Changes Requested'

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{record.subject}</span>
            <span className="font-mono text-sm text-ink-secondary">({record.reference})</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{record.type}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {isOutgoing ? <Send className="h-3 w-3" aria-hidden="true" /> : <Inbox className="h-3 w-3" aria-hidden="true" />}
              {record.direction}
            </span>
            <span>·</span>
            <span>{isOutgoing ? 'issued' : 'received'} {formatDate(record.date)}</span>
            <StatusBadge status={record.status} tone={STATUS_TONES[record.status]} />
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Regulatory Correspondence', path: '/app/regulatory/correspondence' }, { label: record.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>Register</Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export record</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Letter preview */}
        <Card className="xl:col-span-2">
          <CardHeader title="Letter preview" subtitle="Rendered from the demo record — fictional content" />
          <CardBody>
            <div className="rounded-lg border border-line bg-card p-6">
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div>
                  <p className="text-sm font-bold text-primary">Meridia Banking Authority</p>
                  <p className="overline text-ink-tertiary">Banking Supervision · Fictional demo authority</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] font-semibold text-ink">{record.reference}</p>
                  <p className="text-[10px] text-ink-secondary">{formatDate(record.date)}</p>
                </div>
              </div>
              <div className="mt-4 text-[11px] text-ink-secondary">
                <p className="font-semibold text-ink">
                  {isOutgoing ? 'To' : 'From'}: {isOutgoing ? record.recipientName : record.senderName}
                </p>
                <p>{isOutgoing ? record.recipientRole : record.senderRole}</p>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-ink">Re: {record.subject}</p>
              <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-ink-secondary">{record.body}</div>
              <div className="mt-6 border-t border-line pt-4 text-[11px]">
                <p className="font-semibold text-ink">{isOutgoing ? record.senderName : record.recipientName}</p>
                <p className="text-ink-secondary">{isOutgoing ? record.senderRole : record.recipientRole}</p>
                {record.authorisedByName && (
                  <p className="mt-1 text-ink-tertiary">
                    Authorised by {record.authorisedByName}
                    {record.authorisedAt ? ` · ${formatDate(record.authorisedAt)}` : ''} (demo approval)
                  </p>
                )}
              </div>
            </div>

            {record.attachments.length > 0 && (
              <div className="mt-4">
                <h3 className="overline text-ink-tertiary">Attachments ({record.attachments.length})</h3>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {record.attachments.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-page px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-[12px] text-ink">
                        <Paperclip className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden="true" />
                        {a.fileName}
                        <span className="text-[10px] text-ink-tertiary">{a.sizeKb} kB</span>
                        <StatusBadge status={a.confidentiality} tone={CONFIDENTIALITY_TONES[a.confidentiality]} />
                      </span>
                      <Button
                        variant="ghost"
                        iconLeft={<Download className="h-3.5 w-3.5" />}
                        onClick={() => toast.info('Demo action completed', `Simulated download of “${a.fileName}” — ${a.storageNote}`)}
                      >
                        Download (demo)
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sidebar: workflow, meta, relations, thread */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Workflow" subtitle={isOutgoing ? 'Compose → review → approve → send-demo' : 'Receive → assess → log response'} />
            <CardBody>
              <div className="flex flex-col gap-2">
                {isOutgoing ? (
                  <>
                    {editable && (
                      <>
                        <Button
                          variant="outline"
                          iconLeft={<Pencil className="h-3.5 w-3.5" />}
                          disabled={!canManage}
                          title={canManage ? 'Edit this draft (demo)' : 'Requires the manage-correspondence demo action (Spec §19)'}
                          onClick={() => {
                            setEditSubject(record.subject)
                            setEditBody(record.body)
                            setEditDue(record.responseDueDate ?? '')
                            setEditError('')
                            setEditOpen(true)
                          }}
                        >
                          Edit draft
                        </Button>
                        <Button
                          variant="primary"
                          iconLeft={<Send className="h-3.5 w-3.5" />}
                          disabled={!canManage || busy}
                          title={canManage ? 'Route to the approval tier (demo workflow)' : 'Requires the manage-correspondence demo action (Spec §19)'}
                          onClick={() => void submitForReview()}
                        >
                          Submit for review
                        </Button>
                      </>
                    )}
                    {record.status === 'In Review' && (
                      <>
                        <Button
                          variant="warning"
                          disabled={!canManage || busy}
                          title={canManage ? 'Return the letter to the drafter with a note' : 'Requires the manage-correspondence demo action (Spec §19)'}
                          onClick={() => {
                            setNoteModal('changes')
                            setNoteText('')
                            setNoteError('')
                          }}
                        >
                          Request changes
                        </Button>
                        <Button
                          variant="success"
                          disabled={!canApprove || busy}
                          title={canApprove ? 'Approve and authorise for simulated dispatch' : 'Requires the approve-correspondence demo action (Spec §19)'}
                          onClick={() => {
                            setNoteModal('approve')
                            setNoteText('')
                            setNoteError('')
                          }}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                    {record.status === 'Approved' && (
                      <Button
                        variant="primary"
                        iconLeft={<Send className="h-3.5 w-3.5" />}
                        disabled={!canApprove || busy}
                        title={canApprove ? 'Simulated dispatch — no real communication is sent' : 'Requires the approve-correspondence demo action (Spec §19)'}
                        onClick={() => setSendOpen(true)}
                      >
                        Send (demo)
                      </Button>
                    )}
                    {(record.status === 'Sent' || record.status === 'Closed') && (
                      <p className="rounded-md bg-page px-2.5 py-2 text-[11px] leading-relaxed text-ink-secondary">
                        {record.status === 'Sent'
                          ? 'Dispatched via simulated send — no real communication left the prototype (Spec §10.3).'
                          : 'Thread closed. The full workflow is recorded below.'}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {(record.status === 'Received' || record.status === 'Response Required') && (
                      <Button
                        variant="primary"
                        disabled={!canManage || busy}
                        title={canManage ? 'Assess the incoming letter and close the thread (demo)' : 'Requires the manage-correspondence demo action (Spec §19)'}
                        onClick={() => {
                          setNoteModal('response')
                          setNoteText('')
                          setNoteError('')
                        }}
                      >
                        Log response & close
                      </Button>
                    )}
                    {record.status === 'Closed' && (
                      <p className="rounded-md bg-page px-2.5 py-2 text-[11px] leading-relaxed text-ink-secondary">
                        Response assessed and thread closed in the prototype session.
                      </p>
                    )}
                  </>
                )}
                {!canManage && !canApprove && (
                  <p className="text-[10px] text-ink-tertiary">
                    Your demo role ({DEMO_ROLE_LABELS[actor.actorRole]}) can read correspondence but not run the workflow — switch role to act (Spec §19).
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Record details" />
            <CardBody>
              <dl className="flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Institution</dt>
                  <dd className="text-right">
                    {institution ? (
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-primary hover:underline"
                        onClick={() => navigate(`/app/institutions/${institution.id}`)}
                      >
                        {institution.tradingName}
                      </button>
                    ) : (
                      <span className="text-ink">Unknown institution (demo)</span>
                    )}
                    {institution && <p className="font-mono text-[10px] text-ink-tertiary">{institution.code}</p>}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Sender</dt>
                  <dd className="text-right text-ink">{record.senderName}<br /><span className="text-ink-tertiary">{record.senderRole}</span></dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Recipient</dt>
                  <dd className="text-right text-ink">{record.recipientName}<br /><span className="text-ink-tertiary">{record.recipientRole}</span></dd>
                </div>
                {record.responseDueDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-tertiary">Reply deadline</dt>
                    <dd className="text-ink">{formatDate(record.responseDueDate)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Authorised by</dt>
                  <dd className="text-ink">{record.authorisedByName ?? 'Pending approval (demo)'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Related records" subtitle="Directive/enforcement refs are Phase-5 labels, not links" />
            <CardBody>
              {record.relations.length === 0 ? (
                <p className="text-[11px] text-ink-tertiary">No related examinations, findings or returns on this thread (demo).</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {record.relations.map((r) => (
                    <span key={r.id} className="flex flex-wrap items-center gap-2 text-[11px] text-ink-secondary">
                      <RelationChip mapping={r} />
                      <span>{r.targetLabel}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Thread history" subtitle={`${record.thread.length} workflow event(s)`} />
            <CardBody>
              <ol className="flex flex-col gap-2.5">
                {record.thread.map((t) => (
                  <li key={t.id} className="border-l-2 border-accent pl-3">
                    <p className="text-[11px] font-semibold text-ink">{t.action}</p>
                    {t.note && <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{t.note}</p>}
                    <p className="mt-0.5 text-[10px] text-ink-tertiary">{formatDate(t.at)} · {t.byName}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Edit draft */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit draft — ${record.reference}`}
        description="Drafts and change-requested letters can be revised. Saved in the prototype session only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveEdit()}>Save draft</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextInput label="Subject" required value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          <TextArea label="Letter body" required rows={8} value={editBody} error={editError} onChange={(e) => setEditBody(e.target.value)} />
          <TextInput label="Reply deadline" type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
        </div>
      </Modal>

      {/* Note modal (request changes / approve / log response) */}
      <Modal
        open={noteModal !== null}
        onClose={() => setNoteModal(null)}
        title={
          noteModal === 'changes'
            ? `Request changes — ${record.reference}`
            : noteModal === 'approve'
              ? `Approve — ${record.reference}`
              : `Log response — ${record.reference}`
        }
        description={
          noteModal === 'changes'
            ? 'Returns the letter to the drafter with your note recorded in the thread.'
            : noteModal === 'approve'
              ? 'Records you as the authorised approver. Dispatch stays simulated — nothing real is sent.'
              : 'Records your assessment of the incoming letter and closes the thread.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteModal(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void submitNote()}>
              {noteModal === 'changes' ? 'Request changes' : noteModal === 'approve' ? 'Approve' : 'Log response & close'}
            </Button>
          </>
        }
      >
        <TextArea
          label={noteModal === 'approve' ? 'Approval note (optional)' : 'Note'}
          required={noteModal !== 'approve'}
          rows={3}
          value={noteText}
          error={noteError}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={
            noteModal === 'changes'
              ? 'What must the drafter change? (recorded in the thread)'
              : noteModal === 'approve'
                ? 'Approved for simulated dispatch…'
                : 'How was the incoming letter assessed? (recorded in the thread)'
          }
        />
      </Modal>

      {/* Send confirmation — prototype honesty front and centre */}
      <ConfirmDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onConfirm={() => void confirmSend()}
        title={`Send ${record.reference} (simulated)?`}
        message="This marks the letter as sent in the prototype session and records the dispatch in the thread. NO real communication is sent — the prototype never dispatches anything (Spec §10.3)."
        confirmLabel="Confirm simulated send"
        variant="primary"
        loading={busy}
      />
    </div>
  )
}
