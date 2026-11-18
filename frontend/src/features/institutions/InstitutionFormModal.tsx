import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import type { SupervisoryTeamOption } from '@/services/contracts/InstitutionService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import type { Jurisdiction } from '@/types/auth'
import {
  INSTITUTION_CATEGORIES,
  type CreateInstitutionInput,
  type Institution,
} from '@/types/institution'
import {
  institutionFormSchema,
  UNIQUE_CODE_MESSAGE,
  type InstitutionFormValues,
} from '@/features/institutions/institutionSchema'

/**
 * Institution creation/edit form (Spec §5.4) — seven sections, React Hook
 * Form + Zod validation, async unique-code check, date ordering rules and
 * an unsaved-changes confirmation. Saving is a prototype-session action.
 */

const LEGAL_FORMS = ['Public Limited Company', 'Private Limited Company', 'Statutory Corporation', 'Cooperative']
const OWNERSHIP_TYPES = [
  'Public Listed',
  'Private',
  'State-Owned',
  'Mutual',
  'Subsidiary of Foreign Group',
]
const LICENCE_STATUSES = ['Active', 'Provisional', 'Suspended', 'Revoked']
const STATUSES = ['Active', 'Restructuring', 'Wound Down']
const PORTFOLIO_STATUSES = ['Satisfactory', 'Under Review', 'Watch', 'Deteriorating']
const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low']

export interface InstitutionFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: (institution: Institution, mode: 'create' | 'edit') => void
  /** Present when editing; absent when creating. */
  existing?: Institution | null
  teams: SupervisoryTeamOption[]
  jurisdictions: Jurisdiction[]
  staff: Array<{ id: string; fullName: string; jobTitle: string }>
  defaultJurisdictionId?: string
}

function toFormValues(inst: Institution): InstitutionFormValues {
  return {
    legalName: inst.legalName,
    tradingName: inst.tradingName,
    code: inst.code,
    registrationNumber: inst.registrationNumber,
    licenceNumber: inst.licenceNumber,
    category: inst.category,
    licenceType: inst.licenceType,
    legalForm: inst.legalForm,
    ownershipType: inst.ownershipType,
    country: inst.country,
    jurisdictionId: inst.jurisdictionId,
    currency: inst.currency,
    region: inst.region,
    incorporation: inst.dates.incorporation,
    licenceIssue: inst.dates.licenceIssue,
    commencement: inst.dates.commencement,
    registeredAddress: inst.registeredAddress,
    website: inst.website,
    officialContactName: inst.officialContact.name,
    officialContactEmail: inst.officialContact.email,
    officialContactPhone: inst.officialContact.phone,
    regulatoryLiaisonName: inst.regulatoryLiaison.name,
    regulatoryLiaisonEmail: inst.regulatoryLiaison.email,
    regulatoryLiaisonPhone: inst.regulatoryLiaison.phone,
    teamId: inst.supervisory.teamId,
    portfolio: inst.supervisory.portfolio,
    leadSupervisorName: inst.supervisory.leadSupervisorName,
    status: inst.status,
    licenceStatus: inst.licenceStatus,
    portfolioStatus: inst.portfolioStatus,
    riskRating: inst.riskRating,
    supervisoryRating: String(inst.supervisoryRating),
    totalAssetsMM: inst.totalAssetsMM,
    branchCount: String(inst.branchCount),
    onWatchlist: inst.onWatchlist,
    notes: inst.notes ?? '',
  }
}

