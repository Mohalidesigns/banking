import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  AlertOctagon,
  Check,
  ChevronLeft,
  FilePlus2,
  MessageSquarePlus,
  Paperclip,
  Play,
  RotateCcw,
  Save,
  Send,
} from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { examinationService } from '@/services/mock/MockExaminationService'
import { evidenceService } from '@/services/mock/MockEvidenceService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type {
  ExaminationDetail,
  ExaminationProcedure,
  EvidenceItem,
  ProcedureResult,
} from '@/types/examination'
import type { RaiseFindingInput } from '@/types/finding'
import type { RiskRating } from '@/types/common'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Examination Workspace (Spec §7.4) — the primary daily-use screen.
 * Three panels: left domain/procedure tree, centre the selected procedure's
 * test form with every specified field and the five result states, right
 * evidence / samples / comments / review status. Role-gated interactions:
 * mark started, save draft, add evidence, add samples, raise finding from
 * exception, submit for review, return for rework, approve. Unsaved changes
 * block in-app navigation (useBlocker) and warn on browser unload.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  'Not Started': 'draft',
  'In Progress': 'active',
  'Draft Saved': 'draft',
  'Submitted for Review': 'reporting',
  'Returned for Rework': 'overdue',
  Approved: 'active',
  'Pending Review': 'planning',
  Reviewed: 'active',
  Rejected: 'overdue',
}

const RESULT_TONES: Record<ProcedureResult, StatusTone> = {
  Pass: 'active',
  Fail: 'overdue',
  Partial: 'fieldwork',
  'Not Applicable': 'closed',
  'Not Tested': 'draft',
}

const RESULTS: ProcedureResult[] = ['Pass', 'Fail', 'Partial', 'Not Applicable', 'Not Tested']

const FINDING_CATEGORIES: RaiseFindingInput['category'][] = [
  'Credit',
  'Liquidity',
  'Governance',
  'AML/CFT',
  'Cybersecurity',
  'Operations',
  'Consumer Protection',
  'Capital',
]

interface FormState {
  result: ProcedureResult
  exceptionDetails: string
  conclusion: string
  severity: RiskRating | ''
  sampleSize: string
  population: string
  ownerName: string
}

const formOf = (p: ExaminationProcedure): FormState => ({
  result: p.result,
  exceptionDetails: p.exceptionDetails ?? '',
  conclusion: p.conclusion ?? '',
  severity: p.severity ?? '',
  sampleSize: String(p.sampleSize),
  population: p.population,
  ownerName: p.ownerName,
})

const formEqual = (a: FormState, b: FormState): boolean =>
  a.result === b.result &&
  a.exceptionDetails === b.exceptionDetails &&
  a.conclusion === b.conclusion &&
  a.severity === b.severity &&
  a.sampleSize === b.sampleSize &&
  a.population === b.population &&
  a.ownerName === b.ownerName

