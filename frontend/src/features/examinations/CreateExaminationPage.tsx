import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  CircleAlert,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { useSessionStore } from '@/store/sessionStore'
import { branchService } from '@/services/mock/MockBranchService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { examinationService } from '@/services/mock/MockExaminationService'
import { libraryService } from '@/services/mock/MockLibraryService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { Institution, Branch } from '@/types/institution'
import type {
  DocumentRequestTemplate,
  LibraryProgramme,
} from '@/types/examination'
import type { ExaminationType } from '@/types/supervision'
import type { CustomProcedureInput } from '@/services/contracts/ExaminationService'
import type { Priority, RiskRating } from '@/types/common'
import { cx } from '@/utils/cx'

/**
 * Create Examination wizard (Spec §7.2): six steps with progress indicator —
 * basic information, scope, team, programme (approved library templates
 * only), information request, review & submit (with validation and save
 * draft). Prefills from deep-links: ?institutionId= (institution profile),
 * ?type=Targeted&alertRef=EWA-… (early-warning conversion, §6.4 link).
 */

const STEPS = ['Basic information', 'Scope', 'Team', 'Programme', 'Information request', 'Review & submit']

const EXAM_TYPES: ExaminationType[] = [
  'Maiden',
  'Routine',
  'Comprehensive',
  'Special',
  'Targeted',
  'Thematic',
  'Follow-up',
  'Spot Check',
  'Joint',
  'AML/CFT',
  'Cybersecurity',
]

const METHODOLOGY_OPTIONS = [
  { value: 'MBA Risk-Based Examination Methodology (demo)|v2.1', label: 'MBA Risk-Based Examination Methodology v2.1 (demo)' },
  { value: 'MBA Comprehensive Examination Handbook (demo)|v1.4', label: 'MBA Comprehensive Examination Handbook v1.4 (demo)' },
]

