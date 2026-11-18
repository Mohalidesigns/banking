import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Info,
  Save,
  Send,
} from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { RiskBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { riskAssessmentService } from '@/services/mock/MockRiskAssessmentService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution } from '@/types/institution'
import type { AssessmentCategoryScore, AssessmentMethodology } from '@/types/supervision'
import type { RiskRating } from '@/types/common'
import { cx } from '@/utils/cx'

/**
 * Create-assessment wizard (Spec §6.2): eight steps with a progress
 * indicator — institution & period, approved methodology/version, risk
 * categories, inherent risk + evidence, control effectiveness, residual
 * determination via the configured methodology, supervisory judgement and
 * overrides, review & submit for approval. Demo scoring is explained at
 * every step; nothing is presented as a universal regulatory formula.
 */

const STEPS = [
  'Institution & period',
  'Methodology',
  'Risk categories',
  'Inherent risk & evidence',
  'Control effectiveness',
  'Residual risk',
  'Judgement & overrides',
  'Review & submit',
]

interface CategoryDraft {
  inherent: number
  control: number
  inherentEvidence: string
  controlEvidence: string
  narrative: string
  overrideResidual: number
  overrideReason: string
}

const emptyDraft = (): CategoryDraft => ({
  inherent: 0,
  control: 0,
  inherentEvidence: '',
  controlEvidence: '',
  narrative: '',
  overrideResidual: 0,
  overrideReason: '',
})

const ratingOf = (value: number): RiskRating =>
  value >= 4.5 ? 'Critical' : value >= 3.5 ? 'High' : value >= 2.5 ? 'Medium' : 'Low'

function ScorePicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="overline">{label}</p>
      <div className="mt-1 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cx(
              'h-9 w-9 cursor-pointer rounded-lg border text-sm font-semibold transition-colors',
              value === n
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-card text-ink-secondary hover:border-primary-surface hover:text-primary',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-[10px] text-ink-secondary">{hint}</p>}
    </div>
  )
}

