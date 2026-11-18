import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { FolderSearch } from 'lucide-react'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/Progress'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import type { Institution } from '@/types/institution'
import type { ExaminationDetail } from '@/types/examination'
import { formatDate } from '@/utils/datetime'

/**
 * Fieldwork landing (sidebar route /app/fieldwork): the examinations
 * currently in active fieldwork, each one action into its three-panel
 * workspace (Spec §7.4). No dead end — empty state routes to the register.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  'In Progress': 'active',
  Fieldwork: 'fieldwork',
  Reporting: 'reporting',
}

export function FieldworkPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const canFieldwork = can(actor.actorRole, 'record-fieldwork')

  const [exams, setExams] = useState<ExaminationDetail[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])

  const load = useCallback(async () => {
    const [list, instPage] = await Promise.all([
      examinationService.list({}),
      institutionService.list({ page: 1, pageSize: 200 }),
    ])
    setInstitutions(instPage.items)
    setExams(
      list.filter((e) => e.status === 'Fieldwork' || e.status === 'In Progress' || e.status === 'Reporting'),
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  if (exams === null) {
    return <LoadingSkeleton rows={6} className="rounded-xl border border-line bg-card" />
  }

  return (
    <div>
      <PageHeader
        title="Fieldwork Workspace"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Examinations in active fieldwork — open the daily-use three-panel workspace</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Illustrative demo data
            </span>
          </span>
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/app/examinations')}>
            Full examination register
          </Button>
        }
      />

      {exams.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FolderSearch className="h-8 w-8 text-primary" />}
              title="No examinations in active fieldwork"
              description="When an examination moves to the Fieldwork stage it appears here with a direct workspace action. Everything is demo data."
              action={{ label: 'Open examination register', onClick: () => navigate('/app/examinations') }}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((e) => (
            <Card key={e.id} hoverable className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] font-semibold text-primary">{e.reference}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">
                    {instById.get(e.institutionId)?.tradingName ?? 'Institution'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-secondary">{e.title}</p>
                </div>
                <StatusBadge status={e.status} tone={STATUS_TONES[e.status] ?? 'draft'} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <RiskBadge rating={e.riskRating} />
                <span className="text-[10px] text-ink-secondary">
                  {formatDate(e.startDate)} → {formatDate(e.plannedEndDate)}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={e.progressPct}
                  showValue
                  tone={e.progressPct >= 100 ? 'success' : 'primary'}
                  label="Fieldwork progress"
                />
              </div>
              <p className="mt-2 text-[10px] text-ink-secondary">
                Lead {e.leadExaminerName} · {e.team.length} team member(s) · {e.findingsCount} finding(s)
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/app/examinations/${e.id}`)}>
                  Detail
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<FolderSearch className="h-3.5 w-3.5" />}
                  disabled={!canFieldwork}
                  title={canFieldwork ? undefined : 'Your demo role has no fieldwork access (Spec §19)'}
                  onClick={() => navigate(`/app/examinations/${e.id}/workspace`)}
                >
                  Open workspace
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