const isoIn = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export function CreateExaminationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const actor = useActor()
  const jurisdiction = useSessionStore((s) => s.jurisdiction)
  const canCreate = can(actor.actorRole, 'create-examination')

  const alertRef = searchParams.get('alertRef') ?? undefined

  const [step, setStep] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  // Reference data
  const [institutions, setInstitutions] = useState<Institution[] | null>(null)
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; jobTitle: string }>>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [programmes, setProgrammes] = useState<LibraryProgramme[]>([])
  const [docTemplates, setDocTemplates] = useState<DocumentRequestTemplate[]>([])

  // Step 1 — basic information
  const [institutionId, setInstitutionId] = useState(searchParams.get('institutionId') ?? '')
  const [title, setTitle] = useState('')
  const [examType, setExamType] = useState<ExaminationType>(
    (searchParams.get('type') as ExaminationType) ?? 'Targeted',
  )
  const [riskPriority, setRiskPriority] = useState<RiskRating>('Medium')
  const [reviewStart, setReviewStart] = useState(isoIn(-270))
  const [reviewEnd, setReviewEnd] = useState(isoIn(-30))
  const [startDate, setStartDate] = useState(isoIn(14))
  const [plannedEndDate, setPlannedEndDate] = useState(isoIn(42))
  const [department, setDepartment] = useState('Banking Supervision Department')

  // Step 2 — scope
  const [objectives, setObjectives] = useState(
    alertRef
      ? `Targeted examination initiated from early-warning alert ${alertRef} (demo conversion). Verify the indicator breach, re-perform related computations and test contingency controls.`
      : '',
  )
  const [domains, setDomains] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [productLines, setProductLines] = useState('')
  const [limitations, setLimitations] = useState('')
  const [methodology, setMethodology] = useState(METHODOLOGY_OPTIONS[0].value)

  // Step 3 — team
  const [teamLeadId, setTeamLeadId] = useState('')
  const [examinerIds, setExaminerIds] = useState<string[]>([])
  const [specialistIds, setSpecialistIds] = useState<string[]>([])
  const [conflictsChecked, setConflictsChecked] = useState(false)

  // Step 4 — programme
  const [programmeIds, setProgrammeIds] = useState<string[]>([])
  const [excludedProcedureIds, setExcludedProcedureIds] = useState<string[]>([])
  const [procedureOverrides, setProcedureOverrides] = useState<Record<string, { ownerName?: string; priority?: Priority }>>({})
  const [customProcedures, setCustomProcedures] = useState<CustomProcedureInput[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState({
    code: 'CUS-01',
    title: '',
    objective: '',
    question: '',
    steps: '',
    regulatoryCriteria: '',
    requiredEvidence: '',
    testingMethod: '',
    ownerName: '',
    dueDate: isoIn(30),
    priority: 'Medium' as Priority,
  })

  // Step 5 — information request
  const [irEnabled, setIrEnabled] = useState(true)
  const [irTemplateId, setIrTemplateId] = useState('')
  const [irTitle, setIrTitle] = useState('')
  const [irDocuments, setIrDocuments] = useState<string[]>([])
  const [newDoc, setNewDoc] = useState('')
  const [irDeadline, setIrDeadline] = useState(isoIn(10))
  const [irRecipients, setIrRecipients] = useState<string[]>([])

  const institution = useMemo(
    () => (institutions ?? []).find((i) => i.id === institutionId),
    [institutions, institutionId],
  )

  // Load reference data
  useEffect(() => {
    void (async () => {
      const [instPage, staffList, templates] = await Promise.all([
        institutionService.list({ page: 1, pageSize: 200 }),
        institutionService.listStaff(),
        libraryService.documentRequestTemplates(),
      ])
      setInstitutions(instPage.items)
      setStaff(staffList)
      setDocTemplates(templates)
    })()
  }, [])

  // Institution-dependent data (branches, programmes, recipients, title)
  useEffect(() => {
    if (!institution) return
    void (async () => {
      const [branchList, approved] = await Promise.all([
        branchService.list({ institutionId: institution.id }),
        libraryService.approvedFor({ category: institution.category }),
      ])
      setBranches(branchList.slice(0, 12))
      setProgrammes(approved)
      setTitle((prev) => prev || `${institution.tradingName} — ${examType} Examination ${new Date().getFullYear()}`)
      setIrTitle((prev) => prev || `Document request pack — ${institution.tradingName}`)
      setIrRecipients((prev) =>
        prev.length > 0
          ? prev
          : [
              `${institution.officialContact.name} (Institution Administrator — portal)`,
              `${institution.regulatoryLiaison.name} (Regulatory Liaison — portal)`,
            ],
      )
      if (alertRef && approved.length > 0) {
        setDomains((prev) => (prev.length > 0 ? prev : ['Liquidity Risk']))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institution?.id])

  const selectedProgrammes = useMemo(
    () => programmes.filter((p) => programmeIds.includes(p.id)),
    [programmes, programmeIds],
  )

  const visibleProgrammes = useMemo(() => {
    const domFiltered = domains.length > 0
      ? programmes.filter((p) => domains.includes(p.domainName) || p.examinationTypes.includes(examType))
      : programmes
    return domFiltered.length > 0 ? domFiltered : programmes
  }, [programmes, domains, examType])

  const teamMembers = useMemo(() => {
    const byIdMap = new Map(staff.map((s) => [s.id, s]))
    const members = []
    const lead = byIdMap.get(teamLeadId)
    if (lead) {
      members.push({ staffId: lead.id, name: lead.fullName, roleInExamination: 'Team Lead' as const, conflictDeclaration: conflictsChecked ? ('None declared' as const) : ('Pending' as const) })
    }
    for (const id of examinerIds) {
      const s = byIdMap.get(id)
      if (s) members.push({ staffId: s.id, name: s.fullName, roleInExamination: 'Examiner' as const, conflictDeclaration: conflictsChecked ? ('None declared' as const) : ('Pending' as const) })
    }
    for (const id of specialistIds) {
      const s = byIdMap.get(id)
      if (s) members.push({ staffId: s.id, name: s.fullName, roleInExamination: 'Specialist Reviewer' as const, conflictDeclaration: conflictsChecked ? ('None declared' as const) : ('Pending' as const) })
    }
    return members
  }, [teamLeadId, examinerIds, specialistIds, staff, conflictsChecked])

  const teamNames = useMemo(() => teamMembers.map((m) => m.name), [teamMembers])

  const selectedProcedureCount = useMemo(
    () =>
      selectedProgrammes.reduce(
        (sum, p) => sum + p.procedures.filter((pr) => !excludedProcedureIds.includes(pr.id)).length,
        0,
      ) + customProcedures.length,
    [selectedProgrammes, excludedProcedureIds, customProcedures],
  )

  // --- per-step validation -----------------------------------------------------

  const stepErrors = useMemo((): string[] => {
    switch (step) {
      case 0: {
        const errs: string[] = []
        if (!institutionId) errs.push('Select the institution to examine.')
        if (!title.trim()) errs.push('Examination title is required (the reference is generated on creation).')
        if (reviewEnd <= reviewStart) errs.push('Review period end must be after its start.')
        if (plannedEndDate <= startDate) errs.push('Planned fieldwork end must be after its start.')
        if (!department.trim()) errs.push('Supervisory department is required.')
        return errs
      }
      case 1: {
        const errs: string[] = []
        if (!objectives.trim()) errs.push('Examination objectives are required.')
        if (domains.length === 0) errs.push('Select at least one supervisory domain.')
        return errs
      }
      case 2: {
        const errs: string[] = []
        if (!teamLeadId) errs.push('Assign a team lead.')
        if (examinerIds.length === 0) errs.push('Assign at least one examiner.')
        if (!conflictsChecked) errs.push('Confirm the conflict-of-interest declaration step (placeholder).')
        return errs
      }
      case 3:
        return selectedProcedureCount > 0
          ? []
          : ['Select at least one procedure from an approved library programme, or add a custom procedure.']
      case 4:
        return !irEnabled || irDocuments.length === 0 || irRecipients.length === 0
          ? irEnabled
            ? ['Add at least one document and one portal recipient, or disable the information request.']
            : []
          : []
      default:
        return []
    }
  }, [step, institutionId, title, reviewStart, reviewEnd, startDate, plannedEndDate, department, objectives, domains, teamLeadId, examinerIds, conflictsChecked, selectedProcedureCount, irEnabled, irDocuments, irRecipients])

  const canProceed = stepErrors.length === 0
  const goTo = (next: number) => {
    setStep(next)
    setMaxVisited((m) => Math.max(m, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dirty =
    institutionId !== '' || title !== '' || objectives !== '' || programmeIds.length > 0 || teamLeadId !== ''

  // --- submission ----------------------------------------------------------------

  const handleFinish = async (submit: boolean) => {
    if (!institution || !jurisdiction) {
      toast.error('Incomplete', 'Select an institution (and sign in for a jurisdiction) first.')
      return
    }
    const [methodName, methodVersion] = methodology.split('|')
    setSaving(true)
    try {
      const created = await examinationService.create(
        {
          institution,
          title: title.trim(),
          type: examType,
          riskPriority,
          reviewPeriodStart: reviewStart,
          reviewPeriodEnd: reviewEnd,
          startDate,
          plannedEndDate,
          jurisdictionId: jurisdiction.id,
          department: department.trim(),
          objectives: objectives.trim(),
          domains,
          locations,
          productLines: productLines.split(',').map((s) => s.trim()).filter(Boolean),
          scopeLimitations: limitations.trim() || undefined,
          methodologyName: methodName,
          methodologyVersion: methodVersion,
          team: teamMembers,
          programmeIds,
          excludedProcedureIds,
          procedureOverrides,
          customProcedures,
          informationRequest:
            irEnabled && irDocuments.length > 0
              ? { templateName: docTemplates.find((t) => t.id === irTemplateId)?.name, title: irTitle.trim() || `Document request — ${institution.tradingName}`, documents: irDocuments, deadline: irDeadline, recipientNames: irRecipients }
              : null,
          sourceAlertRef: alertRef,
          submit,
        },
        actor,
      )
      toast.success(
        submit ? 'Examination submitted' : 'Draft saved',
        `${created.reference} created — saved in prototype session (demo data). Work programme instantiated from ${created.programmeRefs.length} approved template(s).`,
      )
      navigate(`/app/examinations/${created.id}`)
    } catch (err) {
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', 'The prototype could not create the examination.')
    } finally {
      setSaving(false)
    }
  }

  if (!canCreate) {
    return (
      <div>
        <PageHeader title="Create Examination" breadcrumbs={[{ label: 'Examination Register', path: '/app/examinations' }]} />
        <EmptyState
          icon={<CircleAlert className="h-8 w-8 text-warning" />}
          title="Permission denied (demo role)"
          description={`The "${actor.actorRole}" demo role cannot create examinations (Spec §19). Switch to a Team Lead, Principal Examiner or Director demo role from the avatar menu.`}
          action={{ label: 'Back to register', onClick: () => navigate('/app/examinations') }}
        />
      </div>
    )
  }

  if (institutions === null) {
    return <LoadingSkeleton rows={10} className="rounded-xl border border-line bg-card" />
  }

  return (
    <div>
      <PageHeader
        title="Create Examination"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Six-step creation wizard — programme steps draw from approved library templates only</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Demo / illustrative
            </span>
          </span>
        }
        breadcrumbs={[{ label: 'Examination Register', path: '/app/examinations' }]}
        actions={
          <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={() => (dirty ? setConfirmCancel(true) : navigate('/app/examinations'))}>
            Cancel
          </Button>
        }
      />

      {alertRef && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-tint-yellow px-3 py-2 text-xs text-yellow">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Converted from early-warning alert {alertRef}.</span> The
            examination type is prefilled as <em>Targeted</em> and the objectives reference the alert
            (Spec §6.4 → §7.2 link). The alert reference is stored on the examination.
          </p>
        </div>
      )}

      {/* Progress indicator */}
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
                  <span className="hidden lg:inline">{label}</span>
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

      {/* Step 1 — basic information */}
      {step === 0 && (
        <Card>
          <CardHeader title="Step 1 — Basic information" subtitle="Reference numbers are generated on creation (e.g. EXM-2026-101)." />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Institution"
                required
                value={institutionId}
                onChange={(e) => {
                  setInstitutionId(e.target.value)
                  setTitle('')
                }}
                placeholder="Select a supervised institution…"
                options={institutions.map((i) => ({ value: i.id, label: `${i.tradingName} (${i.code} · ${i.category})` }))}
                help="Fictional demo institutions (Spec §17.5)."
              />
              <TextInput
                label="Examination title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-suggested once an institution is selected"
              />
              <Select
                label="Examination type"
                required
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExaminationType)}
                options={EXAM_TYPES.map((t) => ({ value: t, label: t }))}
                help={alertRef ? 'Prefilled as Targeted — converted from an early-warning alert.' : 'Maiden, routine, special, targeted, thematic, follow-up, spot check or joint (Spec §7.2).'}
              />
              <Select
                label="Risk priority"
                required
                value={riskPriority}
                onChange={(e) => setRiskPriority(e.target.value as RiskRating)}
                options={['Critical', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))}
                help={institution ? `Current institutional risk rating: ${institution.riskRating} (demo).` : undefined}
              />
              <TextInput label="Review period start" required type="date" value={reviewStart} onChange={(e) => setReviewStart(e.target.value)} />
              <TextInput
                label="Review period end"
                required
                type="date"
                value={reviewEnd}
                onChange={(e) => setReviewEnd(e.target.value)}
                error={reviewEnd <= reviewStart ? 'End must be after start.' : undefined}
              />
              <TextInput label="Planned fieldwork start" required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <TextInput
                label="Planned fieldwork end"
                required
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                error={plannedEndDate <= startDate ? 'End must be after start.' : undefined}
              />
              <Select
                label="Jurisdiction"
                value={jurisdiction?.id ?? ''}
                disabled
                options={[{ value: jurisdiction?.id ?? '', label: jurisdiction ? `${jurisdiction.name} (${jurisdiction.code})` : 'Sign in for jurisdiction' }]}
                help="From the current demo session (topbar selector)."
              />
              <TextInput
                label="Supervisory department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                help={institution ? `Institution is supervised by: ${institution.supervisory.department} (demo).` : undefined}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2 — scope */}
      {step === 1 && (
        <Card>
          <CardHeader title="Step 2 — Scope" subtitle="Objectives, domains, locations, product lines, limitations and methodology." />
          <CardBody>
            <div className="flex flex-col gap-4">
              <TextArea
                label="Examination objectives"
                required
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="What should this examination determine? (demo)"
              />
              <fieldset>
                <legend className="overline">Supervisory domains</legend>
                <p className="mb-1.5 text-[10px] text-ink-secondary">From the examination library hierarchy — drives template filtering at step 4.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from(new Set(programmes.map((p) => p.domainName))).map((d) => (
                    <Checkbox
                      key={d}
                      label={d}
                      checked={domains.includes(d)}
                      onChange={(e) => setDomains((prev) => (e.target.checked ? [...prev, d] : prev.filter((x) => x !== d)))}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="overline">Institution locations / branches</legend>
                <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                  <Checkbox
                    label="Head office"
                    checked={locations.includes('Head office')}
                    onChange={(e) =>
                      setLocations((prev) => (e.target.checked ? [...prev, 'Head office'] : prev.filter((x) => x !== 'Head office')))
                    }
                  />
                  {branches.map((b) => (
                    <Checkbox
                      key={b.id}
                      label={`${b.name} (${b.code})`}
                      checked={locations.includes(b.name)}
                      onChange={(e) =>
                        setLocations((prev) => (e.target.checked ? [...prev, b.name] : prev.filter((x) => x !== b.name)))
                      }
                    />
                  ))}
                </div>
                {branches.length === 0 && (
                  <p className="mt-1 text-[10px] text-ink-secondary">Select an institution at step 1 to load its demo branch network.</p>
                )}
              </fieldset>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextInput
                  label="Products / business lines"
                  value={productLines}
                  onChange={(e) => setProductLines(e.target.value)}
                  placeholder="Comma-separated, e.g. Retail deposits, Trade finance"
                />
                <Select
                  label="Applicable methodology"
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  options={METHODOLOGY_OPTIONS}
                  help="Demo methodologies — illustrative examination handbooks."
                />
              </div>
              <TextArea
                label="Scope limitations (optional)"
                rows={2}
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                placeholder="e.g. Agency banking channel deferred to the next cycle."
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3 — team */}
      {step === 2 && (
        <Card>
          <CardHeader title="Step 3 — Examination team" subtitle="Team lead, examiners and specialist reviewers with their role within the examination." />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Team lead"
                required
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                placeholder="Select the lead…"
                options={staff.map((s) => ({ value: s.id, label: `${s.fullName} — ${s.jobTitle}` }))}
              />
              <fieldset>
                <legend className="overline">Examiners</legend>
                <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto">
                  {staff
                    .filter((s) => s.id !== teamLeadId)
                    .map((s) => (
                      <Checkbox
                        key={s.id}
                        label={`${s.fullName} — ${s.jobTitle}`}
                        checked={examinerIds.includes(s.id)}
                        onChange={(e) =>
                          setExaminerIds((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                        }
                      />
                    ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="overline">Specialist reviewers</legend>
                <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto">
                  {staff
                    .filter((s) => s.id !== teamLeadId && !examinerIds.includes(s.id))
                    .map((s) => (
                      <Checkbox
                        key={s.id}
                        label={`${s.fullName} — ${s.jobTitle}`}
                        checked={specialistIds.includes(s.id)}
                        onChange={(e) =>
                          setSpecialistIds((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                        }
                      />
                    ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-4 rounded-lg bg-page p-3">
              <p className="overline">Team preview (role within examination)</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {teamMembers.map((m) => (
                  <li key={m.staffId} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-ink">
                    {m.name} <span className="text-ink-secondary">· {m.roleInExamination}</span>
                  </li>
                ))}
                {teamMembers.length === 0 && <li className="text-[11px] text-ink-secondary">No team members selected yet.</li>}
              </ul>
            </div>
            <div className="mt-3">
              <Checkbox
                label="Conflict-of-interest declarations collected (placeholder)"
                help="Prototype placeholder for the real declaration workflow — each member is recorded as 'None declared' once confirmed (Spec §7.2 step 3)."
                checked={conflictsChecked}
                onChange={(e) => setConflictsChecked(e.target.checked)}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 4 — programme */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Step 4 — Work programme from the examination library"
              subtitle="Only Approved template versions are selectable (Spec §7.5). Existing examinations keep their selected version."
              action={
                <button type="button" className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => setCustomOpen(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add custom procedure
                </button>
              }
            />
            <CardBody>
              {visibleProgrammes.length === 0 && (
                <p className="text-xs text-ink-secondary">
                  No approved templates for this institution category yet — add a custom procedure or adjust the
                  domain selection at step 2.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {visibleProgrammes.map((p) => {
                  const included = programmeIds.includes(p.id)
                  return (
                    <div key={p.id} className={cx('rounded-lg border p-3', included ? 'border-primary bg-tint-blue/30' : 'border-line')}>
                      <Checkbox
                        label={
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                            {p.title}
                            <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] text-primary">{p.code}</span>
                            <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">{p.version}</span>
                            <StatusBadge status={p.status} tone="active" />
                          </span>
                        }
                        help={`${p.domainName} · ${p.procedures.length} procedures · owner ${p.ownerName}`}
                        checked={included}
                        onChange={(e) =>
                          setProgrammeIds((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                        }
                      />
                      {included && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                          {p.procedures.map((pr) => {
                            const excluded = excludedProcedureIds.includes(pr.id)
                            const override = procedureOverrides[pr.id]
                            return (
                              <div key={pr.id} className={cx('rounded-lg border border-line bg-card p-2.5', excluded && 'opacity-50')}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <Checkbox
                                    label={
                                      <span className="text-xs font-medium text-ink">
                                        <span className="font-mono text-[10px] text-primary">{pr.code}</span> {pr.title}
                                      </span>
                                    }
                                    checked={!excluded}
                                    onChange={(e) =>
                                      setExcludedProcedureIds((prev) =>
                                        e.target.checked ? prev.filter((x) => x !== pr.id) : [...prev, pr.id],
                                      )
                                    }
                                  />
                                  <PriorityBadge priority={override?.priority ?? pr.priority} />
                                </div>
                                {!excluded && (
                                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Select
                                      aria-label={`Owner for ${pr.code}`}
                                      value={override?.ownerName ?? ''}
                                      onChange={(e) =>
                                        setProcedureOverrides((prev) => ({
                                          ...prev,
                                          [pr.id]: { ...prev[pr.id], ownerName: e.target.value || undefined },
                                        }))
                                      }
                                      placeholder={`Owner — round-robin default (${teamNames[0] ?? 'team'})`}
                                      options={teamNames.map((n) => ({ value: n, label: n }))}
                                    />
                                    <Select
                                      aria-label={`Priority for ${pr.code}`}
                                      value={override?.priority ?? pr.priority}
                                      onChange={(e) =>
                                        setProcedureOverrides((prev) => ({
                                          ...prev,
                                          [pr.id]: { ...prev[pr.id], priority: e.target.value as Priority },
                                        }))
                                      }
                                      options={['Critical', 'High', 'Medium', 'Low'].map((x) => ({ value: x, label: x }))}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {customProcedures.length > 0 && (
                <div className="mt-3">
                  <p className="overline">Custom procedures ({customProcedures.length})</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {customProcedures.map((c) => (
                      <li key={c.code} className="flex items-center justify-between rounded-lg border border-dashed border-line px-3 py-2 text-xs">
                        <span>
                          <span className="font-mono text-[10px] text-primary">{c.code}</span>{' '}
                          <span className="font-medium text-ink">{c.title}</span>{' '}
                          <span className="text-ink-secondary">· owner {c.ownerName || 'unassigned'} ·</span>{' '}
                          <PriorityBadge priority={c.priority} />
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove custom procedure ${c.code}`}
                          onClick={() => setCustomProcedures((prev) => prev.filter((x) => x.code !== c.code))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-[11px] text-accent-dark">
                {selectedProcedureCount} procedure(s) will be instantiated. Draft / under-review / retired
                templates are hidden here by design — see the Examination Library for the full lifecycle.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Step 5 — information request */}
      {step === 4 && (
        <Card>
          <CardHeader title="Step 5 — Information request" subtitle="Document request templates, deadlines and institution portal recipients." />
          <CardBody>
            <div className="flex flex-col gap-4">
              <Checkbox
                label="Issue an information request with this examination"
                help="Uncheck if the pack will be issued later from the examination detail screen."
                checked={irEnabled}
                onChange={(e) => setIrEnabled(e.target.checked)}
              />
              {irEnabled && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label="Document request template"
                      value={irTemplateId}
                      onChange={(e) => {
                        setIrTemplateId(e.target.value)
                        const t = docTemplates.find((x) => x.id === e.target.value)
                        if (t) {
                          setIrDocuments([...t.documents])
                          setIrTitle((prev) => prev || `${t.name} — ${institution?.tradingName ?? ''}`)
                        }
                      }}
                      placeholder="Select a demo template…"
                      options={docTemplates.map((t) => ({ value: t.id, label: `${t.name} (${t.documents.length} documents)` }))}
                    />
                    <TextInput label="Request deadline" required type="date" value={irDeadline} onChange={(e) => setIrDeadline(e.target.value)} />
                  </div>
                  <TextInput
                    label="Request title"
                    required
                    value={irTitle}
                    onChange={(e) => setIrTitle(e.target.value)}
                    placeholder="e.g. AML/CFT thematic request pack — Meridian Commercial Bank"
                  />
                  <div>
                    <p className="overline">Required documents</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {irDocuments.map((doc, i) => (
                        <li key={`${doc}-${i}`} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5">
                          <span className="flex-1 text-xs text-ink">{doc}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove document ${doc}`}
                            onClick={() => setIrDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex gap-2">
                      <TextInput
                        aria-label="New document name"
                        placeholder="Add another required document…"
                        value={newDoc}
                        onChange={(e) => setNewDoc(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newDoc.trim()) {
                            e.preventDefault()
                            setIrDocuments((prev) => [...prev, newDoc.trim()])
                            setNewDoc('')
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        iconLeft={<Plus className="h-3.5 w-3.5" />}
                        disabled={!newDoc.trim()}
                        onClick={() => {
                          setIrDocuments((prev) => [...prev, newDoc.trim()])
                          setNewDoc('')
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="overline">Institution portal recipients</legend>
                    <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {institution &&
                        [
                          `${institution.officialContact.name} (Institution Administrator — portal)`,
                          `${institution.regulatoryLiaison.name} (Regulatory Liaison — portal)`,
                        ].map((r) => (
                          <Checkbox
                            key={r}
                            label={r}
                            checked={irRecipients.includes(r)}
                            onChange={(e) =>
                              setIrRecipients((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))
                            }
                          />
                        ))}
                      {!institution && <p className="text-[11px] text-ink-secondary">Select an institution at step 1 to list its portal contacts.</p>}
                    </div>
                  </fieldset>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 6 — review & submit */}
      {step === 5 && institution && (
        <Card>
          <CardHeader title="Step 6 — Review and submit" subtitle="Validation summary; submit for approval or save a draft (prototype session only)." />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="overline">Institution</dt>
                <dd className="mt-0.5 font-medium text-ink">{institution.tradingName} ({institution.code})</dd>
              </div>
              <div>
                <dt className="overline">Title</dt>
                <dd className="mt-0.5 text-ink">{title || '—'}</dd>
              </div>
              <div>
                <dt className="overline">Type / priority</dt>
                <dd className="mt-0.5 flex items-center gap-2 text-ink">
                  {examType} <PriorityBadge priority={riskPriority} />
                </dd>
              </div>
              <div>
                <dt className="overline">Review period</dt>
                <dd className="mt-0.5 text-ink">{reviewStart} → {reviewEnd}</dd>
              </div>
              <div>
                <dt className="overline">Planned fieldwork</dt>
                <dd className="mt-0.5 text-ink">{startDate} → {plannedEndDate}</dd>
              </div>
              <div>
                <dt className="overline">Jurisdiction / department</dt>
                <dd className="mt-0.5 text-ink">{jurisdiction?.code ?? '—'} · {department}</dd>
              </div>
              <div>
                <dt className="overline">Domains</dt>
                <dd className="mt-0.5 text-ink">{domains.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt className="overline">Locations</dt>
                <dd className="mt-0.5 text-ink">{locations.length > 0 ? locations.join(', ') : 'Head office (default)'}</dd>
              </div>
              <div>
                <dt className="overline">Methodology</dt>
                <dd className="mt-0.5 text-ink">{methodology.split('|').join(' ')}</dd>
              </div>
              <div>
                <dt className="overline">Team ({teamMembers.length})</dt>
                <dd className="mt-0.5 text-ink">
                  {teamMembers.map((m) => `${m.name} (${m.roleInExamination})`).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="overline">Programmes</dt>
                <dd className="mt-0.5 text-ink">
                  {selectedProgrammes.map((p) => `${p.code} ${p.version}`).join(', ') || '—'}
                  {customProcedures.length > 0 && ` + ${customProcedures.length} custom`}
                </dd>
              </div>
              <div>
                <dt className="overline">Procedures</dt>
                <dd className="mt-0.5 text-ink">{selectedProcedureCount} instantiated from approved templates</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="overline">Information request</dt>
                <dd className="mt-0.5 text-ink">
                  {irEnabled && irDocuments.length > 0
                    ? `${irTitle || 'Document request'} — ${irDocuments.length} documents, deadline ${irDeadline}, ${irRecipients.length} portal recipient(s)`
                    : 'Not issued with creation'}
                </dd>
              </div>
              {alertRef && (
                <div>
                  <dt className="overline">Source alert</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-ink">{alertRef} (targeted conversion)</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" iconLeft={<Save className="h-4 w-4" />} disabled={saving} onClick={() => void handleFinish(false)}>
                Save draft
              </Button>
              <Button variant="primary" iconLeft={<Send className="h-4 w-4" />} loading={saving} onClick={() => void handleFinish(true)}>
                Submit for approval
              </Button>
            </div>
          </CardBody>
        </Card>
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
          <Button variant="primary" disabled={!canProceed} onClick={() => goTo(step + 1)}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <span className="w-16" aria-hidden="true" />
        )}
      </div>

      {/* Custom procedure modal */}
      <ConfirmDialog
        open={confirmCancel}
        variant="warning"
        title="Discard this examination draft?"
        message="The wizard holds unsaved answers in this prototype session. Cancelling discards them."
        confirmLabel="Discard and exit"
        cancelLabel="Keep editing"
        onConfirm={() => navigate('/app/examinations')}
        onClose={() => setConfirmCancel(false)}
      />
      <CustomProcedureModal
        open={customOpen}
        draft={customDraft}
        teamNames={teamNames}
        existingCodes={customProcedures.map((c) => c.code)}
        onChange={setCustomDraft}
        onClose={() => setCustomOpen(false)}
        onAdd={() => {
          if (!customDraft.title.trim() || !customDraft.objective.trim()) {
            toast.error('Incomplete', 'A custom procedure needs at least a title and an objective.')
            return
          }
          setCustomProcedures((prev) => [
            ...prev,
            {
              code: customDraft.code.trim() || `CUS-${prev.length + 1}`,
              title: customDraft.title.trim(),
              objective: customDraft.objective.trim(),
              question: customDraft.question.trim() || customDraft.objective.trim(),
              steps: customDraft.steps.split('\n').map((s) => s.trim()).filter(Boolean),
              regulatoryCriteria: customDraft.regulatoryCriteria.trim() || 'Demo criteria (custom procedure)',
              requiredEvidence: customDraft.requiredEvidence.split(',').map((s) => s.trim()).filter(Boolean),
              testingMethod: customDraft.testingMethod.trim() || 'Inspection',
              ownerName: customDraft.ownerName,
              dueDate: customDraft.dueDate,
              priority: customDraft.priority,
            },
          ])
          setCustomOpen(false)
          setCustomDraft({ ...customDraft, code: `CUS-${customProcedures.length + 2}`, title: '', objective: '', question: '', steps: '', regulatoryCriteria: '', requiredEvidence: '', testingMethod: '' })
        }}
      />
    </div>
  )
}

function CustomProcedureModal({
  open,
  draft,
  teamNames,
  existingCodes,
  onChange,
  onClose,
  onAdd,
}: {
  open: boolean
  draft: {
    code: string
    title: string
    objective: string
    question: string
    steps: string
    regulatoryCriteria: string
    requiredEvidence: string
    testingMethod: string
    ownerName: string
    dueDate: string
    priority: Priority
  }
  teamNames: string[]
  existingCodes: string[]
  onChange: (d: typeof draft) => void
  onClose: () => void
  onAdd: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Add custom procedure" size="lg">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Procedure code"
            value={draft.code}
            onChange={(e) => onChange({ ...draft, code: e.target.value })}
            error={existingCodes.includes(draft.code) ? 'Code already used in this examination.' : undefined}
          />
          <TextInput label="Title" required value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
        </div>
        <TextArea label="Objective" required rows={2} value={draft.objective} onChange={(e) => onChange({ ...draft, objective: e.target.value })} />
        <TextArea label="Examination question" rows={2} value={draft.question} onChange={(e) => onChange({ ...draft, question: e.target.value })} />
        <TextArea label="Detailed steps (one per line)" rows={3} value={draft.steps} onChange={(e) => onChange({ ...draft, steps: e.target.value })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Regulatory criteria (demo)" value={draft.regulatoryCriteria} onChange={(e) => onChange({ ...draft, regulatoryCriteria: e.target.value })} />
          <TextInput label="Required evidence (comma-separated)" value={draft.requiredEvidence} onChange={(e) => onChange({ ...draft, requiredEvidence: e.target.value })} />
          <TextInput label="Testing method" value={draft.testingMethod} onChange={(e) => onChange({ ...draft, testingMethod: e.target.value })} />
          <Select
            label="Procedure owner"
            value={draft.ownerName}
            onChange={(e) => onChange({ ...draft, ownerName: e.target.value })}
            placeholder="Select from the team…"
            options={teamNames.map((n) => ({ value: n, label: n }))}
          />
          <TextInput label="Due date" type="date" value={draft.dueDate} onChange={(e) => onChange({ ...draft, dueDate: e.target.value })} />
          <Select
            label="Priority"
            value={draft.priority}
            onChange={(e) => onChange({ ...draft, priority: e.target.value as Priority })}
            options={['Critical', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />} onClick={onAdd}>
            Add procedure
          </Button>
        </div>
      </div>
    </Modal>
  )
}
