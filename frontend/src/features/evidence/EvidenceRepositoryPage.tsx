import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Check,
  Download,
  FileText,
  Hash,
  Link2,
  Upload,
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
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import { evidenceService } from '@/services/mock/MockEvidenceService'
import { findingService } from '@/services/mock/MockFindingService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { ConfidentialityClassification, EvidenceItem } from '@/types/examination'
import type { FindingDetail } from '@/types/finding'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Evidence Repository (Spec §7.6): register with confidentiality
 * classification and review status, simulated upload (metadata only —
 * prototype honesty), preview, procedure/finding links, reviewer notes,
 * reviewed/rejected decisions, version history and the evidence detail
 * drawer with integrity-hash placeholder and access history.
 */

const REVIEW_TONES: Record<string, StatusTone> = {
  'Pending Review': 'planning',
  Reviewed: 'active',
  Rejected: 'overdue',
}

const CONF_TONES: Record<ConfidentialityClassification, StatusTone> = {
  Public: 'draft',
  Internal: 'planning',
  Confidential: 'fieldwork',
  Restricted: 'overdue',
}

const CATEGORIES = ['System report', 'Policy document', 'Working paper', 'Sample population', 'Remediation evidence', 'Correspondence']

export function EvidenceRepositoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canUpload = can(actor.actorRole, 'upload-evidence')
  const canReview = can(actor.actorRole, 'review-evidence')

  const [items, setItems] = useState<EvidenceItem[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [findings, setFindings] = useState<FindingDetail[]>([])
  // ?search= deep links (e.g. loan-sample evidence chips, Phase 3B).
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [fInstitution, setFInstitution] = useState('')
  const [fConf, setFConf] = useState('')
  const [fReview, setFReview] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('highlight'))
  const [uploadOpen, setUploadOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [linkOpen, setLinkOpen] = useState<'procedure' | 'finding' | null>(null)
  const [linkExamId, setLinkExamId] = useState('')
  const [linkProcedureId, setLinkProcedureId] = useState('')
  const [linkProcedures, setLinkProcedures] = useState<Array<{ id: string; code: string; title: string }>>([])
  const [linkFindingRef, setLinkFindingRef] = useState('')
  const [busy, setBusy] = useState(false)

  const [uploadDraft, setUploadDraft] = useState({
    title: '',
    fileName: '',
    institutionId: '',
    domainName: 'AML/CFT',
    category: 'System report',
    confidentiality: 'Confidential' as ConfidentialityClassification,
    sourceDescription: '',
  })

  const load = useCallback(async () => {
    const [list, instPage, findingList] = await Promise.all([
      evidenceService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
      findingService.list({}),
    ])
    setItems(list)
    setInstitutions(instPage.items)
    setFindings(findingList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])
  const findingByRef = useMemo(() => new Map(findings.map((f) => [f.reference, f])), [findings])
  const examById = useMemo(() => new Map((items ?? []).filter((i) => i.examinationRef).map((i) => [i.examinationId!, i.examinationRef!])), [items])

  const active = useMemo(() => items?.find((i) => i.id === activeId) ?? null, [items, activeId])

  const rows = useMemo(() => {
    if (!items) return []
    const s = search.trim().toLowerCase()
    return items
      .filter((i) => !fInstitution || i.institutionId === fInstitution)
      .filter((i) => !fConf || i.confidentiality === fConf)
      .filter((i) => !fReview || i.reviewStatus === fReview)
      .filter((i) => !fCategory || i.category === fCategory)
      .filter((i) => !s || `${i.reference} ${i.title} ${i.fileName} ${i.uploadedByName}`.toLowerCase().includes(s))
  }, [items, search, fInstitution, fConf, fReview, fCategory])

  const openDetail = (id: string) => {
    setActiveId(id)
    setSearchParams({ highlight: id }, { replace: true })
  }

  const closeDetail = () => {
    setActiveId(null)
    setSearchParams({}, { replace: true })
  }

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

  const handleUpload = async () => {
    const d = uploadDraft
    if (!d.title.trim() || !d.fileName.trim() || !d.institutionId) {
      toast.error('Incomplete', 'Title, file name and institution are required for the simulated upload.')
      return
    }
    setBusy(true)
    try {
      const created = await evidenceService.upload(
        {
          title: d.title.trim(),
          fileName: d.fileName.trim(),
          mimeType: 'application/octet-stream',
          sizeKb: Math.floor(128 + Math.random() * 4096),
          institutionId: d.institutionId,
          domainName: d.domainName,
          category: d.category,
          confidentiality: d.confidentiality,
          sourceDescription: d.sourceDescription.trim() || 'Uploaded from the evidence repository (simulated, demo)',
        },
        actor,
      )
      setUploadOpen(false)
      setUploadDraft({ ...d, title: '', fileName: '', sourceDescription: '' })
      await load()
      openDetail(created.id)
      toast.success('Demo upload recorded', `${created.reference} — metadata only; the prototype stores no real file.`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The simulated upload could not be recorded.')
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
      'atheris-reg-evidence-register-demo.csv',
      ['Reference', 'Title', 'File name', 'Institution', 'Examination', 'Domain', 'Category', 'Confidentiality', 'Uploaded by', 'Uploaded at', 'Version', 'Review status'],
      rows.map((i) => [
        i.reference,
        i.title,
        i.fileName,
        instById.get(i.institutionId)?.tradingName ?? i.institutionId,
        i.examinationRef ?? '—',
        i.domainName,
        i.category,
        i.confidentiality,
        i.uploadedByName,
        i.uploadedAt,
        i.version,
        i.reviewStatus,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const openLinkProcedure = async () => {
    setLinkOpen('procedure')
    setLinkExamId('')
    setLinkProcedureId('')
    setLinkProcedures([])
  }

  const loadProcedures = async (examinationId: string) => {
    setLinkExamId(examinationId)
    setLinkProcedureId('')
    if (!examinationId) {
      setLinkProcedures([])
      return
    }
    const procs = await examinationService.procedures(examinationId)
    setLinkProcedures(procs.map((p) => ({ id: p.id, code: p.code, title: p.title })))
  }

  const columns = useMemo<Array<ColumnDef<EvidenceItem, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Evidence ref',
        cell: ({ row }) => <span className="font-mono text-[11px] font-semibold text-primary">{row.original.reference}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Title / file name',
        cell: ({ row }) => (
          <div>
            <p className="max-w-64 truncate text-[13px] font-medium text-ink">{row.original.title}</p>
            <p className="max-w-64 truncate font-mono text-[10px] text-ink-secondary">{row.original.fileName}</p>
          </div>
        ),
      },
      {
        id: 'institution',
        accessorFn: (i) => instById.get(i.institutionId)?.tradingName ?? '',
        header: 'Institution',
      },
      {
        id: 'examination',
        accessorFn: (i) => i.examinationRef ?? '',
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
      { accessorKey: 'domainName', header: 'Domain' },
      { accessorKey: 'category', header: 'Category' },
      {
        accessorKey: 'confidentiality',
        header: 'Confidentiality',
        cell: ({ row }) => <StatusBadge status={row.original.confidentiality} tone={CONF_TONES[row.original.confidentiality]} />,
      },
      {
        id: 'uploaded',
        accessorFn: (i) => i.uploadedAt,
        header: 'Uploaded by / date',
        cell: ({ row }) => (
          <div>
            <p className="text-xs text-ink">{row.original.uploadedByName.split(' (')[0]}</p>
            <p className="text-[10px] text-ink-secondary">{formatDate(row.original.uploadedAt)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ getValue }) => <span className="text-xs text-ink">v{getValue<number>()}</span>,
      },
      {
        accessorKey: 'reviewStatus',
        header: 'Review status',
        cell: ({ row }) => <StatusBadge status={row.original.reviewStatus} tone={REVIEW_TONES[row.original.reviewStatus]} />,
      },
    ],
    [instById, navigate],
  )

  return (
    <div>
      <PageHeader
        title="Evidence Repository"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Confidentiality-classified supervisory evidence across the demo portfolio</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Simulated uploads — metadata only
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
              iconLeft={<Upload className="h-4 w-4" />}
              disabled={!canUpload}
              title={canUpload ? undefined : 'Your demo role cannot upload evidence (Spec §19)'}
              onClick={() => setUploadOpen(true)}
            >
              Upload demo evidence
            </Button>
          </>
        }
      />

      {items === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<EvidenceItem>
          columns={columns}
          data={rows}
          title="Evidence register"
          headerAction={<span className="text-xs text-ink-secondary">{rows.length} items · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => openDetail(row.id)}
          initialPageSize={10}
          emptyTitle="No evidence matches"
          emptyDescription="Adjust the filters or run a simulated upload — the prototype records metadata only."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TextInput
                aria-label="Search evidence"
                placeholder="Search reference, title, file or uploader…"
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
                aria-label="Filter by category"
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                placeholder="All categories"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by confidentiality"
                value={fConf}
                onChange={(e) => setFConf(e.target.value)}
                placeholder="All classifications"
                options={['Public', 'Internal', 'Confidential', 'Restricted'].map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by review status"
                value={fReview}
                onChange={(e) => setFReview(e.target.value)}
                placeholder="All review states"
                options={['Pending Review', 'Reviewed', 'Rejected'].map((c) => ({ value: c, label: c }))}
              />
            </div>
          }
        />
      )}

      {/* Evidence detail drawer (Spec §7.6) */}
      <Drawer
        open={active !== null}
        onClose={closeDetail}
        width="640px"
        title={
          active && (
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-mono text-xs">{active.reference}</span>
              <StatusBadge status={active.reviewStatus} tone={REVIEW_TONES[active.reviewStatus]} />
            </span>
          )
        }
        footer={
          active && (
            <div className="flex flex-wrap justify-end gap-2">
              {canUpload && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Link2 className="h-3.5 w-3.5" />}
                    onClick={() => void openLinkProcedure()}
                  >
                    Link procedure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Link2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setLinkOpen('finding')
                      setLinkFindingRef('')
                    }}
                  >
                    Link finding
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Upload className="h-3.5 w-3.5" />}
                    disabled={busy}
                    onClick={() => void runAction(`New version of ${active.reference} recorded`, () => evidenceService.addVersion(active.id, 'Re-upload recorded in the prototype session (simulated).', actor))}
                  >
                    Upload new version
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Download className="h-3.5 w-3.5" />}
                onClick={() => {
                  void evidenceService.recordAccess(active.id, 'Downloaded', actor)
                  toast.info('Demo download', 'The prototype stores metadata only — there is no real attachment to download.')
                }}
              >
                Download (demo)
              </Button>
              {canReview && active.reviewStatus === 'Pending Review' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    iconLeft={<X className="h-3.5 w-3.5" />}
                    disabled={busy || reviewNote.trim() === ''}
                    onClick={() => {
                      const note = reviewNote.trim()
                      setReviewNote('')
                      void runAction(`${active.reference} rejected`, () => evidenceService.markRejected(active.id, note, actor))
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    iconLeft={<Check className="h-3.5 w-3.5" />}
                    disabled={busy}
                    onClick={() => {
                      const note = reviewNote.trim() || 'Reviewed from the evidence repository (demo note).'
                      setReviewNote('')
                      void runAction(`${active.reference} marked reviewed`, () => evidenceService.markReviewed(active.id, note, actor))
                    }}
                  >
                    Mark reviewed
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {active && (
          <div className="flex flex-col gap-4 text-sm">
            {/* File preview placeholder */}
            <div className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-page p-4">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-lg bg-tint-blue text-primary">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{active.title}</p>
                <p className="truncate font-mono text-[11px] text-ink-secondary">
                  {active.fileName} · {active.mimeType} · {active.sizeKb} KB (demo)
                </p>
                <p className="mt-1 text-[10px] text-ink-tertiary">
                  File preview placeholder — the prototype stores metadata only, never real files.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="overline">Institution</p>
                <button
                  type="button"
                  className="mt-0.5 cursor-pointer text-xs font-medium text-primary hover:underline"
                  onClick={() => navigate(`/app/institutions/${active.institutionId}`)}
                >
                  {instById.get(active.institutionId)?.tradingName ?? '—'}
                </button>
              </div>
              <div>
                <p className="overline">Examination</p>
                {active.examinationRef ? (
                  <button
                    type="button"
                    className="mt-0.5 cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
                    onClick={() => navigate(`/app/examinations/${active.examinationId}`)}
                  >
                    {active.examinationRef}
                  </button>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-secondary">Not examination-linked</p>
                )}
              </div>
              <div>
                <p className="overline">Domain / category</p>
                <p className="mt-0.5 text-xs text-ink">{active.domainName} · {active.category}</p>
              </div>
              <div>
                <p className="overline">Confidentiality</p>
                <div className="mt-0.5"><StatusBadge status={active.confidentiality} tone={CONF_TONES[active.confidentiality]} /></div>
              </div>
              <div>
                <p className="overline">Uploaded by / date</p>
                <p className="mt-0.5 text-xs text-ink">
                  {active.uploadedByName} · {formatDate(active.uploadedAt)}
                </p>
              </div>
              <div>
                <p className="overline">Source & collection date</p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {active.sourceDescription} · collected {formatDate(active.collectedAt)}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-page p-3">
              <p className="overline flex items-center gap-1">
                <Hash className="h-3 w-3" aria-hidden="true" /> Integrity hash (placeholder)
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-ink">{active.integrityHash}</p>
              <p className="mt-1 text-[9px] text-ink-tertiary">
                Demo placeholder — a real deployment would carry a cryptographic hash of the stored artefact.
              </p>
            </div>

            {canReview && active.reviewStatus === 'Pending Review' && (
              <TextArea
                label="Reviewer note"
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Required when rejecting; optional when marking reviewed (demo)."
              />
            )}
            {active.reviewerNote && (
              <div className="rounded-lg border border-line p-3">
                <p className="overline">Reviewer note</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">{active.reviewerNote}</p>
                <p className="mt-1 text-[10px] text-ink-secondary">{active.reviewerName}</p>
              </div>
            )}

            <div>
              <p className="overline">Linked examination procedures</p>
              {active.linkedProcedureIds.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">None — use “Link procedure” to attach this item to a work-programme procedure.</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {active.linkedProcedureIds.map((pid) => (
                    <li key={pid}>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[10px] text-primary hover:border-primary-surface"
                        onClick={() => {
                          if (active.examinationId) navigate(`/app/examinations/${active.examinationId}/workspace?procedure=${pid}`)
                        }}
                      >
                        {pid.slice(0, 13)}… → workspace
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="overline">Linked findings</p>
              {active.linkedFindingRefs.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">None yet.</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {active.linkedFindingRefs.map((ref) => {
                    const f = findingByRef.get(ref)
                    return (
                      <li key={ref}>
                        <button
                          type="button"
                          className="cursor-pointer rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[10px] font-semibold text-primary hover:border-primary-surface"
                          onClick={() => f && navigate(`/app/findings/${f.id}`)}
                        >
                          {ref}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div>
              <p className="overline">Version history</p>
              <ul className="mt-1 flex flex-col gap-1.5">
                {active.versionHistory.slice().reverse().map((v) => (
                  <li key={v.version} className="rounded bg-page px-2.5 py-1.5 text-[11px]">
                    <span className="font-semibold text-ink">v{v.version}</span>{' '}
                    <span className="text-ink-secondary">
                      {v.uploadedByName} · {formatRelativeTime(v.at)}
                      {v.note ? ` · ${v.note}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="overline">Access history</p>
              <ul className="mt-1 flex flex-col gap-1">
                {active.accessHistory.slice().reverse().map((a, i) => (
                  <li key={i} className="text-[11px] text-ink-secondary">
                    <span className="font-medium text-ink">{a.byName}</span> · {a.action} · {formatRelativeTime(a.at)}
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Prototype drawer — evidence records are fictional demo data; examinations referenced:{' '}
              {examById.size > 0 ? Array.from(new Set(examById.values())).join(', ') : 'none'} (demo).
            </p>
          </div>
        )}
      </Drawer>

      {/* Simulated upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload demo evidence" size="lg">
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Simulated upload (Spec §7.6): the prototype records metadata only — no file leaves the browser and no
            file is stored. The integrity hash is generated as a labelled placeholder.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Evidence title"
              required
              value={uploadDraft.title}
              onChange={(e) => setUploadDraft({ ...uploadDraft, title: e.target.value })}
              placeholder="e.g. Board risk committee minutes — Q3 2026"
            />
            <TextInput
              label="File name (demo)"
              required
              value={uploadDraft.fileName}
              onChange={(e) => setUploadDraft({ ...uploadDraft, fileName: e.target.value })}
              placeholder="e.g. board-minutes-q3-2026.pdf"
            />
            <Select
              label="Institution"
              required
              value={uploadDraft.institutionId}
              onChange={(e) => setUploadDraft({ ...uploadDraft, institutionId: e.target.value })}
              placeholder="Select an institution…"
              options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
            />
            <Select
              label="Domain"
              value={uploadDraft.domainName}
              onChange={(e) => setUploadDraft({ ...uploadDraft, domainName: e.target.value })}
              options={['AML/CFT', 'Credit Risk', 'Liquidity Risk', 'Cybersecurity', 'Corporate Governance', 'Capital Adequacy', 'Operational Resilience'].map((d) => ({ value: d, label: d }))}
            />
            <Select
              label="Evidence category"
              value={uploadDraft.category}
              onChange={(e) => setUploadDraft({ ...uploadDraft, category: e.target.value })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Confidentiality classification"
              value={uploadDraft.confidentiality}
              onChange={(e) => setUploadDraft({ ...uploadDraft, confidentiality: e.target.value as ConfidentialityClassification })}
              options={['Public', 'Internal', 'Confidential', 'Restricted'].map((c) => ({ value: c, label: c }))}
            />
          </div>
          <TextInput
            label="Source description"
            value={uploadDraft.sourceDescription}
            onChange={(e) => setUploadDraft({ ...uploadDraft, sourceDescription: e.target.value })}
            placeholder="Where did this evidence come from? (demo)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" iconLeft={<Upload className="h-4 w-4" />} loading={busy} onClick={() => void handleUpload()}>
              Record upload (demo)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Link-to-procedure modal */}
      <Modal open={linkOpen === 'procedure'} onClose={() => setLinkOpen(null)} title={`Link ${active?.reference ?? ''} to a procedure`} size="md">
        <div className="flex flex-col gap-3">
          <Select
            label="Examination"
            value={linkExamId}
            onChange={(e) => void loadProcedures(e.target.value)}
            placeholder="Select an examination…"
            options={Array.from(new Map((items ?? []).filter((i) => i.examinationId).map((i) => [i.examinationId!, `${i.examinationRef} — ${instById.get(i.institutionId)?.tradingName ?? ''}`])).entries()).map(([value, label]) => ({ value, label }))}
          />
          <Select
            label="Procedure"
            value={linkProcedureId}
            onChange={(e) => setLinkProcedureId(e.target.value)}
            placeholder={linkProcedures.length > 0 ? 'Select a procedure…' : 'Select an examination first'}
            options={linkProcedures.map((p) => ({ value: p.id, label: `${p.code} — ${p.title}` }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLinkOpen(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!linkProcedureId || busy || !active}
              loading={busy}
              onClick={() => {
                const id = active!.id
                const pid = linkProcedureId
                setLinkOpen(null)
                void runAction('Evidence linked to procedure', () => evidenceService.linkToProcedure(id, pid, actor))
              }}
            >
              Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Link-to-finding modal */}
      <Modal open={linkOpen === 'finding'} onClose={() => setLinkOpen(null)} title={`Link ${active?.reference ?? ''} to a finding`} size="md">
        <div className="flex flex-col gap-3">
          <Select
            label="Finding"
            value={linkFindingRef}
            onChange={(e) => setLinkFindingRef(e.target.value)}
            placeholder="Select a finding…"
            options={findings.map((f) => ({ value: f.reference, label: `${f.reference} — ${f.title}` }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLinkOpen(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!linkFindingRef || busy || !active}
              loading={busy}
              onClick={() => {
                const id = active!.id
                const f = findingByRef.get(linkFindingRef)
                setLinkOpen(null)
                void runAction('Evidence linked to finding', () => evidenceService.linkToFinding(id, linkFindingRef, f?.id, actor))
              }}
            >
              Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
