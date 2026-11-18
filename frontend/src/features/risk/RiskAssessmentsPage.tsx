import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, Plus } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { useActor } from '@/hooks/useActor'
import { can } from '@/config/roles'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { riskAssessmentService } from '@/services/mock/MockRiskAssessmentService'
import type { Institution } from '@/types/institution'
import type { RiskAssessmentDetail } from '@/types/supervision'
import type { RiskRating } from '@/types/common'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Risk assessment register (Spec §6.2): institution, reference,
 * methodology/version, assessment date, overall inherent risk, control
 * effectiveness, residual risk, reviewer and status — plus the entry point
 * to the 8-step create wizard. Every score is demo/illustrative.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  'Not Started': 'draft',
  'In Progress': 'fieldwork',
  'In Review': 'reporting',
  Completed: 'completed',
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10

const ratingOf = (value: number): RiskRating =>
  value >= 4.5 ? 'Critical' : value >= 3.5 ? 'High' : value >= 2.5 ? 'Medium' : 'Low'

export function RiskAssessmentsPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const canSubmit = can(actor.actorRole, 'submit-assessment')

  const [assessments, setAssessments] = useState<RiskAssessmentDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const [list, instPage] = await Promise.all([
      riskAssessmentService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setAssessments(list)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const rows = useMemo(() => {
    if (!assessments) return []
    const search_ = search.trim().toLowerCase()
    return assessments
      .filter((a) => !institutionFilter || a.institutionId === institutionFilter)
      .filter((a) => !statusFilter || a.status === statusFilter)
      .filter(
        (a) =>
          !search_ ||
          `${a.reference} ${instById.get(a.institutionId)?.tradingName ?? ''} ${a.methodologyName} ${a.assessedByName} ${a.reviewerName ?? ''}`
            .toLowerCase()
            .includes(search_),
      )
  }, [assessments, institutionFilter, statusFilter, search, instById])

  const handleExport = () => {
    if (!can(actor.actorRole, 'export')) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-risk-assessments-demo.csv',
      ['Reference', 'Institution', 'Methodology', 'Version', 'Assessment date', 'Overall inherent (1-5)', 'Control effectiveness (1-5)', 'Residual risk', 'Composite', 'Reviewer', 'Status', 'Recommended intensity'],
      rows.map((a) => [
        a.reference,
        instById.get(a.institutionId)?.tradingName ?? a.institutionId,
        a.methodologyName,
        a.methodologyVersion,
        a.completedDate ?? a.dueDate,
        mean(a.categoryScores.map((c) => c.inherent)),
        mean(a.categoryScores.map((c) => c.control)),
        a.overallRisk,
        a.compositeScore,
        a.reviewerName ?? '—',
        a.status,
        a.recommendedIntensity,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<RiskAssessmentDetail, unknown>>>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Assessment ref',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold text-ink">{row.original.reference}</p>
            <p className="text-[10px] text-ink-secondary">{row.original.year} cycle</p>
          </div>
        ),
      },
      {
        id: 'institution',
        accessorFn: (a) => instById.get(a.institutionId)?.tradingName ?? '',
        header: 'Institution',
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer text-[13px] font-medium text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/institutions/${row.original.institutionId}/risk`)
            }}
          >
            {instById.get(row.original.institutionId)?.tradingName ?? '—'}
          </button>
        ),
      },
      {
        id: 'methodology',
        accessorFn: (a) => `${a.methodologyName} ${a.methodologyVersion}`,
        header: 'Methodology / version',
        cell: ({ row }) => (
          <span className="text-xs text-ink-secondary">
            {row.original.methodologyName}{' '}
            <span className="rounded bg-page px-1 py-0.5 font-mono text-[10px] text-ink">
              {row.original.methodologyVersion}
            </span>
          </span>
        ),
      },
      {
        id: 'assessmentDate',
        accessorFn: (a) => a.completedDate ?? a.dueDate,
        header: 'Assessment date',
        cell: ({ getValue }) => <span className="text-xs text-ink-secondary">{formatDate(getValue<string>())}</span>,
      },
      {
        id: 'inherent',
        accessorFn: (a) => mean(a.categoryScores.map((c) => c.inherent)),
        header: 'Overall inherent',
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-ink">{v > 0 ? v.toFixed(1) : '—'}</span>
              {v > 0 && <RiskBadge rating={ratingOf(v)} />}
            </span>
          )
        },
      },
      {
        id: 'control',
        accessorFn: (a) => mean(a.categoryScores.map((c) => c.control)),
        header: 'Control effectiveness',
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className="text-xs text-ink">
              {v > 0 ? `${v.toFixed(1)} / 5` : '—'}
              <span className="ml-1 text-[10px] text-ink-secondary">
                {v > 0 ? (v <= 2 ? 'strong (demo)' : v <= 3.5 ? 'moderate (demo)' : 'weak (demo)') : ''}
              </span>
            </span>
          )
        },
      },
      {
        id: 'residual',
        accessorFn: (a) => a.compositeScore,
        header: 'Residual risk',
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <RiskBadge rating={row.original.overallRisk} />
            <span className="text-[10px] text-ink-secondary">{row.original.compositeScore.toFixed(1)}</span>
          </span>
        ),
      },
      {
        id: 'reviewer',
        accessorFn: (a) => a.reviewerName ?? '',
        header: 'Reviewer',
        cell: ({ row }) => (
          <span className="text-xs text-ink-secondary">
            {row.original.reviewerName ?? <span className="text-[10px]">Not assigned (demo)</span>}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />
            {row.original.status === 'In Progress' && (
              <ProgressBar
                value={Math.round((row.original.categoryScores.length / 6) * 100)}
                className="w-20"
                label="Scoring progress"
              />
            )}
          </div>
        ),
      },
    ],
    [instById, navigate],
  )

  return (
    <div>
      <PageHeader
        title="Risk Assessments"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Institutional risk assessment register — methodology-driven, demo scoring</span>
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
              iconLeft={<Plus className="h-4 w-4" />}
              disabled={!canSubmit}
              title={canSubmit ? undefined : 'Your demo role cannot create assessments (Spec §19)'}
              onClick={() => navigate('/app/risk-assessments/new')}
            >
              New assessment
            </Button>
          </>
        }
      />

      {assessments === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<RiskAssessmentDetail>
          columns={columns}
          data={rows}
          title="Assessment register"
          headerAction={
            <span className="text-xs text-ink-secondary">
              {rows.length} assessments · {new Date().getFullYear()} cycle · demo data
            </span>
          }
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/app/risk-assessments/${row.id}`)}
          initialPageSize={10}
          emptyTitle="No assessments match"
          emptyDescription="Adjust the filters, or start a new assessment cycle from the wizard."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                aria-label="Search assessments"
                placeholder="Search reference, institution, assessor or reviewer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Filter by institution"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All statuses"
                options={['Not Started', 'In Progress', 'In Review', 'Completed'].map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      )}
    </div>
  )
}
