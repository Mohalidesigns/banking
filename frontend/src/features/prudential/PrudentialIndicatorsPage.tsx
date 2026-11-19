import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowLeft,
  Activity,
  Download,
  Pencil,
  RefreshCw,
} from 'lucide-react'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { indicatorCatalogueService } from '@/services/mock/MockPrudentialService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type {
  IndicatorDetail,
  IndicatorReadingRow,
  PrudentialIndicatorDefinition,
} from '@/types/prudential'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'
import { cx } from '@/utils/cx'

/**
 * Prudential Indicators (Spec §8.5) — `/app/prudential/indicators`.
 * Configurable catalogue (name/code, definition, formula, unit, applicable
 * institution types, thresholds and severity, frequency, effective date,
 * source return fields, validation rules) plus indicator detail with
 * formula breakdown, historical portfolio values and threshold history.
 * Threshold edits are gated by `manage-indicator-thresholds` (§19) and
 * version the demo rule. Readings carry the story anchors: Northstar LCR
 * Q3 2026 → EWA-2026-011/EXC-2026-011, Vanguard CAR → EWA-2026-008,
 * Meridian NPL → EWA-2026-013, Delta PC → EXC-2026-018.
 */

const DEMO_NOTE =
  'Indicator definitions, thresholds and readings are illustrative demo values — not approved regulatory rules.'

const BREACH_TONES: Record<IndicatorReadingRow['breach'], StatusTone> = {
  none: 'active',
  Amber: 'fieldwork',
  Red: 'overdue',
}

export function PrudentialIndicatorsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const indicatorParam = searchParams.get('indicator')

  return indicatorParam ? (
    <IndicatorDetailView
      codeOrId={indicatorParam}
      onBack={() => setSearchParams({}, { replace: true })}
    />
  ) : (
    <CatalogueView />
  )
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