export function ExaminationWorkspacePage() {
  const { examinationId } = useParams<{ examinationId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const actor = useActor()
  const canFieldwork = can(actor.actorRole, 'record-fieldwork')
  const canReview = can(actor.actorRole, 'review-procedures')
  const canApprove = can(actor.actorRole, 'approve-results')
  const canRaise = can(actor.actorRole, 'raise-finding')

  const [exam, setExam] = useState<ExaminationDetail | null | undefined>(undefined)
  const [procedures, setProcedures] = useState<ExaminationProcedure[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('procedure'))
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [savedForm, setSavedForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sampleOpen, setSampleOpen] = useState(false)
  const [sampleDraft, setSampleDraft] = useState({ label: '', population: '', outcome: 'Satisfactory' as 'Satisfactory' | 'Exception', note: '' })
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceDraft, setEvidenceDraft] = useState({ title: '', fileName: '', category: 'System report', confidentiality: 'Confidential' as EvidenceItem['confidentiality'] })
  const [findingOpen, setFindingOpen] = useState(false)
  const [findingDraft, setFindingDraft] = useState({
    title: '',
    category: 'AML/CFT' as RaiseFindingInput['category'],
    riskRating: 'High' as RiskRating,
    condition: '',
    criteria: '',
    cause: '',
    consequence: '',
    recommendation: '',
    severityRationale: '',
    breachClassification: 'Deficiency' as RaiseFindingInput['breachClassification'],
    regulatoryReference: '',
    institutionOwnerName: '',
    institutionOwnerRole: '',
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  })
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState('')

  const load = useCallback(async () => {
    if (!examinationId) return
    const detail = await examinationService.getDetail(examinationId)
    setExam(detail ?? null)
    if (!detail) return
    const [procs, ev] = await Promise.all([
      examinationService.procedures(detail.id),
      evidenceService.byExamination(detail.id),
    ])
    setProcedures(procs)
    setEvidence(ev)
    setSelectedId((prev) => {
      const valid = prev && procs.some((p) => p.id === prev) ? prev : procs[0]?.id ?? null
      return valid
    })
  }, [examinationId])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => procedures.find((p) => p.id === selectedId) ?? null,
    [procedures, selectedId],
  )

  // Load the form when the selection changes or the data reloads — resets
  // the dirty baseline so switching procedures never carries edits across.
  useEffect(() => {
    if (!selected) {
      setForm(null)
      setSavedForm(null)
      return
    }
    const next = formOf(selected)
    setForm(next)
    setSavedForm(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, procedures])

  const dirty = form !== null && savedForm !== null && !formEqual(form, savedForm)

  // Unsaved-state protection (Spec §7.4): block in-app navigation + warn on unload.
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const handler = (ev: BeforeUnloadEvent) => {
      ev.preventDefault()
      ev.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const [selectConfirmOpen, setSelectConfirmOpen] = useState(false)
  const pendingSelectRef = useRef<string | null>(null)

  const selectProcedure = (id: string) => {
    if (id === selectedId) return
    if (dirty) {
      // Route through the same confirm dialog as navigation.
      pendingSelectRef.current = id
      setSelectConfirmOpen(true)
      return
    }
    applySelect(id)
  }

  const applySelect = (id: string) => {
    setSelectedId(id)
    setSearchParams({ procedure: id }, { replace: true })
  }

  const procedureEvidence = useMemo(
    () =>
      selected
        ? evidence.filter((ev) => ev.procedureId === selected.id || ev.linkedProcedureIds.includes(selected.id))
        : [],
    [evidence, selected],
  )

  // Group procedures by domain for the left tree (hook must run on every
  // render path — kept above the early returns).
  const tree = useMemo(() => {
    const byDomain = new Map<string, ExaminationProcedure[]>()
    for (const p of procedures) {
      const list = byDomain.get(p.domainName) ?? []
      list.push(p)
      byDomain.set(p.domainName, list)
    }
    return Array.from(byDomain.entries())
  }, [procedures])

  if (exam === undefined) {
    return <LoadingSkeleton rows={12} className="rounded-xl border border-line bg-card" />
  }

  if (exam === null) {
    return (
      <div>
        <PageHeader title="Examination not found" />
        <ErrorState
          title="Unknown examination"
          message={`No examination with id "${examinationId}" exists in the demo dataset.`}
          onRetry={() => navigate('/app/examinations')}
          retryLabel="Back to register"
        />
      </div>
    )
  }

  const e = exam
  const locked = !canFieldwork || !form || !selected
  const approved = selected?.status === 'Approved'
  const inReview = selected?.status === 'Submitted for Review'

  const runAction = async (label: string, fn: () => Promise<unknown>, then?: () => void) => {
    setBusy(true)
    try {
      await fn()
      await load()
      toast.success('Demo action completed', `${label} — saved in prototype session.`)
      then?.()
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', `${label} could not be completed in the prototype.`)
    } finally {
      setBusy(false)
    }
  }

  const resultInput = () => ({
    result: form!.result,
    exceptionDetails: form!.exceptionDetails.trim() || undefined,
    conclusion: form!.conclusion.trim() || undefined,
    severity: (form!.severity || undefined) as RiskRating | undefined,
    sampleSize: Number(form!.sampleSize) || undefined,
    population: form!.population.trim() || undefined,
    ownerName: form!.ownerName.trim() || undefined,
  })

  const handleSaveDraft = () =>
    runAction(`Procedure ${selected!.code} draft saved`, () =>
      examinationService.saveProcedureDraft(selected!.id, resultInput(), actor),
    )

  const handleSubmit = () => {
    if (form!.result === 'Not Tested') {
      toast.error('Result required', 'Record a result (pass/fail/partial/not applicable) before submitting for review.')
      return
    }
    if ((form!.result === 'Fail' || form!.result === 'Partial') && form!.exceptionDetails.trim() === '') {
      toast.error('Exception details required', 'A Fail or Partial result must document the exception (§7.4).')
      return
    }
    runAction(`Procedure ${selected!.code} submitted for review`, () =>
      examinationService.submitProcedure(selected!.id, resultInput(), actor),
    )
  }

  const handleRaiseFinding = () => {
    setFindingDraft((prev) => ({
      ...prev,
      title: prev.title || `${selected!.code}: ${selected!.title} — exception`,
      condition: prev.condition || form!.exceptionDetails,
      criteria: prev.criteria || selected!.regulatoryCriteria,
      recommendation: prev.recommendation || form!.conclusion,
      severityRationale: prev.severityRationale || `Severity ${form!.severity || 'High'} per the procedure result and exception scope (demo rationale).`,
      regulatoryReference: prev.regulatoryReference || selected!.regulatoryCriteria,
    }))
    setFindingOpen(true)
  }

  const submitFinding = async () => {
    const d = findingDraft
    if (!d.title.trim() || !d.condition.trim() || !d.criteria.trim() || !d.institutionOwnerName.trim()) {
      toast.error('Incomplete finding', 'Title, condition, criteria and the institution owner are required (five-Cs).')
      return
    }
    setBusy(true)
    try {
      const created = await examinationService.raiseFindingFromProcedure(
        selected!.id,
        {
          institutionId: e.institutionId,
          examinationId: e.id,
          examinationRef: e.reference,
          procedureId: selected!.id,
          procedureCode: selected!.code,
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
          severityRationale: d.severityRationale.trim(),
          breachClassification: d.breachClassification,
          regulatoryReference: d.regulatoryReference.trim() || 'Demo regulatory reference',
          institutionOwnerName: d.institutionOwnerName.trim(),
          institutionOwnerRole: d.institutionOwnerRole.trim() || 'Accountable executive (demo role)',
          crossDomainLinks: [],
          evidenceLinks: procedureEvidence.map((ev) => ({ evidenceId: ev.id, reference: ev.reference, description: ev.title })),
          dueDate: d.dueDate,
        },
        actor,
      )
      setFindingOpen(false)
      await load()
      toast.success('Finding raised', `${created.reference} created from ${selected!.code} and queued for review — saved in prototype session.`)
      navigate(`/app/findings/${created.id}`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The finding could not be raised in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        className="mb-3"
        title={
          <span className="flex flex-wrap items-center gap-2 text-lg">
            <span className="font-mono text-primary">{e.reference}</span>
            <span className="font-semibold text-ink">Fieldwork Workspace</span>
            <StatusBadge status={e.status} tone={STATUS_TONES[e.status] ?? 'draft'} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{e.title}</span>
            {dirty && (
              <span className="rounded-full bg-tint-orange px-2 py-0.5 text-[9px] font-semibold text-warning uppercase">
                Unsaved changes
              </span>
            )}
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo fieldwork
            </span>
          </span>
        }
        breadcrumbs={[
          { label: 'Examination Register', path: '/app/examinations' },
          { label: e.reference, path: `/app/examinations/${e.id}` },
          { label: 'Workspace' },
        ]}
        actions={
          <>
            {dirty && (
              <span className="text-[11px] text-warning" role="status">
                Unsaved procedure edits in this session
              </span>
            )}
            <Button variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate(`/app/examinations/${e.id}`)}>
              Examination detail
            </Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        {/* LEFT — domain / procedure tree */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader title="Work programme" subtitle={`${procedures.filter((p) => p.status === 'Approved').length}/${procedures.length} approved`} />
          <CardBody className="min-h-0 flex-1 overflow-y-auto p-2">
            {tree.map(([domain, procs]) => (
              <div key={domain} className="mb-2">
                <p className="overline px-2 py-1">{domain}</p>
                <ul>
                  {procs.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectProcedure(p.id)}
                        aria-current={selectedId === p.id ? 'true' : undefined}
                        className={cx(
                          'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                          selectedId === p.id ? 'bg-primary text-white' : 'text-ink hover:bg-page',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cx(
                            'h-2 w-2 shrink-0 rounded-full',
                            p.status === 'Approved' ? 'bg-success'
                              : p.status === 'Submitted for Review' ? 'bg-purple'
                              : p.status === 'Returned for Rework' ? 'bg-error'
                              : p.status === 'Not Started' ? 'bg-gray-300'
                              : 'bg-warning',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={cx('block truncate font-mono text-[10px] font-semibold', selectedId === p.id ? 'text-white' : 'text-primary')}>
                            {p.code}
                          </span>
                          <span className={cx('block truncate text-[11px]', selectedId === p.id ? 'text-white/90' : 'text-ink-secondary')}>
                            {p.title}
                          </span>
                        </span>
                        <span className={cx('shrink-0 text-[9px] font-semibold', selectedId === p.id ? 'text-white/80' : 'text-ink-tertiary')}>
                          {p.result !== 'Not Tested' ? p.result : p.status === 'Approved' ? '✓' : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {procedures.length === 0 && (
              <p className="px-2 py-4 text-xs text-ink-secondary">
                No procedures in this examination — the work programme is built from approved library templates in
                the create wizard.
              </p>
            )}
          </CardBody>
        </Card>

        {/* CENTRE — procedure test form */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          {selected === null || form === null ? (
            <CardBody>
              <p className="text-xs text-ink-secondary">Select a procedure from the work programme tree.</p>
            </CardBody>
          ) : (
            <>
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-primary">{selected.code}</span>
                    {selected.title}
                    <StatusBadge status={selected.status} tone={STATUS_TONES[selected.status]} />
                    {selected.result !== 'Not Tested' && <StatusBadge status={selected.result} tone={RESULT_TONES[selected.result]} />}
                  </span>
                }
                subtitle={`${selected.domainName} · ${selected.programmeTitle}${selected.custom ? ' · custom procedure' : ''}`}
              />
              <CardBody className="min-h-0 flex-1 overflow-y-auto">
                {/* Read-only procedure definition (§7.4 fields) */}
                <dl className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div className="md:col-span-2">
                    <dt className="overline">Objective</dt>
                    <dd className="mt-0.5 leading-relaxed text-ink">{selected.objective}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="overline">Examination question</dt>
                    <dd className="mt-0.5 leading-relaxed text-ink">{selected.question}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="overline">Detailed steps</dt>
                    <dd className="mt-0.5">
                      <ol className="list-inside list-decimal space-y-0.5 text-ink-secondary">
                        {selected.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </dd>
                  </div>
                  <div>
                    <dt className="overline">Regulatory criteria (demo)</dt>
                    <dd className="mt-0.5 text-ink">{selected.regulatoryCriteria}</dd>
                  </div>
                  <div>
                    <dt className="overline">Testing method</dt>
                    <dd className="mt-0.5 text-ink">{selected.testingMethod}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="overline">Required evidence</dt>
                    <dd className="mt-0.5 flex flex-wrap gap-1.5">
                      {selected.requiredEvidence.map((r) => (
                        <span key={r} className="rounded-full bg-page px-2 py-0.5 text-[10px] text-ink-secondary">{r}</span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="overline">Due date</dt>
                    <dd className="mt-0.5 text-ink">{formatDate(selected.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="overline">Priority</dt>
                    <dd className="mt-0.5"><PriorityBadge priority={selected.priority} /></dd>
                  </div>
                  {selected.linkedFindingRef && (
                    <div className="md:col-span-2">
                      <dt className="overline">Linked finding</dt>
                      <dd className="mt-0.5">
                        <button
                          type="button"
                          className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
                          onClick={() => navigate(`/app/findings/${selected.linkedFindingId}`)}
                        >
                          {selected.linkedFindingRef}
                        </button>
                        <span className="ml-2 text-[10px] text-ink-secondary">raised from this procedure's exception</span>
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Test form */}
                <div className="mt-5 border-t border-line pt-4">
                  <p className="overline">Test result</p>
                  <fieldset disabled={locked || approved || inReview} className="mt-1.5">
                    <legend className="sr-only">Procedure result</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {RESULTS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={form.result === r}
                          disabled={locked || approved || inReview}
                          onClick={() => setForm({ ...form, result: r })}
                          className={cx(
                            'rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                            form.result === r
                              ? r === 'Pass' ? 'border-success bg-success text-white'
                                : r === 'Fail' ? 'border-error bg-error text-white'
                                : r === 'Partial' ? 'border-warning bg-warning text-white'
                                : 'border-primary bg-primary text-white'
                              : 'border-line bg-card text-ink-secondary hover:border-primary-surface disabled:cursor-not-allowed',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <TextInput
                      label="Examiner (owner)"
                      value={form.ownerName}
                      disabled={locked || approved || inReview}
                      onChange={(ev) => setForm({ ...form, ownerName: ev.target.value })}
                    />
                    <TextInput
                      label="Sample size"
                      type="number"
                      min={0}
                      value={form.sampleSize}
                      disabled={locked || approved || inReview}
                      onChange={(ev) => setForm({ ...form, sampleSize: ev.target.value })}
                    />
                    <TextInput
                      label="Sample population"
                      value={form.population}
                      disabled={locked || approved || inReview}
                      onChange={(ev) => setForm({ ...form, population: ev.target.value })}
                    />
                    <Select
                      label="Risk / severity (if exception)"
                      value={form.severity}
                      disabled={locked || approved || inReview}
                      onChange={(ev) => setForm({ ...form, severity: ev.target.value as RiskRating | '' })}
                      placeholder="Not set"
                      options={['Critical', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))}
                    />
                  </div>

                  <TextArea
                    className="mt-3"
                    label="Exception details"
                    rows={3}
                    value={form.exceptionDetails}
                    disabled={locked || approved || inReview}
                    onChange={(ev) => setForm({ ...form, exceptionDetails: ev.target.value })}
                    placeholder="What failed the test? Quantify where possible (demo)."
                    help={form.result === 'Fail' || form.result === 'Partial' ? 'Required for Fail/Partial results before submitting for review.' : undefined}
                  />
                  <TextArea
                    className="mt-3"
                    label="Conclusion"
                    rows={2}
                    value={form.conclusion}
                    disabled={locked || approved || inReview}
                    onChange={(ev) => setForm({ ...form, conclusion: ev.target.value })}
                    placeholder="Examiner conclusion on this procedure (demo)."
                  />

                  {/* Reviewer comments (read trail) */}
                  {selected.comments.filter((c) => c.kind === 'reviewer').length > 0 && (
                    <div className="mt-3 rounded-lg border border-line bg-page p-3">
                      <p className="overline">Reviewer comments</p>
                      <ul className="mt-1.5 flex flex-col gap-2">
                        {selected.comments.filter((c) => c.kind === 'reviewer').map((c) => (
                          <li key={c.id} className="text-[11px]">
                            <p className="text-ink">{c.text}</p>
                            <p className="text-[10px] text-ink-secondary">{c.author} · {formatRelativeTime(c.at)}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardBody>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
                <p className="text-[10px] text-ink-secondary">
                  {approved
                    ? 'Approved results are read-only (demo workflow).'
                    : inReview
                      ? 'Awaiting reviewer decision — editing locked.'
                      : canFieldwork
                        ? 'Record testing, then save a draft or submit for review.'
                        : `The "${actor.actorRole}" demo role has read-only fieldwork access (Spec §19).`}
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  {canFieldwork && selected.status === 'Not Started' && (
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={<Play className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => runAction(`Procedure ${selected.code} started`, () => examinationService.startProcedure(selected.id, actor))}
                    >
                      Mark started
                    </Button>
                  )}
                  {canFieldwork && !approved && !inReview && (
                    <>
                      <Button variant="outline" size="sm" iconLeft={<Save className="h-3.5 w-3.5" />} disabled={busy || !dirty} onClick={handleSaveDraft}>
                        Save draft
                      </Button>
                      <Button
                        variant="warning"
                        size="sm"
                        iconLeft={<AlertOctagon className="h-3.5 w-3.5" />}
                        disabled={busy || selected.linkedFindingRef !== undefined || (form.result !== 'Fail' && form.result !== 'Partial')}
                        title={
                          selected.linkedFindingRef
                            ? 'A finding is already linked to this procedure'
                            : form.result === 'Fail' || form.result === 'Partial'
                              ? 'Raise a finding from the recorded exception'
                              : 'Set a Fail or Partial result with exception details first'
                        }
                        onClick={handleRaiseFinding}
                      >
                        Raise finding
                      </Button>
                      <Button variant="primary" size="sm" iconLeft={<Send className="h-3.5 w-3.5" />} disabled={busy} onClick={handleSubmit}>
                        Submit for review
                      </Button>
                    </>
                  )}
                  {canReview && inReview && (
                    <Button variant="outline" size="sm" iconLeft={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { setReturnComment(''); setReturnOpen(true) }}>
                      Return for rework
                    </Button>
                  )}
                  {canApprove && inReview && (
                    <Button
                      variant="success"
                      size="sm"
                      iconLeft={<Check className="h-3.5 w-3.5" />}
                      disabled={busy}
                      onClick={() => runAction(`Procedure ${selected.code} approved (${selected.result})`, () =>
                        examinationService.approveProcedure(selected.id, actor, 'Approved from the fieldwork workspace (demo).'),
                      )}
                    >
                      Approve result
                    </Button>
                  )}
                  {canReview && inReview && !canApprove && (
                    <span className="self-center text-[10px] text-ink-secondary">
                      Approval needs the demo <em>approve-results</em> permission (Team Lead+).
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* RIGHT — evidence / samples / comments / review */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Card>
            <CardHeader
              title="Evidence"
              subtitle={selected ? `${procedureEvidence.length} item(s) linked to ${selected.code}` : undefined}
              action={
                canFieldwork && selected ? (
                  <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => setEvidenceOpen(true)}>
                    <Paperclip className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Add
                  </button>
                ) : undefined
              }
            />
            <CardBody>
              {procedureEvidence.length === 0 ? (
                <p className="text-xs text-ink-secondary">No evidence linked to this procedure yet (demo).</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {procedureEvidence.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        className="w-full cursor-pointer rounded-lg border border-line p-2.5 text-left hover:border-primary-surface"
                        onClick={() => navigate(`/app/evidence?highlight=${ev.id}`)}
                      >
                        <p className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-semibold text-primary">{ev.reference}</span>
                          <StatusBadge status={ev.reviewStatus} tone={STATUS_TONES[ev.reviewStatus]} />
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-ink">{ev.title}</p>
                        <p className="mt-0.5 text-[9px] text-ink-secondary">
                          {ev.confidentiality} · {ev.category} · {formatRelativeTime(ev.uploadedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Sample records"
              subtitle={selected ? `${selected.samples.length} recorded` : undefined}
              action={
                canFieldwork && selected && !approved ? (
                  <button type="button" className="cursor-pointer text-xs font-medium text-primary hover:underline" onClick={() => setSampleOpen(true)}>
                    <FilePlus2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Add
                  </button>
                ) : undefined
              }
            />
            <CardBody>
              {selected && selected.samples.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {selected.samples.map((s) => (
                    <li key={s.id} className="rounded-lg bg-page px-2.5 py-1.5 text-[11px]">
                      <p className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{s.label}</span>
                        <StatusBadge status={s.outcome} tone={s.outcome === 'Exception' ? 'overdue' : 'active'} />
                      </p>
                      <p className="text-[9px] text-ink-secondary">{s.population}{s.note ? ` · ${s.note}` : ''}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-secondary">No sample records yet (demo).</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Comments" subtitle={selected ? `${selected.comments.length} comment(s)` : undefined} />
            <CardBody>
              {selected && selected.comments.length > 0 && (
                <ul className="mb-3 flex flex-col gap-2">
                  {selected.comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-page px-2.5 py-1.5">
                      <p className="text-[11px] text-ink">{c.text}</p>
                      <p className="text-[9px] text-ink-secondary">
                        {c.author} · {formatRelativeTime(c.at)}
                        {c.kind === 'reviewer' && ' · reviewer'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {canFieldwork && selected && !approved && (
                <div className="flex gap-2">
                  <TextInput
                    aria-label="Add a comment"
                    placeholder="Add a working comment…"
                    value={commentText}
                    onChange={(ev) => setCommentText(ev.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Post comment"
                    disabled={!commentText.trim() || busy}
                    onClick={() => {
                      const text = commentText.trim()
                      setCommentText('')
                      void runAction('Comment added', () => examinationService.addProcedureComment(selected.id, text, actor))
                    }}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Review status" />
            <CardBody>
              {selected ? (
                <div className="flex flex-col gap-2 text-xs">
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Procedure status</span>
                    <StatusBadge status={selected.status} tone={STATUS_TONES[selected.status]} />
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Recorded result</span>
                    <StatusBadge status={selected.result} tone={RESULT_TONES[selected.result]} />
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-ink-secondary">Examination progress</span>
                    <span className="w-24"><ProgressBar value={e.progressPct} showValue label="Progress" /></span>
                  </p>
                  {selected.startedAt && (
                    <p className="text-[10px] text-ink-secondary">Started {formatRelativeTime(selected.startedAt)}</p>
                  )}
                  {selected.completedAt && (
                    <p className="text-[10px] text-ink-secondary">Last completed {formatRelativeTime(selected.completedAt)}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">Select a procedure.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Navigation blocker (unsaved changes) */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        variant="warning"
        title="Unsaved procedure changes"
        message="This procedure test form has edits that were not saved in the prototype session. Leaving discards them."
        confirmLabel="Discard and leave"
        cancelLabel="Stay and keep editing"
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      />

      {/* Procedure-switch blocker */}
      <ConfirmDialog
        open={selectConfirmOpen}
        variant="warning"
        title="Unsaved procedure changes"
        message="Switching procedures discards the unsaved edits on this test form (prototype session)."
        confirmLabel="Discard and switch"
        cancelLabel="Stay"
        onConfirm={() => {
          const id = pendingSelectRef.current
          setSelectConfirmOpen(false)
          pendingSelectRef.current = null
          if (id) applySelect(id)
        }}
        onClose={() => {
          setSelectConfirmOpen(false)
          pendingSelectRef.current = null
        }}
      />

      {/* Add sample modal */}
      <Modal open={sampleOpen} onClose={() => setSampleOpen(false)} title={`Add sample record — ${selected?.code ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <TextInput
            label="Sample label"
            required
            value={sampleDraft.label}
            onChange={(ev) => setSampleDraft({ ...sampleDraft, label: ev.target.value })}
            placeholder="e.g. File 07/25 — corporate overdraft"
          />
          <TextInput
            label="Population"
            value={sampleDraft.population}
            onChange={(ev) => setSampleDraft({ ...sampleDraft, population: ev.target.value })}
            placeholder={selected?.population ?? 'Sample population (demo)'}
          />
          <Select
            label="Outcome"
            value={sampleDraft.outcome}
            onChange={(ev) => setSampleDraft({ ...sampleDraft, outcome: ev.target.value as 'Satisfactory' | 'Exception' })}
            options={[
              { value: 'Satisfactory', label: 'Satisfactory' },
              { value: 'Exception', label: 'Exception' },
            ]}
          />
          <TextInput
            label="Note (optional)"
            value={sampleDraft.note}
            onChange={(ev) => setSampleDraft({ ...sampleDraft, note: ev.target.value })}
            placeholder="Short observation (demo)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSampleOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!sampleDraft.label.trim() || busy}
              loading={busy}
              onClick={() => {
                const d = sampleDraft
                setSampleOpen(false)
                setSampleDraft({ label: '', population: '', outcome: 'Satisfactory', note: '' })
                void runAction('Sample record added', () =>
                  examinationService.addSample(selected!.id, { label: d.label.trim(), population: d.population.trim() || selected!.population, outcome: d.outcome, note: d.note.trim() || undefined }, actor),
                )
              }}
            >
              Add sample
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add evidence modal (simulated upload) */}
      <Modal open={evidenceOpen} onClose={() => setEvidenceOpen(false)} title={`Add evidence — ${selected?.code ?? ''}`} size="md">
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Simulated upload — the prototype records metadata only; no file is stored anywhere and the integrity
            hash is a placeholder (Spec §1.1/§7.6).
          </p>
          <TextInput
            label="Evidence title"
            required
            value={evidenceDraft.title}
            onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, title: ev.target.value })}
            placeholder="e.g. Alert queue extract — October 2026"
          />
          <TextInput
            label="File name (demo)"
            required
            value={evidenceDraft.fileName}
            onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, fileName: ev.target.value })}
            placeholder="e.g. alert-queue-oct-2026.csv"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={evidenceDraft.category}
              onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, category: ev.target.value })}
              options={['System report', 'Policy document', 'Working paper', 'Sample population', 'Remediation evidence', 'Correspondence'].map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Confidentiality"
              value={evidenceDraft.confidentiality}
              onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, confidentiality: ev.target.value as EvidenceItem['confidentiality'] })}
              options={['Public', 'Internal', 'Confidential', 'Restricted'].map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEvidenceOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!evidenceDraft.title.trim() || !evidenceDraft.fileName.trim() || busy}
              loading={busy}
              onClick={() => {
                const d = evidenceDraft
                setEvidenceOpen(false)
                void (async () => {
                  setBusy(true)
                  try {
                    const uploaded = await evidenceService.upload(
                      {
                        title: d.title.trim(),
                        fileName: d.fileName.trim(),
                        mimeType: 'application/octet-stream',
                        sizeKb: 256,
                        institutionId: e.institutionId,
                        examinationId: e.id,
                        examinationRef: e.reference,
                        procedureId: selected!.id,
                        domainName: selected!.domainName,
                        category: d.category,
                        confidentiality: d.confidentiality,
                        sourceDescription: `Uploaded from the fieldwork workspace for procedure ${selected!.code} (simulated, demo)`,
                      },
                      actor,
                    )
                    await examinationService.attachEvidence(selected!.id, uploaded.id, actor)
                    await load()
                    toast.success('Evidence added', `${uploaded.reference} linked to ${selected!.code} — saved in prototype session (simulated upload).`)
                    setEvidenceDraft({ title: '', fileName: '', category: 'System report', confidentiality: 'Confidential' })
                  } catch (err) {
                    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
                    else toast.error('Demo action failed', 'The evidence could not be added in the prototype.')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              Upload & link (demo)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return-for-rework modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title={`Return ${selected?.code ?? ''} for rework`} size="md">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Reviewer comment"
            required
            rows={3}
            value={returnComment}
            onChange={(ev) => setReturnComment(ev.target.value)}
            placeholder="What must the examiner revise or complete? (demo)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              disabled={returnComment.trim() === '' || busy}
              loading={busy}
              onClick={() => {
                const comment = returnComment.trim()
                setReturnOpen(false)
                void runAction(`Procedure ${selected!.code} returned for rework`, () =>
                  examinationService.returnProcedure(selected!.id, actor, comment),
                )
              }}
            >
              Return for rework
            </Button>
          </div>
        </div>
      </Modal>

      {/* Raise-finding modal (five-Cs prefilled from the exception) */}
      <Modal open={findingOpen} onClose={() => setFindingOpen(false)} title={`Raise finding from ${selected?.code ?? ''} exception`} size="lg">
        <div className="flex flex-col gap-3">
          {!canRaise && (
            <p className="rounded-lg bg-tint-red px-3 py-2 text-[11px] text-error">
              The "{actor.actorRole}" demo role cannot raise findings (Spec §19).
            </p>
          )}          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Finding title"
              required
              value={findingDraft.title}
              onChange={(ev) => setFindingDraft({ ...findingDraft, title: ev.target.value })}
            />
            <Select
              label="Domain / category"
              value={findingDraft.category}
              onChange={(ev) => setFindingDraft({ ...findingDraft, category: ev.target.value as RaiseFindingInput['category'] })}
              options={FINDING_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Severity"
              value={findingDraft.riskRating}
              onChange={(ev) => setFindingDraft({ ...findingDraft, riskRating: ev.target.value as RiskRating })}
              options={['Critical', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))}
            />
            <Select
              label="Breach classification"
              value={findingDraft.breachClassification}
              onChange={(ev) => setFindingDraft({ ...findingDraft, breachClassification: ev.target.value as RaiseFindingInput['breachClassification'] })}
              options={['Breach', 'Deficiency', 'Observation', 'Good Practice'].map((s) => ({ value: s, label: s }))}
            />
          </div>
          <TextArea label="Condition (what was found)" required rows={2} value={findingDraft.condition} onChange={(ev) => setFindingDraft({ ...findingDraft, condition: ev.target.value })} help="Prefilled from the procedure's exception details." />
          <TextArea label="Criteria (requirement breached)" required rows={2} value={findingDraft.criteria} onChange={(ev) => setFindingDraft({ ...findingDraft, criteria: ev.target.value })} help="Prefilled from the procedure's regulatory criteria (demo reference)." />
          <TextArea label="Cause" rows={2} value={findingDraft.cause} onChange={(ev) => setFindingDraft({ ...findingDraft, cause: ev.target.value })} />
          <TextArea label="Consequence / risk" rows={2} value={findingDraft.consequence} onChange={(ev) => setFindingDraft({ ...findingDraft, consequence: ev.target.value })} />
          <TextArea label="Recommendation / required corrective measure" rows={2} value={findingDraft.recommendation} onChange={(ev) => setFindingDraft({ ...findingDraft, recommendation: ev.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextArea label="Severity rationale" rows={2} value={findingDraft.severityRationale} onChange={(ev) => setFindingDraft({ ...findingDraft, severityRationale: ev.target.value })} />
            <TextInput
              label="Regulatory reference (demo)"
              value={findingDraft.regulatoryReference}
              onChange={(ev) => setFindingDraft({ ...findingDraft, regulatoryReference: ev.target.value })}
            />
            <TextInput
              label="Responsible institution owner"
              required
              value={findingDraft.institutionOwnerName}
              onChange={(ev) => setFindingDraft({ ...findingDraft, institutionOwnerName: ev.target.value })}
              placeholder="e.g. Grace Mbeki"
            />
            <TextInput
              label="Owner role"
              value={findingDraft.institutionOwnerRole}
              onChange={(ev) => setFindingDraft({ ...findingDraft, institutionOwnerRole: ev.target.value })}
              placeholder="e.g. Chief Compliance Officer"
            />
            <TextInput
              label="Remediation due date"
              type="date"
              value={findingDraft.dueDate}
              onChange={(ev) => setFindingDraft({ ...findingDraft, dueDate: ev.target.value })}
            />
          </div>
          <p className="rounded-lg bg-page px-3 py-2 text-[10px] text-ink-secondary">
            Linked evidence ({procedureEvidence.length} item(s)) is attached automatically. The finding is created as
            a Draft with you as raiser, appears in the findings register, and enqueues a review item in My Work
            (prototype session).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFindingOpen(false)}>Cancel</Button>
            <Button variant="danger" iconLeft={<AlertOctagon className="h-4 w-4" />} disabled={!canRaise || busy} loading={busy} onClick={() => void submitFinding()}>
              Raise finding
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
