import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  Check,
  FlaskConical,
  Gauge,
  Layers,
  Play,
  Send,
  X,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { stressTestingService } from '@/services/mock/MockPrudentialService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  SensitivityRow,
  StressRun,
  StressRunResult,
  StressScenario,
} from '@/types/prudential'
import { formatDate } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Stress Testing (Spec §8.4) — `/app/prudential/stress-testing`. Scenario
 * library with assumptions, institution selection, run creation, baseline vs
 * stressed capital/liquidity/credit results, sensitivity analysis and the
 * reviewer approval workflow. EVERY calculation is labelled illustrative
 * demo data and is never presented as an official regulatory stress-test
 * result (Spec §8.4 hard rule). Story: RUN-2026-003 (severe, approved) and
 * RUN-2026-004 (Northstar idiosyncratic funding stress from the EWA-2026-011
 * LCR story, awaiting review).
 */

const DEMO_NOTE =
  'Illustrative prototype calculations from demo assumptions — never official regulatory stress-test results (Spec §8.4).'

const SEVERITY_TONES: Record<StressScenario['severity'], StatusTone> = {
  Mild: 'active',
  Adverse: 'fieldwork',
  Severe: 'overdue',
  Systemic: 'overdue',
}

const RUN_STATUS_TONES: Record<StressRun['status'], StatusTone> = {
  Draft: 'draft',
  Submitted: 'planning',
  Approved: 'active',
  Rejected: 'overdue',
}

const VERDICT_TONES: Record<StressRunResult['verdict'], StatusTone> = {
  Pass: 'active',
  'Pass — buffer depleted': 'fieldwork',
  Breach: 'overdue',
}

export function StressTestingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const runParam = searchParams.get('run')

  return runParam ? (
    <RunDetailView runReference={runParam} onBack={() => setSearchParams({}, { replace: true })} />
  ) : (
    <StressOverviewView />
  )
}

// ---------------------------------------------------------------------------
// Overview: scenario library + run register + new-run wizard modal
// ---------------------------------------------------------------------------

