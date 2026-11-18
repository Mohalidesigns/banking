import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, FilePlus2, Send } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import { findingService } from '@/services/mock/MockFindingService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { FindingDetail, RaiseFindingInput } from '@/types/finding'
import type { RiskRating } from '@/types/common'
import type { ExaminationDetail } from '@/types/examination'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Supervisory Findings register (Spec §7.7): all listed columns, five-Cs
 * raise-finding form, submit-for-review workflow and deep-link filters
 * (?view=open from the Command Centre, ?examinationId=&severity= from
 * examination detail). Role gating per §19: examiners raise/submit but
 * never approve. Demo data only.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  'Under Review': 'reporting',
  Confirmed: 'active',
  'Remediation In Progress': 'fieldwork',
  Closed: 'closed',
  Escalated: 'overdue',
}

const CATEGORIES: RaiseFindingInput['category'][] = [
  'Credit',
  'Liquidity',
  'Governance',
  'AML/CFT',
  'Cybersecurity',
  'Operations',
  'Consumer Protection',
  'Capital',
]

const today = (): string => new Date().toISOString().slice(0, 10)

export function FindingsRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const actor = useActor()
  const canRaise = can(actor.actorRole, 'raise-finding')

  const [findings, setFindings] = useState<FindingDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [exams, setExams] = useState<ExaminationDetail[]>([])
  const [search, setSearch] = useState('')
  const [fInstitution, setFInstitution] = useState(searchParams.get('institutionId') ?? '')
  const [fExamination, setFExamination] = useState(searchParams.get('examinationId') ?? '')
  const [fDomain, setFDomain] = useState('')
  const [fSeverity, setFSeverity] = useState(searchParams.get('severity') ?? '')
  const [fStatus, setFStatus] = useState('')
  const [fBreach, setFBreach] = useState('')
  const [viewOpen, setViewOpen] = useState(searchParams.get('view') === 'open')
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [draft, setDraft] = useState({
    institutionId: '',
    examinationId: '',
    title: '',
    category: 'AML/CFT' as RaiseFindingInput['category'],
    riskRating: 'High' as RiskRating,
    breachClassification: 'Deficiency' as RaiseFindingInput['breachClassification'],
    condition: '',
    criteria: '',
    cause: '',
    consequence: '',
    recommendation: '',
    severityRationale: '',
    regulatoryReference: '',
    institutionOwnerName: '',
    institutionOwnerRole: '',
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  })

  const load = useCallback(async () => {
    const [list, instPage, examList] = await Promise.all([
      findingService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
      examinationService.list({}),
    ])
    setFindings(list)
    setInstitutions(instPage.items)
    setExams(examList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const rows = useMemo(() => {
    if (!findings) return []
    const s = search.trim().toLowerCase()
    return findings
      .filter((f) => !fInstitution || f.institutionId === fInstitution)
      .filter((f) => !fExamination || f.examinationId === fExamination)
      .filter((f) => !fDomain || f.category === fDomain)
      .filter((f) => !fSeverity || f.riskRating === fSeverity)
      .filter((f) => !fStatus || f.status === fStatus)
      .filter((f) => !fBreach || f.breachClassification === fBreach)
      .filter((f) => !viewOpen || f.status !== 'Closed')
      .filter((f) => !s || `${f.reference} ${f.title} ${f.ownerName}`.toLowerCase().includes(s))
  }, [findings, search, fInstitution, fExamination, fDomain, fSeverity, fStatus, fBreach, viewOpen])

  const handleExport = () => {
    if (!can(actor.actorRole, 'export')) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-findings-demo.csv',
      ['Reference', 'Institution', 'Examination', 'Domain', 'Title', 'Severity', 'Breach classification', 'Owner', 'Due date', 'Status'],
      rows.map((f) => [
        f.reference,
        instById.get(f.institutionId)?.tradingName ?? f.institutionId,
        f.examinationRef ?? '—',
        f.category,
        f.title,
        f.riskRating,
        f.breachClassification,
        `${f.ownerName} (${f.institutionOwnerRole})`,
        f.dueDate,
        f.status,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const handleRaise = async () => {
    const d = draft
    if (!d.institutionId || !d.title.trim() || !d.condition.trim() || !d.criteria.trim() || !d.institutionOwnerName.trim()) {
      toast.error('Incomplete finding', 'Institution, title, condition, criteria and the responsible owner are required (five-Cs).')
      return
    }
    const exam = exams.find((x) => x.id === d.examinationId)
    setBusy(true)
    try {
      const created = await findingService.raise(
        {
          institutionId: d.institutionId,
          examinationId: d.examinationId || undefined,
          examinationRef: exam?.reference,
          title: d.title.trim(),
          category: d.category,
          riskRating: d.riskRating,
          fiveCs: {
            condition: d.condition.trim(),
            criteria: d.criteria.trim(),
            cause: d.cause.trim() || 'To be confirmed with the institution (demo placeholder).',
            consequence: d.consequence.trim() || 'Adverse impact on the supervised activity (demo placeholder).',
            recommendation: d.recommendation.trim() || 'Remediate and evidence the fix (demo placeholder).',
          },
          severityRationale: d.severityRationale.trim() || `Severity ${d.riskRating} per the demo severity matrix.`,
          breachClassification: d.breachClassification,
          regulatoryReference: d.regulatoryReference.trim() || 'Demo regulatory reference',
          institutionOwnerName: d.institutionOwnerName.trim(),
          institutionOwnerRole: d.institutionOwnerRole.trim() || 'Accountable executive (demo role)',
          crossDomainLinks: [],
          evidenceLinks: [],
          dueDate: d.dueDate,
        },
        actor,
      )
      setRaiseOpen(false)
      await load()
      toast.success('Finding raised (draft)', `${created.reference} — saved in prototype session. Submit it for review from the detail screen.`)
      navigate(`/app/findings/${created.id}`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The finding could not be raised in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitForReview = async (f: FindingDetail) => {
    setBusy(true)
    try {
      await findingService.submitForReview(f.id, actor)
      await load()
      toast.success('Demo action completed', `${f.reference} submitted for review — saved in prototype session.`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The finding could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<Array<ColumnDef<FindingDetail, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Finding ref',
        cell: ({ row }) => <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>,
      },
      {
        id: 'institution',
        accessorFn: (f) => instById.get(f.institutionId)?.tradingName ?? '',
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
        id: 'examination',
        accessorFn: (f) => f.examinationRef ?? '',
        header: 'Examination',
        cell: ({ row }) =>
          row.original.examinationRef ? (
            <button
              type="button"
              className="cursor-pointer font-mono text-[10px] font-semibold text-primary hover:underline"
              onClick={(ev) => {
                ev.stopPropagation()
                navigate(`/app/examinations/${row.original.examinationId}`)
              }}
            >
              {row.original.examinationRef}
            </button>
          ) : (
            <span className="text-[10px] text-ink-secondary">—</span>
          ),
      },
      { accessorKey: 'category', header: 'Domain' },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="line-clamp-2 max-w-64 text-[13px] text-ink">{row.original.title}</span>,
      },
      {
        accessorKey: 'riskRating',
        header: 'Severity',
        cell: ({ row }) => <RiskBadge rating={row.original.riskRating} />,
      },
      {
        accessorKey: 'breachClassification',
        header: 'Breach classification',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.breachClassification}
            tone={
              row.original.breachClassification === 'Breach'
                ? 'overdue'
                : row.original.breachClassification === 'Deficiency'
                  ? 'fieldwork'
                  : row.original.breachClassification === 'Observation'
                    ? 'planning'
                    : 'active'
            }
          />
        ),
      },
      {
        id: 'owner',
        accessorFn: (f) => f.ownerName,
        header: 'Institution owner',
        cell: ({ row }) => (
          <div>
            <p className="text-xs text-ink">{row.original.institutionOwnerName ?? row.original.ownerName}</p>
            <p className="text-[10px] text-ink-secondary">{row.original.institutionOwnerRole}</p>
          </div>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due date',
        cell: ({ row }) => {
          const overdue = row.original.status !== 'Closed' && row.original.dueDate < today()
          return (
            <span className="flex items-center gap-1.5 text-xs">
              <span className={overdue ? 'font-semibold text-error' : 'text-ink-secondary'}>
                {formatDate(row.original.dueDate)}
              </span>
              {overdue && <StatusBadge status="Overdue" tone="overdue" />}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
    ],
    [instById, navigate],
  )

  return (
    <div>
      <PageHeader
        title="Supervisory Findings"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Five-Cs findings register across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export register
            </Button>
            <Button
              variant="primary"
              iconLeft={<FilePlus2 className="h-4 w-4" />}
              disabled={!canRaise}
              title={canRaise ? undefined : 'Your demo role cannot raise findings (Spec §19)'}
              onClick={() => setRaiseOpen(true)}
            >
              Raise finding
            </Button>
          </>
        }
      />

      {findings === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<FindingDetail>
          columns={columns}
          data={rows}
          title="Findings register"
          headerAction={<span className="text-xs text-ink-secondary">{rows.length} findings · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/app/findings/${row.id}`)}
          initialPageSize={10}
          emptyTitle="No findings match"
          emptyDescription="Adjust the filters or raise a finding with the five-Cs form."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextInput
                aria-label="Search findings"
                placeholder="Search reference, title or owner…"
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
                aria-label="Filter by examination"
                value={fExamination}
                onChange={(e) => setFExamination(e.target.value)}
                placeholder="All examinations"
                options={exams.map((x) => ({ value: x.id, label: `${x.reference} — ${x.title}` }))}
              />
              <Select
                aria-label="Filter by domain"
                value={fDomain}
                onChange={(e) => setFDomain(e.target.value)}
                placeholder="All domains"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by severity"
                value={fSeverity}
                onChange={(e) => setFSeverity(e.target.value)}
                placeholder="All severities"
                options={['Critical', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))}
              />
              <Select
                aria-label="Filter by status"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                placeholder="All statuses"
                options={['Draft', 'Under Review', 'Confirmed', 'Remediation In Progress', 'Escalated', 'Closed'].map((s) => ({ value: s, label: s }))}
              />
              <Select
                aria-label="Filter by breach classification"
                value={fBreach}
                onChange={(e) => setFBreach(e.target.value)}
                placeholder="All classifications"
                options={['Breach', 'Deficiency', 'Observation', 'Good Practice'].map((s) => ({ value: s, label: s }))}
              />
              <label className="flex cursor-pointer items-center gap-2 self-center text-xs text-ink-secondary">
                <input
                  type="checkbox"
                  className="accent-[var(--tld-primary)]"
                  checked={viewOpen}
                  onChange={(e) => setViewOpen(e.target.checked)}
                />
                Open findings only
              </label>
            </div>
          }
          rowActions={(row) =>
            row.status === 'Draft' && canRaise ? (
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Send className="h-3.5 w-3.5" />}
                disabled={busy}
                onClick={() => void handleSubmitForReview(row)}
              >
                Submit for review
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Raise-finding modal — five-Cs form (Spec §7.7) */}
      <Modal open={raiseOpen} onClose={() => setRaiseOpen(false)} title="Raise supervisory finding (five-Cs)" size="xl">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Institution"
              required
              value={draft.institutionId}
              onChange={(e) => setDraft({ ...draft, institutionId: e.target.value })}
              placeholder="Select an institution…"
              options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
            />
            <Select
              label="Examination (optional)"
              value={draft.examinationId}
              onChange={(e) => setDraft({ ...draft, examinationId: e.target.value })}
              placeholder="Not examination-linked"
              options={exams
                .filter((x) => !draft.institutionId || x.institutionId === draft.institutionId)
                .map((x) => ({ value: x.id, label: `${x.reference} — ${x.title}` }))}
            />
          </div>
          <TextInput
            label="Finding title"
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Short headline, e.g. Sanctions screening list updates not applied"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Domain"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as RaiseFindingInput['category'] })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Severity"
              value={draft.riskRating}
              onChange={(e) => setDraft({ ...draft, riskRating: e.target.value as RiskRating })}
              options={['Critical', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))}
            />
            <Select
              label="Breach classification"
              value={draft.breachClassification}
              onChange={(e) => setDraft({ ...draft, breachClassification: e.target.value as RaiseFindingInput['breachClassification'] })}
              options={['Breach', 'Deficiency', 'Observation', 'Good Practice'].map((s) => ({ value: s, label: s }))}
            />
          </div>
          <TextArea label="Condition — what was found" required rows={2} value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} />
          <TextArea label="Criteria — requirement breached (demo reference)" required rows={2} value={draft.criteria} onChange={(e) => setDraft({ ...draft, criteria: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextArea label="Cause" rows={2} value={draft.cause} onChange={(e) => setDraft({ ...draft, cause: e.target.value })} />
            <TextArea label="Consequence / risk" rows={2} value={draft.consequence} onChange={(e) => setDraft({ ...draft, consequence: e.target.value })} />
          </div>
          <TextArea label="Recommendation / required corrective measure" rows={2} value={draft.recommendation} onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextArea label="Severity rationale" rows={2} value={draft.severityRationale} onChange={(e) => setDraft({ ...draft, severityRationale: e.target.value })} />
            <TextInput
              label="Regulatory reference (demo)"
              value={draft.regulatoryReference}
              onChange={(e) => setDraft({ ...draft, regulatoryReference: e.target.value })}
              placeholder="e.g. MBA/AML/2023 §6.3"
            />
            <TextInput
              label="Responsible institution owner"
              required
              value={draft.institutionOwnerName}
              onChange={(e) => setDraft({ ...draft, institutionOwnerName: e.target.value })}
              placeholder="e.g. Grace Mbeki"
            />
            <TextInput
              label="Owner role"
              value={draft.institutionOwnerRole}
              onChange={(e) => setDraft({ ...draft, institutionOwnerRole: e.target.value })}
              placeholder="e.g. Chief Compliance Officer"
            />
            <TextInput
              label="Remediation due date"
              required
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </div>
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            The finding is created as a Draft with you as the raiser and appears in the register immediately
            (prototype session). Evidence links can be attached from the finding detail. Approval is reserved for
            Team Lead and above (Spec §19).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRaiseOpen(false)}>Cancel</Button>
            <Button variant="danger" iconLeft={<FilePlus2 className="h-4 w-4" />} loading={busy} onClick={() => void handleRaise()}>
              Raise finding
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
