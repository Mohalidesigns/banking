import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, RefreshCw } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/Progress'
import { assessmentTone } from '@/features/specialist/panels'
import { useActor } from '@/hooks/useActor'
import { can } from '@/config/roles'
import { specialistService } from '@/services/mock/MockSpecialistService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { toast } from '@/components/feedback/toastStore'
import type { SupervisoryDomain } from '@/types/regulatory'
import type {
  SpecialistAssessmentRow,
  SpecialistAssessmentType,
  SpecialistDomainSpec,
} from '@/types/specialist'
import { formatDate } from '@/utils/datetime'

/**
 * Pattern part 2 — the §9 assessment register: filterable DataTable over the
 * domain's assessments plus the role-gated create flow (checklist generated
 * from the selected submodules). Row click opens the assessment detail
 * (?assessment=REF) — no dead ends.
 */

const TYPES: SpecialistAssessmentType[] = [
  'Full Assessment',
  'Thematic Review',
  'Targeted Review',
  'Maturity Assessment',
]
const STATUSES = ['Planned', 'In Progress', 'In Review', 'Completed']

export function SpecialistRegisterView({
  domain,
  spec,
  initialInstitutionId = '',
}: {
  domain: SupervisoryDomain
  spec: SpecialistDomainSpec
  /** Deep-link prefilter, e.g. from the institution profile (§9 links). */
  initialInstitutionId?: string
}) {
  const navigate = useNavigate()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-specialist-assessments')

  const [rows, setRows] = useState<SpecialistAssessmentRow[] | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [institutionId, setInstitutionId] = useState(initialInstitutionId)
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const [page, list] = await Promise.all([
      specialistService.list({ domain }),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setRows(page)
    setInstitutions(list.items.map((i) => ({ id: i.id, name: i.tradingName, code: i.code })))
  }, [domain])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = (rows ?? []).filter((r) => {
    const q = search.trim().toLowerCase()
    return (
      (!q || `${r.reference} ${r.title} ${r.institutionName}`.toLowerCase().includes(q)) &&
      (!status || r.status === status) &&
      (!type || r.type === type) &&
      (!institutionId || r.institutionId === institutionId)
    )
  })

  const columns: Array<ColumnDef<SpecialistAssessmentRow, unknown>> = [
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary-surface">{row.original.reference}</span>
      ),
    },
    {
      accessorKey: 'institutionName',
      header: 'Institution',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.institutionName}
          <span className="ml-1 font-mono text-[10px] text-ink-secondary">{row.original.institutionCode}</span>
        </span>
      ),
    },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} tone={assessmentTone(row.original.status)} />,
    },
    { accessorKey: 'periodCovered', header: 'Period' },
    { accessorKey: 'leadName', header: 'Lead' },
    {
      id: 'progress',
      header: 'Checklist',
      cell: ({ row }) => {
        const p = row.original.checklistProgress
        const pct = p.total === 0 ? 0 : Math.round((p.completed / p.total) * 100)
        return (
          <div className="min-w-24">
            <ProgressBar value={pct} tone={pct === 100 ? 'success' : 'primary'} />
            <span className="text-[10px] text-ink-secondary">
              {p.completed}/{p.total} concluded
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'openFindingCount',
      header: 'Open findings',
      cell: ({ row }) =>
        row.original.openFindingCount > 0 ? (
          <span className="text-xs font-semibold text-error">{row.original.openFindingCount}</span>
        ) : (
          <span className="text-xs text-ink-secondary">0</span>
        ),
    },
    {
      accessorKey: 'targetDate',
      header: 'Target',
      cell: ({ row }) => formatDate(row.original.targetDate),
    },
    {
      accessorKey: 'lastActivityAt',
      header: 'Last activity',
      cell: ({ row }) => formatDate(row.original.lastActivityAt),
    },
  ]

  const openDetail = (row: SpecialistAssessmentRow) => {
    navigate(`${spec.route}?assessment=${encodeURIComponent(row.reference)}`)
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={filtered}
        state={rows === null ? 'loading' : filtered.length === 0 ? 'empty' : 'ready'}
        title={`${spec.label} assessment register`}
        headerAction={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void load()}
            >
              Refresh
            </Button>
            {canManage && (
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => setCreateOpen(true)}
              >
                New assessment
              </Button>
            )}
          </div>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              className="w-56"
              placeholder="Search reference, title, institution…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search assessments"
            />
            <Select
              className="w-40"
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              className="w-44"
              aria-label="Filter by type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[{ value: '', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t }))]}
            />
            <Select
              className="w-56"
              aria-label="Filter by institution"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              options={[
                { value: '', label: 'All institutions' },
                ...institutions.map((i) => ({ value: i.id, label: `${i.name} (${i.code})` })),
              ]}
            />
          </div>
        }
        onRowClick={openDetail}
        getRowId={(row) => row.id}
        initialPageSize={10}
        emptyTitle="No assessments match"
        emptyDescription="Adjust the filters, or create a demo assessment for this domain."
      />
      <CreateAssessmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        domain={domain}
        spec={spec}
        institutions={institutions}
        onCreated={(ref) => {
          setCreateOpen(false)
          navigate(`${spec.route}?assessment=${encodeURIComponent(ref)}`)
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Create assessment (gated: manage-specialist-assessments)
// ---------------------------------------------------------------------------

function CreateAssessmentModal({
  open,
  onClose,
  domain,
  spec,
  institutions,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  domain: SupervisoryDomain
  spec: SpecialistDomainSpec
  institutions: Array<{ id: string; name: string; code: string }>
  onCreated: (reference: string) => void
}) {
  const actor = useActor()
  const [institutionId, setInstitutionId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SpecialistAssessmentType>('Full Assessment')
  const [periodCovered, setPeriodCovered] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [examinationRef, setExaminationRef] = useState('')
  const [submodules, setSubmodules] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setInstitutionId('')
    setTitle('')
    setType('Full Assessment')
    setPeriodCovered('')
    setStartDate('')
    setTargetDate('')
    setScopeSummary('')
    setExaminationRef('')
    setSubmodules([])
    setErrors({})
  }

  const toggleSubmodule = (key: string) => {
    setSubmodules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!institutionId) next.institutionId = 'Select the institution under assessment.'
    if (!title.trim()) next.title = 'Give the assessment a title.'
    if (!periodCovered.trim()) next.periodCovered = 'State the review period (e.g. Q4 2026).'
    if (!startDate) next.startDate = 'Start date is required.'
    if (!targetDate) next.targetDate = 'Target date is required.'
    if (startDate && targetDate && targetDate < startDate)
      next.targetDate = 'Target date must be on or after the start date.'
    if (!scopeSummary.trim()) next.scopeSummary = 'Summarise the assessment scope.'
    if (submodules.length === 0) next.submodules = 'Select at least one submodule — the checklist is generated from them.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const created = await specialistService.create(
        {
          domain,
          institutionId,
          title: title.trim(),
          type,
          periodCovered: periodCovered.trim(),
          startDate,
          targetDate,
          scopeSummary: scopeSummary.trim(),
          submoduleKeys: submodules,
          examinationRef: examinationRef.trim() || undefined,
        },
        actor,
      )
      setBusy(false)
      if (!created) {
        toast.error('Demo action failed', 'The assessment could not be created in the demo session.')
        return
      }
      toast.success('Saved in prototype session', `${created.reference} created — demo data only.`)
      reset()
      onCreated(created.reference)
    } catch {
      setBusy(false)
      toast.error('Demo action failed', 'The assessment could not be created in the demo session.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New ${spec.label.toLowerCase()} assessment (demo)`}
      description="Creates a planned assessment in the prototype session and generates its checklist from the selected submodules. Nothing is sent anywhere."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            Create assessment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Institution"
            required
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            error={errors.institutionId}
            options={[
              { value: '', label: 'Select institution…' },
              ...institutions.map((i) => ({ value: i.id, label: `${i.name} (${i.code})` })),
            ]}
          />
          <Select
            label="Assessment type"
            required
            value={type}
            onChange={(e) => setType(e.target.value as SpecialistAssessmentType)}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
        <TextInput
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder={`e.g. ${spec.label} assessment — Meridian Commercial Bank`}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextInput
            label="Period covered"
            required
            value={periodCovered}
            onChange={(e) => setPeriodCovered(e.target.value)}
            error={errors.periodCovered}
            placeholder="e.g. FY 2026"
          />
          <TextInput
            label="Start date"
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.startDate}
          />
          <TextInput
            label="Target date"
            required
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            error={errors.targetDate}
          />
        </div>
        <TextArea
          label="Scope summary"
          required
          rows={3}
          value={scopeSummary}
          onChange={(e) => setScopeSummary(e.target.value)}
          error={errors.scopeSummary}
          placeholder="What the assessment covers and why it is being run (demo)."
        />
        <TextInput
          label="Related examination reference (optional)"
          help="Run the assessment alongside a §7 examination, e.g. EXM-2026-021."
          value={examinationRef}
          onChange={(e) => setExaminationRef(e.target.value)}
          placeholder="EXM-2026-…"
        />
        <fieldset>
          <legend className="text-sm font-semibold text-ink">
            Submodules <span className="text-error">*</span>
          </legend>
          <p className="mb-2 text-xs text-ink-secondary">
            The checklist is generated from the selected {spec.specRef} submodules.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {spec.submodules.map((s) => (
              <Checkbox
                key={s.key}
                label={s.label}
                checked={submodules.includes(s.key)}
                onChange={() => toggleSubmodule(s.key)}
              />
            ))}
          </div>
          {errors.submodules && <p className="mt-1 text-xs text-error">{errors.submodules}</p>}
        </fieldset>
      </div>
    </Modal>
  )
}
