import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Tags,
} from 'lucide-react'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { useSessionStore } from '@/store/sessionStore'
import { libraryService } from '@/services/mock/MockLibraryService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { LibraryProgramme, TemplateStatus } from '@/types/examination'
import { formatDate } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Examination Library (Spec §7.5): jurisdiction → institution category →
 * supervisory domain → examination type → programme → procedure hierarchy,
 * list/detail with versioning and the draft → under review → approved →
 * retired lifecycle, and a template editor covering objectives, scope
 * guidance, procedures, evidence requirements, methodology, scoring
 * guidance, regulatory mapping and version history. Only Approved versions
 * are selectable when creating examinations (enforced in the wizard).
 */

const STATUS_TONES: Record<TemplateStatus, StatusTone> = {
  Draft: 'draft',
  'Under Review': 'reporting',
  Approved: 'active',
  Retired: 'closed',
}

type TreeFilter =
  | { level: 'none' }
  | { level: 'category'; value: string }
  | { level: 'domain'; value: string }
  | { level: 'type'; value: string }

export function ExaminationLibraryPage({
  initialStatus = '',
  initialTitle,
}: {
  /** /app/examination-programmes opens pre-filtered to approved templates. */
  initialStatus?: TemplateStatus | ''
  initialTitle?: string
} = {}) {
  const actor = useActor()
  const jurisdiction = useSessionStore((s) => s.jurisdiction)
  const canManage = can(actor.actorRole, 'manage-library')
  const canApprove = can(actor.actorRole, 'approve')

  const [programmes, setProgrammes] = useState<LibraryProgramme[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | ''>(initialStatus)
  const [searchParams] = useSearchParams()
  // Phase 4B: ?search= deep-links (requirement ↔ procedure mapping chips from
  // the Regulatory Frameworks drawer and the specialist checklist criteria).
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [treeFilter, setTreeFilter] = useState<TreeFilter>({ level: 'none' })
  const [editorOpen, setEditorOpen] = useState(false)

  const load = useCallback(async () => {
    const list = await libraryService.list({})
    setProgrammes(list)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => programmes?.find((p) => p.id === selectedId) ?? null,
    [programmes, selectedId],
  )

  const rows = useMemo(() => {
    if (!programmes) return []
    const s = search.trim().toLowerCase()
    return programmes
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => {
        if (treeFilter.level === 'category') return (p.institutionCategories as string[]).includes(treeFilter.value)
        if (treeFilter.level === 'domain') return p.domainName === treeFilter.value
        if (treeFilter.level === 'type') return (p.examinationTypes as string[]).includes(treeFilter.value)
        return true
      })
      .filter((p) => !s || `${p.code} ${p.title} ${p.domainName} ${p.ownerName}`.toLowerCase().includes(s))
  }, [programmes, statusFilter, search, treeFilter])

  // Hierarchy facets (jurisdiction → category → domain → type)
  const categories = useMemo(
    () => Array.from(new Set((programmes ?? []).flatMap((p) => p.institutionCategories))).sort(),
    [programmes],
  )
  const domains = useMemo(
    () => Array.from(new Set((programmes ?? []).map((p) => p.domainName))).sort(),
    [programmes],
  )
  const types = useMemo(
    () => Array.from(new Set((programmes ?? []).flatMap((p) => p.examinationTypes))).sort(),
    [programmes],
  )

  if (programmes === null) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const TreeSection = ({
    id,
    label,
    icon,
    children,
  }: {
    id: string
    label: string
    icon: React.ReactNode
    children: React.ReactNode
  }) => {
    const open = expanded[id] ?? true
    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-semibold text-ink hover:bg-page"
        >
          {open ? <ChevronDown className="h-3 w-3 text-ink-secondary" /> : <ChevronRight className="h-3 w-3 text-ink-secondary" />}
          {icon}
          {label}
        </button>
        {open && <div className="ml-4 border-l border-line pl-2">{children}</div>}
      </div>
    )
  }

  const TreeLeaf = ({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cx(
        'flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors',
        active ? 'bg-primary text-white' : 'text-ink-secondary hover:bg-page hover:text-ink',
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={cx('ml-1 shrink-0 text-[9px]', active ? 'text-white/70' : 'text-ink-tertiary')}>{count}</span>
      )}
    </button>
  )

  const countFor = (pred: (p: LibraryProgramme) => boolean): number => programmes.filter(pred).length

  return (
    <div>
      <PageHeader
        title={initialTitle ?? 'Examination Library'}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              Template programmes and procedures — {jurisdiction ? `${jurisdiction.name} (${jurisdiction.code})` : 'demo jurisdiction'}
            </span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Fictional demo library
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Hierarchy tree */}
        <Card className="h-fit">
          <CardHeader title="Library hierarchy" subtitle="Jurisdiction → category → domain → type (§7.5)." />
          <CardBody className="p-2">
            <TreeSection id="jur" label={jurisdiction?.name ?? 'Meridia Banking Authority'} icon={<Landmark className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}>
              <TreeSection id="cat" label="Institution categories" icon={<Tags className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}>
                {categories.map((c) => (
                  <TreeLeaf
                    key={c}
                    label={c}
                    count={countFor((p) => p.institutionCategories.includes(c))}
                    active={treeFilter.level === 'category' && treeFilter.value === c}
                    onClick={() =>
                      setTreeFilter((prev) =>
                        prev.level === 'category' && prev.value === c ? { level: 'none' } : { level: 'category', value: c },
                      )
                    }
                  />
                ))}
              </TreeSection>
              <TreeSection id="dom" label="Supervisory domains" icon={<BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}>
                {domains.map((d) => (
                  <TreeLeaf
                    key={d}
                    label={d}
                    count={countFor((p) => p.domainName === d)}
                    active={treeFilter.level === 'domain' && treeFilter.value === d}
                    onClick={() =>
                      setTreeFilter((prev) =>
                        prev.level === 'domain' && prev.value === d ? { level: 'none' } : { level: 'domain', value: d },
                      )
                    }
                  />
                ))}
              </TreeSection>
              <TreeSection id="typ" label="Examination types" icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}>
                {types.map((t) => (
                  <TreeLeaf
                    key={t}
                    label={t}
                    count={countFor((p) => p.examinationTypes.includes(t))}
                    active={treeFilter.level === 'type' && treeFilter.value === t}
                    onClick={() =>
                      setTreeFilter((prev) =>
                        prev.level === 'type' && prev.value === t ? { level: 'none' } : { level: 'type', value: t },
                      )
                    }
                  />
                ))}
              </TreeSection>
            </TreeSection>
            <div className="mt-2 border-t border-line pt-2">
              <TreeLeaf
                label="Show all templates"
                active={treeFilter.level === 'none'}
                onClick={() => setTreeFilter({ level: 'none' })}
              />
            </div>
          </CardBody>
        </Card>

        {/* Main column */}
        {selected === null ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader
                title="Templates"
                subtitle="Only Approved versions can be selected for new examinations; existing examinations retain their selected version."
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TextInput
                    aria-label="Search library"
                    placeholder="Search code, title, domain or owner…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TemplateStatus | '')}
                    placeholder="All statuses"
                    options={(['Draft', 'Under Review', 'Approved', 'Retired'] as TemplateStatus[]).map((s) => ({ value: s, label: s }))}
                  />
                  <p className="flex items-center text-[11px] text-ink-secondary">
                    {rows.length} template(s) · demo library content
                  </p>
                </div>
              </CardBody>
            </Card>

            {rows.length === 0 ? (
              <Card>
                <CardBody>
                  <EmptyState
                    title="No templates match"
                    description="Adjust the hierarchy, status filter or search — the demo library covers AML/CFT, credit, liquidity, cyber, governance and capital programmes."
                  />
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {rows.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="cursor-pointer rounded-xl border border-line bg-card p-4 text-left shadow-card transition-transform hover:-translate-y-0.5"
                  >
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary">{p.code}</span>
                      <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] text-ink">{p.version}</span>
                      <StatusBadge status={p.status} tone={STATUS_TONES[p.status]} />
                      {p.status !== 'Approved' && (
                        <span className="text-[9px] text-ink-secondary">not selectable for new examinations</span>
                      )}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-ink">{p.title}</p>
                    <p className="mt-1 text-[11px] text-ink-secondary">
                      {p.domainName} · {p.examinationTypes.join(', ')}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-secondary">
                      {p.procedures.length} procedures · owner {p.ownerName} · effective {formatDate(p.effectiveFrom)}
                      {p.effectiveTo ? ` → ${formatDate(p.effectiveTo)}` : ''}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-secondary">{p.objectives}</p>
                    <p className="mt-2 flex flex-wrap gap-1">
                      {p.regulatoryMapping.slice(0, 2).map((m) => (
                        <span key={m.reference} className="rounded-full bg-page px-2 py-0.5 font-mono text-[9px] text-ink-secondary">
                          {m.reference}
                        </span>
                      ))}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <TemplateDetail
            programme={selected}
            canManage={canManage}
            canApprove={canApprove}
            onBack={() => setSelectedId(null)}
            onEdit={() => setEditorOpen(true)}
            onChanged={async (label: string, fn: () => Promise<unknown>) => {
              try {
                await fn()
                await load()
                toast.success('Demo action completed', `${label} — saved in prototype session.`)
              } catch (err) {
                if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
                else toast.error('Demo action failed', `${label} could not be completed in the prototype.`)
              }
            }}
          />
        )}
      </div>

      {selected && (
        <TemplateEditorModal
          open={editorOpen}
          programme={selected}
          actorName={actor.actorName}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false)
            await load()
            toast.success('Template updated', 'Changes recorded in the version history — saved in prototype session.')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template detail
// ---------------------------------------------------------------------------

function TemplateDetail({
  programme: p,
  canManage,
  canApprove,
  onBack,
  onEdit,
  onChanged,
}: {
  programme: LibraryProgramme
  canManage: boolean
  canApprove: boolean
  onBack: () => void
  onEdit: () => void
  onChanged: (label: string, fn: () => Promise<unknown>) => Promise<void>
}) {
  const actor = useActor()
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-primary">{p.code}</span>
              {p.title}
              <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] text-ink">{p.version}</span>
              <StatusBadge status={p.status} tone={STATUS_TONES[p.status]} />
            </span>
          }
          subtitle={`Owner ${p.ownerName} · effective ${formatDate(p.effectiveFrom)}${p.effectiveTo ? ` → ${formatDate(p.effectiveTo)} (retired)` : ''} · categories: ${p.institutionCategories.join(', ')}`}
          action={
            <Button variant="ghost" size="sm" iconLeft={<ChevronLeft className="h-3.5 w-3.5" />} onClick={onBack}>
              All templates
            </Button>
          }
        />
        <CardBody>
          {p.status !== 'Approved' && (
            <p className="mb-3 rounded-lg bg-accent/5 px-3 py-2 text-[11px] text-accent-dark">
              {p.status === 'Retired'
                ? 'Retired template — not selectable for new examinations; existing examinations retain the version they selected (Spec §7.5).'
                : `This ${p.status.toLowerCase()} version cannot be selected for new examinations until it is approved (Spec §7.5).`}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
            <div>
              <p className="overline">Objectives</p>
              <p className="mt-1 leading-relaxed text-ink">{p.objectives}</p>
            </div>
            <div>
              <p className="overline">Scope guidance</p>
              <p className="mt-1 leading-relaxed text-ink">{p.scopeGuidance}</p>
            </div>
            <div>
              <p className="overline">Testing methodology</p>
              <p className="mt-1 leading-relaxed text-ink">{p.testingMethodology}</p>
            </div>
            <div>
              <p className="overline">Scoring guidance</p>
              <p className="mt-1 leading-relaxed text-ink">{p.scoringGuidance}</p>
            </div>
            <div>
              <p className="overline">Evidence requirements</p>
              <ul className="mt-1 list-inside list-disc leading-relaxed text-ink-secondary">
                {p.evidenceRequirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="overline">Regulatory mapping (demo references)</p>
              <ul className="mt-1 flex flex-col gap-1">
                {p.regulatoryMapping.map((m) => (
                  <li key={m.reference} className="rounded bg-page px-2 py-1">
                    <span className="font-mono text-[10px] font-semibold text-primary">{m.reference}</span>{' '}
                    <span className="text-ink-secondary">{m.title}</span>
                  </li>
                ))}
              </ul>
              <p className="overline mt-3">Applicable examination types</p>
              <p className="mt-1 text-ink">{p.examinationTypes.join(', ')}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
            {canManage && (p.status === 'Draft' || p.status === 'Under Review') && (
              <Button variant="outline" size="sm" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
                Edit template
              </Button>
            )}
            {canManage && p.status === 'Draft' && (
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Send className="h-3.5 w-3.5" />}
                onClick={() => void onChanged('Template submitted for review', () => libraryService.submitForReview(p.id, actor))}
              >
                Submit for review
              </Button>
            )}
            {canManage && canApprove && p.status === 'Under Review' && (
              <Button
                variant="success"
                size="sm"
                iconLeft={<ShieldCheck className="h-3.5 w-3.5" />}
                onClick={() => void onChanged('Template approved', () => libraryService.approve(p.id, actor))}
              >
                Approve version
              </Button>
            )}
            {canManage && canApprove && p.status === 'Approved' && (
              <Button
                variant="warning"
                size="sm"
                iconLeft={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() => void onChanged('Template retired', () => libraryService.retire(p.id, actor))}
              >
                Retire template
              </Button>
            )}
            {!canManage && (
              <span className="self-center text-[10px] text-ink-secondary">
                Template maintenance requires the demo <em>manage-library</em> permission (Spec §19).
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Procedures */}
      <Card>
        <CardHeader title={`Procedures (${p.procedures.length})`} subtitle="Instantiated into an examination's work programme when the template is selected." />
        <CardBody className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="overline border-b border-line bg-page">
                <th className="px-5 py-2.5">Code</th>
                <th className="px-3 py-2.5">Title / objective</th>
                <th className="px-3 py-2.5">Testing method</th>
                <th className="px-3 py-2.5">Suggested sample</th>
                <th className="px-3 py-2.5">Priority</th>
              </tr>
            </thead>
            <tbody>
              {p.procedures.map((pr) => (
                <tr key={pr.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-mono text-[10px] font-semibold text-primary">{pr.code}</td>
                  <td className="max-w-96 px-3 py-2.5">
                    <p className="font-medium text-ink">{pr.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-secondary">{pr.objective}</p>
                  </td>
                  <td className="px-3 py-2.5 text-ink-secondary">{pr.testingMethod}</td>
                  <td className="px-3 py-2.5 text-ink-secondary">{pr.suggestedSample}</td>
                  <td className="px-3 py-2.5"><PriorityBadge priority={pr.priority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.procedures.length === 0 && (
            <p className="px-5 py-4 text-xs text-ink-secondary">
              No procedures yet — draft templates can be extended via the template editor in a full implementation;
              the prototype demonstrates editing of guidance fields.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Version history */}
      <Card>
        <CardHeader title="Version history" subtitle="Lifecycle transitions and revisions recorded for this template." />
        <CardBody>
          <ol className="relative flex flex-col gap-3 border-l border-line pl-5">
            {p.versionHistory.map((v, i) => (
              <li key={`${v.version}-${i}`} className="relative">
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute top-1 -left-[26px] h-3 w-3 rounded-full border-2 border-card',
                    v.status === 'Approved' ? 'bg-success' : v.status === 'Retired' ? 'bg-gray-400' : v.status === 'Under Review' ? 'bg-warning' : 'bg-primary',
                  )}
                />
                <p className="text-xs font-semibold text-ink">
                  {v.version} <StatusBadge status={v.status} tone={STATUS_TONES[v.status]} />
                  <span className="ml-2 font-normal text-ink-secondary">{v.authorName} · {formatDate(v.at)}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">{v.changeNote}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template editor (Spec §7.5 "template editor")
// ---------------------------------------------------------------------------

function TemplateEditorModal({
  open,
  programme,
  actorName,
  onClose,
  onSaved,
}: {
  open: boolean
  programme: LibraryProgramme
  actorName: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const actor = useActor()
  const [title, setTitle] = useState(programme.title)
  const [objectives, setObjectives] = useState(programme.objectives)
  const [scopeGuidance, setScopeGuidance] = useState(programme.scopeGuidance)
  const [evidence, setEvidence] = useState(programme.evidenceRequirements.join('\n'))
  const [methodology, setMethodology] = useState(programme.testingMethodology)
  const [scoring, setScoring] = useState(programme.scoringGuidance)
  const [mapping, setMapping] = useState(programme.regulatoryMapping.map((m) => `${m.reference} | ${m.title}`).join('\n'))
  const [owner, setOwner] = useState(programme.ownerName)
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(programme.title)
    setObjectives(programme.objectives)
    setScopeGuidance(programme.scopeGuidance)
    setEvidence(programme.evidenceRequirements.join('\n'))
    setMethodology(programme.testingMethodology)
    setScoring(programme.scoringGuidance)
    setMapping(programme.regulatoryMapping.map((m) => `${m.reference} | ${m.title}`).join('\n'))
    setOwner(programme.ownerName)
    setChangeNote('')
  }, [open, programme])

  const handleSave = async () => {
    if (!changeNote.trim()) {
      toast.error('Change note required', 'Version history entries need a change note (Spec §7.5).')
      return
    }
    setSaving(true)
    try {
      await libraryService.update(
        programme.id,
        {
          title: title.trim(),
          objectives: objectives.trim(),
          scopeGuidance: scopeGuidance.trim(),
          evidenceRequirements: evidence.split('\n').map((s) => s.trim()).filter(Boolean),
          testingMethodology: methodology.trim(),
          scoringGuidance: scoring.trim(),
          regulatoryMapping: mapping
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((line) => {
              const [reference, ...rest] = line.split('|')
              return { reference: reference.trim(), title: rest.join('|').trim() || reference.trim() }
            }),
          ownerName: owner.trim() || actorName,
        },
        changeNote.trim(),
        actor,
      )
      await onSaved()
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The template could not be updated in the prototype.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit template — ${programme.code} ${programme.version}`} size="xl">
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
          Editing guidance fields records a version-history entry. Procedure-level editing belongs to a full
          implementation; the prototype demonstrates the editor surface (Spec §7.5). Status transitions use the
          lifecycle buttons on the detail view.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Template title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextInput label="Owner" required value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <TextArea label="Objectives" rows={2} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
        <TextArea label="Scope guidance" rows={2} value={scopeGuidance} onChange={(e) => setScopeGuidance(e.target.value)} />
        <TextArea
          label="Evidence requirements (one per line)"
          rows={3}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
        />
        <TextArea label="Testing methodology" rows={2} value={methodology} onChange={(e) => setMethodology(e.target.value)} />
        <TextArea label="Scoring guidance" rows={2} value={scoring} onChange={(e) => setScoring(e.target.value)} />
        <TextArea
          label="Regulatory mapping (one per line: reference | title)"
          rows={3}
          value={mapping}
          onChange={(e) => setMapping(e.target.value)}
          help="Demo references only — fictional regulatory instruments."
        />
        <TextInput
          label="Change note"
          required
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="Recorded in the version history, e.g. Clarified sampling expectations."
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
