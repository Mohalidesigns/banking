import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Layers, Link2, Plus } from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { EmptyState, LoadingSkeleton } from '@/components/feedback/States'
import { Select } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { useSessionStore } from '@/store/sessionStore'
import type { Institution, InstitutionGroup } from '@/types/institution'
import { formatDate } from '@/utils/datetime'

/**
 * Institution Groups (Spec §5.6): group register, structure diagram,
 * group-level exposure/risk summary and demo add/edit-relationship
 * interactions (session-only, clearly labelled).
 */

interface SessionRelationship {
  groupId: string
  institutionId: string
}

export function InstitutionGroupsPage() {
  const navigate = useNavigate()
  const currentUser = useSessionStore((s) => s.currentUser)
  const canEdit = currentUser ? can(currentUser.role, 'edit-institution') : false

  const [groups, setGroups] = useState<InstitutionGroup[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [activeGroup, setActiveGroup] = useState<InstitutionGroup | null>(null)
  const [relModalOpen, setRelModalOpen] = useState(false)
  const [relGroup, setRelGroup] = useState('')
  const [relInstitution, setRelInstitution] = useState('')
  const [sessionRelationships, setSessionRelationships] = useState<SessionRelationship[]>([])

  useEffect(() => {
    let active = true
    void Promise.all([institutionService.listGroups(), institutionService.list({ page: 1, pageSize: 200 })]).then(
      ([groupList, instPage]) => {
        if (!active) return
        setGroups(groupList)
        setInstitutions(instPage.items)
      },
    )
    return () => {
      active = false
    }
  }, [])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const membersOf = (group: InstitutionGroup): Institution[] => [
    ...group.memberInstitutionIds.map((id) => instById.get(id)).filter((i): i is Institution => Boolean(i)),
    ...sessionRelationships
      .filter((r) => r.groupId === group.id)
      .map((r) => instById.get(r.institutionId))
      .filter((i): i is Institution => Boolean(i)),
  ]

  const addRelationship = () => {
    const group = groups?.find((g) => g.id === relGroup)
    const inst = instById.get(relInstitution)
    if (!group || !inst) return
    if (group.memberInstitutionIds.includes(inst.id) || sessionRelationships.some((r) => r.groupId === group.id && r.institutionId === inst.id)) {
      toast.warning('Already a member', `${inst.tradingName} is already in ${group.name} in this demo session.`)
      setRelModalOpen(false)
      return
    }
    setSessionRelationships((prev) => [...prev, { groupId: group.id, institutionId: inst.id }])
    toast.success('Relationship added', `Saved in prototype session only — ${inst.tradingName} added to ${group.name} for this demo.`)
    setRelModalOpen(false)
    setRelGroup('')
    setRelInstitution('')
  }

  if (!groups) {
    return (
      <div>
        <PageHeader title="Institution Groups" subtitle="Loading demo groups…" />
        <LoadingSkeleton rows={6} className="rounded-xl border border-line bg-card" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Institution Groups"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Consolidated supervision view over the demo institution population</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Fictional demo groups
            </span>
          </span>
        }
        actions={
          canEdit ? (
            <Button variant="primary" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => setRelModalOpen(true)}>
              Add relationship
            </Button>
          ) : undefined
        }
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState title="No institution groups" description="The demo dataset has no groups yet." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const members = membersOf(group)
            return (
              <Card key={group.id} hoverable className="flex flex-col">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                      {group.name}
                    </span>
                  }
                  action={<span className="font-mono text-[10px]">{group.identifier}</span>}
                />
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={group.consolidatedSupervision}
                      tone={group.consolidatedSupervision === 'Consolidated' ? 'active' : group.consolidatedSupervision === 'Pending' ? 'fieldwork' : 'planning'}
                    />
                    <RiskBadge rating={group.riskRating} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <dt className="overline">Parent entity</dt>
                      <dd className="mt-0.5 text-ink">{group.parentEntity}</dd>
                    </div>
                    <div>
                      <dt className="overline">Group exposure</dt>
                      <dd className="mt-0.5 font-mono text-ink">
                        ₣{Number(group.groupExposureMM).toLocaleString('en-GB')} MM
                      </dd>
                    </div>
                    <div>
                      <dt className="overline">Lead supervisor</dt>
                      <dd className="mt-0.5 text-ink">{group.leadSupervisorName}</dd>
                    </div>
                    <div>
                      <dt className="overline">Members</dt>
                      <dd className="mt-0.5 text-ink">{members.length} institution(s)</dd>
                    </div>
                  </dl>
                  <ul className="flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/app/institutions/${m.id}`)}
                          className="cursor-pointer rounded-full bg-tint-blue px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                        >
                          {m.code} · {m.tradingName}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {group.notes && <p className="text-[11px] leading-snug text-ink-secondary">{group.notes}</p>}
                  <div className="mt-auto flex justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => setActiveGroup(group)}>
                      View structure
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-center text-[10px] text-ink-tertiary">
        Group exposures and risk summaries are illustrative demo figures — not actual consolidated data.
      </p>

      {/* Group structure diagram drawer */}
      <Drawer
        open={activeGroup !== null}
        onClose={() => setActiveGroup(null)}
        width="560px"
        title={`Group structure — ${activeGroup?.name ?? ''}`}
      >
        {activeGroup && (
          <div className="flex flex-col items-center gap-0">
            <div className="w-full rounded-lg border border-line bg-tint-blue px-4 py-3 text-center">
              <p className="text-xs font-semibold text-primary">{activeGroup.parentEntity}</p>
              <p className="text-[10px] text-ink-secondary">
                Group parent · {activeGroup.identifier} · exposure ₣
                {Number(activeGroup.groupExposureMM).toLocaleString('en-GB')} MM (demo)
              </p>
            </div>
            <div aria-hidden="true" className="h-6 w-px bg-line" />
            <div className="flex w-full flex-col gap-3">
              {membersOf(activeGroup).map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div aria-hidden="true" className="h-px w-6 bg-line" />
                  <button
                    type="button"
                    onClick={() => {
                      const id = m.id
                      setActiveGroup(null)
                      navigate(`/app/institutions/${id}`)
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-line bg-card px-4 py-3 text-left shadow-card transition-all hover:-translate-y-px hover:shadow-elevated"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-ink">{m.legalName}</span>
                      <span className="block font-mono text-[10px] text-ink-secondary">
                        {m.code} · {m.category} · joined group view (demo)
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <RiskBadge rating={m.riskRating} />
                      <Link2 className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-4 w-full rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Demo hierarchy visual — group relationships are fictional. Session-added relationships
              are not persisted.
            </p>
          </div>
        )}
      </Drawer>

      {/* Add relationship modal (demo) */}
      <Modal
        open={relModalOpen}
        onClose={() => setRelModalOpen(false)}
        size="sm"
        title="Add group relationship (demo)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRelModalOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!relGroup || !relInstitution} onClick={addRelationship}>
              Add relationship
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Group"
            value={relGroup}
            onChange={(e) => setRelGroup(e.target.value)}
            placeholder="Select a group…"
            options={groups.map((g) => ({ value: g.id, label: `${g.name} (${g.identifier})` }))}
          />
          <Select
            label="Institution"
            value={relInstitution}
            onChange={(e) => setRelInstitution(e.target.value)}
            placeholder="Select an institution…"
            options={institutions.map((i) => ({ value: i.id, label: `${i.tradingName} (${i.code})` }))}
          />
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
            Prototype action — the relationship is stored in this session only and labelled as such.
            Last demo dataset update: {formatDate(new Date().toISOString())}.
          </p>
        </div>
      </Modal>
    </div>
  )
}