function CatalogueView() {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')

  const [definitions, setDefinitions] = useState<PrudentialIndicatorDefinition[] | null>(null)
  const [fFrequency, setFFrequency] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const defs = await indicatorCatalogueService.listDefinitions()
    setDefinitions(defs)
    setBusy(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!definitions) return []
    const s = search.trim().toLowerCase()
    return definitions
      .filter((d) => !fFrequency || d.frequency === fFrequency)
      .filter((d) => !fUnit || d.unit === fUnit)
      .filter((d) => !s || `${d.code} ${d.name} ${d.definition}`.toLowerCase().includes(s))
  }, [definitions, fFrequency, fUnit, search])

  const handleExport = () => {
    if (!canExport) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-indicator-catalogue-demo.csv',
      ['Code', 'Name', 'Formula', 'Unit', 'Frequency', 'Thresholds', 'Rule version', 'Effective from'],
      rows.map((d) => [
        d.code, d.name, d.formula, d.unit, d.frequency,
        d.thresholds.map((t) => `${t.severity} ${t.operator} ${t.value}`).join('; '),
        d.ruleVersion, d.effectiveFrom,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<PrudentialIndicatorDefinition, unknown>>>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer font-mono text-[11px] font-semibold text-primary hover:underline"
            onClick={() => navigate(`/app/prudential/indicators?indicator=${row.original.code}`)}
          >
            {row.original.code}
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Indicator',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.name}</p>
            <p className="max-w-[320px] text-[10px] leading-relaxed text-ink-secondary">{row.original.definition}</p>
          </div>
        ),
      },
      {
        accessorKey: 'formula',
        header: 'Formula',
        cell: ({ row }) => <span className="font-mono text-[11px] text-ink-secondary">{row.original.formula}</span>,
      },
      { accessorKey: 'unit', header: 'Unit', cell: ({ row }) => <span className="font-mono text-xs">{row.original.unit}</span> },
      {
        accessorKey: 'thresholds',
        header: 'Thresholds (demo)',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.thresholds.map((t) => (
              <StatusBadge key={t.severity} status={`${t.severity} ${t.operator} ${t.value}`} tone={t.severity === 'Red' ? 'overdue' : 'fieldwork'} />
            ))}
          </div>
        ),
      },
      { accessorKey: 'frequency', header: 'Frequency' },
      {
        accessorKey: 'ruleVersion',
        header: 'Rule version',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.ruleVersion}</p>
            <p className="text-[10px] text-ink-tertiary">from {formatDate(row.original.effectiveFrom)}</p>
          </div>
        ),
      },
    ],
    [navigate],
  )

  if (!definitions) {
    return (
      <div>
        <PageHeader title="Prudential Indicators" subtitle="Configurable indicator catalogue" />
        <LoadingSkeleton variant="cards" rows={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Prudential Indicators"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Configurable catalogue — {definitions.length} demo indicators</span>
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
              Export catalogue
            </Button>
          </>
        }
      />

      <DataTable<PrudentialIndicatorDefinition>
        columns={columns}
        data={rows}
        title="Indicator catalogue"
        getRowId={(d) => d.id}
        initialPageSize={10}
        onRowClick={(d) => navigate(`/app/prudential/indicators?indicator=${d.code}`)}
        emptyTitle="No indicators match"
        emptyDescription="Adjust the filters — the demo catalogue always ships the nine core indicators."
        onRetry={() => void load()}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextInput
              aria-label="Search indicators"
              type="search"
              placeholder="Search code, name or definition…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              aria-label="Filter by frequency"
              value={fFrequency}
              onChange={(e) => setFFrequency(e.target.value)}
              placeholder="All frequencies"
              options={['Monthly', 'Quarterly'].map((f) => ({ value: f, label: f }))}
            />
            <Select
              aria-label="Filter by unit"
              value={fUnit}
              onChange={(e) => setFUnit(e.target.value)}
              placeholder="All units"
              options={['%', 'x', 'MRD m'].map((u) => ({ value: u, label: u }))}
            />
          </div>
        }
      />
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Indicator detail (?indicator=<code>)
// ---------------------------------------------------------------------------

function IndicatorDetailView({ codeOrId, onBack }: { codeOrId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const actor = useActor()
  const canExport = can(actor.actorRole, 'export')
  const canManageThresholds = can(actor.actorRole, 'manage-indicator-thresholds')

  const [detail, setDetail] = useState<IndicatorDetail | null | undefined>(undefined)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fInstitution, setFInstitution] = useState('')
  const [fPeriod, setFPeriod] = useState('')
  const [fBreach, setFBreach] = useState('')
  const [busy, setBusy] = useState(false)

  // Threshold editor
  const [editOpen, setEditOpen] = useState(false)
  const [amberValue, setAmberValue] = useState('')
  const [redValue, setRedValue] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    const [d, instPage] = await Promise.all([
      indicatorCatalogueService.detail(codeOrId),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setDetail(d ?? null)
    setInstitutions(instPage.items)
  }, [codeOrId])

  useEffect(() => {
    void load()
  }, [load])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const openEditor = () => {
    if (!detail) return
    setAmberValue(detail.definition.thresholds.find((t) => t.severity === 'Amber')?.value ?? '')
    setRedValue(detail.definition.thresholds.find((t) => t.severity === 'Red')?.value ?? '')
    setChangeNote('')
    setEditError('')
    setEditOpen(true)
  }

  const submitThresholds = async () => {
    if (!detail) return
    const amber = Number(amberValue)
    const red = Number(redValue)
    if (!amberValue.trim() || !redValue.trim() || Number.isNaN(amber) || Number.isNaN(red)) {
      setEditError('Both threshold levels must be numeric (demo form).')
      return
    }
    if (!changeNote.trim()) {
      setEditError('A change note is required — it becomes the threshold-history entry (demo form).')
      return
    }
    setBusy(true)
    try {
      await indicatorCatalogueService.updateThresholds(
        detail.definition.id,
        {
          thresholds: [
            { severity: 'Amber', operator: detail.definition.thresholds[0]?.operator ?? 'below', value: amberValue.trim() },
            { severity: 'Red', operator: detail.definition.thresholds.find((t) => t.severity === 'Red')?.operator ?? detail.definition.thresholds[0]?.operator ?? 'below', value: redValue.trim() },
          ],
          changeNote: changeNote.trim(),
        },
        actor,
      )
      setEditOpen(false)
      await load()
      toast.success('Saved in prototype session', `${detail.definition.code} thresholds updated — rule version bumped (demo).`)
    } catch (err) {
      guard(err, 'The thresholds could not be updated in the prototype.')
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
      `atheris-reg-indicator-${detail.definition.code.toLowerCase()}-readings-demo.csv`,
      ['Institution', 'Code', 'Period', 'Value', 'Breach', 'Related alert', 'Related exception'],
      detail.readings.map((r) => [
        r.institutionName, r.institutionCode, r.periodLabel, r.value, r.breach, r.relatedAlertRef ?? '', r.relatedExceptionRef ?? '',
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const readings = useMemo(() => {
    if (!detail) return []
    return detail.readings
      .filter((r) => !fInstitution || r.institutionId === fInstitution)
      .filter((r) => !fPeriod || r.periodLabel === fPeriod)
      .filter((r) => !fBreach || r.breach === fBreach)
      .slice()
      .reverse()
  }, [detail, fInstitution, fPeriod, fBreach])

  const periodOptions = useMemo(
    () => [...new Set(detail?.readings.map((r) => r.periodLabel) ?? [])],
    [detail],
  )

  if (detail === undefined) return <LoadingSkeleton variant="text" rows={12} />
  if (detail === null) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Indicator not found"
            description={`No demo indicator matches “${codeOrId}” — it may be from a previous prototype session.`}
            action={{ label: 'Back to catalogue', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }

  const def = detail.definition

  const readingColumns: Array<ColumnDef<IndicatorReadingRow, unknown>> = [
    {
      accessorKey: 'institutionName',
      header: 'Institution',
      cell: ({ row }) => (
        <div>
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={() => navigate(`/app/surveillance?institution=${encodeURIComponent(row.original.institutionId)}`)}
          >
            {row.original.institutionName}
          </button>
          <p className="font-mono text-[10px] text-ink-secondary">{row.original.institutionCode}</p>
        </div>
      ),
    },
    { accessorKey: 'periodLabel', header: 'Period' },
    {
      accessorKey: 'value',
      header: `Value (${def.unit})`,
      cell: ({ row }) => (
        <span className={cx('font-mono text-xs font-semibold', row.original.breach === 'Red' ? 'text-error' : row.original.breach === 'Amber' ? 'text-warning' : 'text-ink')}>
          {row.original.value}
        </span>
      ),
    },
    {
      accessorKey: 'breach',
      header: 'Threshold status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.breach === 'none' ? 'Within thresholds' : `${row.original.breach} breach`} tone={BREACH_TONES[row.original.breach]} />
      ),
    },
    {
      id: 'anchors',
      header: 'Supervisory anchors',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.relatedAlertRef && (
            <button
              type="button"
              className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
              onClick={() => navigate(`/app/early-warnings?reference=${row.original.relatedAlertRef}`)}
            >
              {row.original.relatedAlertRef} →
            </button>
          )}
          {row.original.relatedExceptionRef && (
            <button
              type="button"
              className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface hover:bg-tint-blue"
              onClick={() => navigate('/app/surveillance?institution=' + encodeURIComponent(row.original.institutionId))}
              title={`Surveillance exception ${row.original.relatedExceptionRef}`}
            >
              {row.original.relatedExceptionRef} →
            </button>
          )}
          {!row.original.relatedAlertRef && !row.original.relatedExceptionRef && (
            <span className="text-[10px] text-ink-tertiary">—</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{def.name}</span>
            <span className="font-mono text-sm text-ink-secondary">({def.code})</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{def.frequency} · unit {def.unit}</span>
            <span>·</span>
            <span className="font-mono">{def.ruleVersion}</span>
            <span>·</span>
            <span>effective {formatDate(def.effectiveFrom)}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Prudential Indicators', path: '/app/prudential/indicators' }, { label: def.code }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>Catalogue</Button>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export readings
            </Button>
            <Button variant="primary" iconLeft={<Pencil className="h-3.5 w-3.5" />} disabled={!canManageThresholds} title={canManageThresholds ? 'Edit thresholds (manage-indicator-thresholds demo action)' : 'Requires the manage-indicator-thresholds demo action (Spec §19)'} onClick={openEditor}>
              Edit thresholds
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Historical values" subtitle={`Portfolio average across demo periods — ${def.code} (${def.unit})`} />
          <CardBody>
            <IndicatorHistoryChart data={detail.history} unit={def.unit} thresholds={def.thresholds} code={def.code} />
            <p className="mt-2 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Definition & formula" subtitle={def.severityNote} />
            <CardBody>
              <p className="text-xs leading-relaxed text-ink-secondary">{def.definition}</p>
              <p className="mt-2 rounded-md bg-page px-2.5 py-2 font-mono text-xs font-semibold text-primary">{def.formula}</p>
              <dl className="mt-3 flex flex-col gap-2 text-[11px]">
                <div>
                  <dt className="overline text-ink-tertiary">Thresholds & severity</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {def.thresholds.map((t) => (
                      <StatusBadge key={t.severity} status={`${t.severity} ${t.operator} ${t.value}${def.unit === '%' ? '%' : ''}`} tone={t.severity === 'Red' ? 'overdue' : 'fieldwork'} />
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Applicable institution types</dt>
                  <dd className="mt-0.5 text-ink">{def.applicableInstitutionTypes.length > 0 ? def.applicableInstitutionTypes.join(', ') : 'All licence categories (demo)'}</dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Source return fields</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {def.sourceReturnFields.map((f) => (
                      <span key={f} className="rounded-full bg-page px-2 py-0.5 font-mono text-[10px] text-ink-secondary">{f}</span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="overline text-ink-tertiary">Validation rules</dt>
                  <dd className="mt-0.5">
                    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-ink-secondary">
                      {def.validationRules.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Threshold history" subtitle="Versioned demo rule changes" />
            <CardBody>
              {detail.thresholdHistory.length === 0 ? (
                <EmptyState title="No threshold history" description="Threshold changes made in this prototype session will appear here." icon={<Activity className="h-7 w-7" />} />
              ) : (
                <ol className="flex flex-col gap-2.5">
                  {detail.thresholdHistory.map((h) => (
                    <li key={`${h.version}-${h.effectiveFrom}`} className="border-l-2 border-accent pl-3">
                      <p className="font-mono text-[11px] font-semibold text-primary">{h.version}</p>
                      <p className="text-[11px] leading-relaxed text-ink-secondary">{h.change}</p>
                      <p className="mt-0.5 text-[10px] text-ink-tertiary">effective {formatDate(h.effectiveFrom)} · approved by {h.approvedByName}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <DataTable<IndicatorReadingRow>
          columns={readingColumns}
          data={readings}
          title={`Readings — ${def.code}`}
          getRowId={(r) => `${r.institutionId}-${r.periodLabel}`}
          initialPageSize={10}
          emptyTitle="No readings"
          emptyDescription="No demo readings match the current filters."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                aria-label="Filter by institution"
                value={fInstitution}
                onChange={(e) => setFInstitution(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by period"
                value={fPeriod}
                onChange={(e) => setFPeriod(e.target.value)}
                placeholder="All periods"
                options={periodOptions.map((p) => ({ value: p, label: p }))}
              />
              <Select
                aria-label="Filter by threshold status"
                value={fBreach}
                onChange={(e) => setFBreach(e.target.value)}
                placeholder="All statuses"
                options={[{ value: 'none', label: 'Within thresholds' }, { value: 'Amber', label: 'Amber breach' }, { value: 'Red', label: 'Red breach' }]}
              />
            </div>
          }
        />
      </div>
      <p className="mt-4 text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>

      {/* Threshold editor (Spec §8.5 "configurable catalogue") */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit thresholds — ${def.code}`}
        description={`Updates the demo rule version (${def.ruleVersion}) and records a threshold-history entry. Saved in the prototype session only.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void submitThresholds()}>Save thresholds</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label={`Amber level (${def.thresholds[0]?.operator ?? 'below'} ${def.unit === '%' ? '%' : def.unit})`}
              inputMode="decimal"
              value={amberValue}
              onChange={(e) => { setAmberValue(e.target.value); setEditError('') }}
            />
            <TextInput
              label={`Red level (${def.thresholds.find((t) => t.severity === 'Red')?.operator ?? def.thresholds[0]?.operator ?? 'below'} ${def.unit === '%' ? '%' : def.unit})`}
              inputMode="decimal"
              value={redValue}
              onChange={(e) => { setRedValue(e.target.value); setEditError('') }}
            />
          </div>
          <TextArea
            label="Change note"
            required
            rows={3}
            error={editError}
            value={changeNote}
            onChange={(e) => { setChangeNote(e.target.value); setEditError('') }}
            placeholder="Why are the thresholds changing? (becomes the threshold-history entry)"
          />
          <p className="text-[10px] text-ink-tertiary">{DEMO_NOTE}</p>
        </div>
      </Modal>
    </div>
  )
}

function IndicatorHistoryChart({
  data,
  unit,
  thresholds,
  code,
}: {
  data: IndicatorDetail['history']
  unit: string
  thresholds: PrudentialIndicatorDefinition['thresholds']
  code: string
}) {
  const chartData = data.map((d) => ({ periodLabel: d.periodLabel, value: Number(d.value) }))
  const amber = thresholds.find((t) => t.severity === 'Amber')
  const red = thresholds.find((t) => t.severity === 'Red')
  return (
    <div
      role="img"
      aria-label={`${code} portfolio history: ${data.map((d) => `${d.periodLabel} ${d.value}${unit}`).join(', ')}. Illustrative demo values.`}
      className="h-60 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} unit={unit === '%' ? '%' : ''} width={52} domain={['auto', 'auto']} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}${unit === '%' ? '%' : ` ${unit}`}`, code]} />
          {amber && (
            <ReferenceLine y={Number(amber.value)} stroke={CHART_COLORS.warning} strokeDasharray="4 4" label={{ value: `Amber ${amber.value}`, fontSize: 9, fill: CHART_COLORS.warning, position: 'insideTopRight' }} />
          )}
          {red && (
            <ReferenceLine y={Number(red.value)} stroke={CHART_COLORS.error} strokeDasharray="4 4" label={{ value: `Red ${red.value}`, fontSize: 9, fill: CHART_COLORS.error, position: 'insideBottomRight' }} />
          )}
          <Line type="monotone" dataKey="value" name={code} stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
