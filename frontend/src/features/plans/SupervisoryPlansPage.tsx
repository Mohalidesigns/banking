import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Plus } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Select } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { planService } from '@/services/mock/MockPlanService'
import type { Institution } from '@/types/institution'
import type { PlanActivity, SupervisoryPlanDetail } from '@/types/supervision'
import { cx } from '@/utils/cx'
import { formatDate } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Supervisory Plans (Spec §6.3): annual/quarterly/event-driven plans with
 * list and calendar views, coverage, activities, priority, team, effort,
 * dates and execution progress. Calendar shows activities across all plans.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  Approved: 'active',
  'In Execution': 'fieldwork',
  Completed: 'completed',
}

const PRIORITY_DOT: Record<string, string> = {
  Critical: 'bg-error',
  High: 'bg-warning',
  Medium: 'bg-accent',
  Low: 'bg-success',
}

const monthLabel = (d: Date): string =>
  d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export function SupervisoryPlansPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-plans')

  const [plans, setPlans] = useState<SupervisoryPlanDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [cycleFilter, setCycleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const load = useCallback(async () => {
    const [list, instPage] = await Promise.all([
      planService.list(),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setPlans(list)
    setInstitutions(instPage.items)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!plans) return []
    return plans
      .filter((p) => !cycleFilter || p.cycle === cycleFilter)
      .filter((p) => !statusFilter || p.status === statusFilter)
  }, [plans, cycleFilter, statusFilter])

  const allActivities = useMemo(
    () => rows.flatMap((p) => p.activities.map((a) => ({ ...a, planId: p.id, planName: p.name }))),
    [rows],
  )

  const handleExport = () => {
    if (!can(actor.actorRole, 'export')) {
      toast.warning('Export not permitted', `The "${actor.actorRole}" demo role cannot export (Spec §19).`)
      return
    }
    exportCsv(
      'atheris-reg-supervisory-plans-demo.csv',
      ['Plan', 'Year', 'Cycle', 'Quarter', 'Status', 'Lead', 'Activities', 'Completed', 'Execution %'],
      rows.map((p) => [p.name, p.year, p.cycle, p.quarter ?? '—', p.status, p.leadName, p.plannedActivities, p.completedActivities, p.executionPct]),
    )
    toast.success('Export ready', 'Prototype CSV downloaded — fictional demo data.')
  }

  const columns = useMemo<Array<ColumnDef<SupervisoryPlanDetail, unknown>>>(
    () => [
      {
        accessorKey: 'name',
        header: 'Plan',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.name}</p>
            <p className="text-[10px] text-ink-secondary">
              {row.original.year} · {row.original.cycle}
              {row.original.quarter ? ` · ${row.original.quarter}` : ''}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} tone={STATUS_TONES[row.original.status]} />,
      },
      {
        id: 'coverage',
        accessorFn: (p) => p.institutionIds.length,
        header: 'Institution coverage',
        cell: ({ row }) => (
          <span className="text-xs text-ink">
            {row.original.institutionIds.length}{' '}
            <span className="text-[10px] text-ink-secondary">
              of {institutions.length || 8} demo institutions
            </span>
          </span>
        ),
      },
      {
        id: 'activities',
        accessorFn: (p) => p.plannedActivities,
        header: 'Activities',
        cell: ({ row }) => (
          <span className="text-xs text-ink">
            {row.original.completedActivities}/{row.original.plannedActivities} complete
          </span>
        ),
      },
      { accessorKey: 'leadName', header: 'Responsible lead' },
      {
        id: 'execution',
        accessorFn: (p) => p.executionPct,
        header: 'Execution progress',
        cell: ({ row }) => (
          <div className="w-32">
            <ProgressBar
              value={row.original.executionPct}
              showValue
              tone={row.original.executionPct >= 60 ? 'success' : row.original.executionPct >= 30 ? 'primary' : 'warning'}
              label="Execution"
            />
          </div>
        ),
      },
    ],
    [institutions.length],
  )

  // --- calendar helpers -------------------------------------------------------

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const startPad = (first.getDay() + 6) % 7 // Monday-first grid
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ date: Date | null; activities: Array<PlanActivity & { planId: string; planName: string }> }> = []
    for (let i = 0; i < startPad; i += 1) cells.push({ date: null, activities: [] })
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      const iso = date.toISOString().slice(0, 10)
      cells.push({
        date,
        activities: allActivities.filter((a) => a.startDate <= iso && iso <= a.endDate),
      })
    }
    return cells
  }, [cursor, allActivities])

  return (
    <div>
      <PageHeader
        title="Supervisory Plans"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Annual, quarterly and event-driven supervisory planning — demo data</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border border-line">
              <button
                type="button"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={cx(
                  'flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                  view === 'list' ? 'bg-primary text-white' : 'bg-card text-ink-secondary hover:text-primary',
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" /> List
              </button>
              <button
                type="button"
                aria-pressed={view === 'calendar'}
                onClick={() => setView('calendar')}
                className={cx(
                  'flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                  view === 'calendar' ? 'bg-primary text-white' : 'bg-card text-ink-secondary hover:text-primary',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Calendar
              </button>
            </div>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              disabled={!canManage}
              title={canManage ? undefined : 'Your demo role cannot create plans (Spec §19)'}
              onClick={() => navigate('/app/supervisory-plans/new')}
            >
              New plan
            </Button>
          </>
        }
      />

      {plans === null ? (
        <LoadingSkeleton rows={6} className="rounded-xl border border-line bg-card" />
      ) : view === 'list' ? (
        <DataTable<SupervisoryPlanDetail>
          columns={columns}
          data={rows}
          title="Plan register"
          headerAction={<span className="text-xs text-ink-secondary">{rows.length} plans · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/app/supervisory-plans/${row.id}`)}
          initialPageSize={10}
          emptyTitle="No plans match"
          emptyDescription="Adjust the filters or create a plan with the 7-step wizard."
          onRetry={() => void load()}
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                aria-label="Filter by cycle"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                placeholder="All cycles"
                options={['Annual', 'Quarterly', 'Event-Driven'].map((c) => ({ value: c, label: c }))}
              />
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All statuses"
                options={['Draft', 'Approved', 'In Execution', 'Completed'].map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      ) : (
        <Card>
          <CardHeader
            title={monthLabel(cursor)}
            subtitle="Planned supervisory activities across every visible plan (demo schedule)."
            action={
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
                  Today
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </span>
            }
          />
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink-secondary">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, i) => (
                <div
                  key={i}
                  className={cx(
                    'min-h-20 rounded-lg border p-1.5 text-left',
                    cell.date ? 'border-line bg-card' : 'border-transparent bg-transparent',
                  )}
                >
                  {cell.date && (
                    <>
                      <p className="text-[10px] font-semibold text-ink-secondary">{cell.date.getDate()}</p>
                      <div className="mt-1 flex flex-col gap-1">
                        {cell.activities.slice(0, 2).map((a) => (
                          <button
                            key={`${a.planId}-${a.id}`}
                            type="button"
                            title={`${a.title} — ${a.teamName} (${a.planName})`}
                            onClick={() => navigate(`/app/supervisory-plans/${a.planId}`)}
                            className="flex cursor-pointer items-center gap-1 truncate rounded bg-page px-1.5 py-0.5 text-left text-[9px] text-ink hover:bg-tint-blue"
                          >
                            <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[a.priority])} />
                            <span className="truncate">{a.title}</span>
                          </button>
                        ))}
                        {cell.activities.length > 2 && (
                          <span className="px-1 text-[9px] text-ink-secondary">+{cell.activities.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {allActivities.length === 0 && (
              <EmptyState
                title="No activities this month"
                description="Navigate to another month or adjust the plan filters — the demo plans span 2026–2027."
              />
            )}
            <p className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-ink-secondary">
              <span className="overline">Priority:</span>
              {(['Critical', 'High', 'Medium', 'Low'] as const).map((p) => (
                <span key={p} className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className={cx('h-2 w-2 rounded-full', PRIORITY_DOT[p])} />
                  {p}
                </span>
              ))}
              <span>· activity dates are demo schedule data; first visible activity: {allActivities[0] ? formatDate(allActivities[0].startDate) : '—'}</span>
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
