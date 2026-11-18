import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Activity,
  BellRing,
  Building,
  CalendarDays,
  ClipboardList,
  Download,
  FileExclamationPoint,
  FileSpreadsheet,
  Gauge,
  RotateCcw,
  TriangleExclamationPoint,
} from 'lucide-react'
import { PortfolioCategoryBar } from '@/components/charts/PortfolioCategoryBar'
import { PrudentialTrendChart } from '@/components/charts/PrudentialTrendChart'
import { RiskDonut } from '@/components/charts/RiskDonut'
import { toast } from '@/components/feedback/toastStore'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { RiskBadge, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { Select } from '@/components/forms/FormControls'
import { StatCard } from '@/components/ui/StatCard'
import { DASHBOARD_PERIOD_LABELS, type AlertRow, type CommandCentreData, type DashboardPeriod } from '@/services/contracts/DashboardService'
import { dashboardService } from '@/services/mock/MockDashboardService'
import { useSessionStore } from '@/store/sessionStore'
import { cx } from '@/utils/cx'
import { formatDate, formatRelativeTime } from '@/utils/datetime'
import { exportCsv } from '@/utils/exportCsv'

/**
 * Supervisory Command Centre (Spec §5.2) — executive overview. Every figure
 * is derived from the mock services over the one coherent demo dataset and
 * is labelled illustrative. KPI cards and chart segments navigate to the
 * matching filtered lists; the alert queue opens a detail drawer.
 */

const DEMO_FIGURES_NOTE = 'All figures are illustrative demo data — not actual statistics.'

const upcomingIcon = {
  examination: ClipboardList,
  'return-deadline': FileSpreadsheet,
  assessment: Gauge,
  'plan-milestone': CalendarDays,
} as const

const severityClasses = {
  critical: 'bg-tint-red text-error',
  warning: 'bg-tint-orange text-warning',
  info: 'bg-tint-blue text-primary',
} as const

export function CommandCentrePage() {
  const navigate = useNavigate()
  const jurisdiction = useSessionStore((s) => s.jurisdiction)
  const [period, setPeriod] = useState<DashboardPeriod>('trailing-12m')
  const [data, setData] = useState<CommandCentreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [activeAlert, setActiveAlert] = useState<AlertRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setData(await dashboardService.getCommandCentre(period))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  const handleExport = () => {
    if (!data) return
    exportCsv(
      `command-centre-${data.reportingDate}.csv`,
      ['Metric', 'Value', 'Note'],
      [
        ['Supervised institutions', data.kpis.supervisedInstitutions, DEMO_FIGURES_NOTE],
        ['High/Critical risk institutions', data.kpis.highCriticalInstitutions, DEMO_FIGURES_NOTE],
        ['Examinations in progress', data.kpis.examinationsInProgress, DEMO_FIGURES_NOTE],
        ['Outstanding supervisory actions', data.kpis.outstandingActions, DEMO_FIGURES_NOTE],
        ['Overdue regulatory returns', data.kpis.overdueReturns, DEMO_FIGURES_NOTE],
        ...data.riskDistribution.map((r) => [`Risk distribution — ${r.rating}`, r.count, DEMO_FIGURES_NOTE]),
        ...data.watchlist.map((w) => [`Watchlist — ${w.institutionName}`, w.reason, DEMO_FIGURES_NOTE]),
      ],
    )
    toast.success('Export ready', 'Prototype CSV downloaded. Demo data — illustrative only.')
  }

  const handleRefresh = () => {
    void load().then(() =>
      toast.info('Demo data refreshed', 'Illustrative figures reloaded from the mock repositories.'),
    )
  }

  if (failed) {
    return (
      <div>
        <PageHeader title="Supervisory Command Centre" />
        <Card>
          <ErrorState onRetry={() => void load()} />
        </Card>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Supervisory Command Centre" subtitle="Loading demo data…" />
        <LoadingSkeleton variant="cards" rows={4} />
        <LoadingSkeleton rows={6} className="mt-4 rounded-xl border border-line bg-card" />
      </div>
    )
  }

  const { kpis } = data
  const trend = (value: number, positiveWhenDown: boolean) =>
    value === 0
      ? undefined
      : {
          direction: (value > 0 ? 'up' : 'down') as 'up' | 'down',
          value: `${value > 0 ? '+' : ''}${value} vs prior period`,
          positive: positiveWhenDown ? value < 0 : value > 0,
        }

  return (
    <div>
      <PageHeader
        title="Supervisory Command Centre"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {jurisdiction ? `${jurisdiction.name} · ${jurisdiction.authority}` : 'Demo jurisdiction'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Reporting date {formatDate(data.reportingDate)}</span>
            <span
              className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase"
              aria-label="Demo data"
            >
              Demo / illustrative figures
            </span>
          </span>
        }
        actions={
          <>
            <div className="w-48">
              <Select
                aria-label="Reporting period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
                options={(Object.keys(DASHBOARD_PERIOD_LABELS) as DashboardPeriod[]).map((p) => ({
                  value: p,
                  label: DASHBOARD_PERIOD_LABELS[p],
                }))}
              />
            </div>
            <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="outline"
              iconLeft={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleRefresh}
            >
              Refresh demo data
            </Button>
          </>
        }
      />

      {/* KPI cards — each navigates to the matching filtered list (Spec §5.2) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Supervised Institutions"
          value={kpis.supervisedInstitutions}
          icon={Building}
          tone="blue"
          footer="Open the institution registry"
          onClick={() => navigate('/app/institutions')}
        />
        <StatCard
          label="High / Critical Risk Institutions"
          value={kpis.highCriticalInstitutions}
          icon={TriangleExclamationPoint}
          tone="red"
          trend={trend(kpis.deltas.highCritical, true)}
          footer="Filtered registry view"
          onClick={() => navigate('/app/institutions?risk=Critical,High')}
        />
        <StatCard
          label="Examinations In Progress"
          value={kpis.examinationsInProgress}
          icon={ClipboardList}
          tone="orange"
          trend={trend(kpis.deltas.examinations, false)}
          footer="Open the examination register"
          onClick={() => navigate('/app/examinations?status=in-progress')}
        />
        <StatCard
          label="Outstanding Supervisory Actions"
          value={kpis.outstandingActions}
          icon={FileExclamationPoint}
          tone="purple"
          trend={trend(kpis.deltas.outstandingActions, true)}
          footer="Open findings & remediation"
          onClick={() => navigate('/app/findings?view=open')}
        />
        <StatCard
          label="Overdue Regulatory Returns"
          value={kpis.overdueReturns}
          icon={FileSpreadsheet}
          tone="yellow"
          trend={trend(kpis.deltas.overdueReturns, true)}
          footer="Open submission monitoring"
          onClick={() => navigate('/app/returns?status=overdue')}
        />
      </div>

      {/* Charts row: donut (1fr) + portfolio by category (2fr) — DS §4.4 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Institutional Risk Distribution"
            action={
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary"
                onClick={() => navigate('/app/institutions')}
              >
                View registry →
              </button>
            }
          />
          <CardBody>
            <RiskDonut
              data={data.riskDistribution}
              onSelect={(rating) => navigate(`/app/institutions?risk=${rating}`)}
            />
            <p className="mt-2 text-center text-[10px] text-ink-tertiary">{DEMO_FIGURES_NOTE}</p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Supervisory Portfolio by Institution Category" />
          <CardBody>
            <PortfolioCategoryBar
              data={data.portfolioByCategory}
              onSelect={(category) =>
                navigate(`/app/institutions?category=${encodeURIComponent(category)}`)
              }
            />
            <p className="mt-1 text-[10px] text-ink-tertiary">
              Bars show institution counts; click a bar to filter the registry. {DEMO_FIGURES_NOTE}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Trend (2fr) + plan execution (1fr) */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Prudential Trend — Capital, NPL & Liquidity"
            action={<span className="text-[10px] font-normal text-ink-tertiary">{DASHBOARD_PERIOD_LABELS[data.period]}</span>}
          />
          <CardBody>
            <PrudentialTrendChart data={data.prudentialTrend} />
            <p className="mt-1 text-[10px] text-ink-tertiary">
              Asset-weighted portfolio averages across the supervised demo population.{' '}
              {DEMO_FIGURES_NOTE}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Examination Plan Execution"
            action={
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary"
                onClick={() => navigate('/app/supervisory-plans')}
              >
                Plans →
              </button>
            }
          />
          <CardBody className="flex flex-col gap-5">
            {data.planExecution.map((plan) => (
              <div key={plan.planName}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-xs leading-snug font-medium text-ink">{plan.planName}</p>
                  <StatusBadge status={plan.status} />
                </div>
                <ProgressBar
                  value={plan.executionPct}
                  tone={plan.executionPct >= 60 ? 'success' : plan.executionPct >= 30 ? 'warning' : 'primary'}
                  showValue
                  label={`${plan.completedActivities}/${plan.plannedActivities} activities`}
                />
              </div>
            ))}
            <p className="text-[10px] text-ink-tertiary">{DEMO_FIGURES_NOTE}</p>
          </CardBody>
        </Card>
      </div>

      {/* Early warnings + high-priority findings */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-warning" aria-hidden="true" />
                Early Warning Alerts Queue
              </span>
            }
            action={
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary"
                onClick={() => navigate('/app/early-warnings')}
              >
                View all →
              </button>
            }
          />
          <CardBody className="p-0">
            {data.earlyWarnings.length === 0 ? (
              <EmptyState title="No active alerts" description="The demo early-warning queue is clear for this period." />
            ) : (
              <ul className="divide-y divide-line-light">
                {data.earlyWarnings.map((alert) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      onClick={() => setActiveAlert(alert)}
                      className="flex w-full cursor-pointer items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-page"
                      aria-label={`Open alert detail — ${alert.indicator}, ${alert.institutionName}`}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          severityClasses[alert.severity],
                        )}
                      >
                        <TriangleExclamationPoint className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-ink">{alert.indicator}</span>
                          <StatusBadge
                            status={alert.status}
                            tone={alert.status === 'Escalated' ? 'overdue' : alert.status === 'Open' ? 'fieldwork' : 'planning'}
                          />
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                          {alert.institutionName} · current {alert.currentValue} vs threshold{' '}
                          {alert.threshold}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-tertiary">
                        {formatRelativeTime(alert.triggeredAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FileExclamationPoint className="h-4 w-4 text-error" aria-hidden="true" />
                High-Priority Supervisory Findings
              </span>
            }
            action={
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-primary-surface hover:text-primary"
                onClick={() => navigate('/app/findings?view=open')}
              >
                View all →
              </button>
            }
          />
          <CardBody className="p-0">
            {data.highPriorityFindings.length === 0 ? (
              <EmptyState title="No high-priority findings" description="No Critical or High demo findings are open." />
            ) : (
              <ul className="divide-y divide-line-light">
                {data.highPriorityFindings.map((finding) => (
                  <li key={finding.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/findings/${finding.id}`)}
                      className="flex w-full cursor-pointer items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-page"
                      aria-label={`Open finding ${finding.reference} — ${finding.title}`}
                    >
                      <RiskBadge rating={finding.riskRating} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-ink">
                          {finding.reference} — {finding.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                          {finding.institutionName} · due {formatDate(finding.dueDate)}
                        </span>
                      </span>
                      <StatusBadge status={finding.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Upcoming + watchlist */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                Upcoming Examinations & Regulatory Deadlines
              </span>
            }
          />
          <CardBody className="p-0">
            {data.upcoming.length === 0 ? (
              <EmptyState title="Nothing scheduled" description="No upcoming demo examinations or deadlines in this period." />
            ) : (
              <ul className="divide-y divide-line-light">
                {data.upcoming.map((item) => {
                  const Icon = upcomingIcon[item.kind]
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => navigate(item.link)}
                        className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-page"
                      >
                        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-blue text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink">{item.title}</span>
                          <span className="block truncate text-[11px] text-ink-secondary">
                            {item.date >= new Date().toISOString().slice(0, 10) ? 'Due' : 'Overdue since'}{' '}
                            {formatDate(item.date)} · {item.statusLabel}
                          </span>
                        </span>
                        <StatusBadge
                          status={item.statusLabel}
                          tone={item.statusLabel === 'Overdue' ? 'overdue' : item.statusLabel === 'Due Soon' ? 'fieldwork' : 'planning'}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-error" aria-hidden="true" />
                Institution Watchlist
              </span>
            }
          />
          <CardBody className="p-0">
            {data.watchlist.length === 0 ? (
              <EmptyState title="Watchlist clear" description="No demo institutions are currently on the watchlist." />
            ) : (
              <ul className="divide-y divide-line-light">
                {data.watchlist.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/institutions/${entry.institutionId}`)}
                      className="flex w-full cursor-pointer items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-page"
                      aria-label={`Open institution profile — ${entry.institutionName}`}
                    >
                      <RiskBadge rating={entry.severity} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink">
                          {entry.institutionName}{' '}
                          <span className="font-mono text-[10px] font-normal text-ink-secondary">
                            {entry.institutionCode}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-secondary">
                          {entry.reason}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-ink-tertiary">
                          On watchlist since {formatDate(entry.addedDate)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card className="mt-5">
        <CardHeader title="Recent Supervisory Activity" />
        <CardBody>
          <ol className="relative ml-2 border-l border-line pl-5">
            {data.timeline.map((event) => (
              <li key={event.id} className="relative pb-4 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute top-1 -left-[26px] h-2.5 w-2.5 rounded-full ring-4 ring-card',
                    event.type === 'alert' || event.type === 'enforcement'
                      ? 'bg-error'
                      : event.type === 'finding'
                        ? 'bg-warning'
                        : event.type === 'examination'
                          ? 'bg-primary-surface'
                          : 'bg-success',
                  )}
                />
                <p className="text-xs font-semibold text-ink">{event.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">{event.detail}</p>
                <p className="mt-0.5 text-[10px] text-ink-tertiary">
                  {event.actor} · {formatRelativeTime(event.at)}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[10px] text-ink-tertiary">{DEMO_FIGURES_NOTE}</p>
        </CardBody>
      </Card>

      {/* Alert detail drawer (Spec §5.2 — alert opens alert detail drawer) */}
      <Drawer
        open={activeAlert !== null}
        onClose={() => setActiveAlert(null)}
        title={
          <span className="flex items-center gap-2">
            Early Warning Alert
            {activeAlert && <StatusBadge status={activeAlert.status} tone={activeAlert.status === 'Escalated' ? 'overdue' : 'fieldwork'} />}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveAlert(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success('Demo action completed', 'Alert acknowledgement simulated — saved in prototype session only.')
                setActiveAlert(null)
              }}
            >
              Acknowledge (demo)
            </Button>
          </div>
        }
      >
        {activeAlert && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="overline">Indicator</p>
              <p className="mt-1 text-sm font-semibold text-ink">{activeAlert.indicator}</p>
            </div>
            <div>
              <p className="overline">Institution</p>
              <button
                type="button"
                className="mt-1 cursor-pointer text-sm font-medium text-primary-surface hover:underline"
                onClick={() => {
                  const id = activeAlert.institutionId
                  setActiveAlert(null)
                  navigate(`/app/institutions/${id}`)
                }}
              >
                {activeAlert.institutionName} ({activeAlert.institutionCode})
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="overline">Current value</p>
                <p className="mt-1 font-mono text-sm font-semibold text-error">{activeAlert.currentValue}</p>
              </div>
              <div>
                <p className="overline">Threshold</p>
                <p className="mt-1 font-mono text-sm text-ink">{activeAlert.threshold}</p>
              </div>
            </div>
            <div>
              <p className="overline">Triggered</p>
              <p className="mt-1 text-xs text-ink-secondary">
                {formatDate(activeAlert.triggeredAt)} ({formatRelativeTime(activeAlert.triggeredAt)})
              </p>
            </div>
            {activeAlert.assignedToName && (
              <div>
                <p className="overline">Assigned analyst</p>
                <p className="mt-1 text-xs text-ink">{activeAlert.assignedToName}</p>
              </div>
            )}
            <div>
              <p className="overline">Detail</p>
              <p className="mt-1 text-xs leading-relaxed text-ink">{activeAlert.message}</p>
            </div>
            <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Prototype drawer — acknowledging an alert is a demo action saved in this session only.
              {DEMO_FIGURES_NOTE}
            </p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