function StressOverviewView() {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const actor = useActor()
  const canRun = can(actor.actorRole, 'run-stress-test')

  const [scenarios, setScenarios] = useState<StressScenario[] | null>(null)
  const [runs, setRuns] = useState<StressRun[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [activeScenario, setActiveScenario] = useState<StressScenario | null>(null)
  const [busy, setBusy] = useState(false)

  // New-run modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createScenarioId, setCreateScenarioId] = useState('')
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([])
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    const [scn, runList, instPage] = await Promise.all([
      stressTestingService.listScenarios(),
      stressTestingService.listRuns(),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setScenarios(scn)
    setRuns(runList)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const openCreate = (scenarioId?: string) => {
    setCreateScenarioId(scenarioId ?? scenarios?.find((s) => s.status === 'Published')?.id ?? '')
    setSelectedInstitutions(institutions.map((i) => i.id))
    setCreateError('')
    setCreateOpen(true)
  }

  const toggleInstitution = (id: string) => {
    setSelectedInstitutions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submitCreate = async () => {
    if (!createScenarioId) {
      setCreateError('Select a scenario (demo form).')
      return
    }
    if (selectedInstitutions.length === 0) {
      setCreateError('Select at least one institution (demo form).')
      return
    }
    setBusy(true)
    try {
      const created = await stressTestingService.createRun({ scenarioId: createScenarioId, institutionIds: selectedInstitutions }, actor)
      setCreateOpen(false)
      await load()
      if (created) {
        toast.success('Saved in prototype session', `${created.reference} created — illustrative demo calculation.`)
        setSearchParams({ run: created.reference })
      }
    } catch (err) {
      guard(err, 'The stress run could not be created in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const submitRun = async (run: StressRun) => {
    setBusy(true)
    try {
      await stressTestingService.submitRun(run.id, actor)
      await load()
      toast.success('Saved in prototype session', `${run.reference} submitted for reviewer approval.`)
    } catch (err) {
      guard(err, 'The run could not be submitted in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const runColumns = useMemo<Array<ColumnDef<StressRun, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Run',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
            onClick={() => navigate(`/app/prudential/stress-testing?run=${row.original.reference}`)}
          >
            {row.original.reference}
          </button>
        ),
      },
      {
        accessorKey: 'scenarioName',
        header: 'Scenario',
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium text-ink">{row.original.scenarioName}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.scenarioReference}</p>
          </div>
        ),
      },
      { accessorKey: 'runAt', header: 'Run date', cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatDate(row.original.runAt)}</span> },
      { accessorKey: 'runByName', header: 'Run by' },
      {
        id: 'coverage',
        header: 'Institutions',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.results.length}</span>,
      },
      {
        id: 'breaches',
        header: 'Stressed breaches',
        cell: ({ row }) => {
          const breaches = row.original.results.filter((r) => r.verdict === 'Breach').length
          return (
            <span className={cx('font-mono text-xs font-semibold', breaches > 0 ? 'text-error' : 'text-success')}>
              {breaches}
            </span>
          )
        },
      },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} tone={RUN_STATUS_TONES[row.original.status]} /> },
      { accessorKey: 'reviewerName', header: 'Reviewer', cell: ({ row }) => <span className="text-xs text-ink-secondary">{row.original.reviewerName ?? '—'}</span> },
    ],
    [navigate],
  )

  if (!scenarios || !runs) {
    return (
      <div>
        <PageHeader title="Stress Testing" subtitle="Illustrative scenario runs across the demo portfolio" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Stress Testing"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Scenario library and run results</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <Button variant="primary" iconLeft={<Play className="h-3.5 w-3.5" />} disabled={!canRun} title={canRun ? 'Create a demo run (run-stress-test action)' : 'Requires the run-stress-test demo action (Spec §19)'} onClick={() => openCreate()}>
            New stress run
          </Button>
        }
      />

      {/* Scenario library */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((s) => (
          <Card key={s.id} hoverable className="cursor-pointer" onClick={() => setActiveScenario(s)}>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-primary">{s.reference}</span>
                <StatusBadge status={s.severity} tone={SEVERITY_TONES[s.severity]} />
                <StatusBadge status={s.status} tone={s.status === 'Published' ? 'active' : 'draft'} />
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{s.name}</p>
              <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-ink-secondary">{s.description}</p>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-tertiary">
                <Layers className="h-3 w-3" aria-hidden="true" />
                {s.assumptions.length} assumptions · {s.horizonQuarters}-quarter horizon · {s.createdByName}, {formatDate(s.createdAt)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <DataTable<StressRun>
        columns={runColumns}
        data={runs}
        title="Stress runs"
        getRowId={(r) => r.id}
        initialPageSize={8}
        onRowClick={(r) => navigate(`/app/prudential/stress-testing?run=${r.reference}`)}
        emptyTitle="No stress runs"
        emptyDescription="Create a demo run to see illustrative baseline vs stressed outcomes."
        emptyAction={canRun ? { label: 'New stress run', onClick: () => openCreate() } : undefined}
        onRetry={() => void load()}
        rowActions={(row) =>
          row.status === 'Draft' ? (
            <Button size="sm" variant="outline" disabled={!canRun || busy} title={canRun ? 'Submit for reviewer approval' : 'Requires the run-stress-test demo action (Spec §19)'} onClick={() => void submitRun(row)}>
              Submit for review
            </Button>
          ) : undefined
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Scenario assumptions modal */}
      <Modal
        open={activeScenario !== null}
        onClose={() => setActiveScenario(null)}
        size="lg"
        title={activeScenario ? `${activeScenario.reference} — ${activeScenario.name}` : ''}
        description={activeScenario ? `${activeScenario.severity} severity · ${activeScenario.horizonQuarters}-quarter horizon · ${activeScenario.status}` : undefined}
        footer={
          activeScenario ? (
            <>
              <Button variant="ghost" onClick={() => setActiveScenario(null)}>Close</Button>
              <Button variant="primary" iconLeft={<Play className="h-3.5 w-3.5" />} disabled={!canRun || activeScenario.status !== 'Published'} title={canRun ? undefined : 'Requires the run-stress-test demo action (Spec §19)'} onClick={() => { const id = activeScenario.id; setActiveScenario(null); openCreate(id) }}>
                Run this scenario
              </Button>
            </>
          ) : undefined
        }
      >
        {activeScenario && (
          <div className="flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-ink-secondary">{activeScenario.description}</p>
            <div>
              <p className="overline mb-1.5 text-ink-tertiary">Scenario assumptions</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
                    <th scope="col" className="px-3 py-1.5">Factor</th>
                    <th scope="col" className="px-3 py-1.5 text-right">Baseline</th>
                    <th scope="col" className="px-3 py-1.5 text-right">Stressed</th>
                    <th scope="col" className="px-3 py-1.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {activeScenario.assumptions.map((a) => (
                    <tr key={a.id} className="border-t border-line-light">
                      <td className="px-3 py-1.5 text-xs font-medium text-ink">{a.factor} <span className="text-[10px] text-ink-tertiary">({a.unit})</span></td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-ink-secondary">{a.baseline}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold text-error">{a.stressed}</td>
                      <td className="px-3 py-1.5 text-[10px] text-ink-secondary">{a.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="rounded-md bg-tint-orange px-2.5 py-2 text-[11px] text-warning">{activeScenario.illustrativeNote}</p>
          </div>
        )}
      </Modal>

      {/* New run modal: scenario + institution selection (§8.4) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="lg"
        title="New stress run"
        description="Select a demo scenario and the institutions to run it against. Results are illustrative prototype calculations."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" iconLeft={<FlaskConical className="h-3.5 w-3.5" />} loading={busy} onClick={() => void submitCreate()}>
              Run stress test
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Scenario"
            value={createScenarioId}
            onChange={(e) => setCreateScenarioId(e.target.value)}
            options={(scenarios ?? []).filter((s) => s.status === 'Published').map((s) => ({ value: s.id, label: `${s.reference} — ${s.name} (${s.severity})` }))}
            placeholder="Choose a published demo scenario"
            error={createError && !createScenarioId ? createError : undefined}
          />
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink">Institution selection</p>
            <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
              {institutions.map((i) => (
                <Checkbox
                  key={i.id}
                  label={`${i.tradingName} (${i.code})`}
                  checked={selectedInstitutions.includes(i.id)}
                  onChange={() => toggleInstitution(i.id)}
                />
              ))}
            </div>
            <div className="mt-1.5 flex gap-3">
              <button type="button" className="cursor-pointer text-[11px] font-medium text-primary-surface hover:underline" onClick={() => setSelectedInstitutions(institutions.map((i) => i.id))}>
                Select all
              </button>
              <button type="button" className="cursor-pointer text-[11px] font-medium text-primary-surface hover:underline" onClick={() => setSelectedInstitutions([])}>
                Clear
              </button>
            </div>
            {createError && <p className="mt-1.5 text-[11px] font-medium text-error">{createError}</p>}
          </div>
          <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Run detail (?run=<reference>)
// ---------------------------------------------------------------------------

function RunDetailView({ runReference, onBack }: { runReference: string; onBack: () => void }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canRun = can(actor.actorRole, 'run-stress-test')
  const canApprove = can(actor.actorRole, 'approve-prudential')

  const [run, setRun] = useState<StressRun | null | undefined>(undefined)
  const [reviewOpen, setReviewOpen] = useState<'Approved' | 'Rejected' | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const runs = await stressTestingService.listRuns()
    const found = runs.find((r) => r.reference === runReference)
    setRun(found ?? null)
  }, [runReference])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const submitRunForReview = async () => {
    if (!run) return
    setBusy(true)
    try {
      await stressTestingService.submitRun(run.id, actor)
      await load()
      toast.success('Saved in prototype session', `${run.reference} submitted for reviewer approval.`)
    } catch (err) {
      guard(err, 'The run could not be submitted in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const submitReview = async () => {
    if (!run || !reviewOpen) return
    if (!reviewNote.trim()) {
      setReviewError('A review note is required (demo form).')
      return
    }
    setBusy(true)
    try {
      await stressTestingService.reviewRun(run.id, reviewOpen, reviewNote.trim(), actor)
      setReviewOpen(null)
      setReviewNote('')
      setReviewError('')
      await load()
      toast.success('Saved in prototype session', `${run.reference} ${reviewOpen.toLowerCase()} — demo decision recorded.`)
    } catch (err) {
      guard(err, 'The review decision could not be recorded in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  if (run === undefined) return <LoadingSkeleton variant="text" rows={12} />
  if (run === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Stress run not found"
            description={`No demo stress run matches ${runReference} — it may be from a previous prototype session.`}
            action={{ label: 'Back to stress testing', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const breaches = run.results.filter((r) => r.verdict === 'Breach').length

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{run.reference}</span>
            <StatusBadge status={run.status} tone={RUN_STATUS_TONES[run.status]} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{run.scenarioName} ({run.scenarioReference})</span>
            <span>·</span>
            <span>Run {formatDate(run.runAt)} by {run.runByName}</span>
            <span>·</span>
            <span>{run.results.length} institution(s), {breaches} stressed breach(es)</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Stress Testing', path: '/app/prudential/stress-testing' }, { label: run.reference }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>All runs</Button>
            {run.status === 'Draft' && (
              <Button variant="outline" iconLeft={<Send className="h-3.5 w-3.5" />} disabled={!canRun || busy} title={canRun ? undefined : 'Requires the run-stress-test demo action (Spec §19)'} onClick={() => void submitRunForReview()}>
                Submit for review
              </Button>
            )}
            {run.status === 'Submitted' && (
              <>
                <Button variant="danger" iconLeft={<X className="h-3.5 w-3.5" />} disabled={!canApprove || busy} title={canApprove ? undefined : 'Requires the approve-prudential demo action (Spec §19)'} onClick={() => { setReviewNote(''); setReviewError(''); setReviewOpen('Rejected') }}>
                  Reject
                </Button>
                <Button variant="success" iconLeft={<Check className="h-3.5 w-3.5" />} disabled={!canApprove || busy} title={canApprove ? undefined : 'Requires the approve-prudential demo action (Spec §19)'} onClick={() => { setReviewNote(''); setReviewError(''); setReviewOpen('Approved') }}>
                  Approve
                </Button>
              </>
            )}
          </>
        }
      />

      <p className="mb-4 rounded-md bg-tint-orange px-3 py-2 text-[11px] font-medium text-warning">{DEMO_NOTE}</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataTable<StressRunResult>
            columns={resultColumns(navigate)}
            data={run.results}
            title="Baseline versus stressed outcomes"
            getRowId={(r) => r.institutionId}
            initialPageSize={10}
            emptyTitle="No results"
            emptyDescription="This demo run produced no institution results."
          />
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Reviewer & approval" subtitle="Demo governance trail (Spec §8.4)" />
            <CardBody>
              <dl className="flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Run by</dt>
                  <dd className="font-medium text-ink">{run.runByName} · {formatDate(run.runAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Status</dt>
                  <dd><StatusBadge status={run.status} tone={RUN_STATUS_TONES[run.status]} /></dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-tertiary">Reviewer</dt>
                  <dd className="font-medium text-ink">{run.reviewerName ?? 'Awaiting reviewer'}</dd>
                </div>
                {run.reviewedAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-tertiary">Reviewed</dt>
                    <dd className="font-medium text-ink">{formatDate(run.reviewedAt)}</dd>
                  </div>
                )}
                {run.reviewNote && (
                  <p className="mt-1 border-l-2 border-accent pl-2 italic leading-relaxed text-ink-secondary">“{run.reviewNote}”</p>
                )}
              </dl>
              {run.status === 'Submitted' && !canApprove && (
                <p className="mt-2 rounded-md bg-tint-orange px-2 py-1.5 text-[11px] text-warning">
                  The “{actor.actorRole}” demo role cannot approve stress runs (Spec §19). Switch to a team-lead-or-above demo role.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Scenario" subtitle="Assumptions applied by this run" />
            <CardBody>
              <ScenarioAssumptionList scenarioId={run.scenarioId} />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <DataTable<SensitivityRow>
          columns={sensitivityColumns}
          data={run.sensitivity}
          title="Sensitivity analysis"
          getRowId={(r) => r.factor}
          initialPageSize={5}
          emptyTitle="No sensitivity rows"
          emptyDescription="This demo run carries no sensitivity grid."
        />
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      <Modal
        open={reviewOpen !== null}
        onClose={() => setReviewOpen(null)}
        title={reviewOpen === 'Approved' ? 'Approve stress run' : 'Reject stress run'}
        description={`${run.reference} — ${run.scenarioName}. The decision is recorded in the demo governance trail only.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(null)}>Cancel</Button>
            <Button variant={reviewOpen === 'Approved' ? 'success' : 'danger'} loading={busy} onClick={() => void submitReview()}>
              {reviewOpen === 'Approved' ? 'Approve run' : 'Reject run'}
            </Button>
          </>
        }
      >
        <TextArea
          label="Review note"
          required
          rows={3}
          error={reviewError}
          value={reviewNote}
          onChange={(e) => { setReviewNote(e.target.value); setReviewError('') }}
          placeholder={reviewOpen === 'Approved' ? 'Reviewer rationale for approval (demo)…' : 'Reasons for rejection (demo)…'}
        />
      </Modal>
    </div>
  )
}

function ScenarioAssumptionList({ scenarioId }: { scenarioId: string }) {
  const [scenario, setScenario] = useState<StressScenario | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await stressTestingService.getScenario(scenarioId)
      if (!cancelled) setScenario(s ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [scenarioId])

  if (scenario === undefined) return <LoadingSkeleton variant="text" rows={4} />
  if (scenario === null) return <EmptyState title="Scenario unavailable" description="The demo scenario for this run could not be loaded." />

  return (
    <div>
      <p className="text-xs font-semibold text-ink">{scenario.name}</p>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="bg-page text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase">
            <th scope="col" className="px-2 py-1.5">Factor</th>
            <th scope="col" className="px-2 py-1.5 text-right">Baseline</th>
            <th scope="col" className="px-2 py-1.5 text-right">Stressed</th>
          </tr>
        </thead>
        <tbody>
          {scenario.assumptions.map((a) => (
            <tr key={a.id} className="border-t border-line-light">
              <td className="px-2 py-1.5 text-[11px] text-ink">{a.factor}</td>
              <td className="px-2 py-1.5 text-right font-mono text-[11px] text-ink-secondary">{a.baseline}</td>
              <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-error">{a.stressed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const resultColumns = (navigate: (to: string) => void): Array<ColumnDef<StressRunResult, unknown>> => [
  {
    accessorKey: 'institutionName',
    header: 'Institution',
    cell: ({ row }) => (
      <button
        type="button"
        className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
        onClick={() => navigate(`/app/prudential/capital?institution=${encodeURIComponent(row.original.institutionId)}`)}
      >
        {row.original.institutionName}
      </button>
    ),
  },
  {
    id: 'car',
    accessorFn: (r) => Number(r.carStressedPct),
    header: 'CAR baseline → stressed',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        <span className="text-ink-secondary">{row.original.carBaselinePct}% →</span>{' '}
        <span className={cx('font-semibold', Number(row.original.carStressedPct) < 10 ? 'text-error' : Number(row.original.carStressedPct) < 12.5 ? 'text-warning' : 'text-success')}>
          {row.original.carStressedPct}%
        </span>
        <span className="ml-1 text-[10px] text-ink-tertiary">({row.original.carDeltaPct} pp)</span>
      </span>
    ),
  },
  {
    id: 'lcr',
    accessorFn: (r) => Number(r.lcrStressedPct),
    header: 'LCR baseline → stressed',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        <span className="text-ink-secondary">{row.original.lcrBaselinePct}% →</span>{' '}
        <span className={cx('font-semibold', Number(row.original.lcrStressedPct) < 100 ? 'text-error' : Number(row.original.lcrStressedPct) < 110 ? 'text-warning' : 'text-success')}>
          {row.original.lcrStressedPct}%
        </span>
      </span>
    ),
  },
  {
    id: 'npl',
    accessorFn: (r) => Number(r.nplStressedPct),
    header: 'NPL baseline → stressed',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        <span className="text-ink-secondary">{row.original.nplBaselinePct}% →</span>{' '}
        <span className={cx('font-semibold', Number(row.original.nplStressedPct) > 8 ? 'text-error' : Number(row.original.nplStressedPct) > 6 ? 'text-warning' : 'text-ink')}>
          {row.original.nplStressedPct}%
        </span>
      </span>
    ),
  },
  {
    accessorKey: 'capitalImpactMM',
    header: 'Capital impact (MRD m)',
    cell: ({ row }) => (
      <span className="flex items-center gap-1 font-mono text-xs font-semibold text-error">
        <Gauge className="h-3 w-3" aria-hidden="true" />
        −{row.original.capitalImpactMM}
      </span>
    ),
  },
  {
    accessorKey: 'verdict',
    header: 'Verdict',
    cell: ({ row }) => <StatusBadge status={row.original.verdict} tone={VERDICT_TONES[row.original.verdict]} />,
  },
]

const sensitivityColumns: Array<ColumnDef<SensitivityRow, unknown>> = [
  { accessorKey: 'factor', header: 'Factor' },
  { accessorKey: 'shock', header: 'Shock', cell: ({ row }) => <span className="font-mono text-xs text-ink-secondary">{row.original.shock}</span> },
  {
    accessorKey: 'carImpactPct',
    header: 'CAR impact (pp)',
    cell: ({ row }) => <span className={cx('font-mono text-xs font-semibold', Number(row.original.carImpactPct) < 0 ? 'text-error' : 'text-success')}>{row.original.carImpactPct}</span>,
  },
  {
    accessorKey: 'nplImpactPct',
    header: 'NPL impact (pp)',
    cell: ({ row }) => <span className="font-mono text-xs text-ink">{row.original.nplImpactPct}</span>,
  },
  {
    accessorKey: 'lcrImpactPct',
    header: 'LCR impact (pp)',
    cell: ({ row }) => <span className={cx('font-mono text-xs font-semibold', Number(row.original.lcrImpactPct) < 0 ? 'text-error' : 'text-success')}>{row.original.lcrImpactPct}</span>,
  },
]
