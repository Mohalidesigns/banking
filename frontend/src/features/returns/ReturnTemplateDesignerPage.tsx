import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  FileSpreadsheet,
  Plus,
  ScrollText,
  Shield,
  Trash,
  Pencil,
} from 'lucide-react'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { toast } from '@/components/feedback/toastStore'
import { Checkbox, Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { useActor } from '@/hooks/useActor'
import { returnTemplateService } from '@/services/mock/MockReturnsService'
import { DemoPermissionError } from '@/services/contracts/errors'
import type {
  ReturnDefinition,
  ReturnField,
  ReturnFieldInput,
  ReturnFieldType,
  ReturnRuleInput,
  ReturnRuleKind,
} from '@/types/returns'
import { formatDate } from '@/utils/datetime'
import { cx } from '@/utils/cx'

/**
 * Return definition/template designer (Spec §11.2): return metadata,
 * visual field schema with add/remove/reorder interactions, per-field
 * validation rules, certification requirements, version history and the
 * draft → review → approve lifecycle. All mutations require the
 * `manage-return-templates` demo action (Spec §19) and persist in the
 * prototype session only. Rendered inside /app/returns (view=designer) —
 * the spec defines no standalone designer route.
 */

const APPROVAL_TONES: Record<string, StatusTone> = {
  Draft: 'draft',
  'Under Review': 'fieldwork',
  Approved: 'completed',
  Retired: 'closed',
}

const FIELD_TYPES: ReturnFieldType[] = ['decimal', 'integer', 'percentage', 'text', 'date', 'boolean', 'enum']
const RULE_KINDS: ReturnRuleKind[] = ['required', 'minimum', 'maximum', 'range', 'format', 'cross-field', 'reconciliation', 'materiality']

const EMPTY_FIELD: ReturnFieldInput = {
  code: '',
  label: '',
  section: '',
  type: 'decimal',
  unit: '',
  required: true,
  helpText: '',
}

const EMPTY_RULE: ReturnRuleInput = {
  rule: 'minimum',
  expression: '',
  severity: 'Warning',
  message: '',
}

/** The list of return definitions — entry point into the designer. */
export function ReturnDefinitionsView({ onOpenDesigner }: { onOpenDesigner: (definitionId: string) => void }) {
  const [definitions, setDefinitions] = useState<ReturnDefinition[] | null>(null)
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-return-templates')

  useEffect(() => {
    let active = true
    void returnTemplateService.listDefinitions().then((list) => {
      if (active) setDefinitions(list)
    })
    return () => {
      active = false
    }
  }, [])

  if (definitions === null) return <LoadingSkeleton variant="cards" rows={4} />

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {definitions.map((d) => (
        <Card key={d.id} hoverable className="flex flex-col">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="font-mono text-[13px] text-primary">{d.code}</span>
                <StatusBadge status={d.approvalStatus} tone={APPROVAL_TONES[d.approvalStatus]} />
              </span>
            }
            subtitle={`v${d.currentVersion} · ${d.frequency} · ${d.submissionFormat}`}
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <p className="text-sm font-medium text-ink">{d.name}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-ink-secondary">{d.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <dt className="text-ink-tertiary">Reporting basis</dt>
              <dd className="text-ink">{d.reportingBasis}</dd>
              <dt className="text-ink-tertiary">Owner team</dt>
              <dd className="truncate text-ink">{d.ownerTeamName}</dd>
              <dt className="text-ink-tertiary">Fields</dt>
              <dd className="text-ink">{d.fields.length}</dd>
              <dt className="text-ink-tertiary">Effective from</dt>
              <dd className="text-ink">{formatDate(d.effectiveFrom)}</dd>
            </dl>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <p className="text-[10px] text-ink-tertiary">Illustrative demo template</p>
              <Button
                variant={canManage ? 'primary' : 'outline'}
                size="sm"
                iconLeft={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => onOpenDesigner(d.id)}
              >
                {canManage ? 'Open designer' : 'View template'}
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
      {definitions.length === 0 && (
        <EmptyState
          className="md:col-span-2"
          title="No return definitions"
          description="Return templates will appear here once the demo dataset provides them."
          icon={<FileSpreadsheet className="h-7 w-7" />}
        />
      )}
    </div>
  )
}

/** Full visual designer for one return definition (Spec §11.2). */
export function ReturnTemplateDesigner({ definitionId, onBack }: { definitionId: string; onBack: () => void }) {
  const actor = useActor()
  const canManage = can(actor.actorRole, 'manage-return-templates')
  const canApprove = canManage && actor.actorRole !== 'read-only-supervisor'

  const [definition, setDefinition] = useState<ReturnDefinition | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [fieldModal, setFieldModal] = useState<{ open: boolean; editing: ReturnField | null }>({ open: false, editing: null })
  const [fieldDraft, setFieldDraft] = useState<ReturnFieldInput>({ ...EMPTY_FIELD })
  const [fieldError, setFieldError] = useState('')
  const [ruleFor, setRuleFor] = useState<ReturnField | null>(null)
  const [ruleDraft, setRuleDraft] = useState<ReturnRuleInput>({ ...EMPTY_RULE })
  const [ruleError, setRuleError] = useState('')
  const [removeField, setRemoveField] = useState<ReturnField | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const d = await returnTemplateService.getDefinition(definitionId)
    if (d) setDefinition(d)
    else setNotFound(true)
  }, [definitionId])

  useEffect(() => {
    void load()
  }, [load])

  const sections = useMemo(() => {
    if (!definition) return []
    const names = [...new Set(definition.fields.map((f) => f.section))]
    return names.map((name) => ({
      name,
      fields: definition.fields.filter((f) => f.section === name).sort((a, b) => a.order - b.order),
    }))
  }, [definition])

  const guard = (err: unknown, fallback: string) => {
    if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
    else toast.error('Demo action failed', fallback)
  }

  const run = async (fn: () => Promise<ReturnDefinition | undefined>, successMsg: string) => {
    setBusy(true)
    try {
      const updated = await fn()
      if (updated) {
        setDefinition(updated)
        toast.success('Saved in prototype session', successMsg)
      } else {
        toast.warning('No change', 'The demo template could not be modified in this state.')
      }
    } catch (err) {
      guard(err, 'The template change could not be saved in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  if (notFound) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Return definition not found"
            description="This demo template id does not exist in the prototype dataset."
            action={{ label: 'Back to return definitions', onClick: onBack }}
          />
        </CardBody>
      </Card>
    )
  }
  if (!definition) return <LoadingSkeleton variant="text" rows={10} />

  const d = definition

  const openAddField = () => {
    setFieldDraft({ ...EMPTY_FIELD, section: sections[0]?.name ?? 'General' })
    setFieldError('')
    setFieldModal({ open: true, editing: null })
  }

  const openEditField = (f: ReturnField) => {
    setFieldDraft({ code: f.code, label: f.label, section: f.section, type: f.type, unit: f.unit ?? '', required: f.required, helpText: f.helpText ?? '' })
    setFieldError('')
    setFieldModal({ open: true, editing: f })
  }

  const saveField = async () => {
    const draft = fieldDraft
    if (!draft.code.trim() || !draft.label.trim() || !draft.section.trim()) {
      setFieldError('Field code, label and section are required.')
      return
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(draft.code.trim())) {
      setFieldError('Field code must be alphanumeric and start with a letter (machine code used in submissions).')
      return
    }
    const duplicate = d.fields.some((f) => f.code === draft.code.trim() && f.id !== fieldModal.editing?.id)
    if (duplicate) {
      setFieldError(`A field with code "${draft.code.trim()}" already exists in this template.`)
      return
    }
    setBusy(true)
    try {
      const input: ReturnFieldInput = {
        code: draft.code.trim(),
        label: draft.label.trim(),
        section: draft.section.trim(),
        type: draft.type,
        unit: draft.unit?.trim() || undefined,
        required: draft.required,
        helpText: draft.helpText?.trim() || undefined,
      }
      const updated = fieldModal.editing
        ? await returnTemplateService.updateField(d.id, fieldModal.editing.id, input, actor)
        : await returnTemplateService.addField(d.id, input, actor)
      if (updated) {
        setDefinition(updated)
        setFieldModal({ open: false, editing: null })
        toast.success('Saved in prototype session', fieldModal.editing ? `Field ${input.code} updated.` : `Field ${input.code} added to ${d.code}.`)
      } else {
        setFieldError('The demo template rejected this change (duplicate code or missing template).')
      }
    } catch (err) {
      guard(err, 'The field could not be saved in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  const saveRule = async () => {
    if (!ruleFor) return
    if (!ruleDraft.expression.trim() || !ruleDraft.message.trim()) {
      setRuleError('An expression and a failure message are required for a validation rule.')
      return
    }
    setBusy(true)
    try {
      const updated = await returnTemplateService.addRule(
        d.id,
        ruleFor.id,
        { ...ruleDraft, expression: ruleDraft.expression.trim(), message: ruleDraft.message.trim() },
        actor,
      )
      if (updated) {
        setDefinition(updated)
        setRuleFor(null)
        toast.success('Saved in prototype session', `Demo validation rule added to ${ruleFor.code}.`)
      }
    } catch (err) {
      guard(err, 'The rule could not be saved in the prototype.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-xl text-primary">{d.code}</span>
            <span>{d.name}</span>
            <StatusBadge status={d.approvalStatus} tone={APPROVAL_TONES[d.approvalStatus]} />
          </span>
        }
        subtitle={`Version ${d.currentVersion} · ${d.frequency} · ${d.reportingBasis} · ${d.ownerTeamName}`}
        breadcrumbs={[{ label: 'Regulatory Returns', path: '/app/returns' }, { label: 'Template designer' }]}
        actions={
          <>
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>
              All definitions
            </Button>
            {d.approvalStatus !== 'Under Review' && d.approvalStatus !== 'Retired' && (
              <Button
                variant="outline"
                disabled={!canManage || busy}
                title={canManage ? undefined : 'Your demo role cannot manage return templates (Spec §19)'}
                onClick={() => void run(() => returnTemplateService.submitForApproval(d.id, actor), `${d.code} submitted for approval (demo workflow).`)}
              >
                Submit for approval
              </Button>
            )}
            {d.approvalStatus === 'Under Review' && (
              <Button
                variant="success"
                iconLeft={<BadgeCheck className="h-4 w-4" />}
                disabled={!canApprove || busy}
                title={canApprove ? undefined : 'Approval requires the manage-return-templates demo action (Spec §19)'}
                onClick={() => void run(() => returnTemplateService.approve(d.id, actor), `${d.code} approved — new version effective in the demo cycle.`)}
              >
                Approve template
              </Button>
            )}
            {d.approvalStatus === 'Approved' && (
              <Button
                variant="outline"
                disabled={!canManage || busy}
                onClick={() => void run(() => returnTemplateService.retire(d.id, actor), `${d.code} retired in the prototype session.`)}
              >
                Retire
              </Button>
            )}
          </>
        }
      />

      <p className="mb-4 rounded-lg bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-accent-dark">
        {d.thresholdNote} Template changes are saved in this prototype session only.
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Metadata */}
          <Card>
            <CardHeader title="Return definition" subtitle="Metadata per Spec §11.2 (demo values editable in-session)" />
            <CardBody>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="overline">Return code</dt><dd className="mt-0.5 font-mono font-semibold text-ink">{d.code}</dd></div>
                <div><dt className="overline">Jurisdiction</dt><dd className="mt-0.5 text-ink">{d.jurisdictionCode}</dd></div>
                <div><dt className="overline">Institution categories</dt><dd className="mt-0.5 text-ink">{d.institutionCategories.length === 0 ? 'All licence categories' : d.institutionCategories.join(', ')}</dd></div>
                <div><dt className="overline">Frequency</dt><dd className="mt-0.5 text-ink">{d.frequency}</dd></div>
                <div><dt className="overline">Reporting basis</dt><dd className="mt-0.5 text-ink">{d.reportingBasis}</dd></div>
                <div><dt className="overline">Submission format</dt><dd className="mt-0.5 text-ink">{d.submissionFormat}</dd></div>
                <div><dt className="overline">Effective from</dt><dd className="mt-0.5 text-ink">{formatDate(d.effectiveFrom)}</dd></div>
                <div><dt className="overline">Effective to</dt><dd className="mt-0.5 text-ink">{d.effectiveTo ? formatDate(d.effectiveTo) : 'Open-ended'}</dd></div>
                <div><dt className="overline">Approval status</dt><dd className="mt-0.5"><StatusBadge status={d.approvalStatus} tone={APPROVAL_TONES[d.approvalStatus]} /></dd></div>
              </dl>
            </CardBody>
          </Card>

          {/* Field schema designer */}
          <Card>
            <CardHeader
              title={`Field schema — ${d.fields.length} fields`}
              subtitle="Add, edit, reorder and remove fields; attach demo validation rules"
              action={
                canManage ? (
                  <Button variant="primary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={openAddField}>
                    Add field
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="flex flex-col gap-5">
              {sections.map((section) => (
                <div key={section.name}>
                  <p className="overline mb-2">{section.name}</p>
                  <ol className="flex flex-col gap-2">
                    {section.fields.map((f, idx) => (
                      <li key={f.id} className="rounded-lg border border-line bg-card px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-primary">{f.code}</span>
                          <span className="text-xs font-medium text-ink">{f.label}</span>
                          <span className="rounded-full bg-page px-2 py-0.5 text-[10px] text-ink-secondary">{f.type}{f.unit ? ` · ${f.unit}` : ''}</span>
                          {f.required && <span className="rounded-full bg-tint-red px-2 py-0.5 text-[10px] font-semibold text-error">Required</span>}
                          <span className="ml-auto flex items-center gap-1">
                            {canManage && (
                              <>
                                <Button variant="ghost" size="icon-sm" aria-label={`Move ${f.code} up`} disabled={idx === 0 || busy} onClick={() => void run(() => returnTemplateService.moveField(d.id, f.id, 'up', actor), `Moved ${f.code} up.`)}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label={`Move ${f.code} down`} disabled={idx === section.fields.length - 1 || busy} onClick={() => void run(() => returnTemplateService.moveField(d.id, f.id, 'down', actor), `Moved ${f.code} down.`)}>
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${f.code}`} onClick={() => openEditField(f)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.code}`} className="text-error hover:bg-tint-red" onClick={() => setRemoveField(f)}>
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </span>
                        </div>
                        {f.helpText && <p className="mt-1 text-[11px] text-ink-secondary">{f.helpText}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {f.validationRules.map((r) => (
                            <span
                              key={r.id}
                              className={cx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                r.severity === 'Error' ? 'bg-tint-red text-error' : 'bg-tint-orange text-warning',
                              )}
                              title={`${r.expression} — ${r.message}`}
                            >
                              <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                              {r.rule}: {r.expression}
                              {canManage && (
                                <button
                                  type="button"
                                  aria-label={`Remove ${r.rule} rule from ${f.code}`}
                                  className="ml-0.5 cursor-pointer opacity-60 hover:opacity-100"
                                  onClick={() => void run(() => returnTemplateService.removeRule(d.id, f.id, r.id, actor), `Rule removed from ${f.code}.`)}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconLeft={<Plus className="h-3 w-3" />}
                              onClick={() => {
                                setRuleDraft({ ...EMPTY_RULE })
                                setRuleError('')
                                setRuleFor(f)
                              }}
                            >
                              Add rule
                            </Button>
                          )}
                          {f.validationRules.length === 0 && !canManage && (
                            <span className="text-[10px] text-ink-tertiary">No validation rules</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              {!canManage && (
                <p className="text-[11px] text-ink-tertiary">
                  Your demo role has read-only access to templates — switch to a supervisor role with the
                  manage-return-templates action to edit (Spec §19).
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* Certification */}
          <Card>
            <CardHeader title="Certification requirements" subtitle="Officers who must certify submissions" />
            <CardBody className="flex flex-col gap-3">
              {d.certification.map((c) => (
                <div key={c.id} className="rounded-lg border border-line px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <BadgeCheck className="h-3.5 w-3.5 text-accent-dark" aria-hidden="true" />
                    {c.officerRole}
                    {c.mandatory && <span className="rounded-full bg-tint-red px-1.5 py-0.5 text-[9px] font-semibold text-error">Mandatory</span>}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{c.statement}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Version history */}
          <Card>
            <CardHeader title="Version history" subtitle="Approval trail for this template (demo)" />
            <CardBody>
              <ol className="flex flex-col gap-3">
                {[...d.versions].reverse().map((v) => (
                  <li key={v.version} className="relative border-l-2 border-line pl-4">
                    <span aria-hidden="true" className={cx('absolute top-1 -left-[5px] h-2 w-2 rounded-full', v.version === d.currentVersion ? 'bg-accent' : 'bg-line')} />
                    <p className="text-xs font-semibold text-ink">
                      v{v.version}
                      {v.version === d.currentVersion && <span className="ml-2 rounded-full bg-tint-blue px-1.5 py-0.5 text-[9px] font-semibold text-primary">Current</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-secondary">{v.changeSummary}</p>
                    <p className="mt-0.5 text-[10px] text-ink-tertiary">
                      Effective {formatDate(v.effectiveFrom)}
                      {v.effectiveTo ? ` → ${formatDate(v.effectiveTo)}` : ''}
                      {v.approvedByName ? ` · approved by ${v.approvedByName}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Prototype notice" />
            <CardBody>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-secondary">
                <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-dark" aria-hidden="true" />
                Template edits, approvals and retirements are demo workflow steps saved in this prototype
                session. Nothing is submitted to any real regulatory system.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add / edit field modal */}
      <Modal
        open={fieldModal.open}
        onClose={() => setFieldModal({ open: false, editing: null })}
        title={fieldModal.editing ? `Edit field — ${fieldModal.editing.code}` : `Add field to ${d.code}`}
        size="lg"
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Field code"
              required
              value={fieldDraft.code}
              disabled={Boolean(fieldModal.editing)}
              onChange={(e) => setFieldDraft({ ...fieldDraft, code: e.target.value })}
              placeholder="e.g. tier1Capital"
              help={fieldModal.editing ? 'The machine code cannot change after creation (demo rule).' : undefined}
            />
            <TextInput label="Label" required value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} placeholder="e.g. Tier 1 capital" />
            <TextInput label="Section" required value={fieldDraft.section} onChange={(e) => setFieldDraft({ ...fieldDraft, section: e.target.value })} placeholder="e.g. Capital base" help="Fields are grouped by section in the schema and on submission detail." />
            <Select
              label="Type"
              value={fieldDraft.type}
              onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value as ReturnFieldType })}
              options={FIELD_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <TextInput label="Unit (optional)" value={fieldDraft.unit} onChange={(e) => setFieldDraft({ ...fieldDraft, unit: e.target.value })} placeholder="e.g. MRD m" />
            <div className="flex items-end pb-2">
              <Checkbox label="Required field" checked={fieldDraft.required} onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })} />
            </div>
          </div>
          <TextArea label="Help text (optional)" rows={2} value={fieldDraft.helpText} onChange={(e) => setFieldDraft({ ...fieldDraft, helpText: e.target.value })} placeholder="Shown to institution users completing the return" />
          {fieldError && <p role="alert" className="rounded-lg bg-tint-red px-3 py-2 text-xs text-error">{fieldError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFieldModal({ open: false, editing: null })}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveField()}>
              {fieldModal.editing ? 'Save field' : 'Add field'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add validation rule modal */}
      <Modal open={ruleFor !== null} onClose={() => setRuleFor(null)} title={ruleFor ? `Add demo validation rule — ${ruleFor.label}` : ''} size="lg">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Rule kind"
              value={ruleDraft.rule}
              onChange={(e) => setRuleDraft({ ...ruleDraft, rule: e.target.value as ReturnRuleKind })}
              options={RULE_KINDS.map((r) => ({ value: r, label: r }))}
            />
            <Select
              label="Severity"
              value={ruleDraft.severity}
              onChange={(e) => setRuleDraft({ ...ruleDraft, severity: e.target.value as 'Error' | 'Warning' })}
              options={[{ value: 'Error', label: 'Error — blocks acceptance' }, { value: 'Warning', label: 'Warning — analyst attention' }]}
            />
          </div>
          <TextInput
            label="Expression"
            required
            value={ruleDraft.expression}
            onChange={(e) => setRuleDraft({ ...ruleDraft, expression: e.target.value })}
            placeholder='e.g. value >= 10.0 or "tier1 + tier2 == total"'
            help="Human-readable demo expression; the prototype rule engine evaluates minimum/maximum/reconciliation/cross-field rules."
          />
          <TextArea label="Failure message" required rows={2} value={ruleDraft.message} onChange={(e) => setRuleDraft({ ...ruleDraft, message: e.target.value })} placeholder="Shown on the submission validation results tab" />
          {ruleError && <p role="alert" className="rounded-lg bg-tint-red px-3 py-2 text-xs text-error">{ruleError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRuleFor(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => void saveRule()}>Add rule</Button>
          </div>
        </div>
      </Modal>

      {/* Remove field confirmation */}
      <ConfirmDialog
        open={removeField !== null}
        onClose={() => setRemoveField(null)}
        onConfirm={() => {
          const f = removeField
          setRemoveField(null)
          if (f) void run(() => returnTemplateService.removeField(d.id, f.id, actor), `Field ${f.code} removed from ${d.code}.`)
        }}
        title="Remove template field?"
        message={
          <span>
            <span className="font-mono font-semibold">{removeField?.code}</span> — {removeField?.label} will be
            removed from this demo template, together with its {removeField?.validationRules.length ?? 0}{' '}
            validation rule(s). Saved in prototype session only.
          </span>
        }
        confirmLabel="Remove field"
        variant="danger"
        loading={busy}
      />
    </div>
  )
}
