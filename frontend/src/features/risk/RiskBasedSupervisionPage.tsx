import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Gauge, Plus, Table2 } from 'lucide-react'
import { RiskHeatMap, type HeatCell } from '@/components/charts/RiskHeatMap'
import { LoadingSkeleton } from '@/components/feedback/States'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { riskAssessmentService } from '@/services/mock/MockRiskAssessmentService'
import type { Institution } from '@/types/institution'
import type { RiskAssessmentDetail } from '@/types/supervision'
import { formatDate } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Risk-Based Supervision overview (Spec §6.2 companion route): the
 * portfolio view over the assessment register — coverage this cycle, the
 * inherent × control heat map of every institution's latest assessment, and
 * the recommended supervisory intensity table that drives examination
 * planning (Spec §6.3). All figures are illustrative demo data derived from
 * the configured demo methodology — never a universal regulatory formula.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  'Not Started': 'draft',
  'In Progress': 'fieldwork',
  'In Review': 'reporting',
  Completed: 'completed',
}

const intensityTone: Record<string, string> = {
  Routine: 'bg-tint-green text-success',
  Enhanced: 'bg-tint-yellow text-yellow',
  Intensive: 'bg-tint-orange text-warning',
  Intervention: 'bg-tint-red text-error',
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length

export function RiskBasedSupervisionPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const canSubmit = can(actor.actorRole, 'submit-assessment')

  const [assessments, setAssessments] = useState<RiskAssessmentDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])

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

  /** Latest assessment per institution (highest year, then most recent id). */
  const latestByInstitution = useMemo(() => {
    if (!assessments) return []
    const map = new Map<string, RiskAssessmentDetail>()
    for (const a of assessments) {
      const current = map.get(a.institutionId)
      if (!current || a.year > current.year) map.set(a.institutionId, a)
    }
    return Array.from(map.values()).sort((x, y) => y.compositeScore - x.compositeScore)
  }, [assessments])

  const heatCells = useMemo<HeatCell[]>(() => {
    const cells: HeatCell[] = []
    for (const a of latestByInstitution) {
      if (a.categoryScores.length === 0) continue
      const x = Math.min(5, Math.max(1, Math.round(mean(a.categoryScores.map((c) => c.inherent)))))
      const y = Math.min(5, Math.max(1, Math.round(mean(a.categoryScores.map((c) => c.control)))))
      const tone = Math.min(5, Math.max(1, Math.round(a.compositeScore))) as HeatCell['tone']
      const name = instById.get(a.institutionId)?.tradingName ?? a.reference
      const existing = cells.find((c) => c.x === x && c.y === y)
      if (existing) {
        existing.count += 1
        existing.title = `${existing.title}, ${name}`
      } else {
        cells.push({ x, y, count: 1, tone, title: name, label: name.slice(0, 3).toUpperCase() })
      }
    }
    return cells
  }, [latestByInstitution, instById])

  if (assessments === null) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  const year = new Date().getFullYear()
  const thisCycle = assessments.filter((a) => a.year === year)
  const counts = {
    covered: new Set(thisCycle.map((a) => a.institutionId)).size,
    total: institutions.length,
    inProgress: assessments.filter((a) => a.status === 'In Progress').length,
    inReview: assessments.filter((a) => a.status === 'In Review').length,
    completed: thisCycle.filter((a) => a.status === 'Completed').length,
  }
  const methodology = assessments.find((a) => a.methodologyId)?.methodologyName

  return (
    <div>
      <PageHeader
        title="Risk-Based Supervision"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              Portfolio risk view driving supervisory intensity and plan coverage
              {methodology ? ` — ${methodology} (demo methodology)` : ''}
            </span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" iconLeft={<Table2 className="h-4 w-4" />} onClick={() => navigate('/app/risk-assessments')}>
              Assessment register
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

      {/* Coverage KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          tone="blue"
          icon={Gauge}
          label={`${year} cycle coverage`}
          value={`${counts.covered}/${counts.total}`}
          footer="Institutions with an assessment this cycle (demo)"
          onClick={() => navigate('/app/risk-assessments')}
        />
        <StatCard
          tone="orange"
          icon={Gauge}
          label="In progress"
          value={counts.inProgress}
          footer="Scoring under way in the wizard"
          onClick={() => navigate('/app/risk-assessments')}
        />
        <StatCard
          tone="purple"
          icon={Gauge}
          label="Awaiting approval"
          value={counts.inReview}
          footer="With reviewers (Spec §19 gating)"
          onClick={() => navigate('/app/risk-assessments')}
        />
        <StatCard
          tone="green"
          icon={Gauge}
          label="Completed this cycle"
          value={counts.completed}
          footer="Approved assessments (demo)"
          onClick={() => navigate('/app/risk-assessments')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Portfolio heat map */}
        <Card>
          <CardHeader
            title="Portfolio risk position"
            subtitle="Latest assessment per institution: mean inherent risk × mean control weakness (demo scores)."
          />
          <CardBody>
            <RiskHeatMap
              cells={heatCells}
              xLabel="Mean inherent risk →"
              yLabel="Mean control weakness →"
              xTicks={['1', '2', '3', '4', '5']}
              yTicks={['1', '2', '3', '4', '5']}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-secondary">
              Cell labels are institution name fragments; hover/tap for the full name. Colour bands follow the
              configured demo methodology's residual scale — illustrative only.
            </p>
          </CardBody>
        </Card>

        {/* Intensity table */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recommended supervisory intensity"
            subtitle="Derived from each institution's latest assessment (demo mapping shown in the methodology card)."
            action={
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-primary hover:underline"
                onClick={() => navigate('/app/supervisory-plans')}
              >
                View supervisory plans
              </button>
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="overline border-b border-line bg-page">
                  <th className="px-5 py-2.5">Institution</th>
                  <th className="px-3 py-2.5">Assessment</th>
                  <th className="px-3 py-2.5">Overall risk</th>
                  <th className="px-3 py-2.5">Composite (demo)</th>
                  <th className="px-3 py-2.5">Intensity</th>
                  <th className="px-3 py-2.5">Due / completed</th>
                </tr>
              </thead>
              <tbody>
                {latestByInstitution.map((a) => {
                  const inst = instById.get(a.institutionId)
                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-page"
                      onClick={() => navigate(`/app/risk-assessments/${a.id}`)}
                    >
                      <td className="px-5 py-2.5">
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/app/institutions/${a.institutionId}/risk`)
                          }}
                        >
                          {inst?.tradingName ?? '—'}
                        </button>
                        <p className="text-[10px] text-ink-secondary">{inst?.category}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[11px] font-semibold text-ink">{a.reference}</span>
                        <span className="mt-0.5 block">
                          <StatusBadge status={a.status} tone={STATUS_TONES[a.status]} />
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskBadge rating={a.overallRisk} />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-ink">{a.compositeScore.toFixed(1)}</td>
                      <td className="px-3 py-2.5">
                        <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-semibold', intensityTone[a.recommendedIntensity] ?? 'bg-page text-ink-secondary')}>
                          {a.recommendedIntensity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-secondary">
                        {a.completedDate ? formatDate(a.completedDate) : `due ${formatDate(a.dueDate)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Methodology explanation */}
        <Card className="xl:col-span-3">
          <CardHeader
            title="Methodology and demo scoring"
            subtitle="Shown per Spec §6.2 — the prototype never presents its scoring as a universal regulatory formula."
            action={<Gauge className="h-4 w-4 text-primary" aria-hidden="true" />}
          />
          <CardBody>
            <MethodologyNotes assessments={assessments} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function MethodologyNotes({ assessments }: { assessments: RiskAssessmentDetail[] }) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<string | null>(null)

  useEffect(() => {
    void riskAssessmentService.methodologies().then((meths) => {
      const used = meths.find((m) => assessments.some((a) => a.methodologyId === m.id)) ?? meths[0]
      setNotes(used ? `${used.name} ${used.version}: ${used.scoringNote}` : null)
    })
  }, [assessments])

  if (notes === null) return <p className="text-xs text-ink-secondary">Loading methodology notes…</p>
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start">
      <p className="flex-1 text-xs leading-relaxed text-ink-secondary">{notes}</p>
      <div className="flex shrink-0 flex-col gap-2">
        <p className="overline">Intensity mapping (demo)</p>
        <ul className="flex flex-col gap-1 text-[11px] text-ink-secondary">
          {(['Routine', 'Enhanced', 'Intensive', 'Intervention'] as const).map((level) => (
            <li key={level} className="flex items-center gap-2">
              <span className={cx('h-2.5 w-2.5 rounded-sm', intensityTone[level].split(' ')[0])} aria-hidden="true" />
              {level}
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/risk-assessments')}>
          Open the assessment register
        </Button>
      </div>
    </div>
  )
}
