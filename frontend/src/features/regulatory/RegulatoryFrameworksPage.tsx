import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  Library,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { can } from '@/config/roles'
import { RelationChip } from '@/features/regulatory/RelationChip'
import { useActor } from '@/hooks/useActor'
import { DemoPermissionError } from '@/services/contracts/errors'
import { frameworkService } from '@/services/mock/MockRegulatoryService'
import { INSTITUTION_CATEGORIES } from '@/types/institution'
import type {
  FrameworkCategory,
  FrameworkDetail,
  FrameworkQuery,
  RegulatoryFramework,
  RegulatoryRequirement,
  SupervisoryDomain,
} from '@/types/regulatory'
import { SUPERVISORY_DOMAIN_LABELS } from '@/types/regulatory'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Regulatory Frameworks (Spec §10.1) — `/app/regulatory/frameworks`.
 * Framework library (name, jurisdiction, issuing authority, category,
 * version, publication/effective date, status, source document) with the
 * six detail tabs (Overview · Requirements · Applicability · Mappings ·
 * Documents · Version history). Requirement detail carries every §10.1
 * field; framework upload and AI extraction are SIMULATED and extracted
 * drafts are always visually separated from approved regulatory content
 * ("Demo AI response" labelling). Frameworks/requirements are referenceable
 * by the Phase-4B/4C specialist domains via `SupervisoryDomain`.
 */

const DEMO_NOTE =
  'All frameworks, requirements and citations are fictional demo content for the Meridia Banking Authority prototype — not real regulatory instruments.'

const FRAMEWORK_TONES: Record<RegulatoryFramework['status'], StatusTone> = {
  Active: 'active',
  'Under Consultation': 'planning',
  Draft: 'draft',
  Superseded: 'closed',
}

const REQUIREMENT_TONES: Record<RegulatoryRequirement['status'], StatusTone> = {
  Approved: 'active',
  'Under Review': 'fieldwork',
  'AI-Extracted Draft': 'draft',
  Rejected: 'overdue',
  Superseded: 'closed',
}

const CATEGORY_OPTIONS = [
  'Prudential',
  'AML/CFT',
  'Governance',
  'Cybersecurity',
  'Consumer Protection',
  'Payments',
  'Non-Interest Banking',
]

const DOMAIN_OPTIONS: SupervisoryDomain[] = [
  'prudential',
  'governance',
  'erm',
  'cybersecurity',
  'aml',
  'operations',
  'consumer-protection',
]

export function RegulatoryFrameworksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const frameworkParam = searchParams.get('framework')

  return frameworkParam ? (
    <FrameworkDetailView
      codeOrId={frameworkParam}
      requirementParam={searchParams.get('requirement')}
      onBack={() => setSearchParams({}, { replace: true })}
    />
  ) : (
    <LibraryView />
  )
}

// ---------------------------------------------------------------------------
// Framework library (list)
// ---------------------------------------------------------------------------