const emptyDefaults = (jurisdictionId: string): InstitutionFormValues => ({
  legalName: '',
  tradingName: '',
  code: '',
  registrationNumber: '',
  licenceNumber: '',
  category: '',
  licenceType: '',
  legalForm: '',
  ownershipType: '',
  country: 'Meridia (fictional)',
  jurisdictionId,
  currency: 'MRD',
  region: '',
  incorporation: '',
  licenceIssue: '',
  commencement: '',
  registeredAddress: '',
  website: '',
  officialContactName: '',
  officialContactEmail: '',
  officialContactPhone: '',
  regulatoryLiaisonName: '',
  regulatoryLiaisonEmail: '',
  regulatoryLiaisonPhone: '',
  teamId: '',
  portfolio: '',
  leadSupervisorName: '',
  status: 'Active',
  licenceStatus: 'Active',
  portfolioStatus: 'Satisfactory',
  riskRating: 'Low',
  supervisoryRating: '2',
  totalAssetsMM: '0.00',
  branchCount: '0',
  onWatchlist: false,
  notes: '',
})

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-0.5 text-xs font-bold tracking-wide text-primary uppercase">{title}</legend>
      {hint && <p className="mb-3 text-[11px] text-ink-secondary">{hint}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function InstitutionFormModal({
  open,
  onClose,
  onSaved,
  existing,
  teams,
  jurisdictions,
  staff,
  defaultJurisdictionId,
}: InstitutionFormModalProps) {
  const mode = existing ? 'edit' : 'create'
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionFormSchema),
    mode: 'onBlur',
    defaultValues: existing
      ? toFormValues(existing)
      : emptyDefaults(defaultJurisdictionId ?? jurisdictions[0]?.id ?? ''),
  })

  // Re-seed defaults whenever the modal opens for a (different) record.
  useEffect(() => {
    if (open) {
      reset(
        existing
          ? toFormValues(existing)
          : emptyDefaults(defaultJurisdictionId ?? jurisdictions[0]?.id ?? ''),
      )
      setConfirmDiscard(false)
    }
  }, [open, existing, defaultJurisdictionId, jurisdictions, reset])

  const selectedTeamId = watch('teamId')
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  const attemptClose = () => {
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const onSubmit = async (values: InstitutionFormValues) => {
    setSaving(true)
    try {
      const code = values.code.trim().toUpperCase()
      const available = await institutionService.isCodeAvailable(code, existing?.id)
      if (!available) {
        setError('code', { message: UNIQUE_CODE_MESSAGE })
        return
      }
      const team = teams.find((t) => t.id === values.teamId)
      const lead = staff.find((s) => s.fullName === values.leadSupervisorName)
      const input: CreateInstitutionInput = {
        code,
        legalName: values.legalName.trim(),
        tradingName: values.tradingName.trim(),
        registrationNumber: values.registrationNumber.trim(),
        licenceNumber: values.licenceNumber.trim(),
        licenceType: values.licenceType.trim(),
        licenceStatus: values.licenceStatus as Institution['licenceStatus'],
        category: values.category as Institution['category'],
        legalForm: values.legalForm as Institution['legalForm'],
        ownershipType: values.ownershipType as Institution['ownershipType'],
        jurisdictionId: values.jurisdictionId,
        currency: values.currency.trim().toUpperCase(),
        region: values.region.trim(),
        country: values.country.trim(),
        dates: {
          incorporation: values.incorporation,
          licenceIssue: values.licenceIssue,
          commencement: values.commencement,
        },
        registeredAddress: values.registeredAddress.trim(),
        website: values.website.trim(),
        officialContact: {
          name: values.officialContactName.trim(),
          email: values.officialContactEmail.trim(),
          phone: values.officialContactPhone.trim(),
        },
        regulatoryLiaison: {
          name: values.regulatoryLiaisonName.trim(),
          email: values.regulatoryLiaisonEmail.trim(),
          phone: values.regulatoryLiaisonPhone.trim(),
        },
        supervisory: {
          department: team?.department ?? 'Banking Supervision Department',
          portfolio: values.portfolio.trim(),
          leadSupervisorId: lead?.id ?? '',
          leadSupervisorName: values.leadSupervisorName,
          teamId: values.teamId,
          teamName: team?.name ?? 'Unassigned',
        },
        riskRating: values.riskRating as Institution['riskRating'],
        supervisoryRating: Number(values.supervisoryRating) as Institution['supervisoryRating'],
        portfolioStatus: values.portfolioStatus as Institution['portfolioStatus'],
        status: values.status as Institution['status'],
        lastExaminationDate: existing?.lastExaminationDate,
        openFindingsCount: existing?.openFindingsCount ?? 0,
        branchCount: Number(values.branchCount),
        totalAssetsMM: values.totalAssetsMM,
        onWatchlist: values.onWatchlist,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      }
      const saved = existing
        ? await institutionService.update(existing.id, input)
        : await institutionService.create(input)
      toast.success(
        mode === 'create' ? 'Institution registered' : 'Institution updated',
        'Saved in prototype session — demo record, no real registry was changed.',
      )
      onSaved(saved, mode)
      onClose()
    } catch (error) {
      toast.error(
        'Save failed (demo)',
        error instanceof Error ? error.message : 'Unexpected prototype error.',
      )
    } finally {
      setSaving(false)
    }
  }

  const err = (field: keyof InstitutionFormValues) => errors[field]?.message as string | undefined

  return (
    <>
      <Modal
        open={open}
        onClose={attemptClose}
        size="2xl"
        title={mode === 'create' ? 'Register Institution' : `Edit Institution — ${existing?.tradingName ?? ''}`}
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-ink-tertiary">
              Prototype form — saving stores a demo record in this session only.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={attemptClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} onClick={handleSubmit(onSubmit)}>
                {mode === 'create' ? 'Register institution' : 'Save changes'}
              </Button>
            </div>
          </div>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit(onSubmit)()
          }}
          noValidate
        >
          <Section title="1 · Legal identity" hint="Required identity fields; the institution code must be unique within the regulator.">
            <TextInput label="Legal name" required error={err('legalName')} {...register('legalName')} />
            <TextInput label="Trading name" required error={err('tradingName')} {...register('tradingName')} />
            <TextInput
              label="Institution code"
              required
              placeholder="e.g. MCB-001"
              help="3–12 characters; letters, digits and dashes."
              error={err('code')}
              {...register('code')}
            />
            <TextInput label="Registration number" required error={err('registrationNumber')} {...register('registrationNumber')} />
            <TextInput label="Licence number" required error={err('licenceNumber')} {...register('licenceNumber')} />
          </Section>

          <Section title="2 · Classification">
            <Select
              label="Institution category"
              required
              placeholder="Select category…"
              error={err('category')}
              options={INSTITUTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
              {...register('category')}
            />
            <TextInput label="Licence type" required error={err('licenceType')} {...register('licenceType')} />
            <Select
              label="Legal form"
              required
              placeholder="Select legal form…"
              error={err('legalForm')}
              options={LEGAL_FORMS.map((c) => ({ value: c, label: c }))}
              {...register('legalForm')}
            />
            <Select
              label="Ownership type"
              required
              placeholder="Select ownership type…"
              error={err('ownershipType')}
              options={OWNERSHIP_TYPES.map((c) => ({ value: c, label: c }))}
              {...register('ownershipType')}
            />
          </Section>

          <Section title="3 · Jurisdiction">
            <TextInput label="Country" required error={err('country')} {...register('country')} />
            <Select
              label="Regulator"
              required
              placeholder="Select regulator…"
              error={err('jurisdictionId')}
              options={jurisdictions.map((j) => ({ value: j.id, label: `${j.name} (${j.code})` }))}
              {...register('jurisdictionId')}
            />
            <TextInput label="Currency" required help="3-letter code, e.g. MRD (fictional)." error={err('currency')} {...register('currency')} />
            <TextInput label="Region" required error={err('region')} {...register('region')} />
          </Section>

          <Section title="4 · Dates" hint="Ordering is validated: incorporation ≤ licence issue ≤ commencement.">
            <TextInput type="date" label="Incorporation date" required error={err('incorporation')} {...register('incorporation')} />
            <TextInput type="date" label="Licence issue date" required error={err('licenceIssue')} {...register('licenceIssue')} />
            <TextInput type="date" label="Commencement date" required error={err('commencement')} {...register('commencement')} />
          </Section>

          <Section title="5 · Contacts">
            <div className="md:col-span-2">
              <TextInput label="Registered address" required error={err('registeredAddress')} {...register('registeredAddress')} />
            </div>
            <TextInput label="Website" type="url" placeholder="https://…" error={err('website')} {...register('website')} />
            <TextInput label="Official contact — name" required error={err('officialContactName')} {...register('officialContactName')} />
            <TextInput label="Official contact — email" type="email" required error={err('officialContactEmail')} {...register('officialContactEmail')} />
            <TextInput label="Official contact — phone" required error={err('officialContactPhone')} {...register('officialContactPhone')} />
            <TextInput label="Regulatory liaison — name" required error={err('regulatoryLiaisonName')} {...register('regulatoryLiaisonName')} />
            <TextInput label="Regulatory liaison — email" type="email" required error={err('regulatoryLiaisonEmail')} {...register('regulatoryLiaisonEmail')} />
            <TextInput label="Regulatory liaison — phone" required error={err('regulatoryLiaisonPhone')} {...register('regulatoryLiaisonPhone')} />
          </Section>

          <Section title="6 · Supervisory assignment">
            <Select
              label="Supervisory team"
              required
              placeholder="Select team…"
              error={err('teamId')}
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              {...register('teamId')}
            />
            <TextInput
              label="Department"
              value={selectedTeam?.department ?? ''}
              readOnly
              help="Derived from the selected supervisory team."
            />
            <TextInput label="Portfolio" required error={err('portfolio')} {...register('portfolio')} />
            <Select
              label="Lead supervisor"
              required
              placeholder="Select lead supervisor…"
              error={err('leadSupervisorName')}
              options={staff.map((s) => ({ value: s.fullName, label: `${s.fullName} — ${s.jobTitle}` }))}
              {...register('leadSupervisorName')}
            />
          </Section>

          <Section title="7 · Status and notes">
            <Select
              label="Institution status"
              required
              error={err('status')}
              options={STATUSES.map((c) => ({ value: c, label: c }))}
              {...register('status')}
            />
            <Select
              label="Licence status"
              required
              error={err('licenceStatus')}
              options={LICENCE_STATUSES.map((c) => ({ value: c, label: c }))}
              {...register('licenceStatus')}
            />
            <Select
              label="Portfolio status"
              required
              error={err('portfolioStatus')}
              options={PORTFOLIO_STATUSES.map((c) => ({ value: c, label: c }))}
              {...register('portfolioStatus')}
            />
            <Select
              label="Overall risk rating"
              required
              help="Demo/illustrative rating."
              error={err('riskRating')}
              options={RISK_RATINGS.map((c) => ({ value: c, label: c }))}
              {...register('riskRating')}
            />
            <Select
              label="Supervisory rating (1–5)"
              required
              error={err('supervisoryRating')}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} — ${['strongest', 'strong', 'satisfactory', 'weak', 'weakest'][n - 1]}` }))}
              {...register('supervisoryRating')}
            />
            <TextInput label="Total assets (MM, decimal string)" required error={err('totalAssetsMM')} {...register('totalAssetsMM')} />
            <TextInput label="Branch count" type="number" min={0} required error={err('branchCount')} {...register('branchCount')} />
            <div className="flex items-end pb-2">
              <Controller
                name="onWatchlist"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="On supervisory watchlist"
                    help="Demo flag surfaced on the Command Centre."
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Notes" rows={3} error={err('notes')} {...register('notes')} />
            </div>
          </Section>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        variant="warning"
        title="Discard unsaved changes?"
        message="This form has unsaved changes. Leaving now discards them — nothing was saved to any real registry (prototype session only)."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      />
    </>
  )
}