export function RiskAssessmentWizardPage() {
  const navigate = useNavigate()
  const actor = useActor()
  const [searchParams] = useSearchParams()
  const canSubmit = can(actor.actorRole, 'submit-assessment')

  const [step, setStep] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [institutions, setInstitutions] = useState<Institution[] | null>(null)
  const [methodologies, setMethodologies] = useState<AssessmentMethodology[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  // Step 1 — institution & period
  const [institutionId, setInstitutionId] = useState(searchParams.get('institutionId') ?? '')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [periodStart, setPeriodStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`)
  const [dueDate, setDueDate] = useState('')

  // Step 2 — methodology
  const [methodologyId, setMethodologyId] = useState('')

  // Step 3 — categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Steps 4–7 — scoring drafts keyed by category
  const [drafts, setDrafts] = useState<Record<string, CategoryDraft>>({})
  const [judgement, setJudgement] = useState('')
  const [reviewerName, setReviewerName] = useState('')

  useEffect(() => {
    void (async () => {
      const [instPage, meths] = await Promise.all([
        institutionService.list({ page: 1, pageSize: 200 }),
        riskAssessmentService.approvedMethodologies(),
      ])
      setInstitutions(instPage.items)
      setMethodologies(meths)
      if (meths.length > 0) {
        setMethodologyId((prev) => prev || meths[0].id)
        setSelectedCategories((prev) => (prev.length > 0 ? prev : [...meths[0].categories]))
      }
    })()
  }, [])

  const methodology = useMemo(
    () => methodologies.find((m) => m.id === methodologyId),
    [methodologies, methodologyId],
  )

  const draftFor = useCallback(
    (category: string): CategoryDraft => drafts[category] ?? emptyDraft(),
    [drafts],
  )

  const setDraft = (category: string, patch: Partial<CategoryDraft>) =>
    setDrafts((prev) => ({ ...prev, [category]: { ...(prev[category] ?? emptyDraft()), ...patch } }))

  const residualOf = useCallback(
    (d: CategoryDraft): number => {
      if (d.overrideResidual > 0) return d.overrideResidual
      if (d.inherent === 0 || d.control === 0) return 0
      return riskAssessmentService.computeResidual(d.inherent, d.control)
    },
    [],
  )

  const composite = useMemo(() => {
    const residuals = selectedCategories.map((c) => residualOf(draftFor(c))).filter((r) => r > 0)
    if (residuals.length === 0) return 0
    return Math.round((residuals.reduce((a, b) => a + b, 0) / residuals.length) * 10) / 10
  }, [selectedCategories, drafts, residualOf, draftFor])

  const dirty =
    institutionId !== '' ||
    methodologyId !== (methodologies[0]?.id ?? '') ||
    Object.values(drafts).some((d) => d.inherent > 0 || d.control > 0 || d.narrative !== '' || d.overrideResidual > 0) ||
    judgement !== ''

  // --- per-step validation ---------------------------------------------------

  const stepErrors = useMemo((): string[] => {
    switch (step) {
      case 0: {
        const errs: string[] = []
        if (!institutionId) errs.push('Select the institution under assessment.')
        if (!year) errs.push('Assessment year is required.')
        if (!periodStart || !periodEnd) errs.push('Assessment period start and end are required.')
        if (periodStart && periodEnd && periodEnd <= periodStart) errs.push('Period end must be after period start.')
        if (!dueDate) errs.push('A review due date is required.')
        return errs
      }
      case 1:
        return methodologyId ? [] : ['Select an approved methodology version.']
      case 2:
        return selectedCategories.length > 0 ? [] : ['Select at least one risk category.']
      case 3:
        return selectedCategories.filter((c) => draftFor(c).inherent === 0).length > 0
          ? ['Score inherent risk (1–5) for every selected category.']
          : []
      case 4:
        return selectedCategories.filter((c) => draftFor(c).control === 0).length > 0
          ? ['Score control effectiveness (1–5) for every selected category.']
          : []
      case 6:
        return selectedCategories
          .filter((c) => draftFor(c).overrideResidual > 0 && draftFor(c).overrideReason.trim() === '')
          .map((c) => `An override reason is required for "${c}".`)
      default:
        return []
    }
  }, [step, institutionId, year, periodStart, periodEnd, dueDate, methodologyId, selectedCategories, draftFor])

  const canProceed = stepErrors.length === 0

  const goTo = (next: number) => {
    setStep(next)
    setMaxVisited((m) => Math.max(m, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNext = () => {
    if (!canProceed) return
    goTo(Math.min(STEPS.length - 1, step + 1))
  }

  // --- submission --------------------------------------------------------------

  const buildScores = (): AssessmentCategoryScore[] =>
    selectedCategories.map((category) => {
      const d = draftFor(category)
      const residual = residualOf(d)
      return {
        category,
        inherent: d.inherent,
        control: d.control,
        residual,
        evidenceRefs: [d.inherentEvidence, d.controlEvidence].map((s) => s.trim()).filter(Boolean),
        narrative: d.narrative.trim() || undefined,
        overridden: d.overrideResidual > 0,
        overrideReason: d.overrideResidual > 0 ? d.overrideReason.trim() : undefined,
      }
    })

  const handleFinish = async (submit: boolean) => {
    if (submit && !canSubmit) {
      toast.error('Not permitted', `The current demo role cannot submit assessments (Spec §19).`)
      return
    }
    const missing: string[] = []
    if (!institutionId) missing.push('institution (step 1)')
    if (!methodology) missing.push('methodology (step 2)')
    if (selectedCategories.length === 0) missing.push('risk categories (step 3)')
    if (selectedCategories.some((c) => draftFor(c).inherent === 0)) missing.push('inherent scores (step 4)')
    if (selectedCategories.some((c) => draftFor(c).control === 0)) missing.push('control scores (step 5)')
    if (submit && judgement.trim() === '') missing.push('supervisory judgement (step 7)')
    if (missing.length > 0) {
      toast.error('Cannot submit', `Missing: ${missing.join(', ')}.`)
      return
    }
    setSaving(true)
    try {
      const created = await riskAssessmentService.create(
        {
          institutionId,
          year: Number(year),
          periodStart,
          periodEnd,
          methodologyId: methodology!.id,
          assessedByName: actor.actorName,
          dueDate,
          categoryScores: buildScores(),
          supervisoryJudgement: judgement.trim(),
          reviewerName: reviewerName.trim() || undefined,
          submit,
        },
        actor,
      )
      toast.success(
        submit ? 'Submitted for approval' : 'Draft saved',
        `${created.reference} — saved in prototype session (demo data).`,
      )
      setConfirmCancel(false)
      navigate(`/app/risk-assessments/${created.id}`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The prototype could not save the assessment.')
    } finally {
      setSaving(false)
    }
  }

  if (!canSubmit) {
    return (
      <div>
        <PageHeader title="New Risk Assessment" breadcrumbs={[{ label: 'Risk Assessments', path: '/app/risk-assessments' }]} />
        <EmptyState
          icon={<CircleAlert className="h-8 w-8 text-warning" />}
          title="Permission denied (demo role)"
          description={`The "${actor.actorRole}" demo role cannot create risk assessments (Spec §19 role matrix). Switch to a Risk Analyst, Team Lead or Director role from the avatar menu to run the wizard.`}
          action={{ label: 'Back to register', onClick: () => navigate('/app/risk-assessments') }}
        />
      </div>
    )
  }

  if (institutions === null) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  const instName = institutions.find((i) => i.id === institutionId)?.tradingName

  return (
    <div>
      <PageHeader
        title="New Risk Assessment"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Eight-step assessment wizard — all scoring is illustrative demo data</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo / illustrative
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Risk Assessments', path: '/app/risk-assessments' }]}
        actions={
          <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={() => (dirty ? setConfirmCancel(true) : navigate('/app/risk-assessments'))}>
            Cancel
          </Button>
        }
      />

      {/* Progress indicator — 8 steps (Spec §6.2 / §17.2) */}
      <nav aria-label="Wizard progress" className="mb-6">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : i <= maxVisited ? 'todo' : 'locked'
            return (
              <li key={label} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={i > maxVisited}
                  onClick={() => i <= maxVisited && goTo(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cx(
                    'flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    state === 'done' && 'bg-tint-green text-success',
                    state === 'current' && 'bg-primary text-white',
                    state === 'todo' && 'bg-page text-ink-secondary hover:text-primary',
                    state === 'locked' && 'cursor-not-allowed bg-page text-gray-400',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold',
                      state === 'done' ? 'bg-success text-white' : state === 'current' ? 'bg-accent text-primary' : 'bg-line text-ink-secondary',
                    )}
                  >
                    {state === 'done' ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden md:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-line" />}
              </li>
            )
          })}
        </ol>
      </nav>

      {stepErrors.length > 0 && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-tint-red px-3 py-2 text-xs text-error">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <ul className="list-inside list-disc">
            {stepErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1 — institution & period */}
      {step === 0 && (
        <Card>
          <CardHeader title="Step 1 — Institution and assessment period" />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Institution"
                required
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="Select a supervised institution…"
                options={institutions.map((i) => ({ value: i.id, label: `${i.tradingName} (${i.code})` }))}
                help="All institutions are fictional demo entities (Spec §17.5)."
              />
              <Select
                label="Assessment year"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={[2026, 2027].map((y) => ({ value: String(y), label: String(y) }))}
              />
              <TextInput
                label="Period start"
                required
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
              <TextInput
                label="Period end"
                required
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
              <TextInput
                label="Review due date"
                required
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                help="Target date for reviewer approval of this assessment."
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2 — methodology */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Step 2 — Approved methodology and version" subtitle="Only approved versions are selectable (Spec §6.2)." />
            <CardBody>
              <div className="flex flex-col gap-3">
                {methodologies.map((m) => (
                  <label
                    key={m.id}
                    className={cx(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      methodologyId === m.id ? 'border-primary bg-tint-blue/40' : 'border-line hover:border-primary-surface',
                    )}
                  >
                    <input
                      type="radio"
                      name="methodology"
                      className="mt-1 accent-[var(--tld-primary)]"
                      checked={methodologyId === m.id}
                      onChange={() => {
                        setMethodologyId(m.id)
                        setSelectedCategories([...m.categories])
                      }}
                    />
                    <span>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                        {m.name}
                        <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] text-primary">{m.version}</span>
                        <span className="rounded-full bg-tint-green px-2 py-0.5 text-[9px] font-semibold text-success">Approved</span>
                      </span>
                      <span className="mt-1 block text-xs text-ink-secondary">{m.description}</span>
                    </span>
                  </label>
                ))}
                <p className="flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-accent-dark">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Draft methodologies (e.g. v4.0 with conduct and climate categories) are visible in the
                  methodology list but cannot be selected until approved — a prototype rule mirroring
                  Spec §6.2/§7.5.
                </p>
              </div>
            </CardBody>
          </Card>
          {methodology && (
            <Card>
              <CardHeader title="How the demo scoring works" />
              <CardBody>
                <p className="text-xs leading-relaxed text-ink-secondary">{methodology.scoringNote}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Step 3 — categories */}
      {step === 2 && methodology && (
        <Card>
          <CardHeader
            title="Step 3 — Assess risk categories"
            subtitle={`${methodology.name} ${methodology.version} defines ${methodology.categories.length} categories.`}
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {methodology.categories.map((category) => (
                <Checkbox
                  key={category}
                  label={category}
                  checked={selectedCategories.includes(category)}
                  onChange={(e) =>
                    setSelectedCategories((prev) =>
                      e.target.checked ? [...prev, category] : prev.filter((c) => c !== category),
                    )
                  }
                />
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 4 — inherent risk & evidence */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {selectedCategories.map((category) => {
            const d = draftFor(category)
            return (
              <Card key={category}>
                <CardHeader title={category} subtitle="Inherent risk before controls (demo 1–5 scale: 1 lowest, 5 highest)." />
                <CardBody>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <ScorePicker
                      label="Inherent risk score"
                      value={d.inherent}
                      onChange={(v) => setDraft(category, { inherent: v })}
                      hint={d.inherent > 0 ? `Rating: ${ratingOf(d.inherent)} (demo mapping)` : undefined}
                    />
                    <TextInput
                      label="Supporting evidence reference"
                      placeholder="e.g. Q3 off-site pack, return MPR-09, prior exam EXM-2026-0xx (demo)"
                      value={d.inherentEvidence}
                      onChange={(e) => setDraft(category, { inherentEvidence: e.target.value })}
                      help="Free-text evidence pointer — the prototype does not store real documents."
                    />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Step 5 — control effectiveness */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          {selectedCategories.map((category) => {
            const d = draftFor(category)
            return (
              <Card key={category}>
                <CardHeader title={category} subtitle="Control effectiveness (demo 1–5 scale: 1 strong controls, 5 weak controls)." />
                <CardBody>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <ScorePicker
                      label="Control effectiveness score"
                      value={d.control}
                      onChange={(v) => setDraft(category, { control: v })}
                      hint={d.control > 0 ? (d.control <= 2 ? 'Strong controls (demo)' : d.control <= 3 ? 'Moderate controls (demo)' : 'Weak controls (demo)') : undefined}
                    />
                    <TextInput
                      label="Control evidence reference"
                      placeholder="e.g. policy v3, control testing memo, audit report ref (demo)"
                      value={d.controlEvidence}
                      onChange={(e) => setDraft(category, { controlEvidence: e.target.value })}
                    />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Step 6 — residual determination */}
      {step === 5 && (
        <Card>
          <CardHeader
            title="Step 6 — Residual risk (configured methodology)"
            subtitle={`Derived with ${methodology?.name ?? ''} ${methodology?.version ?? ''} — demo matrix, not a universal regulatory formula.`}
          />
          <CardBody>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="overline border-b border-line">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Inherent</th>
                  <th className="py-2 pr-3">Control</th>
                  <th className="py-2 pr-3">Residual (computed)</th>
                  <th className="py-2">Rating</th>
                </tr>
              </thead>
              <tbody>
                {selectedCategories.map((category) => {
                  const d = draftFor(category)
                  const residual = residualOf(d)
                  return (
                    <tr key={category} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{category}</td>
                      <td className="py-2 pr-3">{d.inherent || '—'}</td>
                      <td className="py-2 pr-3">{d.control || '—'}</td>
                      <td className="py-2 pr-3 font-semibold text-ink">{residual || '—'}</td>
                      <td className="py-2">{residual > 0 && <RiskBadge rating={ratingOf(residual)} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-accent-dark">
              {methodology?.scoringNote}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Step 7 — judgement & overrides */}
      {step === 6 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Step 7 — Supervisory judgement" subtitle="Required for submission; qualitative narrative behind the scores." />
            <CardBody>
              <TextArea
                label="Supervisory judgement and recommended intensity rationale"
                rows={4}
                value={judgement}
                onChange={(e) => setJudgement(e.target.value)}
                placeholder="e.g. Residual risk concentrated in AML/CFT after repeat monitoring findings; recommend Intensive supervision with a thematic examination this cycle (demo)."
              />
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextInput
                  label="Proposed reviewer (optional)"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Tunde Bakare"
                  help="Reviewer approves the assessment at step 8 → detail screen."
                />
                <div className="flex items-end">
                  <p className="rounded-lg bg-page px-3 py-2 text-[11px] text-ink-secondary">
                    Current composite (demo):{' '}
                    <span className="font-semibold text-ink">{composite > 0 ? composite.toFixed(1) : '—'}</span>
                    {composite > 0 && (
                      <>
                        {' '}→ recommended intensity{' '}
                        <span className="font-semibold text-primary">
                          {riskAssessmentService.intensityFor(composite)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Overrides of computed residual" subtitle="Overrides require a documented reason and stay visible on the assessment detail (demo)." />
            <CardBody>
              <div className="flex flex-col gap-3">
                {selectedCategories.map((category) => {
                  const d = draftFor(category)
                  const computed = d.inherent > 0 && d.control > 0 ? riskAssessmentService.computeResidual(d.inherent, d.control) : 0
                  return (
                    <div key={category} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{category}</p>
                        <p className="text-[11px] text-ink-secondary">
                          Computed residual: <span className="font-semibold text-ink">{computed || '—'}</span>
                          {d.overrideResidual > 0 && (
                            <> → override: <span className="font-semibold text-warning">{d.overrideResidual}</span></>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-ink-secondary">Override to</span>
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              aria-pressed={d.overrideResidual === n}
                              aria-label={`Override ${category} residual to ${n === 0 ? 'computed value' : n}`}
                              onClick={() => setDraft(category, { overrideResidual: n })}
                              className={cx(
                                'h-7 w-7 cursor-pointer rounded-md border text-[11px] font-semibold transition-colors',
                                d.overrideResidual === n
                                  ? 'border-warning bg-warning text-white'
                                  : 'border-line bg-card text-ink-secondary hover:border-primary-surface',
                              )}
                            >
                              {n === 0 ? 'auto' : n}
                            </button>
                          ))}
                        </div>
                        <TextInput
                          aria-label={`Override reason for ${category}`}
                          placeholder="Override reason (required when overriding)"
                          value={d.overrideReason}
                          onChange={(e) => setDraft(category, { overrideReason: e.target.value })}
                          error={d.overrideResidual > 0 && d.overrideReason.trim() === '' ? 'A reason is required for overrides.' : undefined}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Step 8 — review & submit */}
      {step === 7 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Step 8 — Review and submit for approval" subtitle="Check the summary, then submit or save a draft (prototype session only)." />
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="overline">Institution</dt>
                  <dd className="mt-0.5 font-medium text-ink">{instName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="overline">Period</dt>
                  <dd className="mt-0.5 text-ink">{periodStart} → {periodEnd} ({year})</dd>
                </div>
                <div>
                  <dt className="overline">Review due</dt>
                  <dd className="mt-0.5 text-ink">{dueDate || '—'}</dd>
                </div>
                <div>
                  <dt className="overline">Methodology</dt>
                  <dd className="mt-0.5 text-ink">
                    {methodology?.name} <span className="font-mono text-[10px]">{methodology?.version}</span>
                  </dd>
                </div>
                <div>
                  <dt className="overline">Categories assessed</dt>
                  <dd className="mt-0.5 text-ink">{selectedCategories.length}</dd>
                </div>
                <div>
                  <dt className="overline">Composite residual (demo)</dt>
                  <dd className="mt-0.5 flex items-center gap-2">
                    <span className="font-semibold text-ink">{composite > 0 ? composite.toFixed(1) : '—'}</span>
                    {composite > 0 && <RiskBadge rating={ratingOf(composite)} />}
                  </dd>
                </div>
                <div>
                  <dt className="overline">Recommended intensity</dt>
                  <dd className="mt-0.5 font-medium text-primary">
                    {composite > 0 ? riskAssessmentService.intensityFor(composite) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="overline">Assessor</dt>
                  <dd className="mt-0.5 text-ink">{actor.actorName} ({actor.actorRole})</dd>
                </div>
                <div>
                  <dt className="overline">Proposed reviewer</dt>
                  <dd className="mt-0.5 text-ink">{reviewerName || 'Assign after submission'}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-line pt-3">
                <p className="overline">Category scores</p>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                  {selectedCategories.map((category) => {
                    const d = draftFor(category)
                    const residual = residualOf(d)
                    return (
                      <li key={category} className="flex items-center justify-between rounded bg-page px-2.5 py-1.5">
                        <span className="font-medium text-ink">{category}</span>
                        <span className="text-ink-secondary">
                          inh {d.inherent} · ctl {d.control} · res{' '}
                          <span className="font-semibold text-ink">{residual}</span>
                          {d.overrideResidual > 0 && <span className="ml-1 text-warning">(override)</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <p className="overline">Supervisory judgement</p>
                <p className="mt-1 whitespace-pre-line text-xs text-ink">{judgement.trim() || '— (required for submission)'}</p>
              </div>
            </CardBody>
          </Card>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" iconLeft={<Save className="h-4 w-4" />} disabled={saving} onClick={() => void handleFinish(false)}>
              Save draft
            </Button>
            <Button variant="primary" iconLeft={<Send className="h-4 w-4" />} loading={saving} onClick={() => void handleFinish(true)}>
              Submit for approval
            </Button>
          </div>
        </div>
      )}

      {/* Wizard navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />} disabled={step === 0} onClick={() => goTo(step - 1)}>
          Back
        </Button>
        <p className="text-[11px] text-ink-secondary" aria-live="polite">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" disabled={!canProceed} onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <span className="w-16" aria-hidden="true" />
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        variant="warning"
        title="Discard this assessment?"
        message="The wizard holds unsaved answers in this prototype session. Cancelling discards them — nothing has been saved anywhere."
        confirmLabel="Discard and exit"
        cancelLabel="Keep editing"
        onConfirm={() => navigate('/app/risk-assessments')}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  )
}