function LibraryView() {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canManage = can(actor.actorRole, 'manage-frameworks')

  const [frameworks, setFrameworks] = useState<RegulatoryFramework[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [fCategory, setFCategory] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fDomain, setFDomain] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const query: FrameworkQuery = {}
    const list = await frameworkService.list(query)
    setFrameworks(list)
    setBusy(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Requirement counts per framework (AI drafts surfaced in the register).
  useEffect(() => {
    let cancelled = false
    if (!frameworks) return
    void (async () => {
      const next: Record<string, number> = {}
      for (const f of frameworks) {
        const reqs = await frameworkService.listRequirements(f.id)
        next[f.id] = reqs.filter((r) => r.status === 'AI-Extracted Draft').length
      }
      if (!cancelled) setCounts(next)
    })()
    return () => {
      cancelled = true
    }
  }, [frameworks])

  const rows = useMemo(() => {
    if (!frameworks) return []
    const s = search.trim().toLowerCase()
    return frameworks
      .filter((f) => !fCategory || f.category === fCategory)
      .filter((f) => !fStatus || f.status === fStatus)
      .filter((f) => !fDomain || f.domains.includes(fDomain as SupervisoryDomain))
      .filter((f) => !s || `${f.code} ${f.name} ${f.issuingAuthority} ${f.description}`.toLowerCase().includes(s))
  }, [frameworks, fCategory, fStatus, fDomain, search])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-framework-library-demo.csv',
      ['Code', 'Name', 'Category', 'Jurisdiction', 'Issuing authority', 'Version', 'Published', 'Effective', 'Status'],
      rows.map((f) => [f.code, f.name, f.category, f.jurisdictionName, f.issuingAuthority, f.version, f.publishedDate, f.effectiveDate, f.status]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const openDetail = (code: string) => navigate(`/app/regulatory/frameworks?framework=${encodeURIComponent(code)}`)

  const columns = useMemo<Array<ColumnDef<RegulatoryFramework, unknown>>>(
    () => [
      {
        accessorKey: 'code',
        header: 'Citation',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
            onClick={() => openDetail(row.original.code)}
          >
            {row.original.code}
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Framework',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.name}</p>
            <p className="max-w-[340px] text-[10px] leading-relaxed text-ink-secondary">{row.original.issuingAuthority}</p>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <span className="rounded-full bg-tint-blue px-2 py-0.5 text-[10px] font-semibold text-primary">{row.original.category}</span>,
      },
      {
        accessorKey: 'jurisdictionName',
        header: 'Jurisdiction',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[10px] font-semibold text-ink">{row.original.jurisdictionCode}</p>
            <p className="max-w-[180px] text-[10px] text-ink-secondary">{row.original.jurisdictionName}</p>
          </div>
        ),
      },
      { accessorKey: 'version', header: 'Version', cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.version}</span> },
      {
        accessorKey: 'effectiveDate',
        header: 'Published / effective',
        cell: ({ row }) => (
          <div className="text-[11px]">
            <p className="text-ink">{formatDate(row.original.effectiveDate)}</p>
            <p className="text-ink-tertiary">pub. {formatDate(row.original.publishedDate)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={row.original.status} tone={FRAMEWORK_TONES[row.original.status]} />
            {counts[row.original.id] > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tint-purple px-1.5 py-0.5 text-[9px] font-semibold text-purple">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                {counts[row.original.id]} AI draft{counts[row.original.id] === 1 ? '' : 's'}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'sourceDocuments',
        header: 'Source docs',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-secondary">
            <FileText className="h-3 w-3" aria-hidden="true" />
            {row.original.sourceDocuments.length}
          </span>
        ),
      },
    ],
    [counts],
  )

  if (!frameworks) {
    return (
      <div>
        <PageHeader title="Regulatory Frameworks" subtitle="Framework library — loading demo data…" />
        <LoadingSkeleton variant="cards" rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Regulatory Frameworks"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Framework library — {frameworks.length} demo instruments</span>
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
              Export library
            </Button>
            <Button
              variant="primary"
              iconLeft={<Upload className="h-3.5 w-3.5" />}
              disabled={!canManage}
              title={canManage ? 'Simulated framework upload with Demo AI extraction (Spec §10.1)' : 'Requires the manage-frameworks demo action (Spec §19)'}
              onClick={() => setUploadOpen(true)}
            >
              Upload framework (demo)
            </Button>
          </>
        }
      />

      <DataTable<RegulatoryFramework>
        columns={columns}
        data={rows}
        title="Framework library"
        getRowId={(f) => f.id}
        initialPageSize={10}
        onRowClick={(f) => openDetail(f.code)}
        emptyTitle="No frameworks match"
        emptyDescription="Adjust the filters — the demo library always ships the core MBA instruments."
        onRetry={() => void load()}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <TextInput
              aria-label="Search frameworks"
              type="search"
              placeholder="Search citation, name or authority…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              aria-label="Filter by category"
              value={fCategory}
              onChange={(e) => setFCategory(e.target.value)}
              placeholder="All categories"
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
            <Select
              aria-label="Filter by status"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              placeholder="All statuses"
              options={['Active', 'Under Consultation', 'Draft', 'Superseded'].map((s) => ({ value: s, label: s }))}
            />
            <Select
              aria-label="Filter by supervisory domain"
              value={fDomain}
              onChange={(e) => setFDomain(e.target.value)}
              placeholder="All domains"
              options={DOMAIN_OPTIONS.map((d) => ({ value: d, label: SUPERVISORY_DOMAIN_LABELS[d] }))}
            />
          </div>
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      <UploadFrameworkModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(code) => {
          setUploadOpen(false)
          openDetail(code)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Simulated upload + AI extraction (Spec §10.1)
// ---------------------------------------------------------------------------

function UploadFrameworkModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  onUploaded: (code: string) => void
}) {
  const actor = useActor()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('Prudential')
  const [issuingAuthority, setIssuingAuthority] = useState('Meridia Banking Authority — Banking Supervision Department')
  const [version, setVersion] = useState('0.1 (draft)')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [description, setDescription] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [applicableCategory, setApplicableCategory] = useState('Commercial Bank')
  const [runAi, setRunAi] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName('')
    setCode('')
    setCategory('Prudential')
    setIssuingAuthority('Meridia Banking Authority — Banking Supervision Department')
    setVersion('0.1 (draft)')
    setEffectiveDate('')
    setDescription('')
    setDocumentName('')
    setApplicableCategory('Commercial Bank')
    setRunAi(true)
    setErrors({})
  }

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Framework name is required.'
    if (!code.trim()) next.code = 'Citation code is required (e.g. MBA/NEW/2026).'
    if (!issuingAuthority.trim()) next.issuingAuthority = 'Issuing authority is required.'
    if (!version.trim()) next.version = 'Version is required.'
    if (!effectiveDate) next.effectiveDate = 'Effective date is required.'
    if (!description.trim()) next.description = 'A short description is required.'
    if (!documentName.trim()) next.documentName = 'Source document name is required (simulated upload).'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const created = await frameworkService.upload(
        {
          name,
          code,
          category: category as FrameworkCategory,
          issuingAuthority,
          version,
          effectiveDate,
          description,
          applicableCategories: [applicableCategory],
          documentName,
          runAiExtraction: runAi,
        },
        actor,
      )
      if (!created) {
        setErrors({ code: 'A framework with this citation code already exists in the demo library.' })
        return
      }
      toast.success(
        'Saved in prototype session',
        runAi
          ? `${created.code} uploaded (simulated). Demo AI extraction produced draft requirements — clearly labelled and NOT approved regulatory content.`
          : `${created.code} uploaded (simulated). No extraction run.`,
      )
      reset()
      onUploaded(created.code)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The framework could not be uploaded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload framework (simulated)"
      description="Spec §10.1 — upload and AI extraction are simulated in the prototype. No real file is stored; extracted requirements are labelled Demo AI response and stay separate from approved content."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Sparkles className="h-3.5 w-3.5" />} loading={busy} onClick={() => void submit()}>
            Upload {runAi ? '& run Demo AI extraction' : ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextInput label="Framework name" required value={name} error={errors.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment Services Prudential Regulation" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Citation code" required value={code} error={errors.code} onChange={(e) => setCode(e.target.value)} placeholder="MBA/NEW/2026" />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <TextInput label="Issuing authority" required value={issuingAuthority} error={errors.issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Version" required value={version} error={errors.version} onChange={(e) => setVersion(e.target.value)} />
          <TextInput label="Effective date" required type="date" value={effectiveDate} error={errors.effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </div>
        <Select
          label="Primary applicable licence category"
          value={applicableCategory}
          onChange={(e) => setApplicableCategory(e.target.value)}
          options={INSTITUTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <TextArea label="Description" required rows={3} value={description} error={errors.description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope and purpose of the instrument (demo)." />
        <TextInput label="Source document name (simulated)" required value={documentName} error={errors.documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="e.g. MBA-NEW-Consultation-Draft.pdf" />
        <Checkbox
          label="Run Demo AI extraction"
          help="Simulated extraction — produces draft requirements labelled “Demo AI response”, pending analyst approval."
          checked={runAi}
          onChange={(e) => setRunAi(e.target.checked)}
        />
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Framework detail (?framework=<code>)
// ---------------------------------------------------------------------------

function FrameworkDetailView({
  codeOrId,
  requirementParam,
  onBack,
}: {
  codeOrId: string
  requirementParam: string | null
  onBack: () => void
}) {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canManage = can(actor.actorRole, 'manage-frameworks')

  const [detail, setDetail] = useState<FrameworkDetail | null | undefined>(undefined)
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  // Requirement drawer
  const [selectedReq, setSelectedReq] = useState<RegulatoryRequirement | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [fReqStatus, setFReqStatus] = useState('')

  // Publish-version modal
  const [versionOpen, setVersionOpen] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [versionError, setVersionError] = useState('')

  const load = useCallback(async () => {
    const d = await frameworkService.detail(codeOrId)
    setDetail(d ?? null)
    return d
  }, [codeOrId])

  useEffect(() => {
    void load()
  }, [load])

  // Deep-link a requirement (?framework=CODE&requirement=ID) once per view.
  const [deepLinkResolved, setDeepLinkResolved] = useState(false)
  useEffect(() => {
    if (!detail || !requirementParam || deepLinkResolved) return
    const req = detail.requirements.find((r) => r.id === requirementParam || r.reference === requirementParam)
    if (req) {
      setSelectedReq(req)
      setTab('requirements')
    }
    setDeepLinkResolved(true)
  }, [detail, requirementParam, deepLinkResolved])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const decideRequirement = async (decision: 'approve' | 'reject') => {
    if (!selectedReq) return
    setBusy(true)
    try {
      const updated =
        decision === 'approve'
          ? await frameworkService.approveRequirement(selectedReq.id, reviewNote.trim(), actor)
          : await frameworkService.rejectRequirement(selectedReq.id, reviewNote.trim(), actor)
      if (updated) {
        setSelectedReq(updated)
        setReviewNote('')
        await load()
        toast.success(
          'Saved in prototype session',
          decision === 'approve'
            ? `${updated.reference} approved as regulatory content (demo workflow).`
            : `${updated.reference} rejected — remains labelled as non-regulatory demo extraction.`,
        )
      }
    } catch (err) {
      guard(err, 'The requirement decision could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const publishVersion = async () => {
    if (!detail) return
    if (!newVersion.trim() || !changeSummary.trim()) {
      setVersionError('Version and change summary are both required (demo form).')
      return
    }
    setBusy(true)
    try {
      await frameworkService.publishVersion(detail.framework.id, newVersion, changeSummary, actor)
      setVersionOpen(false)
      setNewVersion('')
      setChangeSummary('')
      setVersionError('')
      await load()
      toast.success('Saved in prototype session', `Version published to the demo version history.`)
    } catch (err) {
      guard(err, 'The version could not be published in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const handleExport = () => {
    if (!detail) return
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      `atheris-reg-framework-${detail.framework.code.replace(/\W+/g, '-').toLowerCase()}-requirements-demo.csv`,
      ['Reference', 'Title', 'Status', 'Domain', 'Legal source', 'Effective from', 'Obligations'],
      detail.requirements.map((r) => [
        r.reference, r.title, r.status, SUPERVISORY_DOMAIN_LABELS[r.domain], r.legalSource, r.effectiveFrom,
        r.relatedObligationRefs.join('; '),
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  if (detail === undefined) {
    return (
      <div>
        <PageHeader title="Regulatory Framework" subtitle="Loading demo framework…" breadcrumbs={[{ label: 'Regulatory Frameworks', path: '/app/regulatory/frameworks' }, { label: codeOrId }]} />
        <LoadingSkeleton variant="text" rows={12} />
      </div>
    )
  }

  if (detail === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Framework not found"
            description={`No demo framework matches “${codeOrId}” — it may be from a previous prototype session.`}
            icon={<Library className="h-7 w-7" />}
            action={{ label: 'Back to framework library', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const fw = detail.framework
  const approvedCount = detail.requirements.filter((r) => r.status === 'Approved').length
  const aiDraftCount = detail.requirements.filter((r) => r.status === 'AI-Extracted Draft').length

  const reqRows = detail.requirements.filter((r) => !fReqStatus || r.status === fReqStatus)

  const requirementColumns: Array<ColumnDef<RegulatoryRequirement, unknown>> = [
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
          onClick={() => {
            setSelectedReq(row.original)
            setReviewNote('')
          }}
        >
          {row.original.reference}
        </button>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Requirement',
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-ink">{row.original.title}</p>
          <p className="max-w-[420px] truncate text-[10px] leading-relaxed text-ink-secondary">{row.original.text}</p>
        </div>
      ),
    },
    {
      accessorKey: 'domain',
      header: 'Supervisory domain',
      cell: ({ row }) => <span className="text-[11px] text-ink-secondary">{SUPERVISORY_DOMAIN_LABELS[row.original.domain]}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1">
          {row.original.status === 'AI-Extracted Draft' && <Sparkles className="h-3 w-3 text-purple" aria-hidden="true" />}
          <StatusBadge status={row.original.status} tone={REQUIREMENT_TONES[row.original.status]} />
        </span>
      ),
    },
    {
      id: 'obligations',
      header: 'Related obligations',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.relatedObligationRefs.length === 0 ? (
            <span className="text-[10px] text-ink-tertiary">—</span>
          ) : (
            row.original.relatedObligationRefs.map((ref) => (
              <RelationChip
                key={ref}
                mapping={{ id: ref, kind: 'obligation', targetRef: ref, targetLabel: ref, link: `/app/regulatory/obligations?obligation=${encodeURIComponent(ref)}` }}
              />
            ))
          )}
        </div>
      ),
    },
  ]

  const mappingColumns: Array<ColumnDef<FrameworkDetail['framework']['mappings'][number], unknown>> = [
    {
      accessorKey: 'kind',
      header: 'Mapping type',
      cell: ({ row }) => <span className="text-[11px] font-medium text-ink">{row.original.kind.replace(/-/g, ' ')}</span>,
    },
    {
      id: 'target',
      header: 'Target',
      cell: ({ row }) => <RelationChip mapping={row.original} />,
    },
    {
      accessorKey: 'targetLabel',
      header: 'Description',
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] text-ink">{row.original.targetLabel}</p>
          {row.original.note && <p className="text-[10px] text-ink-tertiary">{row.original.note}</p>}
        </div>
      ),
    },
  ]

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BookOpen className="h-3.5 w-3.5" />,
      content: (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Framework overview" subtitle={`${fw.code} · ${fw.category}`} />
            <CardBody>
              <p className="text-xs leading-relaxed text-ink-secondary">{fw.description}</p>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2">
                <div>
                  <dt className="overline text-ink-tertiary">Jurisdiction</dt>
                  <dd className="mt-0.5 text-ink">{fw.jurisdictionName} ({fw.jurisdictionCode})</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Issuing authority</dt>
                  <dd className="mt-0.5 text-ink">{fw.issuingAuthority}</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Version / status</dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-ink">
                    <span className="font-mono">{fw.version}</span>
                    <StatusBadge status={fw.status} tone={FRAMEWORK_TONES[fw.status]} />
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Published / effective</dt>
                  <dd className="mt-0.5 text-ink">{formatDate(fw.publishedDate)} → {formatDate(fw.effectiveDate)}</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Framework owner</dt>
                  <dd className="mt-0.5 text-ink">{fw.ownerName}</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Last reviewed</dt>
                  <dd className="mt-0.5 text-ink">{formatDate(fw.lastReviewedAt)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Requirements" subtitle="Approval state of the demo requirement set" />
              <CardBody>
                <div className="flex flex-col gap-2 text-[12px]">
                  <p className="flex items-center justify-between"><span className="text-ink-secondary">Total requirements</span><span className="kpi-value text-base">{detail.requirements.length}</span></p>
                  <p className="flex items-center justify-between"><span className="text-ink-secondary">Approved content</span><span className="font-semibold text-success">{approvedCount}</span></p>
                  <p className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-ink-secondary"><Sparkles className="h-3 w-3 text-purple" aria-hidden="true" /> AI-extracted drafts</span>
                    <span className="font-semibold text-purple">{aiDraftCount}</span>
                  </p>
                </div>
                {aiDraftCount > 0 && (
                  <p className="mt-3 rounded-md bg-tint-purple px-2.5 py-2 text-[10px] leading-relaxed text-purple">
                    Demo AI response — extracted drafts are NOT approved regulatory content until reviewed (Spec §10.1).
                  </p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Specialist domains (§9)" subtitle="Reuse anchors for Phase 4B/4C specialist screens" />
              <CardBody>
                {fw.domains.length === 0 ? (
                  <p className="text-[11px] text-ink-tertiary">No specialist domain assigned yet (demo).</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {fw.domains.map((d) => (
                      <span key={d} className="rounded-full bg-tint-blue px-2.5 py-1 text-[10px] font-semibold text-primary">
                        {SUPERVISORY_DOMAIN_LABELS[d]}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'requirements',
      label: 'Requirements',
      count: detail.requirements.length,
      content: (
        <DataTable<RegulatoryRequirement>
          columns={requirementColumns}
          data={reqRows}
          title={`Requirements — ${fw.code}`}
          getRowId={(r) => r.id}
          initialPageSize={10}
          onRowClick={(r) => {
            setSelectedReq(r)
            setReviewNote('')
          }}
          emptyTitle="No requirements"
          emptyDescription={
            aiDraftCount === 0 && detail.requirements.length === 0
              ? 'This demo framework has no requirements yet — upload a document with Demo AI extraction to draft some.'
              : 'No requirements match the current status filter.'
          }
          toolbar={
            <Select
              aria-label="Filter requirements by status"
              className="max-w-[240px]"
              value={fReqStatus}
              onChange={(e) => setFReqStatus(e.target.value)}
              placeholder="All statuses"
              options={['Approved', 'Under Review', 'AI-Extracted Draft', 'Rejected', 'Superseded'].map((s) => ({ value: s, label: s }))}
            />
          }
        />
      ),
    },
    {
      id: 'applicability',
      label: 'Applicability',
      content: (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Applicable licence categories" subtitle="Demo taxonomy from the institution registry" />
            <CardBody>
              {fw.applicableCategories.length === 0 ? (
                <p className="text-[11px] text-ink-tertiary">All licence categories (demo default).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {fw.applicableCategories.map((c) => (
                    <span key={c} className="rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-ink-secondary">{c}</span>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <DataTable
            columns={[
              {
                accessorKey: 'name',
                header: 'Institution',
                cell: ({ row }) => (
                  <button
                    type="button"
                    className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
                    onClick={() => navigate(`/app/institutions/${row.original.id}`)}
                  >
                    {row.original.name}
                  </button>
                ),
              },
              { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.code}</span> },
              { accessorKey: 'category', header: 'Licence category' },
            ] as Array<ColumnDef<FrameworkDetail['applicableInstitutions'][number], unknown>>}
            data={detail.applicableInstitutions}
            title="Matched demo institutions"
            getRowId={(i) => i.id}
            initialPageSize={10}
            emptyTitle="No institutions in scope"
            emptyDescription="No demo institution matches the applicable licence categories."
          />
        </div>
      ),
    },
    {
      id: 'mappings',
      label: 'Mappings',
      count: fw.mappings.length,
      content: (
        <DataTable
          columns={mappingColumns}
          data={fw.mappings}
          title={`Cross-module mappings — ${fw.code}`}
          getRowId={(m) => m.id}
          initialPageSize={10}
          emptyTitle="No mappings"
          emptyDescription="This demo framework has no cross-module mappings yet. Directive and enforcement targets are Phase-5 labels, never links."
        />
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      count: fw.sourceDocuments.length,
      content: (
        <Card>
          <CardHeader title="Source documents" subtitle="Simulated uploads — the prototype stores no real files (Spec §17.4)" />
          <CardBody className="p-0">
            {fw.sourceDocuments.length === 0 ? (
              <EmptyState title="No documents" description="Upload a framework document to see it listed here (simulated)." icon={<FileText className="h-7 w-7" />} />
            ) : (
              <ul className="divide-y divide-line-light">
                {fw.sourceDocuments.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">{doc.name}</span>
                        <span className="block text-[10px] text-ink-secondary">
                          v{doc.version} · {doc.sizeKb} kB · uploaded {formatDate(doc.uploadedAt)} by {doc.uploadedByName}
                        </span>
                        <span className="block text-[10px] italic text-ink-tertiary">{doc.storageNote}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={doc.confidentiality} tone={doc.confidentiality === 'Restricted' ? 'overdue' : doc.confidentiality === 'Internal' ? 'planning' : 'active'} />
                      <Button
                        variant="outline"
                        iconLeft={<Download className="h-3.5 w-3.5" />}
                        onClick={() => toast.info('Demo action completed', `Simulated download of “${doc.name}” — no real file is stored in the prototype.`)}
                      >
                        Download (demo)
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ),
    },
    {
      id: 'versions',
      label: 'Version history',
      icon: <RotateCcw className="h-3.5 w-3.5" />,
      count: fw.versions.length,
      content: (
        <Card>
          <CardHeader
            title="Version history"
            subtitle="Versioned demo rule changes"
            action={
              <Button
                variant="outline"
                disabled={!canManage}
                title={canManage ? 'Publish a new demo version' : 'Requires the manage-frameworks demo action (Spec §19)'}
                onClick={() => {
                  setNewVersion('')
                  setChangeSummary('')
                  setVersionError('')
                  setVersionOpen(true)
                }}
              >
                Publish version
              </Button>
            }
          />
          <CardBody>
            {fw.versions.length === 0 ? (
              <EmptyState title="No versions recorded" description="Versions published in this prototype session will appear here." icon={<RotateCcw className="h-7 w-7" />} />
            ) : (
              <ol className="flex flex-col gap-2.5">
                {[...fw.versions].reverse().map((v) => (
                  <li key={`${v.version}-${v.effectiveFrom}`} className="border-l-2 border-accent pl-3">
                    <p className="font-mono text-[11px] font-semibold text-primary">{v.version}</p>
                    <p className="text-[11px] leading-relaxed text-ink-secondary">{v.changeSummary}</p>
                    <p className="mt-0.5 text-[10px] text-ink-tertiary">
                      effective {formatDate(v.effectiveFrom)}
                      {v.approvedByName ? ` · approved by ${v.approvedByName}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
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
            <span>{fw.name}</span>
            <span className="font-mono text-sm text-ink-secondary">({fw.code})</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{fw.category} · {fw.jurisdictionCode}</span>
            <span>·</span>
            <span className="font-mono">{fw.version}</span>
            <span>·</span>
            <span>effective {formatDate(fw.effectiveDate)}</span>
            <StatusBadge status={fw.status} tone={FRAMEWORK_TONES[fw.status]} />
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Regulatory Frameworks', path: '/app/regulatory/frameworks' }, { label: fw.code }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>Library</Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export requirements
            </Button>
          </>
        }
      />

      <Tabs items={tabs} activeId={tab} onChange={setTab} />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Requirement detail drawer (Spec §10.1 requirement detail) */}
      <Drawer
        open={selectedReq !== null}
        onClose={() => setSelectedReq(null)}
        width="620px"
        title={selectedReq ? `${selectedReq.reference} — ${selectedReq.title}` : ''}
        footer={
          selectedReq?.status === 'AI-Extracted Draft' ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="danger" disabled={!canManage || busy} title={canManage ? 'Reject the demo AI extraction' : 'Requires the manage-frameworks demo action (Spec §19)'} onClick={() => void decideRequirement('reject')}>
                Reject extraction
              </Button>
              <Button variant="success" disabled={!canManage || busy} loading={busy} title={canManage ? 'Approve as regulatory content (demo)' : 'Requires the manage-frameworks demo action (Spec §19)'} onClick={() => void decideRequirement('approve')}>
                Approve requirement
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedReq && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedReq.status} tone={REQUIREMENT_TONES[selectedReq.status]} />
              <span className="rounded-full bg-tint-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
                {SUPERVISORY_DOMAIN_LABELS[selectedReq.domain]}
              </span>
              {selectedReq.approvedByName && (
                <span className="text-[10px] text-ink-tertiary">
                  approved by {selectedReq.approvedByName}
                  {selectedReq.approvedAt ? ` · ${formatDate(selectedReq.approvedAt)}` : ''}
                </span>
              )}
            </div>

            {selectedReq.extractionNote && (
              <div className="flex items-start gap-2 rounded-lg border border-purple/30 bg-tint-purple px-3 py-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold text-purple">Demo AI response — not approved regulatory content</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-purple/90">{selectedReq.extractionNote}</p>
                </div>
              </div>
            )}

            <section>
              <h3 className="overline text-ink-tertiary">Requirement text</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink">{selectedReq.text}</p>
            </section>

            <dl className="grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2">
              <div>
                <dt className="overline text-ink-tertiary">Legal / standard source</dt>
                <dd className="mt-0.5 text-ink">{selectedReq.legalSource}</dd>
              </div>
              <div>
                <dt className="overline text-ink-tertiary">Effective period</dt>
                <dd className="mt-0.5 text-ink">
                  {formatDate(selectedReq.effectiveFrom)}
                  {selectedReq.effectiveTo ? ` → ${formatDate(selectedReq.effectiveTo)}` : ' → current'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="overline text-ink-tertiary">Institution categories</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {selectedReq.institutionCategories.length === 0 ? (
                    <span className="text-ink-secondary">All licence categories (demo default)</span>
                  ) : (
                    selectedReq.institutionCategories.map((c) => (
                      <span key={c} className="rounded-full bg-page px-2 py-0.5 text-[10px] font-medium text-ink-secondary">{c}</span>
                    ))
                  )}
                </dd>
              </div>
            </dl>

            <section>
              <h3 className="overline text-ink-tertiary">Evidence expected</h3>
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-ink-secondary">
                {selectedReq.evidenceExpected.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </section>

            <section>
              <h3 className="overline text-ink-tertiary">Examination procedures mapped</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedReq.mappedProcedureRefs.length === 0 ? (
                  <span className="text-[11px] text-ink-tertiary">No examination-library procedures mapped yet (demo).</span>
                ) : (
                  selectedReq.mappedProcedureRefs.map((ref) => (
                    <button
                      key={ref}
                      type="button"
                      title={`Opens the Examination Library — locate ${ref} (demo mapping).`}
                      className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
                      onClick={() => navigate('/app/examination-library')}
                    >
                      {ref} →
                    </button>
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="overline text-ink-tertiary">Related obligations</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedReq.relatedObligationRefs.length === 0 ? (
                  <span className="text-[11px] text-ink-tertiary">No obligations derived yet (demo).</span>
                ) : (
                  selectedReq.relatedObligationRefs.map((ref) => (
                    <RelationChip
                      key={ref}
                      mapping={{ id: ref, kind: 'obligation', targetRef: ref, targetLabel: ref, link: `/app/regulatory/obligations?obligation=${encodeURIComponent(ref)}` }}
                      onNavigate={() => setSelectedReq(null)}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="overline text-ink-tertiary">Supervisory story anchors (demo)</h3>
              <div className="mt-1 flex flex-col gap-1.5">
                {selectedReq.storyAnchors.length === 0 ? (
                  <span className="text-[11px] text-ink-tertiary">No live supervisory anchors for this requirement yet.</span>
                ) : (
                  selectedReq.storyAnchors.map((a) => (
                    <span key={a.id} className="flex flex-wrap items-center gap-2 text-[11px] text-ink-secondary">
                      <RelationChip mapping={a} onNavigate={() => setSelectedReq(null)} />
                      <span>{a.targetLabel}</span>
                    </span>
                  ))
                )}
              </div>
            </section>

            {selectedReq.status === 'AI-Extracted Draft' && (
              <section>
                <h3 className="overline text-ink-tertiary">Review note (optional)</h3>
                <TextArea
                  aria-label="Review note for the requirement decision"
                  rows={2}
                  className="mt-1"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Recorded with the approve/reject decision in the prototype session…"
                />
                {!canManage && (
                  <p className="mt-1 text-[10px] text-ink-tertiary">
                    Your demo role cannot decide AI-extracted drafts — switch to a team-lead-or-above role (Spec §19).
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </Drawer>

      {/* Publish version modal */}
      <Modal
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
        title={`Publish new version — ${fw.code}`}
        description="Appends an entry to the demo version history and bumps the framework version. Saved in the prototype session only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void publishVersion()}>Publish version</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextInput label="Version" required value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder={`e.g. ${fw.version}.1`} />
          <TextArea label="Change summary" required rows={3} value={changeSummary} error={versionError} onChange={(e) => setChangeSummary(e.target.value)} placeholder="What changed in this demo version…" />
        </div>
      </Modal>
    </div>
  )
}
