import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  BadgeCheck,
  Building,
  ClipboardList,
  FileClock,
  TriangleExclamationPoint,
} from 'lucide-react'
import { CHART_COLORS, tooltipStyle } from '@/components/charts/chartTheme'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { RiskBadge, StatusBadge } from '@/components/ui/Badges'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { StatCard } from '@/components/ui/StatCard'
import {
  DEMO_NOTE,
  RelationsPanel,
} from '@/features/specialist/panels'
import { specialistService } from '@/services/mock/MockSpecialistService'
import type { RiskRating } from '@/types/common'
import type { SupervisoryDomain } from '@/types/regulatory'
import type {
  SpecialistDashboard,
  SpecialistDomainSpec,
  SpecialistInstitutionPosture,
} from '@/types/specialist'

/**
 * Pattern part 1 — the §9 domain dashboard: KPI cards, demo maturity
 * distribution, submodule coverage and per-institution posture, all derived
 * from the same repository the register/detail read. Maturity figures are
 * labelled illustrative (demo heuristic, never an official rating).
 */
export function SpecialistDashboardView({
  domain,
  spec,
  onOpenRegister,
}: {
  domain: SupervisoryDomain
  spec: SpecialistDomainSpec
  onOpenRegister: () => void
}) {
  const navigate = useNavigate()
  const [data, setData] = useState<SpecialistDashboard | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    void specialistService.dashboard(domain).then((d) => {
      if (alive) setData(d ?? null)
    })
    return () => {
      alive = false
    }
  }, [domain])

  if (data === undefined) return <LoadingSkeleton className="h-96" />
  if (data === null) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-secondary">
            This specialist domain has no configuration in the prototype yet.
          </p>
        </CardBody>
      </Card>
    )
  }

  const postureColumns: Array<ColumnDef<SpecialistInstitutionPosture, unknown>> = [
    {
      accessorKey: 'institutionName',
      header: 'Institution',
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer text-left text-xs font-semibold text-primary-surface hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/app/institutions/${row.original.institutionId}`)
          }}
        >
          {row.original.institutionName}
          <span className="ml-1 font-mono text-[10px] font-normal text-ink-secondary">
            {row.original.institutionCode}
          </span>
        </button>
      ),
    },
    {
      accessorKey: 'riskRating',
      header: 'Risk rating',
      cell: ({ row }) => <RiskBadge rating={row.original.riskRating as RiskRating} />,
    },
    {
      id: 'maturity',
      header: 'Demo maturity',
      cell: ({ row }) =>
        row.original.maturity ? (
          <span className="text-xs">
            <StatusBadge status={`${row.original.maturity.score} — ${row.original.maturity.label}`} tone="planning" />
          </span>
        ) : (
          <span className="text-xs text-ink-secondary">Not yet assessed</span>
        ),
    },
    {
      accessorKey: 'openAssessments',
      header: 'Open assessments',
      cell: ({ row }) =>
        row.original.openAssessments > 0 ? (
          <button
            type="button"
            className="cursor-pointer text-xs font-semibold text-primary-surface hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onOpenRegister()
            }}
          >
            {row.original.openAssessments} active
          </button>
        ) : (
          <span className="text-xs text-ink-secondary">—</span>
        ),
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
      accessorKey: 'trend',
      header: 'Demo trend',
      cell: ({ row }) => <StatusBadge status={row.original.trend} />,
    },
    {
      accessorKey: 'latestAssessmentRef',
      header: 'Latest completed',
      cell: ({ row }) =>
        row.original.latestAssessmentRef ? (
          <span className="font-mono text-xs">{row.original.latestAssessmentRef}</span>
        ) : (
          <span className="text-xs text-ink-secondary">—</span>
        ),
    },
  ]

  const maxCoverage = Math.max(1, ...data.submoduleCoverage.map((s) => s.assessments))

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-secondary" aria-label="Demo data notice">
        {DEMO_NOTE}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Institutions covered"
          value={data.totals.institutionsCovered}
          icon={Building}
          tone="blue"
          footer="With assessments in this domain"
        />
        <StatCard
          label="Active assessments"
          value={data.totals.activeAssessments}
          icon={ClipboardList}
          tone="yellow"
          onClick={onOpenRegister}
          footer="Open the register →"
        />
        <StatCard
          label="Completed this year"
          value={data.totals.completedThisYear}
          icon={BadgeCheck}
          tone="green"
          onClick={onOpenRegister}
          footer="Open the register →"
        />
        <StatCard
          label="Open findings"
          value={data.totals.openFindings}
          icon={TriangleExclamationPoint}
          tone="red"
          footer="Domain categories (§7.7 register)"
        />
        <StatCard
          label="Overdue evidence"
          value={data.totals.overdueEvidenceRequests}
          icon={FileClock}
          tone={data.totals.overdueEvidenceRequests > 0 ? 'red' : 'blue'}
          footer="Requests past their demo due date"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Demo maturity distribution"
            subtitle="Latest completed assessment per institution — illustrative demo scale, never an official rating."
          />
          <CardBody>
            <div className="h-56" role="img" aria-label="Bar chart of demo maturity distribution across scores 1 to 5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.maturityDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(26,54,93,0.06)' }} />
                  <Bar dataKey="count" name="Institutions" radius={[4, 4, 0, 0]}>
                    {data.maturityDistribution.map((entry) => (
                      <Cell
                        key={entry.score}
                        fill={entry.score <= 2 ? CHART_COLORS.error : entry.score === 3 ? CHART_COLORS.warning : CHART_COLORS.success}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Submodule coverage"
            subtitle={`${spec.label} submodules (Spec ${spec.specRef}) — assessments and deficient checklist items in the demo dataset.`}
          />
          <CardBody>
            <ul className="space-y-3">
              {data.submoduleCoverage.map((s) => (
                <li key={s.key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink">{s.label}</span>
                    <span className="text-ink-secondary">
                      {s.assessments} assessment{s.assessments === 1 ? '' : 's'}
                      {s.deficientItems > 0 && (
                        <span className="ml-2 font-semibold text-error">{s.deficientItems} deficient</span>
                      )}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.round((s.assessments / maxCoverage) * 100)}
                    tone={s.deficientItems > 0 ? 'error' : 'primary'}
                    label={`${s.label} coverage`}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <DataTable
        columns={postureColumns}
        data={data.posture}
        state={data.posture.length === 0 ? 'empty' : 'ready'}
        title="Institution posture"
        onRowClick={(row) => navigate(`/app/institutions/${row.institutionId}`)}
        getRowId={(row) => row.institutionId}
        emptyTitle="No institutions covered yet"
        emptyDescription="Create an assessment in the register to populate this domain (demo)."
      />

      <Card>
        <CardHeader
          title="Cross-module story anchors"
          subtitle="Live references from this domain's assessments into examinations, findings, alerts and corrective actions."
        />
        <CardBody>
          <RelationsPanel relations={data.recentRelations} emptyLabel="No cross-module references yet (demo)." />
        </CardBody>
      </Card>

      <DomainHelpCard spec={spec} />
    </div>
  )
}

/** Submodule inventory card — the §9.x submodule list with descriptions. */
export function DomainHelpCard({ spec }: { spec: SpecialistDomainSpec }): ReactNode {
  return (
    <Card>
      <CardHeader
        title={`${spec.label} submodules (Spec ${spec.specRef})`}
        subtitle="Supervisory coverage areas for this domain. Checklists are generated from these submodules."
      />
      <CardBody>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {spec.submodules.map((s) => (
            <div key={s.key} className="rounded-lg border border-gray-200 bg-page p-3">
              <dt className="text-xs font-semibold text-ink">{s.label}</dt>
              <dd className="mt-1 text-xs text-ink-secondary">{s.description}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  )
}
